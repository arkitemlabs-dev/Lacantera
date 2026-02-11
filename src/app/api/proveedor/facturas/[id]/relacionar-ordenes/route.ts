import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * POST /api/proveedor/facturas/[id]/relacionar-ordenes
 *
 * Relaciona una factura con una o más órdenes de compra
 *
 * Body:
 * {
 *   "ordenes": [
 *     { "orden_erp_id": 12345, "monto_aplicado": 5000.00 },
 *     { "orden_erp_id": 12346, "monto_aplicado": 3000.00 }
 *   ]
 * }
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  let facturaId = 'unknown';
  try {
    const params = await props.params;
    facturaId = params.id;
    console.log(`🔍 [POST /api/proveedor/facturas/${facturaId}/relacionar-ordenes] Iniciando...`);

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parsear body
    const body = await request.json();
    const { ordenes } = body;

    if (!ordenes || !Array.isArray(ordenes) || ordenes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Debe proporcionar al menos una orden'
      }, { status: 400 });
    }

    console.log(`📍 Relacionando ${ordenes.length} órdenes con factura ${facturaId}`);

    // 3. Obtener factura del portal
    const portalPool = await getPortalConnection();
    const facturaResult = await portalPool.request()
      .input('facturaId', sql.UniqueIdentifier, facturaId)
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT
          ID AS id,
          SubidoPor AS portal_user_id,
          Empresa AS empresa_code,
          UUID AS uuid,
          Total AS total,
          Estatus AS estatus,
          OrdenesRelacionadas AS ordenes_relacionadas
        FROM ProvFacturas
        WHERE ID = @facturaId
          AND SubidoPor = @userId
      `);

    if (!facturaResult.recordset || facturaResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada o no pertenece a este proveedor'
      }, { status: 404 });
    }

    const factura = facturaResult.recordset[0];
    console.log(`✅ Factura encontrada: ${factura.uuid}, Total: ${factura.total}`);

    // 4. Verificar que la factura no esté cancelada
    if (factura.estatus === 'CANCELADO' || factura.estatus === 'RECHAZADA') {
      return NextResponse.json({
        success: false,
        error: 'No se pueden relacionar órdenes a una factura cancelada o rechazada'
      }, { status: 400 });
    }

    // 5. Validar montos
    const totalAplicado = ordenes.reduce((sum, o) => sum + parseFloat(o.monto_aplicado), 0);
    const totalFactura = parseFloat(factura.total);

    if (totalAplicado > totalFactura) {
      return NextResponse.json({
        success: false,
        error: `La suma de montos aplicados ($${totalAplicado.toFixed(2)}) excede el total de la factura ($${totalFactura.toFixed(2)})`
      }, { status: 400 });
    }

    console.log(`✅ Validación de montos OK: Aplicado=${totalAplicado}, Total=${totalFactura}`);

    // 6. Obtener mapping para validar acceso a la empresa
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresa', sql.VarChar(50), factura.empresa_code)
      .query(`
        SELECT erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresa
          AND activo = 1
      `);

    if (!mappingResult.recordset || mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No tiene acceso a esta empresa'
      }, { status: 403 });
    }

    const { erp_proveedor_code } = mappingResult.recordset[0];

    // 7. Conectar al ERP y validar que las órdenes existen y pertenecen al proveedor
    const pool = await getERPConnection(factura.empresa_code);
    const ordenesValidas: any[] = [];

    for (const orden of ordenes) {
      const ordenResult = await pool.request()
        .input('ordenId', sql.Int, orden.orden_erp_id)
        .input('proveedorCode', sql.VarChar(10), erp_proveedor_code)
        .query(`
          SELECT
            ID,
            Mov AS Folio,
            MovID,
            Proveedor,
            Importe,
            Impuestos,
            (Importe + Impuestos) AS Total,
            Estatus
          FROM Compra
          WHERE ID = @ordenId
            AND Proveedor = @proveedorCode
        `);

      if (!ordenResult.recordset || ordenResult.recordset.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Orden ${orden.orden_erp_id} no encontrada o no pertenece a este proveedor`
        }, { status: 404 });
      }

      const ordenData = ordenResult.recordset[0];

      // Validar que el monto aplicado no exceda el total de la orden
      if (parseFloat(orden.monto_aplicado) > parseFloat(ordenData.Total)) {
        return NextResponse.json({
          success: false,
          error: `El monto aplicado a la orden ${ordenData.Folio} ($${orden.monto_aplicado}) excede su total ($${ordenData.Total})`
        }, { status: 400 });
      }

      ordenesValidas.push({
        ...ordenData,
        monto_aplicado: parseFloat(orden.monto_aplicado)
      });

      console.log(`✅ Orden ${ordenData.Folio} validada`);
    }

    // 8. Eliminar relaciones anteriores de esta factura
    await portalPool.request()
      .input('facturaId', sql.UniqueIdentifier, facturaId)
      .query(`
        DELETE FROM proveedor_facturas_ordenes
        WHERE factura_id = @facturaId
      `);

    console.log('🗑️  Relaciones anteriores eliminadas');

    // 9. Insertar nuevas relaciones
    for (const orden of ordenesValidas) {
      await portalPool.request()
        .input('id', sql.UniqueIdentifier, null) // Auto-genera
        .input('facturaId', sql.UniqueIdentifier, facturaId)
        .input('empresaCode', sql.VarChar(50), factura.empresa_code)
        .input('ordenErpId', sql.Int, orden.ID)
        .input('ordenFolio', sql.VarChar(50), orden.Folio)
        .input('montoAplicado', sql.Decimal(18, 2), orden.monto_aplicado)
        .query(`
          INSERT INTO proveedor_facturas_ordenes (
            id, factura_id, empresa_code, orden_erp_id, orden_folio, monto_aplicado, created_at
          ) VALUES (
            NEWID(), @facturaId, @empresaCode, @ordenErpId, @ordenFolio, @montoAplicado, GETDATE()
          )
        `);

      console.log(`✅ Relación creada con orden ${orden.Folio}`);
    }

    // 10. Actualizar campo ordenes_relacionadas (JSON) en la factura
    const ordenesJSON = JSON.stringify(ordenesValidas.map(o => ({
      orden_erp_id: o.ID,
      folio: o.Folio,
      monto_aplicado: o.monto_aplicado,
      total_orden: parseFloat(o.Total)
    })));

    await portalPool.request()
      .input('facturaId', sql.UniqueIdentifier, facturaId)
      .input('ordenesJSON', sql.NVarChar(sql.MAX), ordenesJSON)
      .query(`
        UPDATE ProvFacturas
        SET
          OrdenesRelacionadas = @ordenesJSON,
          UpdatedAt = GETDATE()
        WHERE ID = @facturaId
      `);

    console.log('✅ Campo ordenes_relacionadas actualizado');

    // 11. Retornar respuesta
    return NextResponse.json({
      success: true,
      factura: {
        id: facturaId,
        uuid: factura.uuid,
        total: factura.total,
        empresaCode: factura.empresa_code
      },
      ordenesRelacionadas: ordenesValidas.map(o => ({
        ordenErpId: o.ID,
        folio: o.Folio,
        montoAplicado: o.monto_aplicado,
        totalOrden: parseFloat(o.Total),
        estatus: o.Estatus
      })),
      resumen: {
        totalOrdenes: ordenesValidas.length,
        montoTotalAplicado: totalAplicado.toFixed(2),
        totalFactura: totalFactura.toFixed(2),
        montoRestante: (totalFactura - totalAplicado).toFixed(2)
      }
    });

  } catch (error: any) {
    console.error(`❌ [POST /api/proveedor/facturas/${facturaId}/relacionar-ordenes] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Error al relacionar órdenes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
