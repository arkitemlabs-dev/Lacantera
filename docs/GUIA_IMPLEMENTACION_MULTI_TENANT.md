# 🚀 Guía de Implementación - Arquitectura Multi-Tenant Híbrida

## 📋 Resumen Ejecutivo

Has implementado exitosamente una arquitectura **Database-per-Tenant Híbrida** que integra:
- **Portal Web (BD: PP)** - Gestión de usuarios, workflow, estados
- **ERP Intelisis (5 BDs separadas)** - Datos maestros, órdenes, facturas (solo lectura)

### Empresas del Grupo

| Empresa | Tenant ID | BD ERP | Código |
|---------|-----------|--------|--------|
| La Cantera Desarrollos Mineros | `la-cantera` | `LaCantera_DB` | `LCDM` |
| Peralillo S.A de C.V | `peralillo` | `Peralillo_DB` | `PERA` |
| Plaza Galereña | `plaza-galerena` | `Galerena_DB` | `PLAZ` |
| Icrear | `icrear` | `Icrear_DB` | `ICRE` |
| Inmobiliaria Galereña | `inmobiliaria-galerena` | `Galerena_DB` | `INMO` |

---

## 🏗️ Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  - Selector de Empresa                                      │
│  - JWT con tenant context                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER                         │
│  - validateTenantContext()                                  │
│  - withTenantContext()                                      │
│  - Validación de acceso por usuario                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────┬──────────────────────────────────────┐
│   PORTAL DB (PP)     │    ERP INTELISIS (5 BDs)           │
│   ✅ Lectura/Escritura│    ⚠️ SOLO LECTURA                  │
├──────────────────────┼──────────────────────────────────────┤
│ - portal_usuarios    │ - Prov (Proveedores)                │
│ - portal_proveedor_  │ - Compra (Órdenes)                  │
│   mapping            │ - CompraD (Detalle)                 │
│ - portal_orden_      │ - CFDI_Comprobante                  │
│   status             │ - Empresa                           │
│ - portal_factura_    │                                     │
│   workflow           │                                     │
└──────────────────────┴──────────────────────────────────────┘
```

---

## 📁 Archivos Creados

### 1. Gestor de Conexiones
**Archivo:** `src/lib/database/multi-tenant-connection.ts`

**Funcionalidades:**
- ✅ Pool de conexión para Portal (PP)
- ✅ Pools por BD ERP (reutilizables si DB es la misma)
- ✅ Validación de queries READ-ONLY en ERP
- ✅ `HybridDatabaseManager` class

**Métodos principales:**
```typescript
// Conexión al Portal
await getPortalConnection()

// Conexión al ERP de un tenant
await getERPConnection(tenantId)

// Manager híbrido
hybridDB.queryPortal(sql, params)
hybridDB.queryERP(tenantId, sql, params)
hybridDB.queryHybrid(tenantId, portalSQL, erpSQL, ...)
```

### 2. Queries Híbridas
**Archivo:** `src/lib/database/hybrid-queries.ts`

**Helpers de alto nivel:**
- `getProveedorWithPortalData()` - Proveedor ERP + usuarios Portal
- `getOrdenesCompraHybrid()` - Órdenes ERP + estados Portal
- `getOrdenCompraDetalle()` - Detalle orden con workflow
- `updateOrdenStatus()` - Actualiza Portal (NO ERP)
- `getFacturasHybrid()` - Facturas ERP + workflow Portal
- `validateUserTenantAccess()` - Valida acceso usuario-tenant
- `getUserTenants()` - Empresas de un usuario

### 3. Middleware de Tenant
**Archivo:** `src/middleware/tenant.ts`

**Funciones:**
- `validateTenantContext()` - Valida sesión + tenant
- `withTenantContext()` - Wrapper para API routes
- `withTenantContextSSR()` - Wrapper para getServerSideProps

### 4. Ejemplo de API Route
**Archivo:** `src/app/api/ordenes-compra-hybrid/route.ts`

**Endpoints:**
- `GET /api/ordenes-compra-hybrid` - Lista órdenes
- `GET /api/ordenes-compra-hybrid/[id]` - Detalle orden
- `POST /api/ordenes-compra-hybrid/[id]/respond` - Responder orden

---

## 🔧 Cómo Usar

### Ejemplo 1: API Route con Tenant Context

```typescript
// src/app/api/mi-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { getOrdenesCompraHybrid } from '@/lib/database/hybrid-queries';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  // tenant y user ya están validados ✅

  // Consultar ERP + Portal
  const ordenes = await getOrdenesCompraHybrid(
    tenant.tenantId,
    tenant.proveedorCodigo!,
    { limit: 20 }
  );

  return NextResponse.json({
    success: true,
    data: ordenes,
    tenant: tenant.tenantName,
  });
});
```

### Ejemplo 2: Query Personalizada al ERP

```typescript
import { hybridDB } from '@/lib/database/multi-tenant-connection';

