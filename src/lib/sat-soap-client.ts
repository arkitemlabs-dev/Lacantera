// src/lib/sat-soap-client.ts
// Cliente SOAP real para validación de CFDI con el SAT

import soap from 'soap';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { ValidacionSATResult, EstatusSAT } from './sat-validator';

// ==================== CONFIGURACIÓN ====================

const SAT_SOAP_CONFIG = {
  // URL del servicio SOAP del SAT
  WSDL_URL: 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl',

  // Endpoint del servicio
  ENDPOINT: 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc',

  // Namespace del servicio
  NAMESPACE: 'http://tempuri.org/',

  // Timeouts
  TIMEOUT: 30000, // 30 segundos
  RETRY_TIMEOUT: 45000, // 45 segundos para reintentos

  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 segundos entre reintentos
};

// ==================== TIPOS ====================

interface ConsultaCFDIRequest {
  expresionImpresa: string;
}

interface ConsultaCFDIResponse {
  CodigoEstatus: string;
  Estado?: string;
  EsCancelable?: string;
  EstatusCancelacion?: string;
  ValidacionEFOS?: string;
  // Campos adicionales según versión del servicio
}

// ==================== CLIENTE SOAP ====================

export class SATSoapClient {
  private soapClient: any = null;
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      trimValues: true,
    });
  }

  /**
   * Inicializa el cliente SOAP
   */
  private async initializeClient(): Promise<any> {
    if (this.soapClient) {
      return this.soapClient;
    }

    try {
      console.log('🔧 Inicializando cliente SOAP del SAT...');

      this.soapClient = await soap.createClientAsync(SAT_SOAP_CONFIG.WSDL_URL, {
        endpoint: SAT_SOAP_CONFIG.ENDPOINT,
        request: axios,
        // Opciones adicionales de SOAP
        wsdl_options: {
          timeout: SAT_SOAP_CONFIG.TIMEOUT,
        },
        // Configuración de seguridad
        forceSoap12Headers: false,
      });

      console.log('✅ Cliente SOAP inicializado correctamente');
      return this.soapClient;

    } catch (error: any) {
      console.error('❌ Error inicializando cliente SOAP:', error);
      throw new Error(`Error al conectar con servicio SAT: ${error.message}`);
    }
  }

  /**
   * Construye la expresión impresa (QR) del CFDI
   */
  private buildExpresionImpresa(params: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number | string;
  }): string {
    const { uuid, rfcEmisor, rfcReceptor, total } = params;

    // Formatear total: 10 dígitos enteros + 6 decimales
    const totalNum = typeof total === 'string' ? parseFloat(total) : total;
    const totalFormateado = totalNum.toFixed(6);

    // Construir expresión impresa
    const expresion = `?re=${rfcEmisor}&rr=${rfcReceptor}&tt=${totalFormateado}&id=${uuid}`;

    console.log('📝 Expresión impresa:', expresion);
    return expresion;
  }

  /**
   * Realiza la consulta SOAP al SAT
   */
  async consultarCFDI(params: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
  }): Promise<ValidacionSATResult> {
    let lastError: Error | null = null;

    // Reintentar en caso de falla
    for (let intento = 1; intento <= SAT_SOAP_CONFIG.MAX_RETRIES; intento++) {
      try {
        console.log(`\n📡 Intento ${intento}/${SAT_SOAP_CONFIG.MAX_RETRIES} - Consultando SAT...`);

        const result = await this.executeConsulta(params);
        return result;

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Intento ${intento} falló:`, error.message);

        if (intento < SAT_SOAP_CONFIG.MAX_RETRIES) {
          console.log(`⏳ Esperando ${SAT_SOAP_CONFIG.RETRY_DELAY}ms antes de reintentar...`);
          await this.sleep(SAT_SOAP_CONFIG.RETRY_DELAY);
        }
      }
    }

    // Si todos los intentos fallaron
    console.error('❌ Todos los intentos de consulta fallaron');
    return {
      success: false,
      codigoEstatus: 'ERROR',
      estado: 'No Encontrado',
      esCancelable: 'No cancelable',
      fechaConsulta: new Date(),
      error: lastError?.message || 'Error al consultar el SAT después de múltiples intentos'
    };
  }

  /**
   * Ejecuta la consulta SOAP
   */
  private async executeConsulta(params: {
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: number;
  }): Promise<ValidacionSATResult> {
    try {
      // Inicializar cliente SOAP
      const client = await this.initializeClient();

      // Construir expresión impresa
      const expresionImpresa = this.buildExpresionImpresa(params);

      // Preparar request
      const request: ConsultaCFDIRequest = {
        expresionImpresa
      };

      console.log('📤 Enviando solicitud SOAP al SAT...');
      console.log('   UUID:', params.uuid);
      console.log('   RFC Emisor:', params.rfcEmisor);
      console.log('   RFC Receptor:', params.rfcReceptor);
      console.log('   Total:', params.total);

      // Ejecutar llamada SOAP con timeout
      const startTime = Date.now();
      const [result] = await Promise.race([
        client.ConsultaAsync(request),
        this.timeoutPromise(SAT_SOAP_CONFIG.TIMEOUT)
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Respuesta recibida en ${duration}ms`);

      // Procesar respuesta
      return this.parseResponse(result);

    } catch (error: any) {
      if (error.message === 'Timeout') {
        throw new Error('Timeout al consultar el SAT. El servicio no respondió a tiempo.');
      }
      throw error;
    }
  }

  /**
   * Parsea la respuesta del servicio SOAP del SAT
   */
  private parseResponse(response: any): ValidacionSATResult {
    try {
      console.log('📥 Procesando respuesta del SAT...');

      // La respuesta viene en response.ConsultaResult
      const consultaResult = response.ConsultaResult || response;

      // Extraer campos de la respuesta
      const codigoEstatus = consultaResult.CodigoEstatus || '';
      const estado = consultaResult.Estado || '';
      const esCancelable = consultaResult.EsCancelable || 'No cancelable';
      const estatusCancelacion = consultaResult.EstatusCancelacion || '';
      const validacionEFOS = consultaResult.ValidacionEFOS || '';

      console.log('   Código Estatus:', codigoEstatus);
      console.log('   Estado:', estado);
      console.log('   Es Cancelable:', esCancelable);
      console.log('   Validación EFOS:', validacionEFOS);

      // Determinar si fue exitoso
      const success = codigoEstatus.startsWith('S');

      // Mapear estado
      let estadoMapped: EstatusSAT = 'No Encontrado';
      if (estado === 'Vigente') estadoMapped = 'Vigente';
      if (estado === 'Cancelado') estadoMapped = 'Cancelado';

      return {
        success,
        codigoEstatus,
        estado: estadoMapped,
        esCancelable: esCancelable as any,
        estatusReceptor: estatusCancelacion as any,
        validacionEFOS: validacionEFOS || 'No incluida en EL SAT',
        fechaConsulta: new Date()
      };

    } catch (error: any) {
      console.error('❌ Error parseando respuesta del SAT:', error);
      throw new Error(`Error procesando respuesta del SAT: ${error.message}`);
    }
  }

  /**
   * Promesa de timeout
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cierra el cliente SOAP
   */
  async close(): Promise<void> {
    if (this.soapClient) {
      console.log('🔌 Cerrando cliente SOAP...');
      this.soapClient = null;
    }
  }
}

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Instancia singleton del cliente SOAP
 */
