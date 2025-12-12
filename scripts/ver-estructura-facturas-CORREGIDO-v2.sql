-- Ver estructura detallada de las tablas principales de Facturas y Complementos
-- VERSIÓN CORREGIDA v2: Compatible con SQL Server 2012+
-- Ejecutar en: Servidor ERP (104.46.127.151)

USE Cantera_ajustes;
GO

PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: CFDI_Complementopago (Complementos de Pago)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('CFDI_Complementopago', 'U') IS NOT NULL
BEGIN
    -- Ver estructura completa
    PRINT '📋 Estructura de columnas:';
    SELECT
        ORDINAL_POSITION AS Pos,
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Longitud,
        IS_NULLABLE AS Nulo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CFDI_Complementopago'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Ejemplo de datos (3 registros más recientes):';
    SELECT TOP 3 * FROM CFDI_Complementopago;
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: CFDI_ComplementopagoD (Detalle Complementos)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('CFDI_ComplementopagoD', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Estructura de columnas:';
    SELECT
        ORDINAL_POSITION AS Pos,
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Longitud,
        IS_NULLABLE AS Nulo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CFDI_ComplementopagoD'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Ejemplo de datos (3 registros más recientes):';
    SELECT TOP 3 * FROM CFDI_ComplementopagoD;
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: SatXml (Almacena XMLs del SAT)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('SatXml', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Estructura de columnas:';
    SELECT
        ORDINAL_POSITION AS Pos,
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Longitud,
        IS_NULLABLE AS Nulo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'SatXml'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Ejemplo de datos (mostrando primeras 10 columnas):';
    -- Mostrar solo las primeras columnas para evitar campos XML largos
    SELECT TOP 3
        c1.COLUMN_NAME AS Col1,
        c2.COLUMN_NAME AS Col2,
        c3.COLUMN_NAME AS Col3,
        c4.COLUMN_NAME AS Col4,
        c5.COLUMN_NAME AS Col5
    FROM INFORMATION_SCHEMA.COLUMNS c1
    CROSS JOIN INFORMATION_SCHEMA.COLUMNS c2
    CROSS JOIN INFORMATION_SCHEMA.COLUMNS c3
    CROSS JOIN INFORMATION_SCHEMA.COLUMNS c4
    CROSS JOIN INFORMATION_SCHEMA.COLUMNS c5
    WHERE c1.TABLE_NAME = 'SatXml' AND c1.ORDINAL_POSITION = 1
      AND c2.TABLE_NAME = 'SatXml' AND c2.ORDINAL_POSITION = 2
      AND c3.TABLE_NAME = 'SatXml' AND c3.ORDINAL_POSITION = 3
      AND c4.TABLE_NAME = 'SatXml' AND c4.ORDINAL_POSITION = 4
      AND c5.TABLE_NAME = 'SatXml' AND c5.ORDINAL_POSITION = 5;

    -- Mostrar datos de ejemplo simplificado
    PRINT '';
    PRINT '⚠️ Nota: Mostrando todas las columnas (puede incluir XMLs largos):';
    SELECT TOP 3 * FROM SatXml;
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: Venta (Facturas/Ventas)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('Venta', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Primeras 50 columnas:';
    SELECT TOP 50
        ORDINAL_POSITION AS Pos,
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Long
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Venta'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Total de columnas en Venta:';
    SELECT COUNT(*) AS TotalColumnas FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Venta';

    PRINT '';
    PRINT '📊 Columnas que parecen importantes:';
    SELECT
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Venta'
      AND (
        COLUMN_NAME LIKE '%ID%'
        OR COLUMN_NAME LIKE '%Mov%'
        OR COLUMN_NAME LIKE '%Fecha%'
        OR COLUMN_NAME LIKE '%Cliente%'
        OR COLUMN_NAME LIKE '%Prov%'
        OR COLUMN_NAME LIKE '%Total%'
        OR COLUMN_NAME LIKE '%Import%'
        OR COLUMN_NAME LIKE '%Impuesto%'
        OR COLUMN_NAME LIKE '%UUID%'
        OR COLUMN_NAME LIKE '%Estatus%'
        OR COLUMN_NAME LIKE '%Moneda%'
        OR COLUMN_NAME LIKE '%RFC%'
      )
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: Cxc (Cuentas por Cobrar - Facturas de Proveedores)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('Cxc', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Primeras 50 columnas:';
    SELECT TOP 50
        ORDINAL_POSITION AS Pos,
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Long
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Cxc'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Total de columnas en Cxc:';
    SELECT COUNT(*) AS TotalColumnas FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Cxc';

    PRINT '';
    PRINT '📊 Columnas que parecen importantes:';
    SELECT
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Cxc'
      AND (
        COLUMN_NAME LIKE '%ID%'
        OR COLUMN_NAME LIKE '%Mov%'
        OR COLUMN_NAME LIKE '%Fecha%'
        OR COLUMN_NAME LIKE '%Cliente%'
        OR COLUMN_NAME LIKE '%Prov%'
        OR COLUMN_NAME LIKE '%Total%'
        OR COLUMN_NAME LIKE '%Import%'
        OR COLUMN_NAME LIKE '%Impuesto%'
        OR COLUMN_NAME LIKE '%UUID%'
        OR COLUMN_NAME LIKE '%Estatus%'
        OR COLUMN_NAME LIKE '%Moneda%'
        OR COLUMN_NAME LIKE '%RFC%'
        OR COLUMN_NAME LIKE '%Saldo%'
        OR COLUMN_NAME LIKE '%Referencia%'
      )
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT '📊 Ejemplo de 3 registros (primeras 20 columnas):';
    SELECT TOP 3 * FROM (
        SELECT TOP 20 COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Cxc'
        ORDER BY ORDINAL_POSITION
    ) AS Cols;

    -- Mostrar datos de ejemplo de Cxc
    PRINT '';
    PRINT '📊 Datos de ejemplo (puede ser largo):';
    SELECT TOP 3 * FROM Cxc;
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END
GO

PRINT '';
PRINT '✅ Exploración completada';
PRINT '';
PRINT '📝 RESUMEN:';
PRINT '- Cxc: Facturas emitidas POR proveedores A la empresa (cuentas por cobrar de la empresa)';
PRINT '- CFDI_Complementopago: Complementos de pago (encabezado)';
PRINT '- CFDI_ComplementopagoD: Detalle de documentos relacionados en complemento';
PRINT '- SatXml: XMLs del SAT (almacenamiento de timbres)';
PRINT '- Venta: Ventas/Facturas emitidas POR la empresa';
PRINT '';
PRINT '📋 SIGUIENTE PASO:';
PRINT 'Revisar las columnas reales de cada tabla arriba para crear los endpoints correctos';
