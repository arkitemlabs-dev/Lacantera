# 🚀 Pasos para Configurar Multi-Tenant - SIGUIENTE ACCIÓN

## ⚠️ Situación Actual

El script automático (`setup-multi-tenant-test-data.sql`) no pudo crear mappings porque **no encontró usuarios de tipo Proveedor (IDUsuarioTipo = 4)** en tu base de datos.

**Resultado del script:**
- ✅ Tablas creadas: `portal_proveedor_mapping`, `portal_orden_status`
- ❌ Mappings creados: 0 (porque no hay usuarios tipo Proveedor)

---

## 📋 Plan de Acción

### PASO 1: Ejecutar Diagnóstico Completo

Abre **SQL Server Management Studio** o **Azure Data Studio** y ejecuta:

```bash
scripts/diagnostico-completo.sql
```

Este script te mostrará:

1. **Tipos de usuario** que existen en tu sistema
2. **Todos los usuarios activos** por tipo
3. **Relaciones con proveedores** (si existen tablas relacionadas)
4. **Mappings existentes** (debería estar vacío por ahora)
5. **Usuarios recomendados** para testing (con password y email)
6. **Bases de datos ERP** disponibles

**Lo que necesitas anotar:**

```
IDUsuario: _________  (el que elijas para testing)
Email:     _________
Nombre:    _________
Tipo:      _________  (Proveedor, Administrador, etc.)
```

---

### PASO 2: Identificar Código de Proveedor en ERP

**Opción A: Si tienes usuarios tipo Proveedor (IDUsuarioTipo = 4)**

Ya estarán asociados a un código de proveedor en el ERP. Busca en las tablas del ERP:

```sql
-- Ejecutar en base de datos LaCantera_DB (o cualquier ERP)
USE LaCantera_DB;
GO

SELECT TOP 20
    Proveedor AS CodigoProveedor,
    Nombre,
    RFC,
    Estatus
FROM Prov  -- o la tabla que contenga proveedores
WHERE Estatus = 'ACTIVO'
ORDER BY Proveedor;
```

Anota uno de los códigos de proveedor que veas.

**Opción B: Si NO tienes usuarios tipo Proveedor**

Puedes usar **cualquier usuario activo** para testing. En este caso, el código de proveedor puede ser un valor de prueba o uno real del ERP.

```
Código Proveedor: _________  (ej: PROV001, o uno real del ERP)
```

---

### PASO 3: Crear Mappings Manualmente

1. Abre el archivo: `scripts/crear-mappings-manual.sql`

2. Busca las líneas 15 y 18:

```sql
-- 🔥 PASO 1: REEMPLAZAR CON TU IDUsuario
DECLARE @userId NVARCHAR(50) = '123';  -- ⬅️ CAMBIAR ESTE VALOR

-- 🔥 PASO 2: REEMPLAZAR CON TU CÓDIGO DE PROVEEDOR
DECLARE @proveedorCode VARCHAR(10) = 'PROV001';  -- ⬅️ CAMBIAR ESTE VALOR
```

3. **Reemplaza** los valores:

```sql
DECLARE @userId NVARCHAR(50) = 'TU_ID_USUARIO_AQUI';  -- ej: '42'
DECLARE @proveedorCode VARCHAR(10) = 'TU_CODIGO_PROVEEDOR';  -- ej: 'ABC123'
```

4. Ejecuta el script completo

**Resultado esperado:**

```
✅ Mapping 1 creado: La Cantera (LCDM)
✅ Mapping 2 creado: Peralillo (PERA)
✅ Mapping 3 creado: Plaza Galereña (PLAZ)
✅ Total de mappings creados: 3
```

---

### PASO 4: Verificar Password del Usuario

El usuario debe tener un password hasheado en la tabla `pNetUsuarioPassword`.

```sql
USE PP;
GO

SELECT
    IDUsuario,
    Password,
    FechaCreacion
FROM pNetUsuarioPassword
WHERE IDUsuario = TU_ID_USUARIO;  -- Reemplazar con el IDUsuario elegido
```

**Si NO tiene password:**

Necesitarás crear uno. El sistema usa **bcrypt** para hashear passwords.

```sql
-- Ejemplo: Crear password "Test123!" para el usuario
INSERT INTO pNetUsuarioPassword (IDUsuario, Password, FechaCreacion)
VALUES (
    TU_ID_USUARIO,  -- Reemplazar
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- Hash de "Test123!"
    GETDATE()
);
```

