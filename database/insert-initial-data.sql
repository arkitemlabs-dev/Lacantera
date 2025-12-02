-- ============================================================================
-- SCRIPT DE DATOS INICIALES - PORTAL PROVEEDORES LA CANTERA
-- ============================================================================
-- Base de Datos: PP (SQL Server)
-- Fecha: Diciembre 2024
-- Versión: 1.0
--
-- IMPORTANTE: Este script inserta los datos iniciales en los catálogos
-- del sistema. Es seguro ejecutarlo múltiples veces.
-- ============================================================================

USE PP;
GO

PRINT '============================================================================';
PRINT 'INICIO - Inserción de Datos Iniciales';
PRINT '============================================================================';
GO

-- ============================================================================
-- SECCIÓN 1: CATEGORÍAS DE PROVEEDORES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 1: Categorías de Proveedores';
PRINT '';

-- Limpiar datos existentes (opcional - comentar si no quieres borrar)
-- DELETE FROM ProvCategoria;

-- Insertar categorías
IF NOT EXISTS (SELECT 1 FROM ProvCategoria WHERE Codigo = 'suministros')
BEGIN
    INSERT INTO ProvCategoria (Codigo, Nombre, Descripcion, DocumentosRequeridosJSON, Activo)
    VALUES (
        'suministros',
        'Suministros y Materiales',
        'Proveedores de materiales, suministros y productos',
        '["acta_constitutiva","constancia_fiscal","opinion_sat","identificacion_rep","comprobante_domicilio","caratula_bancaria","foto_domicilio","referencias_comerciales","carta_etica"]',
        1
    );
    PRINT '✓ Categoría: Suministros';
END

IF NOT EXISTS (SELECT 1 FROM ProvCategoria WHERE Codigo = 'servicios')
BEGIN
    INSERT INTO ProvCategoria (Codigo, Nombre, Descripcion, DocumentosRequeridosJSON, Activo)
    VALUES (
        'servicios',
        'Servicios Profesionales',
        'Proveedores de servicios profesionales y especializados',
        '["acta_constitutiva","constancia_fiscal","opinion_sat","identificacion_rep","comprobante_domicilio","caratula_bancaria","foto_domicilio","referencias_comerciales","carta_etica","registro_repse"]',
        1
    );
    PRINT '✓ Categoría: Servicios';
END

IF NOT EXISTS (SELECT 1 FROM ProvCategoria WHERE Codigo = 'arrendamiento')
BEGIN
    INSERT INTO ProvCategoria (Codigo, Nombre, Descripcion, DocumentosRequeridosJSON, Activo)
    VALUES (
        'arrendamiento',
        'Arrendamiento',
        'Proveedores de bienes en arrendamiento',
        '["acta_constitutiva","constancia_fiscal","opinion_sat","identificacion_rep","comprobante_domicilio","caratula_bancaria","foto_domicilio","referencias_comerciales","carta_etica","titulo_propiedad","pago_predial"]',
        1
    );
    PRINT '✓ Categoría: Arrendamiento';
END

IF NOT EXISTS (SELECT 1 FROM ProvCategoria WHERE Codigo = 'transporte')
BEGIN
    INSERT INTO ProvCategoria (Codigo, Nombre, Descripcion, DocumentosRequeridosJSON, Activo)
    VALUES (
        'transporte',
        'Transporte y Logística',
        'Proveedores de servicios de transporte y logística',
        '["acta_constitutiva","constancia_fiscal","opinion_sat","identificacion_rep","comprobante_domicilio","caratula_bancaria","foto_domicilio","referencias_comerciales","carta_etica","poliza_responsabilidad"]',
        1
    );
    PRINT '✓ Categoría: Transporte';
END

-- ============================================================================
-- SECCIÓN 2: TIPOS DE DOCUMENTOS
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 2: Tipos de Documentos Requeridos';
PRINT '';

