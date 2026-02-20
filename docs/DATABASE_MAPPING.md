# 🗺️ MAPEO DE BASE DE DATOS - TABLAS DEL PORTAL (PP)

## 📋 RESUMEN EJECUTIVO

Este documento mapea **todas las tablas reales que usa el portal** en la base de datos `PP`, basado en el código fuente actual. Las tablas del ERP (`Prov`, `Compra`, `CFDI_Comprobante`, etc.) se acceden por separado vía conexión ERP y no se documentan aquí.

> **Última revisión:** Auditado contra el código fuente real (src/).

---

## ✅ SECCIÓN 1: TABLAS EXISTENTES EN PP (no creadas por nosotros)

### 1.1 USUARIOS Y AUTENTICACIÓN

#### ✅ `WebUsuario` — Tabla principal de usuarios (MASTER)
**Tabla en PP** — Fuente Única de Verdad para autenticación

```sql
SELECT
    UsuarioWeb, Nombre, eMail, Contrasena,
    Rol, Estatus, Empresa, Proveedor
FROM WebUsuario
WHERE Estatus = 'ACTIVO'
```

**Mapeo de campos:**
- `UsuarioWeb` → `session.user.id` (ej: `PROV12345678`)
- `eMail` → `session.user.email`
- `Nombre` → `session.user.name`
- `Contrasena` → hash bcrypt
- `Rol` → `'super-admin'` / `'admin'` / `'proveedor'`
- `Estatus` → `'ACTIVO'` / `'INACTIVO'`
- `Empresa` → empresa por defecto
- `Proveedor` → código ERP del proveedor (ej: `P00443`), NULL si es admin

> ⚠️ **DEPRECADAS** — ya no se usan:
> - ~~`pNetUsuario`~~ — reemplazada por `WebUsuario`
> - ~~`pNetUsuarioTipo`~~ — roles ahora en `WebUsuario.Rol`
> - ~~`pNetUsuarioPassword`~~ — contraseña ahora en `WebUsuario.Contrasena`

### 1.2 EMPRESAS

#### ✅ `Empresa` — Catálogo de empresas
**Tabla en PP**

```sql
SELECT
    Empresa as codigo,
    Nombre as nombre_comercial,
    RFC, Direccion, Telefonos
FROM Empresa
WHERE Estatus = 'ALTA'
```

### 1.3 PROVEEDORES (ERP — solo lectura)

#### ✅ `Prov` — Datos maestros de proveedores
**Tabla del ERP** (`Cantera`, `Cantera_Ajustes`, etc.) — **NO está en PP**

> ⚠️ Siempre se consulta vía `hybridDB.queryERP(tenantId, ...)` o `getERPConnection(empresa)`.
> Nunca se accede desde la conexión del portal (`PP`).

```sql
-- Se ejecuta contra la BD ERP de cada empresa
SELECT Proveedor, RFC, Nombre, Contacto1, Telefonos,
       eMail1, eMail2, Estatus, Direccion
FROM Prov
WHERE Estatus = 'ALTA'
```

- `Proveedor` — código ERP (ej: `P00443`), FK usada en todos los SPs

---

## 🆕 SECCIÓN 2: TABLAS DEL PORTAL CREADAS POR NOSOTROS (PP)

### 2.1 AUTENTICACIÓN Y MAPEO (4 TABLAS)

#### 🆕 `portal_proveedor_mapping` — Mapeo usuario portal ↔ proveedor ERP
**Tabla CRÍTICA** — usada en prácticamente todos los endpoints de proveedor

