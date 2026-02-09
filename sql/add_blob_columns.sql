-- ============================================================
-- Migración: Agregar soporte Azure Blob Storage
-- Base de datos: PP (portal)
-- Ejecutar en: PP
-- ============================================================

-- 1. Agregar columnas de blob a proveedor_facturas
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'xml_blob_container')
BEGIN
    ALTER TABLE proveedor_facturas ADD xml_blob_container VARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'pdf_blob_container')
BEGIN
    ALTER TABLE proveedor_facturas ADD pdf_blob_container VARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'storage_type')
BEGIN
    ALTER TABLE proveedor_facturas ADD storage_type VARCHAR(20) NULL DEFAULT 'local';
END
GO

-- 2. Crear tabla archivos_blob para registro centralizado
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'archivos_blob' AND type = 'U')
BEGIN
    CREATE TABLE archivos_blob (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        empresa_code VARCHAR(50) NOT NULL,
        proveedor_code VARCHAR(20) NULL,
        blob_container VARCHAR(100) NOT NULL,
        blob_path VARCHAR(500) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        tamano BIGINT NOT NULL DEFAULT 0,
        tipo_archivo VARCHAR(50) NOT NULL, -- factura-xml, factura-pdf, documento-proveedor, comprobante-pago, logo-empresa
        entidad_tipo VARCHAR(50) NULL,      -- factura, documento, pago, etc.
        entidad_id VARCHAR(100) NULL,       -- ID de la entidad relacionada
        nombre_original NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(100) NULL,
        deleted_at DATETIME2 NULL
    );

    -- Índices
    CREATE INDEX IX_archivos_blob_empresa ON archivos_blob (empresa_code);
    CREATE INDEX IX_archivos_blob_entidad ON archivos_blob (entidad_tipo, entidad_id);
    CREATE UNIQUE INDEX UX_archivos_blob_path ON archivos_blob (blob_container, blob_path) WHERE deleted_at IS NULL;
END
GO
