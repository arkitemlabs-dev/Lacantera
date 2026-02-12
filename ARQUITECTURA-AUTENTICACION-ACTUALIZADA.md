# Arquitectura de Autenticación - Portal Actualizado
## Sistema Multi-Tipo: Administradores + Proveedores

---

## 📊 RESUMEN EJECUTIVO

El sistema de autenticación ahora soporta **dos tipos de usuarios principales**:

1. **Administradores** (super-admin, admin) → Tabla `WebUsuario`
2. **Proveedores** → Tabla `pNetUsuario` (legacy) o `WebUsuario` (nuevo)

---

## 🔐 TABLAS DE AUTENTICACIÓN

### 1. **WebUsuario** (Tabla Principal - Nueva)

Tabla moderna para **todos los usuarios web**, incluyendo administradores.

```sql
WebUsuario
├── UsuarioWeb       VARCHAR(50) (PK)          -- Código único del usuario
├── Nombre           VARCHAR(100)              -- Nombre completo
├── eMail            VARCHAR(100) UNIQUE       -- Email para login ⭐
├── Contrasena       VARCHAR(255)              -- Hash bcrypt ⭐
├── Rol              VARCHAR(50)               -- super-admin, admin, proveedor, cliente
├── Estatus          VARCHAR(20)               -- ACTIVO/INACTIVO/PENDIENTE
├── Alta             DATETIME                  -- Fecha de registro
├── UltimoCambio     DATETIME                  -- Última modificación
├── Empresa          VARCHAR(10)               -- Empresa por defecto (opcional)
├── Proveedor        VARCHAR(10) (FK)          -- FK a Prov (si es proveedor)
├── Cliente          VARCHAR(10) (FK)          -- FK a Cte (si es cliente)
├── Telefono         VARCHAR(50)               -- Teléfono de contacto
└── ... (otros campos)
```

**Roles disponibles:**
- `super-admin` - Acceso total a todas las empresas y funciones
- `admin` - Acceso administrativo a todas las empresas
- `proveedor` - Acceso como proveedor (limitado a sus datos)
- `cliente` - Acceso como cliente (futuro)
- `user` - Usuario genérico

---

### 2. **pNetUsuario** (Tabla Legacy - Fallback)

Sistema antiguo de usuarios del portal pNet.

```sql
pNetUsuario
├── IDUsuario         INT (PK, Identity)
├── Usuario           VARCHAR(10) (FK)
├── IDUsuarioTipo     INT (FK)              -- 1=Intelisis, 4=Proveedor
├── eMail             VARCHAR(50)
├── Nombre            VARCHAR(100)
├── Estatus           VARCHAR(15)
└── ... (otros campos)
```

**Tipos de Usuario (pNetUsuarioTipo):**
- `1` - Intelisis → Se mapea a rol `admin`
- `4` - Proveedor → Se mapea a rol `proveedor`

---

## 🔄 FLUJO DE AUTENTICACIÓN

### **Login - Paso a Paso:**

