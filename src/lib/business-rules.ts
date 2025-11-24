// src/lib/business-rules.ts
// Reglas de negocio críticas para el portal de proveedores

import { database } from '@/lib/database';
import type { 
  ProveedorUser, 
  Factura, 
  DocumentoProveedor, 
  OrdenCompra,
  ComprobantePago,
  TipoDocumentoProveedor 
} from '@/types/backend';

// ==================== REGLAS DE DOCUMENTACIÓN ====================

export class DocumentacionRules {
  
  /**
   * Verifica si un proveedor tiene su expediente completo y válido
   */
  static async validarExpedienteCompleto(proveedorId: string): Promise<{
    isComplete: boolean;
    documentosFaltantes: TipoDocumentoProveedor[];
    documentosVencidos: DocumentoProveedor[];
    puedeFacturar: boolean;
  }> {
    try {
      const proveedor = await database.getProveedor(proveedorId);
      if (!proveedor) {
        throw new Error('Proveedor no encontrado');
      }

      const documentos = await database.getDocumentosByProveedor(proveedorId);
      const documentosRequeridos = this.getDocumentosRequeridos(proveedor);
      
      // Verificar documentos faltantes
      const documentosTipos = documentos.map(d => d.tipoDocumento);
      const documentosFaltantes = documentosRequeridos.filter(
        tipo => !documentosTipos.includes(tipo)
      );

      // Verificar documentos vencidos
      const now = new Date();
      const documentosVencidos = documentos.filter(doc => {
        if (!doc.fechaVencimiento) return false;
        const vencimiento = new Date(doc.fechaVencimiento);
        return vencimiento < now && doc.status === 'aprobado';
      });

      // Verificar documentos aprobados
      const documentosAprobados = documentos.filter(d => d.status === 'aprobado');
      const todosAprobados = documentosAprobados.length >= documentosRequeridos.length;

      const isComplete = documentosFaltantes.length === 0 && 
                        documentosVencidos.length === 0 && 
                        todosAprobados;

      // Un proveedor puede facturar solo si su expediente está completo
      const puedeFacturar = isComplete;

      return {
        isComplete,
        documentosFaltantes,
        documentosVencidos,
        puedeFacturar
      };
    } catch (error) {
      console.error('Error validando expediente:', error);
      return {
        isComplete: false,
        documentosFaltantes: [],
        documentosVencidos: [],
        puedeFacturar: false
      };
    }
  }

  /**
   * Obtiene los documentos requeridos según el tipo de proveedor
   */
  private static getDocumentosRequeridos(proveedor: ProveedorUser): TipoDocumentoProveedor[] {
    const documentosBasicos: TipoDocumentoProveedor[] = [
      'acta_constitutiva',
      'comprobante_domicilio',
      'identificacion_representante',
      'constancia_fiscal',
      'caratula_bancaria'
    ];

    // Aquí se pueden agregar documentos específicos por tipo de proveedor
    // Por ejemplo, REPSE para servicios, seguros para transporte, etc.
    
    return documentosBasicos;
  }

  /**
   * Verifica documentos próximos a vencer y crea alertas
   */
  static async verificarVencimientos(empresaId?: string): Promise<{
    alertas30Dias: DocumentoProveedor[];
    alertas15Dias: DocumentoProveedor[];
    alertas5Dias: DocumentoProveedor[];
    vencidosHoy: DocumentoProveedor[];
  }> {
    const now = new Date();
    const documentos = await database.getDocumentosConVencimiento(empresaId);
    
    const alertas30Dias: DocumentoProveedor[] = [];
    const alertas15Dias: DocumentoProveedor[] = [];
    const alertas5Dias: DocumentoProveedor[] = [];
    const vencidosHoy: DocumentoProveedor[] = [];

    documentos.forEach(doc => {
      if (!doc.fechaVencimiento) return;
      
      const vencimiento = new Date(doc.fechaVencimiento);
      const diffDays = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        vencidosHoy.push(doc);
      } else if (diffDays <= 5 && diffDays > 0) {
        alertas5Dias.push(doc);
      } else if (diffDays <= 15 && diffDays > 5) {
        alertas15Dias.push(doc);
      } else if (diffDays <= 30 && diffDays > 15) {
        alertas30Dias.push(doc);
      }
    });

    return { alertas30Dias, alertas15Dias, alertas5Dias, vencidosHoy };
  }
}

// ==================== REGLAS DE FACTURACIÓN ====================