-- Documentos generales (requeridos por todos)
IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'acta_constitutiva')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'acta_constitutiva',
        'Acta Constitutiva',
        'Acta constitutiva de la empresa y sus modificaciones',
        '["suministros","servicios","arrendamiento","transporte"]',
        NULL, -- No caduca
        1,
        1
    );
    PRINT '✓ Documento: Acta Constitutiva';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'constancia_fiscal')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'constancia_fiscal',
        'Constancia de Situación Fiscal',
        'Constancia de Situación Fiscal vigente emitida por el SAT',
        '["suministros","servicios","arrendamiento","transporte"]',
        180, -- 6 meses
        2,
        1
    );
    PRINT '✓ Documento: Constancia Fiscal';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'opinion_sat')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'opinion_sat',
        'Opinión de Cumplimiento SAT',
        'Opinión de cumplimiento positiva del SAT (32-D)',
        '["suministros","servicios","arrendamiento","transporte"]',
        30, -- 1 mes
        3,
        1
    );
    PRINT '✓ Documento: Opinión SAT';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'identificacion_rep')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'identificacion_rep',
        'Identificación Representante Legal',
        'Identificación oficial vigente del representante legal (INE/Pasaporte)',
        '["suministros","servicios","arrendamiento","transporte"]',
        NULL, -- No caduca
        4,
        1
    );
    PRINT '✓ Documento: Identificación Representante';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'comprobante_domicilio')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'comprobante_domicilio',
        'Comprobante de Domicilio Fiscal',
        'Comprobante de domicilio fiscal no mayor a 3 meses',
        '["suministros","servicios","arrendamiento","transporte"]',
        90, -- 3 meses
        5,
        1
    );
    PRINT '✓ Documento: Comprobante Domicilio';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'caratula_bancaria')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'caratula_bancaria',
        'Carátula Bancaria',
        'Carátula del estado de cuenta bancaria con CLABE interbancaria',
        '["suministros","servicios","arrendamiento","transporte"]',
        90, -- 3 meses
        6,
        1
    );
    PRINT '✓ Documento: Carátula Bancaria';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'foto_domicilio')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'foto_domicilio',
        'Fotografía del Domicilio Fiscal',
        'Fotografía a color del exterior del domicilio fiscal',
        '["suministros","servicios","arrendamiento","transporte"]',
        365, -- 1 año
        7,
        1
    );
    PRINT '✓ Documento: Foto Domicilio';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'referencias_comerciales')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'referencias_comerciales',
        'Referencias Comerciales',
        'Mínimo 2 referencias comerciales del proveedor',
        '["suministros","servicios","arrendamiento","transporte"]',
        365, -- 1 año
        8,
        1
    );
    PRINT '✓ Documento: Referencias Comerciales';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'carta_etica')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'carta_etica',
        'Carta de Código de Ética',
        'Carta firmada de aceptación al código de ética empresarial',
        '["suministros","servicios","arrendamiento","transporte"]',
        365, -- 1 año
        9,
        1
    );
    PRINT '✓ Documento: Carta Ética';
END

-- Documentos específicos para SERVICIOS
IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'registro_repse')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'registro_repse',
        'Registro REPSE',
        'Registro en el Padrón de Empresas de Servicios Especializados u Obras Especializadas',
        '["servicios"]',
        365, -- 1 año
        10,
        1
    );
    PRINT '✓ Documento: Registro REPSE (Servicios)';
END

-- Documentos específicos para ARRENDAMIENTO
IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'titulo_propiedad')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'titulo_propiedad',
        'Título de Propiedad',
        'Título de propiedad del inmueble o documento que acredite propiedad',
        '["arrendamiento"]',
        NULL, -- No caduca
        11,
        1
    );
    PRINT '✓ Documento: Título Propiedad (Arrendamiento)';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'pago_predial')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'pago_predial',
        'Comprobante de Pago Predial',
        'Comprobante de pago de predial del año en curso',
        '["arrendamiento"]',
        365, -- 1 año
        12,
        1
    );
    PRINT '✓ Documento: Pago Predial (Arrendamiento)';
END

-- Documentos específicos para TRANSPORTE
IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'poliza_responsabilidad')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'poliza_responsabilidad',
        'Póliza de Responsabilidad Civil',
        'Póliza de seguro de responsabilidad civil vigente',
        '["transporte"]',
        365, -- 1 año
        13,
        1
    );
    PRINT '✓ Documento: Póliza Responsabilidad (Transporte)';
END

IF NOT EXISTS (SELECT 1 FROM ProvTiposDocumento WHERE Codigo = 'licencias_transporte')
BEGIN
    INSERT INTO ProvTiposDocumento (Codigo, Nombre, Descripcion, RequeridoPara, VigenciaDias, OrdenPresentacion, Activo)
    VALUES (
        'licencias_transporte',
        'Licencias y Permisos de Transporte',
        'Licencias y permisos vigentes para operar unidades de transporte',
        '["transporte"]',
        365, -- 1 año
        14,
        1
    );
    PRINT '✓ Documento: Licencias Transporte (Transporte)';
END

-- ============================================================================
-- SECCIÓN 3: TIPOS DE NOTIFICACIONES
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 3: Tipos de Notificaciones';
PRINT '';