```sql
CREATE TABLE portal_proveedor_mapping (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    portal_user_id VARCHAR(50) NOT NULL,   -- FK a WebUsuario.UsuarioWeb
    erp_proveedor_code VARCHAR(20) NOT NULL, -- FK a Prov.Proveedor en ERP
    empresa_code VARCHAR(50) NOT NULL,      -- código de empresa (ej: 'la-cantera')
    activo BIT NOT NULL DEFAULT 1,
    permisos NVARCHAR(MAX) NULL,            -- JSON con permisos
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_portal_user (portal_user_id),
    INDEX IDX_erp_code (erp_proveedor_code),
    INDEX IDX_empresa (empresa_code),
    INDEX IDX_activo (activo)
);
```

**Propósito:** Traduce `session.user.id` (`PROV12345678`) al código ERP (`P00443`) para cada empresa. Ver `docs/PROVEEDOR-ID-MAP.md`.

---

#### 🆕 `pNetUsuarioEmpresa` — Relación usuarios-empresas
```sql
CREATE TABLE pNetUsuarioEmpresa (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioWeb VARCHAR(50) NOT NULL,        -- FK a WebUsuario.UsuarioWeb
    Empresa VARCHAR(10) NOT NULL,           -- FK a Empresa.Empresa
    Rol VARCHAR(50) NOT NULL DEFAULT 'Proveedor',
    Activo BIT NOT NULL DEFAULT 1,
    ProveedorID VARCHAR(50) NULL,           -- FK a Prov.Proveedor (ERP)
    DocumentosValidados BIT NOT NULL DEFAULT 0,
    FechaUltimaActividad DATETIME2 NULL,
    FechaAsignacion DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_Usuario_Empresa UNIQUE (UsuarioWeb, Empresa),
    INDEX IDX_Usuario (UsuarioWeb),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Activo (Activo)
);
```

---

#### 🆕 `pNetUsuarioExtension` — Datos adicionales del usuario
```sql
CREATE TABLE pNetUsuarioExtension (
    IDUsuario VARCHAR(50) PRIMARY KEY,      -- FK a WebUsuario.UsuarioWeb
    RFC VARCHAR(13) NULL,
    RazonSocial NVARCHAR(255) NULL,
    Telefono VARCHAR(20) NULL,
    DireccionCalle NVARCHAR(255) NULL,
    DireccionCiudad NVARCHAR(100) NULL,
    DireccionEstado NVARCHAR(100) NULL,
    DireccionCP VARCHAR(10) NULL,
    AvatarURL VARCHAR(500) NULL,
    EmailVerified BIT NOT NULL DEFAULT 0,

    INDEX IDX_RFC (RFC)
);
```

---

#### 🆕 `WebSesionHistorial` — Historial de sesiones/dispositivos
```sql
-- Se crea automáticamente si no existe (IF NOT EXISTS en seguridad.ts)
CREATE TABLE WebSesionHistorial (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId VARCHAR(50) NOT NULL,         -- FK a WebUsuario.UsuarioWeb
    FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
    IPAddress VARCHAR(45) NULL,
    UserAgent NVARCHAR(500) NULL,
    Accion VARCHAR(50) NULL,                -- 'LOGIN', 'LOGOUT', etc.

    INDEX IX_WebSesionHistorial_UsuarioId (UsuarioId, FechaHora DESC)
);
```

---

### 2.2 DOCUMENTACIÓN (3 TABLAS)

#### 🆕 `ProvDocumentos` — Archivos de cumplimiento subidos por proveedores
```sql
CREATE TABLE ProvDocumentos (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocumentoID VARCHAR(100) NOT NULL UNIQUE,
    Proveedor VARCHAR(50) NOT NULL,         -- FK a Prov.Proveedor (ERP)
    UsuarioWeb VARCHAR(50) NOT NULL,        -- FK a WebUsuario.UsuarioWeb
    Empresa VARCHAR(10) NOT NULL,           -- FK a Empresa.Empresa
    TipoDocumento VARCHAR(50) NOT NULL,     -- FK a ProvTiposDocumento.Codigo
    NombreArchivo NVARCHAR(255) NOT NULL,
    ArchivoURL VARCHAR(500) NOT NULL,       -- URL en Azure Blob Storage
    ArchivoTipo VARCHAR(100) NOT NULL,
    ArchivoTamanio BIGINT NOT NULL,
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    Comentarios NVARCHAR(1000) NULL,
    FechaVencimiento DATE NULL,
    RevisadoPor VARCHAR(50) NULL,           -- FK a WebUsuario.UsuarioWeb
    RevisadoPorNombre NVARCHAR(255) NULL,
    FechaRevision DATETIME2 NULL,
    FechaSubida DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Proveedor (Proveedor),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Estatus (Estatus),
    INDEX IDX_FechaVencimiento (FechaVencimiento),
    INDEX IDX_TipoDocumento (TipoDocumento)
);
```

