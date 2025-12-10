# Arquitectura Multi-Tenant - Portal de Proveedores

## 📋 Resumen Ejecutivo

Este documento describe la implementación de la arquitectura multi-tenant para el Portal de Proveedores del grupo La Cantera, que permite a ~1900 proveedores acceder a sus datos específicos por empresa.

---

## 🏗️ Tipo de Arquitectura

### Patrón Implementado: **Shared Database with Discriminator**

**Características:**
- ✅ Una única base de datos (PP)
- ✅ Discriminación por columna `Empresa` en cada tabla
- ✅ Filtros de seguridad a nivel de aplicación
- ✅ Menor complejidad de infraestructura
- ⚠️ Requiere cuidado en queries para evitar fugas de datos

### Comparación con otros patrones:

| Aspecto | Database-per-Tenant | Shared Database (Actual) |
|---------|-------------------|-------------------------|
| **Aislamiento** | Alto (BD separadas) | Medio (columna discriminadora) |
| **Seguridad** | Alto | Medio-Alto (con validación) |
| **Costos** | Alto | Bajo |
| **Complejidad** | Alta (múltiples conexiones) | Media (single pool) |
| **Escalabilidad** | Horizontal | Vertical |
| **Backup/Restore** | Por tenant | Global |

---

## 🗄️ Estructura de Datos

### 1. Tabla de Empresas
```sql
Empresa
├── Empresa (VARCHAR(5) PK)     -- Código: LCDM, PERA, PLAZ, etc.
├── Nombre                       -- Razón social
└── [otros campos...]
```

**Empresas del grupo:**
- `LCDM` - La Cantera Desarrollos Mineros
- `PERA` - Peralillo S.A de C.V
- `PLAZ` - Plaza Galereña
- `ICRE` - Icrear
- `INMO` - Inmobiliaria Galereña

### 2. Usuarios y Relación con Empresas

```sql
pNetUsuario
├── IDUsuario (PK)
├── Usuario (VARCHAR)       -- Clave de proveedor
├── eMail
├── Nombre
├── IDUsuarioTipo          -- 4 = Proveedor
├── Empresa               -- Empresa predeterminada
└── Estatus

pNetUsuarioEmpresa
├── IDUsuarioEmpresa (PK)
├── IDUsuario (FK)        -- Usuario del portal
└── Empresa (FK)          -- Empresa a la que tiene acceso
```

### 3. Datos con Discriminador de Empresa

**Todas las tablas de negocio incluyen el campo `Empresa`:**

```sql
-- Proveedores
Prov
├── Proveedor (PK)
├── Empresa              ⭐ Discriminador
└── [datos del proveedor...]

-- Órdenes de Compra
Compra / wProvOrdCompra
├── ID
├── Empresa              ⭐ Discriminador
├── Proveedor
└── [datos de la orden...]

-- Facturas
DocumentacionXML / wProvAnexarCFDI
├── ID
├── Empresa              ⭐ Discriminador
├── Proveedor
└── [datos de la factura...]
```

---

## 🔄 Flujo de Autenticación Multi-Tenant

### Flujo Completo:

```
┌─────────────────────────────────────────────────────────┐
│ 1. LOGIN - Pantalla Inicial                            │
│    [Email] [Password] [Tipo Usuario ▼] [Entrar]       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. VALIDACIÓN - Backend (NextAuth)                     │
│    ✓ Buscar en pNetUsuario por email                   │
│    ✓ Validar password (bcrypt)                         │
│    ✓ Verificar IDUsuarioTipo = 4 (Proveedor)          │
│    ✓ Verificar Estatus = 'ACTIVO'                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CONSULTA EMPRESAS - Query                           │
│    SELECT e.Empresa, e.Nombre                          │
│    FROM pNetUsuarioEmpresa ue                          │
│    INNER JOIN Empresa e ON ue.Empresa = e.Empresa     │
│    WHERE ue.IDUsuario = @userId                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. SELECTOR DE EMPRESA (si > 1 empresa)                │
│    Seleccione la empresa:                              │
│    ○ La Cantera Desarrollos Mineros (LCDM)            │
│    ○ Peralillo S.A de C.V (PERA)                      │
│    ○ Plaza Galereña (PLAZ)                            │
│    [Continuar]                                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. JWT CON CONTEXTO DE EMPRESA                         │
│    {                                                    │
│      "id": "123",                                      │
│      "email": "proveedor@example.com",                 │
│      "role": "proveedor",                              │
│      "proveedor": "PROV001",                           │
│      "empresaActual": "LCDM", ⭐ Tenant Context        │
│      "empresasDisponibles": ["LCDM", "PERA"]          │
│    }                                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. TODAS LAS QUERIES INCLUYEN FILTRO                   │
│    SELECT * FROM Compra                                │
│    WHERE Proveedor = @proveedor                        │
│      AND Empresa = @empresaActual  ⭐                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Implementación de Seguridad

### 1. Middleware de Tenant Context

**Propósito:** Inyectar automáticamente el filtro de empresa en todas las queries

```typescript
// Middleware que valida empresa en cada request
export async function tenantMiddleware(req, res, next) {
  const session = await getSession(req);

  if (!session?.user?.empresaActual) {
    return res.status(403).json({ error: 'No tenant context' });
  }

  // Validar que el usuario tiene acceso a la empresa
  const hasAccess = await validateTenantAccess(
    session.user.id,
    session.user.empresaActual
  );

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied to tenant' });
  }

  // Inyectar contexto en request
  req.tenant = {
    empresa: session.user.empresaActual,
    proveedor: session.user.proveedor,
    userId: session.user.id
  };

  next();
}
```

### 2. Database Wrapper con Tenant Context

**Propósito:** Asegurar que TODAS las queries incluyen filtro de empresa

```typescript
class TenantAwareDatabase {
  constructor(private tenantContext: TenantContext) {}

