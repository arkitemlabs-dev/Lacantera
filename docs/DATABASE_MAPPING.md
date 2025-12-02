# 🗺️ MAPEO DE BASE DE DATOS - ESPECIFICACIÓN vs PLANTILLAS EXISTENTES

## 📋 RESUMEN EJECUTIVO

Este documento mapea la especificación de Claude con las **plantillas pNet** existentes en la base de datos PP, reutilizando al máximo las tablas del ERP y creando solo las necesarias.

---

## ✅ SECCIÓN 1: TABLAS EXISTENTES A REUTILIZAR (5 TABLAS)

### 1.1 USUARIOS Y AUTENTICACIÓN

#### ✅ `pNetUsuario` → Reemplaza `users` (MASTER)
**Tabla existente en PP** - Usar tal cual

```sql
-- ESTRUCTURA EXISTENTE (NO MODIFICAR)
SELECT * FROM pNetUsuario
-- Campos: IDUsuario, Usuario, IDUsuarioTipo, eMail, Nombre, Estatus, Empresa, FechaAlta, UltimaModificacion
```

**Mapeo de campos:**
- `IDUsuario` → `users.id`
- `eMail` → `users.email`
- `Nombre` → `users.display_name`
- `IDUsuarioTipo` → `users.role` (1=Admin, 4=Proveedor)
- `Estatus` → `users.status` (ACTIVO/INACTIVO)
- `Empresa` → `users.empresa_id` (relación con Empresa)

**Campos adicionales necesarios (agregar como columnas opcionales o tabla extendida):**
- `rfc`, `razon_social`, `telefono`, `direccion_*`, `avatar_url`

#### ✅ `pNetUsuarioTipo` → Reemplaza catálogo de roles
**Tabla existente en PP** - Usar tal cual

```sql
SELECT * FROM pNetUsuarioTipo
-- Valores conocidos: 1 = Intelisis/Admin, 4 = Proveedor
```

#### ✅ `pNetUsuarioPassword` → Tabla de contraseñas
**Tabla creada por nosotros** - Ya existe

```sql
SELECT * FROM pNetUsuarioPassword
-- Campos: IDUsuario, PasswordHash, CreatedAt, UpdatedAt
```

### 1.2 EMPRESAS

#### ✅ `Empresa` → Reemplaza `empresas` (MASTER)
**Tabla existente en PP** - Usar con adaptaciones

```sql
-- ESTRUCTURA EXISTENTE
SELECT
    Empresa as codigo,
    Nombre as nombre_comercial,
    RFC as rfc,
    Direccion as direccion,
    Telefonos as telefono
FROM Empresa
WHERE Estatus = 'ALTA'
```

**Campos que faltan (agregar o tabla extendida):**
- `razon_social` (puede usar Nombre)
- `email`, `logo_url`
- `database_name`, `connection_string_key` (para routing multi-BD)
- `erp_connection_config`, `timezone`

### 1.3 PROVEEDORES

#### ✅ `Prov` → Reemplaza `proveedores`
**Tabla existente en PP** - Usar con adaptaciones

```sql
SELECT
    Proveedor as proveedor_id,
    RFC as rfc,
    Nombre as razon_social,
    -- Más campos disponibles en Prov del ERP
FROM Prov
WHERE Estatus = 'ALTA'
```

**Campos del ERP que podemos usar:**
- Contacto, Telefono, EMail
- DireccionFiscal
- Banco, CLABE, NumeroCuenta

**Campos adicionales necesarios (tabla extendida):**
- `categoria_proveedor`, `status_portal`, `documentos_completos`
- `fecha_ultima_actividad`, `ultima_sincronizacion_erp`

---

## 🆕 SECCIÓN 2: TABLAS NUEVAS NECESARIAS (19 TABLAS)

### 2.1 AUTENTICACIÓN Y SESIONES (3 TABLAS)