---

#### 🆕 `ProvDocumentosEstado` — Estado de revisión de documentos del ERP (AnexoCta)
**Diferente a `ProvDocumentos`** — esta tabla guarda el estado portal de documentos que vienen del ERP (`AnexoCta`), no de archivos subidos por el proveedor.

```sql
-- Se crea automáticamente si no existe (IF NOT EXISTS en documentos/route.ts)
CREATE TABLE ProvDocumentosEstado (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    DocumentoIDR VARCHAR(100) NOT NULL,     -- ID del documento en ERP (AnexoCta)
    ProveedorCodigo VARCHAR(50) NOT NULL,   -- FK a Prov.Proveedor (ERP)
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    Observaciones NVARCHAR(1000) NULL,
    RevisadoPor VARCHAR(50) NULL,           -- FK a WebUsuario.UsuarioWeb
    FechaRevision DATETIME2 NULL,

    INDEX IDX_DocumentoIDR (DocumentoIDR),
    INDEX IDX_Proveedor (ProveedorCodigo)
);
```

---

#### 🆕 `ProvTiposDocumento` — Catálogo de tipos de documentos
```sql
CREATE TABLE ProvTiposDocumento (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre NVARCHAR(255) NOT NULL,
    Descripcion NVARCHAR(500) NULL,
    RequeridoPara NVARCHAR(MAX) NULL,       -- JSON: ["suministros","servicios"]
    VigenciaDias INT NULL,                  -- NULL = no caduca
    OrdenPresentacion INT NOT NULL DEFAULT 0,
    Activo BIT NOT NULL DEFAULT 1,

    INDEX IDX_Codigo (Codigo),
    INDEX IDX_Activo (Activo)
);
```

---

### 2.3 MENSAJERÍA (2 TABLAS)

#### 🆕 `WebConversacion` — Conversaciones de mensajería
```sql
-- Se crea automáticamente si no existe (IF NOT EXISTS en sqlserver-pnet.ts)
CREATE TABLE WebConversacion (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Empresa VARCHAR(10) NULL,
    Participantes NVARCHAR(MAX) NULL,       -- string separado por comas de UsuarioWeb IDs
    ParticipantesInfo NVARCHAR(MAX) NULL,   -- JSON con nombres/roles
    Asunto NVARCHAR(500) NULL,
    UltimoMensaje NVARCHAR(1000) NULL,
    UltimoMensajeFecha DATETIME NULL,
    Activa BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL,

    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Activa (Activa),
    INDEX IDX_Fecha (UltimoMensajeFecha DESC)
);
```

> ⚠️ Renombrada de ~~`pNetConversaciones`~~ → `WebConversacion`

---

