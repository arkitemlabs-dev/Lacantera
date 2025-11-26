-- =================================================================
-- Script de creación de tablas para La Cantera - Portal de Proveedores
-- Base de datos: SQL Server
-- Sistema: Multi-empresa con gestión de proveedores, OCs y facturas
-- =================================================================

USE PP;
GO

-- =================================================================
-- TABLA: users (Usuarios del sistema)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name NVARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('proveedor', 'admin_super', 'admin_compras', 'admin_contabilidad')),
        user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('Proveedor', 'Administrador')),

        -- Campos específicos para proveedores
        rfc VARCHAR(13) NULL,
        razon_social NVARCHAR(255) NULL,
        telefono VARCHAR(20) NULL,
        direccion_calle NVARCHAR(255) NULL,
        direccion_ciudad NVARCHAR(100) NULL,
        direccion_estado NVARCHAR(100) NULL,
        direccion_cp VARCHAR(10) NULL,
        status VARCHAR(50) NULL CHECK (status IN ('activo', 'pendiente_validacion', 'rechazado', 'suspendido')),
        documentos_validados BIT DEFAULT 0,

        -- Campos de control
        is_active BIT NOT NULL DEFAULT 1,
        email_verified BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL
    );

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_user_type ON users(user_type);
    CREATE INDEX idx_users_rfc ON users(rfc);
    CREATE INDEX idx_users_status ON users(status);

    PRINT '✅ Tabla users creada';
END
ELSE
    PRINT '⚠️  Tabla users ya existe';
GO

-- =================================================================
-- TABLA: empresas (Empresas del sistema multi-empresa)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empresas')
BEGIN
    CREATE TABLE empresas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre_comercial NVARCHAR(255) NOT NULL,
        razon_social NVARCHAR(255) NOT NULL,
        rfc VARCHAR(13) NULL,
        direccion NVARCHAR(500) NULL,
        telefono VARCHAR(20) NULL,
        email VARCHAR(255) NULL,
        activa BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL
    );

    CREATE INDEX idx_empresas_codigo ON empresas(codigo);
    CREATE INDEX idx_empresas_rfc ON empresas(rfc);
    CREATE INDEX idx_empresas_activa ON empresas(activa);

    PRINT '✅ Tabla empresas creada';
END
ELSE
    PRINT '⚠️  Tabla empresas ya existe';
GO

-- =================================================================
-- TABLA: usuarios_empresas (Relación muchos a muchos)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuarios_empresas')
BEGIN
    CREATE TABLE usuarios_empresas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        rol VARCHAR(50) NOT NULL,
        activo BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
        UNIQUE (usuario_id, empresa_id)
    );

    CREATE INDEX idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id);
    CREATE INDEX idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id);
    CREATE INDEX idx_usuarios_empresas_activo ON usuarios_empresas(activo);

    PRINT '✅ Tabla usuarios_empresas creada';
END
ELSE
    PRINT '⚠️  Tabla usuarios_empresas ya existe';
GO

