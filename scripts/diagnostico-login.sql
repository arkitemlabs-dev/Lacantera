-- ═══════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO DE LOGIN
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script diagnostica por qué falla el login
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 DIAGNÓSTICO DE LOGIN - admin@lacantera.com';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

DECLARE @Email VARCHAR(100) = 'admin@lacantera.com';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. INFORMACIÓN DE LA BASE DE DATOS
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 INFORMACIÓN DE LA BASE DE DATOS ACTUAL';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT CONCAT('Base de datos: ', DB_NAME());
PRINT CONCAT('Servidor: ', @@SERVERNAME);
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. BUSCAR EN WebUsuario
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 PASO 1: Buscando en WebUsuario';
PRINT '─────────────────────────────────────────────────────────────────────────────';

IF OBJECT_ID('dbo.WebUsuario', 'U') IS NOT NULL
BEGIN
    DECLARE @UsuariosWeb INT;
    SELECT @UsuariosWeb = COUNT(*) FROM WebUsuario WHERE eMail = @Email;

    IF @UsuariosWeb > 0
    BEGIN
        PRINT CONCAT('✅ Usuario encontrado en WebUsuario (', @UsuariosWeb, ' registro(s))');
        PRINT '';

        SELECT
            UsuarioWeb AS [Código Usuario],
            Nombre,
            eMail AS Email,
            Rol,
            Estatus,
            FORMAT(Alta, 'dd/MM/yyyy HH:mm', 'es-MX') AS [Fecha Alta],
            Empresa,
            Proveedor,
            LEN(Contrasena) AS [Long. Hash],
            CASE
                WHEN LEN(Contrasena) >= 60 THEN '✅ OK'
                ELSE '❌ Muy corto'
            END AS [Validación Hash]
        FROM WebUsuario
        WHERE eMail = @Email;

        PRINT '';

        -- Verificar el hash completo
        PRINT '🔐 Hash de contraseña almacenado:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        SELECT Contrasena AS [Hash Almacenado] FROM WebUsuario WHERE eMail = @Email;
        PRINT '';

        PRINT '🔐 Hash esperado para "admin123456":';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        PRINT '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO';
        PRINT '';

        -- Comparar hashes
        DECLARE @HashAlmacenado VARCHAR(255);
        DECLARE @HashEsperado VARCHAR(255) = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO';

        SELECT @HashAlmacenado = Contrasena FROM WebUsuario WHERE eMail = @Email;

        IF @HashAlmacenado = @HashEsperado
        BEGIN
            PRINT '✅ Los hashes coinciden exactamente';
        END
        ELSE
        BEGIN
            PRINT '❌ Los hashes NO coinciden';
            PRINT '   Esto causará que el login falle.';
        END
        PRINT '';

        -- Verificar estatus
        DECLARE @Estatus VARCHAR(20);
        SELECT @Estatus = Estatus FROM WebUsuario WHERE eMail = @Email;

        PRINT '📋 Verificación de Estatus:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        IF @Estatus = 'ACTIVO'
        BEGIN
            PRINT CONCAT('✅ Estatus: ', @Estatus, ' (correcto)');
        END
        ELSE
        BEGIN
            PRINT CONCAT('❌ Estatus: ', @Estatus, ' (debe ser "ACTIVO")');
            PRINT '   El login solo funciona con Estatus = "ACTIVO"';
        END
        PRINT '';

        -- Verificar Rol
        DECLARE @Rol VARCHAR(50);
        SELECT @Rol = Rol FROM WebUsuario WHERE eMail = @Email;

        PRINT '📋 Verificación de Rol:';
        PRINT '─────────────────────────────────────────────────────────────────────────────';
        IF @Rol IN ('super-admin', 'admin')
        BEGIN
            PRINT CONCAT('✅ Rol: ', @Rol, ' (correcto)');
        END
        ELSE IF @Rol IS NULL
        BEGIN
            PRINT '❌ Rol: NULL (debe ser "super-admin" o "admin")';
        END
        ELSE
        BEGIN
            PRINT CONCAT('⚠️  Rol: ', @Rol);
        END
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '❌ Usuario NO encontrado en WebUsuario';
        PRINT '';
        PRINT '💡 SOLUCIÓN:';
        PRINT '   Ejecutar: scripts/crear-admin-webusuario.sql';
        PRINT '';
    END