// Solo lectura en ERP
const proveedores = await hybridDB.queryERP(
  'la-cantera',
  `
  SELECT Proveedor, Nombre, RFC
  FROM Prov
  WHERE Estatus = @estatus
  `,
  { estatus: 'ALTA' }
);
```

### Ejemplo 3: Query Personalizada al Portal

```typescript
import { hybridDB } from '@/lib/database/multi-tenant-connection';

// Lectura/escritura en Portal
await hybridDB.queryPortal(
  `
  INSERT INTO portal_orden_status (
    id, erp_orden_id, empresa_code, status_portal, created_at
  ) VALUES (
    NEWID(), @ordenId, @empresa, @status, GETDATE()
  )
  `,
  {
    ordenId: 123,
    empresa: 'LCDM',
    status: 'aceptada',
  }
);
```

### Ejemplo 4: Página con SSR y Tenant

```typescript
// src/app/ordenes/page.tsx
import { withTenantContextSSR } from '@/middleware/tenant';
import { getOrdenesCompraHybrid } from '@/lib/database/hybrid-queries';

export const getServerSideProps = withTenantContextSSR(
  async (context, { tenant, user }) => {
    const ordenes = await getOrdenesCompraHybrid(
      tenant.tenantId,
      tenant.proveedorCodigo!
    );

    return {
      props: {
        ordenes,
        tenant: tenant.tenantName,
      },
    };
  }
);

export default function OrdenesPage({ ordenes, tenant }) {
  return (
    <div>
      <h1>Órdenes de Compra - {tenant}</h1>
      {/* ... */}
    </div>
  );
}
```

---

## 🔐 Flujo de Autenticación

### 1. Login

```
Usuario ingresa:
- Email
- Password
      ↓
NextAuth valida en pNetUsuario (BD: PP)
      ↓
Consulta empresas disponibles:
SELECT empresa_code FROM portal_proveedor_mapping
WHERE portal_user_id = @userId
      ↓
Devuelve lista de empresas al frontend
```

### 2. Selección de Empresa

```
Usuario selecciona empresa (ej: "La Cantera")
      ↓
Frontend actualiza sesión:
PATCH /api/auth/update-session
{ tenantId: "la-cantera" }
      ↓
JWT actualizado con:
{
  userId: "...",
  tenantId: "la-cantera",
  empresaActual: "la-cantera",
  empresaCodigo: "LCDM",
  proveedorCodigo: "PROV001"
}
```

### 3. Todas las Requests

```
Request → Middleware valida:
  1. JWT válido
  2. tenantId presente
  3. Usuario tiene acceso al tenant
  4. Tenant existe en configuración
      ↓
Request procesado con contexto:
{
  tenant: { tenantId, tenantName, empresaCodigo, ... },
  user: { id, email, role, ... }
}
```

---

## ⚠️ Reglas de Seguridad Críticas

### 1. ❌ NUNCA Modificar ERP

```typescript
// ❌ MAL - Intenta escribir en ERP
await hybridDB.queryERP(tenantId, `
  UPDATE Compra SET Estatus = 'CANCELADA'
  WHERE ID = 123
`);
// → LANZARÁ ERROR: "Solo queries SELECT permitidas en ERP"

