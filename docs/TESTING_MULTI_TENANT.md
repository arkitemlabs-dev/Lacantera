# 🧪 Guía de Pruebas - Multi-Tenant

## 📋 Checklist de Configuración

Antes de probar, asegúrate de tener:

- [ ] NextAuth configurado (`src/lib/auth.config.ts`)
- [ ] Types actualizados (`src/types/next-auth.d.ts`)
- [ ] EmpresaSelector actualizado (`src/components/ui/empresa-selector.tsx`)
- [ ] Variables de entorno en `.env.local`
- [ ] Tablas creadas en BD PP
- [ ] Datos de prueba insertados

---

## 🚀 Paso 1: Crear Datos de Prueba

### 1.1 Ejecutar Script SQL

```bash
# En SQL Server Management Studio o Azure Data Studio
# Conectar a la BD: PP
# Abrir: scripts/setup-multi-tenant-test-data.sql
# Ejecutar el script completo
```

El script:
1. ✅ Crea tabla `portal_proveedor_mapping`
2. ✅ Crea tabla `portal_orden_status`
3. ✅ Lista usuarios disponibles
4. ✅ Crea mappings de prueba para un usuario proveedor
5. ✅ Muestra resumen de datos creados

### 1.2 Verificar Resultados

```sql
-- Ver mappings creados
SELECT
    m.portal_user_id,
    u.eMail,
    u.Nombre,
    m.erp_proveedor_code,
    m.empresa_code,
    m.activo
FROM portal_proveedor_mapping m
INNER JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
WHERE m.activo = 1;
```

Deberías ver:
```
portal_user_id | eMail              | Nombre         | erp_proveedor_code | empresa_code | activo
---------------|--------------------|-----------------|--------------------|--------------|-------
123            | prov@example.com   | Proveedor Test  | PROV001            | LCDM         | 1
123            | prov@example.com   | Proveedor Test  | PROV001            | PERA         | 1
123            | prov@example.com   | Proveedor Test  | PROV001            | PLAZ         | 1
```

---

## 🧪 Paso 2: Prueba de Login

### 2.1 Iniciar la Aplicación

```bash
npm run dev
```

### 2.2 Login

1. Ir a `http://localhost:3000/login`
2. Ingresar credenciales del usuario de prueba
3. Observar consola del navegador

**Esperado en consola:**
```
[AUTH] Usuario 123 tiene acceso a 3 empresa(s)
```

**Esperado en Network (DevTools):**
- Request a `/api/auth/callback/credentials` → Status 200
- Session cookie creado

### 2.3 Verificar JWT

```bash
# En consola del navegador
const session = await fetch('/api/auth/session').then(r => r.json());
console.log(session);
```

**Esperado:**
```json
{
  "user": {
    "id": "123",
    "email": "prov@example.com",
    "name": "Proveedor Test",
    "role": "proveedor",
    "empresaActual": "la-cantera",
    "empresasDisponibles": [
      {
        "tenantId": "la-cantera",
        "tenantName": "La Cantera Desarrollos Mineros",
        "empresaCodigo": "LCDM",
        "proveedorCodigo": "PROV001"
      },
      {
        "tenantId": "peralillo",
        "tenantName": "Peralillo S.A de C.V",
        "empresaCodigo": "PERA",
        "proveedorCodigo": "PROV001"
      },
      {
        "tenantId": "plaza-galerena",
        "tenantName": "Plaza Galereña",
        "empresaCodigo": "PLAZ",
        "proveedorCodigo": "PROV001"
      }
    ]
  }
}
```

---

## 🔄 Paso 3: Prueba de Cambio de Empresa

### 3.1 Verificar Selector en Header

Después del login, deberías ver:

```
[Header]
  [🏢 La Cantera Desarrollos Mineros ▼]  [🔔]  [👤 Usuario]
```

### 3.2 Abrir Dropdown

Click en el selector → Deberías ver:

```
Seleccionar Empresa
────────────────────
🏢 La Cantera Desarrollos Mineros      ✓
   Código: LCDM
   Proveedor: PROV001

🏢 Peralillo S.A de C.V
   Código: PERA
   Proveedor: PROV001

🏢 Plaza Galereña
   Código: PLAZ
   Proveedor: PROV001
```

### 3.3 Cambiar Empresa

1. Click en "Peralillo"
2. Deberías ver overlay: "Cambiando empresa..."
3. Página recarga automáticamente
4. Selector ahora muestra "Peralillo S.A de C.V"

**Esperado en consola:**
```
[AUTH] Empresa cambiada a: peralillo
```

### 3.4 Verificar Sesión Actualizada

```javascript
// En consola del navegador después del cambio
const session = await fetch('/api/auth/session').then(r => r.json());
console.log(session.user.empresaActual); // "peralillo"
```

---

## 🔍 Paso 4: Prueba de API con Tenant Context

### 4.1 Crear Endpoint de Prueba

```typescript
// src/app/api/test-tenant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  return NextResponse.json({
    message: 'Tenant context funcionando',
    tenant: {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      empresaCodigo: tenant.empresaCodigo,
      erpDatabase: tenant.erpDatabase,
      proveedorCodigo: tenant.proveedorCodigo,
    },
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});
```

### 4.2 Probar Endpoint

```bash
# En navegador o Postman (con sesión activa)
GET http://localhost:3000/api/test-tenant
```

**Esperado:**
```json
{
  "message": "Tenant context funcionando",
  "tenant": {
    "tenantId": "peralillo",
    "tenantName": "Peralillo S.A de C.V",
    "empresaCodigo": "PERA",
    "erpDatabase": "Peralillo_DB",
    "proveedorCodigo": "PROV001"
  },
  "user": {
    "id": "123",
    "email": "prov@example.com",
    "role": "proveedor"
  }
}
```

