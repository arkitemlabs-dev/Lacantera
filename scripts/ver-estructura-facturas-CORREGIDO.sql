-- Ver estructura detallada de las tablas principales de Facturas y Complementos
-- VERSIÓN CORREGIDA: No asume nombres de columnas
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
    EXEC sp_executesql N'SELECT TOP 3 * FROM CFDI_Complementopago ORDER BY 1 DESC';
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END

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
    EXEC sp_executesql N'SELECT TOP 3 * FROM CFDI_ComplementopagoD ORDER BY 1 DESC';
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END

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
    PRINT '📊 Ejemplo de datos (3 registros más recientes - SIN XML completo):';
    -- Primero obtener los nombres de columna que NO sean de tipo texto largo
    DECLARE @cols NVARCHAR(MAX);
    SELECT @cols = STRING_AGG(
        QUOTENAME(COLUMN_NAME),
        ', '
    )
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'SatXml'
      AND DATA_TYPE NOT IN ('xml', 'ntext', 'text', 'image')
      AND CHARACTER_MAXIMUM_LENGTH IS NULL OR CHARACTER_MAXIMUM_LENGTH < 500
    ORDER BY ORDINAL_POSITION;

    IF @cols IS NOT NULL
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'SELECT TOP 3 ' + @cols + N' FROM SatXml ORDER BY 1 DESC';
        EXEC sp_executesql @sql;
    END
    ELSE
    BEGIN
        PRINT '⚠️ Solo tiene columnas de texto largo, mostrando todo:';
        EXEC sp_executesql N'SELECT TOP 3 * FROM SatXml ORDER BY 1 DESC';
    END
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: Venta (Facturas/Ventas)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('Venta', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Todas las columnas (solo nombres y tipos):';
    SELECT
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
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '📋 TABLA: Cxc (Cuentas por Cobrar - Facturas de Proveedores)';
PRINT '═══════════════════════════════════════════════════════════';
PRINT '';

IF OBJECT_ID('Cxc', 'U') IS NOT NULL
BEGIN
    PRINT '📋 Columnas clave (primeras 30):';
    SELECT TOP 30
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
    PRINT '📊 Ejemplo de datos (3 registros más recientes - columnas básicas):';
    -- Obtener solo columnas simples
    DECLARE @cxcCols NVARCHAR(MAX);
    SELECT @cxcCols = STRING_AGG(
        QUOTENAME(COLUMN_NAME),
        ', '
    )
    FROM (
        SELECT TOP 20 COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Cxc'
          AND DATA_TYPE NOT IN ('xml', 'ntext', 'text', 'image', 'varbinary')
          AND (CHARACTER_MAXIMUM_LENGTH IS NULL OR CHARACTER_MAXIMUM_LENGTH < 500)
        ORDER BY ORDINAL_POSITION
    ) AS t;

    IF @cxcCols IS NOT NULL
    BEGIN
        DECLARE @cxcSql NVARCHAR(MAX) = N'SELECT TOP 3 ' + @cxcCols + N' FROM Cxc ORDER BY 1 DESC';
        EXEC sp_executesql @cxcSql;
    END
END
ELSE
BEGIN
    PRINT '❌ Tabla no existe';
END

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