END
ELSE
BEGIN
    PRINT '❌ La tabla WebUsuario NO existe en esta base de datos';
    PRINT '';
    PRINT '⚠️  PROBLEMA: El sistema de autenticación busca en WebUsuario,';
    PRINT '   pero la tabla no existe en la base de datos actual.';
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. BUSCAR EN pNetUsuario (Legacy)
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 PASO 2: Buscando en pNetUsuario (legacy fallback)';
PRINT '─────────────────────────────────────────────────────────────────────────────';

IF OBJECT_ID('dbo.pNetUsuario', 'U') IS NOT NULL
BEGIN
    DECLARE @UsuariosLegacy INT;
    SELECT @UsuariosLegacy = COUNT(*) FROM pNetUsuario WHERE eMail = @Email;

    IF @UsuariosLegacy > 0
    BEGIN
        PRINT CONCAT('✅ Usuario encontrado en pNetUsuario (', @UsuariosLegacy, ' registro(s))');
        PRINT '';

        SELECT
            IDUsuario,
            Usuario AS [Código],
            Nombre,
            eMail AS Email,
            IDUsuarioTipo AS [Tipo],
            Estatus,
            FORMAT(FechaRegistro, 'dd/MM/yyyy HH:mm', 'es-MX') AS [Fecha Registro]
        FROM pNetUsuario
        WHERE eMail = @Email;

        PRINT '';

        -- Verificar si tiene contraseña
        DECLARE @IDUsuario INT;
        SELECT @IDUsuario = IDUsuario FROM pNetUsuario WHERE eMail = @Email;

        IF EXISTS (SELECT 1 FROM pNetUsuarioPassword WHERE IDUsuario = @IDUsuario)
        BEGIN
            PRINT '✅ El usuario tiene contraseña configurada en pNetUsuarioPassword';
            PRINT '';

            SELECT
                IDUsuario,
                LEN(PasswordHash) AS [Long. Hash],
                CASE
                    WHEN LEN(PasswordHash) >= 60 THEN '✅ OK'
                    ELSE '❌ Muy corto'
                END AS [Validación]
            FROM pNetUsuarioPassword
            WHERE IDUsuario = @IDUsuario;

            PRINT '';
            PRINT '📝 Este usuario funcionará como fallback si no existe en WebUsuario.';
        END
        ELSE
        BEGIN
            PRINT '❌ El usuario NO tiene contraseña en pNetUsuarioPassword';
            PRINT '   No podrá autenticarse.';
        END
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT '❌ Usuario NO encontrado en pNetUsuario';
        PRINT '';
    END
END
ELSE
BEGIN
    PRINT '❌ La tabla pNetUsuario NO existe en esta base de datos';
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. LISTAR TODOS LOS USUARIOS EN WebUsuario
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 TODOS LOS USUARIOS EN WebUsuario (últimos 10):';
PRINT '─────────────────────────────────────────────────────────────────────────────';

IF OBJECT_ID('dbo.WebUsuario', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM WebUsuario)
    BEGIN
        SELECT TOP 10
            UsuarioWeb AS [Código],
            Nombre,
            eMail AS Email,
            Rol,
            Estatus,
            FORMAT(Alta, 'dd/MM/yyyy', 'es-MX') AS [Fecha Alta]
        FROM WebUsuario
        ORDER BY Alta DESC;
    END
    ELSE
    BEGIN
        PRINT '⚠️  La tabla WebUsuario existe pero está vacía.';
    END
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR ESTRUCTURA DE WebUsuario
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '📊 ESTRUCTURA DE LA TABLA WebUsuario:';
PRINT '─────────────────────────────────────────────────────────────────────────────';

