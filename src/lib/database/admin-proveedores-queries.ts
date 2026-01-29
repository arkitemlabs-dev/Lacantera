// src/lib/database/admin-proveedores-queries.ts
// Queries para gestión de proveedores (Admin) - Combina Portal + ERP

import { hybridDB, getTenantConfig } from './multi-tenant-connection';
import { getStoredProcedures } from './stored-procedures';
import { actualizarProveedorDirecto } from './direct-update';
import type {
  ProveedorSPParams,
  ConsultaProveedorParams,
  ProveedorERP,
  SPProveedorResult,
  FormProveedorAdmin,
  FiltrosProveedoresAdmin
} from '@/types/admin-proveedores';

/**
 * Interface para proveedor con datos del portal y ERP
 */
export interface ProveedorCompleto {
  // Portal
  portalUserId: string;
  portalEmail: string;
  portalNombre: string;
  portalEstatus: string;
  portalFechaRegistro: Date | null;
  portalRol: string;
  portalTelefono?: string;

  // Mapeo
  empresasAsignadas: {
    empresaCode: string;
    empresaName: string;
    erpProveedorCode: string;
    mappingActivo: boolean;
  }[];

  // ERP - Puede ser null si no hay mapeo
  erpDatos?: {
    proveedor: string;
    nombre: string;
    rfc?: string;
    email1?: string;
    email2?: string;
    telefono?: string;
    contacto1?: string;

    // Dirección
    direccion?: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
    pais?: string;
    codigoPostal?: string;

    // Comercial
    condicionPago?: string;
    formaPago?: string;
    categoria?: string;
    descuento?: number;

    // Bancario
    banco?: string;
    cuenta?: string;

    // Estatus
    estatus?: string;
    situacion?: string;
    situacionFecha?: Date;
    situacionNota?: string;
    situacionUsuario?: string;

    // Control
    alta?: Date;
    ultimoCambio?: Date;
    tieneMovimientos?: boolean;
    tipo?: string;

    // Días revisión/pago
    diasRevision: string[];
    diasPago: string[];

    // Otros
    comprador?: string;
    agente?: string;
    centroCostos?: string;
    moneda?: string;
  };
}