#### 🆕 `WebMensaje` — Mensajes dentro de conversaciones
```sql
-- Se crea automáticamente si no existe (IF NOT EXISTS en sqlserver-pnet.ts)
CREATE TABLE WebMensaje (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ConversacionId UNIQUEIDENTIFIER NOT NULL, -- FK a WebConversacion.ID
    RemitenteId VARCHAR(50) NOT NULL,        -- FK a WebUsuario.UsuarioWeb
    RemitenteNombre NVARCHAR(255) NULL,
    RemitenteRol VARCHAR(50) NULL,
    DestinatarioId VARCHAR(50) NULL,         -- FK a WebUsuario.UsuarioWeb
    DestinatarioNombre NVARCHAR(255) NULL,
    Mensaje NVARCHAR(MAX) NOT NULL,
    Asunto NVARCHAR(500) NULL,
    ArchivosJSON NVARCHAR(MAX) NULL,         -- JSON array de archivos adjuntos
    Leido BIT NOT NULL DEFAULT 0,
    FechaLectura DATETIME NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Conversacion_Fecha (ConversacionId, CreatedAt),
    INDEX IDX_Remitente (RemitenteId),
    INDEX IDX_Destinatario (DestinatarioId),
    INDEX IDX_Leido (Leido)
);
```

> ⚠️ Renombrada de ~~`pNetMensajes`~~ → `WebMensaje`

---

### 2.4 NOTIFICACIONES (2 TABLAS)

#### 🆕 `WebNotificacion` — Notificaciones del sistema (admin/general)
```sql
-- Se crea automáticamente si no existe (IF NOT EXISTS en sqlserver-pnet.ts)
CREATE TABLE WebNotificacion (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UsuarioId VARCHAR(50) NOT NULL,         -- FK a WebUsuario.UsuarioWeb
    UsuarioNombre NVARCHAR(200) NULL,
    Empresa VARCHAR(10) NULL,
    Tipo VARCHAR(50) NOT NULL,
    Titulo NVARCHAR(255) NOT NULL,
    Mensaje NVARCHAR(1000) NOT NULL,
    Link VARCHAR(500) NULL,
    DatosJSON NVARCHAR(MAX) NULL,
    Leida BIT NOT NULL DEFAULT 0,
    FechaLectura DATETIME NULL,
    FechaEnvioEmail DATETIME NULL,
    Prioridad NVARCHAR(20) NOT NULL DEFAULT 'normal',
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Usuario_Leida (UsuarioId, Leida),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Fecha (CreatedAt DESC)
);
```

> ⚠️ Renombrada de ~~`pNetNotificaciones`~~ → `WebNotificacion`

---

#### 🆕 `proveedor_notificaciones` — Notificaciones específicas del flujo proveedor
```sql
CREATE TABLE proveedor_notificaciones (
    -- Tabla usada en /api/proveedor/notificaciones y /api/proveedor/facturas/upload
    -- para notificaciones del workflow de facturas (subida, aprobación, rechazo)
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    proveedor_user_id VARCHAR(50) NOT NULL,  -- FK a WebUsuario.UsuarioWeb
    empresa_code VARCHAR(50) NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo NVARCHAR(255) NOT NULL,
    mensaje NVARCHAR(1000) NOT NULL,
    leida BIT NOT NULL DEFAULT 0,
    datos_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_proveedor_leida (proveedor_user_id, leida),
    INDEX IDX_fecha (created_at DESC)
);
```

---

### 2.5 AUDITORÍA (1 TABLA)

#### 🆕 `pNetAuditLog` — Registro de auditoría
```sql
CREATE TABLE pNetAuditLog (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UsuarioWeb VARCHAR(50) NOT NULL,        -- FK a WebUsuario.UsuarioWeb
    UsuarioNombre NVARCHAR(255) NOT NULL,
    Empresa VARCHAR(10) NULL,
    Accion VARCHAR(100) NOT NULL,
    TablaAfectada VARCHAR(100) NOT NULL,
    RegistroID VARCHAR(100) NOT NULL,
    ValoresAnterioresJSON NVARCHAR(MAX) NULL,
    ValoresNuevosJSON NVARCHAR(MAX) NULL,
    IPAddress VARCHAR(45) NULL,
    UserAgent VARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Usuario_Fecha (UsuarioWeb, CreatedAt DESC),
    INDEX IDX_Tabla_Fecha (TablaAfectada, CreatedAt DESC),
    INDEX IDX_Accion (Accion),
    INDEX IDX_Fecha (CreatedAt DESC)
);
```

