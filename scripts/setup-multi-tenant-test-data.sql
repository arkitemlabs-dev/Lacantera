-- ============================================================
-- Script de Datos de Prueba para Multi-Tenant
-- Base de Datos: PP (Portal)
-- ============================================================

USE PP;
GO

-- ============================================================
-- 1. CREAR TABLAS SI NO EXISTEN
-- ============================================================

-- Tabla de mapeo usuario-proveedor-empresa
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    CREATE TABLE portal_proveedor_mapping (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,  -- IDUsuario de pNetUsuario
        erp_proveedor_code VARCHAR(10) NOT NULL,  -- Código del proveedor en ERP
        empresa_code VARCHAR(5) NOT NULL,  -- Código de empresa en ERP
        permisos NVARCHAR(500),  -- JSON con permisos
        activo BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_portal_mapping UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
    );

    PRINT '✅ Tabla portal_proveedor_mapping creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla portal_proveedor_mapping ya existe';
END
GO

-- Tabla de estados de órdenes en el portal
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_orden_status')
BEGIN
    CREATE TABLE portal_orden_status (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        erp_orden_id INT NOT NULL,  -- FK a Compra.ID del ERP
        empresa_code VARCHAR(5) NOT NULL,
        status_portal VARCHAR(30) CHECK (status_portal IN (
            'pendiente_respuesta', 'aceptada', 'rechazada', 'en_proceso', 'completada'
        )),
        fecha_respuesta DATETIME2,
        observaciones_proveedor NVARCHAR(500),
        respondido_por NVARCHAR(50),  -- portal_user_id
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        CONSTRAINT UQ_portal_orden_status UNIQUE (erp_orden_id, empresa_code)
    );

    PRINT '✅ Tabla portal_orden_status creada';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla portal_orden_status ya existe';
END
GO

-- ============================================================
-- 2. BUSCAR USUARIOS DE PRUEBA
-- ============================================================

PRINT '';
PRINT '============================================================';
PRINT '📋 USUARIOS DISPONIBLES EN pNetUsuario';
PRINT '============================================================';

SELECT
    u.IDUsuario,
    u.Usuario,
    u.eMail,
    u.Nombre,
    u.IDUsuarioTipo,
    t.Descripcion AS TipoUsuario,
    u.Estatus
FROM pNetUsuario u
INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
WHERE u.Estatus = 'ACTIVO'
ORDER BY u.IDUsuarioTipo, u.eMail;

PRINT '';
PRINT '============================================================';
PRINT '💡 INSTRUCCIONES';
PRINT '============================================================';
PRINT 'Identifica los IDUsuario que quieres usar para las pruebas';
PRINT 'Luego, ejecuta la sección 3 con esos IDs';
PRINT '';

-- ============================================================
-- 3. CREAR MAPPINGS DE PRUEBA
-- ============================================================
-- ⚠️ REEMPLAZA LOS VALORES SEGÚN TUS USUARIOS

PRINT '';
PRINT '============================================================';
PRINT '🔧 CREANDO MAPPINGS DE PRUEBA';
PRINT '============================================================';

-- Ejemplo de usuario proveedor con acceso a múltiples empresas
DECLARE @testUserId NVARCHAR(50);

-- 🔥 REEMPLAZAR CON UN IDUsuario REAL DE TU BD
-- Buscar un usuario tipo Proveedor (IDUsuarioTipo = 4)
SELECT TOP 1 @testUserId = CAST(IDUsuario AS NVARCHAR(50))
FROM pNetUsuario
WHERE IDUsuarioTipo = 4  -- Proveedor
  AND Estatus = 'ACTIVO';

IF @testUserId IS NULL
BEGIN
    PRINT '❌ No se encontró ningún usuario proveedor activo';
    PRINT '💡 Crea uno manualmente o usa un usuario existente';
