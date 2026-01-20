-- =============================================
-- Script: create_proveedor_facturas.sql
-- Descripcion: Crea la tabla proveedor_facturas para almacenar facturas CFDI
-- Fecha: 2026-01-19
-- =============================================

USE PP;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'proveedor_facturas')
BEGIN
    CREATE TABLE proveedor_facturas (
        -- Identificadores
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,
        empresa_code VARCHAR(50) NOT NULL,

        -- Datos del CFDI
        uuid VARCHAR(36) NOT NULL UNIQUE,
        serie VARCHAR(25) NULL,
        folio VARCHAR(40) NULL,
        fecha_emision DATETIME2 NOT NULL,
        fecha_timbrado DATETIME2 NOT NULL,

        -- Datos del Emisor
        rfc_emisor VARCHAR(13) NOT NULL,
        nombre_emisor NVARCHAR(250) NOT NULL,

        -- Datos del Receptor
        rfc_receptor VARCHAR(13) NOT NULL,
        nombre_receptor NVARCHAR(250) NOT NULL,

        -- Importes
        subtotal DECIMAL(18, 2) NOT NULL,
        descuento DECIMAL(18, 2) NULL DEFAULT 0,
        impuestos DECIMAL(18, 2) NULL DEFAULT 0,
        total DECIMAL(18, 2) NOT NULL,
        moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
        tipo_cambio DECIMAL(10, 4) NULL DEFAULT 1,

        -- Archivos
        xml_contenido NVARCHAR(MAX) NULL,
        xml_ruta VARCHAR(500) NULL,
        pdf_ruta VARCHAR(500) NULL,
        xml_tamano INT NULL,
        pdf_tamano INT NULL,

        -- Validacion SAT
        sat_validado BIT NULL DEFAULT 0,
        sat_estado VARCHAR(50) NULL,
        sat_codigo_estatus VARCHAR(100) NULL,
        sat_es_cancelable VARCHAR(50) NULL,
        sat_validacion_efos VARCHAR(100) NULL,
        sat_fecha_consulta DATETIME2 NULL,
        sat_mensaje NVARCHAR(500) NULL,

        -- Estado y Control
        estatus VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
        -- Posibles valores: PENDIENTE, VALIDADA, RECHAZADA, EN_REVISION, PAGADA, CANCELADA

        motivo_rechazo NVARCHAR(500) NULL,
        fecha_validacion DATETIME2 NULL,
        validado_por NVARCHAR(50) NULL,

        -- Relacion con OC (opcional)
        orden_compra_id UNIQUEIDENTIFIER NULL,
        orden_compra_folio VARCHAR(50) NULL,

        -- Auditoria
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(50) NULL,
        updated_by NVARCHAR(50) NULL
    );

    PRINT 'Tabla proveedor_facturas creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla proveedor_facturas ya existe';
END
GO

-- ==================== INDICES ====================

-- Indice por UUID (ya es UNIQUE en la definicion)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_uuid')
BEGIN
    CREATE UNIQUE INDEX IX_proveedor_facturas_uuid
    ON proveedor_facturas (uuid);
    PRINT 'Indice IX_proveedor_facturas_uuid creado';
END
GO

-- Indice por usuario del portal
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_portal_user')
BEGIN
    CREATE INDEX IX_proveedor_facturas_portal_user
    ON proveedor_facturas (portal_user_id);
    PRINT 'Indice IX_proveedor_facturas_portal_user creado';
END
GO

-- Indice por empresa
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_empresa')
BEGIN
    CREATE INDEX IX_proveedor_facturas_empresa
    ON proveedor_facturas (empresa_code);
    PRINT 'Indice IX_proveedor_facturas_empresa creado';
END
GO

-- Indice por RFC emisor
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_rfc_emisor')
BEGIN
    CREATE INDEX IX_proveedor_facturas_rfc_emisor
    ON proveedor_facturas (rfc_emisor);
    PRINT 'Indice IX_proveedor_facturas_rfc_emisor creado';
END
GO

-- Indice por estatus
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_estatus')
BEGIN
    CREATE INDEX IX_proveedor_facturas_estatus
    ON proveedor_facturas (estatus);
    PRINT 'Indice IX_proveedor_facturas_estatus creado';
END
GO

-- Indice por fecha de emision
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_fecha_emision')
BEGIN
    CREATE INDEX IX_proveedor_facturas_fecha_emision
    ON proveedor_facturas (fecha_emision DESC);
    PRINT 'Indice IX_proveedor_facturas_fecha_emision creado';
END
GO

-- Indice por estado SAT
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_sat_estado')
BEGIN
    CREATE INDEX IX_proveedor_facturas_sat_estado
    ON proveedor_facturas (sat_estado)
    WHERE sat_estado IS NOT NULL;
    PRINT 'Indice IX_proveedor_facturas_sat_estado creado';
END
GO

-- Indice compuesto para consultas frecuentes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'IX_proveedor_facturas_user_empresa_estatus')
BEGIN
    CREATE INDEX IX_proveedor_facturas_user_empresa_estatus
    ON proveedor_facturas (portal_user_id, empresa_code, estatus);
    PRINT 'Indice IX_proveedor_facturas_user_empresa_estatus creado';
END
GO

-- ==================== COMENTARIOS ====================

-- Agregar descripcion a la tabla
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Almacena las facturas CFDI subidas por proveedores al portal',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'proveedor_facturas';
GO

-- Comentarios para columnas principales
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'UUID del CFDI (Folio Fiscal)',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'proveedor_facturas',
    @level2type = N'COLUMN', @level2name = 'uuid';
GO

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Indica si la factura fue validada exitosamente con el SAT',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'proveedor_facturas',
    @level2type = N'COLUMN', @level2name = 'sat_validado';
GO

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Estado del CFDI en el SAT: Vigente, Cancelado, No Encontrado, PENDIENTE',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'proveedor_facturas',
    @level2type = N'COLUMN', @level2name = 'sat_estado';
GO

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Estado de la factura en el portal: PENDIENTE, VALIDADA, RECHAZADA, EN_REVISION, PAGADA, CANCELADA',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE',  @level1name = 'proveedor_facturas',
    @level2type = N'COLUMN', @level2name = 'estatus';
GO

PRINT '=============================================';
PRINT 'Script ejecutado exitosamente';
PRINT 'Tabla proveedor_facturas lista para usar';
PRINT '=============================================';
