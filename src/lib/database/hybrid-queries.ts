// src/lib/database/hybrid-queries.ts
// Helpers para queries híbridas Portal + ERP Intelisis

import { hybridDB, getTenantConfig } from './multi-tenant-connection';
import { ERP_DATABASES, getEmpresasProduccion, getTodasLasEmpresas, validateEmpresaCode } from './tenant-configs';

/**
 * Obtiene proveedores del ERP con datos adicionales del Portal
 */
export async function getProveedorWithPortalData(
  tenantId: string,
  proveedorCodigo: string
) {
  const config = getTenantConfig(tenantId);

  // Query ERP: Datos del proveedor
  const erpData = await hybridDB.queryERP(
    tenantId,
    `
    SELECT
      Proveedor, Nombre, RFC, eMail1, eMail2,
      Contacto1, Telefonos, Estatus, Direccion
    FROM Prov
    WHERE Proveedor = @proveedorCodigo
      AND Estatus = 'ALTA'
    `,
    { proveedorCodigo }
  );

  if (!erpData.recordset.length) {
    return null;
  }

  const proveedor = erpData.recordset[0];

  // Query Portal: Usuarios mapeados a este proveedor
  const portalData = await hybridDB.queryPortal(
    `
    SELECT
      pu.id, pu.email, pu.nombre_completo,
      ppm.permisos, ppm.activo as mapping_activo
    FROM portal_proveedor_mapping ppm
    INNER JOIN portal_usuarios pu ON ppm.portal_user_id = pu.id
    WHERE ppm.erp_proveedor_code = @proveedorCodigo
      AND ppm.empresa_code = @empresaCodigo
      AND ppm.activo = 1
    `,
    {
      proveedorCodigo,
      empresaCodigo: config.codigoEmpresa,
    }
  );

  return {
    erp: proveedor,
    portalUsers: portalData.recordset,
    tenantId,
    empresaCodigo: config.codigoEmpresa,
  };
}

/**
 * Obtiene órdenes de compra del ERP con estados del Portal
 */
export async function getOrdenesCompraHybrid(
  tenantId: string,
  proveedorCodigo: string,
  options: {
    limit?: number;
    offset?: number;
    fechaDesde?: Date;
    fechaHasta?: Date;
  } = {}
) {
  const config = getTenantConfig(tenantId);
  const { limit = 50, offset = 0, fechaDesde, fechaHasta } = options;

  // Query ERP: Órdenes de compra
  let erpQuery = `
    SELECT
      c.ID as orden_id,
      c.Mov as numero_orden,
      c.Empresa,
      c.Proveedor,
      c.FechaEmision as fecha_emision,
      c.FechaRequerida as fecha_requerida,
      c.Importe as importe,
      c.Estatus as estatus_erp,
      c.Observaciones as observaciones_erp,
      p.Nombre as proveedor_nombre,
      p.RFC as proveedor_rfc
    FROM Compra c
    INNER JOIN Prov p ON c.Proveedor = p.Proveedor
    WHERE c.Proveedor = @proveedorCodigo
      AND c.Empresa = @empresaCodigo
  `;

  const erpParams: any = {
    proveedorCodigo,
    empresaCodigo: config.codigoEmpresa,
  };

  if (fechaDesde) {
    erpQuery += ' AND c.FechaEmision >= @fechaDesde';
    erpParams.fechaDesde = fechaDesde.toISOString().split('T')[0];
  }

  if (fechaHasta) {
    erpQuery += ' AND c.FechaEmision <= @fechaHasta';
    erpParams.fechaHasta = fechaHasta.toISOString().split('T')[0];
  }

  erpQuery += `
    ORDER BY c.FechaEmision DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `;

  erpParams.offset = offset;
  erpParams.limit = limit;

  const erpResult = await hybridDB.queryERP(tenantId, erpQuery, erpParams);

  if (!erpResult.recordset.length) {
    return [];
  }

  const ordenIds = erpResult.recordset.map(o => o.orden_id);

  const portalResult = await hybridDB.queryPortal(
    `
    SELECT
      ops.erp_orden_id,
      ops.status_portal,
      ops.fecha_respuesta,
      ops.observaciones_proveedor,
      ops.respondido_por,
      pu.nombre_completo as respondido_por_nombre
    FROM portal_orden_status ops
    LEFT JOIN portal_usuarios pu ON ops.respondido_por = pu.id
    WHERE ops.erp_orden_id IN (${ordenIds.map((_, i) => `@id${i}`).join(',')})
      AND ops.empresa_code = @empresaCodigo
    `,
    {
      ...ordenIds.reduce((acc, id, i) => ({ ...acc, [`id${i}`]: id }), {}),
      empresaCodigo: config.codigoEmpresa,
    }
  );

  const portalStatusMap = new Map(
    portalResult.recordset.map(ps => [ps.erp_orden_id, ps])
  );

  return erpResult.recordset.map(orden => ({
    ...orden,
    status_portal:
      portalStatusMap.get(orden.orden_id)?.status_portal ||
      'pendiente_respuesta',
    fecha_respuesta: portalStatusMap.get(orden.orden_id)?.fecha_respuesta,
    observaciones_proveedor:
      portalStatusMap.get(orden.orden_id)?.observaciones_proveedor,
    respondido_por: portalStatusMap.get(orden.orden_id)?.respondido_por_nombre,
  }));
}