#### 🆕 `pNetUsuarioEmpresa` → Relación usuarios-empresas
```sql
CREATE TABLE pNetUsuarioEmpresa (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    Rol VARCHAR(50) NOT NULL DEFAULT 'Proveedor',
    Activo BIT NOT NULL DEFAULT 1,
    ProveedorID VARCHAR(50) NULL, -- FK a Prov.Proveedor (si es proveedor)
    DocumentosValidados BIT NOT NULL DEFAULT 0,
    FechaUltimaActividad DATETIME2 NULL,
    ConfiguracionesJSON NVARCHAR(MAX) NULL,
    FechaAsignacion DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetUsuarioEmpresa_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario),
    CONSTRAINT FK_pNetUsuarioEmpresa_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    CONSTRAINT UQ_Usuario_Empresa UNIQUE (IDUsuario, Empresa),
    INDEX IDX_Usuario (IDUsuario),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Activo (Activo)
);
```

**Propósito:** Permite que usuarios accedan a múltiples empresas
**Registros estimados:** ~3,000

#### 🆕 `pNetSesiones` → Control de sesiones
```sql
CREATE TABLE pNetSesiones (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    SessionToken VARCHAR(255) NOT NULL UNIQUE,
    ExpiresAt DATETIME2 NOT NULL,
    IPAddress VARCHAR(45) NULL,
    UserAgent VARCHAR(500) NULL,
    EmpresaActiva VARCHAR(10) NULL, -- FK a Empresa.Empresa
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetSesiones_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario) ON DELETE CASCADE,
    CONSTRAINT FK_pNetSesiones_Empresa FOREIGN KEY (EmpresaActiva)
        REFERENCES Empresa(Empresa),
    INDEX IDX_Usuario (IDUsuario),
    INDEX IDX_Token (SessionToken),
    INDEX IDX_Expires (ExpiresAt)
);
```

#### 🆕 `pNetUsuarioExtension` → Datos adicionales de usuario
```sql
CREATE TABLE pNetUsuarioExtension (
    IDUsuario INT PRIMARY KEY, -- FK a pNetUsuario.IDUsuario
    RFC VARCHAR(13) NULL,
    RazonSocial NVARCHAR(255) NULL,
    Telefono VARCHAR(20) NULL,
    DireccionCalle NVARCHAR(255) NULL,
    DireccionCiudad NVARCHAR(100) NULL,
    DireccionEstado NVARCHAR(100) NULL,
    DireccionCP VARCHAR(10) NULL,
    AvatarURL VARCHAR(500) NULL,
    EmailVerified BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_pNetUsuarioExtension_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario) ON DELETE CASCADE,
    INDEX IDX_RFC (RFC)
);
```

### 2.2 DOCUMENTACIÓN (2 TABLAS)

#### 🆕 `ProvDocumentos` → Documentos de proveedores
```sql
CREATE TABLE ProvDocumentos (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocumentoID VARCHAR(100) NOT NULL UNIQUE,
    Proveedor VARCHAR(50) NOT NULL, -- FK a Prov.Proveedor
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    TipoDocumento VARCHAR(50) NOT NULL, -- FK a ProvTiposDocumento.Codigo
    NombreArchivo NVARCHAR(255) NOT NULL,
    ArchivoURL VARCHAR(500) NOT NULL,
    ArchivoTipo VARCHAR(100) NOT NULL,
    ArchivoTamanio BIGINT NOT NULL,
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    Comentarios NVARCHAR(1000) NULL,
    FechaVencimiento DATE NULL,
    RevisadoPor INT NULL, -- FK a pNetUsuario.IDUsuario
    RevisadoPorNombre NVARCHAR(255) NULL,
    FechaRevision DATETIME2 NULL,
    FechaSubida DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_ProvDocumentos_Proveedor FOREIGN KEY (Proveedor)
        REFERENCES Prov(Proveedor),
    CONSTRAINT FK_ProvDocumentos_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario),
    CONSTRAINT FK_ProvDocumentos_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    INDEX IDX_Proveedor (Proveedor),
    INDEX IDX_Usuario (IDUsuario),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Estatus (Estatus),
    INDEX IDX_FechaVencimiento (FechaVencimiento),
    INDEX IDX_TipoDocumento (TipoDocumento)
);
```

