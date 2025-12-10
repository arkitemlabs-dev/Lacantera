-- ============================================================
-- Script de Diagnóstico Multi-Tenant
-- ============================================================

USE PP;
GO

PRINT '============================================================';
PRINT '1. VERIFICAR TABLAS CREADAS';
PRINT '============================================================';

SELECT name AS 'Tabla Creada'
FROM sys.tables
WHERE name IN ('portal_proveedor_mapping', 'portal_orden_status');

PRINT '';
PRINT '============================================================';
PRINT '2. VERIFICAR USUARIOS DISPONIBLES';
PRINT '============================================================';

SELECT
    u.IDUsuario,
    u.Usuario,
    u.eMail,
    u.Nombre,
    u.IDUsuarioTipo,
    t.Descripcion AS TipoUsuario,
    u.Estatus,
    CASE WHEN p.PasswordHash IS NOT NULL THEN 'SI' ELSE 'NO' END AS 'Tiene Password'
FROM pNetUsuario u
INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
LEFT JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
WHERE u.Estatus = 'ACTIVO' OR u.Estatus = '1'
ORDER BY u.IDUsuarioTipo, u.eMail;

PRINT '';
PRINT '============================================================';
PRINT '3. CONTAR USUARIOS POR TIPO';
PRINT '============================================================';

SELECT
    t.Descripcion AS 'Tipo Usuario',
    COUNT(*) AS 'Cantidad',
    SUM(CASE WHEN u.Estatus = 'ACTIVO' OR u.Estatus = '1' THEN 1 ELSE 0 END) AS 'Activos'
FROM pNetUsuario u
INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
GROUP BY t.Descripcion
ORDER BY COUNT(*) DESC;

PRINT '';
PRINT '============================================================';
PRINT '4. VERIFICAR MAPPINGS EXISTENTES';
PRINT '============================================================';

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    SELECT
        COUNT(*) AS 'Total Mappings'
    FROM portal_proveedor_mapping;

    IF EXISTS (SELECT * FROM portal_proveedor_mapping)
    BEGIN
        SELECT
            m.portal_user_id AS 'ID Usuario',
            u.eMail AS 'Email',
            u.Nombre AS 'Nombre',
            m.erp_proveedor_code AS 'Código Proveedor',
            m.empresa_code AS 'Código Empresa',
            m.activo AS 'Activo'
        FROM portal_proveedor_mapping m
        LEFT JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id;
    END
    ELSE
    BEGIN
        PRINT 'No hay mappings creados todavía';
    END
END
ELSE
BEGIN
    PRINT 'La tabla portal_proveedor_mapping no existe';
END

PRINT '';
PRINT '============================================================';
PRINT '5. BUSCAR PRIMER USUARIO PROVEEDOR';
PRINT '============================================================';

DECLARE @testUserId NVARCHAR(50);

SELECT TOP 1 @testUserId = CAST(IDUsuario AS NVARCHAR(50))
FROM pNetUsuario
WHERE IDUsuarioTipo = 4  -- Proveedor
  AND (Estatus = 'ACTIVO' OR Estatus = '1');

IF @testUserId IS NULL
BEGIN
    PRINT '❌ NO SE ENCONTRÓ NINGÚN USUARIO TIPO PROVEEDOR ACTIVO';
    PRINT '';
    PRINT 'Usuarios con IDUsuarioTipo = 4:';
    SELECT
        IDUsuario,
        Usuario,
        eMail,
        Nombre,
        Estatus
    FROM pNetUsuario
    WHERE IDUsuarioTipo = 4;
END
ELSE
BEGIN
    PRINT '✅ Usuario proveedor encontrado:';
    SELECT
        IDUsuario,
        Usuario,
        eMail,
        Nombre,
        Estatus,
        Empresa
    FROM pNetUsuario
    WHERE IDUsuario = CAST(@testUserId AS INT);
END

PRINT '';
PRINT '============================================================';
PRINT '6. RECOMENDACIONES';
PRINT '============================================================';
PRINT '';

IF @testUserId IS NULL
BEGIN
    PRINT '⚠️  NO HAY USUARIOS PROVEEDORES';
    PRINT '';
    PRINT 'OPCIÓN 1: Crear un usuario proveedor de prueba:';
    PRINT 'Ejecuta el script: crear-usuario-proveedor-prueba.sql';
    PRINT '';
    PRINT 'OPCIÓN 2: Usar un usuario existente:';
    PRINT 'Ejecuta el script con un IDUsuario específico';
END
ELSE
BEGIN
    PRINT '✅ TODO LISTO';
    PRINT '';
    PRINT 'Ejecuta el siguiente comando para crear los mappings:';
    PRINT 'sqlcmd -S cloud.arkitem.com -U sa_ediaz -d PP -i crear-mappings-manual.sql';
END