-- Notificaciones de Órdenes de Compra
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'nueva_oc')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'nueva_oc',
        'Nueva Orden de Compra',
        'Se ha generado una nueva orden de compra',
        'Nueva Orden de Compra #{orden_folio}',
        'Tienes una nueva orden de compra por ${monto} pendiente de aceptación',
        '#3b82f6', -- blue
        1
    );
    PRINT '✓ Notificación: Nueva Orden de Compra';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'oc_cancelada')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'oc_cancelada',
        'Orden de Compra Cancelada',
        'Una orden de compra ha sido cancelada',
        'Orden de Compra #{orden_folio} Cancelada',
        'La orden de compra {orden_folio} ha sido cancelada. Motivo: {motivo}',
        '#ef4444', -- red
        1
    );
    PRINT '✓ Notificación: OC Cancelada';
END

-- Notificaciones de Facturas
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'factura_aprobada')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'factura_aprobada',
        'Factura Aprobada',
        'Una factura ha sido aprobada',
        'Factura {factura_folio} Aprobada',
        'Tu factura {factura_folio} ha sido aprobada y está en proceso de pago',
        '#22c55e', -- green
        1
    );
    PRINT '✓ Notificación: Factura Aprobada';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'factura_rechazada')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'factura_rechazada',
        'Factura Rechazada',
        'Una factura ha sido rechazada',
        'Factura {factura_folio} Rechazada',
        'Tu factura {factura_folio} ha sido rechazada. Motivo: {motivo}',
        '#ef4444', -- red
        1
    );
    PRINT '✓ Notificación: Factura Rechazada';
END

-- Notificaciones de Pagos
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'pago_recibido')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'pago_recibido',
        'Pago Procesado',
        'Se ha procesado un pago',
        'Pago Procesado - ${monto}',
        'Se ha procesado un pago de ${monto} para las facturas: {facturas}',
        '#22c55e', -- green
        1
    );
    PRINT '✓ Notificación: Pago Recibido';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'complemento_pago_requerido')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'complemento_pago_requerido',
        'Complemento de Pago Requerido',
        'Se requiere subir un complemento de pago',
        'Complemento de Pago Requerido',
        'Debes subir el complemento de pago para las facturas: {facturas}',
        '#f59e0b', -- amber
        1
    );
    PRINT '✓ Notificación: Complemento Pago Requerido';
END

-- Notificaciones de Documentos
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'documento_validado')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'documento_validado',
        'Documento Aprobado',
        'Un documento ha sido validado',
        'Documento {documento} Aprobado',
        'Tu documento {documento} ha sido aprobado',
        '#22c55e', -- green
        1
    );
    PRINT '✓ Notificación: Documento Validado';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'documento_rechazado')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'documento_rechazado',
        'Documento Rechazado',
        'Un documento ha sido rechazado',
        'Documento {documento} Rechazado',
        'Tu documento {documento} ha sido rechazado. Motivo: {motivo}',
        '#ef4444', -- red
        1
    );
    PRINT '✓ Notificación: Documento Rechazado';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'documento_por_vencer')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'documento_por_vencer',
        'Documento por Vencer',
        'Un documento está próximo a vencer',
        'Documento {documento} por Vencer',
        'Tu documento {documento} vence en {dias} días. Por favor actualízalo',
        '#f59e0b', -- amber
        1
    );
    PRINT '✓ Notificación: Documento por Vencer';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'documento_vencido')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'documento_vencido',
        'Documento Vencido',
        'Un documento ha vencido',
        'Documento {documento} Vencido',
        'Tu documento {documento} ha vencido. Actualízalo para seguir operando',
        '#ef4444', -- red
        1
    );
    PRINT '✓ Notificación: Documento Vencido';
END

-- Notificaciones de Mensajería
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'nuevo_mensaje')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'nuevo_mensaje',
        'Nuevo Mensaje',
        'Has recibido un nuevo mensaje',
        'Nuevo Mensaje de {remitente}',
        'Tienes un nuevo mensaje de {remitente}: {preview}',
        '#8b5cf6', -- purple
        1
    );
    PRINT '✓ Notificación: Nuevo Mensaje';
END

-- Notificaciones del Sistema
IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'sistema')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'sistema',
        'Notificación del Sistema',
        'Notificación administrativa del sistema',
        'Notificación del Sistema',
        '{mensaje}',
        '#6b7280', -- gray
        1
    );
    PRINT '✓ Notificación: Sistema';
END

IF NOT EXISTS (SELECT 1 FROM pNetTiposNotificacion WHERE Codigo = 'bienvenida')
BEGIN
    INSERT INTO pNetTiposNotificacion (Codigo, Nombre, Descripcion, TemplateTitulo, TemplateMensaje, ColorBadge, Activo)
    VALUES (
        'bienvenida',
        'Bienvenida al Portal',
        'Mensaje de bienvenida para nuevos usuarios',
        '¡Bienvenido al Portal de Proveedores!',
        'Te damos la bienvenida al Portal de Proveedores de La Cantera. Por favor completa tu documentación para comenzar',
        '#3b82f6', -- blue
        1
    );
    PRINT '✓ Notificación: Bienvenida';
