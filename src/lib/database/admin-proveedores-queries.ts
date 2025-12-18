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
    estatusPortal,
    busqueda,
    page = 1,
    limit = 50,
  } = filtros;

  const offset = (page - 1) * limit;

  console.log('[getProveedoresConDatosERP] Iniciando con filtros:', filtros);

  try {
    // 1. Construir consulta ERP con filtros
    let erpQuery = `
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
      FROM Prov p`;
    
    // SOLO permitir proveedores con estatus ALTA
    erpQuery += ` WHERE UPPER(p.Estatus) = 'ALTA'`;
    
    erpQuery += ` ORDER BY p.Nombre`;
    
    const erpResult = await hybridDB.queryERP('la-cantera', erpQuery);

    console.log(`[getProveedoresConDatosERP] Encontrados ${erpResult.recordset.length} proveedores en ERP`);

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
    const portalMapByRFC = new Map();
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
    
    for (const erpProv of erpResult.recordset) {
      // Filtro adicional: SOLO procesar proveedores con estatus ALTA
      if (!erpProv.Estatus || erpProv.Estatus.toUpperCase() !== 'ALTA') {
        continue;
      }
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

      const empresasAsignadas = [{
        empresaCode: 'la-cantera',
        empresaName: 'La Cantera',
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
    let proveedoresFiltrados = proveedores;
    
    if (busqueda) {
      const term = busqueda.toLowerCase();
      proveedoresFiltrados = proveedoresFiltrados.filter(p =>
        p.portalNombre.toLowerCase().includes(term) ||
        p.erpDatos?.rfc?.toLowerCase().includes(term) ||
        p.portalEmail.toLowerCase().includes(term) ||
        p.erpDatos?.proveedor?.toLowerCase().includes(term)
      );
    }

    // 6. Paginación
    const total = proveedoresFiltrados.length;
    const paginados = proveedoresFiltrados.slice(offset, offset + limit);
    console.log(`[getProveedoresConDatosERP] Total ERP: ${erpResult.recordset.length}, Total procesados: ${total}, devolviendo ${paginados.length}`);

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
  try {
    // Verificar si es un proveedor solo del ERP (no registrado en portal)
    if (portalUserId.startsWith('erp_')) {
      const codigoERP = portalUserId.replace('erp_', '');
      return await getProveedorSoloERP(codigoERP);
    }

    // Buscar específicamente el proveedor registrado en portal
    const portalResult = await hybridDB.queryPortal(
      `
      SELECT
        u.IDUsuario as portalUserId,
        u.eMail as portalEmail,
        u.Nombre as portalNombre,
        u.Estatus as portalEstatus,
        u.FechaRegistro as portalFechaRegistro,
        'proveedor' as portalRol,
        u.Telefono as portalTelefono,
        u.Usuario as portalProveedorRef
      FROM pNetUsuario u
      WHERE u.IDUsuario = @userId AND u.IDUsuarioTipo = 4
      `,
      { userId: parseInt(portalUserId) }
    );

    if (portalResult.recordset.length === 0) {
      throw new Error('Proveedor no encontrado');
    }

    const portalProv = portalResult.recordset[0];

    // Crear mapeo simple usando el código de proveedor
    const empresasAsignadas = portalProv.portalProveedorRef ? [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
      erpProveedorCode: portalProv.portalProveedorRef,
      mappingActivo: true,
    }] : [];

    // Obtener datos del ERP si hay mapeos
    let erpDatos: ProveedorCompleto['erpDatos'] = undefined;

    if (empresasAsignadas.length > 0) {
      const primeraEmpresa = empresasAsignadas[0];

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
          `,
          { proveedorCode: primeraEmpresa.erpProveedorCode }
        );

        if (erpResult.recordset.length > 0) {
          const erp = erpResult.recordset[0];

          const diasRevision: string[] = [];
          if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
          if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

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
          };
        }
      } catch (erpError: any) {
        console.error(`Error obteniendo datos ERP para ${primeraEmpresa.erpProveedorCode}:`, erpError.message);
      }
    }

    return {
      portalUserId: portalProv.portalUserId,
      portalEmail: portalProv.portalEmail,
      portalNombre: portalProv.portalNombre,
      portalEstatus: portalProv.portalEstatus,
      portalFechaRegistro: portalProv.portalFechaRegistro,
      portalRol: portalProv.portalRol,
      portalTelefono: portalProv.portalTelefono,
      empresasAsignadas,
      erpDatos,
    };

  } catch (error: any) {
    console.error('Error en getProveedorCompleto:', error);
    throw error;
  }
}

/**
 * Obtiene un proveedor por código ERP exacto desde la tabla Prov
 */
export async function getProveedorPorCodigoERP(codigoERP: string): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP('la-cantera', `
    SELECT
      p.Proveedor,
      p.Nombre,
      p.NombreCorto,
      p.RFC,
      p.CURP,
      p.Direccion,
      p.DireccionNumero,
      p.DireccionNumeroInt,
      p.EntreCalles,
      p.Colonia,
      p.Poblacion,
      p.Estado,
      p.Pais,
      p.CodigoPostal,
      p.Telefonos,
      p.Fax,
      p.Contacto1,
      p.Contacto2,
      p.Extencion1,
      p.Extencion2,
      p.eMail1,
      p.eMail2,
      p.Categoria,
      p.Familia,
      p.Descuento,
      p.Comprador,
      p.Condicion,
      p.FormaPago,
      p.DiaRevision1,
      p.DiaRevision2,
      p.HorarioRevision,
      p.DiaPago1,
      p.DiaPago2,
      p.HorarioPago,
      p.Beneficiario,
      p.BeneficiarioNombre,
      p.LeyendaCheque,
      p.Agente,
      p.Situacion,
      p.SituacionFecha,
      p.SituacionUsuario,
      p.SituacionNota,
      p.Estatus,
      p.UltimoCambio,
      p.Alta,
      p.Tipo,
      p.DefMoneda,
      p.ProvBancoSucursal,
      p.ProvCuenta,
      p.TieneMovimientos,
      p.CentroCostos,
      p.Cuenta,
      p.CuentaRetencion,
      p.FiscalRegimen,
      p.Comision,
      p.Importe1,
      p.Importe2
    FROM Prov p
    WHERE p.Proveedor = @codigoERP
  `, { codigoERP });

  if (erpResult.recordset.length === 0) {
    throw new Error(`Proveedor ${codigoERP} no encontrado`);
  }

  const erp = erpResult.recordset[0];

  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  return {
    portalUserId: `erp_${codigoERP}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO',
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefonos || '',
    empresasAsignadas: [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
      erpProveedorCode: erp.Proveedor,
      mappingActivo: true,
    }],
    erpDatos: {
      proveedor: erp.Proveedor,
      nombre: erp.Nombre,
      nombreCorto: erp.NombreCorto,
      rfc: erp.RFC,
      curp: erp.CURP,
      direccion: erp.Direccion,
      direccionNumero: erp.DireccionNumero,
      direccionNumeroInt: erp.DireccionNumeroInt,
      entreCalles: erp.EntreCalles,
      colonia: erp.Colonia,
      ciudad: erp.Poblacion,
      estado: erp.Estado,
      pais: erp.Pais,
      codigoPostal: erp.CodigoPostal,
      telefono: erp.Telefonos,
      fax: erp.Fax,
      contacto1: erp.Contacto1,
      contacto2: erp.Contacto2,
      extension1: erp.Extencion1,
      extension2: erp.Extencion2,
      email1: erp.eMail1,
      email2: erp.eMail2,
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
      cuentaContable: erp.Cuenta,
      cuentaRetencion: erp.CuentaRetencion,
      fiscalRegimen: erp.FiscalRegimen,
      comision: erp.Comision,
      importe1: erp.Importe1,
      importe2: erp.Importe2,
    },
  };
}

/**
 * Obtiene un proveedor por ID desde la tabla Prov
 */
export async function getProveedorPorID(id: string): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP('la-cantera', `
    SELECT
      p.Proveedor,
      p.Nombre,
      p.NombreCorto,
      p.RFC,
      p.CURP,
      p.Direccion,
      p.DireccionNumero,
      p.DireccionNumeroInt,
      p.EntreCalles,
      p.Colonia,
      p.Poblacion,
      p.Estado,
      p.Pais,
      p.CodigoPostal,
      p.Telefonos,
      p.Fax,
      p.Contacto1,
      p.Contacto2,
      p.Extencion1,
      p.Extencion2,
      p.eMail1,
      p.eMail2,
      p.Categoria,
      p.Familia,
      p.Descuento,
      p.Comprador,
      p.Condicion,
      p.FormaPago,
      p.DiaRevision1,
      p.DiaRevision2,
      p.HorarioRevision,
      p.DiaPago1,
      p.DiaPago2,
      p.HorarioPago,
      p.Beneficiario,
      p.BeneficiarioNombre,
      p.LeyendaCheque,
      p.Agente,
      p.Situacion,
      p.SituacionFecha,
      p.SituacionUsuario,
      p.SituacionNota,
      p.Estatus,
      p.UltimoCambio,
      p.Alta,
      p.Tipo,
      p.DefMoneda,
      p.ProvBancoSucursal,
      p.ProvCuenta,
      p.TieneMovimientos,
      p.CentroCostos,
      p.Cuenta,
      p.CuentaRetencion,
      p.FiscalRegimen,
      p.Comision,
      p.Importe1,
      p.Importe2
    FROM Prov p
    WHERE p.Proveedor = @id
  `, { id });

  if (erpResult.recordset.length === 0) {
    throw new Error('Proveedor no encontrado por ID');
  }

  const erp = erpResult.recordset[0];

  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  return {
    portalUserId: `id_${id}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO',
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefonos || '',
    empresasAsignadas: [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
      erpProveedorCode: erp.Proveedor,
      mappingActivo: true,
    }],
    erpDatos: {
      proveedor: erp.Proveedor,
      nombre: erp.Nombre,
      nombreCorto: erp.NombreCorto,
      rfc: erp.RFC,
      curp: erp.CURP,
      direccion: erp.Direccion,
      direccionNumero: erp.DireccionNumero,
      direccionNumeroInt: erp.DireccionNumeroInt,
      entreCalles: erp.EntreCalles,
      colonia: erp.Colonia,
      ciudad: erp.Poblacion,
      estado: erp.Estado,
      pais: erp.Pais,
      codigoPostal: erp.CodigoPostal,
      telefono: erp.Telefonos,
      fax: erp.Fax,
      contacto1: erp.Contacto1,
      contacto2: erp.Contacto2,
      extension1: erp.Extencion1,
      extension2: erp.Extencion2,
      email1: erp.eMail1,
      email2: erp.eMail2,
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
      cuentaContable: erp.Cuenta,
      cuentaRetencion: erp.CuentaRetencion,
      fiscalRegimen: erp.FiscalRegimen,
      comision: erp.Comision,
      importe1: erp.Importe1,
      importe2: erp.Importe2,
    },
  };
}

/**
 * Obtiene un proveedor por nombre o RFC desde la tabla Prov
 */
export async function getProveedorPorNombreORFC(busqueda: string): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP('la-cantera', `
    SELECT
      p.Proveedor,
      p.Nombre,
      p.NombreCorto,
      p.RFC,
      p.CURP,
      p.Direccion,
      p.DireccionNumero,
      p.DireccionNumeroInt,
      p.EntreCalles,
      p.Colonia,
      p.Poblacion,
      p.Estado,
      p.Pais,
      p.CodigoPostal,
      p.Telefonos,
      p.Fax,
      p.Contacto1,
      p.Contacto2,
      p.Extencion1,
      p.Extencion2,
      p.eMail1,
      p.eMail2,
      p.Categoria,
      p.Familia,
      p.Descuento,
      p.Comprador,
      p.Condicion,
      p.FormaPago,
      p.DiaRevision1,
      p.DiaRevision2,
      p.HorarioRevision,
      p.DiaPago1,
      p.DiaPago2,
      p.HorarioPago,
      p.Beneficiario,
      p.BeneficiarioNombre,
      p.LeyendaCheque,
      p.Agente,
      p.Situacion,
      p.SituacionFecha,
      p.SituacionUsuario,
      p.SituacionNota,
      p.Estatus,
      p.UltimoCambio,
      p.Alta,
      p.Tipo,
      p.DefMoneda,
      p.ProvBancoSucursal,
      p.ProvCuenta,
      p.TieneMovimientos,
      p.CentroCostos,
      p.Cuenta,
      p.CuentaRetencion,
      p.FiscalRegimen,
      p.Comision,
      p.Importe1,
      p.Importe2
    FROM Prov p
    WHERE p.Proveedor = @busqueda
       OR p.RFC = @busqueda 
       OR UPPER(p.Nombre) LIKE '%' + UPPER(@busqueda) + '%'
       OR UPPER(p.NombreCorto) LIKE '%' + UPPER(@busqueda) + '%'
    ORDER BY 
      CASE 
        WHEN p.Proveedor = @busqueda THEN 1
        WHEN p.RFC = @busqueda THEN 2
        WHEN UPPER(p.Nombre) = UPPER(@busqueda) THEN 3
        WHEN UPPER(p.Nombre) LIKE UPPER(@busqueda) + '%' THEN 4
        ELSE 5
      END
  `, { busqueda });

  if (erpResult.recordset.length === 0) {
    throw new Error('Proveedor no encontrado por nombre o RFC');
  }

  const erp = erpResult.recordset[0];

  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  return {
    portalUserId: `search_${busqueda}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO',
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefonos || '',
    empresasAsignadas: [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
      erpProveedorCode: erp.Proveedor,
      mappingActivo: true,
    }],
    erpDatos: {
      proveedor: erp.Proveedor,
      nombre: erp.Nombre,
      nombreCorto: erp.NombreCorto,
      rfc: erp.RFC,
      curp: erp.CURP,
      direccion: erp.Direccion,
      direccionNumero: erp.DireccionNumero,
      direccionNumeroInt: erp.DireccionNumeroInt,
      entreCalles: erp.EntreCalles,
      colonia: erp.Colonia,
      ciudad: erp.Poblacion,
      estado: erp.Estado,
      pais: erp.Pais,
      codigoPostal: erp.CodigoPostal,
      telefono: erp.Telefonos,
      fax: erp.Fax,
      contacto1: erp.Contacto1,
      contacto2: erp.Contacto2,
      extension1: erp.Extencion1,
      extension2: erp.Extencion2,
      email1: erp.eMail1,
      email2: erp.eMail2,
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
      cuentaContable: erp.Cuenta,
      cuentaRetencion: erp.CuentaRetencion,
      fiscalRegimen: erp.FiscalRegimen,
      comision: erp.Comision,
      importe1: erp.Importe1,
      importe2: erp.Importe2,
    },
  };
}

