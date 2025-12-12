-- ============================================
-- PASO 1: CREAR TABLA EN BASE DE DATOS PP
-- ============================================
-- IMPORTANTE: Ejecutar en el servidor PORTAL
-- Servidor: cloud.arkitem.com
-- Base de datos: PP
-- Usuario: sa_ediaz
-- ============================================

USE PP;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'portal_proveedor_mapping')
BEGIN
    PRINT '📋 Creando tabla portal_proveedor_mapping...';

    CREATE TABLE portal_proveedor_mapping (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,  -- IDUsuario de pNetUsuario
        erp_proveedor_code VARCHAR(20) NOT NULL,  -- Código del proveedor en ERP (ej: P00443, PV-56)
        empresa_code VARCHAR(10) NOT NULL,  -- Código de empresa (la-cantera, peralillo, plaza-galerena)
        permisos NVARCHAR(MAX),  -- JSON con permisos del proveedor
        activo BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Constraint: Un usuario no puede tener el mismo proveedor duplicado en la misma empresa
        CONSTRAINT UQ_portal_mapping UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
    );

    -- Índices para mejorar rendimiento
    CREATE INDEX IX_portal_proveedor_mapping_user ON portal_proveedor_mapping(portal_user_id);
    CREATE INDEX IX_portal_proveedor_mapping_empresa ON portal_proveedor_mapping(empresa_code);
    CREATE INDEX IX_portal_proveedor_mapping_proveedor ON portal_proveedor_mapping(erp_proveedor_code);
    CREATE INDEX IX_portal_proveedor_mapping_activo ON portal_proveedor_mapping(activo) WHERE activo = 1;

    PRINT '✅ Tabla portal_proveedor_mapping creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla portal_proveedor_mapping ya existe';
END
GO

-- Verificar estructura de la tabla
PRINT '';
PRINT '📋 Estructura de la tabla:';
PRINT '';

SELECT
    c.name AS NombreColumna,
    t.name AS TipoDato,
    c.max_length AS LongitudMaxima,
    c.is_nullable AS PermiteNulos
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('portal_proveedor_mapping')
ORDER BY c.column_id;
GO

-- Verificar índices
PRINT '';
PRINT '📋 Índices creados:';
PRINT '';

SELECT
    i.name AS NombreIndice,
    i.type_desc AS TipoIndice
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('portal_proveedor_mapping')
  AND i.name IS NOT NULL
ORDER BY i.name;
GO

PRINT '';
PRINT '✅ Script completado exitosamente';
PRINT '';
PRINT '🎯 Siguiente paso: Ejecutar la sincronización desde el navegador';
