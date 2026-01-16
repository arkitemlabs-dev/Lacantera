-- Script para crear la tabla de tokens de recuperación de contraseña
-- Ejecutar en la base de datos del Portal (PP)

-- Crear tabla si no existe
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PasswordResetTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PasswordResetTokens] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [Email] VARCHAR(100) NOT NULL,
        [TokenHash] VARCHAR(255) NOT NULL,
        [TipoUsuario] VARCHAR(20) NOT NULL, -- 'proveedor' o 'admin'
        [ExpiresAt] DATETIME NOT NULL,
        [IPAddress] VARCHAR(50) NULL,
        [Usado] BIT NOT NULL DEFAULT 0,
        [UsadoAt] DATETIME NULL,
        [UsadoIP] VARCHAR(50) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );

    -- Índices para búsquedas rápidas
    CREATE INDEX IX_PasswordResetTokens_Email ON PasswordResetTokens(Email);
    CREATE INDEX IX_PasswordResetTokens_TokenHash ON PasswordResetTokens(TokenHash);
    CREATE INDEX IX_PasswordResetTokens_ExpiresAt ON PasswordResetTokens(ExpiresAt);

    PRINT 'Tabla PasswordResetTokens creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla PasswordResetTokens ya existe';
END
GO

-- Crear tabla para confirmación de cambio de email de recuperación
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmailChangeTokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[EmailChangeTokens] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [UserId] VARCHAR(50) NOT NULL,
        [TipoUsuario] VARCHAR(20) NOT NULL, -- 'proveedor' o 'admin'
        [EmailActual] VARCHAR(100) NOT NULL,
        [EmailNuevo] VARCHAR(100) NOT NULL,
        [TokenHash] VARCHAR(255) NOT NULL,
        [ExpiresAt] DATETIME NOT NULL,
        [IPAddress] VARCHAR(50) NULL,
        [Confirmado] BIT NOT NULL DEFAULT 0,
        [ConfirmadoAt] DATETIME NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );

    -- Índices
    CREATE INDEX IX_EmailChangeTokens_UserId ON EmailChangeTokens(UserId);
    CREATE INDEX IX_EmailChangeTokens_TokenHash ON EmailChangeTokens(TokenHash);
    CREATE INDEX IX_EmailChangeTokens_EmailNuevo ON EmailChangeTokens(EmailNuevo);

    PRINT 'Tabla EmailChangeTokens creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla EmailChangeTokens ya existe';
END
GO

-- Job para limpiar tokens expirados (opcional, ejecutar periódicamente)
-- DELETE FROM PasswordResetTokens WHERE ExpiresAt < DATEADD(DAY, -7, GETDATE());
-- DELETE FROM EmailChangeTokens WHERE ExpiresAt < DATEADD(DAY, -7, GETDATE());
