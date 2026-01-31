// src/lib/cfdi-parser.ts
// Parser para CFDI (Comprobante Fiscal Digital por Internet) versión 3.3 y 4.0

import { XMLParser } from 'fast-xml-parser';

// ==================== TIPOS CFDI ====================

export interface CFDIData {
  // Información del comprobante
  version: string;
  serie?: string;
  folio: string;
  fecha: Date;
  sello: string;
  noCertificado: string;
  certificado: string;
  subTotal: number;
  descuento?: number;
  total: number;
  moneda: string;
  tipoCambio?: number;
  tipoDeComprobante: 'I' | 'E' | 'T' | 'N' | 'P'; // Ingreso, Egreso, Traslado, Nómina, Pago
  metodoPago?: string;
  formaPago?: string;
  condicionesDePago?: string;
  lugarExpedicion: string;

  // Emisor (Proveedor)
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };

  // Receptor (Tu empresa)
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI: string;
    domicilioFiscalReceptor?: string;
    regimenFiscalReceptor?: string;
  };

  // Conceptos
  conceptos: Array<{
    claveProdServ: string;
    noIdentificacion?: string;
    cantidad: number;
    claveUnidad: string;
    unidad?: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    descuento?: number;
    objetoImp?: string;
    impuestos?: {
      traslados?: Array<{
        base: number;
        impuesto: string;
        tipoFactor: string;
        tasaOCuota: number;
        importe: number;
      }>;
      retenciones?: Array<{
        base: number;
        impuesto: string;
        tipoFactor: string;
        tasaOCuota: number;
        importe: number;
      }>;
    };
  }>;

  // Impuestos totales
  impuestos?: {
    totalImpuestosRetenidos?: number;
    totalImpuestosTrasladados?: number;
    retenciones?: Array<{
      impuesto: string;
      importe: number;
    }>;
    traslados?: Array<{
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: number;
      importe: number;
    }>;
  };

  // Complemento - Timbre Fiscal Digital
  timbreFiscalDigital?: {
    version: string;
    uuid: string;
    fechaTimbrado: Date;
    rfcProvCertif: string;
    selloCFD: string;
    noCertificadoSAT: string;
    selloSAT: string;
  };

  // Complemento - Pago 2.0
  complementoPago?: {
    version: string;
    pagos: Array<{
      fechaPago: Date;
      formaDePagoP: string;
      monedaP: string;
      tipoCambioP?: number;
      monto: number;
      numOperacion?: string;
      rfcEmisorCtaOrd?: string;
      nomBancoOrdExt?: string;
      ctaOrdenante?: string;
      rfcEmisorCtaBen?: string;
      ctaBeneficiario?: string;
      tipoCadPago?: string;
      certPago?: string;
      cadPago?: string;
      selloPago?: string;
      doctoRelacionado: Array<{
        idDocumento: string;
        serie?: string;
        folio?: string;
        monedaDR: string;
        equivalenciaDR?: number;
        numParcialidad: number;
        impSaldoAnt: number;
        impPagado: number;
        impSaldoInsoluto: number;
        objetoImpDR?: string;
      }>;
    }>;
  };
}

export interface ParseResult {
  success: boolean;
  data?: CFDIData;
  error?: string;
  warnings?: string[];
}

// ==================== PARSER ====================

