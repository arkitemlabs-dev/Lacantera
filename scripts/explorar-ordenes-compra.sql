-- Script para explorar las tablas de órdenes de compra en el ERP
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: Cantera_ajustes

USE Cantera_ajustes;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 EXPLORANDO TABLAS DE ÓRDENES DE COMPRA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ============================================================================
-- 1. Buscar tablas relacionadas con órdenes de compra
-- ============================================================================
PRINT '📋 1. TABLAS RELACIONADAS CON ÓRDENES DE COMPRA';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    TABLE_NAME AS Tabla
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (
    TABLE_NAME LIKE '%Compra%'
    OR TABLE_NAME LIKE '%Orden%'
    OR TABLE_NAME LIKE '%OC%'
    OR TABLE_NAME LIKE '%Pedido%'
    OR TABLE_NAME LIKE '%Requisicion%'
  )
ORDER BY TABLE_NAME;

PRINT '';
PRINT '';

-- ============================================================================
-- 2. Intentar encontrar órdenes de compra del proveedor P00443
-- ============================================================================
PRINT '🔍 2. BUSCANDO ÓRDENES DE COMPRA PARA EL PROVEEDOR P00443';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

-- Intentar algunas tablas comunes
PRINT 'Intentando tabla: Compra';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Compra')
BEGIN
    PRINT 'Estructura de la tabla Compra:';
    SELECT TOP 5
        COLUMN_NAME AS Columna,
        DATA_TYPE AS TipoDato,
        CHARACTER_MAXIMUM_LENGTH AS Longitud
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Compra'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT 'Primeros 5 registros del proveedor P00443:';
    EXEC('SELECT TOP 5 * FROM Compra WHERE Proveedor = ''P00443'' ORDER BY ID DESC');
END
ELSE
BEGIN
    PRINT '❌ Tabla Compra no existe';
END

PRINT '';
PRINT '';

PRINT 'Intentando tabla: OrdenCompra';
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OrdenCompra')
BEGIN
    PRINT 'Estructura de la tabla OrdenCompra:';
    SELECT TOP 5
        COLUMN_NAME AS Columna,
        DATA_TYPE AS TipoDato,
        CHARACTER_MAXIMUM_LENGTH AS Longitud
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'OrdenCompra'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT 'Primeros 5 registros del proveedor P00443:';
    EXEC('SELECT TOP 5 * FROM OrdenCompra WHERE Proveedor = ''P00443'' ORDER BY Fecha DESC');
END
ELSE
BEGIN
    PRINT '❌ Tabla OrdenCompra no existe';
END

PRINT '';
PRINT '';

-- ============================================================================
-- 3. Listar TODAS las tablas para ayudar a identificar la correcta
-- ============================================================================
PRINT '📊 3. TODAS LAS TABLAS DISPONIBLES (primeras 50)';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT TOP 50
    TABLE_NAME AS Tabla
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ Exploración completada';
PRINT '';
PRINT 'Revisa las tablas encontradas para identificar dónde están las órdenes de compra';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