export class FacturacionRules {
  
  /**
   * Valida si un proveedor puede subir una nueva factura
   */
  static async puedeSubirFactura(proveedorId: string): Promise<{
    puedeSubir: boolean;
    motivos: string[];
  }> {
    const motivos: string[] = [];

    try {
      // 1. Verificar expediente completo
      const expediente = await DocumentacionRules.validarExpedienteCompleto(proveedorId);
      if (!expediente.puedeFacturar) {
        if (expediente.documentosFaltantes.length > 0) {
          motivos.push(`Faltan documentos: ${expediente.documentosFaltantes.join(', ')}`);
        }
        if (expediente.documentosVencidos.length > 0) {
          motivos.push(`Documentos vencidos: ${expediente.documentosVencidos.map(d => d.tipoDocumento).join(', ')}`);
        }
      }

      // 2. Verificar complementos de pago pendientes
      const complementosPendientes = await database.getComplementosPendientesByProveedor(proveedorId);
      if (complementosPendientes.length > 0) {
        motivos.push('Tiene complementos de pago pendientes de subir');
      }

      // 3. Verificar estado del proveedor
      const proveedor = await database.getProveedor(proveedorId);
      if (proveedor?.status !== 'activo') {
        motivos.push('El proveedor no está activo');
      }

      return {
        puedeSubir: motivos.length === 0,
        motivos
      };
    } catch (error) {
      console.error('Error validando si puede subir factura:', error);
      return {
        puedeSubir: false,
        motivos: ['Error interno del sistema']
      };
    }
  }

  /**
   * Valida una factura contra su orden de compra
   */
  static async validarFacturaContraOC(factura: Partial<Factura>, ordenCompraId: string): Promise<{
    esValida: boolean;
    errores: string[];
    advertencias: string[];
  }> {
    const errores: string[] = [];
    const advertencias: string[] = [];

    try {
      const ordenCompra = await database.getOrdenCompra(ordenCompraId);
      if (!ordenCompra) {
        errores.push('Orden de compra no encontrada');
        return { esValida: false, errores, advertencias };
      }

      // 1. Validar RFC
      if (factura.rfcEmisor !== ordenCompra.proveedorRFC) {
        errores.push('El RFC de la factura no coincide con la orden de compra');
      }

      // 2. Validar monto (tolerancia del 1%)
      if (factura.montoTotal && ordenCompra.montoTotal) {
        const diferencia = Math.abs(factura.montoTotal - ordenCompra.montoTotal);
        const tolerancia = ordenCompra.montoTotal * 0.01; // 1% de tolerancia
        
        if (diferencia > tolerancia) {
          errores.push(
            `El monto de la factura ($${factura.montoTotal}) difiere significativamente del monto de la OC ($${ordenCompra.montoTotal})`
          );
        } else if (diferencia > 0) {
          advertencias.push(
            `Diferencia menor en monto: Factura $${factura.montoTotal}, OC $${ordenCompra.montoTotal}`
          );
        }
      }

      // 3. Validar fecha de emisión
      if (factura.fechaEmision && ordenCompra.fecha) {
        const fechaFactura = new Date(factura.fechaEmision);
        const fechaOC = new Date(ordenCompra.fecha);
        
        if (fechaFactura < fechaOC) {
          errores.push('La fecha de emisión de la factura no puede ser anterior a la fecha de la orden de compra');
        }
      }

      // 4. Validar que la OC esté en estado correcto
      if (ordenCompra.status !== 'aceptada' && ordenCompra.status !== 'en_proceso') {
        errores.push('La orden de compra no está en estado válido para facturación');
      }

      return {
        esValida: errores.length === 0,
        errores,
        advertencias
      };
    } catch (error) {
      console.error('Error validando factura contra OC:', error);
      return {
        esValida: false,
        errores: ['Error interno en validación'],
        advertencias
      };
    }
  }