  async query(sql: string, params: any[]) {
    // Automáticamente agregar filtro de empresa
    // Solo para queries de proveedores
    if (this.tenantContext.role === 'proveedor') {
      // Validar que la query incluye filtro de empresa
      if (!this.hasEmpresaFilter(sql)) {
        throw new Error('Query must include Empresa filter');
      }
    }

    return pool.query(sql, [
      ...params,
      this.tenantContext.empresa
    ]);
  }

  private hasEmpresaFilter(sql: string): boolean {
    return /WHERE.*Empresa\s*=/.test(sql);
  }
}
```

### 3. Validaciones Críticas

```typescript
// ✅ CORRECTO - Con filtro de empresa
const ordenes = await pool.query(`
  SELECT * FROM Compra
  WHERE Proveedor = @proveedor
    AND Empresa = @empresa
`, {
  proveedor: session.user.proveedor,
  empresa: session.user.empresaActual
});

// ❌ INCORRECTO - Sin filtro de empresa (data leak!)
const ordenes = await pool.query(`
  SELECT * FROM Compra
  WHERE Proveedor = @proveedor
`, {
  proveedor: session.user.proveedor
});
```

---

## 🎯 Gestión de Conexiones

### Pool de Conexiones Único

Como usas **una sola base de datos**, no necesitas múltiples pools:

```typescript
// src/lib/database/tenant-connection.ts

import sql from 'mssql';

const config: sql.config = {
  server: process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!, // Siempre "PP"
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 20,      // Pool más grande para múltiples empresas
    min: 5,       // Conexiones mínimas siempre disponibles
    idleTimeoutMillis: 30000,
  },
};

let sharedPool: sql.ConnectionPool | null = null;

export async function getConnectionPool() {
  if (!sharedPool) {
    sharedPool = new sql.ConnectionPool(config);
    await sharedPool.connect();
  }
  return sharedPool;
}

// NO necesitas pools por empresa, solo el contexto
export interface TenantContext {
  empresa: string;      // 'LCDM', 'PERA', etc.
  proveedor: string;    // Código del proveedor
  userId: number;       // ID del usuario
  role: string;         // 'proveedor', 'admin', etc.
}
```

**Ventajas:**
- ✅ Un solo pool para todas las empresas
- ✅ Mejor utilización de recursos
- ✅ Más simple de mantener
- ✅ Menos overhead de conexiones

---

## 🛠️ Componentes de la Arquitectura

### 1. Tenant Context Provider (Frontend)

```typescript
// src/contexts/TenantContext.tsx
import { createContext, useContext, useState } from 'react';

