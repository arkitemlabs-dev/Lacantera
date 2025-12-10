# 🔐 Guía NextAuth Multi-Tenant

## 📋 Resumen

Se ha actualizado NextAuth para soportar **multi-tenant** con selección dinámica de empresa. Cada usuario puede tener acceso a múltiples empresas y cambiar entre ellas sin volver a iniciar sesión.

---

## 🎯 Cambios Implementados

### 1. **Types de NextAuth Actualizados**
[src/types/next-auth.d.ts](../src/types/next-auth.d.ts)

Se agregaron campos al `User`, `Session` y `JWT`:

```typescript
interface User {
  // ... campos existentes
  empresaActual?: string;  // Tenant ID seleccionado
  empresasDisponibles?: Array<{
    tenantId: string;
    tenantName: string;
    empresaCodigo: string;
    proveedorCodigo: string;
  }>;
}
```

### 2. **auth.config.ts Mejorado**
[src/lib/auth.config.ts](../src/lib/auth.config.ts)

**Cambios en callback `jwt`:**
- ✅ Al login: carga empresas disponibles con `getUserTenants()`
- ✅ Selecciona automáticamente la primera empresa
- ✅ Detecta cambio de empresa con `trigger === 'update'`
- ✅ Valida acceso antes de cambiar

**Cambios en callback `session`:**
- ✅ Incluye `empresaActual` y `empresasDisponibles` en session

### 3. **Endpoint de Actualización**
[src/app/api/auth/update-session/route.ts](../src/app/api/auth/update-session/route.ts)

- `POST /api/auth/update-session` - Valida y prepara cambio de empresa
- `GET /api/auth/update-session` - Obtiene info de sesión actual

### 4. **Componente EmpresaSelector**
[src/components/EmpresaSelector.tsx](../src/components/EmpresaSelector.tsx)

- Dropdown para seleccionar empresa
- Muestra empresas disponibles
- Cambia empresa sin recargar login

### 5. **Página de Selección**
[src/app/select-empresa/page.tsx](../src/app/select-empresa/page.tsx)

- Página inicial para seleccionar empresa
- Redirige al dashboard después de seleccionar
- Maneja casos de error (sin empresas, etc.)

---

## 🚀 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOGIN                                                    │
│    Usuario ingresa email + password                        │
│    ↓                                                        │
│    NextAuth valida en pNetUsuario (BD: PP)                │
│    ↓                                                        │
│    Callback JWT ejecuta getUserTenants(userId)            │
│    ↓                                                        │
│    JWT incluye:                                            │
│    - empresasDisponibles: [{ tenantId, name, ... }]       │
│    - empresaActual: tenants[0].tenantId (default)         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SELECCIÓN DE EMPRESA (opcional)                         │
│    Si el usuario quiere cambiar de empresa                 │
│    ↓                                                        │
│    Componente EmpresaSelector o página /select-empresa     │
│    ↓                                                        │
│    await update({ empresaActual: "la-cantera" })          │
│    ↓                                                        │
│    Callback JWT detecta trigger='update'                   │
│    ↓                                                        │
│    Valida acceso y actualiza token.empresaActual          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. TODAS LAS API CALLS                                     │
│    Middleware withTenantContext() lee:                     │
│    - session.user.empresaActual                            │
│    - session.user.empresasDisponibles                      │
│    ↓                                                        │
│    Valida acceso y ejecuta queries con tenant context     │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Uso en Código

### 1. Obtener Empresa Actual del Usuario

```tsx
'use client';

import { useSession } from 'next-auth/react';

export default function MiComponente() {
  const { data: session } = useSession();

  const empresaActual = session?.user?.empresaActual;
  const empresasDisponibles = session?.user?.empresasDisponibles || [];

  return (
    <div>
      <h1>Empresa actual: {empresaActual}</h1>
      <p>Tienes acceso a {empresasDisponibles.length} empresa(s)</p>
    </div>
  );
}
```

### 2. Cambiar Empresa Programáticamente

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function CambiarEmpresa() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  const handleChange = async (tenantId: string) => {
    setLoading(true);
    try {
      // Actualizar sesión
      await update({
        empresaActual: tenantId,
      });

      // Opcional: recargar página para refrescar datos
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => handleChange('la-cantera')}
      disabled={loading}
    >
      Cambiar a La Cantera
    </button>
  );
}
```

### 3. Usar en API Routes

```typescript
// src/app/api/mi-endpoint/route.ts
import { withTenantContext } from '@/middleware/tenant';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  // tenant.tenantId viene de session.user.empresaActual
  // tenant.empresaCodigo es el código en el ERP

  console.log('Empresa actual:', tenant.tenantId);
  console.log('Código ERP:', tenant.empresaCodigo);

  // ... tu lógica
});
```

### 4. Agregar Selector al Layout

```tsx
// src/app/(app)/layout.tsx
import { EmpresaSelector } from '@/components/EmpresaSelector';