---

### 2.6 CONFIGURACIÓN Y TOKENS (3 TABLAS)

#### 🆕 `configuracion_empresa` — Configuración por empresa
```sql
CREATE TABLE configuracion_empresa (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    empresa_code VARCHAR(10) NOT NULL,      -- FK a Empresa.Empresa
    -- Campos de configuración (logo, colores, email, etc.)
    logo_url VARCHAR(500) NULL,
    nombre_portal NVARCHAR(255) NULL,
    email_soporte VARCHAR(100) NULL,
    configuracion_json NVARCHAR(MAX) NULL,  -- JSON con config adicional
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NULL,

    CONSTRAINT UQ_empresa_code UNIQUE (empresa_code),
    INDEX IDX_empresa (empresa_code)
);
```

> ⚠️ Renombrada de ~~`pNetConfiguracion`~~ → `configuracion_empresa`

---

#### 🆕 `PasswordResetTokens` — Tokens de reset de contraseña
```sql
CREATE TABLE PasswordResetTokens (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email VARCHAR(100) NOT NULL,
    TokenHash VARCHAR(255) NOT NULL UNIQUE,
    TipoUsuario VARCHAR(50) NULL,
    ExpiresAt DATETIME2 NOT NULL,
    IPAddress VARCHAR(45) NULL,
    Usado BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Email (Email),
    INDEX IDX_Token (TokenHash),
    INDEX IDX_Expires (ExpiresAt)
);
```

> ⚠️ Renombrada de ~~`pNetPasswordResetTokens`~~ → `PasswordResetTokens`

---

#### 🆕 `EmailChangeTokens` — Tokens para cambio de email
```sql
CREATE TABLE EmailChangeTokens (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId VARCHAR(50) NOT NULL,            -- FK a WebUsuario.UsuarioWeb
    TipoUsuario VARCHAR(50) NULL,
    EmailActual VARCHAR(100) NOT NULL,
    EmailNuevo VARCHAR(100) NOT NULL,
    TokenHash VARCHAR(255) NOT NULL UNIQUE,
    ExpiresAt DATETIME2 NOT NULL,
    IPAddress VARCHAR(45) NULL,
    Confirmado BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_UserId (UserId),
    INDEX IDX_Token (TokenHash),
    INDEX IDX_Expires (ExpiresAt)
);
```

> ⚠️ Reemplaza a ~~`pNetVerificationTokens`~~ (funcionalidad diferente — específica para cambio de email)

---

### 2.7 CATEGORÍAS DE PROVEEDOR (1 TABLA)

#### 🆕 `ProvCategoria` — Categorías de proveedores
```sql
CREATE TABLE ProvCategoria (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(255) NULL,
    DocumentosRequeridosJSON NVARCHAR(MAX) NULL, -- JSON array
    Activo BIT NOT NULL DEFAULT 1,

    INDEX IDX_Codigo (Codigo)
);
```

---

### 2.8 FACTURAS Y RELACIONES (3 TABLAS)