END

-- ============================================================================
-- SECCIÓN 4: CONFIGURACIONES GLOBALES (OPCIONAL)
-- ============================================================================

PRINT '';
PRINT '-- SECCIÓN 4: Configuraciones Globales';
PRINT '';

-- Configuraciones para empresa DEMO (si existe)
DECLARE @EmpresaDemo VARCHAR(10) = 'DEMO';

IF EXISTS (SELECT 1 FROM Empresa WHERE Empresa = @EmpresaDemo)
BEGIN
    -- Configuración de alertas de documentos
    IF NOT EXISTS (SELECT 1 FROM pNetConfiguracion WHERE Empresa = @EmpresaDemo AND Clave = 'alertas_documento_dias_30')
    BEGIN
        INSERT INTO pNetConfiguracion (Empresa, Clave, Valor, Descripcion, TipoDato, Categoria, Modificable)
        VALUES (
            @EmpresaDemo,
            'alertas_documento_dias_30',
            'true',
            'Enviar alerta 30 días antes del vencimiento de documentos',
            'boolean',
            'documentos',
            1
        );
    END

    IF NOT EXISTS (SELECT 1 FROM pNetConfiguracion WHERE Empresa = @EmpresaDemo AND Clave = 'alertas_documento_dias_15')
    BEGIN
        INSERT INTO pNetConfiguracion (Empresa, Clave, Valor, Descripcion, TipoDato, Categoria, Modificable)
        VALUES (
            @EmpresaDemo,
            'alertas_documento_dias_15',
            'true',
            'Enviar alerta 15 días antes del vencimiento de documentos',
            'boolean',
            'documentos',
            1
        );
    END

    IF NOT EXISTS (SELECT 1 FROM pNetConfiguracion WHERE Empresa = @EmpresaDemo AND Clave = 'alertas_documento_dias_5')
    BEGIN
        INSERT INTO pNetConfiguracion (Empresa, Clave, Valor, Descripcion, TipoDato, Categoria, Modificable)
        VALUES (
            @EmpresaDemo,
            'alertas_documento_dias_5',
            'true',
            'Enviar alerta 5 días antes del vencimiento de documentos',
            'boolean',
            'documentos',
            1
        );
    END

    -- Configuración de validación SAT
    IF NOT EXISTS (SELECT 1 FROM pNetConfiguracion WHERE Empresa = @EmpresaDemo AND Clave = 'validacion_sat_automatica')
    BEGIN
        INSERT INTO pNetConfiguracion (Empresa, Clave, Valor, Descripcion, TipoDato, Categoria, Modificable)
        VALUES (
            @EmpresaDemo,
            'validacion_sat_automatica',
            'true',
            'Validar automáticamente facturas con el SAT al subirlas',
            'boolean',
            'facturas',
            1
        );
    END

    -- Configuración de notificaciones por email
    IF NOT EXISTS (SELECT 1 FROM pNetConfiguracion WHERE Empresa = @EmpresaDemo AND Clave = 'notificaciones_email')
    BEGIN
        INSERT INTO pNetConfiguracion (Empresa, Clave, Valor, Descripcion, TipoDato, Categoria, Modificable)
        VALUES (
            @EmpresaDemo,
            'notificaciones_email',
            'true',
            'Enviar notificaciones por correo electrónico',
            'boolean',
            'general',
            1
        );
    END

    PRINT '✓ Configuraciones para empresa DEMO';
END
ELSE
BEGIN
    PRINT '⚠ Empresa DEMO no existe, saltando configuraciones';
END

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

PRINT '';
PRINT '============================================================================';
PRINT 'FIN - Datos Iniciales Insertados Correctamente';
PRINT '============================================================================';
PRINT '';
PRINT 'RESUMEN:';
PRINT '  • Categorías de Proveedores: 4';
PRINT '    - Suministros, Servicios, Arrendamiento, Transporte';
PRINT '';
PRINT '  • Tipos de Documentos: 15';
PRINT '    - 9 documentos generales';
PRINT '    - 1 específico para Servicios (REPSE)';
PRINT '    - 2 específicos para Arrendamiento';
PRINT '    - 2 específicos para Transporte';
PRINT '';
PRINT '  • Tipos de Notificaciones: 13';
PRINT '    - Órdenes de Compra: 2';
PRINT '    - Facturas: 2';
PRINT '    - Pagos: 2';
PRINT '    - Documentos: 4';
PRINT '    - Mensajería: 1';
PRINT '    - Sistema: 2';
PRINT '';
PRINT 'El sistema está listo para comenzar a operar.';
PRINT 'Siguiente paso: Configurar la aplicación Next.js para usar estas tablas';
PRINT '============================================================================';
GO
