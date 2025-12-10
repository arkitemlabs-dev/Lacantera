-- ============================================================
-- Resetear Password de Usuario
-- ============================================================
-- Este script crea/actualiza el password para el usuario de prueba
-- Password por defecto: "Test123!"
-- ============================================================

USE PP;
GO

DECLARE @userId INT = 3;  -- Usuario PROV001 (proveedor@test.com)
DECLARE @passwordHash NVARCHAR(500);

-- Hash bcrypt para "Test123!" (con salt)
-- Generado con bcrypt rounds=10
SET @passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

PRINT '============================================================';
PRINT 'RESETEANDO PASSWORD PARA USUARIO';
PRINT '============================================================';
PRINT '';

-- Verificar que el usuario existe
IF NOT EXISTS (SELECT * FROM pNetUsuario WHERE IDUsuario = @userId)
BEGIN
    PRINT '❌ ERROR: El usuario con ID ' + CAST(@userId AS NVARCHAR) + ' no existe';
    RETURN;
END

-- Mostrar información del usuario
SELECT
    IDUsuario,
    Usuario,
    eMail,
    Nombre,
    Estatus
FROM pNetUsuario
WHERE IDUsuario = @userId;

PRINT '';
PRINT '============================================================';

-- Verificar si ya tiene un password
IF EXISTS (SELECT * FROM pNetUsuarioPassword WHERE IDUsuario = @userId)
BEGIN
    PRINT '⚠️  El usuario ya tiene un password. Será reemplazado.';

    -- Eliminar password anterior
    DELETE FROM pNetUsuarioPassword WHERE IDUsuario = @userId;
    PRINT '🗑️  Password anterior eliminado';
END
ELSE
BEGIN
    PRINT '📝 El usuario no tenía password. Creando uno nuevo...';
END

PRINT '';

-- Crear nuevo password
INSERT INTO pNetUsuarioPassword (
    IDUsuario,
    PasswordHash,
    FechaCreacion,
    FechaModificacion
) VALUES (
    @userId,
    @passwordHash,
    GETDATE(),
    GETDATE()
);

PRINT '✅ Password creado exitosamente';
PRINT '';
PRINT '============================================================';
PRINT 'CREDENCIALES DE LOGIN';
PRINT '============================================================';

SELECT
    u.eMail AS 'Email para Login',
    'Test123!' AS 'Password',
    u.Usuario AS 'Nombre Usuario',
    u.Nombre AS 'Nombre Completo',
    CASE
        WHEN p.PasswordHash IS NOT NULL THEN '✓ Configurado'
        ELSE '✗ Sin configurar'
    END AS 'Estado Password'
FROM pNetUsuario u
LEFT JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
WHERE u.IDUsuario = @userId;

PRINT '';
PRINT '============================================================';
PRINT 'PRÓXIMOS PASOS';
PRINT '============================================================';
PRINT '1. Ve a: http://localhost:3000/login';
PRINT '2. Ingresa:';
PRINT '   Email:    proveedor@test.com';
PRINT '   Password: Test123!';
PRINT '3. Deberías poder hacer login exitosamente';
PRINT '';
PRINT '⚠️  IMPORTANTE: Este password es solo para pruebas.';
PRINT '   En producción, usa un password seguro.';
PRINT '';
