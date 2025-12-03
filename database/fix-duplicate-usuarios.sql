-- ============================================================================
-- SCRIPT PARA RESOLVER DUPLICADOS EN pNetUsuario.Usuario
-- ============================================================================
-- Este script ayuda a identificar y resolver usuarios duplicados
-- ============================================================================

USE PP;
GO

PRINT '============================================================================';
PRINT 'Analizando usuarios duplicados en pNetUsuario';
PRINT '============================================================================';
PRINT '';

-- Ver todos los detalles de los usuarios duplicados
PRINT 'Detalles de los usuarios duplicados:';
PRINT '------------------------------------';

SELECT
    IDUsuario,
    Usuario,
    IDUsuarioTipo,
    IDRole,
    eMail,
    Nombre,
    Estatus,
    FechaRegistro,
    Empresa,
    Acreedor
FROM pNetUsuario
WHERE Usuario IN (
    SELECT Usuario
    FROM pNetUsuario
    GROUP BY Usuario
    HAVING COUNT(*) > 1
)
ORDER BY Usuario, FechaRegistro;

PRINT '';
PRINT '============================================================================';
PRINT 'OPCIONES PARA RESOLVER:';
PRINT '============================================================================';
PRINT '';
PRINT 'Opción 1: Renombrar uno de los usuarios duplicados';
PRINT '  UPDATE pNetUsuario SET Usuario = ''DEMO2'' WHERE IDUsuario = [ID_A_CAMBIAR];';
PRINT '';
PRINT 'Opción 2: Eliminar el usuario duplicado (si no tiene datos relacionados)';
PRINT '  DELETE FROM pNetUsuario WHERE IDUsuario = [ID_A_ELIMINAR];';
PRINT '';
PRINT 'Opción 3: Si ambos son válidos, necesitas decidir cuál mantener o renombrar';
PRINT '';
PRINT '============================================================================';
PRINT 'NOTA IMPORTANTE:';
PRINT 'Antes de eliminar, verifica si hay datos relacionados en pNetUsuarioEmpresa:';
PRINT '';

SELECT
    ue.IDUsuarioEmpresa,
    ue.IDUsuario AS Usuario_Ref,
    ue.Empresa,
    u.Usuario,
    u.Nombre,
    u.eMail
FROM pNetUsuarioEmpresa ue
LEFT JOIN pNetUsuario u ON ue.IDUsuario = u.Usuario
WHERE ue.IDUsuario IN (
    SELECT Usuario
    FROM pNetUsuario
    GROUP BY Usuario
    HAVING COUNT(*) > 1
);

PRINT '';
PRINT '============================================================================';
GO