-- =================================================================
-- TABLA: proveedores_documentacion (Documentos legales de proveedores)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proveedores_documentacion')
BEGIN
    CREATE TABLE proveedores_documentacion (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        proveedor_id UNIQUEIDENTIFIER NOT NULL,
        tipo_documento VARCHAR(100) NOT NULL CHECK (tipo_documento IN (
            'acta_constitutiva',
            'comprobante_domicilio',
            'identificacion_representante',
            'constancia_fiscal',
            'caratula_bancaria'
        )),
        archivo_url NVARCHAR(1000) NOT NULL,
        archivo_nombre NVARCHAR(500) NOT NULL,
        archivo_tipo VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
        comentarios NVARCHAR(MAX) NULL,
        revisado_por UNIQUEIDENTIFIER NULL,
        fecha_revision DATETIME2 NULL,
        uploaded_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,

        FOREIGN KEY (proveedor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (revisado_por) REFERENCES users(id)
    );

    CREATE INDEX idx_proveedores_doc_proveedor ON proveedores_documentacion(proveedor_id);
    CREATE INDEX idx_proveedores_doc_tipo ON proveedores_documentacion(tipo_documento);
    CREATE INDEX idx_proveedores_doc_status ON proveedores_documentacion(status);

    PRINT '✅ Tabla proveedores_documentacion creada';
END
ELSE
    PRINT '⚠️  Tabla proveedores_documentacion ya existe';
GO

-- =================================================================
-- TABLA: ordenes_compra (Órdenes de compra)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ordenes_compra')
BEGIN
    CREATE TABLE ordenes_compra (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        orden_id VARCHAR(100) NOT NULL UNIQUE,
        folio VARCHAR(100) NOT NULL,
        proveedor_id UNIQUEIDENTIFIER NOT NULL,
        proveedor_rfc VARCHAR(13) NOT NULL,
        proveedor_razon_social NVARCHAR(255) NOT NULL,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        empresa_razon_social NVARCHAR(255) NOT NULL,
        fecha DATETIME2 NOT NULL,
        fecha_entrega DATETIME2 NOT NULL,
        monto_total DECIMAL(18, 2) NOT NULL,
        moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('MXN', 'USD')) DEFAULT 'MXN',
        conceptos NVARCHAR(MAX) NOT NULL, -- JSON array
        status VARCHAR(50) NOT NULL CHECK (status IN (
            'pendiente_aceptacion',
            'aceptada',
            'rechazada',
            'en_proceso',
            'completada',
            'cancelada'
        )) DEFAULT 'pendiente_aceptacion',
        facturada BIT NOT NULL DEFAULT 0,
        factura_id UNIQUEIDENTIFIER NULL,
        observaciones NVARCHAR(MAX) NULL,
        archivo_oc_url NVARCHAR(1000) NULL,
        intelisis_id VARCHAR(100) NULL,
        ultima_sincronizacion DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NOT NULL,

        FOREIGN KEY (proveedor_id) REFERENCES users(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE INDEX idx_ordenes_orden_id ON ordenes_compra(orden_id);
    CREATE INDEX idx_ordenes_folio ON ordenes_compra(folio);
    CREATE INDEX idx_ordenes_proveedor ON ordenes_compra(proveedor_id);
    CREATE INDEX idx_ordenes_empresa ON ordenes_compra(empresa_id);
    CREATE INDEX idx_ordenes_status ON ordenes_compra(status);
    CREATE INDEX idx_ordenes_fecha ON ordenes_compra(fecha);
    CREATE INDEX idx_ordenes_facturada ON ordenes_compra(facturada);

    PRINT '✅ Tabla ordenes_compra creada';
END
ELSE
    PRINT '⚠️  Tabla ordenes_compra ya existe';
GO

-- =================================================================
-- TABLA: facturas (Facturas electrónicas - CFDIs)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'facturas')
BEGIN
    CREATE TABLE facturas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        factura_id VARCHAR(100) NOT NULL UNIQUE,
        proveedor_id UNIQUEIDENTIFIER NOT NULL,
        proveedor_rfc VARCHAR(13) NOT NULL,
        proveedor_razon_social NVARCHAR(255) NOT NULL,
        receptor_rfc VARCHAR(13) NOT NULL,
        receptor_razon_social NVARCHAR(255) NOT NULL,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        uuid VARCHAR(100) NOT NULL UNIQUE,
        serie VARCHAR(50) NULL,
        folio VARCHAR(100) NOT NULL,
        fecha DATETIME2 NOT NULL,
        subtotal DECIMAL(18, 2) NOT NULL,
        iva DECIMAL(18, 2) NOT NULL,
        total DECIMAL(18, 2) NOT NULL,
        moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('MXN', 'USD')) DEFAULT 'MXN',
        tipo_cambio DECIMAL(18, 6) NULL,
        xml_url NVARCHAR(1000) NOT NULL,
        pdf_url NVARCHAR(1000) NOT NULL,
        validada_sat BIT NOT NULL DEFAULT 0,
        estatus_sat VARCHAR(50) NULL CHECK (estatus_sat IN ('vigente', 'cancelada')),
        fecha_validacion_sat DATETIME2 NULL,
        orden_compra_id UNIQUEIDENTIFIER NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN (
            'pendiente_revision',
            'aprobada',
            'rechazada',
            'pagada',
            'cancelada'
        )) DEFAULT 'pendiente_revision',
        motivo_rechazo NVARCHAR(MAX) NULL,
        pagada BIT NOT NULL DEFAULT 0,
        fecha_pago DATETIME2 NULL,
        complemento_pago_id UNIQUEIDENTIFIER NULL,
        revisado_por UNIQUEIDENTIFIER NULL,
        fecha_revision DATETIME2 NULL,
        observaciones NVARCHAR(MAX) NULL,
        intelisis_id VARCHAR(100) NULL,
        ultima_sincronizacion DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        uploaded_by UNIQUEIDENTIFIER NOT NULL,

        FOREIGN KEY (proveedor_id) REFERENCES users(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id),
        FOREIGN KEY (revisado_por) REFERENCES users(id)
    );

    CREATE INDEX idx_facturas_factura_id ON facturas(factura_id);
    CREATE INDEX idx_facturas_uuid ON facturas(uuid);
    CREATE INDEX idx_facturas_folio ON facturas(folio);
    CREATE INDEX idx_facturas_proveedor ON facturas(proveedor_id);
    CREATE INDEX idx_facturas_empresa ON facturas(empresa_id);
    CREATE INDEX idx_facturas_status ON facturas(status);
    CREATE INDEX idx_facturas_fecha ON facturas(fecha);
    CREATE INDEX idx_facturas_pagada ON facturas(pagada);
    CREATE INDEX idx_facturas_validada_sat ON facturas(validada_sat);

    PRINT '✅ Tabla facturas creada';
