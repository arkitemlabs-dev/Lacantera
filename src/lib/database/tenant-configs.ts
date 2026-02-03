// src/lib/database/tenant-configs.ts
// Configuraciones de Tenants - Las 10 empresas (5 prod + 5 test)
//
// ARQUITECTURA:
// El backend SIEMPRE se conecta a UNA SOLA base de datos:
//   - Cantera         (producción)
//   - Cantera_Ajustes (pruebas)
//
// Los Stored Procedures reciben @Empresa y actúan como puente interno
// para afectar las tablas de la empresa correspondiente.
// El código NO cambia dinámicamente la BD ni usa USE otra_base.
//
// MAPEO INTERNO DE LOS SPs (no lo maneja el backend):
//   @Empresa='01' → La Cantera Desarrollos Mineros
//   @Empresa='02' → El Peralillo SA de CV
//   @Empresa='03' → Plaza Galereña
//   @Empresa='04' → Inmobiliaria Galereña
//   @Empresa='05' → Icrear
//   @Empresa='06' → La Cantera (test)
//   @Empresa='07' → Peralillo (test)
//   @Empresa='08' → Plaza Galereña (test)
//   @Empresa='09' → Inmobiliaria Galereña (test)
//   @Empresa='10' → Icrear (test)

/**
 * Todas las empresas disponibles (producción y pruebas).
 * La selección se hace desde el login.
 * Conexión única: Cantera (prod) o Cantera_Ajustes (test).
 * Los SPs redirigen internamente según @Empresa.
 */
export const TENANT_CONFIGS = {
  // ── PRODUCCIÓN (01-05) ── Todas conectan a BD 'Cantera'
  'la-cantera-prod': {
    id: 'la-cantera-prod',
    nombre: 'La Cantera Desarrollos Mineros',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'la-cantera',
    erpEmpresa: '01',
  },
  'peralillo-prod': {
    id: 'peralillo-prod',
    nombre: 'El Peralillo SA de CV',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'peralillo',
    erpEmpresa: '02',
  },
  'plaza-galerena-prod': {
    id: 'plaza-galerena-prod',
    nombre: 'Plaza Galereña',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'plaza-galerena',
    erpEmpresa: '03',
  },
  'inmobiliaria-galerena-prod': {
    id: 'inmobiliaria-galerena-prod',
    nombre: 'Inmobiliaria Galereña',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'inmobiliaria-galerena',
    erpEmpresa: '04',
  },
  'icrear-prod': {
    id: 'icrear-prod',
    nombre: 'Icrear',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'icrear',
    erpEmpresa: '05',
  },

  // ── PRUEBAS (06-10) ── Todas conectan a BD 'Cantera_Ajustes'
  'la-cantera-test': {
    id: 'la-cantera-test',
    nombre: 'La Cantera Desarrollos Mineros [TEST]',
    erpDatabase: 'Cantera_Ajustes',
    codigoEmpresa: 'la-cantera',
    erpEmpresa: '06',
  },
  'peralillo-test': {
    id: 'peralillo-test',
    nombre: 'El Peralillo SA de CV [TEST]',
    erpDatabase: 'Cantera_Ajustes',
    codigoEmpresa: 'peralillo',
    erpEmpresa: '07',
  },
  'plaza-galerena-test': {
    id: 'plaza-galerena-test',
    nombre: 'Plaza Galereña [TEST]',
    erpDatabase: 'Cantera_Ajustes',
    codigoEmpresa: 'plaza-galerena',
    erpEmpresa: '08',
  },
  'inmobiliaria-galerena-test': {
    id: 'inmobiliaria-galerena-test',
    nombre: 'Inmobiliaria Galereña [TEST]',
    erpDatabase: 'Cantera_Ajustes',
    codigoEmpresa: 'inmobiliaria-galerena',
    erpEmpresa: '09',
  },
  'icrear-test': {
    id: 'icrear-test',
    nombre: 'Icrear [TEST]',
    erpDatabase: 'Cantera_Ajustes',
    codigoEmpresa: 'icrear',
    erpEmpresa: '10',
  },
};

// Mantener compatibilidad con código existente que usa ACTIVE_TENANT_CONFIGS
export const ACTIVE_TENANT_CONFIGS = TENANT_CONFIGS;

