// src/lib/database/tenant-configs.ts
// Configuración de empresas ERP - Fuente de verdad para mapeo de BDs
// Principio Fundamental: Uso exclusivo de códigos numéricos (01-10)

export interface ERPDatabaseConfig {
  db: string;         // Nombre de la BD ERP
  empresa: string;    // Parámetro @Empresa para los SPs
  nombre: string;     // Nombre para UI
}

/**
 * Catálogo Oficial de Empresas
 * El sistema usa exclusivamente códigos numéricos de empresa (01–10).
 * No existen slugs en ninguna capa (BD, JWT, frontend, backend).
 */
export const ERP_DATABASES: Record<string, ERPDatabaseConfig> = {
  "01": { db: "Cantera", empresa: "01", nombre: "La Cantera Desarrollos Mineros" },
  "02": { db: "Peralillo", empresa: "01", nombre: "El Peralillo SA de CV" },
  "03": { db: "Galbd", empresa: "EMP02", nombre: "Plaza Galereña" },
  "04": { db: "Galbd", empresa: "EMP01", nombre: "Inmobiliaria Galereña" },
  "05": { db: "Icrear", empresa: "EMP03", nombre: "ICREAR" },

  "06": { db: "Cantera_ajustes", empresa: "01", nombre: "La Cantera (Test)" },
  "07": { db: "Peralillo_ajustes", empresa: "01", nombre: "Peralillo (Test)" },
  "08": { db: "Galbd_pruebas", empresa: "EMP02", nombre: "Plaza Galereña (Test)" },
  "09": { db: "Galbd_pruebas", empresa: "EMP01", nombre: "Inmobiliaria Galereña (Test)" },
  "10": { db: "Icrear_pruebas", empresa: "EMP03", nombre: "ICREAR (Test)" },
};

/**
 * Resuelve un código de empresa y valida su existencia.
 * @throws Error si el código no es válido
 */
export function validateEmpresaCode(code: string): string {
  if (!ERP_DATABASES[code]) {
    throw new Error(`Código de empresa no válido: ${code}. Use 01-10.`);
  }
  return code;
}

/**
 * Obtiene la configuración completa de ERP para un código numérico.
 */
export function getERPConfig(code: string | null | undefined): ERPDatabaseConfig | null {
  if (!code || !ERP_DATABASES[code]) return null;
  return ERP_DATABASES[code];
}

/**
 * Obtiene el código de empresa interno para SPs (@Empresa) desde el tenantId.
 */
export function getEmpresaERPFromTenant(tenantId: string | null | undefined): string | null {
  const config = getERPConfig(tenantId);
  return config ? config.empresa : null;
}

/**
 * Obtiene el nombre de la empresa para mostrar en UI.
 */
export function getNombreEmpresa(code: string | null | undefined): string {
  const config = getERPConfig(code);
  return config ? config.nombre : "Empresa Desconocida";
}

/**
 * Lista todas las empresas productivas (01-05).
 */
export function getEmpresasProduccion(): (ERPDatabaseConfig & { code: string })[] {
  return ["01", "02", "03", "04", "05"].map(code => ({
    code,
    ...ERP_DATABASES[code]
  }));
}

/**
 * Lista todas las empresas (01-10).
 */
export function getTodasLasEmpresas(): (ERPDatabaseConfig & { code: string })[] {
  return Object.entries(ERP_DATABASES).map(([code, config]) => ({
    code,
    ...config
  }));
}