END
ELSE
    PRINT '⚠️  Tabla facturas ya existe';
GO

-- =================================================================
-- TABLA: complementos_pago (Complementos de pago - CFDIs tipo pago)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'complementos_pago')
BEGIN
    CREATE TABLE complementos_pago (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        complemento_id VARCHAR(100) NOT NULL UNIQUE,
        emisor_rfc VARCHAR(13) NOT NULL,
        emisor_razon_social NVARCHAR(255) NOT NULL,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        receptor_rfc VARCHAR(13) NOT NULL,
        receptor_razon_social NVARCHAR(255) NOT NULL,
        proveedor_id UNIQUEIDENTIFIER NOT NULL,
        uuid VARCHAR(100) NOT NULL UNIQUE,
        serie VARCHAR(50) NULL,
        folio VARCHAR(100) NOT NULL,
        fecha DATETIME2 NOT NULL,
        forma_pago VARCHAR(50) NOT NULL,
        metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('PUE', 'PPD')),
        moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('MXN', 'USD')) DEFAULT 'MXN',
        monto DECIMAL(18, 2) NOT NULL,
        facturas_relacionadas NVARCHAR(MAX) NOT NULL, -- JSON array
        xml_url NVARCHAR(1000) NOT NULL,
        pdf_url NVARCHAR(1000) NOT NULL,
        comprobante_url NVARCHAR(1000) NULL,
        validado_sat BIT NOT NULL DEFAULT 0,
        estatus_sat VARCHAR(50) NULL CHECK (estatus_sat IN ('vigente', 'cancelada')),
        status VARCHAR(50) NOT NULL CHECK (status IN (
            'pendiente_revision',
            'aprobado',
            'rechazado'
        )) DEFAULT 'pendiente_revision',
        intelisis_id VARCHAR(100) NULL,
        ultima_sincronizacion DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        uploaded_by UNIQUEIDENTIFIER NOT NULL,

        FOREIGN KEY (proveedor_id) REFERENCES users(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE INDEX idx_complementos_complemento_id ON complementos_pago(complemento_id);
    CREATE INDEX idx_complementos_uuid ON complementos_pago(uuid);
    CREATE INDEX idx_complementos_proveedor ON complementos_pago(proveedor_id);
    CREATE INDEX idx_complementos_empresa ON complementos_pago(empresa_id);
    CREATE INDEX idx_complementos_status ON complementos_pago(status);
    CREATE INDEX idx_complementos_fecha ON complementos_pago(fecha);

    PRINT '✅ Tabla complementos_pago creada';
END
ELSE
    PRINT '⚠️  Tabla complementos_pago ya existe';
GO

-- =================================================================
-- TABLA: comprobantes_pago (Comprobantes de pago internos)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'comprobantes_pago')
BEGIN
    CREATE TABLE comprobantes_pago (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        comprobante_id VARCHAR(100) NOT NULL UNIQUE,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        empresa_razon_social NVARCHAR(255) NOT NULL,
        proveedor_id UNIQUEIDENTIFIER NOT NULL,
        proveedor_rfc VARCHAR(13) NOT NULL,
        fecha DATETIME2 NOT NULL,
        monto DECIMAL(18, 2) NOT NULL,
        moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('MXN', 'USD')) DEFAULT 'MXN',
        forma_pago VARCHAR(50) NOT NULL CHECK (forma_pago IN ('transferencia', 'cheque', 'efectivo')),
        referencia VARCHAR(255) NULL,
        archivo_url NVARCHAR(1000) NOT NULL,
        facturas_ids NVARCHAR(MAX) NOT NULL, -- JSON array
        status VARCHAR(50) NOT NULL CHECK (status IN (
            'pendiente_confirmacion',
            'confirmado',
            'rechazado'
        )) DEFAULT 'pendiente_confirmacion',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        uploaded_by UNIQUEIDENTIFIER NOT NULL,

        FOREIGN KEY (proveedor_id) REFERENCES users(id),
        FOREIGN KEY (empresa_id) REFERENCES empresas(id),
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE INDEX idx_comprobantes_comprobante_id ON comprobantes_pago(comprobante_id);
    CREATE INDEX idx_comprobantes_proveedor ON comprobantes_pago(proveedor_id);
    CREATE INDEX idx_comprobantes_empresa ON comprobantes_pago(empresa_id);
    CREATE INDEX idx_comprobantes_status ON comprobantes_pago(status);
    CREATE INDEX idx_comprobantes_fecha ON comprobantes_pago(fecha);

    PRINT '✅ Tabla comprobantes_pago creada';