export class CFDIParser {
  private parser: XMLParser;
  private warnings: string[] = [];

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      parseTagValue: true,
    });
  }

  /**
   * Parsea un archivo XML de CFDI
   * @param xmlContent Contenido del XML como string o Buffer
   * @returns Resultado del parsing con datos extraídos o error
   */
  public parse(xmlContent: string | Buffer): ParseResult {
    try {
      this.warnings = [];

      // Convertir Buffer a string si es necesario
      const xmlString = Buffer.isBuffer(xmlContent)
        ? xmlContent.toString('utf-8')
        : xmlContent;

      // Parsear XML
      const parsed = this.parser.parse(xmlString);

      // Buscar el nodo raíz del comprobante
      const comprobante = this.findComprobanteNode(parsed);

      if (!comprobante) {
        return {
          success: false,
          error: 'No se encontró el nodo Comprobante en el XML'
        };
      }

      // Validar versión
      const version = comprobante['@_Version']?.toString();
      if (!version || !['3.3', '4.0', '4'].includes(version)) {
        return {
          success: false,
          error: `Versión de CFDI no soportada: ${version}. Solo se soportan versiones 3.3 y 4.0`
        };
      }

      // Extraer datos
      const cfdiData = this.extractCFDIData(comprobante, version);

      return {
        success: true,
        data: cfdiData,
        warnings: this.warnings.length > 0 ? this.warnings : undefined
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Error al parsear XML: ${error.message}`
      };
    }
  }

  /**
   * Encuentra el nodo del comprobante en el XML parseado
   */
  private findComprobanteNode(parsed: any): any {
    // Buscar en diferentes posibles ubicaciones
    if (parsed['cfdi:Comprobante']) {
      return parsed['cfdi:Comprobante'];
    }
    if (parsed['Comprobante']) {
      return parsed['Comprobante'];
    }
    // Buscar en el primer nivel de keys
    for (const key of Object.keys(parsed)) {
      if (key.includes('Comprobante')) {
        return parsed[key];
      }
    }
    return null;
  }

  /**
   * Extrae todos los datos del CFDI
   */
  private extractCFDIData(comprobante: any, version: string): CFDIData {
    return {
      // Información del comprobante
      version,
      serie: comprobante['@_Serie'],
      folio: comprobante['@_Folio'] || 'SIN FOLIO',
      fecha: this.parseDate(comprobante['@_Fecha']),
      sello: comprobante['@_Sello'],
      noCertificado: comprobante['@_NoCertificado'],
      certificado: comprobante['@_Certificado'],
      subTotal: parseFloat(comprobante['@_SubTotal']),
      descuento: comprobante['@_Descuento'] ? parseFloat(comprobante['@_Descuento']) : undefined,
      total: parseFloat(comprobante['@_Total']),
      moneda: comprobante['@_Moneda'],
      tipoCambio: comprobante['@_TipoCambio'] ? parseFloat(comprobante['@_TipoCambio']) : undefined,
      tipoDeComprobante: comprobante['@_TipoDeComprobante'],
      metodoPago: comprobante['@_MetodoPago'],
      formaPago: comprobante['@_FormaPago'],
      condicionesDePago: comprobante['@_CondicionesDePago'],
      lugarExpedicion: comprobante['@_LugarExpedicion'],

      // Emisor
      emisor: this.extractEmisor(comprobante),

      // Receptor
      receptor: this.extractReceptor(comprobante),

      // Conceptos
      conceptos: this.extractConceptos(comprobante),

      // Impuestos
      impuestos: this.extractImpuestos(comprobante),

      // Timbre Fiscal Digital
      timbreFiscalDigital: this.extractTimbreFiscal(comprobante),

      // Complemento de Pago
      complementoPago: this.extractComplementoPago(comprobante)
    };
  }

  /**
   * Extrae información del emisor
   */
  private extractEmisor(comprobante: any): CFDIData['emisor'] {
    const emisorNode = comprobante['cfdi:Emisor'] || comprobante['Emisor'];

    if (!emisorNode) {
      this.warnings.push('No se encontró información del Emisor');
      return { rfc: '', nombre: '', regimenFiscal: '' };
    }

    return {
      rfc: emisorNode['@_Rfc'] || emisorNode['@_RFC'] || '',
      nombre: emisorNode['@_Nombre'] || '',
      regimenFiscal: emisorNode['@_RegimenFiscal'] || ''
    };
  }

  /**
   * Extrae información del receptor
   */
  private extractReceptor(comprobante: any): CFDIData['receptor'] {
    const receptorNode = comprobante['cfdi:Receptor'] || comprobante['Receptor'];

    if (!receptorNode) {
      this.warnings.push('No se encontró información del Receptor');
      return { rfc: '', nombre: '', usoCFDI: '' };
    }

    return {
      rfc: receptorNode['@_Rfc'] || receptorNode['@_RFC'] || '',
      nombre: receptorNode['@_Nombre'] || '',
      usoCFDI: receptorNode['@_UsoCFDI'] || '',
      domicilioFiscalReceptor: receptorNode['@_DomicilioFiscalReceptor'],
      regimenFiscalReceptor: receptorNode['@_RegimenFiscalReceptor']
    };
  }

  /**
   * Extrae los conceptos del comprobante
   */
  private extractConceptos(comprobante: any): CFDIData['conceptos'] {
    const conceptosNode = comprobante['cfdi:Conceptos'] || comprobante['Conceptos'];

    if (!conceptosNode) {
      this.warnings.push('No se encontraron Conceptos en el CFDI');
      return [];
    }

    let conceptosList = conceptosNode['cfdi:Concepto'] || conceptosNode['Concepto'];

    // Si es un solo concepto, convertir a array
    if (!Array.isArray(conceptosList)) {
      conceptosList = [conceptosList];
    }

    return conceptosList.map((concepto: any) => ({
      claveProdServ: concepto['@_ClaveProdServ'],
      noIdentificacion: concepto['@_NoIdentificacion'],
      cantidad: parseFloat(concepto['@_Cantidad']),
      claveUnidad: concepto['@_ClaveUnidad'],
      unidad: concepto['@_Unidad'],
      descripcion: concepto['@_Descripcion'],
      valorUnitario: parseFloat(concepto['@_ValorUnitario']),
      importe: parseFloat(concepto['@_Importe']),
      descuento: concepto['@_Descuento'] ? parseFloat(concepto['@_Descuento']) : undefined,
      objetoImp: concepto['@_ObjetoImp'],
      impuestos: this.extractImpuestosConcepto(concepto)
    }));
  }

  /**
   * Extrae impuestos de un concepto
   */
  private extractImpuestosConcepto(concepto: any): CFDIData['conceptos'][0]['impuestos'] {
    const impuestosNode = concepto['cfdi:Impuestos'] || concepto['Impuestos'];

    if (!impuestosNode) return undefined;

    const result: any = {};

    // Traslados
    const trasladosNode = impuestosNode['cfdi:Traslados'] || impuestosNode['Traslados'];
    if (trasladosNode) {
      let trasladosList = trasladosNode['cfdi:Traslado'] || trasladosNode['Traslado'];
      if (!Array.isArray(trasladosList)) trasladosList = [trasladosList];

      result.traslados = trasladosList.map((t: any) => ({
        base: parseFloat(t['@_Base']),
        impuesto: t['@_Impuesto'],
        tipoFactor: t['@_TipoFactor'],
        tasaOCuota: parseFloat(t['@_TasaOCuota']),
        importe: parseFloat(t['@_Importe'])
      }));
    }

    // Retenciones
    const retencionesNode = impuestosNode['cfdi:Retenciones'] || impuestosNode['Retenciones'];
    if (retencionesNode) {
      let retencionesList = retencionesNode['cfdi:Retencion'] || retencionesNode['Retencion'];
      if (!Array.isArray(retencionesList)) retencionesList = [retencionesList];

      result.retenciones = retencionesList.map((r: any) => ({
        base: parseFloat(r['@_Base']),
        impuesto: r['@_Impuesto'],
        tipoFactor: r['@_TipoFactor'],
        tasaOCuota: parseFloat(r['@_TasaOCuota']),
        importe: parseFloat(r['@_Importe'])
      }));
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Extrae los impuestos totales
   */
  private extractImpuestos(comprobante: any): CFDIData['impuestos'] {
    const impuestosNode = comprobante['cfdi:Impuestos'] || comprobante['Impuestos'];

    if (!impuestosNode) return undefined;

    const result: any = {};

    result.totalImpuestosRetenidos = impuestosNode['@_TotalImpuestosRetenidos']
      ? parseFloat(impuestosNode['@_TotalImpuestosRetenidos'])
      : undefined;

    result.totalImpuestosTrasladados = impuestosNode['@_TotalImpuestosTrasladados']
      ? parseFloat(impuestosNode['@_TotalImpuestosTrasladados'])
      : undefined;

    // Retenciones
    const retencionesNode = impuestosNode['cfdi:Retenciones'] || impuestosNode['Retenciones'];
    if (retencionesNode) {
      let retencionesList = retencionesNode['cfdi:Retencion'] || retencionesNode['Retencion'];
      if (!Array.isArray(retencionesList)) retencionesList = [retencionesList];

      result.retenciones = retencionesList.map((r: any) => ({
        impuesto: r['@_Impuesto'],
        importe: parseFloat(r['@_Importe'])
      }));
    }

    // Traslados
    const trasladosNode = impuestosNode['cfdi:Traslados'] || impuestosNode['Traslados'];
    if (trasladosNode) {
      let trasladosList = trasladosNode['cfdi:Traslado'] || trasladosNode['Traslado'];
      if (!Array.isArray(trasladosList)) trasladosList = [trasladosList];

      result.traslados = trasladosList.map((t: any) => ({
        impuesto: t['@_Impuesto'],
        tipoFactor: t['@_TipoFactor'],
        tasaOCuota: parseFloat(t['@_TasaOCuota']),
        importe: parseFloat(t['@_Importe'])
      }));
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Extrae el timbre fiscal digital
   */
  private extractTimbreFiscal(comprobante: any): CFDIData['timbreFiscalDigital'] {
    const complementoNode = comprobante['cfdi:Complemento'] || comprobante['Complemento'];

    if (!complementoNode) return undefined;

    const timbreNode = complementoNode['tfd:TimbreFiscalDigital'] || complementoNode['TimbreFiscalDigital'];

    if (!timbreNode) {
      this.warnings.push('No se encontró Timbre Fiscal Digital');
      return undefined;
    }

    return {
      version: timbreNode['@_Version'],
      uuid: timbreNode['@_UUID'],
      fechaTimbrado: this.parseDate(timbreNode['@_FechaTimbrado']),
      rfcProvCertif: timbreNode['@_RfcProvCertif'],
      selloCFD: timbreNode['@_SelloCFD'],
      noCertificadoSAT: timbreNode['@_NoCertificadoSAT'],
      selloSAT: timbreNode['@_SelloSAT']
    };
  }

  /**
   * Extrae el complemento de pago
   */
  private extractComplementoPago(comprobante: any): CFDIData['complementoPago'] {
    const complementoNode = comprobante['cfdi:Complemento'] || comprobante['Complemento'];

    if (!complementoNode) return undefined;

    const pagoNode = complementoNode['pago20:Pagos'] || complementoNode['Pagos'];

    if (!pagoNode) return undefined;

    let pagosList = pagoNode['pago20:Pago'] || pagoNode['Pago'];
    if (!Array.isArray(pagosList)) pagosList = [pagosList];

    return {
      version: pagoNode['@_Version'] || '2.0',
      pagos: pagosList.map((pago: any) => {
        const docRelNode = pago['pago20:DoctoRelacionado'] || pago['DoctoRelacionado'];
        let docRelList = Array.isArray(docRelNode) ? docRelNode : [docRelNode];

        return {
          fechaPago: this.parseDate(pago['@_FechaPago']),
          formaDePagoP: pago['@_FormaDePagoP'],
          monedaP: pago['@_MonedaP'],
          tipoCambioP: pago['@_TipoCambioP'] ? parseFloat(pago['@_TipoCambioP']) : undefined,
          monto: parseFloat(pago['@_Monto']),
          numOperacion: pago['@_NumOperacion'],
          rfcEmisorCtaOrd: pago['@_RfcEmisorCtaOrd'],
          nomBancoOrdExt: pago['@_NomBancoOrdExt'],
          ctaOrdenante: pago['@_CtaOrdenante'],
          rfcEmisorCtaBen: pago['@_RfcEmisorCtaBen'],
          ctaBeneficiario: pago['@_CtaBeneficiario'],
          tipoCadPago: pago['@_TipoCadPago'],
          certPago: pago['@_CertPago'],
          cadPago: pago['@_CadPago'],
          selloPago: pago['@_SelloPago'],
          doctoRelacionado: docRelList.map((doc: any) => ({
            idDocumento: doc['@_IdDocumento'],
            serie: doc['@_Serie'],
            folio: doc['@_Folio'],
            monedaDR: doc['@_MonedaDR'],
            equivalenciaDR: doc['@_EquivalenciaDR'] ? parseFloat(doc['@_EquivalenciaDR']) : undefined,
            numParcialidad: parseInt(doc['@_NumParcialidad']),
            impSaldoAnt: parseFloat(doc['@_ImpSaldoAnt']),
            impPagado: parseFloat(doc['@_ImpPagado']),
            impSaldoInsoluto: parseFloat(doc['@_ImpSaldoInsoluto']),
            objetoImpDR: doc['@_ObjetoImpDR']
          }))
        };
      })
    };
  }

  /**
   * Parsea una fecha del formato SAT
   */
  private parseDate(dateString: string): Date {
    if (!dateString) return new Date();

    // Formato: 2024-11-24T14:30:45
    return new Date(dateString);
  }

  /**
   * Valida la estructura básica del CFDI
   */
  public validate(cfdiData: CFDIData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validaciones básicas
    if (!cfdiData.timbreFiscalDigital?.uuid) {
      errors.push('El CFDI no tiene UUID (Timbre Fiscal Digital)');
    }

    if (!cfdiData.emisor.rfc) {
      errors.push('RFC del emisor es requerido');
    }

    if (!cfdiData.receptor.rfc) {
      errors.push('RFC del receptor es requerido');
    }

    if (!cfdiData.total || cfdiData.total <= 0) {
      errors.push('El total del CFDI debe ser mayor a 0');
    }

    if (cfdiData.conceptos.length === 0) {
      errors.push('El CFDI debe tener al menos un concepto');
    }

    // Validar que el subtotal + impuestos = total
    const calculatedTotal = this.calculateTotal(cfdiData);
    const difference = Math.abs(calculatedTotal - cfdiData.total);

    if (difference > 0.01) { // Tolerancia de 1 centavo por redondeos
      errors.push(`El total calculado (${calculatedTotal}) no coincide con el total del CFDI (${cfdiData.total})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcula el total del CFDI basado en subtotal e impuestos
   */
  private calculateTotal(cfdiData: CFDIData): number {
    let total = cfdiData.subTotal;

    if (cfdiData.descuento) {
      total -= cfdiData.descuento;
    }

    if (cfdiData.impuestos?.totalImpuestosTrasladados) {
      total += cfdiData.impuestos.totalImpuestosTrasladados;
    }

    if (cfdiData.impuestos?.totalImpuestosRetenidos) {
      total -= cfdiData.impuestos.totalImpuestosRetenidos;
    }

    return parseFloat(total.toFixed(2));
  }
}

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Parsea un archivo XML de CFDI (función helper)
 */
export function parseCFDI(xmlContent: string | Buffer): ParseResult {
  const parser = new CFDIParser();
  return parser.parse(xmlContent);
}

/**
 * Valida un CFDI parseado
 */
export function validateCFDI(cfdiData: CFDIData): { valid: boolean; errors: string[] } {
  const parser = new CFDIParser();
  return parser.validate(cfdiData);
}

/**
 * Extrae solo los campos esenciales de un CFDI para almacenamiento
 */
export function extractEssentialData(cfdiData: CFDIData) {
  return {
    // Identificación
    uuid: cfdiData.timbreFiscalDigital?.uuid || '',
    version: cfdiData.version,
    serie: cfdiData.serie,
    folio: cfdiData.folio,
    fecha: cfdiData.fecha,
    fechaTimbrado: cfdiData.timbreFiscalDigital?.fechaTimbrado,

    // Emisor
    emisorRFC: cfdiData.emisor.rfc,
    emisorNombre: cfdiData.emisor.nombre,
    emisorRegimenFiscal: cfdiData.emisor.regimenFiscal,

    // Receptor
    receptorRFC: cfdiData.receptor.rfc,
    receptorNombre: cfdiData.receptor.nombre,
    receptorUsoCFDI: cfdiData.receptor.usoCFDI,

    // Montos
    subTotal: cfdiData.subTotal,
    descuento: cfdiData.descuento,
    total: cfdiData.total,
    moneda: cfdiData.moneda,
    tipoCambio: cfdiData.tipoCambio,

    // IVA (impuesto más común)
    iva: cfdiData.impuestos?.traslados?.find(t => t.impuesto === '002')?.importe || 0,
    ivaRetenido: cfdiData.impuestos?.retenciones?.find(r => r.impuesto === '002')?.importe || 0,

    // Otros
    tipoDeComprobante: cfdiData.tipoDeComprobante,
    metodoPago: cfdiData.metodoPago,
    formaPago: cfdiData.formaPago,
    lugarExpedicion: cfdiData.lugarExpedicion,

    // Número de conceptos
    numeroConceptos: cfdiData.conceptos.length,

    // Complemento de pago
    esComplementoPago: !!cfdiData.complementoPago,
    montoPago: cfdiData.complementoPago?.pagos[0]?.monto
  };
}
