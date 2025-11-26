// src/lib/database/sqlserver.ts
// Implementación de la interfaz Database usando SQL Server

import sql from 'mssql';
import { getConnection } from '@/lib/sql-connection';
import type {
  Database,
  ProveedorFilters,
  OrdenCompraFilters,
  FacturaFilters,
  Empresa,
  UsuarioEmpresa,
} from './interface';

import type {
  Factura,
  OrdenCompra,
  DocumentoProveedor,
  Mensaje,
  Conversacion,
  Notificacion,
  ComprobantePago,
  ComplementoPago,
  ProveedorUser,
} from '@/types/backend';

export class SqlServerDatabase implements Database {
  // ==================== PROVEEDORES ====================
  async getProveedor(uid: string): Promise<ProveedorUser | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('uid', sql.UniqueIdentifier, uid)
      .query(`
        SELECT * FROM users
        WHERE id = @uid AND user_type = 'Proveedor'
      `);

    if (result.recordset.length === 0) return null;

    return this.mapUserToProveedor(result.recordset[0]);
  }

  async updateProveedor(uid: string, data: Partial<ProveedorUser>): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool.request().input('uid', sql.UniqueIdentifier, uid);

    if (data.displayName !== undefined) {
      fields.push('display_name = @displayName');
      request.input('displayName', sql.NVarChar(255), data.displayName);
    }
    if (data.razonSocial !== undefined) {
      fields.push('razon_social = @razonSocial');
      request.input('razonSocial', sql.NVarChar(255), data.razonSocial);
    }
    if (data.rfc !== undefined) {
      fields.push('rfc = @rfc');
      request.input('rfc', sql.VarChar(13), data.rfc);
    }
    if (data.telefono !== undefined) {
      fields.push('telefono = @telefono');
      request.input('telefono', sql.VarChar(20), data.telefono);
    }
    if (data.direccion) {
      if (data.direccion.calle) {
        fields.push('direccion_calle = @calle');
        request.input('calle', sql.NVarChar(255), data.direccion.calle);
      }
      if (data.direccion.ciudad) {
        fields.push('direccion_ciudad = @ciudad');
        request.input('ciudad', sql.NVarChar(100), data.direccion.ciudad);
      }
      if (data.direccion.estado) {
        fields.push('direccion_estado = @estado');
        request.input('estado', sql.NVarChar(100), data.direccion.estado);
      }
      if (data.direccion.cp) {
        fields.push('direccion_cp = @cp');
        request.input('cp', sql.VarChar(10), data.direccion.cp);
      }
    }
    if (data.status !== undefined) {
      fields.push('status = @status');
      request.input('status', sql.VarChar(50), data.status);
    }
    if (data.documentosValidados !== undefined) {
      fields.push('documentos_validados = @documentosValidados');
      request.input('documentosValidados', sql.Bit, data.documentosValidados);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = GETDATE()');

    await request.query(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = @uid
    `);
  }

  async getProveedores(filters?: ProveedorFilters): Promise<ProveedorUser[]> {
    const pool = await getConnection();
    const conditions: string[] = ["user_type = 'Proveedor'"];
    const request = pool.request();

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map((_, i) => `@status${i}`).join(',');
        conditions.push(`status IN (${placeholders})`);
        filters.status.forEach((s, i) => {
          request.input(`status${i}`, sql.VarChar(50), s);
        });
      } else {
        conditions.push('status = @status');
        request.input('status', sql.VarChar(50), filters.status);
      }
    }

    if (filters?.documentosValidados !== undefined) {
      conditions.push('documentos_validados = @documentosValidados');
      request.input('documentosValidados', sql.Bit, filters.documentosValidados);
    }

    let query = `
      SELECT * FROM users
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const result = await request.query(query);
    let proveedores = result.recordset.map(row => this.mapUserToProveedor(row));

    // Filtrado en memoria para searchTerm
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      proveedores = proveedores.filter(
        p =>
          p.razonSocial.toLowerCase().includes(term) ||
          p.rfc.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term)
      );
    }

    return proveedores;
  }

  async updateProveedorStatus(uid: string, status: ProveedorUser['status']): Promise<void> {
    await this.updateProveedor(uid, { status });
  }

  // ==================== EMPRESAS ====================
  async createEmpresa(data: Omit<Empresa, 'id'>): Promise<string> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('codigo', sql.VarChar(50), data.codigo)
      .input('razonSocial', sql.NVarChar(255), data.razonSocial)
      .input('nombreComercial', sql.NVarChar(255), data.nombreComercial)
      .input('rfc', sql.VarChar(13), data.rfc || null)
      .input('direccion', sql.NVarChar(500), data.direccion || null)
      .input('telefono', sql.VarChar(20), data.telefono || null)
      .input('email', sql.VarChar(255), data.email || null)
      .input('activa', sql.Bit, data.activa ?? true)
      .query(`
        INSERT INTO empresas (codigo, razon_social, nombre_comercial, rfc, direccion, telefono, email, activa)
        OUTPUT INSERTED.id
        VALUES (@codigo, @razonSocial, @nombreComercial, @rfc, @direccion, @telefono, @email, @activa)
      `);

    return result.recordset[0].id;
  }

  async getEmpresa(id: string): Promise<Empresa | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM empresas WHERE id = @id');

    if (result.recordset.length === 0) return null;

    return this.mapRowToEmpresa(result.recordset[0]);
  }

  async getEmpresaByCodigo(codigo: string): Promise<Empresa | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('codigo', sql.VarChar(50), codigo)
      .query('SELECT * FROM empresas WHERE codigo = @codigo');

    if (result.recordset.length === 0) return null;

    return this.mapRowToEmpresa(result.recordset[0]);
  }

  async getEmpresas(filters?: { activa?: boolean }): Promise<Empresa[]> {
    const pool = await getConnection();
    let query = 'SELECT * FROM empresas';
    const request = pool.request();

    if (filters?.activa !== undefined) {
      query += ' WHERE activa = @activa';
      request.input('activa', sql.Bit, filters.activa);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    return result.recordset.map(row => this.mapRowToEmpresa(row));
  }

  async updateEmpresa(id: string, data: Partial<Empresa>): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (data.codigo !== undefined) {
      fields.push('codigo = @codigo');
      request.input('codigo', sql.VarChar(50), data.codigo);
    }
    if (data.razonSocial !== undefined) {
      fields.push('razon_social = @razonSocial');
      request.input('razonSocial', sql.NVarChar(255), data.razonSocial);
    }
    if (data.nombreComercial !== undefined) {
      fields.push('nombre_comercial = @nombreComercial');
      request.input('nombreComercial', sql.NVarChar(255), data.nombreComercial);
    }
    if (data.rfc !== undefined) {
      fields.push('rfc = @rfc');
      request.input('rfc', sql.VarChar(13), data.rfc);
    }
    if (data.activa !== undefined) {
      fields.push('activa = @activa');
      request.input('activa', sql.Bit, data.activa);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = GETDATE()');

    await request.query(`
      UPDATE empresas
      SET ${fields.join(', ')}
      WHERE id = @id
    `);
  }

  // ==================== USUARIO-EMPRESA ====================
  async createUsuarioEmpresa(data: Omit<UsuarioEmpresa, 'id'>): Promise<string> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('usuarioId', sql.UniqueIdentifier, data.usuarioId)
      .input('empresaId', sql.UniqueIdentifier, data.empresaId)
      .input('rol', sql.VarChar(50), 'proveedor')
      .input('activo', sql.Bit, data.activo ?? true)
      .query(`
        INSERT INTO usuarios_empresas (usuario_id, empresa_id, rol, activo)
        OUTPUT INSERTED.id
        VALUES (@usuarioId, @empresaId, @rol, @activo)
      `);

    return result.recordset[0].id;
  }

  async getEmpresasByUsuario(usuarioId: string): Promise<UsuarioEmpresa[]> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('usuarioId', sql.UniqueIdentifier, usuarioId)
      .query(`
        SELECT * FROM usuarios_empresas
        WHERE usuario_id = @usuarioId AND activo = 1
        ORDER BY created_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      usuarioId: row.usuario_id,
      empresaId: row.empresa_id,
      activo: row.activo,
      createdAt: new Date(row.created_at),
    }));
  }

  async updateUsuarioEmpresa(
    usuarioId: string,
    empresaId: string,
    data: Partial<UsuarioEmpresa>
  ): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool
      .request()
      .input('usuarioId', sql.UniqueIdentifier, usuarioId)
      .input('empresaId', sql.UniqueIdentifier, empresaId);

    if (data.activo !== undefined) {
      fields.push('activo = @activo');
      request.input('activo', sql.Bit, data.activo);
    }

    if (fields.length === 0) return;

    await request.query(`
      UPDATE usuarios_empresas
      SET ${fields.join(', ')}
      WHERE usuario_id = @usuarioId AND empresa_id = @empresaId
    `);
  }

  // ==================== DOCUMENTOS ====================
  async createDocumento(data: Omit<DocumentoProveedor, 'id'>): Promise<string> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('proveedorId', sql.UniqueIdentifier, data.proveedorId)
      .input('tipoDocumento', sql.VarChar(100), data.tipoDocumento)
      .input('archivoUrl', sql.NVarChar(1000), data.archivoUrl)
      .input('archivoNombre', sql.NVarChar(500), data.archivoNombre)
      .input('archivoTipo', sql.VarChar(100), data.archivoTipo)
      .input('status', sql.VarChar(50), data.status)
      .query(`
        INSERT INTO proveedores_documentacion
        (proveedor_id, tipo_documento, archivo_url, archivo_nombre, archivo_tipo, status)
        OUTPUT INSERTED.id
        VALUES (@proveedorId, @tipoDocumento, @archivoUrl, @archivoNombre, @archivoTipo, @status)
      `);

    return result.recordset[0].id;
  }

  async getDocumentosByProveedor(proveedorId: string): Promise<DocumentoProveedor[]> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('proveedorId', sql.UniqueIdentifier, proveedorId)
      .query(`
        SELECT * FROM proveedores_documentacion
        WHERE proveedor_id = @proveedorId
        ORDER BY uploaded_at DESC
      `);

    return result.recordset.map(row => this.mapRowToDocumento(row));
  }

  async updateDocumento(id: string, data: Partial<DocumentoProveedor>): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (data.status !== undefined) {
      fields.push('status = @status');
      request.input('status', sql.VarChar(50), data.status);
    }
    if (data.comentarios !== undefined) {
      fields.push('comentarios = @comentarios');
      request.input('comentarios', sql.NVarChar(sql.MAX), data.comentarios);
    }
    if (data.revisadoPor !== undefined) {
      fields.push('revisado_por = @revisadoPor');
      request.input('revisadoPor', sql.UniqueIdentifier, data.revisadoPor);
    }
    if (data.fechaRevision !== undefined) {
      fields.push('fecha_revision = @fechaRevision');
      request.input('fechaRevision', sql.DateTime2, data.fechaRevision);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = GETDATE()');

    await request.query(`
      UPDATE proveedores_documentacion
      SET ${fields.join(', ')}
      WHERE id = @id
    `);
  }

  async deleteDocumento(id: string): Promise<void> {
    const pool = await getConnection();
    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM proveedores_documentacion WHERE id = @id');
  }

  // ==================== ÓRDENES DE COMPRA ====================
  async createOrdenCompra(data: Omit<OrdenCompra, 'id'>): Promise<string> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('ordenId', sql.VarChar(100), data.ordenId)
      .input('folio', sql.VarChar(100), data.folio)
      .input('proveedorId', sql.UniqueIdentifier, data.proveedorId)
      .input('proveedorRFC', sql.VarChar(13), data.proveedorRFC)
      .input('proveedorRazonSocial', sql.NVarChar(255), data.proveedorRazonSocial)
      .input('empresaId', sql.UniqueIdentifier, data.empresaId)
      .input('empresaRazonSocial', sql.NVarChar(255), data.empresaRazonSocial)
      .input('fecha', sql.DateTime2, data.fecha)
      .input('fechaEntrega', sql.DateTime2, data.fechaEntrega)
      .input('montoTotal', sql.Decimal(18, 2), data.montoTotal)
      .input('moneda', sql.VarChar(3), data.moneda)
      .input('conceptos', sql.NVarChar(sql.MAX), JSON.stringify(data.conceptos))
      .input('status', sql.VarChar(50), data.status)
      .input('facturada', sql.Bit, data.facturada)
      .input('intelisisId', sql.VarChar(100), data.intelisisId)
      .input('ultimaSincronizacion', sql.DateTime2, data.ultimaSincronizacion)
      .input('createdBy', sql.UniqueIdentifier, data.createdBy)
      .query(`
        INSERT INTO ordenes_compra
        (orden_id, folio, proveedor_id, proveedor_rfc, proveedor_razon_social,
         empresa_id, empresa_razon_social, fecha, fecha_entrega, monto_total,
         moneda, conceptos, status, facturada, intelisis_id, ultima_sincronizacion, created_by)
        OUTPUT INSERTED.id
        VALUES (@ordenId, @folio, @proveedorId, @proveedorRFC, @proveedorRazonSocial,
                @empresaId, @empresaRazonSocial, @fecha, @fechaEntrega, @montoTotal,
                @moneda, @conceptos, @status, @facturada, @intelisisId, @ultimaSincronizacion, @createdBy)
      `);

    return result.recordset[0].id;
  }

  async getOrdenCompra(id: string): Promise<OrdenCompra | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM ordenes_compra WHERE id = @id');

    if (result.recordset.length === 0) return null;

    return this.mapRowToOrdenCompra(result.recordset[0]);
  }

  async getOrdenesCompraByProveedor(
    proveedorId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({ proveedorId }, filters);
  }

  async getOrdenesCompraByEmpresa(
    empresaId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({ empresaId }, filters);
  }

  async getAllOrdenesCompra(filters?: OrdenCompraFilters): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({}, filters);
  }

  private async getOrdenesCompraWithFilters(
    baseFilters: { proveedorId?: string; empresaId?: string },
    additionalFilters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    const pool = await getConnection();
    const conditions: string[] = [];
    const request = pool.request();

    if (baseFilters.proveedorId) {
      conditions.push('proveedor_id = @proveedorId');
      request.input('proveedorId', sql.UniqueIdentifier, baseFilters.proveedorId);
    }

    if (baseFilters.empresaId) {
      conditions.push('empresa_id = @empresaId');
      request.input('empresaId', sql.UniqueIdentifier, baseFilters.empresaId);
    }

    if (additionalFilters?.status) {
      if (Array.isArray(additionalFilters.status)) {
        const placeholders = additionalFilters.status.map((_, i) => `@status${i}`).join(',');
        conditions.push(`status IN (${placeholders})`);
        additionalFilters.status.forEach((s, i) => {
          request.input(`status${i}`, sql.VarChar(50), s);
        });
      } else {
        conditions.push('status = @status');
        request.input('status', sql.VarChar(50), additionalFilters.status);
      }
    }

    if (additionalFilters?.facturada !== undefined) {
      conditions.push('facturada = @facturada');
      request.input('facturada', sql.Bit, additionalFilters.facturada);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM ordenes_compra
      ${whereClause}
      ORDER BY fecha DESC
    `;

    const result = await request.query(query);
    let ordenes = result.recordset.map(row => this.mapRowToOrdenCompra(row));

    // Filtrado en memoria
    if (additionalFilters?.fechaDesde) {
      ordenes = ordenes.filter(o => o.fecha >= additionalFilters.fechaDesde!);
    }
    if (additionalFilters?.fechaHasta) {
      ordenes = ordenes.filter(o => o.fecha <= additionalFilters.fechaHasta!);
    }
    if (additionalFilters?.searchTerm) {
      const term = additionalFilters.searchTerm.toLowerCase();
      ordenes = ordenes.filter(
        o =>
          o.folio.toLowerCase().includes(term) ||
          o.ordenId.toLowerCase().includes(term) ||
          o.proveedorRazonSocial.toLowerCase().includes(term)
      );
    }

    return ordenes;
  }

  async updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (data.status !== undefined) {
      fields.push('status = @status');
      request.input('status', sql.VarChar(50), data.status);
    }
    if (data.facturada !== undefined) {
      fields.push('facturada = @facturada');
      request.input('facturada', sql.Bit, data.facturada);
    }
    if (data.facturaId !== undefined) {
      fields.push('factura_id = @facturaId');
      request.input('facturaId', sql.UniqueIdentifier, data.facturaId);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = GETDATE()');

    await request.query(`
      UPDATE ordenes_compra
      SET ${fields.join(', ')}
      WHERE id = @id
    `);
  }

  // ==================== FACTURAS ====================
  async createFactura(data: Omit<Factura, 'id'>): Promise<string> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('facturaId', sql.VarChar(100), data.facturaId)
      .input('proveedorId', sql.UniqueIdentifier, data.proveedorId)
      .input('proveedorRFC', sql.VarChar(13), data.proveedorRFC)
      .input('proveedorRazonSocial', sql.NVarChar(255), data.proveedorRazonSocial)
      .input('receptorRFC', sql.VarChar(13), data.receptorRFC)
      .input('receptorRazonSocial', sql.NVarChar(255), data.receptorRazonSocial)
      .input('empresaId', sql.UniqueIdentifier, data.empresaId)
      .input('uuid', sql.VarChar(100), data.uuid)
      .input('serie', sql.VarChar(50), data.serie || null)
      .input('folio', sql.VarChar(100), data.folio)
      .input('fecha', sql.DateTime2, data.fecha)
      .input('subtotal', sql.Decimal(18, 2), data.subtotal)
      .input('iva', sql.Decimal(18, 2), data.iva)
      .input('total', sql.Decimal(18, 2), data.total)
      .input('moneda', sql.VarChar(3), data.moneda)
      .input('xmlUrl', sql.NVarChar(1000), data.xmlUrl)
      .input('pdfUrl', sql.NVarChar(1000), data.pdfUrl)
      .input('uploadedBy', sql.UniqueIdentifier, data.uploadedBy)
      .query(`
        INSERT INTO facturas
        (factura_id, proveedor_id, proveedor_rfc, proveedor_razon_social,
         receptor_rfc, receptor_razon_social, empresa_id, uuid, serie, folio,
         fecha, subtotal, iva, total, moneda, xml_url, pdf_url, uploaded_by)
        OUTPUT INSERTED.id
        VALUES (@facturaId, @proveedorId, @proveedorRFC, @proveedorRazonSocial,
                @receptorRFC, @receptorRazonSocial, @empresaId, @uuid, @serie, @folio,
                @fecha, @subtotal, @iva, @total, @moneda, @xmlUrl, @pdfUrl, @uploadedBy)
      `);

    return result.recordset[0].id;
  }

  async getFactura(id: string): Promise<Factura | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM facturas WHERE id = @id');

    if (result.recordset.length === 0) return null;

    return this.mapRowToFactura(result.recordset[0]);
  }

  async getFacturasByProveedor(
    proveedorId: string,
    filters?: FacturaFilters
  ): Promise<Factura[]> {
    return this.getFacturasWithFilters({ proveedorId }, filters);
  }

  async getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters): Promise<Factura[]> {
    return this.getFacturasWithFilters({ empresaId }, filters);
  }

  async getAllFacturas(filters?: FacturaFilters): Promise<Factura[]> {
    return this.getFacturasWithFilters({}, filters);
  }

  async getFacturaByUUID(uuid: string): Promise<Factura | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('uuid', sql.VarChar(100), uuid)
      .query('SELECT TOP 1 * FROM facturas WHERE uuid = @uuid');

    if (result.recordset.length === 0) return null;

    return this.mapRowToFactura(result.recordset[0]);
  }

  private async getFacturasWithFilters(
    baseFilters: { proveedorId?: string; empresaId?: string },
    additionalFilters?: FacturaFilters
  ): Promise<Factura[]> {
    const pool = await getConnection();
    const conditions: string[] = [];
    const request = pool.request();

    if (baseFilters.proveedorId) {
      conditions.push('proveedor_id = @proveedorId');
      request.input('proveedorId', sql.UniqueIdentifier, baseFilters.proveedorId);
    }

    if (baseFilters.empresaId) {
      conditions.push('empresa_id = @empresaId');
      request.input('empresaId', sql.UniqueIdentifier, baseFilters.empresaId);
    }

    if (additionalFilters?.status) {
      if (Array.isArray(additionalFilters.status)) {
        const placeholders = additionalFilters.status.map((_, i) => `@status${i}`).join(',');
        conditions.push(`status IN (${placeholders})`);
        additionalFilters.status.forEach((s, i) => {
          request.input(`status${i}`, sql.VarChar(50), s);
        });
      } else {
        conditions.push('status = @status');
        request.input('status', sql.VarChar(50), additionalFilters.status);
      }
    }

    if (additionalFilters?.pagada !== undefined) {
      conditions.push('pagada = @pagada');
      request.input('pagada', sql.Bit, additionalFilters.pagada);
    }

    if (additionalFilters?.validadaSAT !== undefined) {
      conditions.push('validada_sat = @validadaSAT');
      request.input('validadaSAT', sql.Bit, additionalFilters.validadaSAT);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT * FROM facturas
      ${whereClause}
      ORDER BY fecha DESC
    `;

    const result = await request.query(query);
    let facturas = result.recordset.map(row => this.mapRowToFactura(row));

    // Filtrado en memoria
    if (additionalFilters?.fechaDesde) {
      facturas = facturas.filter(f => f.fecha >= additionalFilters.fechaDesde!);
    }
    if (additionalFilters?.fechaHasta) {
      facturas = facturas.filter(f => f.fecha <= additionalFilters.fechaHasta!);
    }
    if (additionalFilters?.searchTerm) {
      const term = additionalFilters.searchTerm.toLowerCase();
      facturas = facturas.filter(
        f =>
          f.folio.toLowerCase().includes(term) ||
          f.uuid.toLowerCase().includes(term) ||
          f.proveedorRazonSocial.toLowerCase().includes(term)
      );
    }

    return facturas;
  }

  async updateFactura(id: string, data: Partial<Factura>): Promise<void> {
    const pool = await getConnection();
    const fields: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (data.status !== undefined) {
      fields.push('status = @status');
      request.input('status', sql.VarChar(50), data.status);
    }
    if (data.validadaSAT !== undefined) {
      fields.push('validada_sat = @validadaSAT');
      request.input('validadaSAT', sql.Bit, data.validadaSAT);
    }
    if (data.estatusSAT !== undefined) {
      fields.push('estatus_sat = @estatusSAT');
      request.input('estatusSAT', sql.VarChar(50), data.estatusSAT);
    }
    if (data.pagada !== undefined) {
      fields.push('pagada = @pagada');
      request.input('pagada', sql.Bit, data.pagada);
    }
    if (data.fechaPago !== undefined) {
      fields.push('fecha_pago = @fechaPago');
      request.input('fechaPago', sql.DateTime2, data.fechaPago);
    }
    if (data.motivoRechazo !== undefined) {
      fields.push('motivo_rechazo = @motivoRechazo');
      request.input('motivoRechazo', sql.NVarChar(sql.MAX), data.motivoRechazo);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = GETDATE()');

    await request.query(`
      UPDATE facturas
      SET ${fields.join(', ')}
      WHERE id = @id
    `);
  }

  // ==================== STUBS (Implementar cuando sea necesario) ====================
  async createComplementoPago(): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getComplementosPagoByProveedor(): Promise<ComplementoPago[]> {
    return [];
  }
  async getComplementosPagoByEmpresa(): Promise<ComplementoPago[]> {
    return [];
  }
  async updateComplementoPago(): Promise<void> {}

  async createComprobantePago(): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getComprobantesPagoByProveedor(): Promise<ComprobantePago[]> {
    return [];
  }
  async getComprobantesPagoByEmpresa(): Promise<ComprobantePago[]> {
    return [];
  }
  async updateComprobantePago(): Promise<void> {}

  async createConversacion(): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getConversacion(): Promise<Conversacion | null> {
    return null;
  }
  async getConversacionesByUsuario(): Promise<Conversacion[]> {
    return [];
  }
  async updateConversacion(): Promise<void> {}

  async createMensaje(): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getMensajesByConversacion(): Promise<Mensaje[]> {
    return [];
  }
  async marcarMensajeComoLeido(): Promise<void> {}

  async createNotificacion(): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getNotificacionesByUsuario(): Promise<Notificacion[]> {
    return [];
  }
  async marcarNotificacionComoLeida(): Promise<void> {}
  async marcarTodasNotificacionesComoLeidas(): Promise<void> {}
  async getNotificacionesNoLeidas(): Promise<number> {
    return 0;
  }

  // ==================== MAPPERS ====================
  private mapUserToProveedor(row: any): ProveedorUser {
    return {
      uid: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role as 'proveedor',
      userType: 'Proveedor',
      empresa: '', // TODO: Obtener de la relación usuario-empresa
      isActive: row.is_active,
      rfc: row.rfc,
      razonSocial: row.razon_social,
      telefono: row.telefono,
      direccion: {
        calle: row.direccion_calle || '',
        ciudad: row.direccion_ciudad || '',
        estado: row.direccion_estado || '',
        cp: row.direccion_cp || '',
      },
      status: row.status as any,
      documentosValidados: row.documentos_validados,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  private mapRowToEmpresa(row: any): Empresa {
    return {
      id: row.id,
      codigo: row.codigo,
      razonSocial: row.razon_social,
      nombreComercial: row.nombre_comercial,
      rfc: row.rfc,
      direccion: row.direccion,
      telefono: row.telefono,
      email: row.email,
      activa: row.activa,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  private mapRowToDocumento(row: any): DocumentoProveedor {
    return {
      id: row.id,
      proveedorId: row.proveedor_id,
      tipoDocumento: row.tipo_documento as any,
      archivoUrl: row.archivo_url,
      archivoNombre: row.archivo_nombre,
      archivoTipo: row.archivo_tipo,
      status: row.status as any,
      comentarios: row.comentarios,
      revisadoPor: row.revisado_por,
      fechaRevision: row.fecha_revision ? new Date(row.fecha_revision) : undefined,
      uploadedAt: new Date(row.uploaded_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  private mapRowToOrdenCompra(row: any): OrdenCompra {
    return {
      id: row.id,
      ordenId: row.orden_id,
      folio: row.folio,
      proveedorId: row.proveedor_id,
      proveedorRFC: row.proveedor_rfc,
      proveedorRazonSocial: row.proveedor_razon_social,
      empresaId: row.empresa_id,
      empresaRazonSocial: row.empresa_razon_social,
      fecha: new Date(row.fecha),
      fechaEntrega: new Date(row.fecha_entrega),
      montoTotal: parseFloat(row.monto_total),
      moneda: row.moneda as any,
      conceptos: JSON.parse(row.conceptos),
      status: row.status as any,
      facturada: row.facturada,
      facturaId: row.factura_id,
      observaciones: row.observaciones,
      archivoOCUrl: row.archivo_oc_url,
      intelisisId: row.intelisis_id,
      ultimaSincronizacion: new Date(row.ultima_sincronizacion),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
    };
  }

  private mapRowToFactura(row: any): Factura {
    return {
      id: row.id,
      facturaId: row.factura_id,
      proveedorId: row.proveedor_id,
      proveedorRFC: row.proveedor_rfc,
      proveedorRazonSocial: row.proveedor_razon_social,
      receptorRFC: row.receptor_rfc,
      receptorRazonSocial: row.receptor_razon_social,
      empresaId: row.empresa_id,
      uuid: row.uuid,
      serie: row.serie,
      folio: row.folio,
      fecha: new Date(row.fecha),
      subtotal: parseFloat(row.subtotal),
      iva: parseFloat(row.iva),
      total: parseFloat(row.total),
      moneda: row.moneda as any,
      tipoCambio: row.tipo_cambio ? parseFloat(row.tipo_cambio) : undefined,
      xmlUrl: row.xml_url,
      pdfUrl: row.pdf_url,
      validadaSAT: row.validada_sat,
      estatusSAT: row.estatus_sat as any,
      fechaValidacionSAT: row.fecha_validacion_sat ? new Date(row.fecha_validacion_sat) : undefined,
      ordenCompraId: row.orden_compra_id,
      status: row.status as any,
      motivoRechazo: row.motivo_rechazo,
      pagada: row.pagada,
      fechaPago: row.fecha_pago ? new Date(row.fecha_pago) : undefined,
      complementoPagoId: row.complemento_pago_id,
      revisadoPor: row.revisado_por,
      fechaRevision: row.fecha_revision ? new Date(row.fecha_revision) : undefined,
      observaciones: row.observaciones,
      intelisisId: row.intelisis_id,
      ultimaSincronizacion: row.ultima_sincronizacion
        ? new Date(row.ultima_sincronizacion)
        : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      uploadedBy: row.uploaded_by,
    };
  }
}
