-- ============================================================================
-- MIGRACIÓN: Convertir empresa_code de slugs a códigos numéricos
-- en tabla portal_proveedor_mapping (BD: PP)
--
-- EJECUTAR ANTES DE DESPLEGAR LA NUEVA VERSIÓN DEL AUTH
-- ============================================================================

-- Verificar estado actual
SELECT empresa_code, COUNT(*) as registros
FROM portal_proveedor_mapping
GROUP BY empresa_code
ORDER BY empresa_code;

-- ── PRODUCCIÓN ──
UPDATE portal_proveedor_mapping SET empresa_code = '01'
WHERE empresa_code IN ('la-cantera', 'la-cantera-prod');

UPDATE portal_proveedor_mapping SET empresa_code = '02'
WHERE empresa_code IN ('peralillo', 'peralillo-prod');

UPDATE portal_proveedor_mapping SET empresa_code = '03'
WHERE empresa_code IN ('plaza-galerena', 'plaza-galerena-prod');

UPDATE portal_proveedor_mapping SET empresa_code = '04'
WHERE empresa_code IN ('inmobiliaria-galerena', 'inmobiliaria-galerena-prod');

UPDATE portal_proveedor_mapping SET empresa_code = '05'
WHERE empresa_code IN ('icrear', 'icrear-prod');

-- ── PRUEBAS ──
UPDATE portal_proveedor_mapping SET empresa_code = '06'
WHERE empresa_code = 'la-cantera-test';

UPDATE portal_proveedor_mapping SET empresa_code = '07'
WHERE empresa_code = 'peralillo-test';

UPDATE portal_proveedor_mapping SET empresa_code = '08'
WHERE empresa_code = 'plaza-galerena-test';

UPDATE portal_proveedor_mapping SET empresa_code = '09'
WHERE empresa_code = 'inmobiliaria-galerena-test';

UPDATE portal_proveedor_mapping SET empresa_code = '10'
WHERE empresa_code = 'icrear-test';

-- Verificar resultado
SELECT empresa_code, COUNT(*) as registros
FROM portal_proveedor_mapping
GROUP BY empresa_code
ORDER BY empresa_code;

-- ============================================================================
-- También actualizar portal_orden_status si usa slugs
-- ============================================================================
UPDATE portal_orden_status SET empresa_code = '01'
WHERE empresa_code IN ('la-cantera', 'la-cantera-prod');

UPDATE portal_orden_status SET empresa_code = '02'
WHERE empresa_code IN ('peralillo', 'peralillo-prod');

UPDATE portal_orden_status SET empresa_code = '03'
WHERE empresa_code IN ('plaza-galerena', 'plaza-galerena-prod');

UPDATE portal_orden_status SET empresa_code = '04'
WHERE empresa_code IN ('inmobiliaria-galerena', 'inmobiliaria-galerena-prod');

UPDATE portal_orden_status SET empresa_code = '05'
WHERE empresa_code IN ('icrear', 'icrear-prod');

UPDATE portal_orden_status SET empresa_code = '06'
WHERE empresa_code = 'la-cantera-test';

UPDATE portal_orden_status SET empresa_code = '07'
WHERE empresa_code = 'peralillo-test';

UPDATE portal_orden_status SET empresa_code = '08'
WHERE empresa_code = 'plaza-galerena-test';

UPDATE portal_orden_status SET empresa_code = '09'
WHERE empresa_code = 'inmobiliaria-galerena-test';

UPDATE portal_orden_status SET empresa_code = '10'
WHERE empresa_code = 'icrear-test';

-- ============================================================================
-- También actualizar portal_factura_workflow si existe y usa slugs
-- ============================================================================
IF OBJECT_ID('portal_factura_workflow', 'U') IS NOT NULL
BEGIN
  UPDATE portal_factura_workflow SET empresa_code = '01'
  WHERE empresa_code IN ('la-cantera', 'la-cantera-prod');

  UPDATE portal_factura_workflow SET empresa_code = '02'
  WHERE empresa_code IN ('peralillo', 'peralillo-prod');

  UPDATE portal_factura_workflow SET empresa_code = '03'
  WHERE empresa_code IN ('plaza-galerena', 'plaza-galerena-prod');

  UPDATE portal_factura_workflow SET empresa_code = '04'
  WHERE empresa_code IN ('inmobiliaria-galerena', 'inmobiliaria-galerena-prod');

  UPDATE portal_factura_workflow SET empresa_code = '05'
  WHERE empresa_code IN ('icrear', 'icrear-prod');

  UPDATE portal_factura_workflow SET empresa_code = '06'
  WHERE empresa_code = 'la-cantera-test';

  UPDATE portal_factura_workflow SET empresa_code = '07'
  WHERE empresa_code = 'peralillo-test';

  UPDATE portal_factura_workflow SET empresa_code = '08'
  WHERE empresa_code = 'plaza-galerena-test';

  UPDATE portal_factura_workflow SET empresa_code = '09'
  WHERE empresa_code = 'inmobiliaria-galerena-test';

  UPDATE portal_factura_workflow SET empresa_code = '10'
  WHERE empresa_code = 'icrear-test';
END

PRINT 'Migración completada exitosamente.';
