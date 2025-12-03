-- ============================================================================
-- SCRIPT DE CREACIÓN DE TABLAS - PORTAL PROVEEDORES LA CANTERA (CORREGIDO)
-- ============================================================================
-- Base de Datos: PP (SQL Server)
-- Fecha: Diciembre 2024
-- Versión: 1.1 - CORREGIDO CON ESQUEMA REAL
--
-- IMPORTANTE: Este script usa los tipos de datos EXACTOS de las tablas existentes
-- ============================================================================

USE PP;
GO

PRINT '============================================================================';
PRINT 'INICIO - Creación de Tablas del Portal de Proveedores (CORREGIDO)';
PRINT '============================================================================';
GO

-- ============================================================================
-- SECCIÓN 1: EXTENSIONES DE TABLAS EXISTENTES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 1: Extensiones de Tablas Existentes';
PRINT '';

-- 1.1 Extensión de Usuarios
-- NOTA: pNetUsuario tiene PK compuesta (Usuario, IDUsuarioTipo, eMail), NO IDUsuario
-- Por lo tanto, usamos Usuario como FK en lugar de IDUsuario
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetUsuarioExtension]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetUsuarioExtension';
    CREATE TABLE [dbo].[pNetUsuarioExtension] (
        Usuario VARCHAR(10) PRIMARY KEY,
        RFC VARCHAR(13) NULL,
        RazonSocial NVARCHAR(255) NULL,
        Telefono VARCHAR(20) NULL,
        DireccionCalle NVARCHAR(255) NULL,
        DireccionCiudad NVARCHAR(100) NULL,
        DireccionEstado NVARCHAR(100) NULL,
        DireccionCP VARCHAR(10) NULL,
        AvatarURL VARCHAR(500) NULL,
        EmailVerified BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_pNetUsuarioExtension_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario) ON DELETE CASCADE
    );

    CREATE INDEX IDX_pNetUsuarioExtension_RFC ON pNetUsuarioExtension(RFC);
    PRINT '✓ Tabla pNetUsuarioExtension creada';
END
ELSE
    PRINT '⚠ Tabla pNetUsuarioExtension ya existe';
GO

-- 1.2 Extensión de Proveedores
-- NOTA: Prov.Proveedor es VARCHAR(10), NO VARCHAR(50)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvExtension]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvExtension';
    CREATE TABLE [dbo].[ProvExtension] (
        Proveedor VARCHAR(10) PRIMARY KEY,
        Categoria VARCHAR(50) NULL,
        StatusPortal VARCHAR(50) NOT NULL DEFAULT 'activo',
        DocumentosCompletos BIT NOT NULL DEFAULT 0,
        FechaUltimaActividad DATETIME2 NULL,
        UltimaSincronizacionERP DATETIME2 NULL,
        ConfiguracionesJSON NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_ProvExtension_Proveedor FOREIGN KEY (Proveedor)
            REFERENCES Prov(Proveedor)
    );

    CREATE INDEX IDX_ProvExtension_Categoria ON ProvExtension(Categoria);
    CREATE INDEX IDX_ProvExtension_Status ON ProvExtension(StatusPortal);
    CREATE INDEX IDX_ProvExtension_DocsCompletos ON ProvExtension(DocumentosCompletos);
    PRINT '✓ Tabla ProvExtension creada';
END
ELSE
    PRINT '⚠ Tabla ProvExtension ya existe';
GO

-- ============================================================================
-- SECCIÓN 2: AUTENTICACIÓN Y SESIONES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 2: Autenticación y Sesiones';
PRINT '';

