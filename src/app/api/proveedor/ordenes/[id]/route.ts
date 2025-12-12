import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * GET /api/proveedor/ordenes/[id]
 * Obtiene el detalle completo de una orden de compra específica
 *
 * Query params:
 * - empresa: string (requerido: la-cantera, peralillo, plaza-galerena)
 *
 * Params:
 * - id: ID de la orden en el ERP
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const empresa = searchParams.get('empresa');
    const ordenId = params.id;

    if (!empresa) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "empresa"' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    console.log(`\n🔍 Obteniendo detalle de orden ${ordenId} en ${empresa} para usuario ${userId}`);

    // 1. Verificar que el usuario tiene acceso a esta empresa
    const portalPool = await getPortalConnection();
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresa', sql.VarChar(50), empresa)
      .query(`
        SELECT erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresa
          AND activo = 1
      `);

    if (mappingResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta empresa' },
        { status: 403 }
      );
    }

    const proveedorCode = mappingResult.recordset[0].erp_proveedor_code;

    // 2. Obtener la orden del ERP
    const pool = await getERPConnection(empresa);

    // Obtener datos de la orden (cabecera)
    const ordenResult = await pool.request().query(`
      SELECT
        ID,
        Mov AS Folio,
        MovID,
        Empresa,
        Proveedor AS CodigoProveedor,
        FechaEmision,
        Importe AS Subtotal,
        Impuestos,
        (Importe + Impuestos) AS Total,
        Moneda,
        Estatus,
        Condicion,
        Observaciones,
        Usuario,
        FechaRequerida,
        Almacen,
        TipoCambio
      FROM Compra
      WHERE ID = ${ordenId}
        AND Proveedor = '${proveedorCode}'
    `);

    if (ordenResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Orden no encontrada o no tienes permiso para verla' },
        { status: 404 }
      );
    }

    const orden = ordenResult.recordset[0];

    // 3. Obtener el detalle de la orden (productos/artículos)
    const detalleResult = await pool.request().query(`
      SELECT
        ID,
        Renglon,
        Articulo,
        DescripcionExtra AS Descripcion,
        Cantidad,
        Unidad,
        PrecioLista AS Precio,
        DescuentoImporte AS DescuentoMonto,
        Almacen,
        CantidadPendiente,
        CantidadSurtida
      FROM CompraD
      WHERE ID = ${ordenId}
      ORDER BY Renglon
    `);

    // 4. Obtener información del proveedor
    const proveedorResult = await pool.request().query(`
      SELECT
        Proveedor AS Codigo,
        Nombre,
        RFC,
        eMail1 AS Email,
        Telefonos,
        Direccion,
        Colonia,
        Poblacion AS Ciudad,
        Estado,
        CodigoPostal AS CP
      FROM Prov
      WHERE Proveedor = '${proveedorCode}'
    `);

    const proveedor = proveedorResult.recordset[0] || null;

    console.log(`✅ Orden encontrada con ${detalleResult.recordset.length} líneas de detalle`);

    return NextResponse.json({
      success: true,
      orden: {
        ...orden,
        Empresa: empresa,
        EmpresaNombre: empresa === 'la-cantera' ? 'La Cantera' :
                       empresa === 'peralillo' ? 'Peralillo' :
                       empresa === 'plaza-galerena' ? 'Plaza Galereña' :
                       empresa === 'inmobiliaria-galerena' ? 'Inmobiliaria Galereña' :
                       empresa === 'icrear' ? 'Icrear' : empresa,
      },
      detalle: detalleResult.recordset,
      proveedor,
      resumen: {
        totalArticulos: detalleResult.recordset.length,
        cantidadTotal: detalleResult.recordset.reduce((sum, item) => sum + (item.Cantidad || 0), 0),
        subtotal: orden.Subtotal,
        impuestos: orden.Impuestos,
        total: orden.Total,
      },
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo detalle de orden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener detalle de orden',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
