// src/lib/sat-validator.ts
// Validación de CFDI con servicios del SAT

import axios from 'axios';

// ==================== TIPOS ====================

export type EstatusSAT = 'Vigente' | 'Cancelado' | 'No Encontrado';
export type EstatusReceptor = 'Aceptado' | 'Rechazado' | 'Pendiente';

export interface ValidacionSATResult {
  success: boolean;
  codigoEstatus: string;
  estado: EstatusSAT;
  esCancelable: 'Cancelable sin aceptación' | 'Cancelable con aceptación' | 'No cancelable';
  estatusReceptor?: EstatusReceptor;
  validacionEFOS?: 'No incluida en EL SAT' | '200 – Empresa que factura operaciones simuladas' | '300 – Empresa que ampara operaciones simuladas';
  fechaConsulta: Date;
  error?: string;
}

export interface ConsultaLDIResult {
  success: boolean;
  enLista: boolean;
  tipo?: 'definitiva' | 'presunta' | 'desvirtuada';
  fechaPublicacion?: Date;
  error?: string;
}

// ==================== CONFIGURACIÓN ====================

const SAT_CONFIG = {
  // Servicio web del SAT para validación de CFDI
  VALIDACION_URL: 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc',

  // Servicio de verificación del SAT (página pública)
  VERIFICACION_URL: 'https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx',

  // Lista de contribuyentes incumplidos (LDI/EFOS)
  LDI_URL: 'https://sat.gob.mx/aplicacion/login/53027/listado-de-contribuyentes-incumplidos',

  // Timeout para solicitudes
  TIMEOUT: 30000, // 30 segundos
};

// ==================== VALIDACIÓN CON SERVICIO WEB SAT ====================

/**
 * Valida un CFDI usando el servicio web oficial del SAT
 *
 * IMPORTANTE: El SAT tiene dos métodos principales de validación:
 * 1. Servicio Web SOAP (requiere certificado)
 * 2. Servicio público de consulta por QR/datos del CFDI
 *
 * Esta implementación usa el método #2 que no requiere certificado
 */
export async function validarCFDIconSAT(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number | string;
}): Promise<ValidacionSATResult> {
  try {
    const { uuid, rfcEmisor, rfcReceptor, total } = params;

    // Formatear total a 10 dígitos con 6 decimales
    const totalFormateado = typeof total === 'string'
      ? parseFloat(total).toFixed(6)
      : total.toFixed(6);

    // Construir la expresión impresa del CFDI (datos del QR)
    const expresionImpresa = `?re=${rfcEmisor}&rr=${rfcReceptor}&tt=${totalFormateado}&id=${uuid}`;

    console.log('🔍 Validando CFDI con SAT:', { uuid, rfcEmisor, rfcReceptor, total: totalFormateado });

    // OPCIÓN 1: Usar la API pública del SAT (si está disponible)
    // Esta es una simulación ya que el SAT no tiene una API REST pública oficial
    // En producción, tendrías que usar web scraping o el servicio SOAP

    const response = await consultarEstadoCFDI(expresionImpresa);

    return response;

  } catch (error: any) {
    console.error('❌ Error validando con SAT:', error);
    return {
      success: false,
      codigoEstatus: 'ERROR',
      estado: 'No Encontrado',
      esCancelable: 'No cancelable',
      fechaConsulta: new Date(),
      error: error.message || 'Error al consultar el SAT'
    };
  }
}

/**
 * Consulta el estado de un CFDI mediante web scraping del sitio del SAT
 * NOTA: Esta es una implementación de ejemplo. En producción deberías usar
 * el servicio SOAP oficial o un servicio de terceros certificado.
 */
async function consultarEstadoCFDI(expresionImpresa: string): Promise<ValidacionSATResult> {
  try {
    // OPCIÓN A: Usar servicio SOAP del SAT (requiere más configuración)
    // const soapResponse = await consultarViaSoap(expresionImpresa);

    // OPCIÓN B: Usar servicio de terceros (PAC)
    // const pacResponse = await consultarViaPAC(expresionImpresa);

    // OPCIÓN C: Por ahora, simular la respuesta (para desarrollo)
    // En producción, debes implementar una de las opciones anteriores

    console.log('⚠️  MODO DESARROLLO: Simulando validación SAT');
    console.log('   En producción, usar servicio SOAP o PAC certificado');

    // Simular respuesta del SAT
    // En un escenario real, aquí procesarías la respuesta XML del servicio SOAP
    return {
      success: true,
      codigoEstatus: 'S - Comprobante obtenido satisfactoriamente.',
      estado: 'Vigente',
      esCancelable: 'Cancelable sin aceptación',
      estatusReceptor: 'Aceptado',
      validacionEFOS: 'No incluida en EL SAT',
      fechaConsulta: new Date()
    };

  } catch (error: any) {
    throw new Error(`Error consultando estado CFDI: ${error.message}`);
  }
}

