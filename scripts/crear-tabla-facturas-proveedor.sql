-- Crear tabla para almacenar facturas subidas por proveedores en el Portal (PP)
-- Esta tabla almacenará tanto los archivos XML como PDF de las facturas

USE PP;
GO

-- ============================================
-- TABLA: proveedor_facturas
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proveedor_facturas')
BEGIN
    PRINT '📋 Creando tabla proveedor_facturas...';

    CREATE TABLE proveedor_facturas (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,  -- Usuario que subió la factura
        empresa_code VARCHAR(50) NOT NULL,  -- Empresa a la que va dirigida la factura

        -- Datos del CFDI (extraídos del XML)
        uuid VARCHAR(36) UNIQUE,  -- UUID de la factura (Folio Fiscal)
        serie VARCHAR(25),
        folio VARCHAR(40),
        fecha_emision DATETIME2,
        fecha_timbrado DATETIME2,
        rfc_emisor VARCHAR(13),  -- RFC del proveedor
        nombre_emisor NVARCHAR(250),
        rfc_receptor VARCHAR(13),  -- RFC de la empresa
        nombre_receptor NVARCHAR(250),

        -- Montos
        subtotal DECIMAL(18, 2),
        descuento DECIMAL(18, 2),
        impuestos DECIMAL(18, 2),
        total DECIMAL(18, 2),
        moneda VARCHAR(3),  -- MXN, USD, etc.
        tipo_cambio DECIMAL(10, 4),

        -- Archivos
        xml_contenido NVARCHAR(MAX),  -- Contenido del XML
        xml_ruta VARCHAR(500),  -- Ruta donde se guardó el XML
        pdf_ruta VARCHAR(500),  -- Ruta donde se guardó el PDF
        xml_tamano INT,  -- Tamaño en bytes
        pdf_tamano INT,

        -- Validación SAT
        validado_sat BIT DEFAULT 0,  -- Si fue validado contra el SAT
        fecha_validacion_sat DATETIME2,
        sat_estado VARCHAR(50),  -- VIGENTE, CANCELADO, etc.
        sat_mensaje NVARCHAR(500),

        -- Relación con órdenes de compra
        ordenes_relacionadas NVARCHAR(MAX),  -- JSON con IDs de órdenes

        -- Estado de la factura
        estatus VARCHAR(50) DEFAULT 'PENDIENTE',  -- PENDIENTE, APROBADA, RECHAZADA, CANCELADA
        fecha_aprobacion DATETIME2,
        fecha_rechazo DATETIME2,
        motivo_rechazo NVARCHAR(MAX),
        aprobada_por NVARCHAR(50),  -- Usuario que aprobó/rechazó

        -- Metadatos
        observaciones NVARCHAR(MAX),
        metadata NVARCHAR(MAX),  -- JSON con datos adicionales
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Índices
        INDEX IX_facturas_user (portal_user_id),
        INDEX IX_facturas_empresa (empresa_code),
        INDEX IX_facturas_uuid (uuid),
        INDEX IX_facturas_estatus (estatus),
        INDEX IX_facturas_fecha (fecha_emision DESC),
        INDEX IX_facturas_rfc_emisor (rfc_emisor),
        INDEX IX_facturas_validado (validado_sat)
    );

    PRINT '✅ Tabla proveedor_facturas creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla proveedor_facturas ya existe';
END
GO

-- ============================================
-- TABLA: proveedor_facturas_ordenes
-- Relación muchos a muchos entre facturas y órdenes de compra
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proveedor_facturas_ordenes')
BEGIN
    PRINT '📋 Creando tabla proveedor_facturas_ordenes...';

    CREATE TABLE proveedor_facturas_ordenes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        factura_id UNIQUEIDENTIFIER NOT NULL,  -- ID de proveedor_facturas
        empresa_code VARCHAR(50) NOT NULL,
        orden_erp_id INT NOT NULL,  -- ID de la orden en el ERP
        orden_folio VARCHAR(50),  -- Folio de la orden
        monto_aplicado DECIMAL(18, 2),  -- Monto de la factura aplicado a esta orden
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Índices
        INDEX IX_facturas_ordenes_factura (factura_id),
        INDEX IX_facturas_ordenes_orden (orden_erp_id),
        INDEX IX_facturas_ordenes_empresa (empresa_code)
    );

    PRINT '✅ Tabla proveedor_facturas_ordenes creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla proveedor_facturas_ordenes ya existe';
END
GO

-- ============================================
-- TABLA: proveedor_complementos_pago
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proveedor_complementos_pago')
BEGIN
    PRINT '📋 Creando tabla proveedor_complementos_pago...';

    CREATE TABLE proveedor_complementos_pago (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,
        empresa_code VARCHAR(50) NOT NULL,

        -- Datos del Complemento de Pago
        uuid VARCHAR(36) UNIQUE,  -- UUID del complemento
        fecha_emision DATETIME2,
        fecha_pago DATETIME2,
        forma_pago VARCHAR(50),  -- Efectivo, Transferencia, etc.
        moneda VARCHAR(3),
        monto DECIMAL(18, 2),

        -- Facturas relacionadas
        facturas_relacionadas NVARCHAR(MAX),  -- JSON con UUIDs de facturas pagadas

        -- Archivos
        xml_contenido NVARCHAR(MAX),
        xml_ruta VARCHAR(500),
        pdf_ruta VARCHAR(500),

        -- Validación SAT
        validado_sat BIT DEFAULT 0,
        fecha_validacion_sat DATETIME2,
        sat_estado VARCHAR(50),

        -- Metadatos
        observaciones NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Índices
        INDEX IX_complementos_user (portal_user_id),
        INDEX IX_complementos_empresa (empresa_code),
        INDEX IX_complementos_uuid (uuid),
        INDEX IX_complementos_fecha (fecha_pago DESC)
    );

    PRINT '✅ Tabla proveedor_complementos_pago creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla proveedor_complementos_pago ya existe';
END
GO

-- Verificar estructura
PRINT '';
PRINT '📋 Tablas creadas:';
SELECT
    name AS NombreTabla,
    create_date AS FechaCreacion
FROM sys.tables
WHERE name IN ('proveedor_facturas', 'proveedor_facturas_ordenes', 'proveedor_complementos_pago')
ORDER BY name;

PRINT '';
PRINT '✅ Script completado';
PRINT '';
PRINT '📝 NOTAS:';
PRINT '1. Las facturas se almacenarán en el portal (PP)';
PRINT '2. Los XMLs y PDFs se guardarán en el servidor';
PRINT '3. Se validarán automáticamente contra el SAT';
PRINT '4. Una factura puede relacionarse con múltiples órdenes de compra';
