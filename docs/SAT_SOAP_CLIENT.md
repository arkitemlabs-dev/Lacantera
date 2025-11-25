# Cliente SOAP del SAT - Guía de Implementación

Esta guía explica cómo usar el cliente SOAP real para validar facturas electrónicas con el Servicio de Administración Tributaria (SAT) de México.

## 📋 Índice

1. [Instalación](#instalación)
2. [Configuración](#configuración)
3. [Uso Básico](#uso-básico)
4. [Modos de Operación](#modos-de-operación)
5. [Métodos Disponibles](#métodos-disponibles)
6. [Manejo de Errores](#manejo-de-errores)
7. [Ejemplos Completos](#ejemplos-completos)
8. [Troubleshooting](#troubleshooting)

---

## Instalación

Las dependencias necesarias ya están instaladas:

```bash
npm install soap xml2js axios fast-xml-parser
```

### Archivos del Sistema

- `src/lib/sat-soap-client.ts` - Cliente SOAP del SAT
- `src/lib/sat-validator.ts` - Validador que usa el cliente SOAP
- `.env.example` - Configuración de ejemplo

---

## Configuración

### 1. Crear archivo `.env.local`

Copia el archivo `.env.example` y renómbralo a `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Configurar Variables de Entorno

Edita `.env.local` y configura las variables del SAT:

```env
# Modo de validación SAT
SAT_MODO=desarrollo  # Cambiar a 'produccion' para usar SAT real

# Método de consulta SOAP
SAT_USE_HTTP_DIRECTO=false  # true para HTTP directo

# Timeouts
SAT_TIMEOUT=30000
SAT_MAX_RETRIES=3
```

### 3. Modos Disponibles

#### Modo Desarrollo (Simulación)
```env
SAT_MODO=desarrollo
```
- ✅ Retorna datos simulados
- ✅ No consulta al SAT real
- ✅ Perfecto para testing y desarrollo
- ✅ No requiere configuración adicional

#### Modo Producción (SAT Real)
```env
SAT_MODO=produccion
```
- 🔴 Consulta el servicio SOAP del SAT real
- 🔴 Requiere conexión a internet
- 🔴 Sujeto a disponibilidad del SAT
- 🔴 Puede tener timeouts

---

## Uso Básico

### Método 1: Usando el Validador (Recomendado)

```typescript
import { validacionCompletaSAT } from '@/lib/sat-validator';

const resultado = await validacionCompletaSAT({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});

if (resultado.aprobada) {
  console.log('✅ Factura válida');
  console.log('Estado:', resultado.validacionCFDI.estado);
} else {
  console.log('❌ Factura rechazada:', resultado.motivo);
}
```

### Método 2: Usando el Cliente SOAP Directamente

```typescript
import { validarCFDIConSOAPReal } from '@/lib/sat-soap-client';

const resultado = await validarCFDIConSOAPReal({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});

console.log('Estado:', resultado.estado);
console.log('Código:', resultado.codigoEstatus);
console.log('Es cancelable:', resultado.esCancelable);
console.log('EFOS:', resultado.validacionEFOS);
```

### Método 3: HTTP Directo (Alternativo)

```typescript
import { validarCFDIConHTTPDirecto } from '@/lib/sat-soap-client';

const resultado = await validarCFDIConHTTPDirecto({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});
```

---

## Modos de Operación

### Comparación de Métodos

| Característica | Cliente SOAP | HTTP Directo | Simulación |
|---------------|-------------|--------------|------------|
| Velocidad | ⚡ Rápido | ⚡⚡ Muy rápido | ⚡⚡⚡ Instantáneo |
| Confiabilidad | ✅ Alta | ✅ Alta | ✅ Perfecta |
| Configuración | 🔧 Media | 🔧 Simple | - |
| Costo | 💰 Gratis | 💰 Gratis | 💰 Gratis |
| Desarrollo | ❌ No | ❌ No | ✅ Sí |

### Cuándo usar cada método

**Cliente SOAP (Recomendado):**
- ✅ Producción normal
- ✅ Cuando necesitas compatibilidad máxima
- ✅ Si tienes problemas con HTTP directo

**HTTP Directo:**
- ✅ Mejor rendimiento
- ✅ Menos dependencias
- ✅ Más fácil de debuggear

**Simulación:**
- ✅ Desarrollo y testing
- ✅ Pruebas unitarias
- ✅ Demos sin conexión

---

## Métodos Disponibles

### `SATSoapClient.consultarCFDI()`

Consulta el estado de un CFDI usando el servicio SOAP del SAT.

**Parámetros:**
```typescript
{
  uuid: string;        // UUID del timbre fiscal
  rfcEmisor: string;   // RFC del emisor (13 caracteres)
  rfcReceptor: string; // RFC del receptor (13 caracteres)
  total: number;       // Total de la factura
}
```

**Retorna:**
```typescript
{
  success: boolean;
  codigoEstatus: string;
  estado: 'Vigente' | 'Cancelado' | 'No Encontrado';
  esCancelable: string;
  validacionEFOS?: string;
  fechaConsulta: Date;
  error?: string;
}
```

**Ejemplo:**
```typescript
const client = new SATSoapClient();

const result = await client.consultarCFDI({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});

if (result.success) {
  console.log('Estado:', result.estado);
}
```

### Reintentos Automáticos

El cliente incluye reintentos automáticos:

```typescript
// Configuración de reintentos
MAX_RETRIES: 3          // 3 intentos
RETRY_DELAY: 2000       // 2 segundos entre intentos
TIMEOUT: 30000          // 30 segundos por intento
```

**Comportamiento:**
1. Intento inicial
2. Si falla, espera 2 segundos
3. Segundo intento
4. Si falla, espera 2 segundos
5. Tercer intento
6. Si falla, retorna error

---

## Manejo de Errores

### Tipos de Errores

#### 1. Timeout
```typescript
{
  success: false,
  codigoEstatus: 'TIMEOUT',
  estado: 'No Encontrado',
  error: 'Timeout al consultar el SAT'
}
```

**Causas:**
- El SAT no responde en 30 segundos
- Problemas de red
- Servicio SAT caído

**Solución:**
- El sistema reintenta automáticamente
- Verificar conexión a internet
- Intentar en otro horario

#### 2. Error de Conexión
```typescript
{
  success: false,
  codigoEstatus: 'ERROR',
  estado: 'No Encontrado',
  error: 'Error al conectar con servicio SAT'
}
```

**Causas:**
- Sin conexión a internet
- Firewall bloqueando
- Servicio SAT no disponible

**Solución:**
- Verificar conectividad
- Revisar configuración de firewall
- Consultar estatus del SAT

#### 3. Datos Incorrectos
```typescript
{
  success: true,
  codigoEstatus: 'N - No se encontró el comprobante',
  estado: 'No Encontrado'
}
```

**Causas:**
- UUID incorrecto
- RFC no coincide
- Total no coincide

**Solución:**
- Verificar UUID en el XML
- Confirmar RFCs
- Verificar formato del total

#### 4. CFDI Cancelado
```typescript
{
  success: true,
  codigoEstatus: 'S - Comprobante obtenido satisfactoriamente',
  estado: 'Cancelado'
}
```

**Acción:**
- Rechazar la factura automáticamente
- Notificar al proveedor
- Solicitar nueva factura

### Manejo Robusto de Errores

```typescript
try {
  const resultado = await validarCFDIConSOAPReal(params);

  if (!resultado.success) {
    // Error de comunicación
    console.error('Error de comunicación:', resultado.error);
    return handleCommunicationError(resultado);
  }

  if (resultado.estado === 'No Encontrado') {
    // UUID no existe
    console.error('CFDI no encontrado');
    return handleNotFound(resultado);
  }

  if (resultado.estado === 'Cancelado') {
    // CFDI cancelado
    console.error('CFDI cancelado');
    return handleCanceled(resultado);
  }

  // Todo bien
  return handleSuccess(resultado);

} catch (error) {
  // Error inesperado
  console.error('Error inesperado:', error);
  return handleUnexpectedError(error);
}
```

---

## Ejemplos Completos

### Ejemplo 1: Validación en Flujo de Factura

```typescript
// src/app/actions/facturas.ts

import { validarCFDIConSOAPReal } from '@/lib/sat-soap-client';

export async function procesarFactura(facturaData: any) {
  try {
    // 1. Parsear XML
    const cfdi = parseCFDI(facturaData.xmlFile);

    // 2. Validar con SAT
    console.log('🔍 Validando CFDI con SAT...');

    const validacionSAT = await validarCFDIConSOAPReal({
      uuid: cfdi.timbreFiscalDigital.uuid,
      rfcEmisor: cfdi.emisor.rfc,
      rfcReceptor: cfdi.receptor.rfc,
      total: cfdi.total
    });

    // 3. Verificar resultado
    if (!validacionSAT.success) {
      return {
        success: false,
        error: `Error validando con SAT: ${validacionSAT.error}`
      };
    }

    if (validacionSAT.estado !== 'Vigente') {
      return {
        success: false,
        error: `CFDI ${validacionSAT.estado.toLowerCase()}`
      };
    }

    // 4. Verificar EFOS
    if (validacionSAT.validacionEFOS?.includes('200') ||
        validacionSAT.validacionEFOS?.includes('300')) {
      return {
        success: false,
        error: 'Emisor en lista EFOS (operaciones simuladas)'
      };
    }

    // 5. Guardar factura
    await database.createFactura({
      ...facturaData,
      uuid: cfdi.timbreFiscalDigital.uuid,
      validadaSAT: true,
      estatusSAT: 'vigente',
      fechaValidacionSAT: new Date()
    });

    return {
      success: true,
      message: 'Factura validada y guardada correctamente'
    };

  } catch (error: any) {
    console.error('Error procesando factura:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Ejemplo 2: Re-validación Periódica

```typescript
// Cron job para re-validar facturas cada semana

import { validarCFDIConSOAPReal } from '@/lib/sat-soap-client';

export async function revalidarFacturas() {
  console.log('🔄 Iniciando re-validación de facturas...');

  const facturas = await database.getFacturasVigentes();

  let actualizadas = 0;
  let canceladas = 0;
  let errores = 0;

  for (const factura of facturas) {
    try {
      const resultado = await validarCFDIConSOAPReal({
        uuid: factura.uuid,
        rfcEmisor: factura.proveedorRFC,
        rfcReceptor: factura.receptorRFC,
        total: factura.total
      });

      if (resultado.estado === 'Cancelado') {
        // Factura fue cancelada
        await database.updateFactura(factura.id, {
          estatusSAT: 'cancelada',
          fechaValidacionSAT: new Date()
        });

        await notificarFacturaCancelada(factura);
        canceladas++;
      } else if (resultado.estado === 'Vigente') {
        // Actualizar fecha de última validación
        await database.updateFactura(factura.id, {
          fechaValidacionSAT: new Date()
        });
        actualizadas++;
      }

    } catch (error) {
      console.error(`Error validando factura ${factura.id}:`, error);
      errores++;
    }

    // Esperar 1 segundo entre consultas para no saturar el SAT
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`✅ Re-validación completada:`);
  console.log(`   Actualizadas: ${actualizadas}`);
  console.log(`   Canceladas: ${canceladas}`);
  console.log(`   Errores: ${errores}`);
}
```

### Ejemplo 3: Validación con Fallback

```typescript
import { validarCFDIConSOAPReal, validarCFDIConHTTPDirecto } from '@/lib/sat-soap-client';

export async function validarConFallback(params: any) {
  try {
    // Intentar primero con cliente SOAP
    return await validarCFDIConSOAPReal(params);
  } catch (error) {
    console.warn('Cliente SOAP falló, intentando HTTP directo...');

    try {
      // Fallback a HTTP directo
      return await validarCFDIConHTTPDirecto(params);
    } catch (error2) {
      console.error('Ambos métodos fallaron');
      throw new Error('No se pudo validar con el SAT');
    }
  }
}
```

---

## Troubleshooting

### Problema: "Error inicializando cliente SOAP"

**Síntomas:**
```
❌ Error inicializando cliente SOAP: connect ECONNREFUSED
```

**Causas:**
- Sin conexión a internet
- Firewall bloqueando puerto 443
- Proxy no configurado

**Solución:**
```bash
# Verificar conexión
curl https://consultaqr.facturaelectronica.sat.gob.mx

# Si usas proxy, configurar:
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
```

### Problema: "Timeout al consultar el SAT"

**Síntomas:**
```
❌ Intento 1 falló: Timeout
❌ Intento 2 falló: Timeout
❌ Intento 3 falló: Timeout
```

**Causas:**
- SAT sobrecargado (horario pico)
- Conexión lenta
- Timeout muy corto

**Solución:**
```env
# Aumentar timeouts en .env.local
SAT_TIMEOUT=60000        # 60 segundos
SAT_RETRY_TIMEOUT=90000  # 90 segundos
```

### Problema: "Código 601 - UUID no válido"

**Síntomas:**
```typescript
{
  codigoEstatus: '601',
  estado: 'No Encontrado'
}
```

**Causas:**
- UUID con formato incorrecto
- UUID no existe en SAT

**Solución:**
```typescript
// Validar formato UUID antes de consultar
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!uuidRegex.test(uuid)) {
  throw new Error('UUID inválido');
}
```

### Problema: "Código 604 - Total no corresponde"

**Síntomas:**
```typescript
{
  codigoEstatus: '604 - Total no corresponde',
  estado: 'No Encontrado'
}
```

**Causas:**
- Total con formato incorrecto
- Diferencia en decimales

**Solución:**
```typescript
// Asegurar formato correcto: 6 decimales
const totalFormateado = parseFloat(total).toFixed(6);

// Ejemplo: 11600.00 → "11600.000000"
```

---

## Configuración Avanzada

### Configurar Logs Detallados

```typescript
// En tu código
console.log('📡 Request SOAP:', {
  uuid,
  rfcEmisor,
  rfcReceptor,
  total
});

// Habilitar logs de axios
axios.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
});
```

### Usar con Load Balancer

```typescript
// Distribuir carga entre múltiples instancias
const endpoints = [
  'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc',
  // Agregar más endpoints si el SAT los proporciona
];

const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
```

---

## Mejores Prácticas

### 1. Rate Limiting
No sobrecargues el SAT con demasiadas consultas:

```typescript
// Máximo 1 consulta por segundo
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

for (const factura of facturas) {
  await validarCFDI(factura);
  await delay(1000); // Esperar 1 segundo
}
```

### 2. Cache de Resultados
Cachea resultados exitosos:

```typescript
const cache = new Map();

async function validarConCache(params: any) {
  const key = `${params.uuid}-${params.total}`;

  if (cache.has(key)) {
    const cached = cache.get(key);
    // Solo usar cache si tiene menos de 24 horas
    if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.result;
    }
  }

  const result = await validarCFDI(params);
  cache.set(key, { result, timestamp: Date.now() });
  return result;
}
```

### 3. Monitoreo
Monitorea el estado del servicio:

```typescript
let estadisticas = {
  exitosas: 0,
  fallidas: 0,
  timeouts: 0
};

async function validarConMonitoreo(params: any) {
  try {
    const result = await validarCFDI(params);

    if (result.success) {
      estadisticas.exitosas++;
    } else {
      estadisticas.fallidas++;
    }

    return result;
  } catch (error: any) {
    if (error.message.includes('Timeout')) {
      estadisticas.timeouts++;
    }
    throw error;
  }
}
```

---

## Referencias

- [Servicio SOAP del SAT](https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc)
- [Documentación CFDI 4.0](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Anexo_20_Guia_de_llenado_CFDI.pdf)
- [Código fuente](../src/lib/sat-soap-client.ts)

---

## Soporte

Para problemas o preguntas:
1. Revisar la sección de Troubleshooting
2. Verificar logs en consola
3. Probar modo de simulación primero
4. Consultar documentación del SAT
