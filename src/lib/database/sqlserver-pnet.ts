// src/lib/database/sqlserver-pnet.ts
// Implementación de la interfaz Database usando tablas pNet existentes de SQL Server

import sql from 'mssql';
import bcrypt from 'bcrypt';
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

export class SqlServerPNetDatabase implements Database {
  // ==================== AUTENTICACIÓN ====================

  /**
   * Busca un usuario por email y verifica su contraseña
   */
  async authenticateUser(
    email: string,
    password: string
  ): Promise<{ user: ProveedorUser; userType: string } | null> {
    const pool = await getConnection();

    // Buscar usuario en pNetUsuario
    const userResult = await pool
      .request()
      .input('email', sql.VarChar(50), email)
      .query(`
        SELECT
          u.IDUsuario,
          u.Usuario,
          u.IDUsuarioTipo,
          u.eMail,
          u.Nombre,
          u.UrlImagen,
          u.Estatus,
          u.Telefono,
          u.PrimeraVez,
          u.Empresa,
          t.Descripcion as TipoUsuario,
          t.Tabla as TablaTipo
        FROM pNetUsuario u
        INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
        WHERE u.eMail = @email AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
      `);

    if (userResult.recordset.length === 0) {
      return null; // Usuario no encontrado
    }

    const userRecord = userResult.recordset[0];

    // Verificar contraseña
    const passwordResult = await pool
      .request()
      .input('userId', sql.Int, userRecord.IDUsuario)
      .query(`
        SELECT PasswordHash
        FROM pNetUsuarioPassword
        WHERE IDUsuario = @userId
      `);

    if (passwordResult.recordset.length === 0) {
      return null; // No tiene contraseña configurada
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      passwordResult.recordset[0].PasswordHash
    );

    if (!isPasswordValid) {
      return null; // Contraseña incorrecta
    }

    // Si el usuario es tipo Proveedor, obtener datos de la tabla Prov
    let proveedorData = null;
    if (userRecord.IDUsuarioTipo === 4) {
      // Tipo 4 = Proveedor
      const provResult = await pool
        .request()
        .input('proveedor', sql.VarChar(10), userRecord.Usuario)
        .query(`
          SELECT
            Proveedor,
            Nombre,
            RFC,
            Direccion,
            DireccionNumero,
            Colonia,
            Poblacion,
            Estado,
            CodigoPostal,
            Estatus
          FROM Prov
          WHERE Proveedor = @proveedor
        `);

      if (provResult.recordset.length > 0) {
        proveedorData = provResult.recordset[0];
      }
    }

    // Mapear a ProveedorUser
    const user: ProveedorUser = {
      uid: String(userRecord.IDUsuario),
      email: userRecord.eMail,
      displayName: userRecord.Nombre,
      role: 'proveedor',
      userType: userRecord.TipoUsuario,
      empresa: userRecord.Empresa || '',
      isActive: userRecord.Estatus === 'ACTIVO' || userRecord.Estatus === '1',
      rfc: proveedorData?.RFC || '',
      razonSocial: proveedorData?.Nombre || userRecord.Nombre,
      telefono: userRecord.Telefono || '',
      direccion: proveedorData
        ? {
            calle: proveedorData.Direccion || '',
            ciudad: proveedorData.Poblacion || '',
            estado: proveedorData.Estado || '',
            cp: proveedorData.CodigoPostal || '',
          }
        : {
            calle: '',
            ciudad: '',
            estado: '',
            cp: '',
          },
      status: proveedorData?.Estatus === 'ALTA' ? 'aprobado' : 'pendiente',
      documentosValidados: false,
      createdAt: new Date(), // TODO: Usar fecha real de FechaRegistro
    };

    return {
      user,
      userType: userRecord.TipoUsuario,
    };
  }

