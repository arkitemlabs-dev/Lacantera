// src/lib/database/ordenes-compra-queries.ts
// Queries para órdenes de compra desde tabla Compra

import { hybridDB } from './multi-tenant-connection';

/**
 * Interface para orden de compra
 */
export interface OrdenCompra {
  id: number;
  empresa: string;
  mov: string;
  movID: string;
  fechaEmision: Date;
  ultimoCambio: Date;
  concepto: string;
  proyecto: string;
  proveedor: string;
  moneda: string;
  tipoCambio: number;
  usuario: string;
  referencia: string;
  estatus: string;
  situacion: string;
  situacionFecha: Date | null;
  situacionUsuario: string;
  situacionNota: string;
  fechaRequerida: Date;
  almacen: string;
  condicion: string;
  vencimiento: Date;
  importe: number;
  impuestos: number;
  saldo: number;
  fechaRegistro: Date;
  fechaEntrega: Date | null;
  observaciones: string;
  prioridad: string;
  agente: string;
  descuento: number;
}

/**
 * Obtiene órdenes de compra pendientes
 */
export async function getOrdenesCompraPendientes(
  filtros: {
    proveedor?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    proveedor,
    fechaDesde,
    fechaHasta,
    page = 1,
    limit = 50,
  } = filtros;

  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT
        c.ID,
        c.Empresa,
        c.Mov,
        c.MovID,
        c.FechaEmision,
        c.UltimoCambio,
        c.Concepto,
        c.Proyecto,
        c.Proveedor,
        c.Moneda,
        c.TipoCambio,
        c.Usuario,
        c.Referencia,
        c.Estatus,
        c.Situacion,
        c.SituacionFecha,
        c.SituacionUsuario,
        c.SituacionNota,
        c.FechaRequerida,
        c.Almacen,
        c.Condicion,
        c.Vencimiento,
        c.Importe,
        c.Impuestos,
        c.Saldo,
        c.FechaRegistro,
        c.FechaEntrega,
        c.Observaciones,
        c.Prioridad,
        c.Agente,
        c.Descuento,
        p.Nombre as ProveedorNombre
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
    `;

    const params: any = {};

    // Filtro por proveedor
    if (proveedor) {
      query += ` AND c.Proveedor = @proveedor`;
      params.proveedor = proveedor;
    }

    // Filtro por fecha desde
    if (fechaDesde) {
      query += ` AND c.FechaEmision >= @fechaDesde`;
      params.fechaDesde = fechaDesde;
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      query += ` AND c.FechaEmision <= @fechaHasta`;
      params.fechaHasta = fechaHasta;
    }

    // Ordenar por fecha de emisión descendente
    query += ` ORDER BY c.FechaEmision DESC`;

    // Paginación
    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = offset;
    params.limit = limit;

    const result = await hybridDB.queryERP('la-cantera', query, params);

    // Contar total de registros
    let countQuery = `
      SELECT COUNT(*) as total
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
    `;

    const countParams: any = {};

    if (proveedor) {
      countQuery += ` AND c.Proveedor = @proveedor`;
      countParams.proveedor = proveedor;
    }

    if (fechaDesde) {
      countQuery += ` AND c.FechaEmision >= @fechaDesde`;
      countParams.fechaDesde = fechaDesde;
    }

    if (fechaHasta) {
      countQuery += ` AND c.FechaEmision <= @fechaHasta`;
      countParams.fechaHasta = fechaHasta;
    }

    const countResult = await hybridDB.queryERP('la-cantera', countQuery, countParams);
    const total = countResult.recordset[0].total;

    const ordenes: OrdenCompra[] = result.recordset.map((row: any) => ({
      id: row.ID,
      empresa: row.Empresa,
      mov: row.Mov,
      movID: row.MovID,
      fechaEmision: row.FechaEmision,
      ultimoCambio: row.UltimoCambio,
      concepto: row.Concepto,
      proyecto: row.Proyecto,
      proveedor: row.Proveedor,
      moneda: row.Moneda,
      tipoCambio: row.TipoCambio,
      usuario: row.Usuario,
      referencia: row.Referencia,
      estatus: row.Estatus,
      situacion: row.Situacion,
      situacionFecha: row.SituacionFecha,
      situacionUsuario: row.SituacionUsuario,
      situacionNota: row.SituacionNota,
      fechaRequerida: row.FechaRequerida,
      almacen: row.Almacen,
      condicion: row.Condicion,
      vencimiento: row.Vencimiento,
      importe: row.Importe,
      impuestos: row.Impuestos,
      saldo: row.Saldo,
      fechaRegistro: row.FechaRegistro,
      fechaEntrega: row.FechaEntrega,
      observaciones: row.Observaciones,
      prioridad: row.Prioridad,
      agente: row.Agente,
      descuento: row.Descuento,
    }));

    return {
      ordenes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

  } catch (error: any) {
    console.error('Error en getOrdenesCompraPendientes:', error);
    throw error;
  }
}

/**
 * Obtiene una orden de compra específica por ID
 */
export async function getOrdenCompraPorID(id: number): Promise<OrdenCompra> {
  try {
    const result = await hybridDB.queryERP('la-cantera', `
      SELECT
        c.ID,
        c.Empresa,
        c.Mov,
        c.MovID,
        c.FechaEmision,
        c.UltimoCambio,
        c.Concepto,
        c.Proyecto,
        c.Proveedor,
        c.Moneda,
        c.TipoCambio,
        c.Usuario,
        c.Referencia,
        c.Estatus,
        c.Situacion,
        c.SituacionFecha,
        c.SituacionUsuario,
        c.SituacionNota,
        c.FechaRequerida,
        c.Almacen,
        c.Condicion,
        c.Vencimiento,
        c.Importe,
        c.Impuestos,
        c.Saldo,
        c.FechaRegistro,
        c.FechaEntrega,
        c.Observaciones,
        c.Prioridad,
        c.Agente,
        c.Descuento
      FROM Compra c
      WHERE c.ID = @id
    `, { id });

    if (result.recordset.length === 0) {
      throw new Error('Orden de compra no encontrada');
    }

    const row = result.recordset[0];

    return {
      id: row.ID,
      empresa: row.Empresa,
      mov: row.Mov,
      movID: row.MovID,
      fechaEmision: row.FechaEmision,
      ultimoCambio: row.UltimoCambio,
      concepto: row.Concepto,
      proyecto: row.Proyecto,
      proveedor: row.Proveedor,
      moneda: row.Moneda,
      tipoCambio: row.TipoCambio,
      usuario: row.Usuario,
      referencia: row.Referencia,
      estatus: row.Estatus,
      situacion: row.Situacion,
      situacionFecha: row.SituacionFecha,
      situacionUsuario: row.SituacionUsuario,
      situacionNota: row.SituacionNota,
      fechaRequerida: row.FechaRequerida,
      almacen: row.Almacen,
      condicion: row.Condicion,
      vencimiento: row.Vencimiento,
      importe: row.Importe,
      impuestos: row.Impuestos,
      saldo: row.Saldo,
      fechaRegistro: row.FechaRegistro,
      fechaEntrega: row.FechaEntrega,
      observaciones: row.Observaciones,
      prioridad: row.Prioridad,
      agente: row.Agente,
      descuento: row.Descuento,
    };

  } catch (error: any) {
    console.error('Error en getOrdenCompraPorID:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de órdenes de compra
 */
export async function getOrdenesCompraStats() {
  try {
    // Total pendientes
    const pendientesResult = await hybridDB.queryERP('la-cantera', `
      SELECT COUNT(*) as total
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
    `);

    // Por proveedor (top 10)
    const porProveedorResult = await hybridDB.queryERP('la-cantera', `
      SELECT TOP 10
        c.Proveedor,
        p.Nombre as ProveedorNombre,
        COUNT(*) as cantidad,
        SUM(c.Importe) as importeTotal
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
      GROUP BY c.Proveedor, p.Nombre
      ORDER BY COUNT(*) DESC
    `);

    // Por mes (últimos 6 meses)
    const porMesResult = await hybridDB.queryERP('la-cantera', `
      SELECT
        YEAR(c.FechaEmision) as año,
        MONTH(c.FechaEmision) as mes,
        COUNT(*) as cantidad,
        SUM(c.Importe) as importeTotal
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
        AND c.FechaEmision >= DATEADD(MONTH, -6, GETDATE())
      GROUP BY YEAR(c.FechaEmision), MONTH(c.FechaEmision)
      ORDER BY YEAR(c.FechaEmision), MONTH(c.FechaEmision)
    `);

    // Importe total pendiente
    const importeTotalResult = await hybridDB.queryERP('la-cantera', `
      SELECT SUM(c.Importe) as importeTotal
      FROM Compra c
      JOIN MovTipo mt ON c.Mov = mt.Mov AND mt.Modulo = 'COMS' AND mt.Clave = 'COMS.O' AND mt.subClave IS NULL
      JOIN Prov p ON c.Proveedor = p.Proveedor
      WHERE c.Estatus = 'PENDIENTE'
    `);

    return {
      totalPendientes: pendientesResult.recordset[0].total,
      importeTotal: importeTotalResult.recordset[0].importeTotal || 0,
      porProveedor: porProveedorResult.recordset,
      porMes: porMesResult.recordset,
    };

  } catch (error: any) {
    console.error('Error en getOrdenesCompraStats:', error);
    throw error;
  }
}