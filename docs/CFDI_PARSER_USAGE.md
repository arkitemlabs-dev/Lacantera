# Guía de Uso del Parser de CFDI

El parser de CFDI (`src/lib/cfdi-parser.ts`) es una herramienta completa para extraer y validar información de facturas electrónicas mexicanas en formato XML según el estándar SAT.

## Características

- ✅ Soporte para CFDI versión 3.3 y 4.0
- ✅ Extracción completa de datos del comprobante
- ✅ Parseo de Timbre Fiscal Digital (UUID)
- ✅ Soporte para Complemento de Pago 2.0
- ✅ Validación automática de estructura
- ✅ Cálculo y verificación de totales
- ✅ Manejo de impuestos (IVA, ISR, IEPS, etc.)
- ✅ Warnings para datos opcionales faltantes

## Instalación

La dependencia ya está instalada en el proyecto:

```bash
npm install fast-xml-parser
```

## Uso Básico

### 1. Parsear un XML de CFDI

```typescript
import { parseCFDI } from '@/lib/cfdi-parser';

// Desde un archivo Buffer
const xmlBuffer = fs.readFileSync('factura.xml');
const result = parseCFDI(xmlBuffer);

// Desde un string
const xmlString = '<cfdi:Comprobante>...</cfdi:Comprobante>';
const result = parseCFDI(xmlString);

// Desde base64
const base64Data = 'PGNmZGk6Q29tcHJvYm...';
const xmlBuffer = Buffer.from(base64Data, 'base64');
const result = parseCFDI(xmlBuffer);

if (result.success && result.data) {
  console.log('UUID:', result.data.timbreFiscalDigital?.uuid);
  console.log('Total:', result.data.total);
  console.log('Emisor:', result.data.emisor.nombre);
} else {
  console.error('Error:', result.error);
}
```

### 2. Validar un CFDI

```typescript
import { parseCFDI, validateCFDI } from '@/lib/cfdi-parser';

const parseResult = parseCFDI(xmlContent);

if (parseResult.success && parseResult.data) {
  const validation = validateCFDI(parseResult.data);

  if (validation.valid) {
    console.log('✅ CFDI válido');
  } else {
    console.log('❌ CFDI inválido:');
    validation.errors.forEach(error => console.log('  -', error));
  }
}
```

### 3. Extraer Datos Esenciales

```typescript
import { parseCFDI, extractEssentialData } from '@/lib/cfdi-parser';

const parseResult = parseCFDI(xmlContent);

if (parseResult.success && parseResult.data) {
  const essential = extractEssentialData(parseResult.data);

  console.log({
    uuid: essential.uuid,
    fecha: essential.fecha,
    emisorRFC: essential.emisorRFC,
    emisorNombre: essential.emisorNombre,
    total: essential.total,
    iva: essential.iva,
  });
}
```

## Estructura de Datos

### ParseResult

```typescript
interface ParseResult {
  success: boolean;
  data?: CFDIData;
  error?: string;
  warnings?: string[];
}
```

### CFDIData (Datos Completos)

```typescript
interface CFDIData {
  // Información del comprobante
  version: string;
  serie?: string;
  folio: string;
  fecha: Date;
  subTotal: number;
  total: number;
  moneda: string;
  tipoDeComprobante: 'I' | 'E' | 'T' | 'N' | 'P';

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
  };

  // Conceptos (productos/servicios)
  conceptos: Array<{
    cantidad: number;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    // ... más campos
  }>;

  // Impuestos
  impuestos?: {
    totalImpuestosTrasladados?: number;
    totalImpuestosRetenidos?: number;
    traslados?: Array<{
      impuesto: string;  // '002' = IVA
      importe: number;
    }>;
  };

  // Timbre Fiscal Digital
  timbreFiscalDigital?: {
    uuid: string;
    fechaTimbrado: Date;
    // ... más campos
  };

  // Complemento de Pago (si aplica)
  complementoPago?: {
    version: string;
    pagos: Array<{
      monto: number;
      fechaPago: Date;
      // ... más campos
    }>;
  };
}
```

## Casos de Uso

### Caso 1: Subir Factura con Validación

