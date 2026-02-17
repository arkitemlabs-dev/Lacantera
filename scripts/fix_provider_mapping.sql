USE Lacantera_Portal;
GO

PRINT 'Actualizando mapeo de proveedor para empresa 06...';

UPDATE portal_proveedor_mapping
SET erp_proveedor_code = 'P00443'
WHERE erp_proveedor_code = 'PROV003' 
  AND empresa_code = '06';

IF @@ROWCOUNT > 0
    PRINT '✅ Mapeo actualizado correctamente: PROV003 -> P00443 en empresa 06';
ELSE
    PRINT '⚠️ No se encontró registro para actualizar o ya estaba actualizado.';

SELECT * FROM portal_proveedor_mapping 
WHERE empresa_code = '06' AND (erp_proveedor_code = 'P00443' OR erp_proveedor_code = 'PROV003');
GO
