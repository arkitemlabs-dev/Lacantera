-- ============================================================
-- Crear Mappings Manualmente
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecuta la query de diagnóstico primero
-- 2. Identifica el IDUsuario que quieres usar
-- 3. Reemplaza @userId con ese valor
-- 4. Ajusta el código de proveedor si es necesario
-- ============================================================

USE PP;
GO

-- 🔥 PASO 1: REEMPLAZAR CON TU IDUsuario
DECLARE @userId NVARCHAR(50) = '3';  -- ⬅️ Usuario: PROV001 (proveedor@test.com)

-- 🔥 PASO 2: REEMPLAZAR CON TU CÓDIGO DE PROVEEDOR
DECLARE @proveedorCode VARCHAR(10) = 'PROV001';  -- ⬅️ Código del proveedor en ERP

PRINT '============================================================';
PRINT 'CREANDO MAPPINGS PARA USUARIO: ' + @userId;
PRINT 'CÓDIGO PROVEEDOR: ' + @proveedorCode;
PRINT '============================================================';
PRINT '';

-- Verificar que el usuario existe
IF NOT EXISTS (SELECT * FROM pNetUsuario WHERE CAST(IDUsuario AS NVARCHAR(50)) = @userId)
BEGIN
    PRINT '❌ ERROR: El usuario ' + @userId + ' no existe';
    PRINT '';
    PRINT 'Usuarios disponibles:';
    SELECT TOP 10
        IDUsuario,
        Usuario,
        eMail,
        Nombre,
        Estatus
    FROM pNetUsuario
    WHERE Estatus = 'ACTIVO' OR Estatus = '1'
    ORDER BY IDUsuario;
    RETURN;
END

-- Limpiar mappings anteriores (opcional)
DELETE FROM portal_proveedor_mapping WHERE portal_user_id = @userId;
PRINT '🧹 Mappings anteriores eliminados (si existían)';
PRINT '';

-- MAPPING 1: La Cantera (LCDM)
BEGIN TRY
    INSERT INTO portal_proveedor_mapping (
        id,
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        permisos,
        activo,
        created_at,
        updated_at
    ) VALUES (
        NEWID(),
        @userId,
        @proveedorCode,
        'LCDM',  -- 🔥 Código de La Cantera
        '["ver_ordenes", "subir_facturas", "consultar_pagos"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 1 creado: La Cantera (LCDM)';
END TRY
BEGIN CATCH
    PRINT '❌ Error creando mapping La Cantera: ' + ERROR_MESSAGE();
END CATCH

-- MAPPING 2: Peralillo (PERA)
BEGIN TRY
    INSERT INTO portal_proveedor_mapping (
        id,
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        permisos,
        activo,
        created_at,
        updated_at
    ) VALUES (
        NEWID(),
        @userId,
        @proveedorCode,
        'PERA',  -- 🔥 Código de Peralillo
        '["ver_ordenes"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 2 creado: Peralillo (PERA)';
END TRY
BEGIN CATCH
    PRINT '❌ Error creando mapping Peralillo: ' + ERROR_MESSAGE();
END CATCH

-- MAPPING 3: Plaza Galereña (PLAZ)
BEGIN TRY
    INSERT INTO portal_proveedor_mapping (
        id,
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        permisos,
        activo,
        created_at,
        updated_at
    ) VALUES (
        NEWID(),
        @userId,
        @proveedorCode,
        'PLAZ',  -- 🔥 Código de Plaza Galereña
        '["ver_ordenes", "subir_facturas"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 3 creado: Plaza Galereña (PLAZ)';
END TRY
BEGIN CATCH
    PRINT '❌ Error creando mapping Plaza Galereña: ' + ERROR_MESSAGE();
END CATCH

-- MAPPING 4: Icrear (ICRE)
BEGIN TRY
    INSERT INTO portal_proveedor_mapping (
        id,
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        permisos,
        activo,
        created_at,
        updated_at
    ) VALUES (
        NEWID(),
        @userId,
        @proveedorCode,
        'ICRE',  -- 🔥 Código de Icrear
        '["ver_ordenes", "subir_facturas", "consultar_pagos"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 4 creado: Icrear (ICRE)';
END TRY
BEGIN CATCH
    PRINT '❌ Error creando mapping Icrear: ' + ERROR_MESSAGE();
END CATCH

-- MAPPING 5: Inmobiliaria Galereña (INMO)
BEGIN TRY
    INSERT INTO portal_proveedor_mapping (
        id,
        portal_user_id,
        erp_proveedor_code,
        empresa_code,
        permisos,
        activo,
        created_at,
        updated_at
    ) VALUES (
        NEWID(),
        @userId,
        @proveedorCode,
        'INMO',  -- 🔥 Código de Inmobiliaria Galereña
        '["ver_ordenes"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 5 creado: Inmobiliaria Galereña (INMO)';
END TRY
BEGIN CATCH
    PRINT '❌ Error creando mapping Inmobiliaria Galereña: ' + ERROR_MESSAGE();
END CATCH

PRINT '';
PRINT '============================================================';
PRINT 'RESUMEN DE MAPPINGS CREADOS';
PRINT '============================================================';

SELECT
    m.portal_user_id AS 'ID Usuario',
    u.eMail AS 'Email',
    u.Nombre AS 'Nombre',
    m.erp_proveedor_code AS 'Código Proveedor',
    m.empresa_code AS 'Empresa',
    m.permisos AS 'Permisos',
    m.activo AS 'Activo'
FROM portal_proveedor_mapping m
INNER JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
WHERE m.portal_user_id = @userId
ORDER BY m.empresa_code;

PRINT '';
DECLARE @count INT;
SELECT @count = COUNT(*) FROM portal_proveedor_mapping WHERE portal_user_id = @userId;
PRINT '✅ Total de mappings creados: ' + CAST(@count AS NVARCHAR(10));
PRINT '';
PRINT '============================================================';
PRINT 'PRÓXIMOS PASOS';
PRINT '============================================================';
PRINT '1. Verifica que el usuario tenga password en pNetUsuarioPassword';
PRINT '2. Inicia sesión en el portal con el email del usuario';
PRINT '3. Deberías ver el selector de empresas en el header';