#### 🆕 `ProvFacturas` — Facturas subidas por proveedores al portal
```sql
CREATE TABLE ProvFacturas (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FacturaID VARCHAR(100) NOT NULL UNIQUE,
    Proveedor VARCHAR(50) NOT NULL,         -- código ERP (FK a Prov en ERP)
    Empresa VARCHAR(10) NOT NULL,           -- FK a Empresa.Empresa
    -- CFDI
    UUID VARCHAR(36) NOT NULL UNIQUE,
    Serie VARCHAR(10) NULL,
    Folio VARCHAR(50) NOT NULL,
    Fecha DATETIME2 NOT NULL,
    Subtotal DECIMAL(18,2) NOT NULL,
    IVA DECIMAL(18,2) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    Moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
    XMLURL VARCHAR(500) NOT NULL,           -- Azure Blob Storage
    PDFURL VARCHAR(500) NOT NULL,           -- Azure Blob Storage
    -- Validación SAT
    ValidadaSAT BIT NOT NULL DEFAULT 0,
    EstatusSAT VARCHAR(50) NULL,
    FechaValidacionSAT DATETIME2 NULL,
    -- Workflow
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    MotivoRechazo NVARCHAR(1000) NULL,
    RevisadoPor VARCHAR(50) NULL,           -- FK a WebUsuario.UsuarioWeb
    FechaRevision DATETIME2 NULL,
    Observaciones NVARCHAR(1000) NULL,
    -- Pago
    Pagada BIT NOT NULL DEFAULT 0,
    FechaPago DATETIME2 NULL,
    -- ERP
    IntelisisID VARCHAR(100) NULL,
    -- Metadata
    SubidoPor VARCHAR(50) NOT NULL,         -- FK a WebUsuario.UsuarioWeb
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    INDEX IDX_UUID (UUID),
    INDEX IDX_Proveedor_Estatus (Proveedor, Estatus),
    INDEX IDX_Empresa_Estatus (Empresa, Estatus),
    INDEX IDX_Fecha (Fecha DESC),
    INDEX IDX_Estatus (Estatus)
);
```

---

#### 🆕 `proveedor_facturas_ordenes` — Relación factura ↔ órdenes de compra
```sql
CREATE TABLE proveedor_facturas_ordenes (
    -- Vincula una factura del portal con una o varias OC del ERP
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    factura_id VARCHAR(100) NOT NULL,       -- FK a ProvFacturas.FacturaID
    orden_id VARCHAR(100) NOT NULL,         -- ID de la OC en el ERP
    empresa_code VARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_factura (factura_id),
    INDEX IDX_orden (orden_id)
);
```

---

#### 🆕 `ProvComplementosPago` — Complementos de pago CFDI
```sql
CREATE TABLE ProvComplementosPago (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ComplementoID VARCHAR(100) NOT NULL UNIQUE,
    EmisorRFC VARCHAR(13) NOT NULL,
    EmisorRazonSocial NVARCHAR(255) NOT NULL,
    ReceptorRFC VARCHAR(13) NOT NULL,
    ReceptorRazonSocial NVARCHAR(255) NOT NULL,
    Proveedor VARCHAR(50) NOT NULL,         -- código ERP
    Empresa VARCHAR(10) NOT NULL,
    UUID VARCHAR(36) NOT NULL UNIQUE,
    Serie VARCHAR(10) NULL,
    Folio VARCHAR(50) NOT NULL,
    Fecha DATETIME2 NOT NULL,
    FormaPago VARCHAR(50) NOT NULL,
    MetodoPago VARCHAR(10) NOT NULL,
    Moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
    Monto DECIMAL(18,2) NOT NULL,
    XMLURL VARCHAR(500) NOT NULL,
    PDFURL VARCHAR(500) NULL,
    FacturasRelacionadasJSON NVARCHAR(MAX) NOT NULL,
    ValidadoSAT BIT NOT NULL DEFAULT 0,
    EstatusSAT VARCHAR(50) NULL,
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    IntelisisID VARCHAR(100) NULL,
    SubidoPor VARCHAR(50) NOT NULL,         -- FK a WebUsuario.UsuarioWeb
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    INDEX IDX_UUID (UUID),
    INDEX IDX_Proveedor_Fecha (Proveedor, Fecha DESC),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Estatus (Estatus)
);
```

---

## 📊 RESUMEN DE TABLAS

### Tablas PP pre-existentes (no creadas por nosotros):
| Tabla | Propósito |
|-------|-----------|
| `WebUsuario` | Auth, roles, contraseñas bcrypt |
| `Empresa` | Catálogo de empresas |