/**
 * Obtiene detalle de una orden de compra (ERP) con su estado (Portal)
 */
export async function getOrdenCompraDetalle(
  tenantId: string,
  ordenId: number
) {
  const config = getTenantConfig(tenantId);

  const erpResult = await hybridDB.queryERP(
    tenantId,
    `
    -- Encabezado
    SELECT
      c.ID as orden_id,
      c.Mov as numero_orden,
      c.Empresa,
      c.Proveedor,
      c.FechaEmision as fecha_emision,
      c.FechaRequerida as fecha_requerida,
      c.Importe as importe,
      c.Estatus as estatus_erp,
      c.Observaciones as observaciones_erp,
      p.Nombre as proveedor_nombre,
      p.RFC as proveedor_rfc,
      p.eMail1 as proveedor_email
    FROM Compra c
    INNER JOIN Prov p ON c.Proveedor = p.Proveedor
    WHERE c.ID = @ordenId
      AND c.Empresa = @empresaCodigo;

    -- Detalle
    SELECT
      cd.ID,
      cd.Renglon,
      cd.Codigo,
      cd.Articulo,
      cd.DescripcionExtra as descripcion,
      cd.Cantidad,
      cd.Unidad,
      cd.Costo as costo_unitario,
      cd.CostoConImpuesto as costo_con_impuesto,
      (cd.Cantidad * cd.CostoConImpuesto) as subtotal
    FROM CompraD cd
    WHERE cd.ID = @ordenId
    ORDER BY cd.Renglon;
    `,
    { ordenId, empresaCodigo: config.codigoEmpresa }
  );

  if (!(erpResult as any).recordsets[0].length) {
    return null;
  }

  const encabezado = (erpResult as any).recordsets[0][0];
  const detalle = (erpResult as any).recordsets[1];

  const portalResult = await hybridDB.queryPortal(
    `
    SELECT
      ops.status_portal,
      ops.fecha_respuesta,
      ops.observaciones_proveedor,
      ops.respondido_por,
      pu.nombre_completo as respondido_por_nombre,
      pu.email as respondido_por_email
    FROM portal_orden_status ops
    LEFT JOIN portal_usuarios pu ON ops.respondido_por = pu.id
    WHERE ops.erp_orden_id = @ordenId
      AND ops.empresa_code = @empresaCodigo
    `,
    { ordenId, empresaCodigo: config.codigoEmpresa }
  );

  const portalStatus = portalResult.recordset[0] || {
    status_portal: 'pendiente_respuesta',
  };

  return {
    encabezado: {
      ...encabezado,
      ...portalStatus,
    },
    detalle,
  };
}

/**
 * Actualiza el estado de una orden en el Portal
 */
export async function updateOrdenStatus(
  tenantId: string,
  ordenId: number,
  statusData: {
    status_portal: string;
    observaciones_proveedor?: string;
    respondido_por: string;
  }
) {
  const config = getTenantConfig(tenantId);

  await hybridDB.queryPortal(
    `
    MERGE portal_orden_status AS target
    USING (
      SELECT
        @ordenId as erp_orden_id,
        @empresaCodigo as empresa_code,
        @statusPortal as status_portal,
        @observaciones as observaciones_proveedor,
        @respondidoPor as respondido_por,
        GETDATE() as fecha_respuesta
    ) AS source
    ON target.erp_orden_id = source.erp_orden_id
       AND target.empresa_code = source.empresa_code
    WHEN MATCHED THEN
      UPDATE SET
        status_portal = source.status_portal,
        observaciones_proveedor = source.observaciones_proveedor,
        respondido_por = source.respondido_por,
        fecha_respuesta = source.fecha_respuesta,
        updated_at = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (
        id, erp_orden_id, empresa_code, status_portal,
        observaciones_proveedor, respondido_por, fecha_respuesta,
        created_at, updated_at
      )
      VALUES (
        NEWID(), source.erp_orden_id, source.empresa_code,
        source.status_portal, source.observaciones_proveedor,
        source.respondido_por, source.fecha_respuesta,
        GETDATE(), GETDATE()
      );
    `,
    {
      ordenId,
      empresaCodigo: config.codigoEmpresa,
      statusPortal: statusData.status_portal,
      observaciones: statusData.observaciones_proveedor || null,
      respondidoPor: statusData.respondido_por,
    }
  );

  return { success: true };
}

