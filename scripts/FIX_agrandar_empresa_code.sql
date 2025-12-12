-- ============================================
-- FIX: Agrandar el campo empresa_code
-- ============================================
-- EJECUTAR EN: Servidor cloud.arkitem.com
-- Base de datos: PP
-- ============================================

USE PP;
GO

PRINT '🔧 Modificando tamaño del campo empresa_code...';
PRINT '';

-- Verificar tamaño actual
SELECT
    c.name AS Columna,
    t.name AS TipoDato,
    c.max_length AS LongitudActual
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('portal_proveedor_mapping')
  AND c.name = 'empresa_code';

PRINT '';
PRINT '📝 Cambiando VARCHAR(10) a VARCHAR(50)...';

-- Agrandar el campo empresa_code de VARCHAR(10) a VARCHAR(50)
ALTER TABLE portal_proveedor_mapping
ALTER COLUMN empresa_code VARCHAR(50) NOT NULL;

PRINT '✅ Campo empresa_code modificado exitosamente';
PRINT '';

-- Verificar nuevo tamaño
SELECT
    c.name AS Columna,
    t.name AS TipoDato,
    c.max_length AS LongitudNueva
FROM sys.columns c
INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('portal_proveedor_mapping')
  AND c.name = 'empresa_code';

PRINT '';
PRINT '✅ Script completado';
PRINT '🎯 Ahora puedes ejecutar la sincronización de nuevo';
