-- Script de creación de tablas para NextAuth con SQL Server
-- Base de datos: La Cantera - Portal de Proveedores

-- Tabla de usuarios
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
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

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_users_user_type ON users(user_type);
END
GO

-- Tabla de empresas (si no existe)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'empresas')
BEGIN
    CREATE TABLE empresas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        nombre_comercial NVARCHAR(255) NOT NULL,
        razon_social NVARCHAR(255) NOT NULL,
        rfc VARCHAR(13) NOT NULL UNIQUE,
        direccion NVARCHAR(500) NULL,
        telefono VARCHAR(20) NULL,
        email VARCHAR(255) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NULL
    );

    CREATE INDEX idx_empresas_rfc ON empresas(rfc);
END
GO

-- Tabla de relación usuario-empresa (muchos a muchos)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'usuario_empresa')
BEGIN
    CREATE TABLE usuario_empresa (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        usuario_id UNIQUEIDENTIFIER NOT NULL,
        empresa_id UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,

        UNIQUE (usuario_id, empresa_id)
    );

    CREATE INDEX idx_usuario_empresa_usuario ON usuario_empresa(usuario_id);
    CREATE INDEX idx_usuario_empresa_empresa ON usuario_empresa(empresa_id);
END
GO

-- Tabla de sesiones (opcional, para auditoría)
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
END
GO

-- Tabla de tokens de verificación de email
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
END
GO

-- Tabla de tokens de reseteo de contraseña
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
END
GO

-- Procedimiento almacenado para limpiar tokens expirados
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_cleanup_expired_tokens')
BEGIN
    DROP PROCEDURE sp_cleanup_expired_tokens;
END
GO

CREATE PROCEDURE sp_cleanup_expired_tokens
AS
BEGIN
    SET NOCOUNT ON;

    -- Eliminar tokens de verificación expirados
    DELETE FROM verification_tokens
    WHERE expires_at < GETDATE();

    -- Eliminar tokens de reseteo expirados
    DELETE FROM password_reset_tokens
    WHERE expires_at < GETDATE();

    -- Eliminar sesiones expiradas
    DELETE FROM sessions
    WHERE expires_at < GETDATE();
END
GO

PRINT 'Tablas de autenticación creadas exitosamente';