### 4.3 Cambiar Empresa y Volver a Probar

1. Cambiar a "La Cantera" usando el selector
2. Volver a hacer `GET /api/test-tenant`

**Esperado:**
```json
{
  "tenant": {
    "tenantId": "la-cantera",
    "tenantName": "La Cantera Desarrollos Mineros",
    "empresaCodigo": "LCDM",
    "erpDatabase": "LaCantera_DB"
  }
}
```

---

## 📊 Paso 5: Prueba de Query Híbrida

### 5.1 Probar Helper de Queries

```typescript
// En cualquier API route o server component
import { getOrdenesCompraHybrid } from '@/lib/database/hybrid-queries';

const ordenes = await getOrdenesCompraHybrid(
  'la-cantera',  // tenantId
  'PROV001',     // proveedorCodigo
  { limit: 10 }
);

console.log('Órdenes:', ordenes);
```

**Esperado:**
- Consulta a ERP: `LaCantera_DB.dbo.Compra`
- Consulta a Portal: `PP.dbo.portal_orden_status`
- Resultado combinado con estados del portal

### 5.2 Verificar Queries en SQL Profiler

Si tienes acceso a SQL Server Profiler:

1. Iniciar trace
2. Hacer request a API
3. Ver queries ejecutadas:

```sql
-- Query al ERP (solo SELECT)
SELECT c.ID, c.Mov, c.FechaEmision, ...
FROM LaCantera_DB.dbo.Compra c
WHERE c.Proveedor = 'PROV001' AND c.Empresa = 'LCDM'

-- Query al Portal
SELECT ops.erp_orden_id, ops.status_portal, ...
FROM PP.dbo.portal_orden_status ops
WHERE ops.erp_orden_id IN (...)
```

---

## 🚨 Troubleshooting

### Problema 1: No ve empresas en selector

**Síntomas:**
- Selector no aparece
- Solo muestra una empresa
- `empresasDisponibles` está vacío

**Soluciones:**

```sql
-- 1. Verificar mappings
SELECT * FROM portal_proveedor_mapping
WHERE portal_user_id = '123' AND activo = 1;

-- 2. Verificar que getUserTenants() funcione
-- En Node.js console:
const { getUserTenants } = require('./src/lib/database/hybrid-queries');
const tenants = await getUserTenants('123');
console.log(tenants);
```

### Problema 2: Error al cambiar empresa

**Síntomas:**
- Click en empresa no hace nada
- Error en consola: "No tiene acceso"

**Soluciones:**

1. Verificar que el `tenantId` esté en la configuración:

```typescript
// src/lib/database/multi-tenant-connection.ts
const TENANT_CONFIGS = {
  'la-cantera': { ... },  // ✓ Debe existir
  'peralillo': { ... },   // ✓ Debe existir
  // ...
};
```

2. Verificar consola:
```
[AUTH] Intento de acceso no autorizado a empresa: xxx
```

### Problema 3: Queries sin filtro de empresa

**Síntomas:**
- Datos de múltiples empresas mezclados
- Security warning en logs

**Solución:**

Siempre usar `withTenantContext()`:

```typescript
// ❌ MAL
export async function GET(request: NextRequest) {
  const pool = await getConnection();
  // ...sin tenant context
}

// ✅ BIEN
export const GET = withTenantContext(async (request, { tenant, user }) => {
  // tenant.empresaCodigo disponible
});
```

### Problema 4: Pool de conexiones agotado

**Síntomas:**
- Timeout en queries
- Error: "Connection pool exhausted"

**Solución:**

```typescript
// Verificar configuración de pools
const config = {
  pool: {
    max: 20,  // Aumentar si es necesario
    min: 5,
    idleTimeoutMillis: 30000,
  }
};
```

---

## ✅ Checklist Final de Pruebas

- [ ] Login exitoso con carga de empresas
- [ ] Selector muestra todas las empresas disponibles
- [ ] Cambio de empresa funciona correctamente
- [ ] JWT se actualiza con nueva empresa
- [ ] API routes reciben tenant context
- [ ] Queries híbridas funcionan (ERP + Portal)
- [ ] Validación de acceso funciona
- [ ] No se pueden escribir en BDs ERP
- [ ] Logs de auditoría registran cambios
- [ ] Performance aceptable (<500ms por request)

---

## 📈 Métricas de Éxito

### Performance

- ✅ Login: < 2 segundos
- ✅ Cambio de empresa: < 3 segundos
- ✅ API calls: < 500ms promedio
- ✅ Query híbrida: < 1 segundo

### Funcionalidad

- ✅ 100% de requests con tenant context
- ✅ 0 errores de acceso no autorizado
- ✅ 0 queries sin filtro de empresa
- ✅ 100% de logs con tenant ID

---

## 🎯 Siguiente Nivel

Una vez que las pruebas básicas funcionen:

1. **Crear usuarios con diferentes permisos**
2. **Probar con datos reales del ERP**
3. **Implementar caché de tenant context**
4. **Agregar métricas y monitoring**
5. **Crear tests automatizados**

---

**¿Encontraste un bug? ¿Algo no funciona como esperabas?**

Revisa los logs en:
- Consola del navegador (DevTools)
- Terminal del servidor (npm run dev)
- SQL Server logs (si aplica)

O contacta al equipo de desarrollo con:
- Pasos para reproducir
- Logs de error
- Usuario y empresa usados