-- 2.1 Sesiones
-- NOTA: Empresa.Empresa es VARCHAR(5), NO VARCHAR(10)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetSesiones]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetSesiones';
    CREATE TABLE [dbo].[pNetSesiones] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Usuario VARCHAR(10) NOT NULL,
        SessionToken VARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2 NOT NULL,
        IPAddress VARCHAR(45) NULL,
        UserAgent VARCHAR(500) NULL,
        EmpresaActiva VARCHAR(5) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_pNetSesiones_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario) ON DELETE CASCADE,
        CONSTRAINT FK_pNetSesiones_Empresa FOREIGN KEY (EmpresaActiva)
            REFERENCES Empresa(Empresa)
    );

    CREATE INDEX IDX_pNetSesiones_Usuario ON pNetSesiones(Usuario);
    CREATE INDEX IDX_pNetSesiones_Token ON pNetSesiones(SessionToken);
    CREATE INDEX IDX_pNetSesiones_Expires ON pNetSesiones(ExpiresAt);
    PRINT '✓ Tabla pNetSesiones creada';
END
ELSE
    PRINT '⚠ Tabla pNetSesiones ya existe';
GO

-- 2.2 Tokens de Verificación
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetVerificationTokens]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetVerificationTokens';
    CREATE TABLE [dbo].[pNetVerificationTokens] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Usuario VARCHAR(10) NOT NULL,
        Token VARCHAR(255) NOT NULL UNIQUE,
        TipoToken VARCHAR(50) NOT NULL DEFAULT 'email_verification',
        ExpiresAt DATETIME2 NOT NULL,
        Usado BIT NOT NULL DEFAULT 0,
        FechaUso DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_pNetVerificationTokens_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_pNetVerificationTokens_Usuario ON pNetVerificationTokens(Usuario);
    CREATE INDEX IDX_pNetVerificationTokens_Token ON pNetVerificationTokens(Token);
    CREATE INDEX IDX_pNetVerificationTokens_Expires ON pNetVerificationTokens(ExpiresAt);
    PRINT '✓ Tabla pNetVerificationTokens creada';
END
ELSE
    PRINT '⚠ Tabla pNetVerificationTokens ya existe';
GO

-- 2.3 Tokens de Reset de Contraseña
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetPasswordResetTokens]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetPasswordResetTokens';
    CREATE TABLE [dbo].[pNetPasswordResetTokens] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Usuario VARCHAR(10) NOT NULL,
        Token VARCHAR(255) NOT NULL UNIQUE,
        ExpiresAt DATETIME2 NOT NULL,
        UsedAt DATETIME2 NULL,
        IPSolicitud VARCHAR(45) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_pNetPasswordResetTokens_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_pNetPasswordResetTokens_Usuario ON pNetPasswordResetTokens(Usuario);
    CREATE INDEX IDX_pNetPasswordResetTokens_Token ON pNetPasswordResetTokens(Token);
    CREATE INDEX IDX_pNetPasswordResetTokens_Expires ON pNetPasswordResetTokens(ExpiresAt);
    PRINT '✓ Tabla pNetPasswordResetTokens creada';
END
ELSE
    PRINT '⚠ Tabla pNetPasswordResetTokens ya existe';
GO

-- ============================================================================
-- SECCIÓN 3: CATÁLOGOS DEL SISTEMA
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 3: Catálogos del Sistema';
PRINT '';

-- 3.1 Categorías de Proveedores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvCategoria]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvCategoria';
    CREATE TABLE [dbo].[ProvCategoria] (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Codigo VARCHAR(50) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(255) NULL,
        DocumentosRequeridosJSON NVARCHAR(MAX) NULL,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );

    CREATE INDEX IDX_ProvCategoria_Codigo ON ProvCategoria(Codigo);
    CREATE INDEX IDX_ProvCategoria_Activo ON ProvCategoria(Activo);
    PRINT '✓ Tabla ProvCategoria creada';
END
ELSE
    PRINT '⚠ Tabla ProvCategoria ya existe';
GO

