// src/lib/helpers/sat-validation.ts
// Helper para validación de facturas contra el SAT

import axios from 'axios';

// ==================== TIPOS ====================

export interface ValidacionSATResult {
  valido: boolean;
  estado?: string;
  codigoEstatus?: string;
  esCancelable?: string;
  estatusCancelacion?: string;
  mensaje?: string;
  error?: string;
}

export interface DatosSAT {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
}

// ==================== CONSTANTES ====================

// URL del servicio de validación del SAT
const SAT_VALIDATION_URL =
  'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';

// Estados posibles según SAT
export const ESTADOS_SAT = {
  VIGENTE: 'Vigente',
  CANCELADO: 'Cancelado',
  NO_ENCONTRADO: 'No Encontrado',
  NO_CANCELABLE: 'No Cancelable',
};

// ==================== FUNCIONES ====================

/**
 * Valida un CFDI contra el SAT usando el servicio web
 */
export async function validarCFDIconSAT(
  datos: DatosSAT
): Promise<ValidacionSATResult> {
  try {
    // Construir expresión para validación
    // Formato: UUID?re=RFC_EMISOR&rr=RFC_RECEPTOR&tt=TOTAL
    const expresion = `${datos.uuid}?re=${datos.rfcEmisor}&rr=${datos.rfcReceptor}&tt=${datos.total.toFixed(6)}`;

    // Construir el SOAP request
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:Consulta>
      <tem:expresionImpresa><![CDATA[${expresion}]]></tem:expresionImpresa>
    </tem:Consulta>
  </soap:Body>
</soap:Envelope>`;

    // Hacer request al SAT
    const response = await axios.post(SAT_VALIDATION_URL, soapRequest, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://tempuri.org/IConsultaCFDIService/Consulta',
      },
      timeout: 30000, // 30 segundos timeout
    });

    // Parsear respuesta XML
    const resultado = parseRespuestaSAT(response.data);

    return resultado;
  } catch (error: any) {
    console.error('Error validando CFDI con SAT:', error);

    return {
      valido: false,
      error: error.message || 'Error al comunicarse con el SAT',
    };
  }
}

/**
 * Parsea la respuesta XML del SAT
 */
function parseRespuestaSAT(xml: string): ValidacionSATResult {
  try {
    // Extraer el código de estatus
    const codigoMatch = xml.match(/<a:CodigoEstatus>(.*?)<\/a:CodigoEstatus>/);
    const codigoEstatus = codigoMatch ? codigoMatch[1] : '';

    // Extraer el estado
    const estadoMatch = xml.match(/<a:Estado>(.*?)<\/a:Estado>/);
    const estado = estadoMatch ? estadoMatch[1] : '';

    // Extraer si es cancelable
    const cancelableMatch = xml.match(/<a:EsCancelable>(.*?)<\/a:EsCancelable>/);
    const esCancelable = cancelableMatch ? cancelableMatch[1] : '';

    // Extraer estatus de cancelación
    const estatusCancelacionMatch = xml.match(
      /<a:EstatusCancelacion>(.*?)<\/a:EstatusCancelacion>/
    );
    const estatusCancelacion = estatusCancelacionMatch
      ? estatusCancelacionMatch[1]
      : '';

    // Determinar si es válido
    // Códigos del SAT:
    // S - CFDI Comprobable
    // N - CFDI No encontrado
    // C - CFDI Cancelado
    const valido = codigoEstatus === 'S' && estado === ESTADOS_SAT.VIGENTE;

    return {
      valido,
      estado,
      codigoEstatus,
      esCancelable,
      estatusCancelacion,
      mensaje: getMensajeEstatus(codigoEstatus, estado),
    };
  } catch (error: any) {
    console.error('Error parseando respuesta del SAT:', error);
    return {
      valido: false,
      error: 'Error al procesar respuesta del SAT',
    };
  }
}

/**
 * Obtiene un mensaje descriptivo según el código de estatus
 */
function getMensajeEstatus(codigo: string, estado: string): string {
  switch (codigo) {
    case 'S':
      return estado === ESTADOS_SAT.VIGENTE
        ? 'CFDI válido y vigente'
        : 'CFDI encontrado pero no vigente';

    case 'N':
      return 'CFDI no encontrado en el SAT';

    case 'C':
      return 'CFDI cancelado';

    default:
      return `Estado desconocido: ${codigo}`;
  }
}

/**
 * Valida el formato de un UUID/folio fiscal
 */
export function validarFormatoUUID(uuid: string): boolean {
  // UUID versión 4 formato: 8-4-4-4-12 caracteres hexadecimales
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida el formato de un RFC
 */
export function validarFormatoRFC(rfc: string): boolean {
  // RFC persona moral: 3 letras + 6 dígitos + 3 caracteres
  // RFC persona física: 4 letras + 6 dígitos + 3 caracteres
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc.toUpperCase());
}

/**
 * Extrae datos de un XML CFDI
 */
export function extraerDatosCFDI(xmlContent: string): DatosSAT | null {
  try {
    // Extraer UUID del TimbreFiscalDigital
    const uuidMatch = xmlContent.match(/UUID="([^"]+)"/i);
    if (!uuidMatch) {
      console.error('No se encontró UUID en el XML');
      return null;
    }
    const uuid = uuidMatch[1];

    // Extraer RFC emisor
    const rfcEmisorMatch = xmlContent.match(
      /<cfdi:Emisor[^>]*Rfc="([^"]+)"/i
    );
    if (!rfcEmisorMatch) {
      console.error('No se encontró RFC emisor en el XML');
      return null;
    }
    const rfcEmisor = rfcEmisorMatch[1];

    // Extraer RFC receptor
    const rfcReceptorMatch = xmlContent.match(
      /<cfdi:Receptor[^>]*Rfc="([^"]+)"/i
    );
    if (!rfcReceptorMatch) {
      console.error('No se encontró RFC receptor en el XML');
      return null;
    }
    const rfcReceptor = rfcReceptorMatch[1];

    // Extraer total
    const totalMatch = xmlContent.match(/<cfdi:Comprobante[^>]*Total="([^"]+)"/i);
    if (!totalMatch) {
      console.error('No se encontró Total en el XML');
      return null;
    }
    const total = parseFloat(totalMatch[1]);

    return {
      uuid,
      rfcEmisor,
      rfcReceptor,
      total,
    };
  } catch (error) {
    console.error('Error extrayendo datos del CFDI:', error);
    return null;
  }
}

/**
 * Valida un archivo XML CFDI completo
 */
export async function validarXMLCFDI(
  xmlContent: string
): Promise<ValidacionSATResult> {
  // Extraer datos del XML
  const datos = extraerDatosCFDI(xmlContent);

  if (!datos) {
    return {
      valido: false,
      error: 'No se pudieron extraer los datos del XML',
    };
  }

  // Validar formato de UUID
  if (!validarFormatoUUID(datos.uuid)) {
    return {
      valido: false,
      error: 'El UUID no tiene un formato válido',
    };
  }

  // Validar formato de RFCs
  if (!validarFormatoRFC(datos.rfcEmisor)) {
    return {
      valido: false,
      error: 'El RFC del emisor no tiene un formato válido',
    };
  }

  if (!validarFormatoRFC(datos.rfcReceptor)) {
    return {
      valido: false,
      error: 'El RFC del receptor no tiene un formato válido',
    };
  }

  // Validar contra el SAT
  return await validarCFDIconSAT(datos);
}

/**
 * Versión simplificada de validación (solo formato, sin llamada al SAT)
 */
export function validarCFDIOffline(xmlContent: string): {
  valido: boolean;
  datos?: DatosSAT;
  error?: string;
} {
  const datos = extraerDatosCFDI(xmlContent);

  if (!datos) {
    return {
      valido: false,
      error: 'No se pudieron extraer los datos del XML',
    };
  }

  // Validar formatos
  if (!validarFormatoUUID(datos.uuid)) {
    return {
      valido: false,
      datos,
      error: 'El UUID no tiene un formato válido',
    };
  }

  if (!validarFormatoRFC(datos.rfcEmisor) || !validarFormatoRFC(datos.rfcReceptor)) {
    return {
      valido: false,
      datos,
      error: 'Los RFCs no tienen un formato válido',
    };
  }

  return {
    valido: true,
    datos,
  };
}
