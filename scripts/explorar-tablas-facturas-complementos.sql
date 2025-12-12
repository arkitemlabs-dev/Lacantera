-- Script para explorar tablas de Facturas y Complementos de Pago en los ERPs
-- Esto nos ayuda a identificar qué tablas y campos usar

-- ============================================
-- PASO 1: Buscar tablas relacionadas con Facturas
-- ============================================
PRINT '🔍 BUSCANDO TABLAS DE FACTURAS...';
PRINT '';

-- EMPRESA 1: LA CANTERA
USE Cantera_ajustes;
PRINT '📌 LA CANTERA (Cantera_ajustes):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Factura%'
    OR TABLE_NAME LIKE '%Fact%'
    OR TABLE_NAME LIKE '%CFDI%'
    OR TABLE_NAME LIKE '%XML%'
    OR TABLE_NAME LIKE '%Venta%'
    OR TABLE_NAME LIKE '%CxC%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 2: PERALILLO
USE Peralillo_Ajustes;
PRINT '📌 PERALILLO (Peralillo_Ajustes):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Factura%'
    OR TABLE_NAME LIKE '%Fact%'
    OR TABLE_NAME LIKE '%CFDI%'
    OR TABLE_NAME LIKE '%XML%'
    OR TABLE_NAME LIKE '%Venta%'
    OR TABLE_NAME LIKE '%CxC%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 3: PLAZA GALEREÑA
USE GALBD_PRUEBAS;
PRINT '📌 PLAZA GALEREÑA (GALBD_PRUEBAS):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Factura%'
    OR TABLE_NAME LIKE '%Fact%'
    OR TABLE_NAME LIKE '%CFDI%'
    OR TABLE_NAME LIKE '%XML%'
    OR TABLE_NAME LIKE '%Venta%'
    OR TABLE_NAME LIKE '%CxC%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 4: ICREAR
USE ICREAR_PRUEBAS;
PRINT '📌 ICREAR (ICREAR_PRUEBAS):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Factura%'
    OR TABLE_NAME LIKE '%Fact%'
    OR TABLE_NAME LIKE '%CFDI%'
    OR TABLE_NAME LIKE '%XML%'
    OR TABLE_NAME LIKE '%Venta%'
    OR TABLE_NAME LIKE '%CxC%')
ORDER BY TABLE_NAME;
PRINT '';

-- ============================================
-- PASO 2: Buscar tablas de Complementos de Pago
-- ============================================
PRINT '';
PRINT '🔍 BUSCANDO TABLAS DE COMPLEMENTOS DE PAGO...';
PRINT '';

-- EMPRESA 1: LA CANTERA
USE Cantera_ajustes;
PRINT '📌 LA CANTERA (Cantera_ajustes):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Complement%'
    OR TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cobro%'
    OR TABLE_NAME LIKE '%Abono%'
    OR TABLE_NAME LIKE '%CxC%Mov%'
    OR TABLE_NAME LIKE '%CxP%Mov%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 2: PERALILLO
USE Peralillo_Ajustes;
PRINT '📌 PERALILLO (Peralillo_Ajustes):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Complement%'
    OR TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cobro%'
    OR TABLE_NAME LIKE '%Abono%'
    OR TABLE_NAME LIKE '%CxC%Mov%'
    OR TABLE_NAME LIKE '%CxP%Mov%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 3: PLAZA GALEREÑA
USE GALBD_PRUEBAS;
PRINT '📌 PLAZA GALEREÑA (GALBD_PRUEBAS):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Complement%'
    OR TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cobro%'
    OR TABLE_NAME LIKE '%Abono%'
    OR TABLE_NAME LIKE '%CxC%Mov%'
    OR TABLE_NAME LIKE '%CxP%Mov%')
ORDER BY TABLE_NAME;
PRINT '';

-- EMPRESA 4: ICREAR
USE ICREAR_PRUEBAS;
PRINT '📌 ICREAR (ICREAR_PRUEBAS):';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Complement%'
    OR TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cobro%'
    OR TABLE_NAME LIKE '%Abono%'
    OR TABLE_NAME LIKE '%CxC%Mov%'
    OR TABLE_NAME LIKE '%CxP%Mov%')
ORDER BY TABLE_NAME;
PRINT '';

-- ============================================
-- PASO 3: Verificar estructura de tabla CxC (si existe)
-- ============================================
PRINT '';
PRINT '🔍 VERIFICANDO ESTRUCTURA DE TABLA CxC (Cuentas por Cobrar)...';
PRINT '';

USE Cantera_ajustes;
IF OBJECT_ID('CxC', 'U') IS NOT NULL
BEGIN
    PRINT '✅ Tabla CxC existe en La Cantera';
    PRINT 'Columnas disponibles:';
    SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CxC'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '❌ Tabla CxC no existe en La Cantera';
END
PRINT '';

PRINT '';
PRINT '✅ Exploración completada';
PRINT '';
PRINT '📝 SIGUIENTES PASOS:';
PRINT '1. Revisar las tablas encontradas arriba';
PRINT '2. Identificar cuál tabla almacena:';
PRINT '   - Facturas del proveedor (posiblemente CxC o similar)';
PRINT '   - Complementos de pago';
PRINT '   - XMLs de facturas';
PRINT '3. Ver ejemplos de datos en esas tablas';
