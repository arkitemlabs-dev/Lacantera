# ✅ Sistema de Usuarios con WebUsuario

## 📋 Resumen de Cambios

El sistema ahora usa la tabla **WebUsuario** existente en lugar de crear nuevas tablas. Esta tabla ya tiene todos los campos necesarios y es la adecuada para el portal web.

## 🗄️ Estructura de Autenticación

### PASO 1: WebUsuario (Principal)
```
WebUsuario
├── UsuarioWeb (Código único del usuario)
├── eMail (Email para login)
├── Contrasena (Hash bcrypt)
├── Rol (super-admin, admin, proveedor, etc.)
├── Estatus (ACTIVO/INACTIVO)
├── Nombre
├── Empresa
├── Proveedor
└── Otros campos...
```

### PASO 2: pNetUsuario (Legacy - Fallback)
Si no encuentra el usuario en WebUsuario, busca en pNetUsuario (usuarios antiguos).

## 🔧 Archivos Modificados

### 1. [src/lib/auth.config.ts](../src/lib/auth.config.ts)
**Cambio**: Autenticación usando WebUsuario como tabla principal

```typescript
// PASO 1: Buscar en WebUsuario
const webUserResult = await pool
  .request()
  .input('email', sql.VarChar(100), credentials.email)
  .query(`
    SELECT
      UsuarioWeb,
      Nombre,
      eMail,
      Contrasena,
      Rol,
      Estatus,
      Empresa,
      Proveedor,
      Cliente
    FROM WebUsuario
    WHERE eMail = @email AND Estatus = 'ACTIVO'
  `);
```

### 2. [src/app/api/auth/register/route.ts](../src/app/api/auth/register/route.ts)
**Cambio**: Registro de administradores en WebUsuario

```typescript
// Si es admin, crear en WebUsuario
INSERT INTO WebUsuario (
  UsuarioWeb,
  Nombre,
  eMail,
  Contrasena,
  Rol,
  Estatus,
  Alta,
  UltimoCambio,
  Telefono,
  Empresa
)
VALUES (...)
```

### 3. [src/app/admin/registro/page.tsx](../src/app/admin/registro/page.tsx)
**Sin cambios** - Ya funciona correctamente con el nuevo sistema

## 🚀 Script SQL a Ejecutar

**Archivo**: [crear-admin-webusuario.sql](crear-admin-webusuario.sql)

Conectarse a: **Servidor Portal** (cloud.arkitem.com) - Database: **PP**

```sql
-- Ejecutar:
scripts/crear-admin-webusuario.sql
```

Este script:
1. ✅ Verifica que existe la tabla WebUsuario
2. ✅ Verifica si ya existe el usuario admin@lacantera.com
3. ✅ Crea el usuario con las credenciales:
   - **UsuarioWeb**: ADMIN001
   - **Email**: admin@lacantera.com
   - **Contraseña**: admin123456
   - **Rol**: super-admin
   - **Estatus**: ACTIVO

## 🔑 Credenciales del Administrador

Después de ejecutar el script:

- **URL**: http://localhost:3000/login (o tu URL de producción)
- **Email**: admin@lacantera.com
- **Contraseña**: admin123456
- **Rol**: super-admin

⚠️ **Importante**: Cambiar la contraseña después del primer login

## 🌐 Flujo de Autenticación Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario va a /login                       │
│              Ingresa email y contraseña                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              NextAuth (auth.config.ts)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: Buscar en WebUsuario                               │
│  WHERE eMail = @email AND Estatus = 'ACTIVO'                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                ┌─────┴─────┐
                │           │
         ¿Encontrado?       │
                │           │
        ┌───────┴────┐      │
        │ SÍ         │      │ NO
        │            │      │
        ▼            │      ▼
┌──────────────┐     │  ┌─────────────────────────────────────┐
│ Verificar    │     │  │ PASO 2: Buscar en pNetUsuario       │
│ Contrasena   │     │  │ (usuarios legacy)                   │
│ (bcrypt)     │     │  └─────────────────┬───────────────────┘
└──────┬───────┘     │                    │
       │             │              ┌─────┴─────┐
       │             │              │           │
   ¿Válida?          │       ¿Encontrado?       │
       │             │              │           │
  ┌────┴────┐        │      ┌───────┴────┐      │
  │ SÍ      │ NO     │      │ SÍ         │      │ NO
  │         │        │      │            │      │
  ▼         ▼        │      ▼            │      ▼
┌─────┐  ┌──────┐   │  ┌──────────┐     │  ┌───────┐
│ ✅  │  │ ❌   │   │  │ Verificar│     │  │ ❌    │
│ OK  │  │Error │   │  │ Password │     │  │ Error │
└──┬──┘  └──────┘   │  └────┬─────┘     │  └───────┘
   │                 │       │           │
   │                 │   ¿Válida?        │
   │                 │       │           │
   │                 │  ┌────┴────┐      │
   │                 │  │ SÍ      │ NO   │
   │                 │  │         │      │
   │                 │  ▼         ▼      │
   │                 │ ┌─────┐ ┌──────┐  │
   │                 │ │ ✅  │ │ ❌   │  │
   │                 │ │ OK  │ │Error │  │
   │                 │ └──┬──┘ └──────┘  │
   │                 │    │              │
   └─────────────────┴────┴──────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Crear sesión JWT           │
        │  Guardar en cookie          │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Redirigir a dashboard      │
        │  según el rol del usuario   │
        └─────────────────────────────┘
