-- ============================================================
-- Diagnóstico Completo - Sistema Multi-Tenant
-- ============================================================

USE PP;
GO

PRINT '============================================================';
PRINT '🔍 DIAGNÓSTICO COMPLETO - MULTI-TENANT';
PRINT '============================================================';
PRINT '';

-- ============================================================
-- 1. TIPOS DE USUARIO DISPONIBLES
-- ============================================================
PRINT '📊 TIPOS DE USUARIO EN EL SISTEMA:';
PRINT '------------------------------------------------------------';

SELECT
    IDUsuarioTipo,
    Descripcion,
    (SELECT COUNT(*) FROM pNetUsuario u WHERE u.IDUsuarioTipo = t.IDUsuarioTipo AND u.Estatus = 'ACTIVO') AS UsuariosActivos,
    (SELECT COUNT(*) FROM pNetUsuario u WHERE u.IDUsuarioTipo = t.IDUsuarioTipo) AS TotalUsuarios
FROM pNetUsuarioTipo t
ORDER BY IDUsuarioTipo;

PRINT '';

-- ============================================================
-- 2. TODOS LOS USUARIOS ACTIVOS (agrupados por tipo)
-- ============================================================
PRINT '👥 USUARIOS ACTIVOS POR TIPO:';
PRINT '------------------------------------------------------------';

SELECT
    u.IDUsuarioTipo,
    t.Descripcion AS TipoUsuario,
    u.IDUsuario,
    u.Usuario,
    u.eMail,
    u.Nombre,
    u.Estatus,
    CASE
        WHEN EXISTS (SELECT 1 FROM pNetUsuarioPassword p WHERE p.IDUsuario = u.IDUsuario)
        THEN 'SI'
        ELSE 'NO'
    END AS TienePassword
FROM pNetUsuario u
INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
WHERE u.Estatus = 'ACTIVO' OR u.Estatus = '1'
ORDER BY u.IDUsuarioTipo, u.IDUsuario;

PRINT '';

-- ============================================================
-- 3. VERIFICAR SI HAY ALGÚN TIPO DE RELACIÓN CON PROVEEDORES
-- ============================================================
PRINT '🔗 VERIFICANDO RELACIONES CON PROVEEDORES:';
PRINT '------------------------------------------------------------';

-- Buscar cualquier tabla que tenga referencia a proveedores
IF EXISTS (SELECT 1 FROM sys.tables WHERE name LIKE '%proveedor%' OR name LIKE '%Proveedor%')
BEGIN
    PRINT '✅ Se encontraron tablas relacionadas con proveedores:';

    SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME LIKE '%proveedor%' OR TABLE_NAME LIKE '%Proveedor%';
END
ELSE
BEGIN
    PRINT '⚠️  No se encontraron tablas relacionadas con proveedores en BD PP';
END

PRINT '';

-- ============================================================
-- 4. VERIFICAR MAPPINGS EXISTENTES
-- ============================================================
PRINT '📋 MAPPINGS EXISTENTES:';
PRINT '------------------------------------------------------------';

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    DECLARE @mappingCount INT;
    SELECT @mappingCount = COUNT(*) FROM portal_proveedor_mapping;

    IF @mappingCount > 0
    BEGIN
        PRINT '✅ Se encontraron ' + CAST(@mappingCount AS VARCHAR) + ' mapping(s):';
        PRINT '';

        SELECT
            m.portal_user_id,
            u.eMail,
            u.Nombre,
            m.erp_proveedor_code,
            m.empresa_code,
            m.permisos,
            m.activo,
            m.created_at
        FROM portal_proveedor_mapping m
        LEFT JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
        ORDER BY m.created_at DESC;
    END
    ELSE
    BEGIN
        PRINT '⚠️  La tabla portal_proveedor_mapping existe pero está vacía';
    END
END
ELSE
BEGIN
    PRINT '❌ La tabla portal_proveedor_mapping NO existe';
END

PRINT '';

-- ============================================================
-- 5. USUARIOS CANDIDATOS PARA TESTING
-- ============================================================
PRINT '🎯 USUARIOS RECOMENDADOS PARA TESTING:';
PRINT '------------------------------------------------------------';
PRINT 'Criterios: Usuario activo + tiene password + tiene email';
PRINT '';

SELECT TOP 10
    u.IDUsuario,
    u.Usuario,
    u.eMail,
    u.Nombre,
    t.Descripcion AS TipoUsuario,
    u.Estatus,
    CASE
        WHEN EXISTS (SELECT 1 FROM pNetUsuarioPassword p WHERE p.IDUsuario = u.IDUsuario)
        THEN '✓'
        ELSE '✗'
    END AS Password,
    CASE
        WHEN u.eMail IS NOT NULL AND u.eMail != ''
        THEN '✓'
        ELSE '✗'
    END AS Email
FROM pNetUsuario u
INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
WHERE (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
  AND u.eMail IS NOT NULL
  AND u.eMail != ''
  AND EXISTS (SELECT 1 FROM pNetUsuarioPassword p WHERE p.IDUsuario = u.IDUsuario)
ORDER BY u.IDUsuario;

PRINT '';

-- ============================================================
-- 6. VERIFICAR CONEXIÓN A BASES DE DATOS ERP
-- ============================================================
PRINT '💾 BASES DE DATOS DISPONIBLES:';
PRINT '------------------------------------------------------------';

SELECT
    name AS DatabaseName,
    database_id,
    create_date,
    compatibility_level,
    state_desc AS Estado
FROM sys.databases
WHERE name IN ('PP', 'LaCantera_DB', 'Peralillo_DB', 'Galerena_DB', 'Icrear_DB')
   OR name LIKE '%Cantera%'
   OR name LIKE '%Peralillo%'
   OR name LIKE '%Galerena%'
   OR name LIKE '%Icrear%'
ORDER BY name;

PRINT '';

-- ============================================================
-- 7. SUGERENCIAS PARA SIGUIENTE PASO
-- ============================================================
PRINT '============================================================';
PRINT '💡 RECOMENDACIONES:';
PRINT '============================================================';
PRINT '';
PRINT '1. Revisa la sección "USUARIOS RECOMENDADOS PARA TESTING"';
PRINT '2. Elige un IDUsuario que tenga ✓ en Password y Email';
PRINT '3. Anota el IDUsuario seleccionado';
PRINT '4. Ejecuta el script: crear-mappings-manual.sql';
PRINT '5. Reemplaza el @userId con el IDUsuario seleccionado';
PRINT '';
PRINT '⚠️  IMPORTANTE:';
PRINT '- Necesitarás conocer el código de proveedor en el ERP';
PRINT '- Los códigos de empresa son: LCDM, PERA, PLAZ, ICRE, INMO';
PRINT '';
PRINT '============================================================';