-- 3.2 Tipos de Documentos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvTiposDocumento]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvTiposDocumento';
    CREATE TABLE [dbo].[ProvTiposDocumento] (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Codigo VARCHAR(50) NOT NULL UNIQUE,
        Nombre NVARCHAR(255) NOT NULL,
        Descripcion NVARCHAR(500) NULL,
        RequeridoPara NVARCHAR(MAX) NULL,
        VigenciaDias INT NULL,
        OrdenPresentacion INT NOT NULL DEFAULT 0,
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );

    CREATE INDEX IDX_ProvTiposDocumento_Codigo ON ProvTiposDocumento(Codigo);
    CREATE INDEX IDX_ProvTiposDocumento_Activo ON ProvTiposDocumento(Activo);
    PRINT '✓ Tabla ProvTiposDocumento creada';
END
ELSE
    PRINT '⚠ Tabla ProvTiposDocumento ya existe';
GO

-- 3.3 Tipos de Notificación
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetTiposNotificacion]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetTiposNotificacion';
    CREATE TABLE [dbo].[pNetTiposNotificacion] (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Codigo VARCHAR(50) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(255) NULL,
        TemplateTitulo NVARCHAR(255) NULL,
        TemplateMensaje NVARCHAR(1000) NULL,
        ColorBadge VARCHAR(20) NOT NULL DEFAULT '#blue',
        Activo BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL
    );

    CREATE INDEX IDX_pNetTiposNotificacion_Codigo ON pNetTiposNotificacion(Codigo);
    PRINT '✓ Tabla pNetTiposNotificacion creada';
END
ELSE
    PRINT '⚠ Tabla pNetTiposNotificacion ya existe';
GO

-- ============================================================================
-- SECCIÓN 4: DOCUMENTACIÓN DE PROVEEDORES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 4: Documentación de Proveedores';
PRINT '';

-- 4.1 Documentos de Proveedores
-- NOTA: Usando VARCHAR(10) para Proveedor y VARCHAR(5) para Empresa
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvDocumentos]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvDocumentos';
    CREATE TABLE [dbo].[ProvDocumentos] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DocumentoID VARCHAR(100) NOT NULL UNIQUE,
        Proveedor VARCHAR(10) NOT NULL,
        Usuario VARCHAR(10) NOT NULL,
        Empresa VARCHAR(5) NOT NULL,
        TipoDocumento VARCHAR(50) NOT NULL,
        NombreArchivo NVARCHAR(255) NOT NULL,
        ArchivoURL VARCHAR(500) NOT NULL,
        ArchivoTipo VARCHAR(100) NOT NULL,
        ArchivoTamanio BIGINT NOT NULL,
        Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
        Comentarios NVARCHAR(1000) NULL,
        FechaVencimiento DATE NULL,
        RevisadoPor VARCHAR(10) NULL,
        RevisadoPorNombre NVARCHAR(255) NULL,
        FechaRevision DATETIME2 NULL,
        FechaSubida DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_ProvDocumentos_Proveedor FOREIGN KEY (Proveedor)
            REFERENCES Prov(Proveedor),
        CONSTRAINT FK_ProvDocumentos_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario),
        CONSTRAINT FK_ProvDocumentos_Empresa FOREIGN KEY (Empresa)
            REFERENCES Empresa(Empresa),
        CONSTRAINT FK_ProvDocumentos_TipoDoc FOREIGN KEY (TipoDocumento)
            REFERENCES ProvTiposDocumento(Codigo),
        CONSTRAINT FK_ProvDocumentos_RevisadoPor FOREIGN KEY (RevisadoPor)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_ProvDocumentos_Proveedor ON ProvDocumentos(Proveedor);
    CREATE INDEX IDX_ProvDocumentos_Usuario ON ProvDocumentos(Usuario);
    CREATE INDEX IDX_ProvDocumentos_Empresa ON ProvDocumentos(Empresa);
    CREATE INDEX IDX_ProvDocumentos_Estatus ON ProvDocumentos(Estatus);
    CREATE INDEX IDX_ProvDocumentos_FechaVencimiento ON ProvDocumentos(FechaVencimiento);
    CREATE INDEX IDX_ProvDocumentos_TipoDocumento ON ProvDocumentos(TipoDocumento);
    CREATE INDEX IDX_ProvDocumentos_FechaRevision ON ProvDocumentos(FechaRevision);
    PRINT '✓ Tabla ProvDocumentos creada';
