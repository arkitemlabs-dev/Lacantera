// src/app/api/proveedor/ordenes/route.ts
// Endpoint para obtener órdenes de compra del proveedor desde el ERP

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { storedProcedures } from '@/lib/database/stored-procedures';
import sql from 'mssql';

/**
 * GET /api/proveedor/ordenes
 *
 * Obtiene las órdenes de compra del proveedor desde el ERP de la empresa actual
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/proveedor/ordenes] Iniciando...');

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

    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaActual)
      .query(`
        SELECT
          erp_proveedor_code,
          empresa_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    if (mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró mapping para esta empresa'
      }, { status: 404 });
    }

    const mapping = mappingResult.recordset[0];
    const erp_proveedor_code = mapping.erp_proveedor_code;

    console.log(`📍 Código proveedor en ERP: ${erp_proveedor_code}`);

    // 3. Obtener RFC del proveedor del portal para buscar en ERP
    const userResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT RFC
        FROM portal_usuarios
        WHERE IDUsuario = @userId
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }

    const rfc = userResult.recordset[0].RFC;
    console.log(`📍 RFC del proveedor: ${rfc}`);

    // 4. Determinar el código de empresa según el mapping
    // El ERP usa códigos numéricos: '01', '02', etc.
    const empresaCodes: { [key: string]: string } = {
      'la-cantera': '01',
      'peralillo': '02',
      'plaza-galerena': '03',
      'inmobiliaria-galerena': '04',
      'icrear': '05'
    };

    const empresaCode = empresaCodes[empresaActual] || '01';

    console.log(`📍 Código empresa ERP: ${empresaCode}`);

    // 5. Obtener órdenes de compra usando el SP específico para proveedores
    // Usamos el SP sp_GetOrdenesCompraProveedor
    const spResult = await storedProcedures.getOrdenesCompraProveedor(
      rfc,
      empresaCode,
      {
        estatus: null, // Todos los estados
        fechaDesde: null,
        fechaHasta: null,
        page: 1,
        limit: 1000 // Traer todas las órdenes del proveedor
      }
    );

    console.log(`📦 Órdenes encontradas via SP (proveedor): ${spResult.ordenes.length}`);

    // 6. Mapear las órdenes del SP al formato esperado por el frontend
    const ordenes = spResult.ordenes.map((orden: any) => {
      // Calcular total (Importe + Impuestos - DescuentoLineal)
      const total = (orden.Importe || 0) + (orden.Impuestos || 0) - (orden.DescuentoLineal || 0);

      return {
        id: orden.ID,
        mov: orden.Mov,
        movID: orden.MovID,
        empresa: orden.Empresa,
        estatus: orden.Estatus,
        situacion: orden.Situacion,
        situacionFecha: orden.SituacionFecha,
        situacionUsuario: orden.SituacionUsuario,
        situacionNota: orden.SituacionNota,
        proveedor: orden.Proveedor,
        nombreProveedor: orden.ProveedorNombre,
        rfc: orden.ProveedorRFC,
        fechaEmision: orden.FechaEmision,
        fechaRequerida: orden.FechaRequerida,
        fechaEntrega: orden.FechaEntrega,
        importe: orden.Importe || 0,
        impuestos: orden.Impuestos || 0,
        descuentoLineal: orden.DescuentoLineal || 0,
        total: total,
        saldo: orden.Saldo || 0,
        moneda: orden.Moneda || 'MXN',
        tipoCambio: orden.TipoCambio || 1,
        observaciones: orden.Observaciones,
        condicion: orden.Condicion,
        almacen: orden.Almacen,
        referencia: orden.Referencia,
        proyecto: orden.Proyecto,
        concepto: orden.Concepto,
        prioridad: orden.Prioridad,
        usuario: orden.Usuario,
        ultimoCambio: orden.UltimoCambio,
        partidas: [] // Las partidas se cargarán bajo demanda en el detalle
      };
    });

    // 7. Calcular estadísticas
    const estadisticas = {
      totalOrdenes: ordenes.length,
      porEstatus: ordenes.reduce((acc: any, orden: any) => {
        acc[orden.estatus] = (acc[orden.estatus] || 0) + 1;
        return acc;
      }, {}),
      porSituacion: ordenes.reduce((acc: any, orden: any) => {
        acc[orden.situacion] = (acc[orden.situacion] || 0) + 1;
        return acc;
      }, {}),
      totalImporte: ordenes.reduce((sum, orden) => sum + orden.importe, 0),
      totalImpuestos: ordenes.reduce((sum, orden) => sum + orden.impuestos, 0),
      totalGeneral: ordenes.reduce((sum, orden) => sum + orden.total, 0),
      totalSaldo: ordenes.reduce((sum, orden) => sum + orden.saldo, 0)
    };

    console.log(`✅ Procesadas ${ordenes.length} órdenes`);

    // 8. Retornar datos
    return NextResponse.json({
      success: true,
      data: {
        empresaActual: empresaActual,
        codigoProveedorERP: erp_proveedor_code,
        rfc: rfc,
        ordenes: ordenes,
        estadisticas: estadisticas
      }
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/ordenes] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo órdenes de compra',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
