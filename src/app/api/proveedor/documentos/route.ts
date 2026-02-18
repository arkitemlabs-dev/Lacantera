// src/app/api/proveedor/documentos/route.ts
// Endpoint para obtener documentos del proveedor desde el ERP

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * GET /api/proveedor/documentos
 *
 * Obtiene los documentos requeridos y los archivos adjuntos del proveedor desde el ERP
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/proveedor/documentos] Iniciando...');

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const empresaActual = session.user.empresaActual;

    console.log(`📍 Usuario: ${userId}, Empresa: ${empresaActual}`);

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada'
      }, { status: 400 });
    }

    // 2. Obtener el mapping para saber qué código de proveedor usar en el ERP
    const portalPool = await getPortalConnection();

    let mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaActual)
      .query(`
        SELECT erp_proveedor_code, empresa_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    // FALLBACK: Si no hay mapping para esta empresa, buscar CUALQUIER mapping activo del usuario (útil para testers)
    if (mappingResult.recordset.length === 0) {
      console.log('⚠️ [GET /api/proveedor/documentos] No se encontró mapping para la empresa actual, buscando fallback...');
      mappingResult = await portalPool.request()
        .input('userId', sql.NVarChar(50), userId)
        .query(`
          SELECT TOP 1 erp_proveedor_code, empresa_code
          FROM portal_proveedor_mapping
          WHERE portal_user_id = @userId
            AND activo = 1
          ORDER BY (CASE WHEN empresa_code = '01' THEN 0 ELSE 1 END), empresa_code
        `);
    }

    if (mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró mapping para este usuario en ninguna empresa'
      }, { status: 404 });
    }

    const mapping = mappingResult.recordset[0];
    const erp_proveedor_code = mapping.erp_proveedor_code;

    console.log(`📍 Código proveedor en ERP: ${erp_proveedor_code}`);

    // 3. Conectar al ERP de la empresa
    const erpPool = await getERPConnection(empresaActual);

    // 4. Obtener catálogo de documentos requeridos para proveedores
    const documentosRequeridosResult = await erpPool.request()
      .query(`
        SELECT
          Rama,
          Documento,
          Grupo,
          Orden,
          Requerido
        FROM DocRama
        WHERE Rama = 'CXP' AND Grupo = 'Check List de Proveedores'
        ORDER BY Orden
      `);

    console.log(`📋 Documentos requeridos encontrados: ${documentosRequeridosResult.recordset.length}`);

    // 5. Obtener archivos adjuntos del proveedor (AnexoCta donde Rama='CXP' y Cuenta=código proveedor)
    const anexosResult = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), erp_proveedor_code)
      .query(`
        SELECT
          Rama,
          Cuenta,
          IDR,
          Nombre AS NombreDocumento,
          Direccion AS RutaArchivo,
          Icono,
          Tipo,
          Orden,
          Comentario,
          Origen,
          Destino,
          Fecha,
          FechaEmision,
          Vencimiento,
          TipoDocumento,
          Inicio,
          Alta AS FechaAlta,
          UltimoCambio AS FechaUltimoCambio,
          Usuario,
          NivelAcceso,
          Categoria,
          Grupo,
          Familia,
          Documento,
          Direccion2,
          Direccion3,
          Autorizado,
          Rechazado,
          Observaciones
        FROM AnexoCta
        WHERE Rama = 'CXP'
          AND Cuenta = @proveedorCode
        ORDER BY Orden, FechaAlta DESC
      `);

    console.log(`📎 Anexos encontrados: ${anexosResult.recordset.length}`);

    // 6. Combinar datos: documentos requeridos + archivos adjuntos
    const documentos = documentosRequeridosResult.recordset.map((docRequerido: any) => {
      // Buscar si hay anexos para este documento con matching flexible
      const anexos = anexosResult.recordset.filter((anexo: any) => {
        const nombreAnexo = (anexo.NombreDocumento || '').toLowerCase().trim();
        const documentoRequerido = (docRequerido.Documento || '').toLowerCase().trim();
        const documentoAnexo = (anexo.Documento || '').toLowerCase().trim();

        // Matching directo
        if (nombreAnexo === documentoRequerido || documentoAnexo === documentoRequerido) {
          return true;
        }

        // Matching por frases clave (todas las palabras del grupo deben estar presentes)
        const matchingRules: { [key: string]: string[][] } = {
          'acta constitutiva': [['acta', 'constitutiva'], ['escritura']],
          'poder del representante legal': [['poder', 'representante'], ['poder', 'notarial']],
          'ine del representante legal': [['ine', 'representante'], ['ine', 'legal']],
          'comprobante de domicilio fiscal': [['comprobante', 'domicilio'], ['domicilio']],
          'opinión de cumplimiento obligaciones sat': [['opinion', 'cumplimiento'], ['cumplimiento', 'sat'], ['op', 'cum']],
          'pago del imss': [['pago', 'imss'], ['imss']],
          'constancia de situación fiscal actual': [['constancia', 'fiscal'], ['situacion', 'fiscal'], ['csf']],
          'estados financieros': [['estados', 'financieros'], ['balance', 'general']],
          'acuse de declaración anual': [['acuse', 'declaracion'], ['confirmacion', 'sat']],
          'caratula estado de cuenta bancario': [['caratula', 'cuenta'], ['estado de cuenta', 'bancari'], ['cuenta', 'bancaria'], ['bancaria']],
          'fotografia a color exterior del domicilio fiscal': [['fotografia', 'exterior'], ['foto', 'domicilio'], ['foto', 'negocio']],
          'referencias comerciales': [['referencias', 'comerciales'], ['cartas', 'referencia']],
          'solicitud de alta proveedor': [['solicitud', 'alta']],
          'ficha de proveedores': [['ficha', 'proveedores']]
        };

        const phraseGroups = matchingRules[documentoRequerido];
        if (phraseGroups) {
          return phraseGroups.some(group =>
            group.every(word => nombreAnexo.includes(word))
          );
        }

        return false;
      });

      // Si hay anexos, usar el más reciente
      const anexoReciente = anexos.length > 0 ? anexos[0] : null;

      return {
        // Información del documento requerido
        documentoRequerido: docRequerido.Documento,
        grupo: docRequerido.Grupo,
        orden: docRequerido.Orden,
        requerido: docRequerido.Requerido === 1,

        // Información del anexo (si existe)
        tieneArchivo: anexos.length > 0,
        cantidadArchivos: anexos.length,

        ...(anexoReciente && {
          idr: anexoReciente.IDR,
          nombreArchivo: anexoReciente.NombreDocumento,
          rutaArchivo: anexoReciente.RutaArchivo,
          tipo: anexoReciente.Tipo,
          fechaAlta: anexoReciente.FechaAlta,
          fechaUltimoCambio: anexoReciente.FechaUltimoCambio,
          usuario: anexoReciente.Usuario,
          autorizado: anexoReciente.Autorizado === 1,
          rechazado: anexoReciente.Rechazado === 1,
          observaciones: anexoReciente.Observaciones,
          comentario: anexoReciente.Comentario,
          vencimiento: anexoReciente.Vencimiento,
        }),

        // Todos los anexos relacionados
        anexos: anexos.map((a: any) => ({
          idr: a.IDR,
          nombreArchivo: a.NombreDocumento,
          rutaArchivo: a.RutaArchivo,
          tipo: a.Tipo,
          fechaAlta: a.FechaAlta,
          fechaUltimoCambio: a.FechaUltimoCambio,
          usuario: a.Usuario,
          autorizado: a.Autorizado === 1,
          rechazado: a.Rechazado === 1,
          observaciones: a.Observaciones,
        }))
      };
    });

    // 7. Identificar anexos que no se pudieron clasificar
    const idsAnexosRelacionados = new Set();
    documentos.forEach((d: any) => {
      if (d.anexos) {
        d.anexos.forEach((a: any) => idsAnexosRelacionados.add(a.idr));
      }
    });

    const anexosNoRelacionados = anexosResult.recordset
      .filter((a: any) => !idsAnexosRelacionados.has(a.IDR))
      .map((a: any) => ({
        idr: a.IDR,
        nombreArchivo: a.NombreDocumento,
        rutaArchivo: a.RutaArchivo,
        tipo: a.Tipo,
        fechaAlta: a.FechaAlta,
        categoria: a.Categoria,
        grupo: a.Grupo,
        documentoOrigen: a.Documento,
        comentario: a.Comentario,
        esDesconocido: true
      }));

    console.log(`✅ Procesados ${documentos.length} documentos requeridos y ${anexosNoRelacionados.length} anexos sin clasificar`);

    // 8. Retornar datos
    return NextResponse.json({
      success: true,
      data: {
        empresaActual: empresaActual,
        codigoProveedorERP: erp_proveedor_code,
        totalDocumentosRequeridos: documentosRequeridosResult.recordset.length,
        totalArchivosSubidos: anexosResult.recordset.length,
        documentos: documentos,
        anexosNoRelacionados: anexosNoRelacionados,
        // Estadísticas
        estadisticas: {
          documentosConArchivo: documentos.filter((d: any) => d.tieneArchivo).length,
          documentosSinArchivo: documentos.filter((d: any) => !d.tieneArchivo).length,
          documentosAutorizados: documentos.filter((d: any) => d.autorizado).length,
          documentosRechazados: documentos.filter((d: any) => d.rechazado).length,
          documentosPendientes: documentos.filter((d: any) => d.tieneArchivo && !d.autorizado && !d.rechazado).length,
          anexosSinClasificar: anexosNoRelacionados.length
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/documentos] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo documentos del proveedor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
