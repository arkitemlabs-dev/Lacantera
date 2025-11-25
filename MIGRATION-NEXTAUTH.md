# Migración de Firebase Auth a NextAuth.js con SQL Server

Este documento describe la migración del sistema de autenticación de Firebase a NextAuth.js con SQL Server.

## Cambios Realizados

### 1. Dependencias

**Eliminadas:**
- `firebase`
- `firebase-admin`

**Agregadas:**
- `next-auth` - Sistema de autenticación para Next.js
- `mssql` - Cliente de SQL Server para Node.js
- `bcrypt` - Para hash de contraseñas
- `@types/bcrypt` - Tipos TypeScript para bcrypt
- `@types/mssql` - Tipos TypeScript para mssql

### 2. Archivos Eliminados

- `src/lib/firebase.ts`
- `src/lib/firebase-admin.ts`
- `src/lib/firebase/firestore.ts`
- Directorio `src/lib/firebase/`

### 3. Archivos Nuevos

#### Configuración de NextAuth
- `src/lib/auth.config.ts` - Configuración principal de NextAuth.js
- `src/lib/auth-helpers.ts` - Funciones auxiliares de autenticación
- `src/app/api/auth/[...nextauth]/route.ts` - API route de NextAuth
- `src/types/next-auth.d.ts` - Tipos TypeScript para NextAuth

#### Base de Datos
- `database/setup-auth-tables.sql` - Script SQL para crear las tablas necesarias

### 4. Archivos Modificados

- `src/app/providers.tsx` - Actualizado para usar SessionProvider de NextAuth
- `src/app/login/page.tsx` - Actualizado para usar signIn de NextAuth
- `src/app/actions/auth.ts` - Actualizado para usar helpers de NextAuth
- `.env.example` - Actualizado con variables de SQL Server y NextAuth
- `.env.local` - Actualizado con variables de SQL Server y NextAuth

## Configuración Requerida

### 1. Variables de Entorno

Actualiza tu archivo `.env.local` con las siguientes variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-min-32-chars

# SQL Server Configuration
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=pp
MSSQL_USER=sa
MSSQL_PASSWORD=
MSSQL_ENCRYPT=true
MSSQL_TRUST_CERT=true
```

**Importante:** Genera un secret seguro para `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 2. Base de Datos SQL Server

#### Opción A: Ejecutar el script SQL
Ejecuta el archivo `database/setup-auth-tables.sql` en tu instancia de SQL Server:

```bash
sqlcmd -S localhost -U sa -P your-password -d lacantera_db -i database/setup-auth-tables.sql
```

#### Opción B: Manual
El script crea las siguientes tablas:
- `users` - Tabla de usuarios
- `empresas` - Tabla de empresas
- `usuario_empresa` - Relación usuario-empresa (muchos a muchos)
- `sessions` - Tabla de sesiones (opcional, para auditoría)
- `verification_tokens` - Tokens de verificación de email
- `password_reset_tokens` - Tokens de reseteo de contraseña

### 3. Migración de Datos de Firebase (si aplica)

Si tienes usuarios existentes en Firebase, necesitarás migrarlos a SQL Server:

1. **Exportar usuarios de Firebase:**
   - Usa Firebase Admin SDK para exportar usuarios
   - Las contraseñas en Firebase están hasheadas, necesitarás que los usuarios restablezcan sus contraseñas

2. **Importar a SQL Server:**
   - Inserta los usuarios en la tabla `users`
   - Hashea nuevas contraseñas temporales con bcrypt
   - Envía emails de reseteo de contraseña

## Estructura de la Tabla Users

```sql
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name NVARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('proveedor', 'admin_super', 'admin_compras')),
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Proveedor', 'Administrador')),
    rfc VARCHAR(13) NULL,
    razon_social NVARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    email_verified BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NULL
);
```

## Nuevas Funcionalidades

### Autenticación

```typescript
// Login
import { signIn } from 'next-auth/react';

const result = await signIn('credentials', {
  redirect: false,
  email: 'user@example.com',
  password: 'password',
  userType: 'Administrador',
  empresaId: 'empresa-id',
});
```

### Obtener Sesión Actual

```typescript
// En componentes del servidor
import { getCurrentUser } from '@/lib/auth-helpers';

const user = await getCurrentUser();
```

```typescript
// En componentes del cliente
import { useAuth } from '@/app/providers';

const { user } = useAuth();
```

### Registro de Usuarios