interface TenantContextType {
  empresaActual: string | null;
  empresasDisponibles: Array<{ codigo: string; nombre: string }>;
  cambiarEmpresa: (codigo: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }) {
  const [empresaActual, setEmpresaActual] = useState<string | null>(null);
  const [empresasDisponibles, setEmpresasDisponibles] = useState([]);

  const cambiarEmpresa = async (codigo: string) => {
    // Validar acceso
    const hasAccess = empresasDisponibles.some(e => e.codigo === codigo);
    if (!hasAccess) {
      throw new Error('No tiene acceso a esta empresa');
    }

    // Actualizar sesión en backend
    await fetch('/api/tenant/switch', {
      method: 'POST',
      body: JSON.stringify({ empresa: codigo })
    });

    setEmpresaActual(codigo);

    // Recargar datos
    window.location.reload();
  };

  return (
    <TenantContext.Provider value={{
      empresaActual,
      empresasDisponibles,
      cambiarEmpresa
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext)!;
```

### 2. API Route con Tenant Context

```typescript
// src/app/api/ordenes-compra/route.ts
import { getSession } from '@/lib/auth';
import { getTenantConnection } from '@/lib/database/tenant-connection';

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { empresaActual, proveedor } = session.user;

  if (!empresaActual) {
    return Response.json({ error: 'No tenant selected' }, { status: 400 });
  }

  // Obtener conexión con contexto
  const db = await getTenantConnection({
    empresa: empresaActual,
    proveedor: proveedor,
    userId: session.user.id,
    role: session.user.role
  });

  // Query con filtro automático de empresa
  const ordenes = await db.query(`
    SELECT
      c.ID,
      c.Mov,
      c.MovID,
      c.Fecha,
      c.Importe,
      c.Estatus
    FROM Compra c
    WHERE c.Proveedor = @proveedor
      AND c.Empresa = @empresa
    ORDER BY c.Fecha DESC
  `, {
    proveedor,
    empresa: empresaActual
  });

  return Response.json(ordenes);
}
```

---

## 🚨 Casos de Manejo de Errores

### 1. Usuario selecciona empresa incorrecta

```typescript
async function validateTenantAccess(userId: number, empresaCodigo: string) {
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM pNetUsuarioEmpresa
    WHERE IDUsuario = @userId
      AND Empresa = @empresaCodigo
  `, { userId, empresaCodigo });

  return result.recordset[0].count > 0;
}

// En middleware:
if (!await validateTenantAccess(user.id, user.empresaActual)) {
  return Response.json({
    error: 'No tiene acceso a esta empresa',
    code: 'TENANT_ACCESS_DENIED'
  }, { status: 403 });
}
```

### 2. Empresa no disponible / BD caída

```typescript
async function checkEmpresaAvailability(empresaCodigo: string) {
  try {
    const result = await pool.query(`
      SELECT Estatus FROM Empresa WHERE Empresa = @empresaCodigo
    `, { empresaCodigo });

    if (result.recordset.length === 0) {
      return { available: false, reason: 'EMPRESA_NOT_FOUND' };
    }

    const estatus = result.recordset[0].Estatus;
    if (estatus !== 'ACTIVA') {
      return { available: false, reason: 'EMPRESA_INACTIVE' };
    }

    return { available: true };
  } catch (error) {
    return { available: false, reason: 'DATABASE_ERROR' };
  }
}

// Fallback en frontend:
if (!empresaAvailable) {
  return (
    <div className="error">
      <h2>Empresa no disponible temporalmente</h2>
      <p>Por favor, intente con otra empresa o contacte soporte.</p>
      <Button onClick={() => cambiarEmpresa(empresaFallback)}>
        Cambiar a {empresaFallback}
      </Button>
    </div>
  );
}
```

### 3. Proveedor sin empresas asignadas

```typescript
async function getUsuarioEmpresas(userId: number) {
  const result = await pool.query(`
    SELECT
      e.Empresa,
      e.Nombre,
      e.Estatus
    FROM pNetUsuarioEmpresa ue
    INNER JOIN Empresa e ON ue.Empresa = e.Empresa
    WHERE ue.IDUsuario = @userId
      AND e.Estatus = 'ACTIVA'
  `, { userId });

  if (result.recordset.length === 0) {
    throw new Error('NO_EMPRESAS_ASIGNADAS');
  }

  return result.recordset;
}

// En login:
try {
  const empresas = await getUsuarioEmpresas(user.IDUsuario);
  // ...continuar con login
} catch (error) {
  if (error.message === 'NO_EMPRESAS_ASIGNADAS') {
    return (
      <div>
        <h2>Cuenta sin empresas asignadas</h2>
        <p>Contacte al administrador para asignarle acceso.</p>
      </div>
    );
  }
}
```

---

## 📊 Estructura de JWT

### Token con contexto de tenant:

```typescript
interface JWTPayload {
  // Identificación
  id: string;                    // IDUsuario
  email: string;                 // eMail
  name: string;                  // Nombre

  // Rol y tipo
  role: 'admin' | 'proveedor';   // Rol en sistema
  userType: string;              // Tipo de pNetUsuarioTipo

  // Contexto de proveedor
  proveedor: string;             // Código del proveedor (Usuario)

  // ⭐ TENANT CONTEXT
  empresaActual: string;         // Empresa seleccionada actual
  empresasDisponibles: string[]; // Empresas a las que tiene acceso

  // Metadata
  iat: number;                   // Issued at
  exp: number;                   // Expiration
}

// Ejemplo de token:
{
  "id": "123",
  "email": "proveedor@example.com",
  "name": "Proveedor ABC",
  "role": "proveedor",
  "userType": "Proveedor",
  "proveedor": "PROV001",
  "empresaActual": "LCDM",
  "empresasDisponibles": ["LCDM", "PERA", "PLAZ"],
  "iat": 1735689600,
  "exp": 1738281600
}
```

---

## 🎨 UI Components

### Selector de Empresa (Header)

```tsx
// src/components/TenantSelector.tsx
import { useTenant } from '@/contexts/TenantContext';
import { Select } from '@/components/ui/select';

export function TenantSelector() {
  const { empresaActual, empresasDisponibles, cambiarEmpresa } = useTenant();

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <Select
        value={empresaActual || ''}
        onValueChange={cambiarEmpresa}
      >
        {empresasDisponibles.map(empresa => (
          <option key={empresa.codigo} value={empresa.codigo}>
            {empresa.nombre}
          </option>
        ))}
      </Select>
    </div>
  );
}
```

---

## 📈 Performance y Optimización

### 1. Caché de Empresas Disponibles

```typescript
// Cachear empresas por usuario (30 minutos)
import { LRUCache } from 'lru-cache';

const empresasCache = new LRUCache<number, Empresa[]>({
  max: 500,
  ttl: 1000 * 60 * 30, // 30 minutos
});

async function getUsuarioEmpresasCached(userId: number) {
  const cached = empresasCache.get(userId);
  if (cached) return cached;

  const empresas = await getUsuarioEmpresas(userId);
  empresasCache.set(userId, empresas);

  return empresas;
}
```

### 2. Índices de Base de Datos

```sql
-- Índice compuesto para queries de proveedor + empresa
CREATE NONCLUSTERED INDEX IX_Compra_Proveedor_Empresa
ON Compra (Proveedor, Empresa)
INCLUDE (Fecha, Importe, Estatus);

-- Índice para relación usuario-empresa
CREATE NONCLUSTERED INDEX IX_pNetUsuarioEmpresa_Usuario
ON pNetUsuarioEmpresa (IDUsuario)
INCLUDE (Empresa);
```

---

## ✅ Mejores Prácticas

### 1. SIEMPRE validar empresa en queries
```typescript
// ✅ BIEN
WHERE Proveedor = @prov AND Empresa = @emp

// ❌ MAL
WHERE Proveedor = @prov
```

### 2. Usar PreparedStatements
```typescript
const request = pool.request()
  .input('proveedor', sql.VarChar(10), proveedor)
  .input('empresa', sql.VarChar(5), empresa);
```

### 3. Logs de auditoría por tenant
```typescript
await auditLog({
  userId: user.id,
  empresa: user.empresaActual,
  action: 'CONSULTA_ORDENES',
  timestamp: new Date()
});
```

### 4. Separar queries por rol
```typescript
// Proveedor: SIEMPRE incluir filtros
if (role === 'proveedor') {
  query += ' AND Proveedor = @proveedor AND Empresa = @empresa';
}

// Admin: puede ver todas las empresas
// (pero debe seleccionar una)
if (role === 'admin') {
  query += ' AND Empresa = @empresa';
}
```

---

## 🔒 Checklist de Seguridad

- [ ] Todas las queries incluyen filtro de `Empresa`
- [ ] Validación de acceso a empresa en cada request
- [ ] JWT incluye `empresaActual` y `empresasDisponibles`
- [ ] Middleware valida tenant context
- [ ] No exponer códigos de empresa en URLs públicas
- [ ] Logs de auditoría por empresa
- [ ] Rate limiting por tenant
- [ ] Validar cambio de empresa (no permitir XSS)
- [ ] Sanitizar inputs de búsqueda
- [ ] Prepared statements en todas las queries

---

## 📚 Referencias

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [mssql npm package](https://www.npmjs.com/package/mssql)
- [Multi-tenant SaaS Database Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

---

**Última actualización:** 2025-12-08
**Versión:** 1.0
**Autor:** Sistema
