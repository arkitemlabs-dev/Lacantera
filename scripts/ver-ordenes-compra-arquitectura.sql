-- Script para ver órdenes de compra del proveedor ARQUITECTURA
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: Cantera_ajustes

USE Cantera_ajustes;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 ÓRDENES DE COMPRA DEL PROVEEDOR ARQUITECTURA (P00443 / ACE140813E29)';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ============================================================================
-- 1. ESTRUCTURA DE LA TABLA Compra
-- ============================================================================
PRINT '📋 1. ESTRUCTURA DE LA TABLA Compra (primeras 30 columnas)';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    COLUMN_NAME AS Columna,
    DATA_TYPE AS TipoDato,
    CHARACTER_MAXIMUM_LENGTH AS Longitud,
    IS_NULLABLE AS PermiteNulos
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Compra'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '';

-- ============================================================================
-- 2. PRIMEROS REGISTROS COMPLETOS (para ver datos reales)
-- ============================================================================
PRINT '📦 2. PRIMEROS 3 REGISTROS COMPLETOS DEL PROVEEDOR ARQUITECTURA';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT TOP 3 *
FROM Compra c
WHERE c.Proveedor = 'P00443'
  AND c.Empresa = 'e1'
ORDER BY c.FechaEmision DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- 3. DETALLE DE UNA ORDEN DE COMPRA (CompraD - Detalle)
-- ============================================================================
PRINT '📝 3. EJEMPLO DE DETALLE DE ORDEN DE COMPRA';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

-- Primero verificar si existe la tabla CompraD
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CompraD')
BEGIN
    PRINT 'Estructura de CompraD:';
    SELECT TOP 20
        COLUMN_NAME AS Columna,
        DATA_TYPE AS TipoDato,
        CHARACTER_MAXIMUM_LENGTH AS Longitud
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'CompraD'
    ORDER BY ORDINAL_POSITION;

    PRINT '';
    PRINT 'Detalle de la orden más reciente:';

    -- Obtener el ID de la orden más reciente
    DECLARE @UltimaOrdenID INT;
    SELECT TOP 1 @UltimaOrdenID = c.ID
    FROM Compra c
    JOIN Prov p ON c.Proveedor = p.Proveedor
    WHERE p.RFC = 'ACE140813E29'
      AND c.Empresa = 'e1'
    ORDER BY c.FechaEmision DESC;

    IF @UltimaOrdenID IS NOT NULL
    BEGIN
        SELECT
            cd.*
        FROM CompraD cd
        WHERE cd.ID = @UltimaOrdenID;
    END
    ELSE
    BEGIN
        PRINT 'No se encontraron órdenes de compra para este proveedor';
    END
END
ELSE
BEGIN
    PRINT '❌ Tabla CompraD no existe';
    PRINT 'Buscando tabla alternativa para detalles...';

    -- Buscar tablas relacionadas
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME LIKE '%Compra%D%'
       OR TABLE_NAME LIKE '%Compra%Det%'
       OR TABLE_NAME LIKE '%Compra%Detalle%';
END

PRINT '';
PRINT '';

-- ============================================================================
-- 4. RESUMEN POR ESTATUS
-- ============================================================================
PRINT '📊 4. RESUMEN DE ÓRDENES POR ESTATUS Y SITUACIÓN';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    c.Estatus,
    c.Situacion,
    COUNT(*) AS CantidadOrdenes,
    c.Moneda
FROM Compra c
JOIN MovTipo mt ON c.Mov = mt.Mov
    AND mt.Modulo = 'COMS'
    AND mt.Clave = 'COMS.O'
    AND mt.SubClave IS NULL
JOIN Prov p ON c.Proveedor = p.Proveedor
WHERE p.RFC = 'ACE140813E29'
  AND c.Empresa = 'e1'
GROUP BY c.Estatus, c.Situacion, c.Moneda
ORDER BY c.Estatus, c.Situacion;

PRINT '';
PRINT '';

-- ============================================================================
-- 5. INFORMACIÓN ADICIONAL
-- ============================================================================
PRINT '📋 5. VALORES ÚNICOS DE CAMPOS IMPORTANTES';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

PRINT 'Valores de Estatus:';
SELECT DISTINCT Estatus FROM Compra WHERE Proveedor = 'P00443' AND Empresa = 'e1';

PRINT '';
PRINT 'Valores de Situacion:';
SELECT DISTINCT Situacion FROM Compra WHERE Proveedor = 'P00443' AND Empresa = 'e1';

PRINT '';
PRINT 'Valores de Empresa:';
SELECT DISTINCT Empresa FROM Compra WHERE Proveedor = 'P00443';

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ Script completado';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
