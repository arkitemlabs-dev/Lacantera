-- ═══════════════════════════════════════════════════════════════════════════════
-- CREAR USUARIO ADMINISTRADOR EN WebUsuario
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script crea el usuario administrador en la tabla WebUsuario
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP
--
-- CREDENCIALES:
-- Email: admin@lacantera.com
-- Contraseña: admin123456
-- Rol: super-admin
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '👤 CREANDO USUARIO ADMINISTRADOR EN WebUsuario';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR SI EXISTE LA TABLA WebUsuario
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
-- 2. VERIFICAR SI YA EXISTE EL USUARIO
-- ═══════════════════════════════════════════════════════════════════════════════

DECLARE @Email VARCHAR(100) = 'admin@lacantera.com';
DECLARE @UsuarioExiste INT;

SELECT @UsuarioExiste = COUNT(*)
FROM WebUsuario
WHERE eMail = @Email;

IF @UsuarioExiste > 0
BEGIN
    PRINT '⚠️  El usuario admin@lacantera.com ya existe en WebUsuario.';
    PRINT '';

    SELECT
        UsuarioWeb,
        Nombre,
        eMail,
        Rol,
        Estatus,
        FORMAT(Alta, 'dd/MM/yyyy HH:mm', 'es-MX') AS FechaAlta,
        Empresa,
        Telefono
    FROM WebUsuario
    WHERE eMail = @Email;

    PRINT '';
    PRINT '💡 El usuario ya está configurado. Puedes usar estas credenciales para iniciar sesión.';
    PRINT '';
END
ELSE
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════════
    -- 3. CREAR EL USUARIO ADMINISTRADOR
    -- ═══════════════════════════════════════════════════════════════════════════════

    PRINT '✨ Creando nuevo usuario administrador...';
    PRINT '';

    BEGIN TRANSACTION;

    BEGIN TRY
        -- Hash bcrypt de "admin123456"
        DECLARE @PasswordHash VARCHAR(255) = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO';
        DECLARE @UsuarioWeb VARCHAR(50) = 'ADMIN001';

        INSERT INTO WebUsuario (
            UsuarioWeb,
            Nombre,
            eMail,
            Contrasena,
            Rol,
            Estatus,
            Alta,
            UltimoCambio
        )
        VALUES (
            @UsuarioWeb,
            'Administrador del Sistema',
            @Email,
            @PasswordHash,
            'super-admin',
            'ACTIVO',
            GETDATE(),
            GETDATE()
        );

        COMMIT TRANSACTION;

        PRINT '✅ Usuario administrador creado exitosamente!';
        PRINT '';
        PRINT '📋 Detalles:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';

        SELECT
            UsuarioWeb,
            Nombre,
            eMail,
            Rol,
            Estatus,
            FORMAT(Alta, 'dd/MM/yyyy HH:mm', 'es-MX') AS FechaAlta
        FROM WebUsuario
        WHERE UsuarioWeb = @UsuarioWeb;

        PRINT '';
        PRINT '🔑 CREDENCIALES:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        PRINT 'URL:        http://localhost:3000/login  (o tu URL de producción)';
        PRINT 'Email:      admin@lacantera.com';
        PRINT 'Contraseña: admin123456';
        PRINT 'Rol:        super-admin';
        PRINT '';
        PRINT '⚠️  IMPORTANTE: Cambia esta contraseña después del primer login.';
        PRINT '';

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        PRINT '';
        PRINT '❌ ERROR AL CREAR EL USUARIO';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        PRINT CONCAT('Error: ', ERROR_MESSAGE());
        PRINT CONCAT('Línea: ', ERROR_LINE());
        PRINT '';
    END CATCH;
END

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT COMPLETADO';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';
PRINT '📝 NOTAS IMPORTANTES:';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '• El sistema ahora usa la tabla WebUsuario para todos los usuarios web';
PRINT '• Los usuarios legacy en pNetUsuario siguen funcionando';
PRINT '• Nuevos administradores se registran desde /admin/registro';
PRINT '• El campo Rol en WebUsuario determina los permisos del usuario';
PRINT '';