/**
 * Obtiene facturas del ERP con workflow del Portal
 */
export async function getFacturasHybrid(
  tenantId: string,
  proveedorCodigo: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const config = getTenantConfig(tenantId);
  const { limit = 50, offset = 0 } = options;

  const erpResult = await hybridDB.queryERP(
    tenantId,
    `
    SELECT
      cf.ID as cfdi_id,
      cf.UUID,
      cf.Fecha as fecha,
      cf.Serie,
      cf.Folio,
      cf.SubTotal as subtotal,
      cf.Total as total,
      cf.EstatusSAT as estatus_sat
    FROM CFDI_Comprobante cf
    WHERE cf.Proveedor = @proveedorCodigo
    ORDER BY cf.Fecha DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
    `,
    { proveedorCodigo, offset, limit }
  );

  if (!erpResult.recordset.length) {
    return [];
  }

  const cfdiIds = erpResult.recordset.map(f => f.cfdi_id);

  const portalResult = await hybridDB.queryPortal(
    `
    SELECT
      pfw.erp_cfdi_id,
      pfw.status_portal,
      pfw.fecha_subida,
      pfw.fecha_revision,
      pfw.comentarios_revision,
      pfw.archivo_pdf_url,
      pfw.archivo_xml_url,
      pu_subida.nombre_completo as subida_por_nombre,
      pu_revision.nombre_completo as revisada_por_nombre
    FROM portal_factura_workflow pfw
    LEFT JOIN portal_usuarios pu_subida ON pfw.subida_por = pu_subida.id
    LEFT JOIN portal_usuarios pu_revision ON pfw.revisada_por = pu_revision.id
    WHERE pfw.erp_cfdi_id IN (${cfdiIds.map((_, i) => `@cfdi${i}`).join(',')})
      AND pfw.empresa_code = @empresaCodigo
    `,
    {
      ...cfdiIds.reduce((acc, id, i) => ({ ...acc, [`cfdi${i}`]: id }), {}),
      empresaCodigo: config.codigoEmpresa,
    }
  );

  const portalMap = new Map(
    portalResult.recordset.map(p => [p.erp_cfdi_id, p])
  );

  return erpResult.recordset.map(factura => ({
    ...factura,
    portal: portalMap.get(factura.cfdi_id) || null,
  }));
}

/**
 * Valida que un usuario tenga acceso a un tenant/empresa
 */
export async function validateUserTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const config = getTenantConfig(tenantId);

  const result = await hybridDB.queryPortal(
    `
    SELECT COUNT(*) as count
    FROM portal_proveedor_mapping
    WHERE portal_user_id = @userId
      AND empresa_code = @empresaCodigo
      AND activo = 1
    `,
    { userId, empresaCodigo: config.codigoEmpresa }
  );

  return result.recordset[0].count > 0;
}

/**
 * Obtiene las empresas a las que un usuario tiene acceso.
 * Retorna objetos con código numérico ('01'-'10').
 */
export async function getUserTenants(userId: string, userRole?: string, userEmail?: string) {
  // Excepción para usuario de pruebas del desarrollador (Acceso Total)
  const testerEmails = [
    'ediaz@arkitem.com',
    'admin@lacantera.com',
    'viviana.diaz@arkitem.com',
    'lmontero@arkitem.com',
    'luis.montero@arkitem.com'
  ];
  if (userEmail && testerEmails.includes(userEmail.toLowerCase())) {
    console.log(`[getUserTenants] Aplicando excepción de tester para: ${userEmail}`);
    return getTodasLasEmpresas().map(config => ({
      codigo: config.code,
      nombre: config.nombre,
      proveedorCodigo: null,
    }));
  }

  if (userRole === 'super-admin') {
    return getTodasLasEmpresas().map(config => ({
      codigo: config.code,
      nombre: config.nombre,
      proveedorCodigo: null,
    }));
  }

  if (userRole === 'admin') {
    return getTodasLasEmpresas().map(config => ({
      codigo: config.code,
      nombre: config.nombre,
      proveedorCodigo: null,
    }));
  }

  const result = await hybridDB.queryPortal(
    `
    SELECT DISTINCT
      ppm.empresa_code,
      ppm.erp_proveedor_code,
      ppm.permisos
    FROM portal_proveedor_mapping ppm
    WHERE ppm.portal_user_id = @userId
      AND ppm.activo = 1
    `,
    { userId }
  );

  return result.recordset.map(row => {
    let codigo: string;
    try {
      codigo = validateEmpresaCode(row.empresa_code);
    } catch {
      console.warn(`[getUserTenants] empresa_code no reconocido: ${row.empresa_code}`);
      codigo = row.empresa_code;
    }
    const config = ERP_DATABASES[codigo];
    return {
      codigo,
      nombre: config?.nombre || row.empresa_code,
      proveedorCodigo: row.erp_proveedor_code,
    };
  });
}