IF OBJECT_ID('dbo.WebUsuario', 'U') IS NOT NULL
BEGIN
    SELECT
        COLUMN_NAME AS Columna,
        DATA_TYPE AS Tipo,
        CHARACTER_MAXIMUM_LENGTH AS Longitud,
        IS_NULLABLE AS Nulo
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'WebUsuario'
      AND COLUMN_NAME IN ('UsuarioWeb', 'eMail', 'Contrasena', 'Nombre', 'Rol', 'Estatus')
    ORDER BY ORDINAL_POSITION;
    PRINT '';
END

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RESUMEN Y RECOMENDACIONES
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '📝 RESUMEN Y DIAGNÓSTICO';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- Variables para el resumen
DECLARE @ExisteEnWeb BIT = 0;
DECLARE @ExisteEnLegacy BIT = 0;
DECLARE @ProblemaEncontrado VARCHAR(500) = '';

IF OBJECT_ID('dbo.WebUsuario', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM WebUsuario WHERE eMail = @Email)
    BEGIN
        SET @ExisteEnWeb = 1;

        -- Verificar problemas específicos
        DECLARE @EstatusCheck VARCHAR(20);
        DECLARE @HashCheck VARCHAR(255);
        DECLARE @RolCheck VARCHAR(50);

        SELECT
            @EstatusCheck = Estatus,
            @HashCheck = Contrasena,
            @RolCheck = Rol
        FROM WebUsuario
        WHERE eMail = @Email;

        IF @EstatusCheck != 'ACTIVO'
            SET @ProblemaEncontrado = @ProblemaEncontrado + '• Estatus no es ACTIVO. ';

        IF LEN(@HashCheck) < 60
            SET @ProblemaEncontrado = @ProblemaEncontrado + '• Hash de contraseña muy corto. ';

        IF @HashCheck != '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO'
            SET @ProblemaEncontrado = @ProblemaEncontrado + '• Hash no coincide con "admin123456". ';

        IF @RolCheck IS NULL OR @RolCheck NOT IN ('super-admin', 'admin')
            SET @ProblemaEncontrado = @ProblemaEncontrado + '• Rol inválido. ';
    END
END

IF OBJECT_ID('dbo.pNetUsuario', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM pNetUsuario WHERE eMail = @Email)
        SET @ExisteEnLegacy = 1;
END

-- Mostrar resultado
IF @ExisteEnWeb = 1 AND LEN(@ProblemaEncontrado) = 0
BEGIN
    PRINT '✅ TODO CORRECTO';
    PRINT '   El usuario existe en WebUsuario y está correctamente configurado.';
    PRINT '';
    PRINT '💡 Si aún falla el login, verifica:';
    PRINT '   1. Que estés usando el email: admin@lacantera.com';
    PRINT '   2. Que estés usando la contraseña: admin123456';
    PRINT '   3. Que la aplicación se conecte a este servidor y base de datos.';
END
ELSE IF @ExisteEnWeb = 1 AND LEN(@ProblemaEncontrado) > 0
BEGIN
    PRINT '⚠️  USUARIO EXISTE PERO HAY PROBLEMAS';
    PRINT '';
    PRINT 'Problemas encontrados:';
    PRINT @ProblemaEncontrado;
    PRINT '';
    PRINT '💡 SOLUCIÓN:';
    PRINT '   Ejecutar el script de corrección correspondiente.';
END
ELSE IF @ExisteEnWeb = 0 AND @ExisteEnLegacy = 1
BEGIN
    PRINT '⚠️  USUARIO SOLO EN pNetUsuario';
    PRINT '   El usuario existe en la tabla legacy pero no en WebUsuario.';
    PRINT '';
    PRINT '💡 SOLUCIÓN:';
    PRINT '   Ejecutar: scripts/crear-admin-webusuario.sql';
    PRINT '   Para crear el usuario en WebUsuario.';
END
ELSE
BEGIN
    PRINT '❌ USUARIO NO ENCONTRADO';
    PRINT '   El usuario no existe en ninguna tabla.';
    PRINT '';
    PRINT '💡 SOLUCIÓN:';
    PRINT '   1. Ejecutar: scripts/0-ajustar-webusuario.sql';
    PRINT '   2. Luego ejecutar: scripts/crear-admin-webusuario.sql';
END

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ DIAGNÓSTICO COMPLETADO';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
