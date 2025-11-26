// src/lib/database/index.ts
// Export único para cambiar fácilmente de implementación

import { SqlServerDatabase } from './sqlserver';

// AHORA: Usar SQL Server
export const database = new SqlServerDatabase();

// Re-export types para conveniencia
export type {
  Database,
  ProveedorFilters,
  OrdenCompraFilters,
  FacturaFilters,
  CreateFacturaInput,
  CreateOrdenCompraInput,
  Empresa,
  UsuarioEmpresa,
} from './interface';