// src/app/api/proveedor/ordenes/route.ts
// Endpoint para obtener órdenes de compra del proveedor desde el ERP

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { storedProcedures } from '@/lib/database/stored-procedures';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';
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
    // El código de proveedor viene directamente de la sesión (WebUsuario.Proveedor)
    const proveedorFromSession = (session.user as any).proveedor;

    console.log(`📍 Usuario: ${userId}, Empresa: ${empresaActual}, Proveedor (sesión): ${proveedorFromSession}`);

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada'
      }, { status: 400 });
    }

    // 2. Obtener Clave del proveedor desde portal_proveedor_mapping
    // Esta tabla relaciona el usuario del portal con el código del proveedor en el ERP
    const portalPool = await getPortalConnection();

    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaActual)
      .query(`
        SELECT erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    let clave: string | null = null;

    if (mappingResult.recordset.length > 0) {
      clave = mappingResult.recordset[0].erp_proveedor_code || null;
      console.log(`📍 Desde mapping - Clave: ${clave}`);
    }

    // Fallback: si no hay clave en mapping, usar el de la sesión
    if (!clave && proveedorFromSession) {
      clave = proveedorFromSession;
      console.log(`📍 Usando clave de sesión: ${clave}`);
    }

    console.log(`📍 Clave final: ${clave}`);

    // Validar que tengamos la clave
    if (!clave) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró código de proveedor para este usuario'
      }, { status: 404 });
    }

    // 3. Determinar el código de empresa según el mapping
    // El ERP usa códigos numéricos: '01', '02', etc.
    const empresaCode = getEmpresaERPFromTenant(empresaActual);

    if (!empresaCode) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo determinar el código de empresa'
      }, { status: 400 });
    }

    console.log(`📍 Código empresa ERP: ${empresaCode}`);

    // 4. Obtener órdenes de compra usando el SP
    console.log(`📍 Llamando sp_GetOrdenesCompraProveedor - Clave: ${clave}, Empresa: ${empresaCode}`);

    const spResult = await storedProcedures.getOrdenesCompraProveedor(
      clave,       // @Clave
      empresaCode,
      {
        rfc: null,  // @RFC (no lo tenemos desde el mapping)
        fechaDesde: null,
        fechaHasta: null,
        page: 1,
        limit: 1000
      }
    );

    console.log(`📦 Órdenes encontradas via SP: ${spResult.ordenes.length}`);

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
        codigoProveedorERP: clave,
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