> **Nota:** Este es un hash de ejemplo. En producción deberías generar uno nuevo usando bcrypt en Node.js.

---

### PASO 5: Verificar Códigos de Empresa

Los códigos de empresa deben coincidir entre:
- **Base de datos Portal (PP):** En tabla `portal_proveedor_mapping`
- **Configuración del código:** En `src/lib/database/multi-tenant-connection.ts`

**Códigos configurados actualmente:**

```typescript
'la-cantera'           → LCDM  (La Cantera Desarrollos Mineros)
'peralillo'            → PERA  (Peralillo S.A de C.V)
'plaza-galerena'       → PLAZ  (Plaza Galereña)
'icrear'               → ICRE  (Icrear)
'inmobiliaria-galerena'→ INMO  (Inmobiliaria Galereña)
```

**Verifica en el ERP:**

```sql
-- Ejecutar en LaCantera_DB (o cualquier ERP)
SELECT DISTINCT
    Empresa AS CodigoEmpresa,
    -- Si hay tabla de empresas:
    e.Nombre AS NombreEmpresa
FROM Compra c  -- o cualquier tabla que tenga el campo Empresa
-- LEFT JOIN Empresas e ON c.Empresa = e.Codigo
;
```

Si los códigos **NO coinciden**, deberás actualizar el archivo de configuración.

---

### PASO 6: Probar el Login

1. **Iniciar la aplicación:**

```bash
cd "c:\Users\Viviana Diaz\Documents\Trabajo Arkitem\CANTERA\App web\Lacantera"
npm run dev
```

2. **Abrir navegador:**

```
http://localhost:3000/login
```

3. **Ingresar credenciales:**

```
Email:    [el email del usuario que configuraste]
Password: [el password que configuraste, ej: "Test123!"]
```

4. **Verificar resultado:**

✅ **Éxito esperado:**
- Login correcto
- Redirige a dashboard
- **Header muestra selector de empresas** con 3 opciones:
  - La Cantera Desarrollos Mineros
  - Peralillo S.A de C.V
  - Plaza Galereña

❌ **Si falla:**
- Revisa la consola del navegador (F12)
- Revisa la terminal donde corre `npm run dev`
- Verifica los logs en la sección de troubleshooting abajo

---

## 🧪 Verificaciones Posteriores

### 1. Verificar Sesión JWT

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log(data));
```

**Deberías ver:**

```json
{
  "user": {
    "id": "TU_ID_USUARIO",
    "email": "tu@email.com",
    "empresaActual": "la-cantera",
    "empresasDisponibles": [
      {
        "tenantId": "la-cantera",
        "tenantName": "La Cantera Desarrollos Mineros",
        "empresaCodigo": "LCDM",
        "proveedorCodigo": "TU_CODIGO_PROVEEDOR"
      },
      {
        "tenantId": "peralillo",
        ...
      },
      {
        "tenantId": "plaza-galerena",
        ...
      }
    ]
  }
}
```

### 2. Probar Cambio de Empresa

1. Click en el selector de empresas en el header
2. Selecciona "Peralillo S.A de C.V"
3. Deberías ver un overlay "Cambiando empresa..."
4. La página recarga automáticamente
5. El selector ahora muestra "Peralillo S.A de C.V"

### 3. Probar API con Tenant Context

Crea un archivo de prueba:

```typescript
// src/app/api/test-tenant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';

export const GET = withTenantContext(async (request, { tenant, user }) => {
  return NextResponse.json({
    message: 'Multi-tenant funcionando correctamente',
    tenant: {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      empresaCodigo: tenant.empresaCodigo,
      proveedorCodigo: tenant.proveedorCodigo,
    },
    user: {
      id: user.id,
      email: user.email,
    },
  });
});
```

Luego en el navegador:

```
http://localhost:3000/api/test-tenant
```

**Resultado esperado:**

```json
{
  "message": "Multi-tenant funcionando correctamente",
  "tenant": {
    "tenantId": "la-cantera",
    "tenantName": "La Cantera Desarrollos Mineros",
    "empresaCodigo": "LCDM",
    "proveedorCodigo": "TU_CODIGO_PROVEEDOR"
  },
  "user": {
    "id": "TU_ID_USUARIO",
    "email": "tu@email.com"
  }
}
```

---

## 🚨 Troubleshooting

### Problema: No veo el selector de empresas

**Causas posibles:**

1. **Mappings no creados:** Ejecuta la query de verificación:

```sql
SELECT * FROM portal_proveedor_mapping WHERE portal_user_id = 'TU_ID_USUARIO';
```

Debería devolver 3 filas.

2. **getUserTenants() falla:** Revisa logs del servidor (`npm run dev`)

3. **Componente no renderiza:** Verifica que esté importado en el header:

```typescript
// src/components/layout/header.tsx o similar
import { EmpresaSelector } from '@/components/ui/empresa-selector';