#### 🆕 `ProvTiposDocumento` → Catálogo de tipos de documentos
```sql
CREATE TABLE ProvTiposDocumento (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre NVARCHAR(255) NOT NULL,
    Descripcion NVARCHAR(500) NULL,
    RequeridoPara NVARCHAR(MAX) NULL, -- JSON: ["suministros","servicios"]
    VigenciaDias INT NULL, -- NULL = no caduca
    OrdenPresentacion INT NOT NULL DEFAULT 0,
    Activo BIT NOT NULL DEFAULT 1,

    INDEX IDX_Codigo (Codigo),
    INDEX IDX_Activo (Activo)
);
```

### 2.3 MENSAJERÍA (2 TABLAS)

#### 🆕 `pNetConversaciones` → Conversaciones
```sql
CREATE TABLE pNetConversaciones (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ConversacionID VARCHAR(100) NOT NULL UNIQUE,
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    ParticipantesJSON NVARCHAR(MAX) NOT NULL, -- JSON con IDs
    Asunto NVARCHAR(500) NOT NULL,
    UltimoMensaje NVARCHAR(1000) NULL,
    UltimoMensajeFecha DATETIME2 NULL,
    UltimoMensajeRemitente INT NULL, -- FK a pNetUsuario.IDUsuario
    UltimoMensajeRemitenteNombre NVARCHAR(255) NULL,
    Activa BIT NOT NULL DEFAULT 1,
    NoLeidosJSON NVARCHAR(MAX) NULL, -- JSON con conteos
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT FK_pNetConversaciones_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Activa (Activa),
    INDEX IDX_Fecha (UltimoMensajeFecha DESC)
);
```

#### 🆕 `pNetMensajes` → Mensajes
```sql
CREATE TABLE pNetMensajes (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MensajeID VARCHAR(100) NOT NULL UNIQUE,
    ConversacionID UNIQUEIDENTIFIER NOT NULL, -- FK a pNetConversaciones.ID
    RemitenteID INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    RemitenteNombre NVARCHAR(255) NOT NULL,
    RemitenteRol VARCHAR(50) NOT NULL,
    DestinatarioID INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    DestinatarioNombre NVARCHAR(255) NOT NULL,
    Mensaje NVARCHAR(MAX) NOT NULL,
    Asunto NVARCHAR(500) NULL,
    ArchivosJSON NVARCHAR(MAX) NULL, -- JSON array
    Leido BIT NOT NULL DEFAULT 0,
    FechaLectura DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetMensajes_Conversacion FOREIGN KEY (ConversacionID)
        REFERENCES pNetConversaciones(ID) ON DELETE CASCADE,
    INDEX IDX_Conversacion_Fecha (ConversacionID, CreatedAt),
    INDEX IDX_Remitente (RemitenteID),
    INDEX IDX_Leido (Leido),
    INDEX IDX_Fecha (CreatedAt DESC)
);
```

### 2.4 NOTIFICACIONES Y AUDITORÍA (3 TABLAS)

#### 🆕 `pNetNotificaciones` → Notificaciones
```sql
CREATE TABLE pNetNotificaciones (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    NotificacionID VARCHAR(100) NOT NULL UNIQUE,
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    UsuarioNombre NVARCHAR(255) NOT NULL,
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    Tipo VARCHAR(50) NOT NULL,
    Titulo NVARCHAR(255) NOT NULL,
    Mensaje NVARCHAR(1000) NOT NULL,
    Link VARCHAR(500) NULL,
    DatosJSON NVARCHAR(MAX) NULL,
    Leida BIT NOT NULL DEFAULT 0,
    FechaLectura DATETIME2 NULL,
    EmailEnviado BIT NOT NULL DEFAULT 0,
    FechaEnvioEmail DATETIME2 NULL,
    Prioridad VARCHAR(20) NOT NULL DEFAULT 'normal',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetNotificaciones_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario),
    CONSTRAINT FK_pNetNotificaciones_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    INDEX IDX_Usuario_Leida (IDUsuario, Leida),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Tipo (Tipo),
    INDEX IDX_Fecha (CreatedAt DESC),
    INDEX IDX_Prioridad (Prioridad)
);
```

