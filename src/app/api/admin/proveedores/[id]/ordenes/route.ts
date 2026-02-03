// src/app/api/admin/proveedores/[id]/ordenes/route.ts
// Endpoint para que el admin obtenga órdenes de compra de cualquier proveedor

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * GET /api/admin/proveedores/[id]/ordenes
 * Obtiene las órdenes de compra de un proveedor específico (solo admin)
 *
 * Query params:
 * - estatus: 'PENDIENTE' | 'CONCLUIDO' | 'CANCELADO' | 'todas' (default: 'todas')
 * - empresa: código de empresa ERP (opcional, usa la empresa de la sesión si no se especifica)
 */
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

    const { id: proveedorId } = await params;

    // Obtener la empresa de la sesión
    const empresaActual = session.user.empresaActual;
    if (!empresaActual) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const estatusFiltro = searchParams.get('estatus') || 'todas';
    // Usar la empresa del parámetro si viene, o la de la sesión
    const empresaParamRaw = searchParams.get('empresa');
    const empresaParam = empresaParamRaw || getEmpresaERPFromTenant(empresaActual);

    if (!empresaParam) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa' },
        { status: 400 }
      );
    }

    console.log(`[ADMIN ORDENES] Proveedor: ${proveedorId}, Estatus: ${estatusFiltro}, Empresa: ${empresaParam}`);

    // Conectar al ERP usando la empresa de la sesión
    const erpPool = await getERPConnection(empresaActual);

    // Primero obtener el RFC del proveedor
    const provResult = await erpPool.request()
      .input('proveedorId', sql.VarChar(20), proveedorId)
      .query(`
        SELECT Proveedor, Nombre, RFC
        FROM Prov
        WHERE Proveedor = @proveedorId
      `);

    if (provResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const proveedor = provResult.recordset[0];
    const rfc = proveedor.RFC;

    console.log(`[ADMIN ORDENES] RFC del proveedor: ${rfc}`);

    // Construir query de órdenes de compra
    // Basado en: SELECT * FROM Compra c JOIN MovTipo mt ON c.Mov=mt.Mov AND mt.Modulo='COMS' AND mt.Clave='COMS.0' AND mt.subClave is NULL JOIN prov p ON c.Proveedor=p.Proveedor WHERE c.Estatus='PENDIENTE' AND RFC='xxx' AND Empresa='01'

    let query = `
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
        p.Nombre AS NombreProveedor,
        p.RFC,
        c.FechaEmision,
        c.FechaRequerida,
        c.FechaEntrega,
        c.Importe,
        c.Impuestos,
        c.Saldo,
        c.DescuentoLineal,
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
        c.UltimoCambio,
        mt.Clave AS TipoMovimiento,
        mt.Mov AS MovimientoNombre
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov
        AND mt.Modulo = 'COMS'
        AND mt.Clave = 'COMS.0'
        AND mt.SubClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE p.RFC = @rfc
        AND c.Empresa = @empresa
    `;

    // Agregar filtro de estatus si no es 'todas'
    if (estatusFiltro && estatusFiltro !== 'todas') {
      query += ` AND c.Estatus = @estatus`;
    }

    query += ` ORDER BY c.FechaEmision DESC`;

    const ordenesRequest = erpPool.request()
      .input('rfc', sql.VarChar(13), rfc)
      .input('empresa', sql.VarChar(5), empresaParam);

    if (estatusFiltro && estatusFiltro !== 'todas') {
      ordenesRequest.input('estatus', sql.VarChar(20), estatusFiltro.toUpperCase());
    }

    const ordenesResult = await ordenesRequest.query(query);

    console.log(`[ADMIN ORDENES] Órdenes encontradas: ${ordenesResult.recordset.length}`);

    // Para cada orden, obtener el detalle (partidas)
    const ordenes = await Promise.all(
      ordenesResult.recordset.map(async (orden: any) => {
        const detalleResult = await erpPool.request()
          .input('ordenID', sql.Int, orden.ID)
          .query(`
            SELECT
              ID,
              Renglon,
              RenglonSub,
              RenglonID,
              RenglonTipo,
              Cantidad,
              Almacen,
              Codigo,
              Articulo,
              SubCuenta,
              FechaRequerida,
              FechaEntrega,
              Costo,
              CostoConImpuesto,
              Impuesto1,
              Impuesto2,
              Impuesto3,
              Retencion1
            FROM CompraD
            WHERE ID = @ordenID
            ORDER BY Renglon
          `);

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
          nombreProveedor: orden.NombreProveedor,
          rfc: orden.RFC,
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
          tipoMovimiento: orden.TipoMovimiento,
          movimientoNombre: orden.MovimientoNombre,

          // Detalle (partidas)
          partidas: detalleResult.recordset.map((detalle: any) => ({
            renglon: detalle.Renglon,
            renglonSub: detalle.RenglonSub,
            renglonID: detalle.RenglonID,
            renglonTipo: detalle.RenglonTipo,
            cantidad: detalle.Cantidad,
            almacen: detalle.Almacen,
            codigo: detalle.Codigo,
            articulo: detalle.Articulo,
            subCuenta: detalle.SubCuenta,
            fechaRequerida: detalle.FechaRequerida,
            fechaEntrega: detalle.FechaEntrega,
            costo: detalle.Costo,
            costoConImpuesto: detalle.CostoConImpuesto,
            impuesto1: detalle.Impuesto1,
            impuesto2: detalle.Impuesto2,
            impuesto3: detalle.Impuesto3,
            retencion1: detalle.Retencion1,
            subtotal: (detalle.Cantidad || 0) * (detalle.Costo || 0),
            totalPartida: (detalle.Cantidad || 0) * (detalle.CostoConImpuesto || 0)
          }))
        };
      })
    );

    // Calcular estadísticas
    const estadisticas = {
      totalOrdenes: ordenes.length,
      porEstatus: ordenes.reduce((acc: any, orden: any) => {
        acc[orden.estatus] = (acc[orden.estatus] || 0) + 1;
        return acc;
      }, {}),
      porSituacion: ordenes.reduce((acc: any, orden: any) => {
        if (orden.situacion) {
          acc[orden.situacion] = (acc[orden.situacion] || 0) + 1;
        }
        return acc;
      }, {}),
      totalImporte: ordenes.reduce((sum, orden) => sum + orden.importe, 0),
      totalImpuestos: ordenes.reduce((sum, orden) => sum + orden.impuestos, 0),
      totalGeneral: ordenes.reduce((sum, orden) => sum + orden.total, 0),
      totalSaldo: ordenes.reduce((sum, orden) => sum + orden.saldo, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        proveedor: {
          codigo: proveedor.Proveedor,
          nombre: proveedor.Nombre,
          rfc: proveedor.RFC
        },
        empresa: empresaParam,
        filtroEstatus: estatusFiltro,
        ordenes: ordenes,
        estadisticas: estadisticas
      }
    });

  } catch (error: any) {
    console.error('[ADMIN ORDENES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes del proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
