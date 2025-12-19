// src/app/api/admin/proveedores/[id]/documentos/route.ts
// Endpoint para que el admin obtenga documentos de cualquier proveedor

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * GET /api/admin/proveedores/[id]/documentos
 * Obtiene los documentos de un proveedor específico (solo admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea administrador
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    console.log(`[ADMIN DOCUMENTOS] ID recibido: ${id}`);

    // Conectar al ERP
    const erpPool = await getERPConnection('la-cantera');
    
    // Buscar el proveedor para obtener su código correcto
    const provResult = await erpPool.request()
      .input('searchId', sql.VarChar(20), id)
      .query(`
        SELECT Proveedor, Nombre 
        FROM Prov 
        WHERE Proveedor = @searchId
      `);
    
    if (provResult.recordset.length === 0) {
      return NextResponse.json(
        { error: `Proveedor ${id} no encontrado` },
        { status: 404 }
      );
    }
    
    const codigoProveedor = provResult.recordset[0].Proveedor;

    console.log(`[ADMIN DOCUMENTOS] Proveedor encontrado: ${codigoProveedor} - ${provResult.recordset[0].Nombre}`);

    // Obtener catálogo de documentos requeridos para proveedores
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

    console.log(`[ADMIN DOCUMENTOS] Documentos requeridos encontrados: ${documentosRequeridosResult.recordset.length}`);
    if (documentosRequeridosResult.recordset.length > 0) {
      console.log('[ADMIN DOCUMENTOS] Primeros documentos:', documentosRequeridosResult.recordset.slice(0, 3).map(d => d.Documento));
    }

    // Primero verificar si existen registros en AnexoCta para este proveedor
    const testAnexos = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), codigoProveedor)
      .query(`SELECT COUNT(*) as total FROM AnexoCta WHERE Cuenta = @proveedorCode`);
    
    console.log(`[ADMIN DOCUMENTOS] Total anexos en AnexoCta para ${codigoProveedor}: ${testAnexos.recordset[0].total}`);
    
    // Obtener archivos adjuntos del proveedor desde AnexoCta
    const anexosResult = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), codigoProveedor)
      .query(`
        SELECT TOP 100
          IDR,
          Rama,
          Cuenta,
          Nombre AS NombreDocumento,
          Direccion AS RutaArchivo,
          Documento,
          Alta AS FechaAlta,
          UltimoCambio AS FechaUltimoCambio,
          Usuario,
          Autorizado,
          Rechazado,
          Observaciones
        FROM AnexoCta
        WHERE Cuenta = @proveedorCode
        ORDER BY Alta DESC
      `);

    console.log(`[ADMIN DOCUMENTOS] Anexos obtenidos: ${anexosResult.recordset.length}`);
    if (anexosResult.recordset.length > 0) {
      console.log('[ADMIN DOCUMENTOS] Primer anexo:', anexosResult.recordset[0]);
    }

    // Combinar datos: documentos requeridos + archivos del proveedor
    const documentos = documentosRequeridosResult.recordset.map((docRequerido: any) => {
      // Buscar anexos que correspondan a este documento requerido
      const anexos = anexosResult.recordset.filter((anexo: any) => {
        const nombreAnexo = (anexo.NombreDocumento || '').toLowerCase().trim();
        const documentoRequerido = (docRequerido.Documento || '').toLowerCase().trim();
        const documentoAnexo = (anexo.Documento || '').toLowerCase().trim();

        // Matching exacto por nombre de documento
        if (nombreAnexo === documentoRequerido || documentoAnexo === documentoRequerido) {
          return true;
        }

        // Matching por palabras clave específicas para cada documento
        const matchingRules: { [key: string]: string[] } = {
          'acta constitutiva': ['acta', 'constitutiva'],
          'poder del representante legal': ['poder', 'representante', 'legal'],
          'ine del representante legal': ['ine', 'identificacion', 'representante'],
          'comprobante de domicilio fiscal': ['comprobante', 'domicilio', 'fiscal'],
          'opinión de cumplimiento obligaciones sat': ['opinion', 'cumplimiento', 'sat', 'obligaciones'],
          'pago del imss': ['pago', 'imss'],
          'constancia de situación fiscal actual': ['constancia', 'situacion', 'fiscal'],
          'estados financieros': ['estados', 'financieros'],
          'acuse de declaración anual': ['acuse', 'declaracion', 'anual'],
          'caratula estado de cuenta bancario': ['caratula', 'estado', 'cuenta', 'bancario', 'bancaria'],
          'fotografia a color exterior del domicilio fiscal': ['fotografia', 'foto', 'exterior', 'domicilio'],
          'referencias comerciales': ['referencias', 'comerciales'],
          'solicitud de alta proveedor (fm-lo-19)': ['solicitud', 'alta', 'proveedor', 'fm-lo-19'],
          'ficha de proveedores (fm-lo-18)': ['ficha', 'proveedores', 'fm-lo-18']
        };

        const keywords = matchingRules[documentoRequerido];
        if (keywords) {
          return keywords.some(keyword => nombreAnexo.includes(keyword));
        }

        // Matching genérico por inclusión
        return nombreAnexo.includes(documentoRequerido) || documentoRequerido.includes(nombreAnexo);
      });

      const anexoReciente = anexos.length > 0 ? anexos[0] : null;

      return {
        documentoRequerido: docRequerido.Documento,
        grupo: docRequerido.Grupo,
        orden: docRequerido.Orden,
        requerido: docRequerido.Requerido === 1,
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

    return NextResponse.json({
      success: true,
      data: {
        codigoProveedorERP: codigoProveedor,
        totalDocumentosRequeridos: documentosRequeridosResult.recordset.length,
        totalArchivosSubidos: anexosResult.recordset.length,
        documentos: documentos,
        estadisticas: {
          documentosConArchivo: documentos.filter((d: any) => d.tieneArchivo).length,
          documentosSinArchivo: documentos.filter((d: any) => !d.tieneArchivo).length,
          documentosAutorizados: documentos.filter((d: any) => d.autorizado).length,
          documentosRechazados: documentos.filter((d: any) => d.rechazado).length,
          documentosPendientes: documentos.filter((d: any) => d.tieneArchivo && !d.autorizado && !d.rechazado).length,
        }
      }
    });

  } catch (error: any) {
    console.error('[ADMIN DOCUMENTOS] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener documentos del proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}