#### 🆕 `pNetAuditLog` → Auditoría
```sql
CREATE TABLE pNetAuditLog (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    UsuarioNombre NVARCHAR(255) NOT NULL,
    Empresa VARCHAR(10) NULL, -- FK a Empresa.Empresa
    Accion VARCHAR(100) NOT NULL,
    TablaAfectada VARCHAR(100) NOT NULL,
    RegistroID VARCHAR(100) NOT NULL,
    ValoresAnterioresJSON NVARCHAR(MAX) NULL,
    ValoresNuevosJSON NVARCHAR(MAX) NULL,
    IPAddress VARCHAR(45) NULL,
    UserAgent VARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IDX_Usuario_Fecha (IDUsuario, CreatedAt DESC),
    INDEX IDX_Tabla_Fecha (TablaAfectada, CreatedAt DESC),
    INDEX IDX_Accion (Accion),
    INDEX IDX_Fecha (CreatedAt DESC)
);
```

#### 🆕 `pNetTiposNotificacion` → Catálogo de notificaciones
```sql
CREATE TABLE pNetTiposNotificacion (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre NVARCHAR(100) NOT NULL,
    Descripcion NVARCHAR(255) NULL,
    TemplateTitulo NVARCHAR(255) NULL,
    TemplateMensaje NVARCHAR(1000) NULL,
    ColorBadge VARCHAR(20) NOT NULL DEFAULT '#blue',
    Activo BIT NOT NULL DEFAULT 1,

    INDEX IDX_Codigo (Codigo)
);
```

### 2.5 CONFIGURACIÓN Y TOKENS (4 TABLAS)

#### 🆕 `pNetConfiguracion` → Configuración por empresa
```sql
CREATE TABLE pNetConfiguracion (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    Clave VARCHAR(100) NOT NULL,
    Valor NVARCHAR(MAX) NOT NULL,
    Descripcion NVARCHAR(500) NULL,
    TipoDato VARCHAR(50) NOT NULL DEFAULT 'string',
    Categoria VARCHAR(100) NOT NULL DEFAULT 'general',
    Modificable BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT FK_pNetConfiguracion_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    CONSTRAINT UQ_Empresa_Clave UNIQUE (Empresa, Clave),
    INDEX IDX_Empresa_Clave (Empresa, Clave),
    INDEX IDX_Categoria (Categoria)
);
```

#### 🆕 `pNetVerificationTokens` → Tokens de verificación
```sql
CREATE TABLE pNetVerificationTokens (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    Token VARCHAR(255) NOT NULL UNIQUE,
    TipoToken VARCHAR(50) NOT NULL DEFAULT 'email_verification',
    ExpiresAt DATETIME2 NOT NULL,
    Usado BIT NOT NULL DEFAULT 0,
    FechaUso DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetVerificationTokens_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario),
    INDEX IDX_Usuario (IDUsuario),
    INDEX IDX_Token (Token),
    INDEX IDX_Expires (ExpiresAt)
);
```

#### 🆕 `pNetPasswordResetTokens` → Tokens de reset de contraseña
```sql
CREATE TABLE pNetPasswordResetTokens (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IDUsuario INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    Token VARCHAR(255) NOT NULL UNIQUE,
    ExpiresAt DATETIME2 NOT NULL,
    UsedAt DATETIME2 NULL,
    IPSolicitud VARCHAR(45) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_pNetPasswordResetTokens_Usuario FOREIGN KEY (IDUsuario)
        REFERENCES pNetUsuario(IDUsuario),
    INDEX IDX_Usuario (IDUsuario),
    INDEX IDX_Token (Token),
    INDEX IDX_Expires (ExpiresAt)
);
```

#### 🆕 `ProvCategoria` → Categorías de proveedores
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

### 2.6 PROVEEDORES EXTENDIDOS (1 TABLA)

