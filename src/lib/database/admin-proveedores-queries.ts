// src/lib/database/admin-proveedores-queries.ts
// Queries para gestión de proveedores (Admin) - Combina Portal + ERP

import { hybridDB, getTenantConfig } from './multi-tenant-connection';

/**
 * Interface para proveedor con datos del portal y ERP
 */
export interface ProveedorCompleto {
  // Portal
  portalUserId: string;
  portalEmail: string;
  portalNombre: string;
  portalEstatus: string;
  portalFechaRegistro: Date;
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
  estatusPortal?: string;
  estatusERP?: string;
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
    estatusPortal,
    estatusERP,
    busqueda,
    page = 1,
    limit = 50,
  } = filtros;

  const offset = (page - 1) * limit;

  try {
    // 1. Obtener proveedores del portal con sus mapeos
    let portalQuery = `
      SELECT
        wu.UsuarioWeb as portalUserId,
        wu.eMail as portalEmail,
        wu.Nombre as portalNombre,
        wu.Estatus as portalEstatus,
        wu.Alta as portalFechaRegistro,
        wu.Rol as portalRol,
        wu.Telefono as portalTelefono,
        wu.Proveedor as portalProveedorRef
      FROM WebUsuario wu
      WHERE wu.Rol = 'proveedor'
    `;

    const portalParams: any = {};

    // Filtro por estatus portal
    if (estatusPortal) {
      portalQuery += ` AND wu.Estatus = @estatusPortal`;
      portalParams.estatusPortal = estatusPortal;
    }

    // Filtro por búsqueda
    if (busqueda) {
      portalQuery += ` AND (
        wu.Nombre LIKE @busqueda OR
        wu.eMail LIKE @busqueda OR
        wu.UsuarioWeb LIKE @busqueda
      )`;
      portalParams.busqueda = `%${busqueda}%`;
    }

    portalQuery += ` ORDER BY wu.Alta DESC`;

    const portalResult = await hybridDB.queryPortal(portalQuery, portalParams);

    if (portalResult.recordset.length === 0) {
      return {
        proveedores: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 2. Para cada proveedor, obtener sus mapeos y datos ERP
    const proveedores: ProveedorCompleto[] = [];

    for (const portalProv of portalResult.recordset) {
      // Obtener mapeos del proveedor
      const mapeoResult = await hybridDB.queryPortal(
        `
        SELECT
          empresa_code,
          erp_proveedor_code,
          activo
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND activo = 1
        `,
        { userId: portalProv.portalUserId }
      );

      const empresasAsignadas = mapeoResult.recordset.map((m: any) => ({
        empresaCode: m.empresa_code,
        empresaName: getEmpresaName(m.empresa_code),
        erpProveedorCode: m.erp_proveedor_code,
        mappingActivo: m.activo === 1,
      }));

      // Filtrar por empresa si se especificó
      if (empresaCode && !empresasAsignadas.some(e => e.empresaCode === empresaCode)) {
        continue; // Saltar este proveedor
      }

      // 3. Obtener datos del ERP (de la primera empresa asignada)
      let erpDatos: ProveedorCompleto['erpDatos'] = undefined;

      if (empresasAsignadas.length > 0) {
        const primeraEmpresa = empresasAsignadas[0];
        const tenantConfig = getTenantConfig(primeraEmpresa.empresaCode);

        try {
          const erpResult = await hybridDB.queryERP(
            primeraEmpresa.empresaCode,
            `
            SELECT TOP 1
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
              p.HorarioRevision,
              p.DiaPago1,
              p.DiaPago2,
              p.HorarioPago,
              p.Comprador,
              p.Agente,
              p.CentroCostos,
              p.DefMoneda
            FROM Prov p
            WHERE p.Proveedor = @proveedorCode
              AND p.Estatus = 'ALTA'
            `,
            { proveedorCode: primeraEmpresa.erpProveedorCode }
          );

          if (erpResult.recordset.length > 0) {
            const erp = erpResult.recordset[0];

            // Filtrar por estatus ERP si se especificó
            if (estatusERP && erp.Estatus !== estatusERP) {
              continue; // Saltar este proveedor
            }

            // Construir array de días de revisión
            const diasRevision: string[] = [];
            if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
            if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

            // Construir array de días de pago
            const diasPago: string[] = [];
            if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
            if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

            erpDatos = {
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
              estatus: erp.Estatus,
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
            };
          }
        } catch (erpError: any) {
          console.error(`Error obteniendo datos ERP para ${primeraEmpresa.erpProveedorCode}:`, erpError.message);
          // Continuar sin datos ERP
        }
      }

      proveedores.push({
        portalUserId: portalProv.portalUserId,
        portalEmail: portalProv.portalEmail,
        portalNombre: portalProv.portalNombre,
        portalEstatus: portalProv.portalEstatus,
        portalFechaRegistro: portalProv.portalFechaRegistro,
        portalRol: portalProv.portalRol,
        portalTelefono: portalProv.portalTelefono,
        empresasAsignadas,
        erpDatos,
      });
    }

    // Paginación
    const total = proveedores.length;
    const paginados = proveedores.slice(offset, offset + limit);

    return {
      proveedores: paginados,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

  } catch (error: any) {
    console.error('Error en getProveedoresConDatosERP:', error);
    throw error;
  }
}

/**
 * Obtiene un proveedor específico con todos sus datos
 */
export async function getProveedorCompleto(portalUserId: string) {
  const result = await getProveedoresConDatosERP({ limit: 1 });

  const proveedor = result.proveedores.find(p => p.portalUserId === portalUserId);

  if (!proveedor) {
    throw new Error('Proveedor no encontrado');
  }

  return proveedor;
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
