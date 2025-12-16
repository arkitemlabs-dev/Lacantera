-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICAR Y AJUSTAR TABLA WebUsuario
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script verifica que la tabla WebUsuario tenga las columnas necesarias
-- y ajusta tipos de datos si es necesario
--
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 VERIFICANDO TABLA WebUsuario';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR EXISTENCIA DE LA TABLA
-- ═══════════════════════════════════════════════════════════════════════════════

IF OBJECT_ID('dbo.WebUsuario', 'U') IS NULL
BEGIN
    PRINT '❌ ERROR: La tabla WebUsuario NO existe.';
    PRINT '';
    RAISERROR('Tabla WebUsuario no existe', 16, 1);
    RETURN;
END

PRINT '✅ La tabla WebUsuario existe.';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MOSTRAR ESTRUCTURA ACTUAL
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📋 Estructura actual de WebUsuario:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

SELECT
    COLUMN_NAME AS Columna,
    DATA_TYPE AS TipoDato,
    CHARACTER_MAXIMUM_LENGTH AS Longitud,
    IS_NULLABLE AS Nulo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'WebUsuario'
ORDER BY ORDINAL_POSITION;

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR COLUMNAS REQUERIDAS
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '🔍 Verificando columnas requeridas:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

-- Columnas necesarias para el sistema
DECLARE @ColumnasFaltantes TABLE (Columna VARCHAR(50));

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'UsuarioWeb')
    INSERT INTO @ColumnasFaltantes VALUES ('UsuarioWeb');

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'eMail')
    INSERT INTO @ColumnasFaltantes VALUES ('eMail');

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'Contrasena')
    INSERT INTO @ColumnasFaltantes VALUES ('Contrasena');

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'Nombre')
    INSERT INTO @ColumnasFaltantes VALUES ('Nombre');

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'Rol')
    INSERT INTO @ColumnasFaltantes VALUES ('Rol');

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'Estatus')
    INSERT INTO @ColumnasFaltantes VALUES ('Estatus');

IF (SELECT COUNT(*) FROM @ColumnasFaltantes) > 0
BEGIN
    PRINT '❌ Faltan columnas necesarias:';
    SELECT * FROM @ColumnasFaltantes;
    PRINT '';
    PRINT '⚠️  La tabla WebUsuario debe tener las siguientes columnas:';
    PRINT '   - UsuarioWeb (PK)';
    PRINT '   - eMail';
    PRINT '   - Contrasena (para hash bcrypt, VARCHAR(255))';
    PRINT '   - Nombre';
    PRINT '   - Rol';
    PRINT '   - Estatus';
END
ELSE
BEGIN
    PRINT '✅ Todas las columnas requeridas existen.';
END

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR LONGITUD DE Contrasena
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '🔍 Verificando longitud de columna Contrasena:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

DECLARE @ContrasenaLength INT;

SELECT @ContrasenaLength = CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'WebUsuario' AND COLUMN_NAME = 'Contrasena';

IF @ContrasenaLength IS NULL
BEGIN
    PRINT '⚠️  La columna Contrasena no existe.';
END
ELSE IF @ContrasenaLength < 255
BEGIN
    PRINT CONCAT('⚠️  La columna Contrasena tiene longitud ', @ContrasenaLength);
    PRINT '    Se recomienda VARCHAR(255) para almacenar hashes bcrypt.';
    PRINT '';
    PRINT '📝 Para ajustar, ejecutar:';
    PRINT '   ALTER TABLE WebUsuario ALTER COLUMN Contrasena VARCHAR(255);';
END
ELSE
BEGIN
    PRINT CONCAT('✅ La columna Contrasena tiene longitud adecuada: VARCHAR(', @ContrasenaLength, ')');
END

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR DATOS EXISTENTES
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 Datos existentes en WebUsuario:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

DECLARE @TotalUsuarios INT;
SELECT @TotalUsuarios = COUNT(*) FROM WebUsuario;

PRINT CONCAT('Total usuarios: ', @TotalUsuarios);
PRINT '';

IF @TotalUsuarios > 0
BEGIN
    PRINT 'Últimos 5 usuarios:';
    SELECT TOP 5
        UsuarioWeb,
        Nombre,
        eMail,
        Rol,
        Estatus,
        FORMAT(Alta, 'dd/MM/yyyy HH:mm', 'es-MX') AS FechaAlta
    FROM WebUsuario
    ORDER BY Alta DESC;
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAR ÍNDICES
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '🔍 Verificando índices:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

SELECT
    i.name AS Indice,
    COL_NAME(ic.object_id, ic.column_id) AS Columna,
    i.type_desc AS Tipo
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('WebUsuario')
ORDER BY i.name, ic.key_ordinal;

PRINT '';

-- Verificar si existe índice en eMail
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    WHERE i.object_id = OBJECT_ID('WebUsuario')
      AND COL_NAME(ic.object_id, ic.column_id) = 'eMail'
)
BEGIN
    PRINT '⚠️  No existe índice en la columna eMail.';
    PRINT '    Se recomienda crear un índice para mejorar el rendimiento del login.';
    PRINT '';
    PRINT '📝 Para crear el índice, ejecutar:';
    PRINT '   CREATE INDEX IX_WebUsuario_eMail ON WebUsuario(eMail);';
    PRINT '';
END
ELSE
BEGIN
    PRINT '✅ Existe índice en la columna eMail.';
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RESUMEN
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ VERIFICACIÓN COMPLETADA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';
PRINT '📝 SIGUIENTE PASO:';
PRINT '   Ejecutar: scripts/crear-admin-webusuario.sql';
PRINT '   Para crear el primer usuario administrador.';
PRINT '';
