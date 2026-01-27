// src/app/api/proveedor/ordenes/[id]/route.ts
// Endpoint para obtener el detalle de una orden de compra específica con partidas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

// Mapeo de monedas del ERP a códigos ISO
const currencyMap: Record<string, string> = {
  'Pesos': 'MXN',
  'pesos': 'MXN',
  'PESOS': 'MXN',
  'MXN': 'MXN',
  'Dolares': 'USD',
  'dolares': 'USD',
  'DOLARES': 'USD',
  'USD': 'USD',
  'Euros': 'EUR',
  'euros': 'EUR',
  'EUROS': 'EUR',
  'EUR': 'EUR',
};

const getCurrencyCode = (moneda: string | null | undefined): string => {
  if (!moneda) return 'MXN';
  return currencyMap[moneda] || 'MXN';
};

/**
 * GET /api/proveedor/ordenes/[id]
 *
 * Obtiene el detalle completo de una orden de compra específica
 * incluyendo el encabezado y las partidas (líneas de detalle)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const params = await props.params;
    const ordenId = params.id;
    const userId = session.user.id;
    const empresaActual = session.user.empresaActual;
    const proveedorFromSession = (session.user as any).proveedor;

    console.log(`\n🔍 [GET /api/proveedor/ordenes/${ordenId}] Iniciando...`);
    console.log(`📍 Usuario: ${userId}, Empresa: ${empresaActual}`);

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada'
      }, { status: 400 });
    }

    // 1. Obtener código de proveedor del mapping o sesión
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

    let proveedorCode: string | null = null;

    if (mappingResult.recordset.length > 0) {
      proveedorCode = mappingResult.recordset[0].erp_proveedor_code || null;
    }

    if (!proveedorCode && proveedorFromSession) {
      proveedorCode = proveedorFromSession;
    }

    if (!proveedorCode) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró código de proveedor'
      }, { status: 404 });
    }

    // 2. Conectar al ERP
    const pool = await getERPConnection(empresaActual);

    // 3. Obtener encabezado de la orden
    const ordenResult = await pool.request()
      .input('OrdenID', sql.Int, parseInt(ordenId))
      .input('ProveedorCode', sql.VarChar(20), proveedorCode)
      .query(`
        SELECT
          c.ID,
          c.Mov,
          c.MovID,
          c.Empresa,
          c.Estatus,
          c.Situacion,
          c.SituacionFecha,
          c.SituacionUsuario,
          c.SituacionNota,
          c.Proveedor,
          p.Nombre AS ProveedorNombre,
          p.RFC AS ProveedorRFC,
          p.eMail1 AS ProveedorEmail,
          c.FechaEmision,
          c.FechaRequerida,
          c.FechaEntrega,
          c.Importe,
          c.Impuestos,
          c.DescuentoLineal,
          c.Saldo,
          c.Moneda,
          c.TipoCambio,
          c.Observaciones,
          c.Condicion,
          c.Almacen,
          c.Referencia,
          c.Proyecto,
          c.Concepto,
          c.Prioridad,
          c.Usuario,
          c.UltimoCambio
        FROM Compra c
        INNER JOIN Prov p ON c.Proveedor = p.Proveedor
        WHERE c.ID = @OrdenID
          AND c.Proveedor = @ProveedorCode
          AND EXISTS (
            SELECT 1 FROM MovTipo mt
            WHERE c.Mov = mt.Mov
              AND mt.Modulo = 'COMS'
              AND mt.Clave = 'COMS.O'
              AND mt.subClave IS NULL
          )
      `);

    if (ordenResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Orden no encontrada o no tienes permiso para verla'
      }, { status: 404 });
    }

    const ordenRaw = ordenResult.recordset[0];

    // 4. Obtener partidas de la orden
    const partidasResult = await pool.request()
      .input('OrdenID', sql.Int, parseInt(ordenId))
      .query(`
        SELECT
          ID,
          Renglon,
          Cantidad,
          Codigo,
          Articulo,
          SubCuenta,
          Costo,
          Unidad
        FROM CompraD
        WHERE ID = @OrdenID
        ORDER BY Renglon
      `);

    const partidas = partidasResult.recordset.map((partida: any) => ({
      id: partida.ID,
      renglon: partida.Renglon,
      cantidad: partida.Cantidad || 0,
      codigo: partida.Codigo,
      articulo: partida.Articulo,
      subCuenta: partida.SubCuenta,
      costo: partida.Costo || 0,
      unidad: partida.Unidad,
      subtotal: (partida.Cantidad || 0) * (partida.Costo || 0)
    }));

    // 5. Mapear la orden al formato del frontend
    const monedaISO = getCurrencyCode(ordenRaw.Moneda);
    const total = (ordenRaw.Importe || 0) + (ordenRaw.Impuestos || 0) - (ordenRaw.DescuentoLineal || 0);

    const orden = {
      id: ordenRaw.ID,
      mov: ordenRaw.Mov,
      movID: ordenRaw.MovID,
      empresa: ordenRaw.Empresa,
      estatus: ordenRaw.Estatus,
      situacion: ordenRaw.Situacion,
      situacionFecha: ordenRaw.SituacionFecha,
      situacionUsuario: ordenRaw.SituacionUsuario,
      situacionNota: ordenRaw.SituacionNota,
      proveedor: ordenRaw.Proveedor,
      nombreProveedor: ordenRaw.ProveedorNombre,
      rfc: ordenRaw.ProveedorRFC,
      email: ordenRaw.ProveedorEmail,
      fechaEmision: ordenRaw.FechaEmision,
      fechaRequerida: ordenRaw.FechaRequerida,
      fechaEntrega: ordenRaw.FechaEntrega,
      importe: ordenRaw.Importe || 0,
      impuestos: ordenRaw.Impuestos || 0,
      descuentoLineal: ordenRaw.DescuentoLineal || 0,
      total: total,
      saldo: ordenRaw.Saldo || 0,
      moneda: monedaISO,
      tipoCambio: ordenRaw.TipoCambio || 1,
      observaciones: ordenRaw.Observaciones,
      condicion: ordenRaw.Condicion,
      almacen: ordenRaw.Almacen,
      referencia: ordenRaw.Referencia,
      proyecto: ordenRaw.Proyecto,
      concepto: ordenRaw.Concepto,
      prioridad: ordenRaw.Prioridad,
      usuario: ordenRaw.Usuario,
      ultimoCambio: ordenRaw.UltimoCambio,
      partidas: partidas
    };

    console.log(`✅ Orden ${ordenId} encontrada con ${partidas.length} partidas`);

    return NextResponse.json({
      success: true,
      data: {
        orden: orden,
        resumen: {
          totalPartidas: partidas.length,
          cantidadTotal: partidas.reduce((sum, p) => sum + p.cantidad, 0),
          subtotal: ordenRaw.Importe || 0,
          impuestos: ordenRaw.Impuestos || 0,
          descuento: ordenRaw.DescuentoLineal || 0,
          total: total
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error obteniendo detalle de orden:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener detalle de orden',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
