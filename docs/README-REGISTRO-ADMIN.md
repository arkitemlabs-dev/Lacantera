# Registro de Administradores - Guía Completa

Este documento explica el proceso completo para habilitar el registro de administradores en el portal web.

## 📋 Resumen de Cambios

Se ha implementado un sistema que permite a los administradores crear sus propias cuentas directamente desde el portal web, sin necesidad de que sean creados en el sistema ERP.

### ✅ Funcionalidades Implementadas

1. **Tabla `portal_usuarios`**: Nueva tabla en la base de datos PP para almacenar usuarios de portal (administradores y proveedores futuros)
2. **Registro de Administradores**: Los administradores pueden auto-registrarse desde `/admin/registro`
3. **Autenticación Dual**: El sistema primero busca en `portal_usuarios`, luego en `pNetUsuario` (usuarios legacy)

## 🗄️ Scripts de Base de Datos

### Paso 1: Crear la tabla portal_usuarios

Ejecutar en: **Servidor Portal** (cloud.arkitem.com) - Database: **PP**

```bash
scripts/1-crear-tabla-portal-usuarios.sql
```

Este script:
- Crea la tabla `portal_usuarios` con todos los campos necesarios
- Crea la secuencia `seq_portal_usuarios` para generar IDs únicos
- Crea índices para optimizar búsquedas
- Crea un trigger para actualizar automáticamente `UltimaActualizacion`

### Paso 2: Crear el primer usuario administrador

Ejecutar en: **Servidor Portal** (cloud.arkitem.com) - Database: **PP**

```bash
scripts/2-crear-usuario-admin.sql
```

Este script crea el usuario administrador inicial:

- **Email**: admin@lacantera.com
- **Contraseña**: admin123456
- **Rol**: super-admin

⚠️ **IMPORTANTE**: Cambiar esta contraseña después del primer login por seguridad.

## 🔧 Código Actualizado

### 1. API de Registro (`/api/auth/register`)

**Archivo**: `src/app/api/auth/register/route.ts`

**Cambios**:
- Ahora acepta parámetro `rol` para determinar si es admin o proveedor
- Si `rol` es `super-admin` o `admin`, crea el usuario en `portal_usuarios`
- Si no tiene rol o es proveedor, usa el flujo existente de `pNetUsuario`

**Nuevos campos aceptados**:
```typescript
{
  email: string,
  password: string,
  nombre: string,
  rfc: string,
  razonSocial?: string,
  rol?: 'super-admin' | 'admin' | 'proveedor',
  telefono?: string,
  datosAdicionales?: string
}
```

### 2. Página de Registro de Admin

**Archivo**: `src/app/admin/registro/page.tsx`

**Cambios**:
- Eliminado el mensaje de restricción: "El registro de administradores no está disponible..."
- Ahora llama al endpoint `/api/auth/register` con los datos del formulario
- Asigna RFC genérico `XAXX010101000` a los administradores
- Mapea los roles de la UI a los roles del portal

### 3. Configuración de Autenticación

**Archivo**: `src/lib/auth.config.ts`

**Ya estaba actualizado previamente**:
- PASO 1: Busca en `portal_usuarios` (nuevos usuarios admin/proveedor)
- PASO 2: Si no encuentra, busca en `pNetUsuario` (usuarios legacy)
- Soporta autenticación con bcrypt en ambos casos

## 🌐 Flujo de Registro de Administrador

### 1. Usuario accede a `/admin/registro`

El formulario solicita:
- Nombre completo
- Email corporativo
- Teléfono
- Rol (Super Admin, Compras, Contabilidad, Solo lectura)
- Razón Social
- Datos de contacto adicional (opcional)
- Contraseña
- Confirmación de contraseña

### 2. Usuario completa el formulario y hace clic en "Crear Cuenta"

El sistema:
1. Valida los datos en el frontend
2. Envía una petición POST a `/api/auth/register`
3. El API valida los datos
4. Genera un hash bcrypt de la contraseña
5. Inserta el registro en `portal_usuarios`
6. Retorna éxito

### 3. Usuario recibe confirmación

- Se muestra un toast de éxito
- Se redirige automáticamente a `/login` después de 2 segundos

### 4. Usuario inicia sesión

- Va a `/login`
- Ingresa email y contraseña
- El sistema busca en `portal_usuarios` primero
- Si encuentra el usuario y la contraseña es correcta, autentica
- Usuario es redirigido a `/dashboard`

## 🔑 Estructura de la Tabla portal_usuarios