END
ELSE
    PRINT '⚠ Tabla ProvDocumentos ya existe';
GO

-- ============================================================================
-- SECCIÓN 5: MENSAJERÍA
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 5: Sistema de Mensajería';
PRINT '';

-- 5.1 Conversaciones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetConversaciones]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetConversaciones';
    CREATE TABLE [dbo].[pNetConversaciones] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ConversacionID VARCHAR(100) NOT NULL UNIQUE,
        Empresa VARCHAR(5) NOT NULL,
        ParticipantesJSON NVARCHAR(MAX) NOT NULL,
        Asunto NVARCHAR(500) NOT NULL,
        UltimoMensaje NVARCHAR(1000) NULL,
        UltimoMensajeFecha DATETIME2 NULL,
        UltimoMensajeRemitente VARCHAR(10) NULL,
        UltimoMensajeRemitenteNombre NVARCHAR(255) NULL,
        Activa BIT NOT NULL DEFAULT 1,
        NoLeidosJSON NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_pNetConversaciones_Empresa FOREIGN KEY (Empresa)
            REFERENCES Empresa(Empresa)
    );

    CREATE INDEX IDX_pNetConversaciones_Empresa ON pNetConversaciones(Empresa);
    CREATE INDEX IDX_pNetConversaciones_Activa ON pNetConversaciones(Activa);
    CREATE INDEX IDX_pNetConversaciones_Fecha ON pNetConversaciones(UltimoMensajeFecha DESC);
    PRINT '✓ Tabla pNetConversaciones creada';
END
ELSE
    PRINT '⚠ Tabla pNetConversaciones ya existe';
GO

-- 5.2 Mensajes
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetMensajes]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetMensajes';
    CREATE TABLE [dbo].[pNetMensajes] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MensajeID VARCHAR(100) NOT NULL UNIQUE,
        ConversacionID UNIQUEIDENTIFIER NOT NULL,
        RemitenteID VARCHAR(10) NOT NULL,
        RemitenteNombre NVARCHAR(255) NOT NULL,
        RemitenteRol VARCHAR(50) NOT NULL,
        DestinatarioID VARCHAR(10) NOT NULL,
        DestinatarioNombre NVARCHAR(255) NOT NULL,
        Mensaje NVARCHAR(MAX) NOT NULL,
        Asunto NVARCHAR(500) NULL,
        ArchivosJSON NVARCHAR(MAX) NULL,
        Leido BIT NOT NULL DEFAULT 0,
        FechaLectura DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT FK_pNetMensajes_Conversacion FOREIGN KEY (ConversacionID)
            REFERENCES pNetConversaciones(ID) ON DELETE CASCADE,
        CONSTRAINT FK_pNetMensajes_Remitente FOREIGN KEY (RemitenteID)
            REFERENCES pNetUsuario(Usuario),
        CONSTRAINT FK_pNetMensajes_Destinatario FOREIGN KEY (DestinatarioID)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_pNetMensajes_Conversacion_Fecha ON pNetMensajes(ConversacionID, CreatedAt);
    CREATE INDEX IDX_pNetMensajes_Remitente ON pNetMensajes(RemitenteID);
    CREATE INDEX IDX_pNetMensajes_Leido ON pNetMensajes(Leido);
    CREATE INDEX IDX_pNetMensajes_Fecha ON pNetMensajes(CreatedAt DESC);
    PRINT '✓ Tabla pNetMensajes creada';
END
ELSE
    PRINT '⚠ Tabla pNetMensajes ya existe';
GO

