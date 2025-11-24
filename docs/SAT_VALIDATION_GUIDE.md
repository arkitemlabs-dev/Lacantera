# Guía de Validación de CFDI con el SAT

Esta guía explica cómo funciona la validación de facturas electrónicas (CFDI) con el Servicio de Administración Tributaria (SAT) de México.

## 📋 Índice

1. [¿Por qué validar con el SAT?](#por-qué-validar-con-el-sat)
2. [Métodos de Validación](#métodos-de-validación)
3. [Implementación Actual](#implementación-actual)
4. [Uso del Módulo](#uso-del-módulo)
5. [Validaciones Realizadas](#validaciones-realizadas)
6. [Producción: Opciones Reales](#producción-opciones-reales)
7. [Códigos de Respuesta del SAT](#códigos-de-respuesta-del-sat)
8. [Listas Negras (EFOS/LDI)](#listas-negras-efo)

---

## ¿Por qué validar con el SAT?

La validación con el SAT es **obligatoria** y **crucial** para:

### ✅ Beneficios Legales
- **Deducibilidad Fiscal**: Solo las facturas vigentes en el SAT son deducibles de impuestos
- **Cumplimiento Legal**: Evitar multas por recibir facturas falsas o canceladas
- **Protección contra Fraude**: Detectar facturas de empresas fantasma (EFOS)

### ✅ Beneficios Operativos
- **Automatización**: Detectar automáticamente facturas inválidas
- **Reducción de Riesgos**: No pagar facturas que el SAT pueda rechazar
- **Trazabilidad**: Historial completo de validaciones

### ⚠️ Riesgos de NO Validar
- Pagar facturas que están canceladas en el SAT
- Recibir facturas de empresas en lista negra (EFOS/LDI)
- Perder la deducibilidad de gastos
- Multas del SAT por facturas apócrifas

---

## Métodos de Validación

El SAT ofrece varios métodos para validar un CFDI:

### 1. **Servicio Web SOAP** ⭐ (Recomendado para Producción)

**Características:**
- Servicio oficial del SAT
- Respuesta en tiempo real
- Datos completos del CFDI
- Requiere certificado digital

**URL del Servicio:**
```
https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
```

**Datos Requeridos:**
- UUID del CFDI
- RFC Emisor
- RFC Receptor
- Total (formato: 10 enteros + 6 decimales)

**Ventajas:**
- ✅ Servicio oficial del SAT
- ✅ Datos completos y confiables
- ✅ Información de cancelación
- ✅ Validación EFOS incluida

**Desventajas:**
- ❌ Requiere implementación SOAP
- ❌ Puede tener timeouts
- ❌ Limita consultas masivas

### 2. **Portal Web del SAT** (Manual)

**URL:**
```
https://verificacfdi.facturaelectronica.sat.gob.mx/
```

**Uso:**
- Ingresar datos manualmente
- Resolver CAPTCHA
- Ver resultado en pantalla

**Ventajas:**
- ✅ No requiere desarrollo
- ✅ Fácil de usar
- ✅ Información completa

**Desventajas:**
- ❌ Proceso manual
- ❌ No automatizable
- ❌ Requiere CAPTCHA

### 3. **Servicio de PAC** (Proveedor Autorizado de Certificación)

**Características:**
- Servicios de terceros certificados por el SAT
- API REST moderna
- Mayor disponibilidad

**Proveedores Populares:**
- Facturama
- Finkok
- SW Sapien
- Ecodex

**Ventajas:**
- ✅ API REST fácil de usar
- ✅ Mayor disponibilidad
- ✅ Soporte técnico
- ✅ Documentación completa

**Desventajas:**
- ❌ Costo adicional (por consulta)
- ❌ Dependencia de terceros

---

## Implementación Actual

El módulo `src/lib/sat-validator.ts` proporciona todas las funciones necesarias.

### Funciones Principales

#### 1. `validarCFDIconSAT()`
Valida un CFDI individual con el SAT.

```typescript
import { validarCFDIconSAT } from '@/lib/sat-validator';

const result = await validarCFDIconSAT({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});

if (result.success) {
  console.log('Estado:', result.estado); // 'Vigente' | 'Cancelado' | 'No Encontrado'
  console.log('Es cancelable:', result.esCancelable);
  console.log('Validación EFOS:', result.validacionEFOS);
}
```

#### 2. `validacionCompletaSAT()`
Realiza una validación completa incluyendo listas negras.

```typescript
import { validacionCompletaSAT } from '@/lib/sat-validator';

const validacion = await validacionCompletaSAT({
  uuid: '12345678-1234-1234-1234-123456789012',
  rfcEmisor: 'PRO010101ABC',
  rfcReceptor: 'LCD010101A00',
  total: 11600.00
});

if (validacion.aprobada) {
  console.log('✅ Factura aprobada');
} else {
  console.log('❌ Factura rechazada:', validacion.motivo);
}
```

#### 3. `verificarRFCenLDI()`
Verifica si un RFC está en listas negras del SAT.

```typescript
import { verificarRFCenLDI } from '@/lib/sat-validator';

const result = await verificarRFCenLDI('PRO010101ABC');

if (result.enLista) {
  console.log('⚠️ RFC en lista de incumplidos');
  console.log('Tipo:', result.tipo); // 'definitiva' | 'presunta' | 'desvirtuada'
}
```

---

## Uso del Módulo

### Caso 1: Validar al recibir factura

```typescript
// src/app/actions/facturas.ts

import { validacionCompletaSAT } from '@/lib/sat-validator';

export async function recibirFactura(facturaData: any) {
  // 1. Parsear el XML
  const cfdi = parseCFDI(facturaData.xml);

  // 2. Validar con SAT
  const validacion = await validacionCompletaSAT({
    uuid: cfdi.timbreFiscalDigital.uuid,
    rfcEmisor: cfdi.emisor.rfc,
    rfcReceptor: cfdi.receptor.rfc,
    total: cfdi.total
  });

  if (!validacion.aprobada) {
    return {
      success: false,
      error: `Factura rechazada: ${validacion.motivo}`
    };
  }

  // 3. Guardar en base de datos
  await database.createFactura({
    ...facturaData,
    validadaSAT: true,
    estatusSAT: 'vigente'
  });

  return { success: true };
}
```

### Caso 2: Re-validar facturas periódicamente

```typescript
import { validacionCompletaSAT, necesitaRevalidacion } from '@/lib/sat-validator';

export async function revalidarFacturasAntiguas() {
  const facturas = await database.getAllFacturas();

  for (const factura of facturas) {
    // Solo re-validar si han pasado más de 7 días
    if (necesitaRevalidacion(factura.fechaValidacionSAT, 7)) {
      const validacion = await validacionCompletaSAT({
        uuid: factura.uuid,
        rfcEmisor: factura.proveedorRFC,
        rfcReceptor: factura.receptorRFC,
        total: factura.total
      });

      if (validacion.validacionCFDI.estado === 'Cancelado') {
        // La factura fue cancelada
        await database.updateFactura(factura.id, {
          estatusSAT: 'cancelada',
          validadaSAT: false
        });

        // Notificar
        await notificarFacturaCancelada(factura);
      }
    }
  }
}
```

### Caso 3: Validar proveedor nuevo

```typescript
import { verificarRFCenLDI } from '@/lib/sat-validator';

export async function registrarProveedor(proveedorData: any) {
  // Verificar si el RFC está en lista negra
  const verificacion = await verificarRFCenLDI(proveedorData.rfc);

  if (verificacion.enLista) {
    return {
      success: false,
      error: `El RFC ${proveedorData.rfc} está en la lista de contribuyentes incumplidos del SAT`
    };
  }

  // Registrar proveedor
  await database.createProveedor(proveedorData);
  return { success: true };
}
```

---

## Validaciones Realizadas

El módulo realiza las siguientes validaciones:

### 1. **Existencia del CFDI**
- ✅ Verifica que el UUID exista en el sistema del SAT
- ✅ Valida que los datos coincidan (RFC emisor, receptor, total)

### 2. **Estado del CFDI**
- ✅ **Vigente**: La factura es válida y deducible
- ⚠️ **Cancelado**: La factura fue cancelada por el emisor
- ❌ **No Encontrado**: El CFDI no existe o los datos son incorrectos

### 3. **Cancelabilidad**
- **Cancelable sin aceptación**: Se puede cancelar sin intervención del receptor
- **Cancelable con aceptación**: Requiere aceptación del receptor
- **No cancelable**: No se puede cancelar

### 4. **Validación EFOS**
- **No incluida en EL SAT**: El emisor no está en lista EFOS ✅
- **200 - Empresa que factura operaciones simuladas**: ⚠️ Alerta
- **300 - Empresa que ampara operaciones simuladas**: ⚠️ Alerta

### 5. **Lista de Contribuyentes Incumplidos (LDI)**
- Verifica si el RFC del emisor está en la lista negra del SAT
- Tipos de listas:
  - **Definitiva**: RFC confirmado como incumplido
  - **Presunta**: RFC bajo investigación
  - **Desvirtuada**: RFC que salió de la lista

---

## Producción: Opciones Reales

Para implementar en producción, tienes 3 opciones:

### Opción 1: Servicio SOAP del SAT (Gratis) ⭐

**Pasos:**
1. Obtener certificado digital (.cer y .key)
2. Implementar cliente SOAP
3. Firmar solicitudes con certificado

**Código de Ejemplo:**

```typescript
// Instalardependencias
npm install soap

// Implementar cliente SOAP
import soap from 'soap';

const WSDL_URL = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?wsdl';

async function consultarSAT(params: any) {
  const client = await soap.createClientAsync(WSDL_URL);

  const expresion = `?re=${params.rfcEmisor}&rr=${params.rfcReceptor}&tt=${params.total}&id=${params.uuid}`;

  const result = await client.ConsultaAsync({
    expresionImpresa: expresion
  });

  return result[0];
}
```

### Opción 2: Usar PAC (Servicio de Terceros) 💰

**Proveedores Recomendados:**

#### Facturama
```typescript
import axios from 'axios';

const FACTURAMA_API = 'https://api.facturama.mx/cfdi/consulta';

async function validarConFacturama(uuid: string) {
  const response = await axios.get(`${FACTURAMA_API}/${uuid}`, {
    auth: {
      username: process.env.FACTURAMA_USER!,
      password: process.env.FACTURAMA_PASSWORD!
    }
  });

  return response.data;
}
```

#### Finkok
```typescript
const FINKOK_API = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

// Usar SOAP similar al SAT pero con API de Finkok
```

**Costos Aproximados:**
- Facturama: ~$0.50 MXN por consulta
- Finkok: ~$0.40 MXN por consulta
- SW Sapien: ~$0.30 MXN por consulta

### Opción 3: Híbrido (Recomendado) 🎯

Combinar ambos métodos:

```typescript
export async function validarFactura(params: any) {
  try {
    // Intentar primero con servicio SOAP del SAT (gratis)
    return await validarConSAT_SOAP(params);
  } catch (error) {
    // Si falla, usar PAC como respaldo
    console.warn('SAT no disponible, usando PAC de respaldo');
    return await validarConPAC(params);
  }
}
```

---

## Códigos de Respuesta del SAT

### Códigos Exitosos

| Código | Descripción |
|--------|-------------|
| `S` | Comprobante obtenido satisfactoriamente |

### Códigos de Error

| Código | Descripción | Acción |
|--------|-------------|--------|
| `N` | No se encontró el comprobante | Verificar datos |
| `601` | UUID no válido | Revisar UUID |
| `602` | RFC Emisor no corresponde | Verificar RFC emisor |
| `603` | RFC Receptor no corresponde | Verificar RFC receptor |
| `604` | Total no corresponde | Verificar monto total |

### Estados del CFDI

| Estado | Significado | Acción |
|--------|-------------|--------|
| `Vigente` | Factura válida ✅ | Aceptar |
| `Cancelado` | Factura cancelada ❌ | Rechazar |
| `No Encontrado` | UUID no existe ❌ | Rechazar |

---

## Listas Negras (EFOS/LDI)

### EFOS - Empresas que Facturan Operaciones Simuladas

**¿Qué son?**
Empresas fantasma que emiten facturas falsas.

**Códigos:**
- **200**: Empresa que factura operaciones simuladas
- **300**: Empresa que ampara operaciones simuladas

**Acción:**
❌ Rechazar automáticamente cualquier factura de estas empresas

### LDI - Lista de Contribuyentes Incumplidos

**Tipos:**
1. **Definitiva** (Art. 69-B): RFC confirmado como incumplido
2. **Presunta** (Art. 69): RFC bajo investigación
3. **Desvirtuada**: RFC que demostró su inocencia

**Consulta:**
```
https://sat.gob.mx/aplicacion/login/53027/listado-de-contribuyentes-incumplidos
```

**Acción Recomendada:**
- **Definitiva**: ❌ Rechazar
- **Presunta**: ⚠️ Alerta, revisar manualmente
- **Desvirtuada**: ✅ Aceptar

---

## Mejores Prácticas

### 1. **Validar al Recibir**
Siempre validar facturas inmediatamente al recibirlas.

### 2. **Re-validar Periódicamente**
Las facturas pueden cancelarse después de recibidas.
- Frecuencia recomendada: cada 7 días
- Para facturas importantes: cada 24 horas

### 3. **Mantener Historial**
Guardar todas las validaciones realizadas:
```typescript
{
  facturaId: '123',
  validaciones: [
    { fecha: '2024-01-01', estado: 'Vigente', resultado: 'aprobada' },
    { fecha: '2024-01-08', estado: 'Vigente', resultado: 'aprobada' },
    { fecha: '2024-01-15', estado: 'Cancelado', resultado: 'rechazada' }
  ]
}
```

### 4. **Notificar Cambios**
Si una factura cambia de estado, notificar inmediatamente.

### 5. **Caché Inteligente**
No validar la misma factura múltiples veces en poco tiempo:
```typescript
if (ultimaValidacion < 24 horas) {
  return resultadoCacheado;
}
```

---

## Troubleshooting

### Error: "Timeout al consultar SAT"
**Causa**: El servicio del SAT está lento o caído.
**Solución**:
- Implementar reintentos (3 veces)
- Usar PAC como respaldo
- Validar en horarios de menor carga (madrugada)

### Error: "Total no coincide"
**Causa**: Formato incorrecto del total.
**Solución**:
```typescript
// Formato requerido: 0000010000.123456
const totalFormateado = total.toFixed(6).padStart(17, '0');
```

### Error: "RFC no corresponde"
**Causa**: RFC mal formateado o incorrecto.
**Solución**:
- Verificar que el RFC tenga 12 o 13 caracteres
- Verificar mayúsculas
- Sin espacios ni caracteres especiales

---

## Referencias

- [Documentación oficial SAT](http://omawww.sat.gob.mx/factura/)
- [Servicio de verificación](https://verificacfdi.facturaelectronica.sat.gob.mx/)
- [Lista de PACs autorizados](https://www.sat.gob.mx/consulta/16703/consulta-la-lista-de-proveedores-autorizados-de-certificacion-de-cfdi)
- [Especificaciones técnicas CFDI 4.0](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Anexo_20_Guia_de_llenado_CFDI.pdf)

---

## Soporte

Para más información sobre la implementación:
- Ver: `src/lib/sat-validator.ts`
- Ver: `src/app/actions/facturas.ts`
- Documentación CFDI: `docs/CFDI_PARSER_USAGE.md`