// Dentro del componente:
<EmpresaSelector />
```

### Problema: Login falla con "Invalid credentials"

**Causas posibles:**

1. **Password incorrecto:** Verifica en `pNetUsuarioPassword`
2. **Usuario inactivo:** Verifica `Estatus = 'ACTIVO'` en `pNetUsuario`
3. **Email no coincide:** Verifica el email exacto en la BD

**Debug:**

Agrega logs en el callback de NextAuth:

```typescript
// src/lib/auth.config.ts
async authorize(credentials) {
  console.log('🔍 Intentando login:', credentials.email);

  const user = await verificarUsuario(credentials.email, credentials.password);

  console.log('👤 Usuario encontrado:', user ? 'SI' : 'NO');

  return user;
}
```

### Problema: Error "No tiene acceso a esta empresa"

**Causa:** El `empresaCodigo` en el mapping no coincide con la configuración.

**Solución:**

Revisa y actualiza los mappings:

```sql
UPDATE portal_proveedor_mapping
SET empresa_code = 'CODIGO_CORRECTO'
WHERE portal_user_id = 'TU_ID_USUARIO'
  AND empresa_code = 'CODIGO_INCORRECTO';
```

### Problema: Error de conexión a base de datos ERP

**Causa:** Configuración incorrecta en `.env.local`

**Verifica:**

```bash
# .env.local
DB_SERVER=tu-servidor.database.windows.net
DB_PORT=1433
DB_USER=tu-usuario
DB_PASSWORD=tu-password

# Cada BD ERP (si son diferentes servidores)
DB_LACANTERA_DATABASE=LaCantera_DB
DB_PERALILLO_DATABASE=Peralillo_DB
# ...
```

---

## ✅ Checklist de Configuración Completa

- [ ] Ejecuté `diagnostico-completo.sql` y anoté un IDUsuario
- [ ] Identifiqué el código de proveedor en el ERP
- [ ] Actualicé `crear-mappings-manual.sql` con valores reales
- [ ] Ejecuté `crear-mappings-manual.sql` exitosamente (3 mappings creados)
- [ ] Verifiqué que el usuario tiene password en `pNetUsuarioPassword`
- [ ] Verifiqué que los códigos de empresa coinciden con la configuración
- [ ] Inicié la aplicación con `npm run dev`
- [ ] Pude hacer login correctamente
- [ ] Veo el selector de empresas en el header con 3 opciones
- [ ] Puedo cambiar entre empresas sin errores
- [ ] El endpoint `/api/test-tenant` devuelve datos correctos
- [ ] La sesión JWT contiene `empresaActual` y `empresasDisponibles`

---

## 📞 Siguiente Paso SI TODO FUNCIONA

Una vez que hayas completado el checklist, puedes:

1. **Migrar rutas existentes** al patrón multi-tenant usando [MIGRATION_EXAMPLES.md](MIGRATION_EXAMPLES.md)
2. **Crear usuarios reales** con mappings específicos según permisos
3. **Implementar más helpers** en `hybrid-queries.ts` para tus casos de uso
4. **Agregar tests automatizados** para validar el comportamiento multi-tenant

---

## 📚 Documentación Relacionada

- [Arquitectura Multi-Tenant](ARQUITECTURA_MULTI_TENANT.md)
- [Guía de Implementación](GUIA_IMPLEMENTACION_MULTI_TENANT.md)
- [Testing Multi-Tenant](TESTING_MULTI_TENANT.md)
- [Ejemplos de Migración](MIGRATION_EXAMPLES.md)
- [Guía NextAuth Multi-Tenant](NEXTAUTH_MULTI_TENANT_GUIDE.md)

---

**¡Éxito con la configuración! 🚀**