  /**
   * Crea un nuevo usuario proveedor con contraseña
   */
  async createProveedorUser(data: {
    email: string;
    password: string;
    nombre: string;
    proveedor: string; // Clave del proveedor en tabla Prov
  }): Promise<string> {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // 1. Crear usuario en pNetUsuario
      const userResult = await transaction
        .request()
        .input('usuario', sql.VarChar(10), data.proveedor)
        .input('idUsuarioTipo', sql.Int, 4) // Tipo 4 = Proveedor
        .input('email', sql.VarChar(50), data.email)
        .input('nombre', sql.VarChar(100), data.nombre)
        .input('estatus', sql.VarChar(15), 'ACTIVO')
        .query(`
          INSERT INTO pNetUsuario (
            Usuario, IDUsuarioTipo, eMail, Nombre,
            Estatus, FechaRegistro, PrimeraVez
          )
          OUTPUT INSERTED.IDUsuario
          VALUES (
            @usuario, @idUsuarioTipo, @email, @nombre,
            @estatus, GETDATE(), 1
          )
        `);

      const userId = userResult.recordset[0].IDUsuario;

      // 2. Crear hash de contraseña
      const passwordHash = await bcrypt.hash(data.password, 10);

      // 3. Guardar contraseña
      await transaction
        .request()
        .input('userId', sql.Int, userId)
        .input('hash', sql.VarChar(255), passwordHash)
        .query(`
          INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)
          VALUES (@userId, @hash)
        `);

      await transaction.commit();

      return String(userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Actualiza la contraseña de un usuario
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const pool = await getConnection();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool
      .request()
      .input('userId', sql.Int, parseInt(userId))
      .input('hash', sql.VarChar(255), passwordHash)
      .query(`
        UPDATE pNetUsuarioPassword
        SET PasswordHash = @hash, UpdatedAt = GETDATE()
        WHERE IDUsuario = @userId
      `);
  }

  // ==================== PROVEEDORES ====================

  async getProveedor(uid: string): Promise<ProveedorUser | null> {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('userId', sql.Int, parseInt(uid))
      .query(`
        SELECT
          u.IDUsuario,
          u.Usuario,
          u.eMail,
          u.Nombre,
          u.Telefono,
          u.Estatus,
          u.Empresa,
          p.Proveedor,
          p.Nombre as ProveedorNombre,
          p.RFC,
          p.Direccion,
          p.Colonia,
          p.Poblacion,
          p.Estado,
          p.CodigoPostal,
          p.Estatus as ProveedorEstatus
        FROM pNetUsuario u
        INNER JOIN Prov p ON u.Usuario = p.Proveedor
        WHERE u.IDUsuario = @userId AND u.IDUsuarioTipo = 4
      `);

    if (result.recordset.length === 0) return null;

    return this.mapRowToProveedorUser(result.recordset[0]);
  }

  async updateProveedor(uid: string, data: Partial<ProveedorUser>): Promise<void> {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // Actualizar pNetUsuario si hay cambios
      const userFields: string[] = [];
      const userRequest = transaction.request().input('userId', sql.Int, parseInt(uid));

      if (data.displayName !== undefined) {
        userFields.push('Nombre = @nombre');
        userRequest.input('nombre', sql.VarChar(100), data.displayName);
      }
      if (data.telefono !== undefined) {
        userFields.push('Telefono = @telefono');
        userRequest.input('telefono', sql.VarChar(100), data.telefono);
      }

      if (userFields.length > 0) {
        await userRequest.query(`
          UPDATE pNetUsuario
          SET ${userFields.join(', ')}
          WHERE IDUsuario = @userId
        `);
      }

      // Actualizar Prov si hay cambios
      if (data.rfc || data.direccion) {
        // Primero obtener la clave del proveedor
        const userResult = await transaction
          .request()
          .input('userId', sql.Int, parseInt(uid))
          .query('SELECT Usuario FROM pNetUsuario WHERE IDUsuario = @userId');

        if (userResult.recordset.length > 0) {
          const proveedor = userResult.recordset[0].Usuario;
          const provFields: string[] = [];
          const provRequest = transaction
            .request()
            .input('proveedor', sql.VarChar(10), proveedor);

          if (data.rfc !== undefined) {
            provFields.push('RFC = @rfc');
            provRequest.input('rfc', sql.VarChar(15), data.rfc);
          }
          if (data.direccion?.calle !== undefined) {
            provFields.push('Direccion = @direccion');
            provRequest.input('direccion', sql.VarChar(100), data.direccion.calle);
          }
          if (data.direccion?.ciudad !== undefined) {
            provFields.push('Poblacion = @poblacion');
            provRequest.input('poblacion', sql.VarChar(100), data.direccion.ciudad);
          }
          if (data.direccion?.estado !== undefined) {
            provFields.push('Estado = @estado');
            provRequest.input('estado', sql.VarChar(30), data.direccion.estado);
          }
          if (data.direccion?.cp !== undefined) {
            provFields.push('CodigoPostal = @cp');
            provRequest.input('cp', sql.VarChar(15), data.direccion.cp);
          }

          if (provFields.length > 0) {
            await provRequest.query(`
              UPDATE Prov
              SET ${provFields.join(', ')}
              WHERE Proveedor = @proveedor
            `);
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getProveedores(filters?: ProveedorFilters): Promise<ProveedorUser[]> {
    const pool = await getConnection();
    const conditions: string[] = ['u.IDUsuarioTipo = 4']; // Solo tipo Proveedor
    const request = pool.request();

    // Filtros de estatus (mapear a estatus de Prov)
    if (filters?.status) {
      const statusMap: { [key: string]: string } = {
        aprobado: 'ALTA',
        pendiente: 'BAJA',
        rechazado: 'BAJA',
      };

      if (Array.isArray(filters.status)) {
        const sqlStatuses = filters.status.map(s => statusMap[s] || 'ALTA');
        const placeholders = sqlStatuses.map((_, i) => `@status${i}`).join(',');
        conditions.push(`p.Estatus IN (${placeholders})`);
        sqlStatuses.forEach((s, i) => {
          request.input(`status${i}`, sql.VarChar(15), s);
        });
      } else {
        const sqlStatus = statusMap[filters.status] || 'ALTA';
        conditions.push('p.Estatus = @status');
        request.input('status', sql.VarChar(15), sqlStatus);
      }
    }

    const query = `
      SELECT
        u.IDUsuario,
        u.Usuario,
        u.eMail,
        u.Nombre,
        u.Telefono,
        u.Estatus,
        u.Empresa,
        p.Proveedor,
        p.Nombre as ProveedorNombre,
        p.RFC,
        p.Direccion,
        p.Colonia,
        p.Poblacion,
        p.Estado,
        p.CodigoPostal,
        p.Estatus as ProveedorEstatus
      FROM pNetUsuario u
      INNER JOIN Prov p ON u.Usuario = p.Proveedor
      WHERE ${conditions.join(' AND ')}
      ORDER BY u.FechaRegistro DESC
    `;

    const result = await request.query(query);
    let proveedores = result.recordset.map(row => this.mapRowToProveedorUser(row));

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
    // Mapear status a Prov.Estatus
    const statusMap: { [key: string]: string } = {
      aprobado: 'ALTA',
      pendiente: 'BAJA',
      rechazado: 'BAJA',
    };

    const pool = await getConnection();

    // Obtener la clave del proveedor
    const userResult = await pool
      .request()
      .input('userId', sql.Int, parseInt(uid))
      .query('SELECT Usuario FROM pNetUsuario WHERE IDUsuario = @userId');

    if (userResult.recordset.length === 0) return;

    const proveedor = userResult.recordset[0].Usuario;

    // Actualizar estatus en Prov
    await pool
      .request()
      .input('proveedor', sql.VarChar(10), proveedor)
      .input('estatus', sql.VarChar(15), statusMap[status])
      .query('UPDATE Prov SET Estatus = @estatus WHERE Proveedor = @proveedor');
  }

  // ==================== EMPRESAS (usando tabla Empresa de ERP) ====================

  async createEmpresa(data: Omit<Empresa, 'id'>): Promise<string> {
    throw new Error('Crear empresas no está implementado - usar empresas existentes del ERP');
  }

  async getEmpresa(id: string): Promise<Empresa | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('empresa', sql.VarChar(5), id)
      .query(`
        SELECT
          Empresa,
          Nombre,
          RFC,
          Direccion,
          Telefonos
        FROM Empresa
        WHERE Empresa = @empresa
      `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return {
      id: row.Empresa,
      codigo: row.Empresa,
      razonSocial: row.Nombre,
      nombreComercial: row.Nombre,
      rfc: row.RFC,
      direccion: row.Direccion,
      telefono: row.Telefonos,
      email: '',
      activa: true,
      createdAt: new Date(),
    };
  }

  async getEmpresaByCodigo(codigo: string): Promise<Empresa | null> {
    return this.getEmpresa(codigo);
  }

  async getEmpresas(filters?: { activa?: boolean }): Promise<Empresa[]> {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        Empresa,
        Nombre,
        RFC,
        Direccion,
        Telefonos
      FROM Empresa
      ORDER BY Empresa
    `);

    return result.recordset.map(row => ({
      id: row.Empresa,
      codigo: row.Empresa,
      razonSocial: row.Nombre,
      nombreComercial: row.Nombre,
      rfc: row.RFC,
      direccion: row.Direccion,
      telefono: row.Telefonos,
      email: '',
      activa: true,
      createdAt: new Date(),
    }));
  }

  async updateEmpresa(id: string, data: Partial<Empresa>): Promise<void> {
    throw new Error('Actualizar empresas no está implementado - las empresas del ERP no se modifican desde el portal');
  }

  // ==================== USUARIO-EMPRESA ====================

  async createUsuarioEmpresa(data: Omit<UsuarioEmpresa, 'id'>): Promise<string> {
    // TODO: Implementar usando pNetUsuarioEmpresa
    throw new Error('Not implemented yet');
  }

  async getEmpresasByUsuario(usuarioId: string): Promise<UsuarioEmpresa[]> {
    // TODO: Implementar usando pNetUsuarioEmpresa
    return [];
  }

  async updateUsuarioEmpresa(
    usuarioId: string,
    empresaId: string,
    data: Partial<UsuarioEmpresa>
  ): Promise<void> {
    // TODO: Implementar usando pNetUsuarioEmpresa
  }

  // ==================== MAPPERS ====================

  private mapRowToProveedorUser(row: any): ProveedorUser {
    return {
      uid: String(row.IDUsuario),
      email: row.eMail,
      displayName: row.Nombre,
      role: 'proveedor',
      userType: 'Proveedor',
      empresa: row.Empresa || '',
      isActive: row.Estatus === 'ACTIVO',
      rfc: row.RFC || '',
      razonSocial: row.ProveedorNombre || row.Nombre,
      telefono: row.Telefono || '',
      direccion: {
        calle: row.Direccion || '',
        ciudad: row.Poblacion || '',
        estado: row.Estado || '',
        cp: row.CodigoPostal || '',
      },
      status: row.ProveedorEstatus === 'ALTA' ? 'aprobado' : 'pendiente',
      documentosValidados: false,
      createdAt: new Date(),
    };
  }

  // ==================== STUBS (Por implementar) ====================

  async createDocumento(data: Omit<DocumentoProveedor, 'id'>): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getDocumentosByProveedor(proveedorId: string): Promise<DocumentoProveedor[]> {
    return [];
  }
  async updateDocumento(id: string, data: Partial<DocumentoProveedor>): Promise<void> {}
  async deleteDocumento(id: string): Promise<void> {}

  async createOrdenCompra(data: Omit<OrdenCompra, 'id'>): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getOrdenCompra(id: string): Promise<OrdenCompra | null> {
    return null;
  }
  async getOrdenesCompraByProveedor(
    proveedorId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return [];
  }
  async getOrdenesCompraByEmpresa(
    empresaId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return [];
  }
  async getAllOrdenesCompra(filters?: OrdenCompraFilters): Promise<OrdenCompra[]> {
    return [];
  }
  async updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<void> {}

  async createFactura(data: Omit<Factura, 'id'>): Promise<string> {
    throw new Error('Not implemented yet');
  }
  async getFactura(id: string): Promise<Factura | null> {
    return null;
  }
  async getFacturasByProveedor(
    proveedorId: string,
    filters?: FacturaFilters
  ): Promise<Factura[]> {
    return [];
  }
  async getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters): Promise<Factura[]> {
    return [];
  }
  async getAllFacturas(filters?: FacturaFilters): Promise<Factura[]> {
    return [];
  }
  async getFacturaByUUID(uuid: string): Promise<Factura | null> {
    return null;
  }
  async updateFactura(id: string, data: Partial<Factura>): Promise<void> {}

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
}
