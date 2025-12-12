-- Script para explorar la estructura de tablas de pagos en los ERPs
-- Esto nos ayuda a identificar qué tabla y campos usar para los pagos

-- ============================================
-- EMPRESA 1: LA CANTERA
-- ============================================
PRINT '🔍 Explorando tablas de pagos en LA CANTERA...';
PRINT '';

USE Cantera_ajustes;
GO

-- Buscar tablas que contengan "Pago" o "Cob" (Cobranza)
SELECT
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cob%'
    OR TABLE_NAME LIKE '%CxP%'
    OR TABLE_NAME LIKE '%Compra%')
ORDER BY TABLE_NAME;

PRINT '';
PRINT '================================================';
PRINT '';

-- ============================================
-- EMPRESA 2: PERALILLO
-- ============================================
PRINT '🔍 Explorando tablas de pagos en PERALILLO...';
PRINT '';

USE Peralillo_Ajustes;
GO

SELECT
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cob%'
    OR TABLE_NAME LIKE '%CxP%'
    OR TABLE_NAME LIKE '%Compra%')
ORDER BY TABLE_NAME;

PRINT '';
PRINT '================================================';
PRINT '';

-- ============================================
-- EMPRESA 3: PLAZA GALEREÑA
-- ============================================
PRINT '🔍 Explorando tablas de pagos en PLAZA GALEREÑA...';
PRINT '';

USE GALBD_PRUEBAS;
GO

SELECT
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND (TABLE_NAME LIKE '%Pago%'
    OR TABLE_NAME LIKE '%Cob%'
    OR TABLE_NAME LIKE '%CxP%'
    OR TABLE_NAME LIKE '%Compra%')
ORDER BY TABLE_NAME;

PRINT '';
PRINT '✅ Exploración completada';
PRINT '';
PRINT '📝 Notas:';
PRINT 'Busca tablas como:';
PRINT '  - CxP (Cuentas por Pagar)';
PRINT '  - CxPD (Detalle de Cuentas por Pagar)';
PRINT '  - CompraPago';
PRINT '  - MovCxP';
PRINT '  - Pago o similar';