```
1. Usuario ingresa:
   - Email
   - Contraseña
   - Tipo de usuario (Administrador/Proveedor)
   - Empresa (opcional)
   ↓
2. Sistema busca en ORDEN:
   a) 🔥 PRIMERO: WebUsuario (tabla moderna)
      WHERE eMail = @email AND Estatus = 'ACTIVO'

   b) 🔥 FALLBACK: pNetUsuario (tabla legacy)
      WHERE eMail = @email AND Estatus = 'ACTIVO'
   ↓
3. Validación de contraseña:
   - WebUsuario: bcrypt.compare(password, Contrasena)
   - pNetUsuario: bcrypt.compare(password, pNetUsuarioPassword.PasswordHash)
   ↓
4. Determinación de ROL:

   📌 Si está en WebUsuario:
      - Rol = WebUsuario.Rol (super-admin, admin, proveedor)

   📌 Si está en pNetUsuario:
      - IDUsuarioTipo = 1 → rol = 'admin'
      - IDUsuarioTipo = 4 → rol = 'proveedor'
   ↓
5. Obtención de EMPRESAS DISPONIBLES:

   📌 Si es ADMINISTRADOR (super-admin o admin):
      → Acceso a TODAS las empresas:
        - la-cantera
        - peralillo
        - plaza-galerena
        - inmobiliaria-galerena
        - icrear

   📌 Si es PROVEEDOR:
      → Consultar portal_proveedor_mapping
        WHERE portal_user_id = userId AND activo = 1
        → Retorna solo empresas asignadas al proveedor
   ↓
6. Selección de EMPRESA ACTUAL:
   - Si usuario seleccionó empresa en login → usar esa
   - Si no → seleccionar la primera disponible
   ↓
7. Creación de JWT Token con:
   {
     id: userId,
     email: email,
     name: nombre,
     role: 'super-admin' | 'admin' | 'proveedor',
     userType: 'Administrador' | 'Proveedor',
     empresaActual: 'la-cantera',
     empresasDisponibles: [
       { tenantId, tenantName, empresaCodigo, proveedorCodigo, permisos }
     ]
   }
   ↓
8. Redirección según ROL:
   - super-admin, admin → /admin/dashboard
   - proveedor → /proveedores/dashboard
```

---

## 👥 TIPOS DE USUARIOS

### **A. ADMINISTRADORES**

**Características:**
- Se autentican desde `WebUsuario`
- Rol: `super-admin` o `admin`
- Email: admin@lacantera.com (usuario por defecto)
- Contraseña: Hash bcrypt almacenado en `WebUsuario.Contrasena`
- **Acceso a TODAS las empresas automáticamente**
- No necesitan registro en `portal_proveedor_mapping`

**Permisos:**
- Ver todos los proveedores
- Ver todas las órdenes de compra
- Gestionar facturas
- Configurar sistema
- Crear/editar usuarios

---

### **B. PROVEEDORES**

**Características:**
- Se autentican desde `WebUsuario` (nuevo) o `pNetUsuario` (legacy)
- Rol: `proveedor`
- Email: email del proveedor
- Contraseña: Hash bcrypt
- **Acceso SOLO a empresas asignadas en `portal_proveedor_mapping`**

**Permisos:**
- Ver sus propias órdenes de compra
- Subir facturas
- Ver estados de pago
- Actualizar perfil

---

## 🗂️ TABLAS DE MAPEO MULTI-TENANT

### **portal_proveedor_mapping**

Relaciona usuarios proveedores con sus empresas y códigos ERP.

```sql
portal_proveedor_mapping
├── id                    UNIQUEIDENTIFIER (PK)
├── portal_user_id        VARCHAR(50)           -- FK a WebUsuario.UsuarioWeb
├── empresa_code          VARCHAR(50)           -- 'la-cantera', 'peralillo', etc.
├── erp_proveedor_code    VARCHAR(10)           -- Código en tabla Prov del ERP
├── permisos              NVARCHAR(MAX)         -- JSON de permisos
├── activo                BIT DEFAULT 1         -- Usuario activo en esta empresa
├── created_at            DATETIME
└── updated_at            DATETIME
```

**Ejemplo de registro:**
```json
{
  "portal_user_id": "PROV001",
  "empresa_code": "la-cantera",
  "erp_proveedor_code": "PROV123",
  "permisos": "[\"ver_ordenes\", \"subir_facturas\"]",
  "activo": 1
}
```

**⚠️ IMPORTANTE:** Los administradores NO necesitan registros en esta tabla.

---

## 💻 CÓDIGO DE AUTENTICACIÓN

### **getUserTenants() - Lógica actualizada**