// ✅ BIEN - Solo lectura
await hybridDB.queryERP(tenantId, `
  SELECT * FROM Compra WHERE ID = 123
`);
```

### 2. ✅ SIEMPRE Validar Tenant

```typescript
// ❌ MAL - Sin validación
export async function GET(request: NextRequest) {
  const ordenes = await getOrdenesCompraHybrid('la-cantera', 'PROV001');
  // ...
}

// ✅ BIEN - Con middleware
export const GET = withTenantContext(async (request, { tenant, user }) => {
  const ordenes = await getOrdenesCompraHybrid(
    tenant.tenantId,
    tenant.proveedorCodigo!
  );
  // ...
});
```

### 3. ✅ Validar Permisos por Rol

```typescript
export const GET = withTenantContext(async (request, { tenant, user }) => {
  // Validar que sea proveedor
  if (user.role !== 'proveedor') {
    return NextResponse.json(
      { error: 'Solo proveedores' },
      { status: 403 }
    );
  }

  // Validar que tenga mapeo
  if (!tenant.proveedorCodigo) {
    return NextResponse.json(
      { error: 'Usuario no mapeado al ERP' },
      { status: 400 }
    );
  }

  // Continuar...
});
```

---

## 📊 Ejemplos de Queries Híbridas

### Caso 1: Lista de Órdenes con Estado

```typescript
// ERP: Órdenes de compra
const erpOrders = await hybridDB.queryERP(tenantId, `
  SELECT ID, Mov, FechaEmision, Importe, Estatus
  FROM Compra
  WHERE Proveedor = @prov AND Empresa = @emp
`, { prov: 'PROV001', emp: 'LCDM' });

// Portal: Estados de las órdenes
const portalStatus = await hybridDB.queryPortal(`
  SELECT erp_orden_id, status_portal, fecha_respuesta
  FROM portal_orden_status
  WHERE erp_orden_id IN (${orderIds})
`, { /* ... */ });

// Combinar
const combined = erpOrders.recordset.map(order => ({
  ...order,
  status_portal: portalStatus.find(s => s.erp_orden_id === order.ID)?.status_portal || 'pendiente'
}));
```

### Caso 2: Validar Usuario tiene Acceso a Orden

```typescript
// 1. Obtener mapeo del Portal
const mapping = await hybridDB.queryPortal(`
  SELECT erp_proveedor_code, empresa_code
  FROM portal_proveedor_mapping
  WHERE portal_user_id = @userId AND activo = 1
`, { userId });

const { erp_proveedor_code, empresa_code } = mapping.recordset[0];

// 2. Validar que la orden pertenece al proveedor (ERP)
const orden = await hybridDB.queryERP(tenantId, `
  SELECT Proveedor, Empresa
  FROM Compra
  WHERE ID = @ordenId
`, { ordenId });

// 3. Validar match
if (orden.recordset[0].Proveedor !== erp_proveedor_code) {
  throw new Error('Acceso denegado');
}
```

---

## 🔄 Migración de Código Existente

### Antes (Código Legacy)

```typescript
// ANTES: Conexión directa
const pool = await getConnection();
const result = await pool.request()
  .input('id', sql.Int, 123)
  .query('SELECT * FROM Compra WHERE ID = @id');
```

### Después (Multi-Tenant)

```typescript
// DESPUÉS: Con tenant context
export const GET = withTenantContext(async (request, { tenant, user }) => {
  const result = await hybridDB.queryERP(
    tenant.tenantId,
    'SELECT * FROM Compra WHERE ID = @id',
    { id: 123 }
  );

  return NextResponse.json(result.recordset);
});
```

---

## 🧪 Testing

### Test de Conexión

```typescript
// scripts/test-multi-tenant.ts
import {
  getPortalConnection,
  getERPConnection,
  hybridDB,
} from '@/lib/database/multi-tenant-connection';

