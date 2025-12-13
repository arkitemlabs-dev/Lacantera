-- Sincronización Manual de ARQUITECTURA Y CONSULTORIA
-- RFC: ACE140813E29
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP

USE PP;
GO

PRINT '🔄 Iniciando sincronización manual de ARQUITECTURA Y CONSULTORIA';
PRINT '══════════════════════════════════════════════════════════════';
PRINT '';

-- PASO 1: Obtener el IDUsuario del registro
DECLARE @PortalUserId NVARCHAR(50);

SELECT TOP 1 @PortalUserId = CAST(u.IDUsuario AS NVARCHAR(50))
FROM pNetUsuario u
LEFT JOIN Prov p ON u.Usuario = p.Proveedor
WHERE p.RFC = 'ACE140813E29'
   OR u.eMail LIKE '%arquitectura%'
ORDER BY u.IDUsuario DESC;

IF @PortalUserId IS NULL
BEGIN
    PRINT '❌ ERROR: No se encontró usuario registrado con RFC ACE140813E29';
    PRINT '   Verifica que el registro se haya completado correctamente';
    RETURN;
END

PRINT '✅ Usuario encontrado: ' + @PortalUserId;
PRINT '';

-- PASO 2: Verificar que existe la tabla portal_proveedor_mapping
IF OBJECT_ID('portal_proveedor_mapping', 'U') IS NULL
BEGIN
    PRINT '❌ ERROR: La tabla portal_proveedor_mapping NO EXISTE';
    PRINT '   Debes ejecutar: scripts/crear-tabla-portal-proveedor-mapping.sql';
    RETURN;
END

PRINT '✅ Tabla portal_proveedor_mapping existe';
PRINT '';

-- PASO 3: Insertar mappings para cada empresa
-- NOTA: Los códigos de proveedor fueron obtenidos de la exploración previa

PRINT '📍 Creando mappings...';
PRINT '';

-- La Cantera (código P00443)
IF NOT EXISTS (
    SELECT 1 FROM portal_proveedor_mapping
    WHERE portal_user_id = @PortalUserId
      AND empresa_code = 'la-cantera'
)
BEGIN
    INSERT INTO portal_proveedor_mapping (
        id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at
    ) VALUES (
        NEWID(), @PortalUserId, 'P00443', 'la-cantera', 1, GETDATE()
    );
    PRINT '✅ La Cantera (P00443) - Mapping creado';
END
ELSE
    PRINT '⚠️  La Cantera - Mapping ya existe';

-- Peralillo (código P00443)
IF NOT EXISTS (
    SELECT 1 FROM portal_proveedor_mapping
    WHERE portal_user_id = @PortalUserId
      AND empresa_code = 'peralillo'
)
BEGIN
    INSERT INTO portal_proveedor_mapping (
        id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at
    ) VALUES (
        NEWID(), @PortalUserId, 'P00443', 'peralillo', 1, GETDATE()
    );
    PRINT '✅ Peralillo (P00443) - Mapping creado';
END
ELSE
    PRINT '⚠️  Peralillo - Mapping ya existe';

-- Plaza Galereña (código PV-56)
IF NOT EXISTS (
    SELECT 1 FROM portal_proveedor_mapping
    WHERE portal_user_id = @PortalUserId
      AND empresa_code = 'plaza-galerena'
)
BEGIN
    INSERT INTO portal_proveedor_mapping (
        id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at
    ) VALUES (
        NEWID(), @PortalUserId, 'PV-56', 'plaza-galerena', 1, GETDATE()
    );
    PRINT '✅ Plaza Galereña (PV-56) - Mapping creado';
END
ELSE
    PRINT '⚠️  Plaza Galereña - Mapping ya existe';

-- Inmobiliaria Galereña (código PV-56)
IF NOT EXISTS (
    SELECT 1 FROM portal_proveedor_mapping
    WHERE portal_user_id = @PortalUserId
      AND empresa_code = 'inmobiliaria-galerena'
)
BEGIN
    INSERT INTO portal_proveedor_mapping (
        id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at
    ) VALUES (
        NEWID(), @PortalUserId, 'PV-56', 'inmobiliaria-galerena', 1, GETDATE()
    );
    PRINT '✅ Inmobiliaria Galereña (PV-56) - Mapping creado';
END
ELSE
    PRINT '⚠️  Inmobiliaria Galereña - Mapping ya existe';

-- Icrear (código PV-56)
IF NOT EXISTS (
    SELECT 1 FROM portal_proveedor_mapping
    WHERE portal_user_id = @PortalUserId
      AND empresa_code = 'icrear'
)
BEGIN
    INSERT INTO portal_proveedor_mapping (
        id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at
    ) VALUES (
        NEWID(), @PortalUserId, 'PV-56', 'icrear', 1, GETDATE()
    );
    PRINT '✅ Icrear (PV-56) - Mapping creado';
END
ELSE
    PRINT '⚠️  Icrear - Mapping ya existe';

PRINT '';
PRINT '══════════════════════════════════════════════════════════════';
PRINT '✅ Sincronización manual completada';
PRINT '';
PRINT '📊 Resumen de mappings creados:';
SELECT
    empresa_code AS Empresa,
    erp_proveedor_code AS CodigoProveedor,
    activo AS Activo,
    created_at AS FechaCreacion
FROM portal_proveedor_mapping
WHERE portal_user_id = @PortalUserId
ORDER BY empresa_code;

PRINT '';
PRINT '📝 SIGUIENTE PASO:';
PRINT '1. Cierra sesión en el portal web';
PRINT '2. Vuelve a hacer login';
PRINT '3. Deberías ver las 5 empresas disponibles';
PRINT '4. Al seleccionar una empresa, deberías ver las órdenes, facturas, etc.';
