-- Script para ver la estructura y datos de la tabla AnexoCta
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: Cantera_ajustes (o cualquier ERP)

USE Cantera_ajustes;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 ESTRUCTURA DE LA TABLA AnexoCta';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- Ver estructura de la tabla
SELECT
    COLUMN_NAME AS Columna,
    DATA_TYPE AS TipoDato,
    CHARACTER_MAXIMUM_LENGTH AS Longitud,
    IS_NULLABLE AS PermiteNulos
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'AnexoCta'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '📄 PRIMEROS 10 REGISTROS DE AnexoCta (TODAS LAS COLUMNAS)';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- Ver algunos registros de ejemplo CON TODAS LAS COLUMNAS (sin asumir nombres)
SELECT TOP 10 *
FROM AnexoCta;

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ Script completado';
PRINT '';
PRINT 'Revisa los nombres de las columnas arriba para poder hacer consultas correctas';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