```typescript
import { registerUserWithRole } from '@/app/actions/auth';

const result = await registerUserWithRole({
  email: 'nuevo@example.com',
  password: 'password',
  displayName: 'Nombre Usuario',
  role: 'proveedor',
  userType: 'Proveedor',
  empresa: 'empresa-id',
  rfc: 'RFC123456789',
  razonSocial: 'Razón Social',
});
```

### Verificar Permisos

```typescript
import { hasRole } from '@/lib/auth-helpers';

const isAdmin = await hasRole(['admin_super', 'admin_compras']);
```

### Verificar Acceso a Empresa

```typescript
import { checkEmpresaAccess } from '@/lib/auth-helpers';

const hasAccess = await checkEmpresaAccess(userId, empresaId);
```

## Seguridad

### Contraseñas
- Las contraseñas se hashean con bcrypt (salt rounds: 10)
- Mínimo 6 caracteres requeridos
- Nunca se almacenan en texto plano

### Sesiones
- JWT basado en cookies
- Expiración: 30 días
- Secret configurado en variables de entorno
- HttpOnly cookies (no accesible desde JavaScript del cliente)

### SQL Injection
- Todas las consultas usan parámetros preparados
- Validación de entrada en el servidor
- Uso de tipos SQL específicos

## Migración de Componentes

### Antes (Firebase)
```typescript
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

await signInWithEmailAndPassword(auth, email, password);
```

### Después (NextAuth)
```typescript
import { signIn } from 'next-auth/react';

await signIn('credentials', {
  redirect: false,
  email,
  password,
});
```

## Testing

### 1. Crear Usuario de Prueba

Ejecuta este SQL en tu base de datos:

```sql
-- Crear empresa de prueba
INSERT INTO empresas (nombre_comercial, razon_social, rfc)
VALUES ('Empresa Test', 'Empresa Test S.A.', 'TESTRF123456');

DECLARE @empresaId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM empresas WHERE rfc = 'TESTRF123456');

-- Crear usuario admin (password: admin123)
INSERT INTO users (email, password_hash, display_name, role, user_type, is_active)
VALUES (
  'admin@test.com',
  '$2b$10$YourHashedPasswordHere',
  'Admin Test',
  'admin_super',
  'Administrador',
  1
);

DECLARE @userId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM users WHERE email = 'admin@test.com');

-- Asociar usuario con empresa
INSERT INTO usuario_empresa (usuario_id, empresa_id)
VALUES (@userId, @empresaId);
```

Para generar el hash de contraseña, puedes usar:

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10, (err, hash) => console.log(hash));
```

### 2. Probar Login

1. Inicia la aplicación: `npm run dev`
2. Ve a `http://localhost:3000/login`
3. Selecciona tipo de usuario: Administrador
4. Email: `admin@test.com`
5. Password: `admin123`
6. Selecciona la empresa
7. Click en "Iniciar sesión"

## Troubleshooting

### Error: "NEXTAUTH_SECRET not set"
- Asegúrate de tener `NEXTAUTH_SECRET` en `.env.local`
- El secret debe tener mínimo 32 caracteres

### Error de conexión a SQL Server
- Verifica que SQL Server esté corriendo
- Verifica las credenciales en `.env.local`
- Verifica que el puerto 1433 esté abierto
- Si usas localhost, verifica `MSSQL_TRUST_CERT=true`

### Error: "Cannot find module 'mssql'"
- Ejecuta `npm install` para instalar dependencias

### Sesión no persiste
- Verifica que `NEXTAUTH_URL` esté configurado correctamente
- En producción debe ser tu URL real (https://tudominio.com)

## Mantenimiento

### Limpieza de Tokens Expirados

El script incluye un procedimiento almacenado para limpiar tokens:

```sql
EXEC sp_cleanup_expired_tokens;
```

Recomendación: Ejecutar este procedimiento diariamente mediante un SQL Server Agent Job.

### Backup de Base de Datos

Asegúrate de hacer backups regulares de tu base de datos:

```sql
BACKUP DATABASE lacantera_db
TO DISK = 'C:\Backups\lacantera_db.bak'
WITH FORMAT, MEDIANAME = 'SQLServerBackups';
```

## Próximos Pasos

1. **Email Verification**: Implementar verificación de email
2. **Password Reset**: Implementar reseteo de contraseña
3. **Two-Factor Authentication**: Agregar 2FA
4. **OAuth Providers**: Agregar Google, Microsoft, etc.
5. **Audit Logs**: Registrar intentos de login y cambios de permisos

## Soporte

Para preguntas o problemas, contacta al equipo de desarrollo.
