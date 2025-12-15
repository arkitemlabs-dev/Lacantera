-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE SINCRONIZACIÓN DE PROVEEDORES (MODO ADMINISTRADOR)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Este script sincroniza proveedores desde los ERPs hacia el Portal (PP)
-- Ejecutar en: Servidor Portal (cloud.arkitem.com) - Database: PP
--
-- IMPORTANTE:
-- 1. Primero ejecuta la PARTE 1 (PREVIEW) para ver qué se va a crear
-- 2. Revisa los resultados
-- 3. Luego ejecuta la PARTE 2 (INSERCIÓN) para crear los registros
--
-- ═══════════════════════════════════════════════════════════════════════════════

USE PP;
GO

-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN: Lista de RFCs a sincronizar
-- ═══════════════════════════════════════════════════════════════════════════════

DECLARE @ProveedoresASincronizar TABLE (
    RFC VARCHAR(13),
    Email VARCHAR(255),
    Nombre VARCHAR(255)
);

-- AGREGAR AQUÍ LOS PROVEEDORES QUE QUIERES SINCRONIZAR
INSERT INTO @ProveedoresASincronizar (RFC, Email, Nombre) VALUES
    ('ACE140813E29', 'lmontero@arkitem.com', 'ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV'),
    -- Agregar más proveedores aquí según necesites
    -- ('RFC123456789', 'email@ejemplo.com', 'NOMBRE DE LA EMPRESA SA DE CV'),
    ('XXX000000XXX', 'ejemplo@test.com', 'PROVEEDOR DE PRUEBA'); -- Este es un ejemplo, eliminar o reemplazar

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 1: PREVIEW - VER QUÉ SE VA A SINCRONIZAR
-- ═══════════════════════════════════════════════════════════════════════════════

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '📋 PARTE 1: PREVIEW DE SINCRONIZACIÓN';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- 1. Ver cuántos proveedores se van a procesar
DECLARE @TotalProveedores INT;
SELECT @TotalProveedores = COUNT(*) FROM @ProveedoresASincronizar WHERE RFC != 'XXX000000XXX';

PRINT '📊 Total de proveedores a procesar: ' + CAST(@TotalProveedores AS VARCHAR(10));
PRINT '';

-- 2. Buscar cada proveedor en las bases de datos ERP
PRINT '🔍 Buscando proveedores en los ERPs...';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

-- Tabla temporal para almacenar resultados
DECLARE @ResultadosBusqueda TABLE (
    RFC VARCHAR(13),
    EmailPortal VARCHAR(255),
    NombrePortal VARCHAR(255),
    EmpresaCode VARCHAR(50),
    EmpresaNombre VARCHAR(100),
    CodigoProveedor VARCHAR(20),
    NombreERP VARCHAR(255),
    Encontrado BIT
);

-- Buscar en cada ERP
DECLARE @RFC VARCHAR(13);
DECLARE @Email VARCHAR(255);
DECLARE @NombrePortal VARCHAR(255);

DECLARE proveedor_cursor CURSOR FOR
SELECT RFC, Email, Nombre FROM @ProveedoresASincronizar WHERE RFC != 'XXX000000XXX';

