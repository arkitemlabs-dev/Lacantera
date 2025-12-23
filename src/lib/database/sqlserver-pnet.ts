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
      status: proveedorData?.Estatus === 'ALTA' ? 'activo' : 'pendiente_validacion',
      documentosValidados: false,
      registradoEnPortal: true, // Si llegamos aquí, está registrado
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
            p.SituacionFecha,
            p.Alta as FechaAltaERP,
            p.ProvBancoSucursal as Banco,
            p.ProvCuenta as CuentaBancaria,
            p.FormaPago,
            p.DiaRevision1,
            p.DiaRevision2,
            p.DiaPago1,
            p.DiaPago2
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
          p.SituacionFecha,
          p.Alta as FechaAltaERP,
          p.ProvBancoSucursal as Banco,
          p.ProvCuenta as CuentaBancaria,
          p.FormaPago,
          p.DiaRevision1,
          p.DiaRevision2,
          p.DiaPago1,
          p.DiaPago2
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

      // SIEMPRE filtrar solo proveedores con estatus ALTA (excluir BAJA y BLOQUEADO)
      const erpConditions: string[] = ["UPPER(p.Estatus) = 'ALTA'"];

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

      // 2. Obtener usuarios registrados en el portal con sus RFCs
      // El cruce se hace por RFC porque los códigos de proveedor del portal (PROV001)
      // no coinciden con los códigos del ERP (P01464)
      const portalPool = await getConnection();

      // Query: Obtener usuarios del portal con el RFC del proveedor asociado
      // Unimos pNetUsuario con la tabla Prov del PORTAL para obtener el RFC
      const portalProveedoresQuery = `
        SELECT
          u.IDUsuario,
          u.eMail,
          u.Nombre as UsuarioNombre,
          u.Estatus as UsuarioEstatus,
          u.FechaRegistro,
          u.Telefono as UsuarioTelefono,
          u.Usuario as CodigoProveedorPortal,
          p.RFC as ProveedorRFC,
          'pNetUsuario' as Fuente
        FROM pNetUsuario u
        LEFT JOIN Prov p ON u.Usuario = p.Proveedor
        WHERE u.IDUsuarioTipo = 4
          AND u.Usuario IS NOT NULL
          AND u.Usuario != ''
      `;

      console.log('[PORTAL-QUERY] Obteniendo usuarios del portal con RFC...');
      const portalResult = await portalPool.request().query(portalProveedoresQuery);
      console.log(`[PORTAL-QUERY] Encontrados ${portalResult.recordset.length} usuarios proveedores en portal`);

      // Debug: mostrar los proveedores encontrados en el portal con sus RFCs
      if (portalResult.recordset.length > 0) {
        console.log('[PORTAL-QUERY] Proveedores registrados:');
        portalResult.recordset.forEach(u => {
          console.log(`  - Código: "${u.CodigoProveedorPortal}", RFC: "${u.ProveedorRFC || 'SIN RFC'}", Email: ${u.eMail}`);
        });
      }

      // 3. Crear mapas de proveedores registrados en el portal por múltiples criterios
      const portalUsuariosPorRFC = new Map<string, any>();
      const portalUsuariosPorCodigo = new Map<string, any>();
      const portalUsuariosPorNombre = new Map<string, any>();
      
      for (const usuario of portalResult.recordset) {
        // Mapear por RFC
        if (usuario.ProveedorRFC) {
          const rfcNormalizado = String(usuario.ProveedorRFC).trim().toUpperCase().replace(/[\s-]/g, '');
          portalUsuariosPorRFC.set(rfcNormalizado, usuario);
        }
        
        // Mapear por código de proveedor del portal
        if (usuario.CodigoProveedorPortal) {
          const codigoNorm = String(usuario.CodigoProveedorPortal).trim().toUpperCase();
          portalUsuariosPorCodigo.set(codigoNorm, usuario);
        }
        
        // Mapear por nombre
        if (usuario.UsuarioNombre) {
          const nombreNorm = String(usuario.UsuarioNombre).trim().toUpperCase();
          portalUsuariosPorNombre.set(nombreNorm, usuario);
        }
      }

      console.log(`[PORTAL-MAP] Total RFCs mapeados: ${portalUsuariosPorRFC.size}`);

      // Debug: mostrar algunos RFCs del ERP
      if (erpResult.recordset.length > 0) {
        const primeros5 = erpResult.recordset.slice(0, 5).map(p => `"${p.RFC || 'SIN RFC'}"`);
        console.log('[ERP-QUERY] Primeros 5 RFCs del ERP:', primeros5.join(', '));
      }

      // 4. Combinar datos: ERP + Portal (cruce por múltiples criterios)
      let proveedores: ProveedorUser[] = erpResult.recordset.map(erpRow => {
        let portalUsuario = null;
        
        // 1. Intentar por RFC
        if (erpRow.RFC) {
          const rfcERP = String(erpRow.RFC).trim().toUpperCase().replace(/[\s-]/g, '');
          portalUsuario = portalUsuariosPorRFC.get(rfcERP);
        }
        
        // 2. Si no se encontró, intentar por código de proveedor
        if (!portalUsuario && erpRow.Proveedor) {
          const codigoERP = String(erpRow.Proveedor).trim().toUpperCase();
          portalUsuario = portalUsuariosPorCodigo.get(codigoERP);
        }
        
        // 3. Si no se encontró, intentar por nombre
        if (!portalUsuario && erpRow.ProveedorNombre) {
          const nombreERP = String(erpRow.ProveedorNombre).trim().toUpperCase();
          portalUsuario = portalUsuariosPorNombre.get(nombreERP);
        }

        // Debug para primeros registros
        if (erpResult.recordset.indexOf(erpRow) < 10) {
          console.log(`[MATCH] Proveedor ERP: "${erpRow.Proveedor}" - "${erpRow.ProveedorNombre}", Match: ${portalUsuario ? 'SÍ (' + portalUsuario.eMail + ')' : 'NO'}`);
        }

        return this.mapRowToProveedorUserFromERP({
          ...erpRow,
          // Datos del portal si existe (cruzado por RFC)
          IDUsuario: portalUsuario?.IDUsuario || null,
          eMail: portalUsuario?.eMail || null,
          UsuarioNombre: portalUsuario?.UsuarioNombre || null,
          UsuarioEstatus: portalUsuario?.UsuarioEstatus || null,
          FechaRegistro: portalUsuario?.FechaRegistro || null,
          UsuarioTelefono: portalUsuario?.UsuarioTelefono || null,
          RegistradoEnPortal: portalUsuario ? 1 : 0,
          FuentePortal: portalUsuario?.Fuente || null,
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
      status: row.ProveedorEstatus === 'ALTA' ? 'activo' : 'pendiente_validacion',
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

    // Como solo consultamos proveedores con estatus ALTA, siempre mapear a 'activo'
    const status: ProveedorUser['status'] = 'activo';

    // Construir dirección completa
    const direccionParts = [row.Direccion, row.DireccionNumero].filter(Boolean);
    const direccionCompleta = direccionParts.join(' ');

    // Construir arrays de días de revisión y pago
    const diasRevision: string[] = [];
    if (row.DiaRevision1) diasRevision.push(row.DiaRevision1);
    if (row.DiaRevision2) diasRevision.push(row.DiaRevision2);

    const diasPago: string[] = [];
    if (row.DiaPago1) diasPago.push(row.DiaPago1);
    if (row.DiaPago2) diasPago.push(row.DiaPago2);

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

      // Campos adicionales del ERP
      contacto1: row.Contacto1 || undefined,
      contacto2: row.Contacto2 || undefined,
      email2: row.ProveedorEmail2 || undefined,
      categoria: row.Categoria || undefined,
      condicionPago: row.CondicionPago || undefined,
      formaPago: row.FormaPago || undefined,
      diasRevision: diasRevision.length > 0 ? diasRevision : undefined,
      diasPago: diasPago.length > 0 ? diasPago : undefined,
      banco: row.Banco || undefined,
      cuentaBancaria: row.CuentaBancaria || undefined,
      situacion: row.Situacion || undefined,
      situacionNota: row.SituacionNota || undefined,
      situacionFecha: row.SituacionFecha ? new Date(row.SituacionFecha) : undefined,
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

  // ==================== MENSAJERÍA ====================

  /**
   * Asegura que las tablas de mensajería existan
   */
  private async ensureMensajeriaTables(): Promise<void> {
    const pool = await getConnection();

    // Crear tabla de conversaciones si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WebConversacion' AND xtype='U')
      CREATE TABLE WebConversacion (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Participantes NVARCHAR(MAX) NOT NULL,
        ParticipantesInfo NVARCHAR(MAX) NOT NULL,
        Asunto NVARCHAR(500) NOT NULL,
        UltimoMensaje NVARCHAR(MAX),
        UltimoMensajeFecha DATETIME,
        UltimoMensajeRemitente NVARCHAR(200),
        Activa BIT DEFAULT 1,
        NoLeidos NVARCHAR(MAX),
        EmpresaId NVARCHAR(50),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Crear tabla de mensajes si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WebMensaje' AND xtype='U')
      CREATE TABLE WebMensaje (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        ConversacionId INT NOT NULL,
        RemitenteId NVARCHAR(100) NOT NULL,
        RemitenteNombre NVARCHAR(200) NOT NULL,
        RemitenteRol NVARCHAR(100),
        DestinatarioId NVARCHAR(100) NOT NULL,
        DestinatarioNombre NVARCHAR(200),
        Mensaje NVARCHAR(MAX) NOT NULL,
        Asunto NVARCHAR(500),
        Archivos NVARCHAR(MAX),
        Leido BIT DEFAULT 0,
        FechaLectura DATETIME,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Crear tabla de notificaciones si no existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WebNotificacion' AND xtype='U')
      CREATE TABLE WebNotificacion (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        UsuarioId NVARCHAR(100) NOT NULL,
        Tipo NVARCHAR(50) NOT NULL,
        Titulo NVARCHAR(200) NOT NULL,
        Mensaje NVARCHAR(MAX),
        Link NVARCHAR(500),
        Leida BIT DEFAULT 0,
        EmailEnviado BIT DEFAULT 0,
        EmpresaId NVARCHAR(50),
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);
  }

  async createConversacion(data: Omit<Conversacion, 'id' | 'conversacionId' | 'createdAt' | 'updatedAt'>): Promise<Conversacion> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('participantes', sql.NVarChar(sql.MAX), JSON.stringify(data.participantes))
      .input('participantesInfo', sql.NVarChar(sql.MAX), JSON.stringify(data.participantesInfo))
      .input('asunto', sql.NVarChar(500), data.asunto)
      .input('ultimoMensaje', sql.NVarChar(sql.MAX), data.ultimoMensaje || '')
      .input('ultimoMensajeFecha', sql.DateTime, data.ultimoMensajeFecha || new Date())
      .input('ultimoMensajeRemitente', sql.NVarChar(200), data.ultimoMensajeRemitente || '')
      .input('activa', sql.Bit, data.activa ? 1 : 0)
      .input('noLeidos', sql.NVarChar(sql.MAX), JSON.stringify(data.noLeidos || {}))
      .input('empresaId', sql.NVarChar(50), data.empresaId || '')
      .query(`
        INSERT INTO WebConversacion
          (Participantes, ParticipantesInfo, Asunto, UltimoMensaje, UltimoMensajeFecha,
           UltimoMensajeRemitente, Activa, NoLeidos, EmpresaId, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.ID, INSERTED.CreatedAt, INSERTED.UpdatedAt
        VALUES
          (@participantes, @participantesInfo, @asunto, @ultimoMensaje, @ultimoMensajeFecha,
           @ultimoMensajeRemitente, @activa, @noLeidos, @empresaId, GETDATE(), GETDATE())
      `);

    const conversacionId = String(result.recordset[0].ID);

    return {
      id: conversacionId,
      conversacionId: conversacionId,
      participantes: data.participantes,
      participantesInfo: data.participantesInfo,
      asunto: data.asunto,
      ultimoMensaje: data.ultimoMensaje || '',
      ultimoMensajeFecha: data.ultimoMensajeFecha || new Date(),
      ultimoMensajeRemitente: data.ultimoMensajeRemitente || '',
      activa: data.activa,
      noLeidos: data.noLeidos || {},
      createdAt: result.recordset[0].CreatedAt,
      updatedAt: result.recordset[0].UpdatedAt
    };
  }

  async getConversacion(id: string): Promise<Conversacion | null> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT * FROM WebConversacion WHERE ID = @id
      `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return {
      id: String(row.ID),
      conversacionId: String(row.ID),
      participantes: JSON.parse(row.Participantes || '[]'),
      participantesInfo: JSON.parse(row.ParticipantesInfo || '[]'),
      asunto: row.Asunto,
      ultimoMensaje: row.UltimoMensaje || '',
      ultimoMensajeFecha: row.UltimoMensajeFecha,
      ultimoMensajeRemitente: row.UltimoMensajeRemitente || '',
      activa: row.Activa,
      noLeidos: JSON.parse(row.NoLeidos || '{}'),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    };
  }

  async getConversacionEntreUsuarios(usuario1Id: string, usuario2Id: string): Promise<Conversacion | null> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuario1', sql.NVarChar(100), usuario1Id)
      .input('usuario2', sql.NVarChar(100), usuario2Id)
      .query(`
        SELECT * FROM WebConversacion
        WHERE Participantes LIKE '%' + @usuario1 + '%'
          AND Participantes LIKE '%' + @usuario2 + '%'
          AND Activa = 1
        ORDER BY UpdatedAt DESC
      `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    return {
      id: String(row.ID),
      conversacionId: String(row.ID),
      participantes: JSON.parse(row.Participantes || '[]'),
      participantesInfo: JSON.parse(row.ParticipantesInfo || '[]'),
      asunto: row.Asunto,
      ultimoMensaje: row.UltimoMensaje || '',
      ultimoMensajeFecha: row.UltimoMensajeFecha,
      ultimoMensajeRemitente: row.UltimoMensajeRemitente || '',
      activa: row.Activa,
      noLeidos: JSON.parse(row.NoLeidos || '{}'),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    };
  }

  async getConversacionesByUsuario(usuarioId: string): Promise<Conversacion[]> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    // Buscar con múltiples patrones para asegurar que encontramos el ID
    // El ID puede estar como: "123" o "123", o 123 en el JSON
    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .input('pattern1', sql.NVarChar(150), `%"${usuarioId}"%`)  // "123"
      .input('pattern2', sql.NVarChar(150), `%"${usuarioId}",%`) // "123",
      .input('pattern3', sql.NVarChar(150), `%,"${usuarioId}"%`) // ,"123"
      .query(`
        SELECT * FROM WebConversacion
        WHERE (
          Participantes LIKE @pattern1
          OR Participantes LIKE @pattern2
          OR Participantes LIKE @pattern3
        )
        AND Activa = 1
        ORDER BY UltimoMensajeFecha DESC
      `);

    console.log(`[DB] getConversacionesByUsuario(${usuarioId}) - Encontradas: ${result.recordset.length} conversaciones`);

    return result.recordset.map(row => ({
      id: String(row.ID),
      conversacionId: String(row.ID),
      participantes: JSON.parse(row.Participantes || '[]'),
      participantesInfo: JSON.parse(row.ParticipantesInfo || '[]'),
      asunto: row.Asunto,
      ultimoMensaje: row.UltimoMensaje || '',
      ultimoMensajeFecha: row.UltimoMensajeFecha,
      ultimoMensajeRemitente: row.UltimoMensajeRemitente || '',
      activa: row.Activa,
      noLeidos: JSON.parse(row.NoLeidos || '{}'),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    }));
  }

  async updateConversacion(id: string, data: Partial<Conversacion>): Promise<void> {
    const pool = await getConnection();

    const updates: string[] = [];
    const request = pool.request().input('id', sql.Int, parseInt(id));

    if (data.ultimoMensaje !== undefined) {
      updates.push('UltimoMensaje = @ultimoMensaje');
      request.input('ultimoMensaje', sql.NVarChar(sql.MAX), data.ultimoMensaje);
    }
    if (data.ultimoMensajeFecha !== undefined) {
      updates.push('UltimoMensajeFecha = @ultimoMensajeFecha');
      request.input('ultimoMensajeFecha', sql.DateTime, data.ultimoMensajeFecha);
    }
    if (data.ultimoMensajeRemitente !== undefined) {
      updates.push('UltimoMensajeRemitente = @ultimoMensajeRemitente');
      request.input('ultimoMensajeRemitente', sql.NVarChar(200), data.ultimoMensajeRemitente);
    }
    if (data.activa !== undefined) {
      updates.push('Activa = @activa');
      request.input('activa', sql.Bit, data.activa ? 1 : 0);
    }
    if (data.noLeidos !== undefined) {
      updates.push('NoLeidos = @noLeidos');
      request.input('noLeidos', sql.NVarChar(sql.MAX), JSON.stringify(data.noLeidos));
    }

    updates.push('UpdatedAt = GETDATE()');

    if (updates.length > 0) {
      await request.query(`
        UPDATE WebConversacion SET ${updates.join(', ')} WHERE ID = @id
      `);
    }
  }

  async createMensaje(data: Omit<Mensaje, 'id' | 'mensajeId' | 'createdAt'>): Promise<Mensaje> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('conversacionId', sql.Int, parseInt(data.conversacionId))
      .input('remitenteId', sql.NVarChar(100), data.remitenteId)
      .input('remitenteNombre', sql.NVarChar(200), data.remitenteNombre)
      .input('remitenteRol', sql.NVarChar(100), data.remitenteRol || '')
      .input('destinatarioId', sql.NVarChar(100), data.destinatarioId)
      .input('destinatarioNombre', sql.NVarChar(200), data.destinatarioNombre || '')
      .input('mensaje', sql.NVarChar(sql.MAX), data.mensaje)
      .input('asunto', sql.NVarChar(500), data.asunto || '')
      .input('archivos', sql.NVarChar(sql.MAX), JSON.stringify(data.archivos || []))
      .input('leido', sql.Bit, data.leido ? 1 : 0)
      .query(`
        INSERT INTO WebMensaje
          (ConversacionId, RemitenteId, RemitenteNombre, RemitenteRol, DestinatarioId,
           DestinatarioNombre, Mensaje, Asunto, Archivos, Leido, CreatedAt)
        OUTPUT INSERTED.ID, INSERTED.CreatedAt
        VALUES
          (@conversacionId, @remitenteId, @remitenteNombre, @remitenteRol, @destinatarioId,
           @destinatarioNombre, @mensaje, @asunto, @archivos, @leido, GETDATE())
      `);

    const mensajeId = String(result.recordset[0].ID);

    return {
      id: mensajeId,
      mensajeId: mensajeId,
      conversacionId: data.conversacionId,
      remitenteId: data.remitenteId,
      remitenteNombre: data.remitenteNombre,
      remitenteRol: data.remitenteRol,
      destinatarioId: data.destinatarioId,
      destinatarioNombre: data.destinatarioNombre,
      mensaje: data.mensaje,
      asunto: data.asunto,
      archivos: data.archivos,
      leido: data.leido,
      createdAt: result.recordset[0].CreatedAt
    };
  }

  async getMensajesByConversacion(conversacionId: string, limit: number = 50, offset: number = 0): Promise<Mensaje[]> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('conversacionId', sql.Int, parseInt(conversacionId))
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT * FROM WebMensaje
        WHERE ConversacionId = @conversacionId
        ORDER BY CreatedAt ASC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return result.recordset.map(row => ({
      id: String(row.ID),
      mensajeId: String(row.ID),
      conversacionId: String(row.ConversacionId),
      remitenteId: row.RemitenteId,
      remitenteNombre: row.RemitenteNombre,
      remitenteRol: row.RemitenteRol || '',
      destinatarioId: row.DestinatarioId,
      destinatarioNombre: row.DestinatarioNombre || '',
      mensaje: row.Mensaje,
      asunto: row.Asunto || '',
      archivos: JSON.parse(row.Archivos || '[]'),
      leido: row.Leido,
      fechaLectura: row.FechaLectura,
      createdAt: row.CreatedAt
    }));
  }

  async marcarMensajesComoLeidos(conversacionId: string, usuarioId: string): Promise<void> {
    const pool = await getConnection();

    await pool.request()
      .input('conversacionId', sql.Int, parseInt(conversacionId))
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .query(`
        UPDATE WebMensaje
        SET Leido = 1, FechaLectura = GETDATE()
        WHERE ConversacionId = @conversacionId
          AND DestinatarioId = @usuarioId
          AND Leido = 0
      `);
  }

  async marcarMensajeComoLeido(id: string): Promise<void> {
    const pool = await getConnection();

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        UPDATE WebMensaje SET Leido = 1, FechaLectura = GETDATE() WHERE ID = @id
      `);
  }

  // ==================== NOTIFICACIONES ====================

  async createNotificacion(data: {
    usuarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    link?: string;
    leida?: boolean;
    emailEnviado?: boolean;
    empresaId?: string;
  }): Promise<string> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), data.usuarioId)
      .input('tipo', sql.NVarChar(50), data.tipo)
      .input('titulo', sql.NVarChar(200), data.titulo)
      .input('mensaje', sql.NVarChar(sql.MAX), data.mensaje)
      .input('link', sql.NVarChar(500), data.link || '')
      .input('leida', sql.Bit, data.leida ? 1 : 0)
      .input('emailEnviado', sql.Bit, data.emailEnviado ? 1 : 0)
      .input('empresaId', sql.NVarChar(50), data.empresaId || '')
      .query(`
        INSERT INTO WebNotificacion
          (UsuarioId, Tipo, Titulo, Mensaje, Link, Leida, EmailEnviado, EmpresaId, CreatedAt)
        OUTPUT INSERTED.ID
        VALUES
          (@usuarioId, @tipo, @titulo, @mensaje, @link, @leida, @emailEnviado, @empresaId, GETDATE())
      `);

    return String(result.recordset[0].ID);
  }

  async getNotificacionesByUsuario(usuarioId: string, limit: number = 20): Promise<Notificacion[]> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) * FROM WebNotificacion
        WHERE UsuarioId = @usuarioId
        ORDER BY CreatedAt DESC
      `);

    return result.recordset.map(row => ({
      id: String(row.ID),
      notificacionId: String(row.ID),
      usuarioId: row.UsuarioId,
      tipo: row.Tipo,
      titulo: row.Titulo,
      mensaje: row.Mensaje,
      link: row.Link,
      leida: row.Leida,
      emailEnviado: row.EmailEnviado,
      empresaId: row.EmpresaId,
      createdAt: row.CreatedAt
    }));
  }

  async marcarNotificacionComoLeida(id: string): Promise<void> {
    const pool = await getConnection();

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`UPDATE WebNotificacion SET Leida = 1 WHERE ID = @id`);
  }

  async marcarTodasNotificacionesComoLeidas(usuarioId: string): Promise<void> {
    const pool = await getConnection();

    await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .query(`UPDATE WebNotificacion SET Leida = 1 WHERE UsuarioId = @usuarioId`);
  }

  async getNotificacionesNoLeidas(usuarioId: string): Promise<number> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .query(`
        SELECT COUNT(*) as count FROM WebNotificacion
        WHERE UsuarioId = @usuarioId AND Leida = 0
      `);

    return result.recordset[0].count;
  }

  async getMensajesNoLeidosCount(usuarioId: string): Promise<number> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .query(`
        SELECT COUNT(*) as count FROM WebMensaje
        WHERE DestinatarioId = @usuarioId AND Leido = 0
      `);

    return result.recordset[0].count;
  }

  async uploadArchivoMensaje(archivo: File, conversacionId: string): Promise<string> {
    // Por ahora retornar una URL placeholder
    // TODO: Implementar subida real a almacenamiento
    return `mensajes/${conversacionId}/${archivo.name}`;
  }

  async getDownloadUrl(archivoUrl: string): Promise<string> {
    // Por ahora retornar la misma URL
    // TODO: Implementar URL de descarga real
    return archivoUrl;
  }

  async getUsuariosParaConversacion(usuarioId: string, empresaId: string, rol?: string): Promise<any[]> {
    // Esta función ya se maneja directamente en mensajes.ts
    return [];
  }

  async buscarMensajes(usuarioId: string, query: string, conversacionId?: string): Promise<Mensaje[]> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    let sqlQuery = `
      SELECT m.* FROM WebMensaje m
      INNER JOIN WebConversacion c ON m.ConversacionId = c.ID
      WHERE c.Participantes LIKE '%' + @usuarioId + '%'
        AND m.Mensaje LIKE '%' + @query + '%'
    `;

    const request = pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .input('query', sql.NVarChar(200), query);

    if (conversacionId) {
      sqlQuery += ' AND m.ConversacionId = @conversacionId';
      request.input('conversacionId', sql.Int, parseInt(conversacionId));
    }

    sqlQuery += ' ORDER BY m.CreatedAt DESC';

    const result = await request.query(sqlQuery);

    return result.recordset.map(row => ({
      id: String(row.ID),
      mensajeId: String(row.ID),
      conversacionId: String(row.ConversacionId),
      remitenteId: row.RemitenteId,
      remitenteNombre: row.RemitenteNombre,
      remitenteRol: row.RemitenteRol || '',
      destinatarioId: row.DestinatarioId,
      destinatarioNombre: row.DestinatarioNombre || '',
      mensaje: row.Mensaje,
      asunto: row.Asunto || '',
      archivos: JSON.parse(row.Archivos || '[]'),
      leido: row.Leido,
      fechaLectura: row.FechaLectura,
      createdAt: row.CreatedAt
    }));
  }

  async getEstadisticasMensajeria(usuarioId: string, empresaId?: string): Promise<any> {
    await this.ensureMensajeriaTables();
    const pool = await getConnection();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM WebConversacion WHERE Participantes LIKE '%' + @usuarioId + '%' AND Activa = 1) as totalConversaciones,
          (SELECT COUNT(*) FROM WebMensaje WHERE DestinatarioId = @usuarioId AND Leido = 0) as mensajesNoLeidos
      `);

    return {
      totalConversaciones: result.recordset[0].totalConversaciones,
      mensajesNoLeidos: result.recordset[0].mensajesNoLeidos
    };
  }
}