END
ELSE
    PRINT '⚠️  Tabla comprobantes_pago ya existe';
GO

-- =================================================================
-- TABLA: conversaciones (Conversaciones/chats entre usuarios)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'conversaciones')
BEGIN
    CREATE TABLE conversaciones (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        conversacion_id VARCHAR(100) NOT NULL UNIQUE,
        participantes NVARCHAR(MAX) NOT NULL, -- JSON array de user IDs
        participantes_info NVARCHAR(MAX) NOT NULL, -- JSON array de objetos
        ultimo_mensaje NVARCHAR(MAX) NULL,
        ultimo_mensaje_fecha DATETIME2 NULL,
        ultimo_mensaje_remitente UNIQUEIDENTIFIER NULL,
        activa BIT NOT NULL DEFAULT 1,
        no_leidos NVARCHAR(MAX) NULL, -- JSON objeto {userId: count}
        asunto NVARCHAR(500) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (ultimo_mensaje_remitente) REFERENCES users(id)
    );

    CREATE INDEX idx_conversaciones_conversacion_id ON conversaciones(conversacion_id);
    CREATE INDEX idx_conversaciones_activa ON conversaciones(activa);
    CREATE INDEX idx_conversaciones_updated ON conversaciones(updated_at);

    PRINT '✅ Tabla conversaciones creada';
END
ELSE
    PRINT '⚠️  Tabla conversaciones ya existe';
GO

-- =================================================================
-- TABLA: mensajes (Mensajes de las conversaciones)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mensajes')
BEGIN
    CREATE TABLE mensajes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        mensaje_id VARCHAR(100) NOT NULL UNIQUE,
        conversacion_id UNIQUEIDENTIFIER NOT NULL,
        remitente_id UNIQUEIDENTIFIER NOT NULL,
        remitente_nombre NVARCHAR(255) NOT NULL,
        remitente_rol VARCHAR(50) NOT NULL,
        destinatario_id UNIQUEIDENTIFIER NOT NULL,
        destinatario_nombre NVARCHAR(255) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,
        asunto NVARCHAR(500) NULL,
        archivos NVARCHAR(MAX) NULL, -- JSON array
        leido BIT NOT NULL DEFAULT 0,
        fecha_lectura DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
        FOREIGN KEY (remitente_id) REFERENCES users(id),
        FOREIGN KEY (destinatario_id) REFERENCES users(id)
    );

    CREATE INDEX idx_mensajes_mensaje_id ON mensajes(mensaje_id);
    CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id);
    CREATE INDEX idx_mensajes_remitente ON mensajes(remitente_id);
    CREATE INDEX idx_mensajes_destinatario ON mensajes(destinatario_id);
    CREATE INDEX idx_mensajes_leido ON mensajes(leido);
    CREATE INDEX idx_mensajes_created ON mensajes(created_at);

    PRINT '✅ Tabla mensajes creada';
END
ELSE
    PRINT '⚠️  Tabla mensajes ya existe';
GO