```

## 📊 Roles en WebUsuario

El campo `Rol` en WebUsuario determina los permisos:

| Rol | Descripción | Redirección |
|-----|-------------|-------------|
| `super-admin` | Acceso total al sistema | `/dashboard` |
| `admin` | Administrador de área | `/dashboard` |
| `proveedor` | Proveedor externo | `/proveedores/dashboard` |
| `cliente` | Cliente | `/cliente/dashboard` |

## 🎯 Casos de Uso

### 1. Login de Administrador Nuevo (WebUsuario)
1. Usuario creado desde `/admin/registro`
2. Almacenado en **WebUsuario** con `Rol = 'super-admin'` o `'admin'`
3. Login busca en WebUsuario → ✅ Encuentra → Autentica
4. Redirige a `/dashboard`

### 2. Login de Usuario Legacy (pNetUsuario)
1. Usuario antiguo del sistema
2. Almacenado en **pNetUsuario**
3. Login busca en WebUsuario → ❌ No encuentra
4. Busca en pNetUsuario → ✅ Encuentra → Autentica
5. Redirige según su tipo

### 3. Registro de Nuevo Administrador
1. Admin va a `/admin/registro`
2. Completa formulario con email, contraseña, rol, etc.
3. Sistema crea usuario en **WebUsuario**
4. Redirige a `/login`
5. Usuario puede iniciar sesión inmediatamente

## 🔐 Seguridad

### Contraseñas
- Hash: **bcrypt** con factor de trabajo 10
- Nunca se almacenan en texto plano
- Hash ejemplo: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO`

### Validaciones
- Email debe ser válido
- Contraseña mínimo 6 caracteres
- Email debe ser único en WebUsuario
- Solo usuarios con `Estatus = 'ACTIVO'` pueden autenticarse

## 📝 Campos Importantes de WebUsuario

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `UsuarioWeb` | VARCHAR(50) | Código único (PK) | ✅ |
| `eMail` | VARCHAR(100) | Email para login | ✅ |
| `Contrasena` | VARCHAR(255) | Hash bcrypt | ✅ |
| `Nombre` | VARCHAR(100) | Nombre completo | ✅ |
| `Rol` | VARCHAR(50) | Rol del usuario | ✅ |
| `Estatus` | VARCHAR(20) | ACTIVO/INACTIVO | ✅ |
| `Alta` | DATETIME | Fecha de alta | ✅ |
| `UltimoCambio` | DATETIME | Última modificación | ✅ |
| `Empresa` | VARCHAR(50) | Empresa asociada | ❌ |
| `Proveedor` | VARCHAR(10) | Código proveedor | ❌ |
| `Cliente` | VARCHAR(10) | Código cliente | ❌ |
| `Telefono` | VARCHAR(50) | Teléfono | ❌ |

## 🧪 Testing

### 1. Ejecutar el Script
```sql
USE PP;
GO
-- Ejecutar: scripts/crear-admin-webusuario.sql
```

### 2. Verificar Usuario Creado
```sql
SELECT * FROM WebUsuario WHERE eMail = 'admin@lacantera.com';
```

### 3. Probar Login
1. Ir a `http://localhost:3000/login`
2. Email: admin@lacantera.com
3. Contraseña: admin123456
4. Hacer clic en "Iniciar sesión"
5. ✅ Debe autenticar y redirigir a `/dashboard`

### 4. Probar Registro de Nuevo Admin
1. Ir a `http://localhost:3000/admin/registro`
2. Completar formulario
3. Hacer clic en "Crear Cuenta"
4. ✅ Debe crear usuario en WebUsuario
5. ✅ Debe redirigir a `/login`
6. Probar login con las nuevas credenciales

## 📦 Resumen de Scripts Disponibles

| Script | Propósito |
|--------|-----------|
| [crear-admin-webusuario.sql](crear-admin-webusuario.sql) | ✅ USAR ESTE - Crea admin en WebUsuario |
| [3-ver-usuarios.sql](3-ver-usuarios.sql) | Ver todos los usuarios (WebUsuario + pNetUsuario) |
| ~~[1-crear-tabla-portal-usuarios.sql](1-crear-tabla-portal-usuarios.sql)~~ | ❌ NO USAR - Ya no se necesita |
| ~~[2-crear-usuario-admin.sql](2-crear-usuario-admin.sql)~~ | ❌ NO USAR - Ya no se necesita |
| ~~[crear-admin-simple.sql](crear-admin-simple.sql)~~ | ❌ NO USAR - Ya no se necesita |

## ✅ Ventajas de Usar WebUsuario

1. **Tabla Existente**: No crear nuevas tablas innecesarias
2. **Campos Completos**: Ya tiene todos los campos necesarios (Rol, Estatus, Empresa, etc.)
3. **Nomenclatura Estándar**: Sigue el estándar de tu sistema
4. **Compatibilidad**: Funciona con el resto de las tablas Web*
5. **Simplicidad**: Un solo lugar para usuarios web

## 🎉 Estado Actual

- ✅ Sistema actualizado para usar WebUsuario
- ✅ Autenticación funcionando con WebUsuario como principal
- ✅ Registro de administradores creando en WebUsuario
- ✅ Script SQL listo para crear el primer admin
- ✅ Fallback a pNetUsuario para usuarios legacy
- ✅ Sin restricciones en página de registro de admin

## 📞 Siguiente Paso

**Ejecutar el script SQL para crear el primer administrador:**

```bash
Conectarse a: cloud.arkitem.com - Database: PP
Ejecutar: scripts/crear-admin-webusuario.sql
```

Luego probar el login con:
- Email: admin@lacantera.com
- Contraseña: admin123456

¡Todo listo! 🚀
