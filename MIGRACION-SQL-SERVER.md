# Migración de Firestore a SQL Server

Este documento describe la migración completa de Firebase/Firestore a SQL Server para el Portal de Proveedores de La Cantera.

## 📋 Resumen de Cambios

### ✅ Completado

1. **Script de creación de tablas SQL Server** - `database/setup-app-tables.sql`
2. **Implementación SqlServerDatabase** - `src/lib/database/sqlserver.ts`
3. **Actualización de base de datos principal** - `src/lib/database/index.ts`
4. **Eliminación de archivos de Firestore**:
   - ❌ `src/lib/database/firestore.ts` (eliminado)
   - ❌ `scripts/init-multiempresa.js` (eliminado)
   - ❌ `scripts/assign-users-arkitem.js` (eliminado)
   - ❌ `firebase.json` (eliminado)
   - ❌ `firestore.rules` (eliminado)

## 🗄️ Estructura de Base de Datos SQL Server

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (proveedores y administradores) |
| `empresas` | Empresas en el sistema multi-empresa |
| `usuarios_empresas` | Relación muchos a muchos usuario-empresa |
| `proveedores_documentacion` | Documentos legales de proveedores |
| `ordenes_compra` | Órdenes de compra |
| `facturas` | Facturas electrónicas (CFDIs) |
| `complementos_pago` | Complementos de pago (CFDIs tipo pago) |
| `comprobantes_pago` | Comprobantes de pago internos |
| `conversaciones` | Sistema de mensajería |
| `mensajes` | Mensajes individuales |
| `notificaciones` | Notificaciones del sistema |
| `sessions` | Sesiones de usuario |
| `verification_tokens` | Tokens de verificación de email |
| `password_reset_tokens` | Tokens de reseteo de contraseña |

## 🚀 Instrucciones de Migración

### 1. Configurar Variables de Entorno

Ya están configuradas en `.env.local`:

```env
# SQL Server
MSSQL_SERVER=10.11.1.4
MSSQL_DATABASE=PP
MSSQL_USER=sa_ediaz
MSSQL_PASSWORD=YX!Au4DJ{Yuz
MSSQL_ENCRYPT=true
MSSQL_TRUST_CERT=false
```

### 2. Crear las Tablas en SQL Server

Ejecuta el script SQL en tu instancia de SQL Server:

```bash
# Desde SQL Server Management Studio o Azure Data Studio
# Abre y ejecuta: database/setup-app-tables.sql
```

O desde línea de comandos:

```bash
sqlcmd -S 10.11.1.4 -U sa_ediaz -P "YX!Au4DJ{Yuz" -d PP -i database/setup-app-tables.sql
```

### 3. Probar la Conexión

```bash
node scripts/test-db-connection.js
```

### 4. Verificar que la Aplicación Usa SQL Server

El archivo `src/lib/database/index.ts` ya está configurado para usar SQL Server:

```typescript
import { SqlServerDatabase } from './sqlserver';
export const database = new SqlServerDatabase();
```

## 📊 Mapeo de Datos

### Firestore → SQL Server

| Firestore Collection | SQL Server Table |
|---------------------|------------------|
| `users` | `users` |
| `empresas` | `empresas` |
| `usuarioEmpresas` | `usuarios_empresas` |
| `proveedores_documentacion` | `proveedores_documentacion` |
| `ordenes_compra` | `ordenes_compra` |
| `facturas` | `facturas` |
| - | `complementos_pago` (nueva) |
| - | `comprobantes_pago` (nueva) |
| - | `conversaciones` (nueva) |
| - | `mensajes` (nueva) |
| - | `notificaciones` (nueva) |

### Cambios en Tipos de Datos

| Campo | Firestore | SQL Server |
|-------|-----------|------------|
| IDs | string | UNIQUEIDENTIFIER |
| Fechas | Timestamp | DATETIME2 |
| Booleanos | boolean | BIT |
| Texto | string | VARCHAR/NVARCHAR |
| Números | number | DECIMAL/INT |
| Objetos JSON | object | NVARCHAR(MAX) + JSON.parse/stringify |

## 🔧 Archivos que Necesitan Actualización

Los siguientes archivos todavía tienen referencias a Firebase/Firestore y necesitan ser actualizados para usar la nueva capa de datos:

### ⚠️ Archivos con Referencias a Firebase

1. **`src/hooks/useEmpresaData.ts`** - Hook personalizado que usa Firestore directamente
2. **`src/app/actions/archivos.ts`** - Acciones de archivos
3. **`src/app/actions/empresas.ts`** - Acciones de empresas
4. **`src/app/actions/get-empresas.ts`** - Obtener empresas
5. **`src/components/user-nav.tsx`** - Navegación de usuario
6. **`src/components/proveedores/add-supplier-form.tsx`** - Formulario de proveedores
7. **`src/app/test-storage/page.tsx`** - Página de pruebas
8. **`src/app/proveedores/registro/page.tsx`** - Registro de proveedores
9. **`src/app/admin/registro/page.tsx`** - Registro de administradores

### ✅ Solución Recomendada