-- =================================================================
-- TABLA: notificaciones (Sistema de notificaciones)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notificaciones')
BEGIN
    CREATE TABLE notificaciones (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        notificacion_id VARCHAR(100) NOT NULL UNIQUE,
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
            'nueva_oc',
            'factura_aprobada',
            'factura_rechazada',
            'nuevo_mensaje',
            'pago_recibido',
            'documento_validado',
            'documento_rechazado',
            'sistema'
        )),
        titulo NVARCHAR(255) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,
        link NVARCHAR(500) NULL,
        datos NVARCHAR(MAX) NULL, -- JSON object
        leida BIT NOT NULL DEFAULT 0,
        fecha_lectura DATETIME2 NULL,
        email_enviado BIT NOT NULL DEFAULT 0,
        fecha_envio_email DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_notificaciones_notificacion_id ON notificaciones(notificacion_id);
    CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
    CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
    CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
    CREATE INDEX idx_notificaciones_created ON notificaciones(created_at);

    PRINT '✅ Tabla notificaciones creada';
END
ELSE
    PRINT '⚠️  Tabla notificaciones ya existe';
GO

-- =================================================================
-- TABLA: sessions (Sesiones de usuario para auditoría)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sessions')
BEGIN
    CREATE TABLE sessions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX idx_sessions_session_token ON sessions(session_token);
    CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

    PRINT '✅ Tabla sessions creada';
END
ELSE
    PRINT '⚠️  Tabla sessions ya existe';
GO

-- =================================================================
-- TABLA: verification_tokens (Tokens de verificación de email)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'verification_tokens')
BEGIN
    CREATE TABLE verification_tokens (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
    CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);

    PRINT '✅ Tabla verification_tokens creada';
END
ELSE
    PRINT '⚠️  Tabla verification_tokens ya existe';
GO

-- =================================================================
-- TABLA: password_reset_tokens (Tokens de reseteo de contraseña)
-- =================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'password_reset_tokens')
BEGIN
    CREATE TABLE password_reset_tokens (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        used_at DATETIME2 NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

    PRINT '✅ Tabla password_reset_tokens creada';
END
ELSE
    PRINT '⚠️  Tabla password_reset_tokens ya existe';
GO

-- =================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =================================================================

-- Limpieza de tokens expirados
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_cleanup_expired_tokens')
    DROP PROCEDURE sp_cleanup_expired_tokens;
GO

CREATE PROCEDURE sp_cleanup_expired_tokens
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM verification_tokens WHERE expires_at < GETDATE();
    DELETE FROM password_reset_tokens WHERE expires_at < GETDATE();
    DELETE FROM sessions WHERE expires_at < GETDATE();

    PRINT 'Tokens expirados limpiados exitosamente';
END
GO

-- =================================================================
-- DATOS INICIALES (OPCIONAL)
-- =================================================================

-- Insertar empresas iniciales si no existen
IF NOT EXISTS (SELECT * FROM empresas WHERE codigo = 'LCDM')
BEGIN
    INSERT INTO empresas (codigo, nombre_comercial, razon_social, activa)
    VALUES ('LCDM', 'La Cantera', 'La Cantera Desarrollos Mineros S.A.S.', 1);
    PRINT '✅ Empresa LCDM creada';
END

IF NOT EXISTS (SELECT * FROM empresas WHERE codigo = 'ARKITEM')
BEGIN
    INSERT INTO empresas (codigo, nombre_comercial, razon_social, activa)
    VALUES ('ARKITEM', 'Arkitem', 'Arkitem Technologies S.A.S.', 1);
    PRINT '✅ Empresa ARKITEM creada';
END

GO

PRINT '';
PRINT '=================================================================';
PRINT '✅ TODAS LAS TABLAS HAN SIDO CREADAS EXITOSAMENTE';
PRINT '=================================================================';
PRINT '';
PRINT 'Tablas creadas:';
PRINT '  1. users';
PRINT '  2. empresas';
PRINT '  3. usuarios_empresas';
PRINT '  4. proveedores_documentacion';
PRINT '  5. ordenes_compra';
PRINT '  6. facturas';
PRINT '  7. complementos_pago';
PRINT '  8. comprobantes_pago';
PRINT '  9. conversaciones';
PRINT ' 10. mensajes';
PRINT ' 11. notificaciones';
PRINT ' 12. sessions';
PRINT ' 13. verification_tokens';
PRINT ' 14. password_reset_tokens';
PRINT '';
PRINT 'Próximos pasos:';
PRINT '  1. Ejecutar sp_cleanup_expired_tokens periódicamente';
PRINT '  2. Configurar backups automáticos';
PRINT '  3. Revisar permisos de usuarios de la base de datos';
PRINT '=================================================================';
