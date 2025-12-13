-- Script de Diagnóstico: Verificar sincronización de proveedores
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════';
PRINT '🔍 DIAGNÓSTICO DE SINCRONIZACIÓN';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

-- 1. Verificar usuario registrado
PRINT '1️⃣ Usuario registrado con RFC ACE140813E29:';
SELECT
    u.IDUsuario,
    u.Usuario,
    u.eMail,
    u.Nombre,
    u.IDUsuarioTipo,
    u.Estatus,
    p.RFC,
    p.Nombre AS NombreProveedor
FROM pNetUsuario u
LEFT JOIN Prov p ON u.Usuario = p.Proveedor
WHERE p.RFC = 'ACE140813E29'
   OR u.eMail LIKE '%arquitectura%';

PRINT '';
PRINT '2️⃣ Mappings creados para este usuario:';
SELECT
    ppm.id,
    ppm.portal_user_id,
    ppm.erp_proveedor_code,
    ppm.empresa_code,
    ppm.activo,
    ppm.created_at
FROM portal_proveedor_mapping ppm
WHERE ppm.portal_user_id IN (
    SELECT CAST(u.IDUsuario AS NVARCHAR(50))
    FROM pNetUsuario u
    LEFT JOIN Prov p ON u.Usuario = p.Proveedor
    WHERE p.RFC = 'ACE140813E29'
       OR u.eMail LIKE '%arquitectura%'
);

PRINT '';
PRINT '3️⃣ Total de mappings por empresa:';
SELECT
    empresa_code,
    COUNT(*) AS TotalMappings
FROM portal_proveedor_mapping
GROUP BY empresa_code
ORDER BY empresa_code;

PRINT '';
PRINT '4️⃣ Verificar si la tabla portal_proveedor_mapping existe:';
IF OBJECT_ID('portal_proveedor_mapping', 'U') IS NOT NULL
    PRINT '✅ Tabla portal_proveedor_mapping existe';
ELSE
    PRINT '❌ Tabla portal_proveedor_mapping NO EXISTE - DEBE CREARSE';

PRINT '';
PRINT '5️⃣ Estructura de la tabla (si existe):';
IF OBJECT_ID('portal_proveedor_mapping', 'U') IS NOT NULL
BEGIN
    SELECT
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Longitud
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'portal_proveedor_mapping'
    ORDER BY ORDINAL_POSITION;
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '✅ Diagnóstico completado';
PRINT '';
PRINT '📝 SIGUIENTE PASO:';
PRINT '1. Revisar los resultados arriba';
PRINT '2. Si NO hay mappings, ejecutar sincronización manual';
PRINT '3. Si NO existe la tabla, ejecutar script de creación';