-- ============================================================================
-- SECCIÓN 6: NOTIFICACIONES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 6: Sistema de Notificaciones';
PRINT '';

-- 6.1 Notificaciones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetNotificaciones]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetNotificaciones';
    CREATE TABLE [dbo].[pNetNotificaciones] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        NotificacionID VARCHAR(100) NOT NULL UNIQUE,
        Usuario VARCHAR(10) NOT NULL,
        UsuarioNombre NVARCHAR(255) NOT NULL,
        Empresa VARCHAR(5) NOT NULL,
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

        CONSTRAINT FK_pNetNotificaciones_Usuario FOREIGN KEY (Usuario)
            REFERENCES pNetUsuario(Usuario),
        CONSTRAINT FK_pNetNotificaciones_Empresa FOREIGN KEY (Empresa)
            REFERENCES Empresa(Empresa),
        CONSTRAINT FK_pNetNotificaciones_Tipo FOREIGN KEY (Tipo)
            REFERENCES pNetTiposNotificacion(Codigo)
    );

    CREATE INDEX IDX_pNetNotificaciones_Usuario_Leida ON pNetNotificaciones(Usuario, Leida);
    CREATE INDEX IDX_pNetNotificaciones_Empresa ON pNetNotificaciones(Empresa);
    CREATE INDEX IDX_pNetNotificaciones_Tipo ON pNetNotificaciones(Tipo);
    CREATE INDEX IDX_pNetNotificaciones_Fecha ON pNetNotificaciones(CreatedAt DESC);
    CREATE INDEX IDX_pNetNotificaciones_Prioridad ON pNetNotificaciones(Prioridad);
    PRINT '✓ Tabla pNetNotificaciones creada';
END
ELSE
    PRINT '⚠ Tabla pNetNotificaciones ya existe';
GO

-- ============================================================================
-- SECCIÓN 7: AUDITORÍA
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 7: Auditoría del Sistema';
PRINT '';

-- 7.1 Audit Log
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetAuditLog]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetAuditLog';
    CREATE TABLE [dbo].[pNetAuditLog] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Usuario VARCHAR(10) NOT NULL,
        UsuarioNombre NVARCHAR(255) NOT NULL,
        Empresa VARCHAR(5) NULL,
        Accion VARCHAR(100) NOT NULL,
        TablaAfectada VARCHAR(100) NOT NULL,
        RegistroID VARCHAR(100) NOT NULL,
        ValoresAnterioresJSON NVARCHAR(MAX) NULL,
        ValoresNuevosJSON NVARCHAR(MAX) NULL,
        IPAddress VARCHAR(45) NULL,
        UserAgent VARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IDX_pNetAuditLog_Usuario_Fecha ON pNetAuditLog(Usuario, CreatedAt DESC);
    CREATE INDEX IDX_pNetAuditLog_Tabla_Fecha ON pNetAuditLog(TablaAfectada, CreatedAt DESC);
    CREATE INDEX IDX_pNetAuditLog_Accion ON pNetAuditLog(Accion);
    CREATE INDEX IDX_pNetAuditLog_Fecha ON pNetAuditLog(CreatedAt DESC);
    CREATE INDEX IDX_pNetAuditLog_Empresa ON pNetAuditLog(Empresa);
    PRINT '✓ Tabla pNetAuditLog creada';
END
ELSE
    PRINT '⚠ Tabla pNetAuditLog ya existe';
GO

-- ============================================================================
-- SECCIÓN 8: CONFIGURACIÓN
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 8: Configuración del Sistema';
PRINT '';

-- 8.1 Configuración por Empresa
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[pNetConfiguracion]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: pNetConfiguracion';
    CREATE TABLE [dbo].[pNetConfiguracion] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Empresa VARCHAR(5) NOT NULL,
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
        CONSTRAINT UQ_Empresa_Clave UNIQUE (Empresa, Clave)
    );

    CREATE INDEX IDX_pNetConfiguracion_Empresa_Clave ON pNetConfiguracion(Empresa, Clave);
    CREATE INDEX IDX_pNetConfiguracion_Categoria ON pNetConfiguracion(Categoria);
    PRINT '✓ Tabla pNetConfiguracion creada';
