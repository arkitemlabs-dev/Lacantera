// src/lib/database/erp-explorer.ts
// Explorador inteligente de estructura de ERPs Intelisis

import sql from 'mssql';
import { getPortalConnection, getERPConnection } from './multi-tenant-connection';

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  maxLength: number | null;
}

export interface TableDiscovery {
  tableName: string;
  columns: ColumnInfo[];
  fieldMapping: Record<string, string | null>;
}

export interface ERPStructure {
  proveedores: TableDiscovery | null;
  ordenes: TableDiscovery | null;
  ordenesDetalle: TableDiscovery | null;
  pagos: TableDiscovery | null;
}

/**
 * Explorador inteligente de ERPs
 * Descubre automáticamente la estructura sin asumir nombres
 */
export class ERPExplorer {
  /**
   * 🔍 Busca un campo por palabras clave
   */
  private findField(fields: string[], keywords: string[]): string | null {
    const fieldsLower = fields.map(f => f.toLowerCase());

    for (const keyword of keywords) {
      const found = fieldsLower.find(field => field.includes(keyword.toLowerCase()));
      if (found) {
        // Devolver el nombre original (con mayúsculas correctas)
        const index = fieldsLower.indexOf(found);
        return fields[index];
      }
    }

    return null;
  }

  /**
   * 🔍 Explora tablas de proveedores en el ERP
   */
  async exploreProveedoresERP(tenantId: string): Promise<TableDiscovery | null> {
    const posibleTablas = ['Prov', 'Proveedores', 'Proveedor', 'Suppliers', 'Vendor'];
    const pool = await getERPConnection(tenantId);

    for (const tabla of posibleTablas) {
      try {
        // Test si existe la tabla
        await pool.request().query(`SELECT TOP 1 * FROM ${tabla} WHERE 1=0`);

        console.log(`✅ [${tenantId}] Tabla de proveedores encontrada: ${tabla}`);

        // Obtener estructura de columnas
        const columnsResult = await pool.request()
          .input('tableName', sql.VarChar, tabla)
          .query(`
            SELECT
              COLUMN_NAME as columnName,
              DATA_TYPE as dataType,
              IS_NULLABLE as isNullable,
              CHARACTER_MAXIMUM_LENGTH as maxLength
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        const columns: ColumnInfo[] = columnsResult.recordset;
        const fieldNames = columns.map(c => c.columnName);

        // Mapeo inteligente de campos
        const fieldMapping: Record<string, string | null> = {
          codigo: this.findField(fieldNames, ['proveedor', 'codigo', 'code', 'id', 'clave']),
          nombre: this.findField(fieldNames, ['nombre', 'razon', 'social', 'name', 'descripcion']),
          rfc: this.findField(fieldNames, ['rfc', 'tax', 'nit', 'fiscal']),
          email: this.findField(fieldNames, ['email', 'mail', 'correo', 'e-mail']),
          telefono: this.findField(fieldNames, ['telefono', 'phone', 'tel', 'fono', 'celular']),
          direccion: this.findField(fieldNames, ['direccion', 'address', 'domicilio', 'calle']),
          colonia: this.findField(fieldNames, ['colonia', 'neighborhood', 'barrio']),
          ciudad: this.findField(fieldNames, ['ciudad', 'city', 'poblacion', 'municipio']),
          estado: this.findField(fieldNames, ['estado', 'state', 'provincia']),
          cp: this.findField(fieldNames, ['cp', 'postal', 'codigo_postal', 'zip']),
          contacto: this.findField(fieldNames, ['contacto', 'contact', 'persona', 'representante']),
          estatus: this.findField(fieldNames, ['estatus', 'status', 'activo', 'estado', 'situacion']),
        };

        console.log(`📋 [${tenantId}] Mapeo de campos:`, fieldMapping);

        return {
          tableName: tabla,
          columns,
          fieldMapping,
        };

      } catch (error) {
        console.log(`⏭️  [${tenantId}] Tabla ${tabla} no existe, continuando...`);
        continue;
      }
    }

    console.log(`❌ [${tenantId}] No se encontró tabla de proveedores`);
    return null;
  }

  /**
   * 🔍 Explora tablas de órdenes de compra en el ERP
   */
  async exploreOrdenesERP(tenantId: string): Promise<TableDiscovery | null> {
    // Priorizar 'Compra' que es la tabla principal en Intelisis
    const posibleTablas = [
      'Compra', 'Compras', 'OrdenCompra', 'OC', 'PurchaseOrder',
      'Orders', 'Ordenes', 'Purchase', 'CompraEncabezado'
    ];
    const pool = await getERPConnection(tenantId);

    for (const tabla of posibleTablas) {
      try {
        await pool.request().query(`SELECT TOP 1 * FROM ${tabla} WHERE 1=0`);

        console.log(`✅ [${tenantId}] Tabla de órdenes encontrada: ${tabla}`);

        const columnsResult = await pool.request()
          .input('tableName', sql.VarChar, tabla)
          .query(`
            SELECT
              COLUMN_NAME as columnName,
              DATA_TYPE as dataType,
              IS_NULLABLE as isNullable,
              CHARACTER_MAXIMUM_LENGTH as maxLength
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        const columns: ColumnInfo[] = columnsResult.recordset;
        const fieldNames = columns.map(c => c.columnName);

        const fieldMapping: Record<string, string | null> = {
          id: this.findField(fieldNames, ['id', 'idcompra', 'idorden']),
          folio: this.findField(fieldNames, ['folio', 'mov', 'movid', 'number', 'num', 'numero']),
          empresa: this.findField(fieldNames, ['empresa', 'company', 'sucursal']),
          proveedor: this.findField(fieldNames, ['proveedor', 'supplier', 'vendor', 'prov']),
          fecha: this.findField(fieldNames, ['fecha', 'date', 'emision', 'fechaemision', 'alta']),
          subtotal: this.findField(fieldNames, ['subtotal', 'importe', 'base', 'neto']),
          impuestos: this.findField(fieldNames, ['impuestos', 'tax', 'iva', 'impuesto']),
          total: this.findField(fieldNames, ['total', 'amount', 'monto', 'totalgeneral']),
          moneda: this.findField(fieldNames, ['moneda', 'currency', 'divisa']),
          estatus: this.findField(fieldNames, ['estatus', 'status', 'situacion', 'estado']),
          condicion: this.findField(fieldNames, ['condicion', 'condiciones', 'condicionpago', 'terminos']),
          observaciones: this.findField(fieldNames, ['observaciones', 'notes', 'comentarios', 'notas']),
        };

        console.log(`📋 [${tenantId}] Mapeo de campos órdenes:`, fieldMapping);

        return {
          tableName: tabla,
          columns,
          fieldMapping,
        };

      } catch (error) {
        continue;
      }
    }

    console.log(`❌ [${tenantId}] No se encontró tabla de órdenes de compra`);
    return null;
  }

  /**
   * 🔍 Explora tablas de detalle de órdenes
   */
  async exploreOrdenesDetalleERP(tenantId: string): Promise<TableDiscovery | null> {
    const posibleTablas = [
      'CompraD', 'CompraDetalle', 'OrdenCompraDetalle', 'OCDetalle',
      'PurchaseOrderDetail', 'CompraItems', 'OrdenItems'
    ];
    const pool = await getERPConnection(tenantId);

    for (const tabla of posibleTablas) {
      try {
        await pool.request().query(`SELECT TOP 1 * FROM ${tabla} WHERE 1=0`);

        console.log(`✅ [${tenantId}] Tabla de detalle órdenes encontrada: ${tabla}`);

        const columnsResult = await pool.request()
          .input('tableName', sql.VarChar, tabla)
          .query(`
            SELECT
              COLUMN_NAME as columnName,
              DATA_TYPE as dataType,
              IS_NULLABLE as isNullable,
              CHARACTER_MAXIMUM_LENGTH as maxLength
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        const columns: ColumnInfo[] = columnsResult.recordset;
        const fieldNames = columns.map(c => c.columnName);

        const fieldMapping: Record<string, string | null> = {
          id: this.findField(fieldNames, ['id', 'idcompra', 'idorden']),
          renglon: this.findField(fieldNames, ['renglon', 'line', 'linea', 'item', 'consecutivo']),
          articulo: this.findField(fieldNames, ['articulo', 'product', 'item', 'sku', 'codigo']),
          descripcion: this.findField(fieldNames, ['descripcion', 'description', 'subcuenta', 'nombre']),
          cantidad: this.findField(fieldNames, ['cantidad', 'qty', 'quantity', 'unidades']),
          precio: this.findField(fieldNames, ['precio', 'price', 'preciounitario', 'costo']),
          total: this.findField(fieldNames, ['total', 'preciototal', 'importe', 'amount']),
          unidad: this.findField(fieldNames, ['unidad', 'unit', 'um', 'uom']),
          almacen: this.findField(fieldNames, ['almacen', 'warehouse', 'bodega']),
        };

        console.log(`📋 [${tenantId}] Mapeo de campos detalle:`, fieldMapping);

        return {
          tableName: tabla,
          columns,
          fieldMapping,
        };

      } catch (error) {
        continue;
      }
    }

    console.log(`❌ [${tenantId}] No se encontró tabla de detalle de órdenes`);
    return null;
  }

  /**
   * 🔍 Exploración completa del ERP
   */
  async discoverERPStructure(tenantId: string): Promise<ERPStructure> {
    console.log(`\n🔍 Explorando estructura del ERP: ${tenantId}...`);

    const structure: ERPStructure = {
      proveedores: null,
      ordenes: null,
      ordenesDetalle: null,
      pagos: null,
    };

    try {
      structure.proveedores = await this.exploreProveedoresERP(tenantId);
    } catch (error: any) {
      console.error(`Error explorando proveedores:`, error.message);
    }

    try {
      structure.ordenes = await this.exploreOrdenesERP(tenantId);
    } catch (error: any) {
      console.error(`Error explorando órdenes:`, error.message);
    }

    try {
      structure.ordenesDetalle = await this.exploreOrdenesDetalleERP(tenantId);
    } catch (error: any) {
      console.error(`Error explorando detalle órdenes:`, error.message);
    }

    console.log(`✅ Exploración completada para ${tenantId}`);
    return structure;
  }

  /**
   * 🔍 Buscar proveedor en ERP por nombre/código
   */
  async findProveedorInERP(
    tenantId: string,
    searchTerm: string,
    tableInfo: TableDiscovery
  ): Promise<any[]> {
    const pool = await getERPConnection(tenantId);
    const { tableName, fieldMapping } = tableInfo;

    // Construir condiciones WHERE flexibles
    const whereConditions: string[] = [];

    if (fieldMapping.codigo) {
      whereConditions.push(`UPPER(${fieldMapping.codigo}) LIKE '%${searchTerm.toUpperCase()}%'`);
    }
    if (fieldMapping.nombre) {
      whereConditions.push(`UPPER(${fieldMapping.nombre}) LIKE '%${searchTerm.toUpperCase()}%'`);
    }
    if (fieldMapping.rfc) {
      whereConditions.push(`UPPER(${fieldMapping.rfc}) LIKE '%${searchTerm.toUpperCase()}%'`);
    }

    if (whereConditions.length === 0) {
      throw new Error('No se pueden construir condiciones de búsqueda para proveedores');
    }

    const query = `
      SELECT * FROM ${tableName}
      WHERE ${whereConditions.join(' OR ')}
    `;

    console.log(`🔎 Buscando '${searchTerm}' en ${tableName}`);

    const result = await pool.request().query(query);

    console.log(`✅ Encontrados ${result.recordset.length} proveedores`);

    return result.recordset;
  }

  /**
   * 🔍 Obtener órdenes de compra de un proveedor
   */
  async getOrdenesProveedor(
    tenantId: string,
    proveedorCodigo: string,
    tableInfo: TableDiscovery,
    limit: number = 50
  ): Promise<any[]> {
    const pool = await getERPConnection(tenantId);
    const { tableName, fieldMapping } = tableInfo;

    if (!fieldMapping.proveedor) {
      throw new Error('No se encontró campo de proveedor en la tabla de órdenes');
    }

    const query = `
      SELECT TOP ${limit} * FROM ${tableName}
      WHERE ${fieldMapping.proveedor} = @proveedorCodigo
      ${fieldMapping.fecha ? `ORDER BY ${fieldMapping.fecha} DESC` : ''}
    `;

    console.log(`🔎 Obteniendo órdenes del proveedor ${proveedorCodigo}`);

    const result = await pool.request()
      .input('proveedorCodigo', sql.VarChar, proveedorCodigo)
      .query(query);

    console.log(`✅ Encontradas ${result.recordset.length} órdenes`);

    return result.recordset;
  }

  /**
   * 🔍 Obtener detalle de una orden de compra
   */
  async getOrdenDetalle(
    tenantId: string,
    ordenID: number,
    tableInfo: TableDiscovery
  ): Promise<any[]> {
    const pool = await getERPConnection(tenantId);
    const { tableName, fieldMapping } = tableInfo;

    if (!fieldMapping.id) {
      throw new Error('No se encontró campo ID en la tabla de detalle');
    }

    const query = `
      SELECT * FROM ${tableName}
      WHERE ${fieldMapping.id} = @ordenID
      ${fieldMapping.renglon ? `ORDER BY ${fieldMapping.renglon}` : ''}
    `;

    const result = await pool.request()
      .input('ordenID', sql.Int, ordenID)
      .query(query);

    return result.recordset;
  }
}

// Exportar instancia singleton
export const erpExplorer = new ERPExplorer();