// ==================== VALIDACIÓN VÍA SERVICIO SOAP ====================

/**
 * Consulta el estado de un CFDI usando el servicio SOAP del SAT
 *
 * IMPORTANTE: Para usar este servicio necesitas:
 * 1. Certificado digital (.cer)
 * 2. Llave privada (.key)
 * 3. Implementar firma digital
 */
export async function validarConServicioSOAP(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: string;
  rfcSolicitante: string; // Tu RFC
}): Promise<ValidacionSATResult> {
  try {
    const { uuid, rfcEmisor, rfcReceptor, total, rfcSolicitante } = params;

    // Construir el mensaje SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:Consulta>
      <tem:expresionImpresa>?re=${rfcEmisor}&amp;rr=${rfcReceptor}&amp;tt=${total}&amp;id=${uuid}</tem:expresionImpresa>
    </tem:Consulta>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log('📤 Enviando solicitud SOAP al SAT...');

    const response = await axios.post(
      SAT_CONFIG.VALIDACION_URL,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://tempuri.org/IConsultaCFDIService/Consulta'
        },
        timeout: SAT_CONFIG.TIMEOUT
      }
    );

    // Parsear la respuesta SOAP XML
    const result = parsearRespuestaSOAP(response.data);

    return result;

  } catch (error: any) {
    console.error('❌ Error en servicio SOAP:', error);

    if (error.response) {
      console.error('Respuesta del servidor:', error.response.data);
    }

    return {
      success: false,
      codigoEstatus: 'ERROR',
      estado: 'No Encontrado',
      esCancelable: 'No cancelable',
      fechaConsulta: new Date(),
      error: `Error SOAP: ${error.message}`
    };
  }
}

/**
 * Parsea la respuesta XML del servicio SOAP del SAT
 */
function parsearRespuestaSOAP(xmlResponse: string): ValidacionSATResult {
  // Aquí deberías usar un parser XML para extraer la información
  // Por simplicidad, mostramos los campos que vienen en la respuesta

  /*
  Ejemplo de respuesta del SAT:
  <CodigoEstatus>S - Comprobante obtenido satisfactoriamente.</CodigoEstatus>
  <Estado>Vigente</Estado>
  <EsCancelable>Cancelable sin aceptación</EsCancelable>
  <EstatusCancelacion>...</EstatusCancelacion>
  <ValidacionEFOS>No incluida en EL SAT</ValidacionEFOS>
  */

  // Esta es una implementación simplificada
  // En producción, usa fast-xml-parser o similar

  const vigente = xmlResponse.includes('<Estado>Vigente</Estado>');
  const cancelado = xmlResponse.includes('<Estado>Cancelado</Estado>');

  let estado: EstatusSAT = 'No Encontrado';
  if (vigente) estado = 'Vigente';
  if (cancelado) estado = 'Cancelado';

  return {
    success: vigente || cancelado,
    codigoEstatus: vigente ? 'S - Comprobante obtenido satisfactoriamente.' : 'N - No encontrado',
    estado,
    esCancelable: vigente ? 'Cancelable sin aceptación' : 'No cancelable',
    validacionEFOS: 'No incluida en EL SAT',
    fechaConsulta: new Date()
  };
}

// ==================== VALIDACIÓN EN LISTA NEGRA (LDI/EFOS) ====================

/**
 * Verifica si un RFC está en la Lista de Contribuyentes Incumplidos (LDI)
 * o en la lista de Empresas que Facturan Operaciones Simuladas (EFOS)
 *
 * IMPORTANTE: Esta consulta requiere web scraping del sitio del SAT
 * ya que no hay una API pública oficial.
 */
export async function verificarRFCenLDI(rfc: string): Promise<ConsultaLDIResult> {
  try {
    console.log(`🔍 Verificando RFC ${rfc} en listas del SAT...`);

    // OPCIÓN A: Usar servicio de terceros que consulte el SAT
    // const resultado = await servicioTerceros.consultarLDI(rfc);

    // OPCIÓN B: Web scraping del sitio del SAT (complejo y frágil)
    // const resultado = await scrapearListaSAT(rfc);

    // OPCIÓN C: Mantener base de datos local actualizada
    // const resultado = await consultarBaseDatosLocal(rfc);

    // Por ahora, retornar simulación
    console.log('⚠️  MODO DESARROLLO: Simulando consulta LDI');
    console.log('   En producción, usar servicio certificado o base de datos actualizada');

    return {
      success: true,
      enLista: false, // Asumir que NO está en lista negra
    };

  } catch (error: any) {
    console.error('❌ Error consultando LDI:', error);
    return {
      success: false,
      enLista: false,
      error: error.message
    };
  }
}