/**
 * Obtiene un proveedor por RFC desde la tabla Prov
 */
export async function getProveedorPorRFC(rfc: string): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP('la-cantera', `
    SELECT
      p.Proveedor,
      p.Nombre,
      p.NombreCorto,
      p.RFC,
      p.CURP,
      p.Direccion,
      p.DireccionNumero,
      p.DireccionNumeroInt,
      p.EntreCalles,
      p.Colonia,
      p.Poblacion,
      p.Estado,
      p.Pais,
      p.CodigoPostal,
      p.Telefonos,
      p.Fax,
      p.Contacto1,
      p.Contacto2,
      p.Extencion1,
      p.Extencion2,
      p.eMail1,
      p.eMail2,
      p.Categoria,
      p.Familia,
      p.Descuento,
      p.Comprador,
      p.Condicion,
      p.FormaPago,
      p.DiaRevision1,
      p.DiaRevision2,
      p.HorarioRevision,
      p.DiaPago1,
      p.DiaPago2,
      p.HorarioPago,
      p.Beneficiario,
      p.BeneficiarioNombre,
      p.LeyendaCheque,
      p.Agente,
      p.Situacion,
      p.SituacionFecha,
      p.SituacionUsuario,
      p.SituacionNota,
      p.Estatus,
      p.UltimoCambio,
      p.Alta,
      p.Tipo,
      p.DefMoneda,
      p.ProvBancoSucursal,
      p.ProvCuenta,
      p.TieneMovimientos,
      p.CentroCostos,
      p.Cuenta,
      p.CuentaRetencion,
      p.FiscalRegimen,
      p.Comision,
      p.Importe1,
      p.Importe2
    FROM Prov p
    WHERE p.RFC = @rfc
  `, { rfc });

  if (erpResult.recordset.length === 0) {
    throw new Error('Proveedor no encontrado por RFC');
  }

  const erp = erpResult.recordset[0];

  const diasRevision: string[] = [];
  if (erp.DiaRevision1) diasRevision.push(erp.DiaRevision1);
  if (erp.DiaRevision2) diasRevision.push(erp.DiaRevision2);

  const diasPago: string[] = [];
  if (erp.DiaPago1) diasPago.push(erp.DiaPago1);
  if (erp.DiaPago2) diasPago.push(erp.DiaPago2);

  return {
    portalUserId: `rfc_${rfc}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO',
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefono || '',
    empresasAsignadas: [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
      erpProveedorCode: erp.Proveedor,
      mappingActivo: true,
    }],
    erpDatos: {
      proveedor: erp.Proveedor,
      nombre: erp.Nombre,
      nombreCorto: erp.NombreCorto,
      rfc: erp.RFC,
      curp: erp.CURP,
      direccion: erp.Direccion,
      direccionNumero: erp.DireccionNumero,
      direccionNumeroInt: erp.DireccionNumeroInt,
      entreCalles: erp.EntreCalles,
      colonia: erp.Colonia,
      ciudad: erp.Poblacion,
      estado: erp.Estado,
      pais: erp.Pais,
      codigoPostal: erp.CodigoPostal,
      telefono: erp.Telefonos,
      fax: erp.Fax,
      contacto1: erp.Contacto1,
      contacto2: erp.Contacto2,
      extension1: erp.Extencion1,
      extension2: erp.Extencion2,
      email1: erp.eMail1,
      email2: erp.eMail2,
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
      cuentaContable: erp.Cuenta,
      cuentaRetencion: erp.CuentaRetencion,
      fiscalRegimen: erp.FiscalRegimen,
      comision: erp.Comision,
      importe1: erp.Importe1,
      importe2: erp.Importe2,
    },
  };
}

/**
 * Obtiene un proveedor que solo existe en el ERP (no registrado en portal)
 */
async function getProveedorSoloERP(codigoERP: string): Promise<ProveedorCompleto> {
  const erpResult = await hybridDB.queryERP('la-cantera', `
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

  return {
    portalUserId: `erp_${codigoERP}`,
    portalEmail: erp.eMail1 || '',
    portalNombre: erp.Nombre,
    portalEstatus: 'INACTIVO', // No registrado en portal
    portalFechaRegistro: null,
    portalRol: 'proveedor',
    portalTelefono: erp.Telefono || '',
    empresasAsignadas: [{
      empresaCode: 'la-cantera',
      empresaName: 'La Cantera',
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
