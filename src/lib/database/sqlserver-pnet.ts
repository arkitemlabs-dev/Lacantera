// src/lib/database/sqlserver-pnet.ts
// Implementación de la interfaz Database usando tablas pNet existentes de SQL Server

import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getConnection } from '@/lib/sql-connection';
import { getERPConnection } from './multi-tenant-connection';
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
    try {
      // Verificar si es un proveedor solo del ERP (no registrado en portal)
      if (uid.startsWith('erp_')) {
        const codigoERP = uid.replace('erp_', '');
        return await this.getProveedorFromERP(codigoERP);
      }

      // Proveedor registrado en el portal - buscar por UsuarioWeb
      const portalPool = await getConnection();
      const portalResult = await portalPool
        .request()
        .input('userId', sql.Int, parseInt(uid))
        .query(`
          SELECT
            wu.UsuarioWeb,
            wu.eMail,
            wu.Nombre as UsuarioNombre,
            wu.Telefono as UsuarioTelefono,
            wu.Estatus as UsuarioEstatus,
            wu.Empresa,
            wu.Proveedor,
            wu.Alta as FechaRegistro
          FROM WebUsuario wu
          WHERE wu.UsuarioWeb = @userId
        `);

      if (portalResult.recordset.length === 0) {
        // Intentar buscar en pNetUsuario (sistema antiguo)
        return await this.getProveedorFromPNetUsuario(uid);
      }

      const portalUsuario = portalResult.recordset[0];
      const codigoERP = portalUsuario.Proveedor?.trim();

      if (!codigoERP) {
        console.warn(`[getProveedor] Usuario ${uid} no tiene proveedor asociado`);
        return null;
      }

      // Obtener datos del ERP
      const erpPool = await getERPConnection('la-cantera');
      const erpResult = await erpPool
        .request()
        .input('proveedor', sql.VarChar(20), codigoERP)
        .query(`
          SELECT
            p.Proveedor,
            p.Nombre as ProveedorNombre,
            p.NombreCorto,
            p.RFC,
            p.Direccion,
            p.DireccionNumero,
            p.Colonia,
            p.Poblacion,
            p.Estado,
            p.Pais,
            p.CodigoPostal,
            p.Telefonos as ProveedorTelefono,
            p.eMail1 as ProveedorEmail,
            p.eMail2 as ProveedorEmail2,
            p.Contacto1,
            p.Contacto2,
            p.Categoria,
            p.Condicion as CondicionPago,
            p.Estatus as ProveedorEstatus,
            p.Situacion,
            p.SituacionNota,
            p.Alta as FechaAltaERP,
            p.ProvBancoSucursal as Banco,
            p.ProvCuenta as CuentaBancaria,
            p.FormaPago
          FROM Prov p
          WHERE p.Proveedor = @proveedor
        `);

      if (erpResult.recordset.length === 0) {
        console.warn(`[getProveedor] Proveedor ${codigoERP} no encontrado en ERP`);
        return null;
      }

      const erpRow = erpResult.recordset[0];

      // Combinar datos del portal y ERP
      return this.mapRowToProveedorUserFromERP({
        ...erpRow,
        IDUsuario: portalUsuario.UsuarioWeb,
        eMail: portalUsuario.eMail,
        UsuarioNombre: portalUsuario.UsuarioNombre,
        UsuarioEstatus: portalUsuario.UsuarioEstatus,
        UsuarioTelefono: portalUsuario.UsuarioTelefono,
        FechaRegistro: portalUsuario.FechaRegistro,
        RegistradoEnPortal: 1,
      });

    } catch (error: any) {
      console.error('[getProveedor] Error:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un proveedor directamente del ERP (no registrado en portal)
   */
  private async getProveedorFromERP(codigoERP: string): Promise<ProveedorUser | null> {
    const erpPool = await getERPConnection('la-cantera');
    const erpResult = await erpPool
      .request()
      .input('proveedor', sql.VarChar(20), codigoERP)
      .query(`
        SELECT
          p.Proveedor,
          p.Nombre as ProveedorNombre,
          p.NombreCorto,
          p.RFC,
          p.Direccion,
          p.DireccionNumero,
          p.Colonia,
          p.Poblacion,
          p.Estado,
          p.Pais,
          p.CodigoPostal,
          p.Telefonos as ProveedorTelefono,
          p.eMail1 as ProveedorEmail,
          p.eMail2 as ProveedorEmail2,
          p.Contacto1,
          p.Contacto2,
          p.Categoria,
          p.Condicion as CondicionPago,
          p.Estatus as ProveedorEstatus,
          p.Situacion,
          p.SituacionNota,
          p.Alta as FechaAltaERP,
          p.ProvBancoSucursal as Banco,
          p.ProvCuenta as CuentaBancaria,
          p.FormaPago
        FROM Prov p
        WHERE p.Proveedor = @proveedor
      `);

    if (erpResult.recordset.length === 0) {
      return null;
    }

    return this.mapRowToProveedorUserFromERP({
      ...erpResult.recordset[0],
      RegistradoEnPortal: 0,
    });
  }

  /**
   * Busca un proveedor en el sistema antiguo pNetUsuario
   */
  private async getProveedorFromPNetUsuario(uid: string): Promise<ProveedorUser | null> {
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
          u.FechaRegistro
        FROM pNetUsuario u
        WHERE u.IDUsuario = @userId AND u.IDUsuarioTipo = 4
      `);

    if (result.recordset.length === 0) return null;

    const usuario = result.recordset[0];
    const codigoERP = usuario.Usuario?.trim();

    if (!codigoERP) return null;

    // Obtener datos del ERP
    const erpPool = await getERPConnection('la-cantera');
    const erpResult = await erpPool
      .request()
      .input('proveedor', sql.VarChar(20), codigoERP)
      .query(`
        SELECT
          p.Proveedor,
          p.Nombre as ProveedorNombre,
          p.NombreCorto,
          p.RFC,
          p.Direccion,
          p.DireccionNumero,
          p.Colonia,
          p.Poblacion,
          p.Estado,
          p.CodigoPostal,
          p.Telefonos as ProveedorTelefono,
          p.eMail1 as ProveedorEmail,
          p.Categoria,
          p.Condicion as CondicionPago,
          p.Estatus as ProveedorEstatus,
          p.Alta as FechaAltaERP,
          p.ProvBancoSucursal as Banco,
          p.ProvCuenta as CuentaBancaria
        FROM Prov p
        WHERE p.Proveedor = @proveedor
      `);

    if (erpResult.recordset.length === 0) return null;

    return this.mapRowToProveedorUserFromERP({
      ...erpResult.recordset[0],
      IDUsuario: usuario.IDUsuario,
      eMail: usuario.eMail,
      UsuarioNombre: usuario.Nombre,
      UsuarioEstatus: usuario.Estatus,
      UsuarioTelefono: usuario.Telefono,
      FechaRegistro: usuario.FechaRegistro,
      RegistradoEnPortal: 1,
    });
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
    try {
      // 1. Obtener proveedores del ERP de La Cantera
      const erpPool = await getERPConnection('la-cantera');
      const erpRequest = erpPool.request();

      // Construir condiciones para el ERP
      const erpConditions: string[] = [
        "p.Tipo = 'Proveedor Nal'", // Solo proveedores nacionales, no estructuras
      ];

      // Filtros de estatus del ERP
      if (filters?.status) {
        const statusMap: { [key: string]: string } = {
          activo: 'ALTA',
          pendiente_validacion: 'BLOQUEADO',
          rechazado: 'BAJA',
          suspendido: 'BLOQUEADO',
        };

        if (Array.isArray(filters.status)) {
          const sqlStatuses = filters.status.map(s => statusMap[s] || 'ALTA');
          const placeholders = sqlStatuses.map((_, i) => `@status${i}`).join(',');
          erpConditions.push(`p.Estatus IN (${placeholders})`);
          sqlStatuses.forEach((s, i) => {
            erpRequest.input(`status${i}`, sql.VarChar(15), s);
          });
        } else {
          const sqlStatus = statusMap[filters.status] || 'ALTA';
          erpConditions.push('p.Estatus = @status');
          erpRequest.input('status', sql.VarChar(15), sqlStatus);
        }
      }

      const erpWhereClause = erpConditions.length > 0 ? `WHERE ${erpConditions.join(' AND ')}` : '';

      // Query al ERP - Solo columnas necesarias para el portal
      const erpQuery = `
        SELECT
          p.Proveedor,
          p.Nombre as ProveedorNombre,
          p.NombreCorto,
          p.RFC,
          p.Direccion,
          p.DireccionNumero,
          p.Colonia,
          p.Poblacion,
          p.Estado,
          p.Pais,
          p.CodigoPostal,
          p.Telefonos as ProveedorTelefono,
          p.eMail1 as ProveedorEmail,
          p.eMail2 as ProveedorEmail2,
          p.Contacto1,
          p.Contacto2,
          p.Categoria,
          p.Condicion as CondicionPago,
          p.Estatus as ProveedorEstatus,
          p.Situacion,
          p.SituacionFecha,
          p.SituacionNota,
          p.Alta as FechaAltaERP,
          p.UltimoCambio,
          p.Tipo,
          p.ProvBancoSucursal as Banco,
          p.ProvCuenta as CuentaBancaria,
          p.FormaPago,
          p.DiaRevision1,
          p.DiaRevision2,
          p.DiaPago1,
          p.DiaPago2
        FROM Prov p
        ${erpWhereClause}
        ORDER BY p.Nombre ASC
      `;

      console.log('[ERP-QUERY] Obteniendo proveedores de Cantera_ajustes...');
      const erpResult = await erpRequest.query(erpQuery);
      console.log(`[ERP-QUERY] Encontrados ${erpResult.recordset.length} proveedores en ERP`);

      // 2. Obtener usuarios registrados en el portal (tabla WebUsuario)
      const portalPool = await getConnection();
      const portalQuery = `
        SELECT
          wu.UsuarioWeb,
          wu.eMail,
          wu.Nombre as UsuarioNombre,
          wu.Estatus as UsuarioEstatus,
          wu.Alta as FechaRegistro,
          wu.Telefono as UsuarioTelefono,
          wu.Proveedor,
          wu.Rol
        FROM WebUsuario wu
        WHERE wu.Proveedor IS NOT NULL
          AND wu.Proveedor != ''
      `;

      console.log('[PORTAL-QUERY] Obteniendo usuarios del portal...');
      const portalResult = await portalPool.request().query(portalQuery);
      console.log(`[PORTAL-QUERY] Encontrados ${portalResult.recordset.length} usuarios proveedores en portal`);

      // Debug: mostrar los proveedores encontrados en el portal
      if (portalResult.recordset.length > 0) {
        console.log('[PORTAL-QUERY] Proveedores registrados:', portalResult.recordset.map(u => u.Proveedor).join(', '));
      }

      // 3. Crear mapa de proveedores registrados en el portal (por código de proveedor)
      const portalUsuariosMap = new Map<string, any>();
      for (const usuario of portalResult.recordset) {
        if (usuario.Proveedor) {
          portalUsuariosMap.set(usuario.Proveedor.trim(), usuario);
        }
      }

      // 4. Combinar datos: ERP + Portal
      let proveedores: ProveedorUser[] = erpResult.recordset.map(erpRow => {
        const codigoERP = erpRow.Proveedor?.trim() || '';
        const portalUsuario = portalUsuariosMap.get(codigoERP);
        return this.mapRowToProveedorUserFromERP({
          ...erpRow,
          // Datos del portal si existe
          IDUsuario: portalUsuario?.UsuarioWeb || null,
          eMail: portalUsuario?.eMail || null,
          UsuarioNombre: portalUsuario?.UsuarioNombre || null,
          UsuarioEstatus: portalUsuario?.UsuarioEstatus || null,
          FechaRegistro: portalUsuario?.FechaRegistro || null,
          UsuarioTelefono: portalUsuario?.UsuarioTelefono || null,
          RegistradoEnPortal: portalUsuario ? 1 : 0,
        });
      });

      // 5. Filtro por estado de registro en portal
      if (filters?.registradoEnPortal !== undefined) {
        proveedores = proveedores.filter(p =>
          filters.registradoEnPortal ? p.registradoEnPortal : !p.registradoEnPortal
        );
      }

      // 6. Filtrado por búsqueda
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        proveedores = proveedores.filter(
          p =>
            p.razonSocial.toLowerCase().includes(term) ||
            p.rfc.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            (p.codigoERP && p.codigoERP.toLowerCase().includes(term))
        );
      }

      // 7. Ordenar: primero registrados, luego por nombre
      proveedores.sort((a, b) => {
        // Primero los registrados
        if (a.registradoEnPortal && !b.registradoEnPortal) return -1;
        if (!a.registradoEnPortal && b.registradoEnPortal) return 1;
        // Luego por nombre
        return a.razonSocial.localeCompare(b.razonSocial);
      });

      return proveedores;

    } catch (error: any) {
      console.error('[getProveedores] Error:', error.message);
      throw error;
    }
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
      registradoEnPortal: true,
      fechaRegistroPortal: row.FechaRegistro || null,
      codigoERP: row.Proveedor,
      createdAt: new Date(),
    };
  }

  /**
   * Mapea un registro que viene del ERP (Prov) con posible usuario de portal
   * Usado para mostrar todos los proveedores incluyendo los no registrados
   */
  private mapRowToProveedorUserFromERP(row: any): ProveedorUser {
    const registradoEnPortal = row.RegistradoEnPortal === 1;

    // Mapear estatus del ERP a estatus del portal
    let status: ProveedorUser['status'] = 'pendiente_validacion';
    if (row.ProveedorEstatus === 'ALTA') {
      status = 'activo';
    } else if (row.ProveedorEstatus === 'BLOQUEADO') {
      status = 'suspendido';
    } else if (row.ProveedorEstatus === 'BAJA') {
      status = 'rechazado';
    }

    // Construir dirección completa
    const direccionParts = [row.Direccion, row.DireccionNumero].filter(Boolean);
    const direccionCompleta = direccionParts.join(' ');

    return {
      // Si está registrado en portal, usar IDUsuario; si no, usar código del ERP como identificador
      uid: registradoEnPortal ? String(row.IDUsuario) : `erp_${row.Proveedor}`,
      // Si está registrado, usar email del portal; si no, usar email del ERP
      email: registradoEnPortal ? (row.eMail || row.ProveedorEmail || '') : (row.ProveedorEmail || ''),
      displayName: row.ProveedorNombre || row.UsuarioNombre || '',
      role: 'proveedor',
      userType: 'Proveedor',
      empresa: 'la-cantera', // Por ahora solo La Cantera
      isActive: registradoEnPortal ? (row.UsuarioEstatus === 'ACTIVO') : (row.ProveedorEstatus === 'ALTA'),
      rfc: row.RFC || '',
      razonSocial: row.ProveedorNombre || '',
      telefono: registradoEnPortal ? (row.UsuarioTelefono || row.ProveedorTelefono || '') : (row.ProveedorTelefono || ''),
      direccion: {
        calle: direccionCompleta || '',
        ciudad: row.Poblacion || '',
        estado: row.Estado || '',
        cp: row.CodigoPostal || '',
      },
      status,
      documentosValidados: false,
      registradoEnPortal: registradoEnPortal,
      fechaRegistroPortal: registradoEnPortal && row.FechaRegistro ? new Date(row.FechaRegistro) : null,
      codigoERP: row.Proveedor,
      createdAt: registradoEnPortal && row.FechaRegistro ? new Date(row.FechaRegistro) : (row.FechaAltaERP ? new Date(row.FechaAltaERP) : new Date()),
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
