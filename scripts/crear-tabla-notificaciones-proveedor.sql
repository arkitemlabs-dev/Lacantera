-- Crear tabla de notificaciones para proveedores en la base de datos PP (Portal)
-- Esta tabla almacena las notificaciones de nuevas órdenes, pagos, etc.

USE PP;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proveedor_notificaciones')
BEGIN
    PRINT '📋 Creando tabla proveedor_notificaciones...';

    CREATE TABLE proveedor_notificaciones (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        portal_user_id NVARCHAR(50) NOT NULL,  -- IDUsuario de pNetUsuario
        tipo NVARCHAR(50) NOT NULL,  -- Tipo: NUEVA_ORDEN, PAGO_RECIBIDO, FACTURA_APROBADA, etc.
        titulo NVARCHAR(200) NOT NULL,  -- Título de la notificación
        mensaje NVARCHAR(MAX),  -- Mensaje detallado
        empresa_code VARCHAR(50),  -- Empresa relacionada
        referencia_id NVARCHAR(50),  -- ID de la orden/pago/documento relacionado
        referencia_tipo NVARCHAR(50),  -- Tipo de referencia: ORDEN, PAGO, FACTURA
        leida BIT NOT NULL DEFAULT 0,  -- Si fue leída o no
        fecha_leida DATETIME2,  -- Cuándo fue leída
        prioridad VARCHAR(20) DEFAULT 'NORMAL',  -- BAJA, NORMAL, ALTA, URGENTE
        metadata NVARCHAR(MAX),  -- JSON con datos adicionales
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Índices
        INDEX IX_notificaciones_user (portal_user_id),
        INDEX IX_notificaciones_leida (leida),
        INDEX IX_notificaciones_fecha (created_at DESC),
        INDEX IX_notificaciones_tipo (tipo),
        INDEX IX_notificaciones_user_leida (portal_user_id, leida) INCLUDE (created_at)
    );

    PRINT '✅ Tabla proveedor_notificaciones creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  La tabla proveedor_notificaciones ya existe';
END
GO

-- Verificar estructura de la tabla
PRINT '';
PRINT '📋 Estructura de la tabla:';
PRINT '';

SELECT
    c.name AS Columna,
    t.name AS TipoDato,
    c.max_length AS Longitud,
    c.is_nullable AS PermiteNulos
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('proveedor_notificaciones')
ORDER BY c.column_id;
GO

PRINT '';
PRINT '✅ Script completado';
PRINT '';
PRINT '📝 Tipos de notificaciones disponibles:';
PRINT '  - NUEVA_ORDEN: Nueva orden de compra creada';
PRINT '  - PAGO_RECIBIDO: Pago registrado';
PRINT '  - FACTURA_APROBADA: Factura aprobada';
PRINT '  - FACTURA_RECHAZADA: Factura rechazada';
PRINT '  - ORDEN_MODIFICADA: Orden de compra modificada';
PRINT '  - ORDEN_CANCELADA: Orden de compra cancelada';
