/**
 * Parser para archivos XML de CFDI (Comprobante Fiscal Digital por Internet)
 * Soporta versiones 3.3 y 4.0 del estándar SAT
 */

import { XMLParser } from 'fast-xml-parser';

export interface CFDIData {
  // Comprobante
  version: string;
  serie?: string;
  folio?: string;
  fecha: string;
  tipoDeComprobante: string; // I=Ingreso, E=Egreso, T=Traslado, P=Pago, N=Nómina
  lugarExpedicion: string;
  metodoPago?: string;
  formaPago?: string;
  condicionesDePago?: string;

  // Montos
  subTotal: number;
  descuento?: number;
  total: number;
  moneda: string;
  tipoCambio?: number;

  // Emisor
  rfcEmisor: string;
  nombreEmisor: string;
  regimenFiscalEmisor: string;

  // Receptor
  rfcReceptor: string;
  nombreReceptor: string;
  usoCFDI: string;
  regimenFiscalReceptor?: string;
  domicilioFiscalReceptor?: string;

  // Timbre Fiscal Digital
  uuid: string;
  fechaTimbrado: string;
  rfcProvCertif: string;
  noCertificadoSAT: string;
  selloCFD: string;
  selloSAT: string;

  // Impuestos
  totalImpuestosTrasladados?: number;
  totalImpuestosRetenidos?: number;
  impuestos?: {
    traslados?: Array<{
      impuesto: string;
      tipoFactor: string;
      tasaOCuota: number;
      importe: number;
      base?: number;
    }>;
    retenciones?: Array<{
      impuesto: string;
      importe: number;
    }>;
  };

  // Conceptos (resumen)
  totalConceptos: number;
  conceptos?: Array<{
    claveProdServ: string;
    cantidad: number;
    claveUnidad: string;
    unidad?: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    descuento?: number;
    objetoImp?: string;
  }>;

  // Complemento de Pago (si es tipo P)
  complementoPago?: {
    fechaPago: string;
    formaDePagoPago: string;
    monedaPago: string;
    tipoCambioPago?: number;
    monto: number;
    documentosRelacionados: Array<{
      idDocumento: string;
      serie?: string;
      folio?: string;
      monedaDR: string;
      metodoDePagoDR?: string;
      numParcialidad?: number;
      impSaldoAnt?: number;
      impPagado?: number;
      impSaldoInsoluto?: number;
    }>;
  };
}

export interface CFDIValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parser de XML CFDI
 */
export class CFDIParser {
  private parser: XMLParser;

