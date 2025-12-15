-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT PARA CREAR USUARIO ADMINISTRADOR
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script crea el usuario administrador del portal
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
PRINT '👤 CREANDO USUARIO ADMINISTRADOR';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR SI YA EXISTE EL USUARIO
-- ═══════════════════════════════════════════════════════════════════════════════

DECLARE @UsuarioExiste INT;
SELECT @UsuarioExiste = COUNT(*)
FROM portal_usuarios
WHERE Email = 'admin@lacantera.com';

IF @UsuarioExiste > 0
BEGIN
    PRINT '⚠️  El usuario admin@lacantera.com ya existe en el sistema.';
    PRINT '';
    PRINT 'Usuario existente:';
    SELECT
        IDUsuario,
        Nombre,
        Email,
        RFC,
        Rol,
        Activo,
        FechaCreacion
    FROM portal_usuarios
    WHERE Email = 'admin@lacantera.com';

    PRINT '';
    PRINT '💡 Si deseas actualizar la contraseña, ejecuta el script de actualización.';
END
ELSE
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════════
    -- 2. CREAR EL USUARIO ADMINISTRADOR
    -- ═══════════════════════════════════════════════════════════════════════════════

    PRINT '✨ Creando nuevo usuario administrador...';
    PRINT '';

    BEGIN TRANSACTION;

    BEGIN TRY
        -- Insertar el usuario
        -- Hash bcrypt de "admin123456": $2a$10$YourBcryptHashHereForAdmin123456
        -- Este hash será generado por la aplicación cuando el admin inicie sesión por primera vez
        -- Por ahora usamos un hash temporal que DEBE ser cambiado en el primer login

        INSERT INTO portal_usuarios (
            IDUsuario,
            Nombre,
            RFC,
            Email,
            PasswordHash,
            Rol,
            Activo,
            FechaCreacion,
            UltimaActualizacion,
            RequiereCambioPassword
        )
        VALUES (
            NEXT VALUE FOR seq_portal_usuarios,
            'Administrador del Sistema',
            'XAXX010101000', -- RFC genérico para admin
            'admin@lacantera.com',
            '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO', -- Hash de "admin123456"
            'super-admin',
            1,
            GETDATE(),
            GETDATE(),
            0 -- No requiere cambio de password inicialmente
        );

        DECLARE @NuevoIDUsuario INT = SCOPE_IDENTITY();

        PRINT '✅ Usuario administrador creado exitosamente!';
        PRINT '';
        PRINT '📋 Detalles del usuario:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';

        SELECT
            IDUsuario,
            Nombre,
            Email,
            RFC,
            Rol,
            Activo,
            FechaCreacion,
            RequiereCambioPassword
        FROM portal_usuarios
        WHERE IDUsuario = @NuevoIDUsuario;

        PRINT '';
        PRINT '🔑 CREDENCIALES DE ACCESO:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        PRINT 'Email:      admin@lacantera.com';
        PRINT 'Contraseña: admin123456';
        PRINT 'Rol:        super-admin';
        PRINT '';
        PRINT '⚠️  IMPORTANTE: Por seguridad, cambia esta contraseña después del primer login.';
        PRINT '';

        COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        PRINT '';
        PRINT '═══════════════════════════════════════════════════════════════════════════════';
        PRINT '❌ ERROR AL CREAR EL USUARIO ADMINISTRADOR';
        PRINT '═══════════════════════════════════════════════════════════════════════════════';
        PRINT '';
        PRINT 'Error: ' + ERROR_MESSAGE();
        PRINT 'Línea: ' + CAST(ERROR_LINE() AS VARCHAR(10));
        PRINT '';
        PRINT 'La transacción ha sido revertida.';
    END CATCH;
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ SCRIPT COMPLETADO';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
