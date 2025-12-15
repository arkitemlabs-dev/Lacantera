-- Script para ver documentos del proveedor ARQUITECTURA en La Cantera
-- Ejecutar en: Servidor ERP (104.46.127.151) - Database: Cantera_ajustes

USE Cantera_ajustes;
GO

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 DOCUMENTOS DEL PROVEEDOR ARQUITECTURA (P00443) EN LA CANTERA';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ============================================================================
-- 1. CATÁLOGO DE DOCUMENTOS REQUERIDOS (DocRama - Rama='CXP')
-- ============================================================================
PRINT '📋 1. DOCUMENTOS REQUERIDOS PARA PROVEEDORES (DocRama)';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    Rama,
    Documento,
    Grupo,
    Orden,
    CASE WHEN Requerido = 1 THEN 'SÍ' ELSE 'NO' END AS Requerido
FROM DocRama
WHERE Rama = 'CXP'
ORDER BY Orden;

PRINT '';
PRINT '';

-- ============================================================================
-- 2. ARCHIVOS ADJUNTOS DEL PROVEEDOR P00443 (AnexoCta)
-- ============================================================================
PRINT '📎 2. ARCHIVOS ADJUNTOS DEL PROVEEDOR P00443 (AnexoCta)';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    Rama,
    Cuenta AS CodigoProveedor,
    IDR,
    Nombre AS NombreDocumento,
    Direccion AS RutaArchivo,
    Tipo,
    Orden,
    CASE WHEN Autorizado = 1 THEN 'SÍ' ELSE 'NO' END AS Autorizado,
    CASE WHEN Rechazado = 1 THEN 'SÍ' ELSE 'NO' END AS Rechazado,
    Alta AS FechaAlta,
    UltimoCambio AS FechaUltimoCambio,
    Usuario,
    Observaciones
FROM AnexoCta
WHERE Rama = 'CXP'
  AND Cuenta = 'P00443'
ORDER BY Orden, Alta DESC;

PRINT '';
PRINT '';

-- ============================================================================
-- 3. RESUMEN: DOCUMENTOS REQUERIDOS vs ARCHIVOS SUBIDOS
-- ============================================================================
PRINT '📊 3. RESUMEN: DOCUMENTOS REQUERIDOS vs ARCHIVOS SUBIDOS';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

SELECT
    dr.Documento AS DocumentoRequerido,
    dr.Grupo,
    dr.Orden,
    CASE WHEN dr.Requerido = 1 THEN 'SÍ' ELSE 'NO' END AS Requerido,
    COUNT(ac.IDR) AS CantidadArchivos,
    CASE
        WHEN COUNT(ac.IDR) > 0 THEN '✅ CON ARCHIVO'
        ELSE '❌ SIN ARCHIVO'
    END AS Estado
FROM DocRama dr
LEFT JOIN AnexoCta ac ON ac.Rama = 'CXP'
    AND ac.Cuenta = 'P00443'
    AND (
        ac.Nombre LIKE '%' + dr.Documento + '%'
        OR ac.Documento = dr.Documento
    )
WHERE dr.Rama = 'CXP'
GROUP BY dr.Documento, dr.Grupo, dr.Orden, dr.Requerido
ORDER BY dr.Orden;

PRINT '';
PRINT '';

-- ============================================================================
-- 4. ESTADÍSTICAS
-- ============================================================================
PRINT '📈 4. ESTADÍSTICAS';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT '';

DECLARE @TotalRequeridos INT;
DECLARE @TotalArchivos INT;
DECLARE @Autorizados INT;
DECLARE @Rechazados INT;
DECLARE @Pendientes INT;

SELECT @TotalRequeridos = COUNT(*) FROM DocRama WHERE Rama = 'CXP';
SELECT @TotalArchivos = COUNT(*) FROM AnexoCta WHERE Rama = 'CXP' AND Cuenta = 'P00443';
SELECT @Autorizados = COUNT(*) FROM AnexoCta WHERE Rama = 'CXP' AND Cuenta = 'P00443' AND Autorizado = 1;
SELECT @Rechazados = COUNT(*) FROM AnexoCta WHERE Rama = 'CXP' AND Cuenta = 'P00443' AND Rechazado = 1;
SELECT @Pendientes = COUNT(*) FROM AnexoCta WHERE Rama = 'CXP' AND Cuenta = 'P00443' AND (Autorizado = 0 OR Autorizado IS NULL) AND (Rechazado = 0 OR Rechazado IS NULL);

PRINT 'Total documentos requeridos: ' + CAST(@TotalRequeridos AS VARCHAR(10));
PRINT 'Total archivos subidos: ' + CAST(@TotalArchivos AS VARCHAR(10));
PRINT 'Documentos autorizados: ' + CAST(@Autorizados AS VARCHAR(10));
PRINT 'Documentos rechazados: ' + CAST(@Rechazados AS VARCHAR(10));
PRINT 'Documentos pendientes: ' + CAST(@Pendientes AS VARCHAR(10));

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ Script completado';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