// Aliases para compatibilidad
export const TENANT_CONFIGS_TEST = Object.fromEntries(
  Object.entries(TENANT_CONFIGS).filter(([key]) => key.endsWith('-test'))
);
export const TENANT_CONFIGS_PROD = Object.fromEntries(
  Object.entries(TENANT_CONFIGS).filter(([key]) => key.endsWith('-prod'))
);

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER CENTRALIZADAS (para evitar hardcoding en APIs)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el código de empresa ERP ('01', '02', etc.) desde un tenantId
 * @param tenantId - ID del tenant (ej: 'la-cantera-prod', 'la-cantera', 'peralillo-test')
 * @returns Código ERP ('01', '02', etc.) o null si no se encuentra
 */
export function getEmpresaERPFromTenant(tenantId: string | null | undefined): string | null {
  if (!tenantId) return null;

  // Buscar directamente en TENANT_CONFIGS
  const config = TENANT_CONFIGS[tenantId as keyof typeof TENANT_CONFIGS];
  if (config) {
    return config.erpEmpresa;
  }

  // Intentar buscar por codigoEmpresa (sin sufijo -prod/-test)
  // Esto permite usar 'la-cantera', 'peralillo', etc. directamente
  for (const tenant of Object.values(TENANT_CONFIGS)) {
    if (tenant.codigoEmpresa === tenantId) {
      return tenant.erpEmpresa;
    }
  }

  return null;
}

/**
 * Obtiene el nombre de la empresa desde un tenantId o codigoEmpresa
 * @param empresaCode - Código de empresa (ej: 'la-cantera', 'peralillo', 'la-cantera-prod')
 * @returns Nombre de la empresa o el código original si no se encuentra
 */
export function getNombreEmpresa(empresaCode: string | null | undefined): string {
  if (!empresaCode) return 'Desconocida';

  // Buscar directamente en TENANT_CONFIGS
  const config = TENANT_CONFIGS[empresaCode as keyof typeof TENANT_CONFIGS];
  if (config) {
    return config.nombre;
  }

  // Buscar por codigoEmpresa (sin sufijo)
  for (const tenant of Object.values(TENANT_CONFIGS)) {
    if (tenant.codigoEmpresa === empresaCode) {
      // Retornar versión limpia (sin [TEST])
      return tenant.nombre.replace(' [TEST]', '');
    }
  }

  // Mapeo directo para códigos simples (compatibilidad)
  const nombresSimples: Record<string, string> = {
    'la-cantera': 'La Cantera Desarrollos Mineros',
    'peralillo': 'El Peralillo SA de CV',
    'plaza-galerena': 'Plaza Galereña',
    'inmobiliaria-galerena': 'Inmobiliaria Galereña',
    'icrear': 'Icrear'
  };

  return nombresSimples[empresaCode] || empresaCode;
}

/**
 * Mapeo de código de empresa del portal a código del ERP
 * Soporta tanto tenantId completo como codigoEmpresa
 * @param empresaCode - Código del portal ('la-cantera', 'la-cantera-prod', etc.)
 * @returns Código ERP ('01', '02', etc.) o null si no hay mapeo
 */
export function getEmpresaCodeMapping(empresaCode: string | null | undefined): string | null {
  return getEmpresaERPFromTenant(empresaCode);
}

/**
 * Verifica si una empresa está configurada
 * @param empresaCode - Código de empresa a verificar
 * @returns true si la empresa existe en la configuración
 */
export function isValidEmpresa(empresaCode: string | null | undefined): boolean {
  if (!empresaCode) return false;

  // Verificar si existe como tenantId
  if (TENANT_CONFIGS[empresaCode as keyof typeof TENANT_CONFIGS]) {
    return true;
  }

  // Verificar si existe como codigoEmpresa
  for (const tenant of Object.values(TENANT_CONFIGS)) {
    if (tenant.codigoEmpresa === empresaCode) {
      return true;
    }
  }

  return false;
}

/**
 * Obtiene la configuración completa de un tenant
 * @param tenantId - ID del tenant
 * @returns Configuración del tenant o null si no existe
 */
export function getTenantConfig(tenantId: string | null | undefined) {
  if (!tenantId) return null;
  return TENANT_CONFIGS[tenantId as keyof typeof TENANT_CONFIGS] || null;
}