async function testConnections() {
  // Test Portal
  const portalPool = await getPortalConnection();
  console.log('✅ Portal connection OK');

  // Test ERP
  for (const tenantId of ['la-cantera', 'peralillo']) {
    const erpPool = await getERPConnection(tenantId);
    console.log(`✅ ERP ${tenantId} connection OK`);
  }

  // Test query
  const result = await hybridDB.queryERP('la-cantera', 'SELECT TOP 1 * FROM Prov');
  console.log('✅ Query ERP OK:', result.recordset[0]);
}

testConnections();
```

### Test de API

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"proveedor@example.com","password":"password123"}'

# Obtener órdenes (con JWT en header)
curl http://localhost:3000/api/ordenes-compra-hybrid?limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: la-cantera"
```

---

## 📝 Variables de Entorno

```env
# SQL Server (mismo para todas las BDs)
MSSQL_SERVER=cloud.arkitem.com
MSSQL_USER=sa_ediaz
MSSQL_PASSWORD=YX!Au4DJ{Yuz
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secret_aqui

# Node
NODE_ENV=development
```

---

## 🚨 Troubleshooting

### Error: "Tenant no encontrado"

**Causa:** `tenantId` no está en la configuración

**Solución:** Verificar que el tenant esté en `TENANT_CONFIGS` en [multi-tenant-connection.ts](src/lib/database/multi-tenant-connection.ts:21)

### Error: "Solo queries SELECT permitidas en ERP"

**Causa:** Intentaste hacer INSERT/UPDATE/DELETE en BD ERP

**Solución:** Usa `hybridDB.queryPortal()` para escritura, o consulta el ERP solo con SELECT

### Error: "Usuario no mapeado al ERP"

**Causa:** No existe registro en `portal_proveedor_mapping`

**Solución:**
```sql
INSERT INTO portal_proveedor_mapping (
  id, portal_user_id, erp_proveedor_code, empresa_code, activo
) VALUES (
  NEWID(), 'user_id_aqui', 'PROV001', 'LCDM', 1
);
```

---

## 📚 Próximos Pasos

### 1. Actualizar NextAuth

Modificar `src/lib/auth.config.ts` para incluir:
- Consulta de empresas disponibles
- Endpoint de selección de empresa
- JWT con `empresaActual` y `empresasDisponibles`

### 2. Crear Componente Selector de Empresa

```tsx
// src/components/EmpresaSelector.tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export function EmpresaSelector() {
  const { data: session, update } = useSession();
  const empresas = session?.user?.empresasDisponibles || [];

  const handleChange = async (tenantId: string) => {
    await update({ empresaActual: tenantId });
    window.location.reload();
  };

  return (
    <select onChange={(e) => handleChange(e.target.value)}>
      {empresas.map(e => (
        <option key={e.tenantId} value={e.tenantId}>
          {e.tenantName}
        </option>
      ))}
    </select>
  );
}
```

### 3. Migrar Rutas Existentes

Revisar y actualizar todas las API routes existentes para usar `withTenantContext()`.

---

## ✅ Checklist de Implementación

- [x] Gestor de conexiones multi-BD
- [x] Helpers de queries híbridas
- [x] Middleware de tenant context
- [x] Ejemplo de API route
- [ ] Actualizar NextAuth con selector de empresa
- [ ] Crear componente EmpresaSelector
- [ ] Migrar rutas existentes
- [ ] Tests end-to-end
- [ ] Documentación de API

---

**¿Preguntas? ¿Necesitas ayuda con algún paso específico?**

Contacta al equipo de desarrollo o revisa la documentación completa en:
- [docs/ARQUITECTURA_MULTI_TENANT.md](ARQUITECTURA_MULTI_TENANT.md)
- [docs/DATABASE_MAPPING.md](DATABASE_MAPPING.md)