OPEN proveedor_cursor;
FETCH NEXT FROM proveedor_cursor INTO @RFC, @Email, @NombrePortal;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '📍 Buscando RFC: ' + @RFC + ' (' + @NombrePortal + ')';

    -- Buscar en LA CANTERA
    DECLARE @CodigoCantera VARCHAR(20), @NombreCantera VARCHAR(255);
    SELECT TOP 1 @CodigoCantera = Proveedor, @NombreCantera = Nombre
    FROM [104.46.127.151].Cantera_ajustes.dbo.Prov
    WHERE RFC = @RFC AND Estatus = 'ALTA';

    IF @CodigoCantera IS NOT NULL
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'la-cantera', 'La Cantera', @CodigoCantera, @NombreCantera, 1);
        PRINT '  ✅ La Cantera: ' + @CodigoCantera + ' - ' + @NombreCantera;
    END
    ELSE
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'la-cantera', 'La Cantera', NULL, NULL, 0);
        PRINT '  ❌ La Cantera: No encontrado';
    END

    -- Buscar en PERALILLO
    DECLARE @CodigoPeralillo VARCHAR(20), @NombrePeralillo VARCHAR(255);
    SELECT TOP 1 @CodigoPeralillo = Proveedor, @NombrePeralillo = Nombre
    FROM [104.46.127.151].Peralillo_Ajustes.dbo.Prov
    WHERE RFC = @RFC AND Estatus = 'ALTA';

    IF @CodigoPeralillo IS NOT NULL
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'peralillo', 'Peralillo', @CodigoPeralillo, @NombrePeralillo, 1);
        PRINT '  ✅ Peralillo: ' + @CodigoPeralillo + ' - ' + @NombrePeralillo;
    END
    ELSE
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'peralillo', 'Peralillo', NULL, NULL, 0);
        PRINT '  ❌ Peralillo: No encontrado';
    END

    -- Buscar en GALBD_PRUEBAS (Plaza Galereña)
    DECLARE @CodigoGalPlaza VARCHAR(20), @NombreGalPlaza VARCHAR(255);
    SELECT TOP 1 @CodigoGalPlaza = Proveedor, @NombreGalPlaza = Nombre
    FROM [104.46.127.151].GALBD_PRUEBAS.dbo.Prov
    WHERE RFC = @RFC AND Estatus = 'ALTA';

    IF @CodigoGalPlaza IS NOT NULL
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'plaza-galerena', 'Plaza Galereña', @CodigoGalPlaza, @NombreGalPlaza, 1);
        PRINT '  ✅ Plaza Galereña: ' + @CodigoGalPlaza + ' - ' + @NombreGalPlaza;

        -- Mismo código para Inmobiliaria (comparten BD)
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'inmobiliaria-galerena', 'Inmobiliaria Galereña', @CodigoGalPlaza, @NombreGalPlaza, 1);
        PRINT '  ✅ Inmobiliaria Galereña: ' + @CodigoGalPlaza + ' - ' + @NombreGalPlaza;
    END
    ELSE
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'plaza-galerena', 'Plaza Galereña', NULL, NULL, 0);
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'inmobiliaria-galerena', 'Inmobiliaria Galereña', NULL, NULL, 0);
        PRINT '  ❌ Plaza Galereña: No encontrado';
        PRINT '  ❌ Inmobiliaria Galereña: No encontrado';
    END

    -- Buscar en ICREAR
    DECLARE @CodigoIcrear VARCHAR(20), @NombreIcrear VARCHAR(255);
    SELECT TOP 1 @CodigoIcrear = Proveedor, @NombreIcrear = Nombre
    FROM [104.46.127.151].ICREAR_PRUEBAS.dbo.Prov
    WHERE RFC = @RFC AND Estatus = 'ALTA';

    IF @CodigoIcrear IS NOT NULL
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'icrear', 'Icrear', @CodigoIcrear, @NombreIcrear, 1);
        PRINT '  ✅ Icrear: ' + @CodigoIcrear + ' - ' + @NombreIcrear;
    END
    ELSE
    BEGIN
        INSERT INTO @ResultadosBusqueda VALUES (@RFC, @Email, @NombrePortal, 'icrear', 'Icrear', NULL, NULL, 0);
        PRINT '  ❌ Icrear: No encontrado';
    END

    PRINT '';

    -- Limpiar variables
    SET @CodigoCantera = NULL;
    SET @NombreCantera = NULL;
    SET @CodigoPeralillo = NULL;
    SET @NombrePeralillo = NULL;
    SET @CodigoGalPlaza = NULL;
    SET @NombreGalPlaza = NULL;
    SET @CodigoIcrear = NULL;
    SET @NombreIcrear = NULL;

    FETCH NEXT FROM proveedor_cursor INTO @RFC, @Email, @NombrePortal;
END

CLOSE proveedor_cursor;
DEALLOCATE proveedor_cursor;

-- 3. Mostrar resumen
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '📊 RESUMEN DE BÚSQUEDA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

SELECT
    RFC,
    NombrePortal AS [Nombre Proveedor],
    EmpresaNombre AS Empresa,
    CASE WHEN Encontrado = 1 THEN '✅ ' + CodigoProveedor ELSE '❌ No encontrado' END AS [Código ERP],
    EmailPortal AS Email
FROM @ResultadosBusqueda
ORDER BY RFC, EmpresaCode;

PRINT '';
PRINT '📈 ESTADÍSTICAS:';

DECLARE @TotalMappings INT;
DECLARE @MappingsExitosos INT;

SELECT @TotalMappings = COUNT(*) FROM @ResultadosBusqueda;
SELECT @MappingsExitosos = COUNT(*) FROM @ResultadosBusqueda WHERE Encontrado = 1;