interface FiltrosProveedores {
  empresaCode?: string;
  tenantId?: string;  // Tenant completo (ej: 'la-cantera-test')
  estatusPortal?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

/**
 * Obtiene proveedores con datos del portal y del ERP
 */
export async function getProveedoresConDatosERP(
  filtros: FiltrosProveedores = {}
) {
  const {
    empresaCode,
    tenantId = 'la-cantera-test',
    estatusPortal,
    busqueda,
    page = 1,
    limit = 50,
  } = filtros;

  const offset = (page - 1) * limit;

  console.log('[getProveedoresConDatosERP] Iniciando con filtros:', filtros);

  try {
    // 1. Obtener proveedores del ERP usando SP sp_getProveedores
    const sp = getStoredProcedures();
    const spResult = await sp.getProveedoresLista({ empresa: tenantId });

    console.log(`[getProveedoresConDatosERP] SP retornó ${spResult.proveedores.length} proveedores, total: ${spResult.total}`);

    // 2. Obtener usuarios del portal para mapear
    const portalResult = await hybridDB.queryPortal(`
      SELECT
        u.IDUsuario,
        u.eMail,
        u.Nombre,
        u.Estatus,
        u.FechaRegistro,
        u.Telefono,
        u.Usuario
      FROM pNetUsuario u
      WHERE u.IDUsuarioTipo = 4
    `);

    // 3. Crear mapas de usuarios del portal por diferentes criterios
    const portalMapByCodigo = new Map();
    const portalMapByNombre = new Map();

    portalResult.recordset.forEach(u => {
      // Mapear por código de proveedor
      if (u.Usuario) {
        portalMapByCodigo.set(u.Usuario.trim().toUpperCase(), u);
      }
      // Mapear por nombre (normalizado)
      if (u.Nombre) {
        const nombreNorm = u.Nombre.trim().toUpperCase();
        portalMapByNombre.set(nombreNorm, u);
      }
    });

    // 4. Procesar SOLO los proveedores del ERP con estatus ALTA
    const proveedores: ProveedorCompleto[] = [];

    for (const erpProv of spResult.proveedores) {
      // Buscar usuario del portal por múltiples criterios
      let portalUser = null;

      // 1. Intentar por código de proveedor
      if (erpProv.Proveedor) {
        portalUser = portalMapByCodigo.get(erpProv.Proveedor.trim().toUpperCase());
      }

      // 2. Si no se encontró, intentar por nombre
      if (!portalUser && erpProv.Nombre) {
        const nombreErpNorm = erpProv.Nombre.trim().toUpperCase();
        portalUser = portalMapByNombre.get(nombreErpNorm);
      }

      // Construir días de revisión y pago
      const diasRevision: string[] = [];
      if (erpProv.DiaRevision1) diasRevision.push(erpProv.DiaRevision1);
      if (erpProv.DiaRevision2) diasRevision.push(erpProv.DiaRevision2);

      const diasPago: string[] = [];
      if (erpProv.DiaPago1) diasPago.push(erpProv.DiaPago1);
      if (erpProv.DiaPago2) diasPago.push(erpProv.DiaPago2);

      const erpDatos = {
        proveedor: erpProv.Proveedor,
        nombre: erpProv.Nombre,
        rfc: erpProv.RFC,
        email1: erpProv.eMail1,
        email2: erpProv.eMail2,
        telefono: erpProv.Telefono,
        contacto1: erpProv.Contacto1,
        direccion: erpProv.Direccion,
        colonia: erpProv.Colonia,
        ciudad: erpProv.Poblacion,
        estado: erpProv.Estado,
        pais: erpProv.Pais,
        codigoPostal: erpProv.CodigoPostal,
        condicionPago: erpProv.Condicion,
        formaPago: erpProv.FormaPago,
        categoria: erpProv.Categoria,
        descuento: erpProv.Descuento,
        banco: erpProv.ProvBancoSucursal,
        cuenta: erpProv.ProvCuenta,
        estatus: 'ALTA', // Forzar ALTA ya que solo consultamos proveedores con este estatus
        situacion: erpProv.Situacion,
        situacionFecha: erpProv.SituacionFecha,
        situacionNota: erpProv.SituacionNota,
        situacionUsuario: erpProv.SituacionUsuario,
        alta: erpProv.Alta,
        ultimoCambio: erpProv.UltimoCambio,
        tieneMovimientos: erpProv.TieneMovimientos === 1,
        tipo: erpProv.Tipo,
        diasRevision,
        diasPago,
        comprador: erpProv.Comprador,
        agente: erpProv.Agente,
        centroCostos: erpProv.CentroCostos,
        moneda: erpProv.DefMoneda,
      };

      const config = getTenantConfig(tenantId);
      const empresasAsignadas = [{
        empresaCode: config.codigoEmpresa,
        empresaName: config.nombre,
        erpProveedorCode: erpProv.Proveedor,
        mappingActivo: true,
      }];

      proveedores.push({
        portalUserId: portalUser?.IDUsuario || `erp_${erpProv.Proveedor}`,
        portalEmail: portalUser?.eMail || erpProv.eMail1 || '',
        portalNombre: portalUser?.Nombre || erpProv.Nombre,
        portalEstatus: portalUser?.Estatus || 'INACTIVO',
        portalFechaRegistro: portalUser?.FechaRegistro || null,
        portalRol: 'proveedor',
        portalTelefono: portalUser?.Telefono || erpProv.Telefono || '',
        empresasAsignadas,
        erpDatos,
      });
    }

    // 5. Aplicar filtros si se especificaron
    let proveedoresFiltrados = [...proveedores];

    if (busqueda) {
      const busquedaNorm = busqueda.toLowerCase();
      proveedoresFiltrados = proveedoresFiltrados.filter(p =>
        p.portalNombre.toLowerCase().includes(busquedaNorm) ||
        p.portalEmail.toLowerCase().includes(busquedaNorm) ||
        p.erpDatos?.rfc?.toLowerCase().includes(busquedaNorm) ||
        p.erpDatos?.proveedor?.toLowerCase().includes(busquedaNorm)
      );
    }

    if (estatusPortal && estatusPortal !== 'todos') {
      proveedoresFiltrados = proveedoresFiltrados.filter(p =>
        p.portalEstatus.toLowerCase() === estatusPortal.toLowerCase()
      );
    }

    // 6. Paginación
    const total = proveedoresFiltrados.length;
    const proveedoresPaginados = proveedoresFiltrados.slice(offset, offset + limit);

    console.log(`[getProveedoresConDatosERP] Retornando ${proveedoresPaginados.length} de ${total} proveedores`);

    return {
      proveedores: proveedoresPaginados,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

  } catch (error: any) {
    console.error('Error en getProveedoresConDatosERP:', error);
    throw error;
  }
}

/**
 * Obtiene un proveedor específico por ID (del portal o ERP)
 */
export async function getProveedorPorId(
  id: string,
  options: {
    incluirDatosERP?: boolean;
    empresaCode?: string;
  } = {}
): Promise<ProveedorCompleto | null> {
  const { incluirDatosERP = true, empresaCode = 'la-cantera-test' } = options;

  try {
    console.log(`[getProveedorPorId] Buscando proveedor: ${id}`);

    // 1. Si el ID empieza con "erp_", es un proveedor que solo existe en ERP
    if (id.startsWith('erp_')) {
      const codigoERP = id.replace('erp_', '');
      return await getProveedorSoloERP(codigoERP, empresaCode);
    }

    // 2. Buscar en el portal por ID
    const portalResult = await hybridDB.queryPortal(`
      SELECT
        u.IDUsuario,
        u.eMail,
        u.Nombre,
        u.Estatus,
        u.FechaRegistro,
        u.Telefono,
        u.Usuario
      FROM pNetUsuario u
      WHERE u.IDUsuario = @userId AND u.IDUsuarioTipo = 4
    `, { userId: id });

    if (portalResult.recordset.length === 0) {
      console.log(`[getProveedorPorId] Usuario ${id} no encontrado en portal`);
      return null;
    }

    const portalUser = portalResult.recordset[0];

    // 3. Buscar mapeo a ERP
    let erpDatos = null;
    if (incluirDatosERP) {
      // Buscar por código de usuario (si existe)
      if (portalUser.Usuario) {
        const erpResult = await hybridDB.queryERP(empresaCode, `
          SELECT * FROM Prov 
          WHERE Proveedor = @codigo AND UPPER(Estatus) = 'ALTA'
        `, { codigo: portalUser.Usuario });

        if (erpResult.recordset.length > 0) {
          const erp = erpResult.recordset[0];
          erpDatos = await mapearDatosERP(erp);
        }
      }

      // Si no se encontró por código, buscar por nombre o RFC
      if (!erpDatos) {
        // Buscar por nombre similar
        const erpResult = await hybridDB.queryERP(empresaCode, `
          SELECT * FROM Prov 
          WHERE UPPER(Nombre) LIKE @nombre AND UPPER(Estatus) = 'ALTA'
        `, { nombre: `%${portalUser.Nombre.toUpperCase()}%` });

        if (erpResult.recordset.length > 0) {
          erpDatos = await mapearDatosERP(erpResult.recordset[0]);
        }
      }
    }

    const tenantConfig = getTenantConfig(empresaCode);
    return {
      portalUserId: portalUser.IDUsuario,
      portalEmail: portalUser.eMail,
      portalNombre: portalUser.Nombre,
      portalEstatus: portalUser.Estatus,
      portalFechaRegistro: portalUser.FechaRegistro,
      portalRol: 'proveedor',
      portalTelefono: portalUser.Telefono,
      empresasAsignadas: [{
        empresaCode: tenantConfig.codigoEmpresa,
        empresaName: tenantConfig.nombre,
        erpProveedorCode: portalUser.Usuario || '',
        mappingActivo: !!erpDatos,
      }],
    };

  } catch (error: any) {
    console.error(`Error en getProveedorPorId(${id}):`, error);
    throw error;
  }
}

/**
 * Helper: Mapear datos del ERP al formato esperado
 */
/**
 * Helper: Mapear datos del ERP al formato esperado
 */
async function mapearDatosERP(erp: any) {
  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  return {
    proveedor: erp.Proveedor,
    nombre: erp.Nombre,
    rfc: erp.RFC,
    email1: erp.eMail1,
    email2: erp.eMail2,
    telefono: erp.Telefonos,
    contacto1: erp.Contacto1,
    contacto2: erp.Contacto2,
    extension1: erp.Extencion1,
    extension2: erp.Extencion2,
    categoria: erp.Categoria,
    familia: erp.Familia,
    descuento: erp.Descuento,
    comprador: erp.Comprador,
    condicionPago: erp.Condicion,
    formaPago: erp.FormaPago,
    diasRevision,
    diasPago,
    beneficiario: erp.Beneficiario,
    beneficiarioNombre: erp.BeneficiarioNombre,
    leyendaCheque: erp.LeyendaCheque,
    agente: erp.Agente,
    situacion: erp.Situacion,
    situacionFecha: erp.SituacionFecha,
    situacionUsuario: erp.SituacionUsuario,
    situacionNota: erp.SituacionNota,
    estatus: erp.Estatus,
    ultimoCambio: erp.UltimoCambio,
    alta: erp.Alta,
    tipo: erp.Tipo,
    moneda: erp.DefMoneda,
    banco: erp.ProvBancoSucursal,
    cuenta: erp.ProvCuenta,
    tieneMovimientos: erp.TieneMovimientos === 1,
    centroCostos: erp.CentroCostos,
    direccion: erp.Direccion,
    colonia: erp.Colonia,
    ciudad: erp.Poblacion,
    estado: erp.Estado,
    pais: erp.Pais,
    codigoPostal: erp.CodigoPostal
  };

}

/**
 * Obtiene un proveedor que solo existe en el ERP (no registrado en portal)
 */
async function getProveedorSoloERP(codigoERP: string, tenantId: string = 'la-cantera-test'): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP(tenantId, `
    SELECT
      p.Proveedor,
      p.Nombre,
      p.RFC,
      p.eMail1,
      p.eMail2,
      p.Telefono,
      p.Contacto1,
      p.Direccion,
      p.Colonia,
      p.Poblacion,
      p.Estado,
      p.Pais,
      p.CodigoPostal,
      p.Condicion,
      p.FormaPago,
      p.Categoria,
      p.Descuento,
      p.ProvBancoSucursal,
      p.ProvCuenta,
      p.Estatus,
      p.Situacion,
      p.SituacionFecha,
      p.SituacionNota,
      p.SituacionUsuario,
      p.Alta,
      p.UltimoCambio,
      p.TieneMovimientos,
      p.Tipo,
      p.DiaRevision1,
      p.DiaRevision2,
      p.DiaPago1,
      p.DiaPago2,
      p.Comprador,
      p.Agente,
      p.CentroCostos,
      p.DefMoneda
    FROM Prov p
    WHERE p.Proveedor = @proveedorCode AND UPPER(p.Estatus) = 'ALTA'
  `, { proveedorCode: codigoERP });

  if (erpResult.recordset.length === 0) {
    throw new Error('Proveedor no encontrado en ERP');
  }

  const erp = erpResult.recordset[0];

  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  const tenantConfig = getTenantConfig(tenantId);
  return {
    portalUserId: `erp_${codigoERP}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO', // No registrado en portal
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefono || '',
    empresasAsignadas: [{
      empresaCode: tenantConfig.codigoEmpresa,
      empresaName: tenantConfig.nombre,
      erpProveedorCode: erp.Proveedor,
      mappingActivo: true,
    }],
    erpDatos: {
      proveedor: erp.Proveedor,
      nombre: erp.Nombre,
      rfc: erp.RFC,
      email1: erp.eMail1,
      email2: erp.eMail2,
      telefono: erp.Telefono,
      contacto1: erp.Contacto1,
      direccion: erp.Direccion,
      colonia: erp.Colonia,
      ciudad: erp.Poblacion,
      estado: erp.Estado,
      pais: erp.Pais,
      codigoPostal: erp.CodigoPostal,
      condicionPago: erp.Condicion,
      formaPago: erp.FormaPago,
      categoria: erp.Categoria,
      descuento: erp.Descuento,
      banco: erp.ProvBancoSucursal,
      cuenta: erp.ProvCuenta,
      estatus: 'ALTA', // Forzar ALTA ya que solo consultamos proveedores activos
      situacion: erp.Situacion,
      situacionFecha: erp.SituacionFecha,
      situacionNota: erp.SituacionNota,
      situacionUsuario: erp.SituacionUsuario,
      alta: erp.Alta,
      ultimoCambio: erp.UltimoCambio,
      tieneMovimientos: erp.TieneMovimientos === 1,
      tipo: erp.Tipo,
      diasRevision,
      diasPago,
      comprador: erp.Comprador,
      agente: erp.Agente,
      centroCostos: erp.CentroCostos,
      moneda: erp.DefMoneda,
    },
  };
}

/**
 * Obtiene estadísticas de proveedores
 */
export async function getProveedoresStats() {
  try {
    // Total de proveedores
    const totalResult = await hybridDB.queryPortal(
      `SELECT COUNT(*) as total FROM WebUsuario WHERE Rol = 'proveedor'`
    );

    // Por estatus portal
    const estatusResult = await hybridDB.queryPortal(`
      SELECT
        Estatus,
        COUNT(*) as cantidad
      FROM WebUsuario
      WHERE Rol = 'proveedor'
      GROUP BY Estatus
    `);

    // Con/sin mapeo
    const mapeoResult = await hybridDB.queryPortal(`
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM portal_proveedor_mapping ppm
            WHERE ppm.portal_user_id = wu.UsuarioWeb AND ppm.activo = 1
          ) THEN 'CON_MAPEO'
          ELSE 'SIN_MAPEO'
        END as tipoMapeo,
        COUNT(*) as cantidad
      FROM WebUsuario wu
      WHERE wu.Rol = 'proveedor'
      GROUP BY
        CASE
          WHEN EXISTS (
            SELECT 1 FROM portal_proveedor_mapping ppm
            WHERE ppm.portal_user_id = wu.UsuarioWeb AND ppm.activo = 1
          ) THEN 'CON_MAPEO'
          ELSE 'SIN_MAPEO'
        END
    `);

    // Por empresa
    const porEmpresaResult = await hybridDB.queryPortal(`
      SELECT
        ppm.empresa_code,
        COUNT(DISTINCT ppm.portal_user_id) as cantidad
      FROM portal_proveedor_mapping ppm
      WHERE ppm.activo = 1
      GROUP BY ppm.empresa_code
    `);

    // Registros recientes (últimos 7 días)
    const recientesResult = await hybridDB.queryPortal(`
      SELECT COUNT(*) as cantidad
      FROM WebUsuario
      WHERE Rol = 'proveedor'
        AND Alta >= DATEADD(DAY, -7, GETDATE())
    `);

    return {
      total: totalResult.recordset[0].total,
      porEstatus: estatusResult.recordset,
      conMapeo: mapeoResult.recordset.find((r: any) => r.tipoMapeo === 'CON_MAPEO')?.cantidad || 0,
      sinMapeo: mapeoResult.recordset.find((r: any) => r.tipoMapeo === 'SIN_MAPEO')?.cantidad || 0,
      porEmpresa: porEmpresaResult.recordset.map((r: any) => ({
        empresaCode: r.empresa_code,
        empresaName: getEmpresaName(r.empresa_code),
        cantidad: r.cantidad,
      })),
      registrosRecientes: recientesResult.recordset[0].cantidad,
    };

  } catch (error: any) {
    console.error('Error en getProveedoresStats:', error);
    throw error;
  }
}

/**
 * Helper: Obtiene el nombre amigable de una empresa
 */
function getEmpresaName(code: string): string {
  const map: Record<string, string> = {
    'la-cantera': 'La Cantera',
    'peralillo': 'Peralillo',
    'plaza-galerena': 'Plaza Galereña',
    'inmobiliaria-galerena': 'Inmobiliaria Galereña',
    'icrear': 'Icrear',
  };
  return map[code] || code;
}

// =============================================================================
// NUEVAS FUNCIONES CON STORED PROCEDURE spDatosProveedor
// =============================================================================

/**
 * Obtiene un proveedor específico usando el SP spDatosProveedor
 * Reemplaza la lógica anterior que hacia consultas directas
 */
export async function getProveedorConSP(params: {
  empresa: string;
  rfc?: string;
  nombre?: string;
  codigo?: string;
}): Promise<ProveedorERP | null> {
  console.log('[getProveedorConSP] RECIBIDO:', JSON.stringify(params, null, 2));
  const sp = getStoredProcedures();

  try {
    console.log('[getProveedorConSP] Consultando proveedor con SP:', params);

    const result = await sp.consultarProveedor({
      empresa: params.empresa,
      codigo: params.codigo || ''
    });

    if (result.success && result.data) {
      console.log(`[getProveedorConSP] Proveedor encontrado: ${result.data.Nombre}`);
      return result.data;
    }

    console.log('[getProveedorConSP] Proveedor no encontrado');
    return null;

  } catch (error: any) {
    console.error('[getProveedorConSP] Error:', error);
    throw new Error(`Error al consultar proveedor: ${error.message}`);
  }
}

/**
 * Lista proveedores usando el SP spDatosProveedor con diferentes criterios
 * Puede buscar por nombre parcial, RFC, etc.
 */
export async function listarProveedoresConSP(params: {
  empresa: string;
  busqueda?: string;
  limite?: number;
}): Promise<ProveedorERP[]> {
  const sp = getStoredProcedures();

  try {
    console.log('[listarProveedoresConSP] Listando proveedores:', params);

    // REGLA: Solo buscar por clave de proveedor
    if (params.busqueda) {
      const busqueda = params.busqueda.trim();

      const result = await sp.spDatosProveedor({
        empresa: params.empresa,
        operacion: 'C',
        cveProv: busqueda
      });

      if (result.success && Array.isArray(result.data)) {
        return result.data.slice(0, params.limite || 50);
      }
    }

    // Si no hay búsqueda específica, consultar todos (esto puede requerir ajustar el SP)
    const result = await sp.spDatosProveedor({
      empresa: params.empresa,
      operacion: 'C'
    });

    if (result.success && Array.isArray(result.data)) {
      return result.data.slice(0, params.limite || 100);
    }

    return [];

  } catch (error: any) {
    console.error('[listarProveedoresConSP] Error:', error);
    throw new Error(`Error al listar proveedores: ${error.message}`);
  }
}

/**
 * Crea un nuevo proveedor usando el SP spDatosProveedor
 */
export async function crearProveedorConSP(data: FormProveedorAdmin): Promise<SPProveedorResult> {
  const sp = getStoredProcedures();

  try {
    console.log('[crearProveedorConSP] Creando proveedor:', data.nombre);

    // Helper: Convertir null/undefined a cadena vacía para el SP
    const cleanValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value.trim();
      return String(value);
    };

    // Mapear datos del formulario a parámetros del SP
    const params: ProveedorSPParams = {
      empresa: data.empresa,
      operacion: 'A',
      nombre: cleanValue(data.nombre),
      nombreC: cleanValue(data.nombreCorto),
      rfcProv: cleanValue(data.rfc),
      curp: cleanValue(data.curp),
      regimen: cleanValue(data.regimen),
      direccion: cleanValue(data.direccion),
      numExt: cleanValue(data.numeroExterior),
      numInt: cleanValue(data.numeroInterior),
      entreCalles: cleanValue(data.entreCalles),
      colonia: cleanValue(data.colonia),
      poblacion: cleanValue(data.ciudad),
      estado: cleanValue(data.estado),
      pais: cleanValue(data.pais),
      codigoPostal: cleanValue(data.codigoPostal),
      contacto1: cleanValue(data.contactoPrincipal),
      contacto2: cleanValue(data.contactoSecundario),
      email1: cleanValue(data.email1),
      email2: cleanValue(data.email2),
      telefonos: cleanValue(data.telefonos),
      fax: cleanValue(data.fax),
      extension1: cleanValue(data.extension1),
      extension2: cleanValue(data.extension2),
      bancoSucursal: cleanValue(data.banco),
      cuenta: cleanValue(data.cuentaBancaria),
      beneficiario: data.beneficiario ?? 0,
      beneficiarioNombre: cleanValue(data.nombreBeneficiario),
      leyendaCheque: cleanValue(data.leyendaCheque)
    };

    const result = await sp.crearProveedor(params);

    if (result.success) {
      console.log('[crearProveedorConSP] Proveedor creado exitosamente');
    } else {
      console.error('[crearProveedorConSP] Error al crear proveedor:', result.error);
    }

    return result;

  } catch (error: any) {
    console.error('[crearProveedorConSP] Error:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Error desconocido al crear proveedor'
    };
  }
}

/**
 * Actualiza un proveedor existente usando el SP spDatosProveedor
 */
export async function actualizarProveedorConSP(data: FormProveedorAdmin): Promise<SPProveedorResult> {
  const sp = getStoredProcedures();

  try {
    console.log('[actualizarProveedorConSP] Iniciando actualización para:', data.nombre);

    /*
    // RESPALDO: ACTUALIZACIÓN DIRECTA (Por si el SP falla de nuevo)
    console.log('[actualizarProveedorConSP] 🔄 Usando actualización DIRECTA (bypass del SP)');
    const directResult = await actualizarProveedorDirecto(
      data.empresa,
      data.cveProv || '',
      data
    );
    if (directResult.success) {
      return { success: true, data: [], message: directResult.message };
    }
    */

    // Helper: Convertir null/undefined a cadena vacía para el SP
    const cleanValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value.trim();
      return String(value);
    };

    // Mapear datos del formulario a parámetros del SP
    const params: ProveedorSPParams = {
      empresa: data.empresa,
      operacion: 'M',
      cveProv: data.cveProv,
      rfc: '',        // Limpiar búsqueda
      proveedor: '',  // Limpiar búsqueda
      nombre: cleanValue(data.nombre),
      nombreC: cleanValue(data.nombreCorto),
      rfcProv: cleanValue(data.rfc),
      curp: cleanValue(data.curp),
      regimen: cleanValue(data.regimen),
      direccion: cleanValue(data.direccion),
      numExt: cleanValue(data.numeroExterior),
      numInt: cleanValue(data.numeroInterior),
      entreCalles: cleanValue(data.entreCalles),
      colonia: cleanValue(data.colonia),
      poblacion: cleanValue(data.ciudad),
      estado: cleanValue(data.estado),
      pais: cleanValue(data.pais),
      codigoPostal: cleanValue(data.codigoPostal),
      contacto1: cleanValue(data.contactoPrincipal),
      contacto2: cleanValue(data.contactoSecundario),
      email1: cleanValue(data.email1),
      email2: cleanValue(data.email2),
      telefonos: cleanValue(data.telefonos),
      fax: cleanValue(data.fax),
      extension1: cleanValue(data.extension1),
      extension2: cleanValue(data.extension2),
      bancoSucursal: cleanValue(data.banco),
      cuenta: cleanValue(data.cuentaBancaria),
      beneficiario: data.beneficiario ?? 0,
      beneficiarioNombre: cleanValue(data.nombreBeneficiario),
      leyendaCheque: cleanValue(data.leyendaCheque)
    };

    console.log('[actualizarProveedorConSP] Llamando a SP spDatosProveedor con Operacion M');
    const result = await sp.actualizarProveedor(params);

    if (result.success) {
      console.log('[actualizarProveedorConSP] ✅ Éxito con el Stored Procedure');
    } else {
      console.error('[actualizarProveedorConSP] ❌ Falló el SP:', result.error);
    }

    return result;

  } catch (error: any) {
    console.error('[actualizarProveedorConSP] ❌ Error crítico:', error);
    return {
      success: false,
      data: [],
      error: error.message || 'Error desconocido al actualizar proveedor'
    };
  }
}

/**
 * Valida los datos de un proveedor antes de crear/actualizar
 */
export function validarDatosProveedor(data: FormProveedorAdmin): { valido: boolean; errores: string[] } {
  const errores: string[] = [];

  // Validaciones obligatorias
  if (!data.nombre?.trim()) {
    errores.push('El nombre del proveedor es obligatorio');
  }

  if (!data.rfc?.trim()) {
    errores.push('El RFC es obligatorio');
  } else if (!/^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc)) {
    errores.push('El RFC no tiene el formato válido');
  }

  if (!data.empresa?.trim()) {
    errores.push('La empresa es obligatoria');
  }

  // Validaciones opcionales pero con formato
  if (data.email1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email1)) {
    errores.push('El email principal no tiene formato válido');
  }

  if (data.email2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email2)) {
    errores.push('El email secundario no tiene formato válido');
  }

  if (data.codigoPostal && !/^[0-9]{5}$/.test(data.codigoPostal)) {
    errores.push('El código postal debe tener 5 dígitos');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}

/**
 * Convierte datos del ERP al formato de formulario para edición
 */
export function erpAFormulario(erp: ProveedorERP, empresa: string): FormProveedorAdmin {
  return {
    nombre: erp.Nombre || '',
    nombreCorto: erp.NombreCorto || '',
    rfc: erp.RFC || '',
    curp: erp.CURP || '',
    regimen: erp.FiscalRegimen || '',
    direccion: erp.Direccion || '',
    numeroExterior: erp.DireccionNumero || '',
    numeroInterior: erp.DireccionNumeroInt || '',
    entreCalles: erp.EntreCalles || '',
    colonia: erp.Colonia || '',
    ciudad: erp.Poblacion || '',
    estado: erp.Estado || '',
    pais: erp.Pais || 'MÉXICO',
    codigoPostal: erp.CodigoPostal || '',
    contactoPrincipal: erp.Contacto1 || '',
    contactoSecundario: erp.Contacto2 || '',
    telefonos: erp.Telefonos || '',
    fax: erp.Fax || '',
    extension1: erp.Extencion1 || '',
    extension2: erp.Extencion2 || '',
    email1: erp.eMail1 || '',
    email2: erp.eMail2 || '',
    banco: erp.ProvBancoSucursal || '',
    cuentaBancaria: erp.ProvCuenta || '',
    beneficiario: erp.Beneficiario || 0,
    nombreBeneficiario: erp.BeneficiarioNombre || '',
    leyendaCheque: erp.LeyendaCheque || '',
    categoria: erp.Categoria || '',
    condicionPago: erp.Condicion || '',
    formaPago: erp.FormaPago || '',
    descuento: erp.Descuento || 0,
    empresa: empresa,
    activo: erp.Estatus === 'ALTA',
    cveProv: erp.Proveedor // Identificador para la actualización
  };
}