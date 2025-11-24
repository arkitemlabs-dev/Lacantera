// src/lib/cfdi-parser.example.ts
// Ejemplos de uso del parser de CFDI

import { parseCFDI, validateCFDI, extractEssentialData } from './cfdi-parser';

/**
 * XML de ejemplo de un CFDI 4.0
 * Este es un XML simplificado solo para demostración
 */
const xmlEjemplo = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  Version="4.0"
  Serie="A"
  Folio="12345"
  Fecha="2024-11-24T14:30:45"
  Sello="selloejemplo123..."
  NoCertificado="00001000000123456789"
  Certificado="certificadoejemplo..."
  SubTotal="10000.00"
  Total="11600.00"
  Moneda="MXN"
  TipoDeComprobante="I"
  MetodoPago="PUE"
  FormaPago="03"
  LugarExpedicion="64000">

  <cfdi:Emisor Rfc="PRO010101ABC" Nombre="PROVEEDOR SA DE CV" RegimenFiscal="601"/>

  <cfdi:Receptor Rfc="LCD010101A00" Nombre="LA CANTERA DESARROLLOS MINEROS"
    UsoCFDI="G03" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="601"/>

  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="50202304" NoIdentificacion="PROD-001" Cantidad="100"
      ClaveUnidad="H87" Unidad="Pieza" Descripcion="Producto de ejemplo"
      ValorUnitario="100.00" Importe="10000.00" Descuento="0" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa"
            TasaOCuota="0.160000" Importe="1600.00"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>

  <cfdi:Impuestos TotalImpuestosTrasladados="1600.00">
    <cfdi:Traslados>
      <cfdi:Traslado Base="10000.00" Impuesto="002" TipoFactor="Tasa"
        TasaOCuota="0.160000" Importe="1600.00"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>

  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="12345678-1234-1234-1234-123456789012"
      FechaTimbrado="2024-11-24T14:35:00"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="selloCFDejemplo..."
      NoCertificadoSAT="00001000000407657758"
      SelloSAT="selloSATejemplo..."/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

/**
 * Ejemplo 1: Parsear un XML básico
 */
export function ejemplo1_ParsearXML() {
  console.log('\n=== EJEMPLO 1: Parsear XML ===\n');

  const result = parseCFDI(xmlEjemplo);

  if (result.success && result.data) {
    console.log('✅ XML parseado exitosamente');
    console.log('\nInformación básica:');
    console.log('  UUID:', result.data.timbreFiscalDigital?.uuid);
    console.log('  Folio:', result.data.folio);
    console.log('  Fecha:', result.data.fecha);
    console.log('  Total:', result.data.total);
    console.log('  Moneda:', result.data.moneda);

    console.log('\nEmisor:');
    console.log('  RFC:', result.data.emisor.rfc);
    console.log('  Nombre:', result.data.emisor.nombre);

    console.log('\nReceptor:');
    console.log('  RFC:', result.data.receptor.rfc);
    console.log('  Nombre:', result.data.receptor.nombre);

    console.log('\nConceptos:', result.data.conceptos.length);
    result.data.conceptos.forEach((concepto, i) => {
      console.log(`  ${i + 1}. ${concepto.descripcion}`);
      console.log(`     Cantidad: ${concepto.cantidad} - Importe: $${concepto.importe}`);
    });

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Advertencias:');
      result.warnings.forEach(w => console.log('  -', w));
    }
  } else {
    console.log('❌ Error al parsear:', result.error);
  }

  return result;
}

/**
 * Ejemplo 2: Validar un CFDI
 */
export function ejemplo2_ValidarCFDI() {
  console.log('\n=== EJEMPLO 2: Validar CFDI ===\n');

  const parseResult = parseCFDI(xmlEjemplo);

  if (parseResult.success && parseResult.data) {
    const validation = validateCFDI(parseResult.data);

    if (validation.valid) {
      console.log('✅ CFDI válido');
      console.log('  - Tiene UUID');
      console.log('  - RFCs presentes');
      console.log('  - Total mayor a 0');
      console.log('  - Tiene conceptos');
      console.log('  - Totales coinciden');
    } else {
      console.log('❌ CFDI inválido');
      validation.errors.forEach(error => {
        console.log('  -', error);
      });
    }

    return validation;
  }

  return { valid: false, errors: ['No se pudo parsear el XML'] };
}

/**
 * Ejemplo 3: Extraer datos esenciales
 */
export function ejemplo3_ExtraerDatosEsenciales() {
  console.log('\n=== EJEMPLO 3: Extraer Datos Esenciales ===\n');

  const parseResult = parseCFDI(xmlEjemplo);

  if (parseResult.success && parseResult.data) {
    const essential = extractEssentialData(parseResult.data);

    console.log('Datos esenciales para almacenamiento:');
    console.log(JSON.stringify(essential, null, 2));

    return essential;
  }

  return null;
}

/**
 * Ejemplo 4: Procesar desde Base64
 */