#### 🆕 `ProvExtension` → Datos adicionales del portal
```sql
CREATE TABLE ProvExtension (
    Proveedor VARCHAR(50) PRIMARY KEY, -- FK a Prov.Proveedor
    Categoria VARCHAR(50) NULL, -- FK a ProvCategoria.Codigo
    StatusPortal VARCHAR(50) NOT NULL DEFAULT 'activo',
    DocumentosCompletos BIT NOT NULL DEFAULT 0,
    FechaUltimaActividad DATETIME2 NULL,
    UltimaSincronizacionERP DATETIME2 NULL,
    ConfiguracionesJSON NVARCHAR(MAX) NULL,

    CONSTRAINT FK_ProvExtension_Proveedor FOREIGN KEY (Proveedor)
        REFERENCES Prov(Proveedor),
    INDEX IDX_Categoria (Categoria),
    INDEX IDX_Status (StatusPortal),
    INDEX IDX_DocsCompletos (DocumentosCompletos)
);
```

### 2.7 FACTURAS Y COMPLEMENTOS (2 TABLAS)

**NOTA:** Estas tablas se integrarán con el ERP cuando esté listo el módulo de facturación

#### 🆕 `ProvFacturas` → Facturas de proveedores
```sql
CREATE TABLE ProvFacturas (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FacturaID VARCHAR(100) NOT NULL UNIQUE,
    Proveedor VARCHAR(50) NOT NULL, -- FK a Prov.Proveedor
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    -- CFDI
    UUID VARCHAR(36) NOT NULL UNIQUE,
    Serie VARCHAR(10) NULL,
    Folio VARCHAR(50) NOT NULL,
    Fecha DATETIME2 NOT NULL,
    Subtotal DECIMAL(18,2) NOT NULL,
    IVA DECIMAL(18,2) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    Moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
    XMLURL VARCHAR(500) NOT NULL,
    PDFURL VARCHAR(500) NOT NULL,
    -- Validación SAT
    ValidadaSAT BIT NOT NULL DEFAULT 0,
    EstatusSAT VARCHAR(50) NULL,
    FechaValidacionSAT DATETIME2 NULL,
    -- Workflow
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    MotivoRechazo NVARCHAR(1000) NULL,
    RevisadoPor INT NULL, -- FK a pNetUsuario.IDUsuario
    FechaRevision DATETIME2 NULL,
    Observaciones NVARCHAR(1000) NULL,
    -- Pago
    Pagada BIT NOT NULL DEFAULT 0,
    FechaPago DATETIME2 NULL,
    ComplementoPagoID UNIQUEIDENTIFIER NULL,
    -- ERP
    IntelisisID VARCHAR(100) NULL,
    CuentaContable VARCHAR(50) NULL,
    -- Metadata
    SubidoPor INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT FK_ProvFacturas_Proveedor FOREIGN KEY (Proveedor)
        REFERENCES Prov(Proveedor),
    CONSTRAINT FK_ProvFacturas_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    INDEX IDX_UUID (UUID),
    INDEX IDX_Proveedor_Estatus (Proveedor, Estatus),
    INDEX IDX_Empresa_Estatus (Empresa, Estatus),
    INDEX IDX_Folio (Folio),
    INDEX IDX_Fecha (Fecha DESC),
    INDEX IDX_Estatus (Estatus),
    INDEX IDX_SAT (EstatusSAT)
);
```

#### 🆕 `ProvComplementosPago` → Complementos de pago
```sql
CREATE TABLE ProvComplementosPago (
    ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ComplementoID VARCHAR(100) NOT NULL UNIQUE,
    EmisorRFC VARCHAR(13) NOT NULL,
    EmisorRazonSocial NVARCHAR(255) NOT NULL,
    ReceptorRFC VARCHAR(13) NOT NULL,
    ReceptorRazonSocial NVARCHAR(255) NOT NULL,
    Proveedor VARCHAR(50) NOT NULL, -- FK a Prov.Proveedor
    Empresa VARCHAR(10) NOT NULL, -- FK a Empresa.Empresa
    -- CFDI
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
    ComprobanteURL VARCHAR(500) NULL,
    -- Facturas relacionadas
    FacturasRelacionadasJSON NVARCHAR(MAX) NOT NULL,
    -- Validación
    ValidadoSAT BIT NOT NULL DEFAULT 0,
    EstatusSAT VARCHAR(50) NULL,
    Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    -- ERP
    IntelisisID VARCHAR(100) NULL,
    AplicadoContabilidad BIT NOT NULL DEFAULT 0,
    FechaAplicacion DATETIME2 NULL,
    -- Metadata
    SubidoPor INT NOT NULL, -- FK a pNetUsuario.IDUsuario
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT FK_ProvComplementosPago_Proveedor FOREIGN KEY (Proveedor)
        REFERENCES Prov(Proveedor),
    CONSTRAINT FK_ProvComplementosPago_Empresa FOREIGN KEY (Empresa)
        REFERENCES Empresa(Empresa),
    INDEX IDX_UUID (UUID),
    INDEX IDX_Proveedor_Fecha (Proveedor, Fecha DESC),
    INDEX IDX_Empresa (Empresa),
    INDEX IDX_Estatus (Estatus),
    INDEX IDX_Fecha (Fecha DESC),
    INDEX IDX_SAT (EstatusSAT)
);
```

