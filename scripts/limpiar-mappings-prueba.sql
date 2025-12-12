-- Limpiar mappings de prueba antiguos de la tabla portal_proveedor_mapping
-- Esto eliminará los datos de prueba que no corresponden a empresas reales

USE PP;
GO

PRINT '🧹 Limpiando mappings de prueba antiguos...';
PRINT '';

-- Ver qué hay actualmente
PRINT '📋 Mappings actuales:';
SELECT
    portal_user_id,
    erp_proveedor_code,
    empresa_code,
    created_at
FROM portal_proveedor_mapping
ORDER BY empresa_code;

PRINT '';
PRINT '🗑️  Eliminando mappings de empresas de prueba...';

-- Eliminar mappings de empresas que no existen (ICRE, INMO, LCDM, PERA, PLAZ)
DELETE FROM portal_proveedor_mapping
WHERE empresa_code IN ('ICRE', 'INMO', 'LCDM', 'PERA', 'PLAZ');

PRINT '✅ Mappings de prueba eliminados';
PRINT '';

-- Ver qué quedó
PRINT '📋 Mappings actuales (después de limpieza):';
SELECT
    portal_user_id,
    erp_proveedor_code,
    empresa_code,
    created_at
FROM portal_proveedor_mapping
ORDER BY empresa_code;

PRINT '';
PRINT '✅ Limpieza completada';
PRINT '';
PRINT '💡 Ahora solo deberías tener:';
PRINT '   - la-cantera (P00443)';
PRINT '   - peralillo (P00443)';
PRINT '   - plaza-galerena (PV-56)';