export function ejemplo4_ProcesarDesdeBase64() {
  console.log('\n=== EJEMPLO 4: Procesar desde Base64 ===\n');

  // Convertir XML a base64
  const base64 = Buffer.from(xmlEjemplo).toString('base64');
  console.log('XML convertido a base64 (primeros 100 chars):', base64.substring(0, 100) + '...');

  // Parsear desde base64
  const buffer = Buffer.from(base64, 'base64');
  const result = parseCFDI(buffer);

  if (result.success && result.data) {
    console.log('✅ XML parseado desde base64 exitosamente');
    console.log('  UUID:', result.data.timbreFiscalDigital?.uuid);
    console.log('  Total:', result.data.total);
  } else {
    console.log('❌ Error:', result.error);
  }

  return result;
}

/**
 * Ejemplo 5: Verificar tipo de comprobante
 */
export function ejemplo5_VerificarTipoComprobante() {
  console.log('\n=== EJEMPLO 5: Verificar Tipo de Comprobante ===\n');

  const parseResult = parseCFDI(xmlEjemplo);

  if (parseResult.success && parseResult.data) {
    const tipo = parseResult.data.tipoDeComprobante;

    const tipos: Record<string, string> = {
      'I': 'Ingreso (Factura)',
      'E': 'Egreso (Nota de Crédito)',
      'T': 'Traslado',
      'N': 'Nómina',
      'P': 'Pago (Complemento de Pago)'
    };

    console.log(`Tipo de comprobante: ${tipo} - ${tipos[tipo] || 'Desconocido'}`);

    if (tipo === 'I') {
      console.log('✅ Es una factura de ingreso válida');
    } else {
      console.log(`⚠️  Este comprobante es de tipo ${tipos[tipo]}`);
    }

    return tipo;
  }

  return null;
}

/**
 * Ejemplo 6: Calcular impuestos
 */
export function ejemplo6_CalcularImpuestos() {
  console.log('\n=== EJEMPLO 6: Calcular Impuestos ===\n');

  const parseResult = parseCFDI(xmlEjemplo);

  if (parseResult.success && parseResult.data) {
    const cfdi = parseResult.data;

    console.log('Subtotal:', cfdi.subTotal);

    if (cfdi.impuestos) {
      // Traslados (IVA, IEPS, etc.)
      if (cfdi.impuestos.traslados) {
        console.log('\nImpuestos Trasladados:');
        cfdi.impuestos.traslados.forEach(t => {
          const nombre = t.impuesto === '002' ? 'IVA' :
                        t.impuesto === '003' ? 'IEPS' :
                        `Impuesto ${t.impuesto}`;
          console.log(`  ${nombre}: $${t.importe} (${t.tasaOCuota * 100}%)`);
        });
        console.log('  Total trasladado:', cfdi.impuestos.totalImpuestosTrasladados);
      }

      // Retenciones (ISR, IVA retenido, etc.)
      if (cfdi.impuestos.retenciones) {
        console.log('\nImpuestos Retenidos:');
        cfdi.impuestos.retenciones.forEach(r => {
          const nombre = r.impuesto === '001' ? 'ISR' :
                        r.impuesto === '002' ? 'IVA Retenido' :
                        `Impuesto ${r.impuesto}`;
          console.log(`  ${nombre}: $${r.importe}`);
        });
        console.log('  Total retenido:', cfdi.impuestos.totalImpuestosRetenidos);
      }
    }

    console.log('\nTotal:', cfdi.total);

    // Verificar cálculo
    let totalCalculado = cfdi.subTotal;
    if (cfdi.descuento) totalCalculado -= cfdi.descuento;
    if (cfdi.impuestos?.totalImpuestosTrasladados) {
      totalCalculado += cfdi.impuestos.totalImpuestosTrasladados;
    }
    if (cfdi.impuestos?.totalImpuestosRetenidos) {
      totalCalculado -= cfdi.impuestos.totalImpuestosRetenidos;
    }

    const diferencia = Math.abs(totalCalculado - cfdi.total);
    if (diferencia < 0.01) {
      console.log('\n✅ Los totales coinciden');
    } else {
      console.log(`\n⚠️  Diferencia de $${diferencia.toFixed(2)}`);
    }
  }
}

/**
 * Ejecutar todos los ejemplos
 */
export function ejecutarTodosLosEjemplos() {
  console.log('\n'.repeat(2));
  console.log('='.repeat(60));
  console.log('         EJEMPLOS DE USO DEL PARSER DE CFDI');
  console.log('='.repeat(60));

  ejemplo1_ParsearXML();
  ejemplo2_ValidarCFDI();
  ejemplo3_ExtraerDatosEsenciales();
  ejemplo4_ProcesarDesdeBase64();
  ejemplo5_VerificarTipoComprobante();
  ejemplo6_CalcularImpuestos();

  console.log('\n' + '='.repeat(60));
  console.log('                  FIN DE EJEMPLOS');
  console.log('='.repeat(60) + '\n');
}

// Para ejecutar en Node.js:
// ts-node src/lib/cfdi-parser.example.ts
if (require.main === module) {
  ejecutarTodosLosEjemplos();
}