END
ELSE
BEGIN
    PRINT '✅ Usuario encontrado: ' + @testUserId;

    -- Limpiar mappings anteriores del usuario de prueba (opcional)
    DELETE FROM portal_proveedor_mapping WHERE portal_user_id = @testUserId;
    PRINT '🧹 Mappings anteriores eliminados';

    -- MAPPING 1: La Cantera
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
        @testUserId,
        'PROV001',  -- 🔥 Reemplazar con código real del proveedor en ERP
        'LCDM',     -- La Cantera Desarrollos Mineros
        '["ver_ordenes", "subir_facturas", "consultar_pagos"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 1 creado: La Cantera (LCDM)';

    -- MAPPING 2: Peralillo
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
        @testUserId,
        'PROV001',  -- 🔥 Mismo proveedor, diferente empresa
        'PERA',     -- Peralillo S.A de C.V
        '["ver_ordenes"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 2 creado: Peralillo (PERA)';

    -- MAPPING 3: Plaza Galereña
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
        @testUserId,
        'PROV001',
        'PLAZ',     -- Plaza Galereña
        '["ver_ordenes", "subir_facturas"]',
        1,
        GETDATE(),
        GETDATE()
    );
    PRINT '✅ Mapping 3 creado: Plaza Galereña (PLAZ)';

    PRINT '';
    PRINT '============================================================';
    PRINT '📊 RESUMEN DE MAPPINGS CREADOS';
    PRINT '============================================================';

    SELECT
        m.portal_user_id AS 'ID Usuario',
        u.eMail AS 'Email',
        u.Nombre AS 'Nombre',
        m.erp_proveedor_code AS 'Código Proveedor',
        m.empresa_code AS 'Código Empresa',
        m.permisos AS 'Permisos',
        m.activo AS 'Activo',
        m.created_at AS 'Fecha Creación'
    FROM portal_proveedor_mapping m
    INNER JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
    WHERE m.portal_user_id = @testUserId
    ORDER BY m.empresa_code;

    PRINT '';
    PRINT '✅ Usuario con acceso a ' + CAST((SELECT COUNT(*) FROM portal_proveedor_mapping WHERE portal_user_id = @testUserId) AS NVARCHAR(10)) + ' empresa(s)';
END
GO

-- ============================================================
-- 4. DATOS DE EJEMPLO PARA ÓRDENES
-- ============================================================

PRINT '';
PRINT '============================================================';
PRINT '📦 ESTADOS DE ÓRDENES DE EJEMPLO';
PRINT '============================================================';

-- Estos son ejemplos, ajusta según tus IDs reales de órdenes en el ERP
/*
INSERT INTO portal_orden_status (
    id,
    erp_orden_id,
    empresa_code,
    status_portal,
    fecha_respuesta,
    observaciones_proveedor,
    respondido_por,
    created_at,
    updated_at
) VALUES
    (NEWID(), 1001, 'LCDM', 'aceptada', GETDATE(), 'Orden aceptada, entrega en 5 días', '123', GETDATE(), GETDATE()),
    (NEWID(), 1002, 'LCDM', 'pendiente_respuesta', NULL, NULL, NULL, GETDATE(), GETDATE()),
    (NEWID(), 2001, 'PERA', 'rechazada', GETDATE(), 'No tenemos stock disponible', '123', GETDATE(), GETDATE());

PRINT '✅ Estados de órdenes de ejemplo creados';
*/

PRINT '⚠️  Descomenta la sección anterior y ajusta los IDs de órdenes reales';

-- ============================================================
-- 5. VERIFICACIÓN FINAL
-- ============================================================

PRINT '';
PRINT '============================================================';
PRINT '✅ VERIFICACIÓN FINAL';
PRINT '============================================================';

PRINT '';
PRINT '📊 Total de mappings activos:';
SELECT COUNT(*) AS TotalMappings FROM portal_proveedor_mapping WHERE activo = 1;

PRINT '';
PRINT '📊 Usuarios con múltiples empresas:';
SELECT
    m.portal_user_id,
    u.eMail,
    COUNT(*) AS NumEmpresas,
    STRING_AGG(m.empresa_code, ', ') AS Empresas
FROM portal_proveedor_mapping m
INNER JOIN pNetUsuario u ON CAST(u.IDUsuario AS NVARCHAR(50)) = m.portal_user_id
WHERE m.activo = 1
GROUP BY m.portal_user_id, u.eMail
HAVING COUNT(*) > 1;

PRINT '';
PRINT '============================================================';
PRINT '🎉 SCRIPT COMPLETADO';
PRINT '============================================================';
PRINT '';
PRINT '📝 PRÓXIMOS PASOS:';
PRINT '1. Verifica que el usuario tenga password en pNetUsuarioPassword';
PRINT '2. Inicia sesión con ese usuario en el portal';
PRINT '3. Deberías ver el selector de empresas en el header';
PRINT '4. Prueba cambiar entre las empresas disponibles';
PRINT '';
PRINT '🐛 TROUBLESHOOTING:';
PRINT '- Si no ves empresas: verifica que portal_user_id coincida con IDUsuario';
PRINT '- Si hay error en login: verifica getUserTenants() en el código';
PRINT '- Si no cambia empresa: verifica que NextAuth esté configurado';
PRINT '';
