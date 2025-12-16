-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIGURAR USUARIO ADMINISTRADOR EXISTENTE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script configura el usuario admin@lacantera.com existente
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP
--
-- USUARIO: admin@lacantera.com (IDUsuario = 4)
-- CONTRASEÑA: admin123456
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '👤 CONFIGURANDO USUARIO ADMINISTRADOR';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR USUARIO EXISTENTE
-- ═══════════════════════════════════════════════════════════════════════════════

DECLARE @IDUsuario INT;
DECLARE @Email NVARCHAR(50) = 'admin@lacantera.com';

SELECT @IDUsuario = IDUsuario
FROM pNetUsuario
WHERE eMail = @Email;

IF @IDUsuario IS NULL
BEGIN
    PRINT '❌ ERROR: No se encontró el usuario admin@lacantera.com en pNetUsuario';
    PRINT '';
    PRINT '💡 Verifica que el usuario existe en la tabla pNetUsuario';
    RAISERROR('Usuario no encontrado', 16, 1);
    RETURN;
END

PRINT CONCAT('✅ Usuario encontrado: IDUsuario = ', @IDUsuario);
PRINT '';

-- Mostrar información actual
SELECT
    IDUsuario,
    Usuario,
    IDUsuarioTipo,
    eMail,
    Nombre,
    Estatus,
    FORMAT(FechaRegistro, 'dd/MM/yyyy HH:mm', 'es-MX') AS FechaRegistro
FROM pNetUsuario
WHERE IDUsuario = @IDUsuario;

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ACTUALIZAR TIPO DE USUARIO A ADMINISTRADOR (si no lo es)
-- ═══════════════════════════════════════════════════════════════════════════════

DECLARE @TipoActual INT;
SELECT @TipoActual = IDUsuarioTipo FROM pNetUsuario WHERE IDUsuario = @IDUsuario;

IF @TipoActual != 1
BEGIN
    PRINT CONCAT('⚠️  El usuario tiene IDUsuarioTipo = ', @TipoActual, ' (no es administrador)');
    PRINT '📝 Actualizando a IDUsuarioTipo = 1 (Administrador)...';

    UPDATE pNetUsuario
    SET IDUsuarioTipo = 1,
        Estatus = 'ACTIVO'
    WHERE IDUsuario = @IDUsuario;

    PRINT '✅ Tipo de usuario actualizado a Administrador';
    PRINT '';
END
ELSE
BEGIN
    PRINT '✅ El usuario ya tiene IDUsuarioTipo = 1 (Administrador)';
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CONFIGURAR O ACTUALIZAR CONTRASEÑA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Hash bcrypt de "admin123456"
DECLARE @PasswordHash VARCHAR(255) = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO';

-- Verificar si ya tiene contraseña
DECLARE @TienePassword INT;
SELECT @TienePassword = COUNT(*)
FROM pNetUsuarioPassword
WHERE IDUsuario = @IDUsuario;

IF @TienePassword > 0
BEGIN
    PRINT '⚠️  El usuario ya tiene una contraseña configurada.';
    PRINT '📝 Actualizando contraseña...';

    UPDATE pNetUsuarioPassword
    SET PasswordHash = @PasswordHash
    WHERE IDUsuario = @IDUsuario;

    PRINT '✅ Contraseña actualizada';
END
ELSE
BEGIN
    PRINT '📝 Creando contraseña para el usuario...';

    INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)
    VALUES (@IDUsuario, @PasswordHash);

    PRINT '✅ Contraseña creada';
END

PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RESUMEN FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ CONFIGURACIÓN COMPLETADA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

SELECT
    u.IDUsuario,
    u.Usuario AS CodigoUsuario,
    u.eMail AS Email,
    u.Nombre,
    u.IDUsuarioTipo,
    t.Descripcion AS TipoUsuario,
    u.Estatus,
    CASE
        WHEN p.IDUsuario IS NOT NULL THEN 'Sí'
        ELSE 'No'
    END AS TienePassword,
    FORMAT(u.FechaRegistro, 'dd/MM/yyyy HH:mm', 'es-MX') AS FechaRegistro
FROM pNetUsuario u
LEFT JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
LEFT JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
WHERE u.IDUsuario = @IDUsuario;

PRINT '';
PRINT '🔑 CREDENCIALES PARA LOGIN:';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT 'URL:        http://localhost:3000/login  (o tu URL de producción)';
PRINT 'Email:      admin@lacantera.com';
PRINT 'Contraseña: admin123456';
PRINT 'Tipo:       Administrador (Intelisis)';
PRINT '';
PRINT '⚠️  IMPORTANTE: El sistema buscará primero en portal_usuarios y luego en';
PRINT '   pNetUsuario. Este usuario será encontrado en pNetUsuario.';
PRINT '';
PRINT '💡 Si deseas usar el nuevo sistema de portal_usuarios para administradores,';
PRINT '   puedes crear usuarios desde /admin/registro en el portal web.';
PRINT '';

PRINT '═══════════════════════════════════════════════════════════════════════════════';