PRINT 'Total de búsquedas realizadas: ' + CAST(@TotalMappings AS VARCHAR(10));
PRINT 'Proveedores encontrados: ' + CAST(@MappingsExitosos AS VARCHAR(10));
PRINT 'Proveedores NO encontrados: ' + CAST(@TotalMappings - @MappingsExitosos AS VARCHAR(10));

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '⚠️  IMPORTANTE: Revisa los resultados arriba antes de continuar';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';
PRINT '✋ Si los resultados son correctos, ejecuta la PARTE 2 para insertar los datos';
PRINT '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PARTE 2: INSERCIÓN - COMENTADA POR SEGURIDAD
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- INSTRUCCIONES:
-- 1. Descomenta todo el código de la PARTE 2 (desde aquí hasta el final)
-- 2. Ejecuta solo la PARTE 2
-- 3. Verifica que los registros se hayan creado correctamente
--
-- ═══════════════════════════════════════════════════════════════════════════════

/*

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '💾 PARTE 2: INSERTANDO DATOS EN EL PORTAL';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY

    -- 1. Insertar usuarios en portal_usuarios
    PRINT '👤 Insertando usuarios...';

    INSERT INTO portal_usuarios (IDUsuario, Nombre, RFC, Email, PasswordHash, Activo, FechaCreacion, UltimaActualizacion)
    SELECT DISTINCT
        NEXT VALUE FOR seq_portal_usuarios,
        r.NombrePortal,
        r.RFC,
        r.EmailPortal,
        '$2a$10$defaultHashTemporalParaPruebas', -- Hash temporal, el usuario debe cambiar su contraseña
        1,
        GETDATE(),
        GETDATE()
    FROM @ResultadosBusqueda r
    WHERE r.Encontrado = 1
      AND NOT EXISTS (
          SELECT 1 FROM portal_usuarios pu WHERE pu.RFC = r.RFC
      )
    GROUP BY r.RFC, r.NombrePortal, r.EmailPortal;

    PRINT '✅ Usuarios insertados: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
    PRINT '';

    -- 2. Insertar mappings en portal_proveedor_mapping
    PRINT '🔗 Insertando mappings...';

    INSERT INTO portal_proveedor_mapping (
        portal_user_id,
        empresa_code,
        erp_proveedor_code,
        activo,
        fecha_creacion,
        fecha_actualizacion
    )
    SELECT
        pu.IDUsuario,
        r.EmpresaCode,
        r.CodigoProveedor,
        1,
        GETDATE(),
        GETDATE()
    FROM @ResultadosBusqueda r
    INNER JOIN portal_usuarios pu ON pu.RFC = r.RFC
    WHERE r.Encontrado = 1
      AND NOT EXISTS (
          SELECT 1
          FROM portal_proveedor_mapping ppm
          WHERE ppm.portal_user_id = pu.IDUsuario
            AND ppm.empresa_code = r.EmpresaCode
      );

    PRINT '✅ Mappings insertados: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
    PRINT '';

    -- 3. Verificar inserciones
    PRINT '🔍 Verificando inserciones...';
    PRINT '';

    SELECT
        pu.IDUsuario,
        pu.RFC,
        pu.Nombre,
        pu.Email,
        COUNT(ppm.empresa_code) AS [Total Empresas],
        STRING_AGG(ppm.empresa_code, ', ') AS [Empresas Mapeadas]
    FROM portal_usuarios pu
    INNER JOIN @ProveedoresASincronizar p ON p.RFC = pu.RFC
    LEFT JOIN portal_proveedor_mapping ppm ON ppm.portal_user_id = pu.IDUsuario AND ppm.activo = 1
    WHERE p.RFC != 'XXX000000XXX'
    GROUP BY pu.IDUsuario, pu.RFC, pu.Nombre, pu.Email
    ORDER BY pu.IDUsuario;

    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════════════════════════';
    PRINT '✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE';
    PRINT '═══════════════════════════════════════════════════════════════════════════════';
    PRINT '';
    PRINT '📧 Siguiente paso: Notificar a los proveedores con sus credenciales de acceso';
    PRINT '';

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;

    PRINT '';
    PRINT '═══════════════════════════════════════════════════════════════════════════════';
    PRINT '❌ ERROR EN LA SINCRONIZACIÓN';
    PRINT '═══════════════════════════════════════════════════════════════════════════════';
    PRINT '';
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT 'Línea: ' + CAST(ERROR_LINE() AS VARCHAR(10));
    PRINT '';
    PRINT 'La transacción ha sido revertida.';

END CATCH;

*/