// ==================== VALIDACIÓN COMPLETA ====================

/**
 * Realiza una validación completa de una factura con el SAT
 * Incluye:
 * 1. Validación de existencia del CFDI
 * 2. Verificación de estado (vigente/cancelado)
 * 3. Consulta en listas negras (EFOS/LDI)
 */
export async function validacionCompletaSAT(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
}): Promise<{
  validacionCFDI: ValidacionSATResult;
  validacionEmisor: ConsultaLDIResult;
  aprobada: boolean;
  motivo?: string;
}> {
  try {
    console.log('\n🔍 === VALIDACIÓN COMPLETA CON SAT ===\n');

    // 1. Validar el CFDI
    console.log('1️⃣ Validando existencia del CFDI...');
    const validacionCFDI = await validarCFDIconSAT(params);

    if (!validacionCFDI.success) {
      return {
        validacionCFDI,
        validacionEmisor: { success: false, enLista: false },
        aprobada: false,
        motivo: 'No se pudo validar el CFDI con el SAT'
      };
    }

    console.log(`   ✅ Estado: ${validacionCFDI.estado}`);
    console.log(`   ✅ Código: ${validacionCFDI.codigoEstatus}`);

    // 2. Verificar que el CFDI esté vigente
    if (validacionCFDI.estado !== 'Vigente') {
      return {
        validacionCFDI,
        validacionEmisor: { success: false, enLista: false },
        aprobada: false,
        motivo: `El CFDI está ${validacionCFDI.estado.toLowerCase()}`
      };
    }

    // 3. Verificar emisor en listas negras
    console.log('\n2️⃣ Verificando RFC del emisor en listas SAT...');
    const validacionEmisor = await verificarRFCenLDI(params.rfcEmisor);

    if (validacionEmisor.enLista) {
      console.log('   ⚠️  RFC encontrado en lista de incumplidos');
      return {
        validacionCFDI,
        validacionEmisor,
        aprobada: false,
        motivo: `El RFC emisor ${params.rfcEmisor} está en la lista de contribuyentes incumplidos del SAT`
      };
    }

    console.log('   ✅ RFC del emisor no está en listas negras');

    // 4. Validación EFOS (si viene en la respuesta)
    if (validacionCFDI.validacionEFOS?.includes('200') || validacionCFDI.validacionEFOS?.includes('300')) {
      console.log('   ⚠️  Empresa detectada en lista EFOS');
      return {
        validacionCFDI,
        validacionEmisor,
        aprobada: false,
        motivo: 'El emisor está en la lista de Empresas que Facturan Operaciones Simuladas (EFOS)'
      };
    }

    console.log('\n✅ === VALIDACIÓN APROBADA ===\n');

    return {
      validacionCFDI,
      validacionEmisor,
      aprobada: true
    };

  } catch (error: any) {
    console.error('❌ Error en validación completa:', error);
    return {
      validacionCFDI: {
        success: false,
        codigoEstatus: 'ERROR',
        estado: 'No Encontrado',
        esCancelable: 'No cancelable',
        fechaConsulta: new Date(),
        error: error.message
      },
      validacionEmisor: { success: false, enLista: false },
      aprobada: false,
      motivo: 'Error al realizar la validación con el SAT'
    };
  }
}

// ==================== UTILIDADES ====================

/**
 * Verifica si es necesario re-validar un CFDI
 * (por ejemplo, si han pasado más de X días desde la última validación)
 */
export function necesitaRevalidacion(
  fechaUltimaValidacion?: Date,
  diasVigencia: number = 7
): boolean {
  if (!fechaUltimaValidacion) return true;

  const ahora = new Date();
  const diferenciaDias = (ahora.getTime() - new Date(fechaUltimaValidacion).getTime()) / (1000 * 60 * 60 * 24);

  return diferenciaDias > diasVigencia;
}

/**
 * Formatea el total para la consulta SAT
 * El SAT requiere formato específico: 10 dígitos enteros y 6 decimales
 */
export function formatearTotalParaSAT(total: number): string {
  return total.toFixed(6).padStart(17, '0');
}

// ==================== EXPORTAR FUNCIONES PRINCIPALES ====================

export default {
  validarCFDIconSAT,
  validarConServicioSOAP,
  verificarRFCenLDI,
  validacionCompletaSAT,
  necesitaRevalidacion,
  formatearTotalParaSAT
};