---

## 📊 RESUMEN DE DECISIONES

### ✅ Tablas Reutilizadas (5):
1. `pNetUsuario` - Usuarios base
2. `pNetUsuarioTipo` - Tipos de usuario
3. `pNetUsuarioPassword` - Contraseñas
4. `Empresa` - Empresas
5. `Prov` - Proveedores base

### 🆕 Tablas Nuevas Necesarias (19):
1. `pNetUsuarioEmpresa` - Multi-empresa
2. `pNetSesiones` - Sesiones
3. `pNetUsuarioExtension` - Datos adicionales usuarios
4. `ProvDocumentos` - Documentación
5. `ProvTiposDocumento` - Catálogo documentos
6. `pNetConversaciones` - Mensajería
7. `pNetMensajes` - Mensajes
8. `pNetNotificaciones` - Notificaciones
9. `pNetAuditLog` - Auditoría
10. `pNetTiposNotificacion` - Catálogo notificaciones
11. `pNetConfiguracion` - Configuración
12. `pNetVerificationTokens` - Tokens verificación
13. `pNetPasswordResetTokens` - Tokens reset
14. `ProvCategoria` - Categorías proveedores
15. `ProvExtension` - Extensión proveedores
16. `ProvFacturas` - Facturas
17. `ProvComplementosPago` - Complementos pago

**TOTAL: 22 tablas (5 existentes + 17 nuevas)**

---

## 🚀 ESTRATEGIA DE IMPLEMENTACIÓN

### Fase 1 - Inmediata (Semana 1):
- ✅ Usar tablas existentes sin modificar
- 🆕 Crear tablas de extensión: `pNetUsuarioExtension`, `ProvExtension`
- 🆕 Crear tabla multi-empresa: `pNetUsuarioEmpresa`
- 🆕 Crear sesiones: `pNetSesiones`

### Fase 2 - Corto Plazo (Semanas 2-3):
- 🆕 Documentación: `ProvDocumentos`, `ProvTiposDocumento`, `ProvCategoria`
- 🆕 Mensajería: `pNetConversaciones`, `pNetMensajes`
- 🆕 Notificaciones: `pNetNotificaciones`, `pNetTiposNotificacion`
- 🆕 Tokens: `pNetVerificationTokens`, `pNetPasswordResetTokens`

### Fase 3 - Medio Plazo (Semanas 4-6):
- 🆕 Auditoría: `pNetAuditLog`
- 🆕 Configuración: `pNetConfiguracion`
- 🆕 Facturas: `ProvFacturas`, `ProvComplementosPago`

---

## 📝 NOTAS IMPORTANTES

1. **NO modificar tablas del ERP** (`pNetUsuario`, `Empresa`, `Prov`)
2. **Usar prefijos consistentes**: `pNet*` para sistema, `Prov*` para proveedores
3. **Mantener compatibilidad** con ERP Intelisis
4. **Denormalización estratégica** para performance (nombres de usuario, empresa, etc.)
5. **JSON para flexibilidad** en campos complejos

---

## 🎯 VENTAJAS DE ESTA ARQUITECTURA

✅ **Reutiliza infraestructura existente** del ERP
✅ **No rompe compatibilidad** con Intelisis
✅ **Mínimo de tablas nuevas** necesarias
✅ **Separación clara** entre datos ERP y Portal
✅ **Escalable** y mantenible
✅ **Auditoria completa** de todas las operaciones
