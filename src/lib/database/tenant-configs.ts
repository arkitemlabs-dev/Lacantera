// src/lib/database/tenant-configs.ts
// Configuraciones de Tenants - Las 10 empresas (5 prod + 5 test)
// ARQUITECTURA: Una sola conexión al servidor a través de la BD 'Cantera'.
// Los SPs usan el código de empresa (@Empresa) para redirigir a la BD correcta.
//
// MAPEO DE EMPRESAS (definido por el equipo de BD):
//
// PRODUCCIÓN (01-05):
//   01 → BD Cantera,     Empresa='01'    → La Cantera Desarrollos Mineros
//   02 → BD Peralillo,   Empresa='01'    → El Peralillo SA de CV
//   03 → BD Galbd,       Empresa='EMP02' → Plaza Galereña
//   04 → BD Galbd,       Empresa='EMP01' → Inmobiliaria Galereña
//   05 → BD Icrear,      Empresa='EMP03' → Icrear
//
// PRUEBAS (06-10):
//   06 → BD Cantera_Ajustes,    Empresa='01'    → La Cantera Desarrollos Mineros
//   07 → BD Peralillo_Ajustes,  Empresa='01'    → El Peralillo SA de CV
//   08 → BD Galbd_Pruebas,      Empresa='EMP02' → Plaza Galereña
//   09 → BD Galbd_Pruebas,      Empresa='EMP01' → Inmobiliaria Galereña
//   10 → BD Icrear_Pruebas,     Empresa='EMP03' → Icrear

/**
 * Todas las empresas disponibles (producción y pruebas).
 * La selección se hace desde el login.
 * Conexión única a BD Cantera. Los SPs redirigen según el código.
 */
export const TENANT_CONFIGS = {
  // ── PRODUCCIÓN (01-05) ──
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

  // ── PRUEBAS (06-10) ──
  'la-cantera-test': {
    id: 'la-cantera-test',
    nombre: 'La Cantera Desarrollos Mineros [TEST]',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'la-cantera',
    erpEmpresa: '06',
  },
  'peralillo-test': {
    id: 'peralillo-test',
    nombre: 'El Peralillo SA de CV [TEST]',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'peralillo',
    erpEmpresa: '07',
  },
  'plaza-galerena-test': {
    id: 'plaza-galerena-test',
    nombre: 'Plaza Galereña [TEST]',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'plaza-galerena',
    erpEmpresa: '08',
  },
  'inmobiliaria-galerena-test': {
    id: 'inmobiliaria-galerena-test',
    nombre: 'Inmobiliaria Galereña [TEST]',
    erpDatabase: 'Cantera',
    codigoEmpresa: 'inmobiliaria-galerena',
    erpEmpresa: '09',
  },
  'icrear-test': {
    id: 'icrear-test',
    nombre: 'Icrear [TEST]',
    erpDatabase: 'Cantera',
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
