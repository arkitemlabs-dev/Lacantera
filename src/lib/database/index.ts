// src/lib/database/index.ts
// Export único para cambiar fácilmente de implementación

import { FirestoreDatabase } from './firestore';
// import { PostgresDatabase } from './postgres'; // ← Futuro
// import { SupabaseDatabase } from './supabase'; // ← Futuro

// HOY: Usar Firestore
export const database = new FirestoreDatabase();

// MAÑANA: Solo cambias esta línea:
// export const database = new PostgresDatabase();
// export const database = new SupabaseDatabase();

// Re-export types para conveniencia
export type {
  Database,
  ProveedorFilters,
  OrdenCompraFilters,
  FacturaFilters,
  CreateFacturaInput,
  CreateOrdenCompraInput,
} from './interface';