Para estos archivos, deberías:

1. **Eliminar imports de Firebase**:
   ```typescript
   // ❌ ELIMINAR
   import { db } from '@/lib/firebase';
   import { collection, getDocs, ... } from 'firebase/firestore';
   ```

2. **Usar la capa de abstracción**:
   ```typescript
   // ✅ USAR
   import { database } from '@/lib/database';

   // Ejemplo
   const proveedores = await database.getProveedores();
   const empresa = await database.getEmpresa(id);
   ```

## 🗑️ Archivos/Carpetas para Eliminar

Puedes eliminar estos archivos ya que no se usan más:

- [ ] `src/lib/firebase.ts` (si existe)
- [ ] `functions/` (carpeta completa de Firebase Functions)
- [ ] `firebase.json.backup`
- [ ] `firestore-debug.log`
- [ ] `MULTIEMPRESA_SETUP.md` (obsoleto, usar este documento)
- [ ] `SOLUCION_CREDENCIALES.md` (relacionado con Firebase)

## 🎯 Próximos Pasos

### 1. Migrar Datos Existentes (si los hay)

Si tienes datos en Firestore que necesitas migrar a SQL Server:

```typescript
// Script de migración (crear en scripts/migrate-from-firestore.ts)
// 1. Conectar a Firestore
// 2. Leer todos los documentos
// 3. Transformar a formato SQL Server
// 4. Insertar en SQL Server usando la clase SqlServerDatabase
```

### 2. Actualizar Archivos Restantes

Actualiza los archivos listados arriba para usar `database` en lugar de acceso directo a Firestore.

### 3. Implementar Funcionalidades Pendientes

Las siguientes entidades tienen stubs (métodos vacíos) que necesitan implementación:

- [ ] `ComplementoPago` - Complementos de pago
- [ ] `ComprobantePago` - Comprobantes de pago
- [ ] `Conversacion` - Sistema de mensajería
- [ ] `Mensaje` - Mensajes
- [ ] `Notificacion` - Notificaciones

### 4. Testing

Prueba las operaciones principales:

```bash
# Probar conexión
node scripts/test-db-connection.js

# Probar CRUD de usuarios
# Probar CRUD de empresas
# Probar CRUD de órdenes de compra
# Probar CRUD de facturas
```

### 5. Optimización

- [ ] Agregar índices adicionales según necesidad
- [ ] Implementar cache (Redis) para consultas frecuentes
- [ ] Configurar backups automáticos de SQL Server
- [ ] Configurar job de limpieza de tokens expirados:
  ```sql
  -- Ejecutar diariamente
  EXEC sp_cleanup_expired_tokens;
  ```

## 📝 Notas Importantes

### Diferencias Clave

1. **IDs**: SQL Server usa UUIDs (`UNIQUEIDENTIFIER`) vs strings de Firestore
2. **Transacciones**: SQL Server tiene transacciones ACID nativas
3. **Relaciones**: SQL Server tiene foreign keys y constraints
4. **Queries**: SQL Server permite joins complejos vs queries limitadas de Firestore
5. **Offline**: No hay modo offline como en Firestore (requiere conexión a SQL Server)

### Ventajas de SQL Server

✅ Transacciones ACID completas
✅ Joins y queries complejas
✅ Stored procedures y triggers
✅ Mejor para reportes y analytics
✅ Integración directa con Intelisis
✅ No hay límites de 500 documentos por query
✅ Índices personalizados
✅ Mejor control de permisos

### Consideraciones

⚠️ Requiere servidor SQL Server accesible
⚠️ Más complejo de escalar horizontalmente
⚠️ Requiere manejo de pool de conexiones
⚠️ No hay actualizaciones en tiempo real (como Firestore realtime)

## 🔐 Seguridad

- Las credenciales de SQL Server están en `.env.local` (no commitear)
- Usar `MSSQL_ENCRYPT=true` en producción
- Implementar row-level security si es necesario
- Auditar accesos con tablas de logs
- Backup diario de la base de datos

## 📚 Recursos

- [Documentación mssql para Node.js](https://www.npmjs.com/package/mssql)
- [SQL Server en Azure](https://azure.microsoft.com/en-us/products/azure-sql/database/)
- [Best Practices SQL Server](https://docs.microsoft.com/en-us/sql/relational-databases/security/security-best-practices)

## ✅ Checklist de Migración

- [x] Crear script SQL de tablas
- [x] Implementar SqlServerDatabase class
- [x] Actualizar index.ts para usar SQL Server
- [x] Eliminar archivos de Firestore
- [x] Configurar variables de entorno
- [ ] Ejecutar script SQL en servidor
- [ ] Probar conexión
- [ ] Actualizar archivos que usan Firebase
- [ ] Migrar datos existentes (si aplica)
- [ ] Implementar funcionalidades pendientes
- [ ] Testing completo
- [ ] Configurar backups
- [ ] Documentar nuevos procedimientos

---

**Fecha de migración**: 2025-11-26
**Migrado por**: Claude AI
**Estado**: ✅ Base de datos lista para usar
