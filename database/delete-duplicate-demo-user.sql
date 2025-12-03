-- ============================================================================
-- SCRIPT PARA ELIMINAR USUARIO DUPLICADO "DEMO"
-- ============================================================================
-- Elimina el usuario DEMO con email DEMO@intelisis.com (IDUsuario = 2)
-- Mantiene el usuario DEMO con email admin@lacantera.com (IDUsuario = 4)
-- ============================================================================

USE PP;
GO

PRINT '============================================================================';
PRINT 'Eliminando usuario duplicado "DEMO"';
PRINT '============================================================================';
PRINT '';

-- Verificar si hay datos relacionados antes de eliminar
PRINT 'Verificando relaciones en pNetUsuarioEmpresa...';
IF EXISTS (SELECT 1 FROM pNetUsuarioEmpresa WHERE IDUsuario = 'DEMO')
BEGIN
    PRINT '⚠ ADVERTENCIA: Existen registros en pNetUsuarioEmpresa relacionados con este usuario';
    SELECT * FROM pNetUsuarioEmpresa WHERE IDUsuario = 'DEMO';
    PRINT '';
    PRINT 'Estos registros también serán afectados si eliminamos el usuario.';
END
ELSE
BEGIN
    PRINT '✓ No hay registros relacionados en pNetUsuarioEmpresa';
END

PRINT '';
PRINT 'Verificando relaciones en pNetUsuarioPassword...';
IF EXISTS (SELECT 1 FROM pNetUsuarioPassword WHERE IDUsuario = 2)
BEGIN
    PRINT '⚠ ADVERTENCIA: Existen registros en pNetUsuarioPassword';
    SELECT IDUsuario, CreatedAt FROM pNetUsuarioPassword WHERE IDUsuario = 2;
END
ELSE
BEGIN
    PRINT '✓ No hay registros relacionados en pNetUsuarioPassword para el usuario a eliminar';
END

PRINT '';
PRINT '============================================================================';
PRINT 'PROCEDIENDO A ELIMINAR...';
PRINT '============================================================================';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    -- Mostrar el usuario que se va a eliminar
    PRINT 'Usuario a eliminar:';
    SELECT
        IDUsuario,
        Usuario,
        eMail,
        Nombre,
        FechaRegistro
    FROM pNetUsuario
    WHERE IDUsuario = 2
        AND Usuario = 'DEMO'
        AND eMail = 'DEMO@intelisis.com';

    PRINT '';

    -- Primero eliminar registros relacionados en pNetUsuarioPassword si existen
    IF EXISTS (SELECT 1 FROM pNetUsuarioPassword WHERE IDUsuario = 2)
    BEGIN
        PRINT '⚠ Eliminando password del usuario IDUsuario = 2...';

        DELETE FROM pNetUsuarioPassword WHERE IDUsuario = 2;
        PRINT '✓ Password eliminado de pNetUsuarioPassword para el usuario duplicado';
    END

    -- Eliminar el usuario duplicado
    DELETE FROM pNetUsuario
    WHERE IDUsuario = 2
        AND Usuario = 'DEMO'
        AND eMail = 'DEMO@intelisis.com';

    IF @@ROWCOUNT = 1
    BEGIN
        PRINT '✓ Usuario eliminado exitosamente';
        PRINT '';

        -- Verificar que solo queda un usuario DEMO
        PRINT 'Verificando que solo queda un usuario DEMO:';
        SELECT
            IDUsuario,
            Usuario,
            eMail,
            Nombre,
            FechaRegistro
        FROM pNetUsuario
        WHERE Usuario = 'DEMO';

        COMMIT TRANSACTION;

        PRINT '';
        PRINT '============================================================================';
        PRINT '✓ ÉXITO: Usuario duplicado eliminado correctamente';
        PRINT '============================================================================';
        PRINT '';
        PRINT 'Usuario mantenido:';
        PRINT '  IDUsuario: 4';
        PRINT '  Usuario: DEMO';
        PRINT '  Email: admin@lacantera.com';
        PRINT '';
        PRINT 'Siguiente paso: Ejecutar add-unique-constraint-usuario.sql';
        PRINT '============================================================================';
    END
    ELSE
    BEGIN
        ROLLBACK TRANSACTION;
        PRINT '❌ ERROR: No se eliminó ningún registro. Verifica los datos.';
    END
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    PRINT '❌ ERROR al eliminar el usuario:';
    PRINT 'Mensaje: ' + ERROR_MESSAGE();
    PRINT 'Línea: ' + CAST(ERROR_LINE() AS VARCHAR(10));
END CATCH

GO
