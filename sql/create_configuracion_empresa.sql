-- =============================================
-- Script: create_configuracion_empresa.sql
-- Descripcion: Crea la tabla para almacenar la configuracion de la empresa
-- Fecha: 2026-01-20
-- =============================================

USE PP;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'configuracion_empresa')
BEGIN
    CREATE TABLE configuracion_empresa (
        id INT IDENTITY(1,1) PRIMARY KEY,
        empresa_code VARCHAR(50) NOT NULL UNIQUE,

        -- Informacion de la empresa
        nombre_empresa NVARCHAR(250) NOT NULL,
        rfc VARCHAR(13) NULL,
        direccion_fiscal NVARCHAR(500) NULL,

        -- Logo
        logo_url VARCHAR(500) NULL,
        logo_nombre VARCHAR(255) NULL,

        -- Preferencias del sistema
        idioma VARCHAR(10) DEFAULT 'es',
        zona_horaria VARCHAR(50) DEFAULT 'America/Mexico_City',
        moneda VARCHAR(3) DEFAULT 'MXN',
        formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
        formato_numeros VARCHAR(20) DEFAULT 'comma',

        -- Auditoria
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_by NVARCHAR(50) NULL
    );

    PRINT 'Tabla configuracion_empresa creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla configuracion_empresa ya existe';
END
GO

-- Crear indice por empresa_code
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('configuracion_empresa') AND name = 'IX_configuracion_empresa_code')
BEGIN
    CREATE INDEX IX_configuracion_empresa_code
    ON configuracion_empresa (empresa_code);
    PRINT 'Indice IX_configuracion_empresa_code creado';
END
GO

-- Insertar configuracion por defecto para CANTERA si no existe
IF NOT EXISTS (SELECT 1 FROM configuracion_empresa WHERE empresa_code = 'CANTERA')
BEGIN
    INSERT INTO configuracion_empresa (
        empresa_code,
        nombre_empresa,
        idioma,
        zona_horaria,
        moneda,
        formato_fecha,
        formato_numeros
    ) VALUES (
        'CANTERA',
        'La Cantera',
        'es',
        'America/Mexico_City',
        'MXN',
        'DD/MM/YYYY',
        'comma'
    );
    PRINT 'Configuracion por defecto insertada para CANTERA';
END
GO

PRINT '=============================================';
PRINT 'Script ejecutado exitosamente';
PRINT '=============================================';