  constructor() {
    // Configurar parser XML
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      parseTrueNumberOnly: true,
      allowBooleanAttributes: true
    });
  }

  /**
   * Parsear XML string a objeto CFDIData
   */
  async parse(xmlString: string): Promise<CFDIData> {
    try {
      // Parsear XML
      const parsedXml = this.parser.parse(xmlString);

      // Determinar versión y extraer comprobante
      let comprobante: any;

      // CFDI 3.3 o 4.0
      if (parsedXml['cfdi:Comprobante']) {
        comprobante = parsedXml['cfdi:Comprobante'];
      } else if (parsedXml['Comprobante']) {
        comprobante = parsedXml['Comprobante'];
      } else {
        throw new Error('No se encontró el nodo Comprobante en el XML');
      }

      // Extraer datos básicos del comprobante
      const cfdiData: CFDIData = {
        version: String(comprobante['@_Version'] || comprobante['@_version'] || ''),
        serie: comprobante['@_Serie'] || comprobante['@_serie'],
        folio: comprobante['@_Folio'] || comprobante['@_folio'],
        fecha: comprobante['@_Fecha'] || comprobante['@_fecha'],
        tipoDeComprobante: comprobante['@_TipoDeComprobante'] || comprobante['@_tipoDeComprobante'] || 'I',
        lugarExpedicion: comprobante['@_LugarExpedicion'] || comprobante['@_lugarExpedicion'],
        metodoPago: comprobante['@_MetodoPago'] || comprobante['@_metodoPago'],
        formaPago: comprobante['@_FormaPago'] || comprobante['@_formaPago'],
        condicionesDePago: comprobante['@_CondicionesDePago'] || comprobante['@_condicionesDePago'],

        subTotal: parseFloat(comprobante['@_SubTotal'] || comprobante['@_subTotal'] || '0'),
        descuento: comprobante['@_Descuento'] ? parseFloat(comprobante['@_Descuento']) : undefined,
        total: parseFloat(comprobante['@_Total'] || comprobante['@_total'] || '0'),
        moneda: comprobante['@_Moneda'] || comprobante['@_moneda'] || 'MXN',
        tipoCambio: comprobante['@_TipoCambio'] ? parseFloat(comprobante['@_TipoCambio']) : undefined,

        // Emisor
        rfcEmisor: '',
        nombreEmisor: '',
        regimenFiscalEmisor: '',

        // Receptor
        rfcReceptor: '',
        nombreReceptor: '',
        usoCFDI: '',

        // Timbre (se llenará después)
        uuid: '',
        fechaTimbrado: '',
        rfcProvCertif: '',
        noCertificadoSAT: '',
        selloCFD: '',
        selloSAT: '',

        totalConceptos: 0
      };

      // Extraer Emisor
      const emisor = comprobante['cfdi:Emisor'] || comprobante['Emisor'];
      if (emisor) {
        cfdiData.rfcEmisor = emisor['@_Rfc'] || emisor['@_rfc'] || '';
        cfdiData.nombreEmisor = emisor['@_Nombre'] || emisor['@_nombre'] || '';
        cfdiData.regimenFiscalEmisor = emisor['@_RegimenFiscal'] || emisor['@_regimenFiscal'] || '';
      }

      // Extraer Receptor
      const receptor = comprobante['cfdi:Receptor'] || comprobante['Receptor'];
      if (receptor) {
        cfdiData.rfcReceptor = receptor['@_Rfc'] || receptor['@_rfc'] || '';
        cfdiData.nombreReceptor = receptor['@_Nombre'] || receptor['@_nombre'] || '';
        cfdiData.usoCFDI = receptor['@_UsoCFDI'] || receptor['@_usoCFDI'] || '';
        cfdiData.regimenFiscalReceptor = receptor['@_RegimenFiscalReceptor'] || receptor['@_regimenFiscalReceptor'];
        cfdiData.domicilioFiscalReceptor = receptor['@_DomicilioFiscalReceptor'] || receptor['@_domicilioFiscalReceptor'];
      }

      // Extraer Conceptos
      const conceptosNode = comprobante['cfdi:Conceptos'] || comprobante['Conceptos'];
      if (conceptosNode) {
        const conceptoArray = Array.isArray(conceptosNode['cfdi:Concepto'] || conceptosNode['Concepto'])
          ? (conceptosNode['cfdi:Concepto'] || conceptosNode['Concepto'])
          : [(conceptosNode['cfdi:Concepto'] || conceptosNode['Concepto'])];

        cfdiData.totalConceptos = conceptoArray.length;
        cfdiData.conceptos = conceptoArray.map((concepto: any) => ({
          claveProdServ: concepto['@_ClaveProdServ'] || concepto['@_claveProdServ'] || '',
          cantidad: parseFloat(concepto['@_Cantidad'] || concepto['@_cantidad'] || '1'),
          claveUnidad: concepto['@_ClaveUnidad'] || concepto['@_claveUnidad'] || '',
          unidad: concepto['@_Unidad'] || concepto['@_unidad'],
          descripcion: concepto['@_Descripcion'] || concepto['@_descripcion'] || '',
          valorUnitario: parseFloat(concepto['@_ValorUnitario'] || concepto['@_valorUnitario'] || '0'),
          importe: parseFloat(concepto['@_Importe'] || concepto['@_importe'] || '0'),
          descuento: concepto['@_Descuento'] ? parseFloat(concepto['@_Descuento']) : undefined,
          objetoImp: concepto['@_ObjetoImp'] || concepto['@_objetoImp']
        }));
      }

      // Extraer Impuestos
      const impuestosNode = comprobante['cfdi:Impuestos'] || comprobante['Impuestos'];
      if (impuestosNode) {
        cfdiData.totalImpuestosTrasladados = impuestosNode['@_TotalImpuestosTrasladados']
          ? parseFloat(impuestosNode['@_TotalImpuestosTrasladados'])
          : undefined;
        cfdiData.totalImpuestosRetenidos = impuestosNode['@_TotalImpuestosRetenidos']
          ? parseFloat(impuestosNode['@_TotalImpuestosRetenidos'])
          : undefined;

        cfdiData.impuestos = {};

        // Traslados (IVA, IEPS, etc.)
        const trasladosNode = impuestosNode['cfdi:Traslados'] || impuestosNode['Traslados'];
        if (trasladosNode) {
          const trasladoArray = Array.isArray(trasladosNode['cfdi:Traslado'] || trasladosNode['Traslado'])
            ? (trasladosNode['cfdi:Traslado'] || trasladosNode['Traslado'])
            : [(trasladosNode['cfdi:Traslado'] || trasladosNode['Traslado'])];

          cfdiData.impuestos.traslados = trasladoArray.map((traslado: any) => ({
            impuesto: traslado['@_Impuesto'] || traslado['@_impuesto'] || '',
            tipoFactor: traslado['@_TipoFactor'] || traslado['@_tipoFactor'] || '',
            tasaOCuota: parseFloat(traslado['@_TasaOCuota'] || traslado['@_tasaOCuota'] || '0'),
            importe: parseFloat(traslado['@_Importe'] || traslado['@_importe'] || '0'),
            base: traslado['@_Base'] ? parseFloat(traslado['@_Base']) : undefined
          }));
        }

        // Retenciones (ISR, IVA Retenido, etc.)
        const retencionesNode = impuestosNode['cfdi:Retenciones'] || impuestosNode['Retenciones'];
        if (retencionesNode) {
          const retencionArray = Array.isArray(retencionesNode['cfdi:Retencion'] || retencionesNode['Retencion'])
            ? (retencionesNode['cfdi:Retencion'] || retencionesNode['Retencion'])
            : [(retencionesNode['cfdi:Retencion'] || retencionesNode['Retencion'])];

          cfdiData.impuestos.retenciones = retencionArray.map((retencion: any) => ({
            impuesto: retencion['@_Impuesto'] || retencion['@_impuesto'] || '',
            importe: parseFloat(retencion['@_Importe'] || retencion['@_importe'] || '0')
          }));
        }
      }

      // Extraer Complemento -> Timbre Fiscal Digital
      const complementoNode = comprobante['cfdi:Complemento'] || comprobante['Complemento'];
      if (complementoNode) {
        const timbreNode = complementoNode['tfd:TimbreFiscalDigital'] || complementoNode['TimbreFiscalDigital'];
        if (timbreNode) {
          cfdiData.uuid = timbreNode['@_UUID'] || timbreNode['@_uuid'] || '';
          cfdiData.fechaTimbrado = timbreNode['@_FechaTimbrado'] || timbreNode['@_fechaTimbrado'] || '';
          cfdiData.rfcProvCertif = timbreNode['@_RfcProvCertif'] || timbreNode['@_rfcProvCertif'] || '';
          cfdiData.noCertificadoSAT = timbreNode['@_NoCertificadoSAT'] || timbreNode['@_noCertificadoSAT'] || '';
          cfdiData.selloCFD = timbreNode['@_SelloCFD'] || timbreNode['@_selloCFD'] || '';
          cfdiData.selloSAT = timbreNode['@_SelloSAT'] || timbreNode['@_selloSAT'] || '';
        }

        // Extraer Complemento de Pago (si es tipo P)
        const pagoNode = complementoNode['pago20:Pagos'] || complementoNode['pago10:Pagos'] || complementoNode['Pagos'];
        if (pagoNode && cfdiData.tipoDeComprobante === 'P') {
          const pagoArray = Array.isArray(pagoNode['pago20:Pago'] || pagoNode['pago10:Pago'] || pagoNode['Pago'])
            ? (pagoNode['pago20:Pago'] || pagoNode['pago10:Pago'] || pagoNode['Pago'])
            : [(pagoNode['pago20:Pago'] || pagoNode['pago10:Pago'] || pagoNode['Pago'])];

          const pago = pagoArray[0]; // Usualmente solo hay un pago

          cfdiData.complementoPago = {
            fechaPago: pago['@_FechaPago'] || pago['@_fechaPago'] || '',
            formaDePagoPago: pago['@_FormaDePagoP'] || pago['@_formaDePagoP'] || '',
            monedaPago: pago['@_MonedaP'] || pago['@_monedaP'] || 'MXN',
            tipoCambioPago: pago['@_TipoCambioP'] ? parseFloat(pago['@_TipoCambioP']) : undefined,
            monto: parseFloat(pago['@_Monto'] || pago['@_monto'] || '0'),
            documentosRelacionados: []
          };

          // Documentos relacionados (facturas que se están pagando)
          const docRelNode = pago['pago20:DoctoRelacionado'] || pago['pago10:DoctoRelacionado'] || pago['DoctoRelacionado'];
          if (docRelNode) {
            const docRelArray = Array.isArray(docRelNode) ? docRelNode : [docRelNode];
            cfdiData.complementoPago.documentosRelacionados = docRelArray.map((doc: any) => ({
              idDocumento: doc['@_IdDocumento'] || doc['@_idDocumento'] || '',
              serie: doc['@_Serie'] || doc['@_serie'],
              folio: doc['@_Folio'] || doc['@_folio'],
              monedaDR: doc['@_MonedaDR'] || doc['@_monedaDR'] || 'MXN',
              metodoDePagoDR: doc['@_MetodoDePagoDR'] || doc['@_metodoDePagoDR'],
              numParcialidad: doc['@_NumParcialidad'] ? parseInt(doc['@_NumParcialidad']) : undefined,
              impSaldoAnt: doc['@_ImpSaldoAnt'] ? parseFloat(doc['@_ImpSaldoAnt']) : undefined,
              impPagado: doc['@_ImpPagado'] ? parseFloat(doc['@_ImpPagado']) : undefined,
              impSaldoInsoluto: doc['@_ImpSaldoInsoluto'] ? parseFloat(doc['@_ImpSaldoInsoluto']) : undefined
            }));
          }
        }
      }

      return cfdiData;

    } catch (error: any) {
      throw new Error(`Error al parsear XML CFDI: ${error.message}`);
    }
  }

  /**
   * Validar estructura básica del CFDI
   */
  validate(cfdiData: CFDIData): CFDIValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validaciones obligatorias
    if (!cfdiData.uuid) {
      errors.push('UUID (Folio Fiscal) es obligatorio');
    } else if (!/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(cfdiData.uuid)) {
      errors.push('UUID tiene formato inválido');
    }

    if (!cfdiData.rfcEmisor) {
      errors.push('RFC del Emisor es obligatorio');
    }

    if (!cfdiData.rfcReceptor) {
      errors.push('RFC del Receptor es obligatorio');
    }

    if (!cfdiData.fecha) {
      errors.push('Fecha de emisión es obligatoria');
    }

    if (!cfdiData.fechaTimbrado) {
      errors.push('Fecha de timbrado es obligatoria');
    }

    if (cfdiData.total <= 0) {
      errors.push('Total debe ser mayor a 0');
    }

    const versionesValidas = ['3.3', '4.0', '4', '3'];
    if (!cfdiData.version || !versionesValidas.includes(cfdiData.version)) {
      errors.push('Versión de CFDI debe ser 3.3 o 4.0');
    }

    // Validación de coherencia de montos
    const calculatedTotal = cfdiData.subTotal - (cfdiData.descuento || 0) + (cfdiData.totalImpuestosTrasladados || 0) - (cfdiData.totalImpuestosRetenidos || 0);
    const diff = Math.abs(calculatedTotal - cfdiData.total);

    if (diff > 0.1) { // Tolerancia de 10 centavos por redondeo
      warnings.push(`Discrepancia en total: calculado=${calculatedTotal.toFixed(2)}, declarado=${cfdiData.total.toFixed(2)}`);
    }

    // Advertencias
    if (!cfdiData.nombreEmisor) {
      warnings.push('Nombre del Emisor no está presente');
    }

    if (!cfdiData.nombreReceptor) {
      warnings.push('Nombre del Receptor no está presente');
    }

    if (cfdiData.tipoDeComprobante === 'P' && !cfdiData.complementoPago) {
      warnings.push('Es un comprobante de pago pero no tiene complemento de pago');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Función helper para parsear CFDI
 */
export async function parseCFDI(xmlString: string): Promise<CFDIData> {
  const parser = new CFDIParser();
  return parser.parse(xmlString);
}

/**
 * Función helper para validar CFDI
 */
export function validateCFDI(cfdiData: CFDIData): CFDIValidationResult {
  const parser = new CFDIParser();
  return parser.validate(cfdiData);
}
