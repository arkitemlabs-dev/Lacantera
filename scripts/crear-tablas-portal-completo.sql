-- ============================================================
-- Script de Creación de Tablas del Portal
-- Base de Datos: PP (Portal Proveedores)
-- ============================================================
-- Este script crea TODAS las tablas necesarias para el portal
-- ============================================================

USE PP;
GO

PRINT '============================================================';
PRINT '📦 CREANDO TABLAS DEL PORTAL PROVEEDORES';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. pNetNotificaciones
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetNotificaciones')
BEGIN
    CREATE TABLE pNetNotificaciones (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        NotificacionID NVARCHAR(50) NOT NULL UNIQUE,
        IDUsuario INT NOT NULL,  -- FK a pNetUsuario.IDUsuario
        UsuarioNombre NVARCHAR(100) NOT NULL,
        Empresa NVARCHAR(10) NOT NULL,  -- Código de empresa
        Tipo NVARCHAR(50) NOT NULL,  -- 'orden_compra', 'documento', 'mensaje', 'sistema'
        Titulo NVARCHAR(200) NOT NULL,
        Mensaje NVARCHAR(500) NOT NULL,
        Link NVARCHAR(300),  -- URL opcional para la notificación
        DatosJSON NVARCHAR(MAX),  -- Datos adicionales en formato JSON
        Leida BIT NOT NULL DEFAULT 0,
        FechaLectura DATETIME2,
        EmailEnviado BIT NOT NULL DEFAULT 0,
        FechaEnvioEmail DATETIME2,
        Prioridad NVARCHAR(20) NOT NULL DEFAULT 'normal',  -- 'normal', 'alta', 'critica'
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetNotificaciones_Usuario_Empresa ON pNetNotificaciones(IDUsuario, Empresa);
    CREATE INDEX IX_pNetNotificaciones_Leida ON pNetNotificaciones(Leida);
    CREATE INDEX IX_pNetNotificaciones_CreatedAt ON pNetNotificaciones(CreatedAt DESC);

    PRINT '✅ Tabla pNetNotificaciones creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetNotificaciones ya existe';
END
GO

-- ============================================================
-- 2. pNetConversaciones
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetConversaciones')
BEGIN
    CREATE TABLE pNetConversaciones (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ConversacionID NVARCHAR(50) NOT NULL UNIQUE,
        Empresa NVARCHAR(10) NOT NULL,  -- Código de empresa
        ParticipantesJSON NVARCHAR(MAX) NOT NULL,  -- Array JSON con participantes
        Asunto NVARCHAR(200) NOT NULL,
        UltimoMensaje NVARCHAR(500),
        UltimoMensajeFecha DATETIME2,
        UltimoMensajeRemitente INT,
        UltimoMensajeRemitenteNombre NVARCHAR(100),
        Activa BIT NOT NULL DEFAULT 1,
        NoLeidosJSON NVARCHAR(MAX),  -- Contador por participante en JSON
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetConversaciones_Empresa ON pNetConversaciones(Empresa);
    CREATE INDEX IX_pNetConversaciones_Activa ON pNetConversaciones(Activa);
    CREATE INDEX IX_pNetConversaciones_UpdatedAt ON pNetConversaciones(UpdatedAt DESC);

    PRINT '✅ Tabla pNetConversaciones creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetConversaciones ya existe';
END
GO

-- ============================================================
-- 3. pNetMensajes
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetMensajes')
BEGIN
    CREATE TABLE pNetMensajes (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MensajeID NVARCHAR(50) NOT NULL UNIQUE,
        ConversacionID NVARCHAR(50) NOT NULL,  -- FK a pNetConversaciones.ConversacionID
        RemitenteID INT NOT NULL,  -- FK a pNetUsuario.IDUsuario
        RemitenteNombre NVARCHAR(100) NOT NULL,
        RemitenteRol NVARCHAR(30) NOT NULL,  -- 'proveedor', 'admin', 'comprador'
        DestinatarioID INT NOT NULL,
        DestinatarioNombre NVARCHAR(100) NOT NULL,
        Mensaje NVARCHAR(MAX) NOT NULL,
        Asunto NVARCHAR(200),
        ArchivosJSON NVARCHAR(MAX),  -- Array JSON con archivos adjuntos
        Leido BIT NOT NULL DEFAULT 0,
        FechaLectura DATETIME2,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetMensajes_Conversacion ON pNetMensajes(ConversacionID);
    CREATE INDEX IX_pNetMensajes_Remitente ON pNetMensajes(RemitenteID);
    CREATE INDEX IX_pNetMensajes_Destinatario ON pNetMensajes(DestinatarioID);
    CREATE INDEX IX_pNetMensajes_Leido ON pNetMensajes(Leido);
    CREATE INDEX IX_pNetMensajes_CreatedAt ON pNetMensajes(CreatedAt DESC);

    PRINT '✅ Tabla pNetMensajes creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetMensajes ya existe';
END
GO

-- ============================================================
-- 4. ProvDocumentos
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProvDocumentos')
BEGIN
    CREATE TABLE ProvDocumentos (
        ID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DocumentoID NVARCHAR(50) NOT NULL UNIQUE,
        Proveedor NVARCHAR(10) NOT NULL,  -- Código del proveedor en ERP
        IDUsuario INT NOT NULL,  -- FK a pNetUsuario.IDUsuario
        Empresa NVARCHAR(10) NOT NULL,  -- Código de empresa
        TipoDocumento NVARCHAR(50) NOT NULL,  -- 'RFC', 'CONSTANCIA', 'IDENTIFICACION', etc.
        NombreArchivo NVARCHAR(255) NOT NULL,
        ArchivoURL NVARCHAR(500) NOT NULL,
        ArchivoTipo NVARCHAR(50) NOT NULL,  -- 'application/pdf', 'image/jpeg', etc.
        ArchivoTamanio INT,  -- Tamaño en bytes
        Estatus NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',  -- 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO', 'POR_VENCER'
        Comentarios NVARCHAR(500),
        FechaVencimiento DATE,
        RevisadoPor INT,  -- FK a pNetUsuario.IDUsuario
        RevisadoPorNombre NVARCHAR(100),
        FechaRevision DATETIME2,
        FechaSubida DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_ProvDocumentos_Proveedor_Empresa ON ProvDocumentos(Proveedor, Empresa);
    CREATE INDEX IX_ProvDocumentos_Estatus ON ProvDocumentos(Estatus);
    CREATE INDEX IX_ProvDocumentos_FechaVencimiento ON ProvDocumentos(FechaVencimiento);
    CREATE INDEX IX_ProvDocumentos_Usuario ON ProvDocumentos(IDUsuario);

    PRINT '✅ Tabla ProvDocumentos creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla ProvDocumentos ya existe';
END
GO

-- ============================================================
-- 5. ProvTiposDocumento
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProvTiposDocumento')
BEGIN
    CREATE TABLE ProvTiposDocumento (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Codigo NVARCHAR(50) NOT NULL UNIQUE,
        Nombre NVARCHAR(100) NOT NULL,
        Descripcion NVARCHAR(300),
        RequeridoPara NVARCHAR(500),  -- JSON con array de roles/empresas
        VigenciaDias INT,  -- Días de vigencia (NULL = sin vencimiento)
        OrdenPresentacion INT NOT NULL DEFAULT 0,
        Activo BIT NOT NULL DEFAULT 1
    );

    CREATE INDEX IX_ProvTiposDocumento_Codigo ON ProvTiposDocumento(Codigo);
    CREATE INDEX IX_ProvTiposDocumento_Activo ON ProvTiposDocumento(Activo);

    PRINT '✅ Tabla ProvTiposDocumento creada';

    -- Insertar tipos de documentos comunes
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, VigenciaDias, OrdenPresentacion)
    VALUES
        ('RFC', 'Constancia de Situación Fiscal', 'Constancia de situación fiscal vigente emitida por el SAT', 365, 1),
        ('CEDULA_FISCAL', 'Cédula de Identificación Fiscal', 'Cédula fiscal del proveedor', NULL, 2),
        ('IDENTIFICACION', 'Identificación Oficial', 'INE/IFE o pasaporte del representante legal', NULL, 3),
        ('ACTA_CONSTITUTIVA', 'Acta Constitutiva', 'Acta constitutiva de la empresa', NULL, 4),
        ('COMPROBANTE_DOMICILIO', 'Comprobante de Domicilio', 'Comprobante de domicilio fiscal no mayor a 3 meses', 90, 5),
        ('PODER_LEGAL', 'Poder del Representante Legal', 'Poder notarial del representante legal', NULL, 6),
        ('ESTADO_CUENTA', 'Estado de Cuenta Bancario', 'Estado de cuenta bancario para SPEI', 180, 7),
        ('CONTRATO', 'Contrato de Prestación de Servicios', 'Contrato firmado entre las partes', NULL, 8),
        ('OPINION_CUMPLIMIENTO', 'Opinión de Cumplimiento SAT', 'Opinión positiva de cumplimiento de obligaciones fiscales', 90, 9),
        ('CEDULA_PROFESIONAL', 'Cédula Profesional', 'Cédula profesional del responsable técnico (si aplica)', NULL, 10);

    PRINT '✅ 10 tipos de documento insertados';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla ProvTiposDocumento ya existe';
END
GO

-- ============================================================
-- 6. pNetAuditoria
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetAuditoria')
BEGIN
    CREATE TABLE pNetAuditoria (
        ID BIGINT IDENTITY(1,1) PRIMARY KEY,
        Usuario NVARCHAR(50),  -- portal_user_id
        UsuarioNombre NVARCHAR(100),
        Empresa NVARCHAR(10),  -- Código de empresa
        Accion NVARCHAR(50) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
        TablaAfectada NVARCHAR(100),
        RegistroID NVARCHAR(100),
        ValoresAnteriores NVARCHAR(MAX),  -- JSON
        ValoresNuevos NVARCHAR(MAX),  -- JSON
        IP NVARCHAR(50),
        UserAgent NVARCHAR(500),
        FechaHora DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetAuditoria_Usuario ON pNetAuditoria(Usuario);
    CREATE INDEX IX_pNetAuditoria_Empresa ON pNetAuditoria(Empresa);
    CREATE INDEX IX_pNetAuditoria_Accion ON pNetAuditoria(Accion);
    CREATE INDEX IX_pNetAuditoria_FechaHora ON pNetAuditoria(FechaHora DESC);
    CREATE INDEX IX_pNetAuditoria_Tabla_Registro ON pNetAuditoria(TablaAfectada, RegistroID);

    PRINT '✅ Tabla pNetAuditoria creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetAuditoria ya existe';
END
GO

-- ============================================================
-- 7. pNetUsuarioExtension
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetUsuarioExtension')
BEGIN
    CREATE TABLE pNetUsuarioExtension (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        IDUsuario INT NOT NULL UNIQUE,  -- FK a pNetUsuario.IDUsuario
        RFC NVARCHAR(13),
        RazonSocial NVARCHAR(200),
        Telefono NVARCHAR(20),
        DireccionCalle NVARCHAR(200),
        DireccionCiudad NVARCHAR(100),
        DireccionEstado NVARCHAR(50),
        DireccionCP NVARCHAR(10),
        AvatarURL NVARCHAR(500),
        EmailVerified BIT NOT NULL DEFAULT 0,
        ConfiguracionJSON NVARCHAR(MAX),  -- Preferencias del usuario en JSON
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetUsuarioExtension_RFC ON pNetUsuarioExtension(RFC);
    CREATE INDEX IX_pNetUsuarioExtension_IDUsuario ON pNetUsuarioExtension(IDUsuario);

    PRINT '✅ Tabla pNetUsuarioExtension creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetUsuarioExtension ya existe';
END
GO

-- ============================================================
-- 8. pNetConfiguracionEmpresas
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetConfiguracionEmpresas')
BEGIN
    CREATE TABLE pNetConfiguracionEmpresas (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        EmpresaCodigo NVARCHAR(10) NOT NULL UNIQUE,  -- Código de empresa
        NombreEmpresa NVARCHAR(200) NOT NULL,
        LogoURL NVARCHAR(500),
        ColorPrimario NVARCHAR(7) DEFAULT '#0070f3',  -- Color hex
        ColorSecundario NVARCHAR(7) DEFAULT '#333333',
        EmailContacto NVARCHAR(100),
        TelefonoContacto NVARCHAR(20),
        DireccionFiscal NVARCHAR(500),
        ConfiguracionJSON NVARCHAR(MAX),  -- Configuraciones adicionales en JSON
        Activa BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX IX_pNetConfiguracionEmpresas_Codigo ON pNetConfiguracionEmpresas(EmpresaCodigo);
    CREATE INDEX IX_pNetConfiguracionEmpresas_Activa ON pNetConfiguracionEmpresas(Activa);

    PRINT '✅ Tabla pNetConfiguracionEmpresas creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetConfiguracionEmpresas ya existe';
END
GO

-- ============================================================
-- 9. portal_proveedor_mapping (ya existe, pero verificamos)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    CREATE TABLE portal_proveedor_mapping (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,  -- IDUsuario de pNetUsuario
        erp_proveedor_code VARCHAR(10) NOT NULL,  -- Código del proveedor en ERP
        empresa_code VARCHAR(5) NOT NULL,  -- Código de empresa en ERP
        permisos NVARCHAR(500),  -- JSON con permisos
        activo BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_portal_mapping UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
    );

    CREATE INDEX IX_portal_proveedor_mapping_user ON portal_proveedor_mapping(portal_user_id);
    CREATE INDEX IX_portal_proveedor_mapping_empresa ON portal_proveedor_mapping(empresa_code);

    PRINT '✅ Tabla portal_proveedor_mapping creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla portal_proveedor_mapping ya existe';
END
GO

-- ============================================================
-- 10. portal_orden_status (ya existe, pero verificamos)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_orden_status')
BEGIN
    CREATE TABLE portal_orden_status (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        erp_orden_id INT NOT NULL,  -- FK a Compra.ID del ERP
        empresa_code VARCHAR(5) NOT NULL,
        status_portal VARCHAR(30) CHECK (status_portal IN (
            'pendiente_respuesta', 'aceptada', 'rechazada', 'en_proceso', 'completada'
        )),
        fecha_respuesta DATETIME2,
        observaciones_proveedor NVARCHAR(500),
        respondido_por NVARCHAR(50),  -- portal_user_id
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_portal_orden_status UNIQUE (erp_orden_id, empresa_code)
    );

    CREATE INDEX IX_portal_orden_status_orden ON portal_orden_status(erp_orden_id);
    CREATE INDEX IX_portal_orden_status_empresa ON portal_orden_status(empresa_code);

    PRINT '✅ Tabla portal_orden_status creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla portal_orden_status ya existe';
END
GO

PRINT '';
PRINT '============================================================';
PRINT '✅ SCRIPT COMPLETADO';
PRINT '============================================================';
PRINT '';
PRINT 'Resumen:';
PRINT '  - pNetNotificaciones: Notificaciones del sistema';
PRINT '  - pNetConversaciones: Conversaciones entre usuarios';
PRINT '  - pNetMensajes: Mensajes dentro de conversaciones';
PRINT '  - ProvDocumentos: Documentos de proveedores';
PRINT '  - ProvTiposDocumento: Catálogo de tipos de documentos';
PRINT '  - pNetAuditoria: Log de auditoría del sistema';
PRINT '  - pNetUsuarioExtension: Datos extendidos de usuarios';
PRINT '  - pNetConfiguracionEmpresas: Configuración por empresa';
PRINT '  - portal_proveedor_mapping: Mapeo usuario-proveedor-empresa';
PRINT '  - portal_orden_status: Estados de órdenes en el portal';
PRINT '';