```typescript
export async function uploadFacturaConValidacion(xmlFile: string, pdfFile: string) {
  // 1. Parsear XML
  const xmlBuffer = Buffer.from(xmlFile, 'base64');
  const parseResult = parseCFDI(xmlBuffer);

  if (!parseResult.success || !parseResult.data) {
    return { error: `Error parseando CFDI: ${parseResult.error}` };
  }

  const cfdi = parseResult.data;

  // 2. Validar
  const validation = validateCFDI(cfdi);
  if (!validation.valid) {
    return { error: `CFDI inválido: ${validation.errors.join(', ')}` };
  }

  // 3. Verificar tipo de comprobante
  if (cfdi.tipoDeComprobante !== 'I') {
    return { error: 'Solo se aceptan facturas de tipo Ingreso' };
  }

  // 4. Verificar UUID
  if (!cfdi.timbreFiscalDigital?.uuid) {
    return { error: 'El CFDI no tiene UUID válido' };
  }

  // 5. Guardar en base de datos
  const facturaData = {
    uuid: cfdi.timbreFiscalDigital.uuid,
    emisorRFC: cfdi.emisor.rfc,
    emisorNombre: cfdi.emisor.nombre,
    receptorRFC: cfdi.receptor.rfc,
    total: cfdi.total,
    // ... más campos
  };

  return { success: true, data: facturaData };
}
```

### Caso 2: Verificar Receptor

```typescript
function verificarReceptor(cfdi: CFDIData, rfcEmpresa: string): boolean {
  if (cfdi.receptor.rfc !== rfcEmpresa) {
    console.error(`RFC receptor (${cfdi.receptor.rfc}) no coincide con RFC empresa (${rfcEmpresa})`);
    return false;
  }
  return true;
}
```

### Caso 3: Calcular Impuestos

```typescript
function obtenerImpuestos(cfdi: CFDIData) {
  const iva = cfdi.impuestos?.traslados?.find(t => t.impuesto === '002')?.importe || 0;
  const isr = cfdi.impuestos?.retenciones?.find(r => r.impuesto === '001')?.importe || 0;
  const ivaRetenido = cfdi.impuestos?.retenciones?.find(r => r.impuesto === '002')?.importe || 0;

  return { iva, isr, ivaRetenido };
}
```

### Caso 4: Procesar Complemento de Pago

```typescript
function procesarComplementoPago(cfdi: CFDIData) {
  if (!cfdi.complementoPago) {
    return { error: 'No es un complemento de pago' };
  }

  const pago = cfdi.complementoPago.pagos[0];
  const documentosRelacionados = pago.doctoRelacionado;

  console.log(`Pago de ${pago.monto} ${pago.monedaP}`);
  console.log(`Fecha: ${pago.fechaPago}`);
  console.log(`Documentos relacionados: ${documentosRelacionados.length}`);

  documentosRelacionados.forEach(doc => {
    console.log(`  - UUID: ${doc.idDocumento}`);
    console.log(`    Importe pagado: ${doc.impPagado}`);
    console.log(`    Saldo insoluto: ${doc.impSaldoInsoluto}`);
  });

  return { success: true, pago };
}
```

## Validaciones Automáticas

El parser valida automáticamente:

1. ✅ Existencia de UUID (Timbre Fiscal Digital)
2. ✅ RFC del emisor y receptor
3. ✅ Total mayor a 0
4. ✅ Al menos un concepto
5. ✅ Concordancia entre subtotal + impuestos = total (tolerancia de 1 centavo)

## Manejo de Errores

```typescript
const result = parseCFDI(xmlContent);

if (!result.success) {
  // Error al parsear XML
  console.error('Error:', result.error);
  return;
}

if (result.warnings && result.warnings.length > 0) {
  // Warnings (datos opcionales faltantes)
  console.warn('Advertencias:');
  result.warnings.forEach(w => console.warn('  -', w));
}

// Datos parseados exitosamente
const cfdi = result.data!;
```

## Tipos de Comprobante

- `I` - Ingreso (facturas normales)
- `E` - Egreso (notas de crédito)
- `T` - Traslado
- `N` - Nómina
- `P` - Pago (complemento de pago)

## Códigos de Impuestos SAT

- `001` - ISR (Impuesto Sobre la Renta)
- `002` - IVA (Impuesto al Valor Agregado)
- `003` - IEPS (Impuesto Especial sobre Producción y Servicios)

## Limitaciones

1. Solo soporta versiones 3.3 y 4.0 del CFDI
2. La validación con SAT debe implementarse por separado
3. No valida la firma digital (sello)
4. No valida la cadena original

## Próximos Pasos

Para integración completa del sistema de facturación:

1. Implementar validación con servicios del SAT
2. Agregar verificación de firmas digitales
3. Implementar detección de duplicados por UUID
4. Crear sistema de alertas para facturas inválidas
5. Agregar soporte para más complementos (nómina, leyendas, etc.)

## Soporte

Para más información sobre el formato CFDI, consultar:
- [Documentación oficial SAT](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Anexo_20_Guia_de_llenado_CFDI.pdf)
- [Catálogos SAT](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm)