  /**
   * Valida CFDI XML (validaciones básicas)
   */
  static async validarCFDI(xmlContent: string): Promise<{
    esValido: boolean;
    errores: string[];
    datos: {
      folio?: string;
      rfc?: string;
      total?: number;
      fecha?: string;
    };
  }> {
    const errores: string[] = [];
    const datos: any = {};

    try {
      // Validaciones básicas del XML
      if (!xmlContent.includes('<?xml')) {
        errores.push('El archivo no es un XML válido');
        return { esValido: false, errores, datos };
      }

      if (!xmlContent.includes('cfdi:Comprobante')) {
        errores.push('El archivo XML no es un CFDI válido');
        return { esValido: false, errores, datos };
      }

      // Extraer datos básicos con regex (en producción usar parser XML)
      const rfcMatch = xmlContent.match(/Rfc="([^"]+)"/);
      const totalMatch = xmlContent.match(/Total="([^"]+)"/);
      const fechaMatch = xmlContent.match(/Fecha="([^"]+)"/);
      const folioMatch = xmlContent.match(/Folio="([^"]+)"/);

      if (rfcMatch) datos.rfc = rfcMatch[1];
      if (totalMatch) datos.total = parseFloat(totalMatch[1]);
      if (fechaMatch) datos.fecha = fechaMatch[1];
      if (folioMatch) datos.folio = folioMatch[1];

      // Validaciones específicas
      if (!datos.rfc) {
        errores.push('No se encontró RFC en el CFDI');
      }

      if (!datos.total || datos.total <= 0) {
        errores.push('Total del CFDI inválido');
      }

      if (!datos.fecha) {
        errores.push('Fecha de emisión no encontrada en CFDI');
      }

      return {
        esValido: errores.length === 0,
        errores,
        datos
      };
    } catch (error) {
      console.error('Error validando CFDI:', error);
      return {
        esValido: false,
        errores: ['Error procesando el archivo XML'],
        datos
      };
    }
  }
}

// ==================== REGLAS DE PAGOS ====================

export class PagosRules {
  
  /**
   * Valida si se puede crear un pago para un proveedor
   */
  static async puedeCrearPago(proveedorId: string, facturaIds: string[]): Promise<{
    puedeCrear: boolean;
    motivos: string[];
  }> {
    const motivos: string[] = [];

    try {
      // 1. Verificar complementos pendientes
      const complementosPendientes = await database.getComplementosPendientesByProveedor(proveedorId);
      if (complementosPendientes.length > 0) {
        motivos.push('El proveedor tiene complementos de pago pendientes de subir');
      }

      // 2. Verificar que todas las facturas estén aprobadas
      const facturas = await Promise.all(
        facturaIds.map(id => database.getFactura(id))
      );
      
      const facturasNoAprobadas = facturas.filter(f => f?.status !== 'aprobada');
      if (facturasNoAprobadas.length > 0) {
        motivos.push('Algunas facturas no están aprobadas');
      }

      // 3. Verificar que las facturas pertenezcan al proveedor
      const facturasDeOtroProveedor = facturas.filter(f => f?.proveedorId !== proveedorId);
      if (facturasDeOtroProveedor.length > 0) {
        motivos.push('Algunas facturas no pertenecen al proveedor especificado');
      }

      // 4. Verificar estado del proveedor
      const proveedor = await database.getProveedor(proveedorId);
      if (proveedor?.status !== 'activo') {
        motivos.push('El proveedor no está activo');
      }

      return {
        puedeCrear: motivos.length === 0,
        motivos
      };
    } catch (error) {
      console.error('Error validando si puede crear pago:', error);
      return {
        puedeCrear: false,
        motivos: ['Error interno del sistema']
      };
    }
  }

  /**
   * Calcula el monto total de facturas para verificar contra el pago
   */
  static calcularMontoFacturas(facturas: Factura[]): number {
    return facturas.reduce((total, factura) => total + (factura.montoTotal || 0), 0);
  }

  /**
   * Verifica si un complemento de pago es válido
   */
  static async validarComplementoPago(xmlContent: string, pagoId: string): Promise<{
    esValido: boolean;
    errores: string[];
    datos: {
      folioFiscal?: string;
      fechaPago?: string;
      montoPagado?: number;
    };
  }> {
    const errores: string[] = [];
    const datos: any = {};

    try {
      // Validar que es un complemento de pago
      if (!xmlContent.includes('pago20:Pagos')) {
        errores.push('El XML no es un complemento de pago válido');
      }

      // Extraer datos del complemento
      const folioMatch = xmlContent.match(/UUID="([^"]+)"/);
      const fechaMatch = xmlContent.match(/FechaPago="([^"]+)"/);
      const montoMatch = xmlContent.match(/Monto="([^"]+)"/);

      if (folioMatch) datos.folioFiscal = folioMatch[1];
      if (fechaMatch) datos.fechaPago = fechaMatch[1];
      if (montoMatch) datos.montoPagado = parseFloat(montoMatch[1]);

      // Validaciones específicas
      if (!datos.folioFiscal) {
        errores.push('No se encontró el folio fiscal UUID');
      }

      if (!datos.fechaPago) {
        errores.push('No se encontró la fecha de pago');
      }

      // Verificar contra el pago original
      const pago = await database.getPago(pagoId);
      if (pago && datos.montoPagado) {
        const diferencia = Math.abs(pago.monto - datos.montoPagado);
        if (diferencia > 0.01) { // Tolerancia de centavos
          errores.push(`El monto del complemento ($${datos.montoPagado}) no coincide con el pago ($${pago.monto})`);
        }
      }

      return {
        esValido: errores.length === 0,
        errores,
        datos
      };
    } catch (error) {
      console.error('Error validando complemento de pago:', error);
      return {
        esValido: false,
        errores: ['Error procesando el complemento de pago'],
        datos
      };
    }
  }
}