let soapClientInstance: SATSoapClient | null = null;

/**
 * Obtiene la instancia del cliente SOAP
 */
export function getSoapClient(): SATSoapClient {
  if (!soapClientInstance) {
    soapClientInstance = new SATSoapClient();
  }
  return soapClientInstance;
}

/**
 * Valida un CFDI usando el servicio SOAP real del SAT
 */
export async function validarCFDIConSOAPReal(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
}): Promise<ValidacionSATResult> {
  const client = getSoapClient();
  return await client.consultarCFDI(params);
}

// ==================== MÉTODO ALTERNATIVO (HTTP) ====================

/**
 * Método alternativo usando HTTP directo (sin librería SOAP)
 * Útil si la librería SOAP da problemas
 */
export async function validarCFDIConHTTPDirecto(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
}): Promise<ValidacionSATResult> {
  try {
    const { uuid, rfcEmisor, rfcReceptor, total } = params;

    // Formatear total
    const totalFormateado = total.toFixed(6);

    // Construir expresión impresa
    const expresionImpresa = `?re=${rfcEmisor}&rr=${rfcReceptor}&tt=${totalFormateado}&id=${uuid}`;

    // Construir mensaje SOAP manualmente
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:Consulta>
      <tem:expresionImpresa>${expresionImpresa}</tem:expresionImpresa>
    </tem:Consulta>
  </soap:Body>
</soap:Envelope>`;

    console.log('📤 Enviando solicitud HTTP/SOAP al SAT...');

    // Enviar request HTTP
    const response = await axios.post(
      SAT_SOAP_CONFIG.ENDPOINT,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://tempuri.org/IConsultaCFDIService/Consulta'
        },
        timeout: SAT_SOAP_CONFIG.TIMEOUT,
        validateStatus: () => true // Aceptar cualquier status code
      }
    );

    console.log('📥 Respuesta HTTP recibida. Status:', response.status);

    if (response.status !== 200) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    // Parsear respuesta XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(response.data);

    // Navegar por la estructura SOAP
    const soapBody = parsed['s:Envelope']?.['s:Body']
                  || parsed['soap:Envelope']?.['soap:Body']
                  || parsed['Envelope']?.['Body'];

    if (!soapBody) {
      throw new Error('Respuesta SOAP inválida: no se encontró Body');
    }

    const consultaResponse = soapBody['ConsultaResponse'] || soapBody['tem:ConsultaResponse'];
    const consultaResult = consultaResponse?.['ConsultaResult'] || consultaResponse?.['tem:ConsultaResult'];

    if (!consultaResult) {
      // Verificar si hay un Fault (error SOAP)
      const fault = soapBody['s:Fault'] || soapBody['soap:Fault'] || soapBody['Fault'];
      if (fault) {
        const faultString = fault['faultstring'] || fault['s:faultstring'] || 'Error desconocido';
        throw new Error(`Error SOAP: ${faultString}`);
      }
      throw new Error('No se encontró ConsultaResult en la respuesta');
    }

    // Extraer campos
    const codigoEstatus = consultaResult['a:CodigoEstatus'] || consultaResult['CodigoEstatus'] || '';
    const estado = consultaResult['a:Estado'] || consultaResult['Estado'] || '';
    const esCancelable = consultaResult['a:EsCancelable'] || consultaResult['EsCancelable'] || 'No cancelable';
    const validacionEFOS = consultaResult['a:ValidacionEFOS'] || consultaResult['ValidacionEFOS'] || '';

    console.log('✅ Respuesta parseada:');
    console.log('   Código:', codigoEstatus);
    console.log('   Estado:', estado);

    // Mapear estado
    let estadoMapped: EstatusSAT = 'No Encontrado';
    if (estado === 'Vigente') estadoMapped = 'Vigente';
    if (estado === 'Cancelado') estadoMapped = 'Cancelado';

    return {
      success: codigoEstatus.startsWith('S'),
      codigoEstatus,
      estado: estadoMapped,
      esCancelable: esCancelable as any,
      validacionEFOS: validacionEFOS || 'No incluida en EL SAT',
      fechaConsulta: new Date()
    };

  } catch (error: any) {
    console.error('❌ Error en validación HTTP directa:', error);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        codigoEstatus: 'TIMEOUT',
        estado: 'No Encontrado',
        esCancelable: 'No cancelable',
        fechaConsulta: new Date(),
        error: 'Timeout al consultar el SAT'
      };
    }

    return {
      success: false,
      codigoEstatus: 'ERROR',
      estado: 'No Encontrado',
      esCancelable: 'No cancelable',
      fechaConsulta: new Date(),
      error: error.message
    };
  }
}

// ==================== EXPORTAR ====================

export default {
  SATSoapClient,
  getSoapClient,
  validarCFDIConSOAPReal,
  validarCFDIConHTTPDirecto
};
