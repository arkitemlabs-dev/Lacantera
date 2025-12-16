-- ═══════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR PASSWORD DEL ADMINISTRADOR
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script actualiza el hash de contraseña del administrador
-- con un hash compatible con la versión actual de bcrypt
--
-- Contraseña: admin123456
-- Hash nuevo (bcrypt $2b$): Compatible con bcrypt 6.0.0
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔐 ACTUALIZANDO PASSWORD DEL ADMINISTRADOR';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

DECLARE @Email VARCHAR(100) = 'admin@lacantera.com';
DECLARE @NuevoHash VARCHAR(255) = '$2b$10$fLGnaDy6/bhhWeo34VHN4ux6VZtPt7BhDuK6juq8FD4q3MrbMJrBa';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR QUE EL USUARIO EXISTE
-- ═══════════════════════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT 1 FROM WebUsuario WHERE eMail = @Email)
BEGIN
    PRINT '❌ ERROR: Usuario no encontrado';
    PRINT '';
    RAISERROR('Usuario no existe', 16, 1);
    RETURN;
END

PRINT '✅ Usuario encontrado';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. MOSTRAR DATOS ANTES DE ACTUALIZAR
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 Datos ANTES de actualizar:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

SELECT
    UsuarioWeb,
    Nombre,
    eMail,
    SUBSTRING(Contrasena, 1, 20) + '...' as [Hash Actual],
    LEN(Contrasena) as [Longitud],
    Rol,
    Estatus
FROM WebUsuario
WHERE eMail = @Email;

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ACTUALIZAR EL HASH
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '🔄 Actualizando hash de contraseña...';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    UPDATE WebUsuario
    SET
        Contrasena = @NuevoHash,
        UltimoCambio = GETDATE()
    WHERE eMail = @Email;

    COMMIT TRANSACTION;

    PRINT '✅ Hash actualizado exitosamente';
    PRINT '';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    PRINT '❌ ERROR AL ACTUALIZAR';
    PRINT '';
    PRINT CONCAT('Error: ', ERROR_MESSAGE());
    PRINT '';

    RETURN;
END CATCH;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR LA ACTUALIZACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 Datos DESPUÉS de actualizar:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

SELECT
    UsuarioWeb,
    Nombre,
    eMail,
    SUBSTRING(Contrasena, 1, 20) + '...' as [Hash Nuevo],
    LEN(Contrasena) as [Longitud],
    Rol,
    Estatus,
    FORMAT(UltimoCambio, 'dd/MM/yyyy HH:mm:ss', 'es-MX') as [Último Cambio]
FROM WebUsuario
WHERE eMail = @Email;

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RESUMEN
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ ACTUALIZACIÓN COMPLETADA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';
PRINT '🔑 CREDENCIALES ACTUALIZADAS:';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT 'Email:      admin@lacantera.com';
PRINT 'Contraseña: admin123456';
PRINT 'Rol:        super-admin';
PRINT '';
PRINT '📝 INFORMACIÓN TÉCNICA:';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT 'Hash antiguo: $2a$10$... (bcrypt versión antigua - NO compatible)';
PRINT 'Hash nuevo:   $2b$10$... (bcrypt versión 6.0.0 - compatible)';
PRINT '';
PRINT '⚠️  IMPORTANTE:';
PRINT '   El hash fue actualizado para ser compatible con bcrypt 6.0.0';
PRINT '   que usa el prefijo $2b$ en lugar de $2a$';
PRINT '';
PRINT '🚀 SIGUIENTE PASO:';
PRINT '   Reinicia el servidor (npm run dev) e intenta hacer login';
PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
