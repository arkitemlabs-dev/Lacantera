-- ============================================================
-- Script de Diagnóstico de Estructura de Tablas
-- Base de Datos: PP (Portal)
-- ============================================================
-- Este script muestra la estructura real de las tablas del portal
-- para verificar los nombres correctos de las columnas
-- ============================================================

USE PP;
GO

PRINT '============================================================';
PRINT '📋 DIAGNÓSTICO DE ESTRUCTURA DE TABLAS - PP';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. Verificar si existe pNetNotificaciones
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetNotificaciones')
BEGIN
    PRINT '✅ Tabla pNetNotificaciones EXISTE';
    PRINT '';
    PRINT '📋 Estructura de pNetNotificaciones:';
    PRINT '------------------------------------------------------------';

    SELECT
        COLUMN_NAME as 'Nombre Columna',
        DATA_TYPE as 'Tipo Dato',
        CHARACTER_MAXIMUM_LENGTH as 'Longitud Max',
        IS_NULLABLE as 'Permite NULL'
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pNetNotificaciones'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Cantidad de registros:';
    SELECT COUNT(*) as TotalRegistros FROM pNetNotificaciones;
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla pNetNotificaciones NO EXISTE';
    PRINT '';
END

-- ============================================================
-- 2. Verificar si existe pNetConversaciones
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetConversaciones')
BEGIN
    PRINT '✅ Tabla pNetConversaciones EXISTE';
    PRINT '';
    PRINT '📋 Estructura de pNetConversaciones:';
    PRINT '------------------------------------------------------------';

    SELECT
        COLUMN_NAME as 'Nombre Columna',
        DATA_TYPE as 'Tipo Dato',
        CHARACTER_MAXIMUM_LENGTH as 'Longitud Max',
        IS_NULLABLE as 'Permite NULL'
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pNetConversaciones'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Cantidad de registros:';
    SELECT COUNT(*) as TotalRegistros FROM pNetConversaciones;
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla pNetConversaciones NO EXISTE';
    PRINT '';
END

-- ============================================================
-- 3. Verificar si existe pNetMensajes
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetMensajes')
BEGIN
    PRINT '✅ Tabla pNetMensajes EXISTE';
    PRINT '';
    PRINT '📋 Estructura de pNetMensajes:';
    PRINT '------------------------------------------------------------';

    SELECT
        COLUMN_NAME as 'Nombre Columna',
        DATA_TYPE as 'Tipo Dato',
        CHARACTER_MAXIMUM_LENGTH as 'Longitud Max',
        IS_NULLABLE as 'Permite NULL'
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pNetMensajes'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Cantidad de registros:';
    SELECT COUNT(*) as TotalRegistros FROM pNetMensajes;
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla pNetMensajes NO EXISTE';
    PRINT '';
END

-- ============================================================
-- 4. Verificar si existe ProvDocumentos
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'ProvDocumentos')
BEGIN
    PRINT '✅ Tabla ProvDocumentos EXISTE';
    PRINT '';
    PRINT '📋 Estructura de ProvDocumentos:';
    PRINT '------------------------------------------------------------';

    SELECT
        COLUMN_NAME as 'Nombre Columna',
        DATA_TYPE as 'Tipo Dato',
        CHARACTER_MAXIMUM_LENGTH as 'Longitud Max',
        IS_NULLABLE as 'Permite NULL'
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ProvDocumentos'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Cantidad de registros:';
    SELECT COUNT(*) as TotalRegistros FROM ProvDocumentos;
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla ProvDocumentos NO EXISTE';
    PRINT '';
END

-- ============================================================
-- 5. Verificar portal_proveedor_mapping
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    PRINT '✅ Tabla portal_proveedor_mapping EXISTE';
    PRINT '';
    PRINT '📋 Estructura de portal_proveedor_mapping:';
    PRINT '------------------------------------------------------------';

    SELECT
        COLUMN_NAME as 'Nombre Columna',
        DATA_TYPE as 'Tipo Dato',
        CHARACTER_MAXIMUM_LENGTH as 'Longitud Max',
        IS_NULLABLE as 'Permite NULL'
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'portal_proveedor_mapping'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Mappings existentes:';
    SELECT
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        activo
    FROM portal_proveedor_mapping
    ORDER BY portal_user_id, empresa_code;
    PRINT '';
END
ELSE
BEGIN
    PRINT '❌ Tabla portal_proveedor_mapping NO EXISTE';
    PRINT '';
END

-- ============================================================
-- 6. Listar TODAS las tablas que empiezan con 'pNet' o 'Prov'
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT '📚 TODAS LAS TABLAS DEL PORTAL (pNet*, Prov*, portal_*)';
PRINT '============================================================';

SELECT
    TABLE_NAME as 'Nombre Tabla',
    TABLE_TYPE as 'Tipo'
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'pNet%'
   OR TABLE_NAME LIKE 'Prov%'
   OR TABLE_NAME LIKE 'portal_%'
ORDER BY TABLE_NAME;

PRINT '';
PRINT '============================================================';
PRINT '✅ DIAGNÓSTICO COMPLETADO';
PRINT '============================================================';
