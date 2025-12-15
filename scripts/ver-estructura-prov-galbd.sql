-- Ver estructura de la tabla Prov en GALBD_PRUEBAS
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: GALBD_PRUEBAS

USE GALBD_PRUEBAS;
GO

-- Ver todas las columnas
SELECT
    COLUMN_NAME AS Columna,
    DATA_TYPE AS TipoDato,
    CHARACTER_MAXIMUM_LENGTH AS Longitud,
    IS_NULLABLE AS PermiteNulos
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Prov'
ORDER BY ORDINAL_POSITION;

-- Ver todos los registros con RFC ACE140813E29
PRINT '';
PRINT 'Registros con RFC ACE140813E29:';
PRINT '─────────────────────────────────────────────────────────────';

SELECT TOP 10
    Proveedor,
    Nombre,
    RFC,
    Direccion,
    Estatus,
    Alta,
    UltimoCambio
FROM Prov
WHERE RFC = 'ACE140813E29'
   OR Proveedor IN ('PV-56', 'P00443');

-- Ver si hay alguna columna que indique la empresa o sucursal
PRINT '';
PRINT 'Columnas que podrían indicar empresa:';
PRINT '─────────────────────────────────────────────────────────────';

SELECT
    COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Prov'
  AND (COLUMN_NAME LIKE '%Empresa%'
    OR COLUMN_NAME LIKE '%Sucursal%'
    OR COLUMN_NAME LIKE '%Division%'
    OR COLUMN_NAME LIKE '%Unidad%')
ORDER BY ORDINAL_POSITION;
