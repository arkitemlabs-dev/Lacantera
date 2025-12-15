-- Script para ver todas las columnas de la tabla Prov en el ERP
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: LACANTERA (o cualquier ERP)

-- Ver estructura de la tabla Prov
SELECT
    COLUMN_NAME AS Columna,
    DATA_TYPE AS TipoDato,
    CHARACTER_MAXIMUM_LENGTH AS Longitud,
    IS_NULLABLE AS PermiteNulos
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Prov'
ORDER BY ORDINAL_POSITION;

-- Ver una muestra de datos del proveedor P00443
SELECT TOP 1 *
FROM Prov
WHERE Proveedor = 'P00443';
