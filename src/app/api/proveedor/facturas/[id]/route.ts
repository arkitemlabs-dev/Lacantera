import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getEmpresaERPFromTenant, getNombreEmpresa } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * GET /api/proveedor/facturas/[id]
 *
 * Obtiene el detalle completo de una factura específica
 *
 * Params:
 * - id: ID de la factura en el ERP
 *
 * Query Parameters:
 * - empresa (requerido): Código de empresa para saber a qué ERP conectar
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  let facturaId = 'unknown';
  try {
    const params = await props.params;
    facturaId = params.id;
    console.log(`🔍 [GET /api/proveedor/facturas/${facturaId}] Iniciando...`);

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Obtener parámetro empresa (requerido)
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa');

    if (!empresa) {
      return NextResponse.json({
        success: false,
        error: 'Parámetro "empresa" es requerido'
      }, { status: 400 });
    }

    console.log(`📍 Buscando factura ID ${facturaId} en empresa ${empresa}`);

    // 3. Verificar acceso del proveedor a la empresa
    const portalPool = await getPortalConnection();
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresa', sql.VarChar(50), empresa)
      .query(`
        SELECT
          erp_proveedor_code,
          empresa_code,
          permisos
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
    console.log(`✅ Proveedor código: ${erp_proveedor_code}`);

    // 4. Conectar al ERP de la empresa
    const pool = await getERPConnection(empresa);

    // 5. Obtener factura principal (Cxc)
    const facturaResult = await pool.request()
      .input('facturaId', sql.Int, parseInt(facturaId))
      .input('proveedorCode', sql.VarChar(10), erp_proveedor_code)
      .query(`
        SELECT
          ID,
          Empresa,
          Mov AS Folio,
          MovID,
          FechaEmision,
          UltimoCambio,
          Concepto,
          Proyecto,
          Moneda,
          TipoCambio,
          Usuario,
          Referencia,
          Observaciones,
          Estatus,
          Situacion,
          SituacionFecha,
          Cliente AS CodigoCliente,
          ClienteMoneda,
          ClienteTipoCambio,
          Importe AS Subtotal,
          Impuestos,
          Retencion,
          (Importe + Impuestos) AS Total,
          Saldo,
          Vencimiento,
          Condicion,
          FormaCobro,
          FechaRegistro,
          FechaConclusion,
          FechaCancelacion,
          FechaProntoPago,
          OrigenTipo,
          Origen,
          OrigenID,
          MovAplica,
          MovAplicaID,
          Actividad,
          Comentarios,
          Nota
        FROM Cxc
        WHERE ID = @facturaId
          AND Cliente = @proveedorCode
      `);

    if (!facturaResult.recordset || facturaResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Factura no encontrada o no pertenece a este proveedor'
      }, { status: 404 });
    }

    const factura = facturaResult.recordset[0];
    console.log(`✅ Factura encontrada: ${factura.Folio}`);

    // 6. Buscar XML en SatXml si existe
    // Obtener código ERP de la empresa
    const empresaERP = getEmpresaERPFromTenant(empresa);

    let xmlData = null;
    try {
      // Intentar buscar por MovID o Folio en SatXml
      const xmlResult = await pool.request()
        .input('movID', sql.VarChar(20), factura.MovID)
        .input('folio', sql.VarChar(40), factura.Folio)
        .input('empresaERP', sql.VarChar(10), empresaERP)
        .query(`
          SELECT TOP 1
            FolioFiscal AS UUID,
            RFCEmisor,
            NombreoRazonSocialdelEmisor AS NombreEmisor,
            RFCReceptor,
            NombreoRazonSocialdelReceptor AS NombreReceptor,
            FechadeEmision,
            FechadeCertificacion,
            Total,
            SubTotal,
            Descuento,
            EstadodelComprobante,
            EfectodelComprobante,
            Moneda,
            TipoCambio,
            Serie,
            Folio,
            FormaPago,
            MetodoPago,
            LugarExpedicion,
            TotalImpRetenidos,
            TotalImpTrasladados,
            UrlXml
          FROM SatXml
          WHERE (MovID = @movID OR Folio = @folio)
            AND Empresa = @empresaERP
          ORDER BY FechadeEmision DESC
        `);

      if (xmlResult.recordset && xmlResult.recordset.length > 0) {
        xmlData = xmlResult.recordset[0];
        console.log(`✅ XML encontrado: UUID ${xmlData.UUID}`);
      }
    } catch (xmlError: any) {
      console.log(`⚠️ No se pudo obtener XML: ${xmlError.message}`);
    }

    // 7. Obtener información del proveedor/cliente
    let proveedorInfo = null;
    try {
      const provResult = await pool.request()
        .input('codigo', sql.VarChar(10), erp_proveedor_code)
        .query(`
          SELECT TOP 1
            Cliente AS Codigo,
            Nombre,
            RFC,
            Telefono1,
            eMail1 AS Email,
            Estatus
          FROM Clie
          WHERE Cliente = @codigo
        `);

      if (provResult.recordset && provResult.recordset.length > 0) {
        proveedorInfo = provResult.recordset[0];
      }
    } catch (provError: any) {
      console.log(`⚠️ No se pudo obtener info del cliente: ${provError.message}`);
    }

    // 8. Retornar respuesta completa
    return NextResponse.json({
      success: true,
      factura: {
        ...factura,
        EmpresaCodigo: empresa,
        EmpresaNombre: getNombreEmpresa(empresa),
        CodigoProveedor: erp_proveedor_code
      },
      xml: xmlData,
      proveedor: proveedorInfo,
      resumen: {
        subtotal: parseFloat(factura.Subtotal) || 0,
        impuestos: parseFloat(factura.Impuestos) || 0,
        retencion: parseFloat(factura.Retencion) || 0,
        total: parseFloat(factura.Total) || 0,
        saldo: parseFloat(factura.Saldo) || 0,
        pagado: (parseFloat(factura.Total) || 0) - (parseFloat(factura.Saldo) || 0),
        moneda: factura.Moneda,
        estaPagada: parseFloat(factura.Saldo) === 0,
        estaCancelada: factura.Estatus === 'CANCELADO'
      }
    });

  } catch (error: any) {
    console.error(`❌ [GET /api/proveedor/facturas/${facturaId}] Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener detalle de factura',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
