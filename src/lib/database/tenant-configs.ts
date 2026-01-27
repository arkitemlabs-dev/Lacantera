// src/lib/database/tenant-configs.ts
// Configuraciones de Tenants - TEST vs PROD

/**
 * Configuraciones para BASES DE PRUEBA
 */
export const TENANT_CONFIGS_TEST = {
  'la-cantera': {
    id: 'la-cantera',
    nombre: 'La Cantera Desarrollos Mineros [TEST]',
    erpDatabase: 'Cantera_Ajustes',  // ✅ BD de PRUEBA
    codigoEmpresa: 'la-cantera',
    erpEmpresa: '06',
  },
  'peralillo': {
    id: 'peralillo',
    nombre: 'Peralillo S.A de C.V [TEST]',
    erpDatabase: 'Peralillo_Ajustes',  // ✅ BD de PRUEBA
    codigoEmpresa: 'peralillo',
    erpEmpresa: '07',
  },
  'plaza-galerena': {
    id: 'plaza-galerena',
    nombre: 'Plaza Galereña [TEST]',
    erpDatabase: 'GALBD_PRUEBAS',  // ✅ BD de PRUEBA
    codigoEmpresa: 'plaza-galerena',
    erpEmpresa: '03',
  },
  'icrear': {
    id: 'icrear',
    nombre: 'Icrear [TEST]',
    erpDatabase: 'ICREAR_PRUEBAS',  // ✅ BD de PRUEBA
    codigoEmpresa: 'icrear',
    erpEmpresa: '05',
  },
  'inmobiliaria-galerena': {
    id: 'inmobiliaria-galerena',
    nombre: 'Inmobiliaria Galereña [TEST]',
    erpDatabase: 'GALBD_PRUEBAS',  // ✅ BD de PRUEBA
    codigoEmpresa: 'inmobiliaria-galerena',
    erpEmpresa: '04',
  },
};

/**
 * Configuraciones para BASES DE PRODUCCIÓN (si alguna vez las usas)
 */
export const TENANT_CONFIGS_PROD = {
  'la-cantera': {
    id: 'la-cantera',
    nombre: 'La Cantera Desarrollos Mineros [PROD]',
    erpDatabase: 'Cantera',  // BD PROD
    codigoEmpresa: 'la-cantera',
    erpEmpresa: '01',
  },
  'peralillo': {
    id: 'peralillo',
    nombre: 'Peralillo S.A de C.V [PROD]',
    erpDatabase: 'Peralillo_Ajustes',  // BD PROD
    codigoEmpresa: 'peralillo',
    erpEmpresa: '02',
  },
  'plaza-galerena': {
    id: 'plaza-galerena',
    nombre: 'Plaza Galereña [PROD]',
    erpDatabase: 'GALBD_PRUEBAS',  // BD PROD
    codigoEmpresa: 'plaza-galerena',
    erpEmpresa: '03',
  },
  'icrear': {
    id: 'icrear',
    nombre: 'Icrear [PROD]',
    erpDatabase: 'ICREAR_PRUEBAS',  // BD PROD
    codigoEmpresa: 'icrear',
    erpEmpresa: '05',
  },
  'inmobiliaria-galerena': {
    id: 'inmobiliaria-galerena',
    nombre: 'Inmobiliaria Galereña [PROD]',
    erpDatabase: 'GALBD_PRUEBAS',  // BD PROD
    codigoEmpresa: 'inmobiliaria-galerena',
    erpEmpresa: '04',
  },
};

/**
 * Selecciona qué configuración usar
 * Por defecto: TEST
 * Para cambiar a PROD: establecer USE_PROD_DB=true en .env
 */
export const ACTIVE_TENANT_CONFIGS =
  process.env.USE_PROD_DB === 'true'
    ? TENANT_CONFIGS_PROD
    : TENANT_CONFIGS_TEST;

console.log(`[TENANT-CONFIG] Usando: ${process.env.USE_PROD_DB === 'true' ? 'PRODUCCIÓN ⚠️' : 'PRUEBA ✅'}`);