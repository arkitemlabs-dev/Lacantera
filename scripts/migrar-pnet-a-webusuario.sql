-- =============================================================================
-- Script: Migrar usuarios de pNetUsuario → WebUsuario
-- Versión: 3 (UsuarioWeb es VARCHAR, genera PROV001, PROV002...)
-- Base de datos: PP
-- EJECUTAR MANUALMENTE EN SSMS
-- =============================================================================

USE PP;
GO

-- 0. Diagnóstico
PRINT '=== DIAGNÓSTICO: Estructura de WebUsuario ===';

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'WebUsuario'
ORDER BY ORDINAL_POSITION;

PRINT '=== DIAGNÓSTICO: Registros actuales en WebUsuario ===';
SELECT UsuarioWeb, Nombre, eMail, Rol, Estatus, Proveedor FROM WebUsuario;

PRINT '=== DIAGNÓSTICO: Usuarios a migrar de pNetUsuario ===';
SELECT u.IDUsuario, u.Usuario, u.Nombre, u.eMail
FROM pNetUsuario u
WHERE u.IDUsuarioTipo = 4
  AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
  AND u.eMail IS NOT NULL AND u.eMail != ''
  AND NOT EXISTS (
    SELECT 1 FROM WebUsuario w WHERE LOWER(w.eMail) = LOWER(u.eMail)
  );

-- 1. Migrar usuarios
-- UsuarioWeb es VARCHAR, usamos 'PROV' + número secuencial como ID
PRINT '=== MIGRANDO usuarios de pNetUsuario a WebUsuario ===';

INSERT INTO WebUsuario (
  UsuarioWeb,
  Nombre,
  eMail,
  Contrasena,
  Rol,
  Estatus,
  Alta,
  UltimoCambio,
  Proveedor
)
SELECT
  'PROV' + RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY u.IDUsuario) AS VARCHAR(3)), 3),
  u.Nombre,
  u.eMail,
  pp.PasswordHash,
  'proveedor',
  'ACTIVO',
  ISNULL(u.FechaRegistro, GETDATE()),
  GETDATE(),
  u.Usuario
FROM pNetUsuario u
LEFT JOIN pNetUsuarioPassword pp ON u.IDUsuario = pp.IDUsuario
WHERE u.IDUsuarioTipo = 4
  AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
  AND u.eMail IS NOT NULL
  AND u.eMail != ''
  AND NOT EXISTS (
    SELECT 1 FROM WebUsuario w WHERE LOWER(w.eMail) = LOWER(u.eMail)
  );

PRINT CONCAT('Registros migrados: ', @@ROWCOUNT);

-- 2. Verificar resultado
PRINT '=== VERIFICACIÓN: Todos los usuarios en WebUsuario ===';

SELECT UsuarioWeb, Nombre, eMail, Rol, Estatus, Proveedor, Alta
FROM WebUsuario
ORDER BY Alta DESC;

-- 3. Actualizar portal_proveedor_mapping para los nuevos usuarios
IF OBJECT_ID('portal_proveedor_mapping', 'U') IS NOT NULL
BEGIN
  PRINT '=== Actualizando portal_proveedor_mapping ===';

  INSERT INTO portal_proveedor_mapping (portal_user_id, erp_proveedor_code, empresa_code, activo)
  SELECT
    w.UsuarioWeb,
    w.Proveedor,
    '06',
    1
  FROM WebUsuario w
  WHERE w.Rol = 'proveedor'
    AND w.Proveedor IS NOT NULL
    AND w.Proveedor != ''
    AND NOT EXISTS (
      SELECT 1 FROM portal_proveedor_mapping m
      WHERE m.portal_user_id = w.UsuarioWeb
        AND m.erp_proveedor_code = w.Proveedor
    );

  PRINT CONCAT('Mappings creados: ', @@ROWCOUNT);
END

PRINT '=== MIGRACIÓN COMPLETADA ===';
GO