END
ELSE
    PRINT '⚠ Tabla pNetConfiguracion ya existe';
GO

-- ============================================================================
-- SECCIÓN 9: FACTURAS Y COMPLEMENTOS (OPCIONAL - FASE FUTURA)
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 9: Facturas y Complementos (Opcional)';
PRINT '';

-- 9.1 Facturas de Proveedores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvFacturas]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvFacturas';
    CREATE TABLE [dbo].[ProvFacturas] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FacturaID VARCHAR(100) NOT NULL UNIQUE,
        Proveedor VARCHAR(10) NOT NULL,
        Empresa VARCHAR(5) NOT NULL,
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
        ValidadaSAT BIT NOT NULL DEFAULT 0,
        EstatusSAT VARCHAR(50) NULL,
        FechaValidacionSAT DATETIME2 NULL,
        Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
        MotivoRechazo NVARCHAR(1000) NULL,
        RevisadoPor VARCHAR(10) NULL,
        FechaRevision DATETIME2 NULL,
        Observaciones NVARCHAR(1000) NULL,
        Pagada BIT NOT NULL DEFAULT 0,
        FechaPago DATETIME2 NULL,
        ComplementoPagoID UNIQUEIDENTIFIER NULL,
        IntelisisID VARCHAR(100) NULL,
        CuentaContable VARCHAR(50) NULL,
        SubidoPor VARCHAR(10) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_ProvFacturas_Proveedor FOREIGN KEY (Proveedor)
            REFERENCES Prov(Proveedor),
        CONSTRAINT FK_ProvFacturas_Empresa FOREIGN KEY (Empresa)
            REFERENCES Empresa(Empresa),
        CONSTRAINT FK_ProvFacturas_RevisadoPor FOREIGN KEY (RevisadoPor)
            REFERENCES pNetUsuario(Usuario),
        CONSTRAINT FK_ProvFacturas_SubidoPor FOREIGN KEY (SubidoPor)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_ProvFacturas_UUID ON ProvFacturas(UUID);
    CREATE INDEX IDX_ProvFacturas_Proveedor_Estatus ON ProvFacturas(Proveedor, Estatus);
    CREATE INDEX IDX_ProvFacturas_Empresa_Estatus ON ProvFacturas(Empresa, Estatus);
    CREATE INDEX IDX_ProvFacturas_Folio ON ProvFacturas(Folio);
    CREATE INDEX IDX_ProvFacturas_Fecha ON ProvFacturas(Fecha DESC);
    CREATE INDEX IDX_ProvFacturas_Estatus ON ProvFacturas(Estatus);
    CREATE INDEX IDX_ProvFacturas_SAT ON ProvFacturas(EstatusSAT);
    CREATE INDEX IDX_ProvFacturas_Intelisis ON ProvFacturas(IntelisisID);
    PRINT '✓ Tabla ProvFacturas creada';
END
ELSE
    PRINT '⚠ Tabla ProvFacturas ya existe';
GO

