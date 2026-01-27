/**
 * API Route: Detalle de Orden de Compra usando Stored Procedures
 *
 * GET /api/admin/ordenes-sp/[id]
 *
 * Obtiene el encabezado completo de la orden y sus partidas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
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

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea administrador
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const ordenId = parseInt(params.id);
    if (isNaN(ordenId)) {
      return NextResponse.json(
        { success: false, error: 'ID de orden inválido' },
        { status: 400 }
      );
    }

    // Obtener empresa de la sesión o usar default
    const empresaActual = session.user.empresaActual || 'la-cantera';

    console.log(`🔍 [GET /api/admin/ordenes-sp/${ordenId}] Cargando detalle...`);

    // Conectar al ERP
    const pool = await getERPConnection(empresaActual);

    // Obtener encabezado de la orden
    const ordenResult = await pool.request()
      .input('OrdenID', sql.Int, ordenId)
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
          p.Telefonos AS ProveedorTelefono,
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
        error: 'Orden no encontrada'
      }, { status: 404 });
    }

    const ordenRaw = ordenResult.recordset[0];

    // Obtener partidas de la orden
    const partidasResult = await pool.request()
      .input('OrdenID', sql.Int, ordenId)
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
      ID: partida.ID,
      Renglon: partida.Renglon,
      Cantidad: partida.Cantidad || 0,
      Codigo: partida.Codigo,
      Articulo: partida.Articulo,
      SubCuenta: partida.SubCuenta,
      Costo: partida.Costo || 0,
      Unidad: partida.Unidad,
      Subtotal: (partida.Cantidad || 0) * (partida.Costo || 0)
    }));

    // Mapear moneda a código ISO
    const monedaISO = getCurrencyCode(ordenRaw.Moneda);
    const total = (ordenRaw.Importe || 0) + (ordenRaw.Impuestos || 0) - (ordenRaw.DescuentoLineal || 0);

    // Construir respuesta con el formato esperado por el frontend
    const orden = {
      ID: ordenRaw.ID,
      Mov: ordenRaw.Mov,
      MovID: ordenRaw.MovID,
      Empresa: ordenRaw.Empresa,
      Estatus: ordenRaw.Estatus,
      Situacion: ordenRaw.Situacion,
      SituacionFecha: ordenRaw.SituacionFecha,
      SituacionUsuario: ordenRaw.SituacionUsuario,
      SituacionNota: ordenRaw.SituacionNota,
      Proveedor: ordenRaw.Proveedor,
      ProveedorNombre: ordenRaw.ProveedorNombre,
      ProveedorRFC: ordenRaw.ProveedorRFC,
      ProveedorEmail: ordenRaw.ProveedorEmail,
      ProveedorTelefono: ordenRaw.ProveedorTelefono,
      FechaEmision: ordenRaw.FechaEmision,
      FechaRequerida: ordenRaw.FechaRequerida,
      FechaEntrega: ordenRaw.FechaEntrega,
      Importe: ordenRaw.Importe || 0,
      Impuestos: ordenRaw.Impuestos || 0,
      DescuentoLineal: ordenRaw.DescuentoLineal || 0,
      Total: total,
      Saldo: ordenRaw.Saldo || 0,
      Moneda: monedaISO,
      TipoCambio: ordenRaw.TipoCambio || 1,
      Observaciones: ordenRaw.Observaciones,
      Condicion: ordenRaw.Condicion,
      Almacen: ordenRaw.Almacen,
      Referencia: ordenRaw.Referencia,
      Proyecto: ordenRaw.Proyecto,
      Concepto: ordenRaw.Concepto,
      Prioridad: ordenRaw.Prioridad,
      Usuario: ordenRaw.Usuario,
      UltimoCambio: ordenRaw.UltimoCambio,
      partidas: partidas
    };

    console.log(`✅ Orden ${ordenId} encontrada con ${partidas.length} partidas`);

    return NextResponse.json({
      success: true,
      data: {
        orden: orden,
        partidas: partidas,
        resumen: {
          totalPartidas: partidas.length,
          cantidadTotal: partidas.reduce((sum, p) => sum + p.Cantidad, 0),
          subtotal: ordenRaw.Importe || 0,
          impuestos: ordenRaw.Impuestos || 0,
          descuento: ordenRaw.DescuentoLineal || 0,
          total: total
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en /api/admin/ordenes-sp/[id]:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener detalle de la orden',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
