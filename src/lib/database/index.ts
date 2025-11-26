// src/lib/database/index.ts
// Export único para cambiar fácilmente de implementación

import { SqlServerPNetDatabase } from './sqlserver-pnet';

// AHORA: Usar SQL Server con tablas pNet existentes
export const database = new SqlServerPNetDatabase();

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