```sql
CREATE TABLE portal_usuarios (
    -- Identificación
    IDUsuario INT NOT NULL PRIMARY KEY,
    Nombre NVARCHAR(200) NOT NULL,
    RFC VARCHAR(13) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,

    -- Autenticación
    PasswordHash VARCHAR(255) NOT NULL,

    -- Rol y permisos
    Rol VARCHAR(50) NOT NULL CHECK (Rol IN ('super-admin', 'admin', 'proveedor')),

    -- Estado
    Activo BIT NOT NULL DEFAULT 1,
    RequiereCambioPassword BIT NOT NULL DEFAULT 0,

    -- Auditoría
    FechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
    UltimaActualizacion DATETIME NOT NULL DEFAULT GETDATE(),
    UltimoAcceso DATETIME NULL,

    -- Información adicional
    Telefono VARCHAR(20) NULL,
    RazonSocial NVARCHAR(200) NULL,
    DatosAdicionales NVARCHAR(MAX) NULL
);
```

## 🎯 Roles Disponibles

### super-admin
- Acceso completo a todas las funcionalidades
- Puede gestionar usuarios, empresas, proveedores
- Acceso a todas las bases de datos ERP

### admin
- Acceso a funcionalidades específicas según el área
- Compras: Gestión de órdenes de compra, proveedores
- Contabilidad: Gestión de facturas, pagos
- Solo lectura: Vista de información sin permisos de modificación

### proveedor
- Acceso al portal de proveedores
- Ver órdenes de compra
- Subir facturas
- Ver pagos

## 🔒 Seguridad

### Hashing de Contraseñas
- Se usa bcrypt con factor de trabajo 10
- Las contraseñas nunca se almacenan en texto plano
- Hash ejemplo: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO`

### Validaciones
- Email debe ser válido (formato email)
- Contraseña mínimo 6 caracteres
- RFC debe tener 12-13 caracteres (para proveedores)
- Email debe ser único en el sistema

### Auditoría
- `FechaCreacion`: Fecha de creación del usuario
- `UltimaActualizacion`: Se actualiza automáticamente con un trigger
- `UltimoAcceso`: Se actualiza en cada login (por implementar)

## 📊 Flujo de Autenticación

```
Login Request
     ↓
NextAuth (auth.config.ts)
     ↓
[PASO 1] Buscar en portal_usuarios
     ↓
¿Encontrado?
     ├─ SÍ → Verificar contraseña → Autenticar
     └─ NO → [PASO 2] Buscar en pNetUsuario
                ↓
           ¿Encontrado?
                ├─ SÍ → Verificar contraseña → Autenticar
                └─ NO → Error: Credenciales inválidas
```

## 🧪 Testing

### Probar Registro de Admin

1. Ir a `http://localhost:3000/admin/registro`
2. Completar el formulario:
   - Nombre: "Test Admin"
   - Email: "test@lacantera.com"
   - Teléfono: "5512345678"
   - Rol: "Super Admin"
   - Contraseña: "test123456"
   - Confirmar contraseña: "test123456"
3. Hacer clic en "Crear Cuenta"
4. Verificar que aparece el toast de éxito
5. Verificar que redirige a `/login`

### Probar Login

1. Ir a `http://localhost:3000/login`
2. Ingresar:
   - Email: "test@lacantera.com"
   - Contraseña: "test123456"
3. Hacer clic en "Iniciar sesión"
4. Verificar que autentica correctamente
5. Verificar que redirige a `/dashboard`

### Verificar en Base de Datos

```sql
-- Ver usuarios en portal_usuarios
SELECT
    IDUsuario,
    Nombre,
    Email,
    RFC,
    Rol,
    Activo,
    FechaCreacion
FROM portal_usuarios
ORDER BY FechaCreacion DESC;
```

## ⚠️ Notas Importantes

1. **Ejecutar scripts en orden**: Primero `1-crear-tabla-portal-usuarios.sql`, luego `2-crear-usuario-admin.sql`

2. **Cambiar contraseña del admin**: La contraseña por defecto (admin123456) debe cambiarse después del primer login

3. **RFC genérico para admins**: Los administradores usan el RFC `XAXX010101000` por defecto, ya que no son proveedores

4. **Base de datos correcta**: Todos los scripts deben ejecutarse en la base de datos **PP** del servidor Portal (cloud.arkitem.com)

5. **Compatibilidad con usuarios legacy**: El sistema sigue soportando usuarios creados en `pNetUsuario`, no es necesario migrarlos

## 🚀 URLs del Portal

### Desarrollo
- Portal: `http://localhost:3000`
- Registro Admin: `http://localhost:3000/admin/registro`
- Login: `http://localhost:3000/login`

### Producción
- Portal: `https://portal.lacantera.com` (configurar según dominio)
- Registro Admin: `https://portal.lacantera.com/admin/registro`
- Login: `https://portal.lacantera.com/login`

## 📞 Soporte

Si encuentras algún error:
1. Verificar que los scripts SQL se ejecutaron correctamente
2. Revisar los logs de la consola del navegador
3. Revisar los logs del servidor Next.js
4. Verificar la conexión a la base de datos PP

Los mensajes de log incluyen emojis para facilitar el seguimiento:
- 🔧 Información de configuración
- ✅ Operación exitosa
- ❌ Error
- 🔍 Debug / Búsqueda
- 🔑 Autenticación