// ==================== REGLAS DE ESTADO DE PROVEEDORES ====================

export class ProveedorStatusRules {
  
  /**
   * Calcula el estado automático de un proveedor basado en su expediente
   */
  static async calcularEstadoProveedor(proveedorId: string): Promise<ProveedorUser['status']> {
    try {
      const expediente = await DocumentacionRules.validarExpedienteCompleto(proveedorId);
      
      // Si tiene documentos vencidos -> suspendido
      if (expediente.documentosVencidos.length > 0) {
        return 'suspendido';
      }
      
      // Si faltan documentos -> pendiente_validacion
      if (expediente.documentosFaltantes.length > 0) {
        return 'pendiente_validacion';
      }
      
      // Si todos los documentos están aprobados -> activo
      if (expediente.isComplete) {
        return 'activo';
      }
      
      // Estado por defecto
      return 'pendiente_validacion';
    } catch (error) {
      console.error('Error calculando estado de proveedor:', error);
      return 'pendiente_validacion';
    }
  }

  /**
   * Verifica proveedores que requieren atención
   */
  static async getProveedoresQuePorRequierenAtencion(empresaId: string): Promise<{
    documentosVencidos: ProveedorUser[];
    complementosPendientes: ProveedorUser[];
    facturasRechazadas: ProveedorUser[];
  }> {
    try {
      // Obtener todos los proveedores de la empresa
      const proveedores = await database.getProveedores({ empresaId });
      
      const documentosVencidos: ProveedorUser[] = [];
      const complementosPendientes: ProveedorUser[] = [];
      const facturasRechazadas: ProveedorUser[] = [];

      // Revisar cada proveedor
      for (const proveedor of proveedores) {
        const expediente = await DocumentacionRules.validarExpedienteCompleto(proveedor.uid);
        
        // Documentos vencidos
        if (expediente.documentosVencidos.length > 0) {
          documentosVencidos.push(proveedor);
        }
        
        // Complementos pendientes
        const complementos = await database.getComplementosPendientesByProveedor(proveedor.uid);
        if (complementos.length > 0) {
          complementosPendientes.push(proveedor);
        }
        
        // Facturas rechazadas
        const facturasRechazadasProveedor = await database.getFacturasByProveedor(
          proveedor.uid, 
          { status: 'rechazada' }
        );
        if (facturasRechazadasProveedor.length > 0) {
          facturasRechazadas.push(proveedor);
        }
      }

      return {
        documentosVencidos,
        complementosPendientes,
        facturasRechazadas
      };
    } catch (error) {
      console.error('Error obteniendo proveedores que requieren atención:', error);
      return {
        documentosVencidos: [],
        complementosPendientes: [],
        facturasRechazadas: []
      };
    }
  }
}

// ==================== UTILIDADES ====================

export class ValidationUtils {
  
  /**
   * Valida RFC mexicano
   */
  static validarRFC(rfc: string): boolean {
    const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcPattern.test(rfc.toUpperCase());
  }

  /**
   * Valida CURP
   */
  static validarCURP(curp: string): boolean {
    const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
    return curpPattern.test(curp.toUpperCase());
  }

  /**
   * Valida código postal mexicano
   */
  static validarCodigoPostal(cp: string): boolean {
    const cpPattern = /^[0-9]{5}$/;
    return cpPattern.test(cp);
  }

  /**
   * Formatea monto para mostrar
   */
  static formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  /**
   * Calcula días hasta vencimiento
   */
  static diasHastaVencimiento(fechaVencimiento: Date): number {
    const now = new Date();
    const diffTime = fechaVencimiento.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}