-- 9.2 Complementos de Pago
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProvComplementosPago]') AND type in (N'U'))
BEGIN
    PRINT 'Creando tabla: ProvComplementosPago';
    CREATE TABLE [dbo].[ProvComplementosPago] (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ComplementoID VARCHAR(100) NOT NULL UNIQUE,
        EmisorRFC VARCHAR(13) NOT NULL,
        EmisorRazonSocial NVARCHAR(255) NOT NULL,
        ReceptorRFC VARCHAR(13) NOT NULL,
        ReceptorRazonSocial NVARCHAR(255) NOT NULL,
        Proveedor VARCHAR(10) NOT NULL,
        Empresa VARCHAR(5) NOT NULL,
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
        FacturasRelacionadasJSON NVARCHAR(MAX) NOT NULL,
        ValidadoSAT BIT NOT NULL DEFAULT 0,
        EstatusSAT VARCHAR(50) NULL,
        Estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
        IntelisisID VARCHAR(100) NULL,
        AplicadoContabilidad BIT NOT NULL DEFAULT 0,
        FechaAplicacion DATETIME2 NULL,
        SubidoPor VARCHAR(10) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NULL,

        CONSTRAINT FK_ProvComplementosPago_Proveedor FOREIGN KEY (Proveedor)
            REFERENCES Prov(Proveedor),
        CONSTRAINT FK_ProvComplementosPago_Empresa FOREIGN KEY (Empresa)
            REFERENCES Empresa(Empresa),
        CONSTRAINT FK_ProvComplementosPago_SubidoPor FOREIGN KEY (SubidoPor)
            REFERENCES pNetUsuario(Usuario)
    );

    CREATE INDEX IDX_ProvComplementosPago_UUID ON ProvComplementosPago(UUID);
    CREATE INDEX IDX_ProvComplementosPago_Proveedor_Fecha ON ProvComplementosPago(Proveedor, Fecha DESC);
    CREATE INDEX IDX_ProvComplementosPago_Empresa ON ProvComplementosPago(Empresa);
    CREATE INDEX IDX_ProvComplementosPago_Estatus ON ProvComplementosPago(Estatus);
    CREATE INDEX IDX_ProvComplementosPago_Fecha ON ProvComplementosPago(Fecha DESC);
    CREATE INDEX IDX_ProvComplementosPago_SAT ON ProvComplementosPago(EstatusSAT);
    CREATE INDEX IDX_ProvComplementosPago_Intelisis ON ProvComplementosPago(IntelisisID);
    PRINT '✓ Tabla ProvComplementosPago creada';
END
ELSE
    PRINT '⚠ Tabla ProvComplementosPago ya existe';
GO

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'FIN - Todas las tablas del Portal de Proveedores han sido creadas';
PRINT '============================================================================';
PRINT '';
PRINT 'RESUMEN:';
PRINT '  • Tablas existentes reutilizadas: 5';
PRINT '    - pNetUsuario, pNetUsuarioTipo, pNetUsuarioPassword';
PRINT '    - Empresa, Prov';
PRINT '';
PRINT '  • Tablas nuevas creadas: 17';
PRINT '    - Extensiones: 2 (pNetUsuarioExtension, ProvExtension)';
PRINT '    - Autenticación: 3 (pNetSesiones, pNetVerificationTokens, pNetPasswordResetTokens)';
PRINT '    - Catálogos: 3 (ProvCategoria, ProvTiposDocumento, pNetTiposNotificacion)';
PRINT '    - Documentación: 1 (ProvDocumentos)';
PRINT '    - Mensajería: 2 (pNetConversaciones, pNetMensajes)';
PRINT '    - Notificaciones: 1 (pNetNotificaciones)';
PRINT '    - Auditoría: 1 (pNetAuditLog)';
PRINT '    - Configuración: 1 (pNetConfiguracion)';
PRINT '    - Facturas: 2 (ProvFacturas, ProvComplementosPago)';
PRINT '';
PRINT 'IMPORTANTE:';
PRINT '  • Las FKs usan Usuario VARCHAR(10) en lugar de IDUsuario';
PRINT '  • Las FKs usan Empresa VARCHAR(5) en lugar de VARCHAR(10)';
PRINT '  • Las FKs usan Proveedor VARCHAR(10) en lugar de VARCHAR(50)';
PRINT '  • pNetUsuarioEmpresa YA EXISTE - no se recrea';
PRINT '';
PRINT 'Siguiente paso: Ejecutar el script de datos iniciales';
PRINT '  ➜ insert-initial-data.sql';
PRINT '============================================================================';
GO