### Tablas ERP (solo lectura, nunca desde PP):
| Tabla | BD | Propósito |
|-------|----|-----------|
| `Prov` | Cantera/ERP | Datos maestros de proveedores |

### Tablas del portal creadas por nosotros (PP):
| # | Tabla | Propósito |
|---|-------|-----------|
| 1 | `portal_proveedor_mapping` | Vincula ID portal ↔ código ERP por empresa (**CRÍTICA**) |
| 2 | `pNetUsuarioEmpresa` | Relación usuario ↔ empresa con rol |
| 3 | `pNetUsuarioExtension` | Datos extra del usuario (RFC, dirección, etc.) |
| 4 | `WebSesionHistorial` | Historial de sesiones y dispositivos |
| 5 | `ProvDocumentos` | Archivos de cumplimiento subidos por proveedores |
| 6 | `ProvDocumentosEstado` | Estado portal de documentos del ERP (AnexoCta) |
| 7 | `ProvTiposDocumento` | Catálogo de tipos de documento |
| 8 | `WebConversacion` | Conversaciones de mensajería |
| 9 | `WebMensaje` | Mensajes de cada conversación |
| 10 | `WebNotificacion` | Notificaciones generales del sistema |
| 11 | `proveedor_notificaciones` | Notificaciones del workflow de facturas |
| 12 | `pNetAuditLog` | Auditoría de acciones |
| 13 | `configuracion_empresa` | Configuración por empresa (logo, email, etc.) |
| 14 | `PasswordResetTokens` | Tokens de recuperación de contraseña |
| 15 | `EmailChangeTokens` | Tokens de cambio de email |
| 16 | `ProvCategoria` | Categorías de proveedores |
| 17 | `ProvFacturas` | Facturas subidas al portal |
| 18 | `proveedor_facturas_ordenes` | Relación factura ↔ órdenes de compra |
| 19 | `ProvComplementosPago` | Complementos de pago CFDI |

**TOTAL: 19 tablas en PP + 2 pre-existentes + 1 ERP (solo lectura)**

---

### Tablas documentadas anteriormente que ya NO se usan:
| Tabla (nombre viejo) | Reemplazada por |
|---------------------|----------------|
| ~~`pNetConversaciones`~~ | `WebConversacion` |
| ~~`pNetMensajes`~~ | `WebMensaje` |
| ~~`pNetNotificaciones`~~ | `WebNotificacion` + `proveedor_notificaciones` |
| ~~`pNetSesiones`~~ | `WebSesionHistorial` |
| ~~`pNetPasswordResetTokens`~~ | `PasswordResetTokens` |
| ~~`pNetVerificationTokens`~~ | `EmailChangeTokens` |
| ~~`pNetConfiguracion`~~ | `configuracion_empresa` |
| ~~`pNetTiposNotificacion`~~ | No se usa (eliminada) |
| ~~`ProvExtension`~~ | No se usa (eliminada) |

### Tablas legacy en archivos obsoletos (`sqlserver.ts`, `auth-helpers.ts`) — NO en uso activo:
`users`, `empresas`, `ordenes_compra`, `facturas`, `usuario_empresa`, `usuarios_empresas`, `proveedores_documentacion`

---

## 📝 NOTAS IMPORTANTES

1. **NO modificar tablas pre-existentes** (`WebUsuario`, `Empresa`)
2. **`Prov` solo se accede desde conexión ERP**, nunca desde PP
3. Varias tablas se **auto-crean** con `IF NOT EXISTS` en el código: `WebConversacion`, `WebMensaje`, `WebNotificacion`, `WebSesionHistorial`, `ProvDocumentosEstado`
4. **`portal_proveedor_mapping`** es la tabla más crítica del portal — sin ella ningún endpoint de proveedor funciona
5. Para el mapeo de IDs ver `docs/PROVEEDOR-ID-MAP.md`
