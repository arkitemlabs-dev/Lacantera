-- Script para buscar proveedores por RFC en todas las empresas
-- Este script te ayuda a encontrar el RFC exacto de ARQUITECTURA Y CONSULTORIA EMPRESARIAL

-- ============================================
-- EMPRESA 1: LA CANTERA
-- ============================================
PRINT '🔍 Buscando en LA CANTERA (Cantera_ajustes)...';
PRINT '';

USE Cantera_ajustes;
GO

SELECT
    'LA CANTERA' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS NombreProveedor,
    RFC,
    Estatus,
    eMail1 AS Email,
    Telefonos
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%'
   OR Nombre LIKE '%CONSULTORIA%'
   OR Proveedor IN ('P00443', 'PV-56')
ORDER BY Nombre;

PRINT '';
PRINT '================================================';
PRINT '';

-- ============================================
-- EMPRESA 2: PERALILLO
-- ============================================
PRINT '🔍 Buscando en PERALILLO (Peralillo_Ajustes)...';
PRINT '';

USE Peralillo_Ajustes;
GO

SELECT
    'PERALILLO' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS NombreProveedor,
    RFC,
    Estatus,
    eMail1 AS Email,
    Telefonos
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%'
   OR Nombre LIKE '%CONSULTORIA%'
   OR Proveedor IN ('P00443', 'PV-56')
ORDER BY Nombre;

PRINT '';
PRINT '================================================';
PRINT '';

-- ============================================
-- EMPRESA 3: PLAZA GALEREÑA
-- ============================================
PRINT '🔍 Buscando en PLAZA GALEREÑA (GALBD_PRUEBAS)...';
PRINT '';

USE GALBD_PRUEBAS;
GO

SELECT
    'PLAZA GALERENA' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS NombreProveedor,
    RFC,
    Estatus,
    eMail1 AS Email,
    Telefonos
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%'
   OR Nombre LIKE '%CONSULTORIA%'
   OR Proveedor IN ('P00443', 'PV-56')
ORDER BY Nombre;

PRINT '';
PRINT '================================================';
PRINT '';
PRINT '✅ Búsqueda completada en todas las empresas';

-- ============================================
-- BÚSQUEDA POR CÓDIGOS ESPECÍFICOS
-- ============================================
PRINT '';
PRINT '🔍 Búsqueda específica por códigos conocidos...';
PRINT '';

-- La Cantera
USE Cantera_ajustes;
PRINT '📌 LA CANTERA - Código P00443:';
SELECT Proveedor, Nombre, RFC FROM Prov WHERE Proveedor = 'P00443';
PRINT '';

-- Peralillo
USE Peralillo_Ajustes;
PRINT '📌 PERALILLO - Código P00443:';
SELECT Proveedor, Nombre, RFC FROM Prov WHERE Proveedor = 'P00443';
PRINT '';

-- Plaza Galereña
USE GALBD_PRUEBAS;
PRINT '📌 PLAZA GALEREÑA - Código PV-56:';
SELECT Proveedor, Nombre, RFC FROM Prov WHERE Proveedor = 'PV-56';
PRINT '';

PRINT '✅ Script completado';
