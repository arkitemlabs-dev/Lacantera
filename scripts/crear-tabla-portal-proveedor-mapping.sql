-- Crear tabla portal_proveedor_mapping en la base de datos PP (Portal)
-- Esta tabla mapea usuarios del portal con sus códigos de proveedor en los ERPs de cada empresa

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
SELECT
    c.name AS ColumnName,
    t.name AS DataType,
    c.max_length AS MaxLength,
    c.is_nullable AS IsNullable
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('portal_proveedor_mapping')
ORDER BY c.column_id;
GO

PRINT '✅ Script completado';
