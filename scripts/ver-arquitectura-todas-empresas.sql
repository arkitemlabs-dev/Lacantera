-- Script para ver información del proveedor ARQUITECTURA en todas las empresas
-- Ejecutar en: Servidor ERP (104.46.127.151)
-- Este script consulta las 5 bases de datos para ver la información del proveedor con RFC ACE140813E29

PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '🔍 INFORMACIÓN DE ARQUITECTURA Y CONSULTORIA EN TODAS LAS EMPRESAS';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '';

-- ============================================================================
-- 1. LA CANTERA
-- ============================================================================
PRINT '📍 1. LA CANTERA (Cantera_ajustes)';
PRINT '─────────────────────────────────────────────────────────────────────────────';

USE Cantera_ajustes;

SELECT
    'LA CANTERA' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS RazonSocial,
    RFC,
    Direccion AS DireccionFiscal,
    Colonia,
    Poblacion,
    Estado,
    CodigoPostal,
    Contacto1 AS NombreContacto,
    eMail1 AS Email,
    Telefonos,
    ProvCuenta AS CuentaBancaria,
    ProvBancoSucursal AS BancoSucursal,
    Condicion AS CondicionPago,
    Estatus,
    Alta AS FechaAlta,
    UltimoCambio AS FechaUltimoCambio
FROM Prov
WHERE RFC = 'ACE140813E29'
   OR Proveedor IN ('P00443', 'PV-56');

PRINT '';
PRINT '';

-- ============================================================================
-- 2. PERALILLO
-- ============================================================================
PRINT '📍 2. PERALILLO (Peralillo_Ajustes)';
PRINT '─────────────────────────────────────────────────────────────────────────────';

USE Peralillo_Ajustes;

SELECT
    'PERALILLO' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS RazonSocial,
    RFC,
    Direccion AS DireccionFiscal,
    Colonia,
    Poblacion,
    Estado,
    CodigoPostal,
    Contacto1 AS NombreContacto,
    eMail1 AS Email,
    Telefonos,
    ProvCuenta AS CuentaBancaria,
    ProvBancoSucursal AS BancoSucursal,
    Condicion AS CondicionPago,
    Estatus,
    Alta AS FechaAlta,
    UltimoCambio AS FechaUltimoCambio
FROM Prov
WHERE RFC = 'ACE140813E29'
   OR Proveedor IN ('P00443', 'PV-56');

PRINT '';
PRINT '';

-- ============================================================================
-- 3 y 4. GALEREÑA (PLAZA E INMOBILIARIA en GALBD_PRUEBAS)
-- ============================================================================
PRINT '📍 3 y 4. GALEREÑA - PLAZA E INMOBILIARIA (GALBD_PRUEBAS)';
PRINT '─────────────────────────────────────────────────────────────────────────────';
PRINT 'NOTA: Ambas empresas comparten la misma base de datos';
PRINT '';

USE GALBD_PRUEBAS;

SELECT
    'GALBD_PRUEBAS' AS BaseDatos,
    Proveedor AS Codigo,
    Nombre AS RazonSocial,
    RFC,
    Direccion AS DireccionFiscal,
    Colonia,
    Poblacion,
    Estado,
    CodigoPostal,
    Contacto1 AS NombreContacto,
    eMail1 AS Email,
    Telefonos,
    ProvCuenta AS CuentaBancaria,
    ProvBancoSucursal AS BancoSucursal,
    Condicion AS CondicionPago,
    Estatus,
    Alta AS FechaAlta,
    UltimoCambio AS FechaUltimoCambio
FROM Prov
WHERE RFC = 'ACE140813E29'
   OR Proveedor IN ('P00443', 'PV-56');

PRINT '';
PRINT '';

-- ============================================================================
-- 5. ICREAR
-- ============================================================================
PRINT '📍 5. ICREAR (ICREAR_PRUEBAS)';
PRINT '─────────────────────────────────────────────────────────────────────────────';

USE ICREAR_PRUEBAS;

SELECT
    'ICREAR' AS Empresa,
    Proveedor AS Codigo,
    Nombre AS RazonSocial,
    RFC,
    Direccion AS DireccionFiscal,
    Colonia,
    Poblacion,
    Estado,
    CodigoPostal,
    Contacto1 AS NombreContacto,
    eMail1 AS Email,
    Telefonos,
    ProvCuenta AS CuentaBancaria,
    ProvBancoSucursal AS BancoSucursal,
    Condicion AS CondicionPago,
    Estatus,
    Alta AS FechaAlta,
    UltimoCambio AS FechaUltimoCambio
FROM Prov
WHERE RFC = 'ACE140813E29'
   OR Proveedor IN ('P00443', 'PV-56');

PRINT '';
PRINT '';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
PRINT '✅ Consulta completada en las 5 empresas';
PRINT '═══════════════════════════════════════════════════════════════════════════════';