export default function AppLayout({ children }) {
  return (
    <div>
      <header>
        <nav>
          {/* ... otros elementos ... */}
          <EmpresaSelector />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

## 🔧 Configuración de Variables de Entorno

Asegúrate de tener en `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secret_muy_largo_y_seguro

# SQL Server (Portal PP)
MSSQL_SERVER=cloud.arkitem.com
MSSQL_USER=sa_ediaz
MSSQL_PASSWORD=YX!Au4DJ{Yuz
MSSQL_DATABASE=PP
MSSQL_ENCRYPT=false
MSSQL_TRUST_CERT=true
```

---

## 🧪 Testing

### Test 1: Login y Carga de Empresas

```bash
# Login
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "proveedor@example.com",
    "password": "password123"
  }'

# Verificar sesión
curl http://localhost:3000/api/auth/session
```

Debe devolver:
```json
{
  "user": {
    "id": "123",
    "email": "proveedor@example.com",
    "empresaActual": "la-cantera",
    "empresasDisponibles": [
      {
        "tenantId": "la-cantera",
        "tenantName": "La Cantera Desarrollos Mineros",
        "empresaCodigo": "LCDM",
        "proveedorCodigo": "PROV001"
      }
    ]
  }
}
```

### Test 2: Cambiar Empresa

```typescript
// En componente React
const { update } = useSession();

await update({
  empresaActual: 'peralillo'
});

// Verificar cambio
const session = await getSession();
console.log(session.user.empresaActual); // 'peralillo'
```

### Test 3: Validación de Acceso

```typescript
// Intenta cambiar a empresa sin acceso
await update({
  empresaActual: 'empresa-inexistente'
});

// JWT callback NO actualizará el token
// empresaActual permanecerá sin cambios
```

---

## 🚨 Troubleshooting

### Error: "Usuario sin empresas asignadas"

**Causa:** No hay registros en `portal_proveedor_mapping` para el usuario

**Solución:**
```sql
-- En BD PP
INSERT INTO portal_proveedor_mapping (
  id, portal_user_id, erp_proveedor_code, empresa_code, activo
) VALUES (
  NEWID(), 'user_id_aqui', 'PROV001', 'LCDM', 1
);
```

### Error: "empresaActual es undefined"

**Causa:** La sesión no se actualizó después del login

**Solución:**
1. Verifica que `getUserTenants()` retorne datos
2. Chequea logs en consola durante login
3. Fuerza refresh de sesión: `await getSession()`

### Error: No cambia de empresa

**Causa:** Falta llamar a `update()` del `useSession()`

**Solución:**
```typescript
import { useSession } from 'next-auth/react';

const { update } = useSession();

await update({ empresaActual: 'new-tenant' });
```

### Empresas disponibles vacío

**Causa:** `getUserTenants()` no encuentra mappings

**Verificar:**
```sql
-- En BD PP
SELECT * FROM portal_proveedor_mapping
WHERE portal_user_id = 'user_id'
  AND activo = 1;
```

---

## 📊 Estructura de Datos

### JWT Token

```json
{
  "id": "123",
  "email": "user@example.com",
  "role": "proveedor",
  "userType": "Proveedor",
  "empresa": "LCDM",
  "proveedor": "PROV001",
  "empresaActual": "la-cantera",
  "empresasDisponibles": [
    {
      "tenantId": "la-cantera",
      "tenantName": "La Cantera Desarrollos Mineros",
      "empresaCodigo": "LCDM",
      "proveedorCodigo": "PROV001",
      "permisos": ["ver_ordenes", "subir_facturas"]
    },
    {
      "tenantId": "peralillo",
      "tenantName": "Peralillo S.A de C.V",
      "empresaCodigo": "PERA",
      "proveedorCodigo": "PROV001",
      "permisos": ["ver_ordenes"]
    }
  ],
  "iat": 1735689600,
  "exp": 1738281600
}
```

### Session Object

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    empresaActual: string;
    empresasDisponibles: Array<{
      tenantId: string;
      tenantName: string;
      empresaCodigo: string;
      proveedorCodigo: string;
    }>;
  }
}
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. ✅ **Al login**: `getUserTenants()` solo retorna empresas con mapping activo
2. ✅ **Al cambiar**: Valida que `empresaActual` esté en `empresasDisponibles`
3. ✅ **En API routes**: `withTenantContext()` valida acceso en cada request
4. ✅ **En queries**: Filtros por `empresa_code` y `proveedor_code`

### Mejores Prácticas

- ❌ NO confíes solo en el JWT
- ✅ SIEMPRE valida acceso en el backend
- ✅ USA `withTenantContext()` en todos los endpoints
- ✅ FILTRA queries por empresa Y proveedor
- ✅ REGISTRA cambios de empresa en audit log

---

## 📚 Referencias

- [NextAuth.js Docs](https://next-auth.js.org/)
- [JWT Callbacks](https://next-auth.js.org/configuration/callbacks#jwt-callback)
- [Session Update](https://next-auth.js.org/getting-started/client#updating-the-session)
- [Guía Multi-Tenant](./GUIA_IMPLEMENTACION_MULTI_TENANT.md)

---

**Última actualización:** 2025-12-10
**Versión:** 1.0
