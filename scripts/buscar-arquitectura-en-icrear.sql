-- Buscar ARQUITECTURA Y CONSULTORIA EMPRESARIAL en ICREAR_PRUEBAS
-- Para obtener su código de proveedor

USE ICREAR_PRUEBAS;
GO

PRINT '🔍 Buscando ARQUITECTURA Y CONSULTORIA EMPRESARIAL en ICREAR_PRUEBAS...';
PRINT '';

-- Buscar por nombre
SELECT
    Proveedor AS Codigo,
    Nombre,
    RFC,
    Estatus,
    eMail1 AS Email,
    Telefonos
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%'
   OR Nombre LIKE '%CONSULTORIA%'
   OR RFC = 'ACE140813E29'
ORDER BY Nombre;

PRINT '';
PRINT '✅ Búsqueda completada';
PRINT '';
PRINT '📝 Anota el código del proveedor que aparezca arriba';
