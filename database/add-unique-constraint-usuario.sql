-- ============================================================================
-- SCRIPT PARA AGREGAR UNIQUE CONSTRAINT A pNetUsuario.Usuario
-- ============================================================================
-- Este script permite crear Foreign Keys hacia la columna Usuario
-- ============================================================================

USE PP;
GO

PRINT '============================================================================';
PRINT 'Agregando UNIQUE constraint a pNetUsuario.Usuario';
PRINT '============================================================================';

-- Verificar si ya existe un UNIQUE constraint en Usuario
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID('pNetUsuario')
    AND c.name = 'Usuario'
    AND i.is_unique = 1
    AND ic.key_ordinal = 1  -- Solo esta columna en el índice
    AND NOT EXISTS (
        SELECT 1
        FROM sys.index_columns ic2
        WHERE ic2.object_id = i.object_id
        AND ic2.index_id = i.index_id
        AND ic2.key_ordinal = 2  -- No hay segunda columna
    )
)
BEGIN
    PRINT 'Creando UNIQUE constraint en pNetUsuario.Usuario...';

    -- Verificar si hay valores duplicados antes de crear el constraint
    IF EXISTS (
        SELECT Usuario, COUNT(*)
        FROM pNetUsuario
        GROUP BY Usuario
        HAVING COUNT(*) > 1
    )
    BEGIN
        PRINT 'ERROR: Existen valores duplicados en la columna Usuario:';
        SELECT Usuario, COUNT(*) as Cantidad
        FROM pNetUsuario
        GROUP BY Usuario
        HAVING COUNT(*) > 1;

        PRINT 'No se puede crear el UNIQUE constraint. Por favor, resuelve los duplicados primero.';
    END
    ELSE
    BEGIN
        -- Crear el UNIQUE constraint
        ALTER TABLE pNetUsuario
        ADD CONSTRAINT UQ_pNetUsuario_Usuario UNIQUE (Usuario);

        PRINT '✓ UNIQUE constraint creado exitosamente en pNetUsuario.Usuario';
        PRINT '';
        PRINT 'Ahora puedes ejecutar el script create-portal-tables-FIXED.sql';
    END
END
ELSE
BEGIN
    PRINT '⚠ Ya existe un UNIQUE constraint en pNetUsuario.Usuario';
    PRINT 'Puedes proceder a ejecutar create-portal-tables-FIXED.sql';
END

PRINT '============================================================================';
GO