```typescript
export async function getUserTenants(userId: string, userRole?: string) {
  // 🔥 ADMINISTRADORES: Acceso a todas las empresas
  if (userRole === 'super-admin' || userRole === 'admin') {
    return [
      { tenantId: 'la-cantera', tenantName: 'La Cantera', ... },
      { tenantId: 'peralillo', tenantName: 'Peralillo', ... },
      { tenantId: 'plaza-galerena', tenantName: 'Plaza Galereña', ... },
      { tenantId: 'inmobiliaria-galerena', tenantName: 'Inmobiliaria Galereña', ... },
      { tenantId: 'icrear', tenantName: 'Icrear', ... },
    ];
  }

  // 🔥 PROVEEDORES: Solo empresas asignadas
  const result = await hybridDB.queryPortal(`
    SELECT DISTINCT empresa_code, erp_proveedor_code, permisos
    FROM portal_proveedor_mapping
    WHERE portal_user_id = @userId AND activo = 1
  `, { userId });

  return result.recordset.map(...);
}
```

---

## 📝 CREDENCIALES DE ACCESO

### **Usuario Administrador (Super Admin)**

```
Email:      admin@lacantera.com
Contraseña: admin123456
Rol:        super-admin
Estatus:    ACTIVO

Tabla:      WebUsuario
UsuarioWeb: ADMIN001
```

**Crear usuario admin:**
```sql
-- Ejecutar script:
scripts/crear-admin-webusuario.sql
```

**Verificar usuario admin:**
```sql
-- Ejecutar script:
scripts/verificar-usuario-creado.sql
```

---

## 🔧 CONFIGURACIÓN DE NEXTAUTH

### **auth.config.ts - Cambios clave**

```typescript
// 1. Búsqueda en WebUsuario (PRIMERO)
const webUserResult = await pool.query(`
  SELECT UsuarioWeb, Nombre, eMail, Contrasena, Rol, Estatus
  FROM WebUsuario
  WHERE eMail = @email AND Estatus = 'ACTIVO'
`);

// 2. Determinar rol desde WebUsuario
let role = webUser.Rol || 'user'; // super-admin, admin, proveedor

// 3. Obtener empresas (pasando el rol)
const tenants = await getUserTenants(user.id, user.role);

// 4. Crear token JWT
return {
  id: webUser.UsuarioWeb,
  email: webUser.eMail,
  name: webUser.Nombre,
  role: role,
  userType: role === 'super-admin' || role === 'admin'
    ? 'Administrador'
    : 'Proveedor',
  empresaId: credentials.empresaId,
};
```

---

## ✅ VENTAJAS DEL SISTEMA ACTUALIZADO

1. ✅ **Tabla moderna (WebUsuario)** - Sistema unificado para todos los usuarios web
2. ✅ **Compatibilidad legacy** - Fallback a pNetUsuario para usuarios antiguos
3. ✅ **Roles flexibles** - super-admin, admin, proveedor en un solo sistema
4. ✅ **Multi-tenant inteligente** - Admins ven todo, proveedores solo su info
5. ✅ **Sin duplicación de datos** - Los admins no necesitan mapeos extras
6. ✅ **Seguridad robusta** - Bcrypt para todas las contraseñas

---

## 🎯 MIGRACIÓN DE USUARIOS

### **De pNetUsuario a WebUsuario**

Para migrar proveedores antiguos a la nueva tabla:

```sql
-- Script de migración (ejemplo)
INSERT INTO WebUsuario (
  UsuarioWeb, Nombre, eMail, Contrasena, Rol,
  Estatus, Alta, Proveedor
)
SELECT
  pnu.Usuario,
  pnu.Nombre,
  pnu.eMail,
  pnp.PasswordHash,
  'proveedor' as Rol,
  CASE WHEN pnu.Estatus = 'ACTIVO' THEN 'ACTIVO' ELSE 'INACTIVO' END,
  pnu.FechaRegistro,
  pnu.Usuario as Proveedor
FROM pNetUsuario pnu
INNER JOIN pNetUsuarioPassword pnp ON pnu.IDUsuario = pnp.IDUsuario
WHERE pnu.IDUsuarioTipo = 4 -- Tipo Proveedor
  AND NOT EXISTS (
    SELECT 1 FROM WebUsuario wu WHERE wu.eMail = pnu.eMail
  );
```

---

## 📊 RESUMEN DE TABLAS

