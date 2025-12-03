-- =============================================
-- Script to check existing table schemas
-- Run this in SQL Server Management Studio to get accurate column definitions
-- =============================================

USE PP;
GO

PRINT '========================================';
PRINT 'Checking pNetUsuario table structure';
PRINT '========================================';

-- Check pNetUsuario columns
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pNetUsuario'
ORDER BY ORDINAL_POSITION;

-- Check for primary keys on pNetUsuario
SELECT
    tc.CONSTRAINT_NAME,
    tc.CONSTRAINT_TYPE,
    kcu.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE tc.TABLE_NAME = 'pNetUsuario'
    AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';

PRINT '';
PRINT '========================================';
PRINT 'Checking Prov table structure';
PRINT '========================================';

-- Check Prov columns
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Prov'
ORDER BY ORDINAL_POSITION;

-- Check for primary keys on Prov
SELECT
    tc.CONSTRAINT_NAME,
    tc.CONSTRAINT_TYPE,
    kcu.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE tc.TABLE_NAME = 'Prov'
    AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';

PRINT '';
PRINT '========================================';
PRINT 'Checking Empresa table structure';
PRINT '========================================';

-- Check Empresa columns
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Empresa'
ORDER BY ORDINAL_POSITION;

-- Check for primary keys on Empresa
SELECT
    tc.CONSTRAINT_NAME,
    tc.CONSTRAINT_TYPE,
    kcu.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE tc.TABLE_NAME = 'Empresa'
    AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';

PRINT '';
PRINT '========================================';
PRINT 'Checking pNetUsuarioEmpresa table structure';
PRINT '========================================';

-- Check if pNetUsuarioEmpresa exists
IF OBJECT_ID('pNetUsuarioEmpresa', 'U') IS NOT NULL
BEGIN
    SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pNetUsuarioEmpresa'
    ORDER BY ORDINAL_POSITION;

    -- Check foreign keys
    SELECT
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME = 'pNetUsuarioEmpresa';
END
ELSE
BEGIN
    PRINT 'pNetUsuarioEmpresa table does not exist yet';
END