| Funcionalidad | Tabla Principal | Tabla Legacy | Estado |
|---------------|----------------|--------------|--------|
| Autenticación | `WebUsuario` | `pNetUsuario` | ✅ Activo |
| Contraseñas | `WebUsuario.Contrasena` | `pNetUsuarioPassword` | ✅ Activo |
| Roles | `WebUsuario.Rol` | Mapeo manual | ✅ Activo |
| Admin | `WebUsuario` (rol=admin) | `pNetUsuario` (tipo=1) | ✅ Activo |
| Proveedores | `WebUsuario` (rol=proveedor) | `pNetUsuario` (tipo=4) | ✅ Activo |
| Mapeo Multi-Tenant | `portal_proveedor_mapping` | - | ✅ Solo proveedores |

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### **❌ "Usuario no encontrado"**

1. Verificar que existe en `WebUsuario`:
   ```sql
   SELECT * FROM WebUsuario WHERE eMail = 'admin@lacantera.com'
   ```

2. Verificar que `Estatus = 'ACTIVO'`:
   ```sql
   UPDATE WebUsuario SET Estatus = 'ACTIVO'
   WHERE eMail = 'admin@lacantera.com'
   ```

---

### **❌ "Credenciales inválidas"**

1. Verificar hash de contraseña:
   ```sql
   -- Hash correcto para "admin123456":
   -- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO

   SELECT Contrasena FROM WebUsuario WHERE eMail = 'admin@lacantera.com'
   ```

2. Actualizar contraseña si es incorrecta:
   ```sql
   -- Ejecutar: scripts/crear-admin-webusuario.sql
   ```

---

### **❌ "Sin empresas asignadas"**

**Para proveedores:**
- Verificar registros en `portal_proveedor_mapping`
- Asegurarse que `activo = 1`

**Para administradores:**
- NO requieren registros en `portal_proveedor_mapping`
- El sistema les da acceso automático a todas las empresas si `Rol = 'admin'` o `'super-admin'`

---

## 🧪 EXCEPCIONES Y PRUEBAS (Testers)

Para facilitar el desarrollo y soporte, ciertos correos electrónicos tienen **Acceso Total** (Excepción de Tester), lo que les permite ver todas las empresas (01-10) incluso si no tienen mappings explícitos en la base de datos.

**Correos con Excepción:**
- `ediaz@arkitem.com`
- `admin@lacantera.com`
- `viviana.diaz@arkitem.com`
- `lmontero@arkitem.com`
- `luis.montero@arkitem.com`

---

## �️ MIDDLEWARE DE TENANT RESILIENTE

Se implementó una validación de doble capa en `src/middleware/tenant.ts` para evitar errores 403 innecesarios:

1. **Capa 1 (Sesión):** Si la empresa solicitada ya está en la lista de `empresasDisponibles` del usuario (generada en el login), se permite el acceso sin consultar la BD.
2. **Capa 2 (Base de Datos):** Si no está en la sesión, se realiza una consulta manual a `portal_proveedor_mapping` como último recurso.

---

## 📂 GESTIÓN RESILIENTE DE DOCUMENTOS

Para evitar errores 404 al visualizar o descargar archivos:

1. **Mapeo Flexible de Nombres:** El API en `/api/proveedor/documentos` usa reglas de coincidencia inteligente (Ej: "Op Cum" -> "Opinión de cumplimiento").
2. **Fallback de Mapeo de Proveedor:** Si el `proveedorCode` no se encuentra en la sesión, el API lo recupera automáticamente desde la base de datos del Portal usando el ID del usuario.
3. **Anexos sin Clasificar:** Los archivos en el ERP que no coinciden con ningún requisito estándar se muestran en una sección de "Otros archivos" para asegurar visibilidad total.

---

## �🔑 COMANDOS ÚTILES

```bash
# Verificar build
npm run build

# Ejecutar en desarrollo
npm run dev

# Verificar tipos
npm run typecheck
```

---

**Última actualización:** 2026-02-12
**Base de Datos:** PP (cloud.arkitem.com)
**Sistema:** Portal de Proveedores - La Cantera
**Autor:** Antigravity (AI Assistant)
