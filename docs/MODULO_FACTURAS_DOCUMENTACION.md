# Módulo de Facturas CFDI - Documentación Técnica

## Índice
1. [Descripción General](#1-descripción-general)
2. [Flujo del Proceso](#2-flujo-del-proceso)
3. [Datos Extraídos del XML](#3-datos-extraídos-del-xml)
4. [Almacenamiento de Archivos](#4-almacenamiento-de-archivos)
5. [Base de Datos](#5-base-de-datos)
6. [Validación SAT](#6-validación-sat)
7. [API Endpoints](#7-api-endpoints)
8. [Configuración Requerida](#8-configuración-requerida)

---

## 1. Descripción General

El módulo de facturas permite a los proveedores subir sus facturas CFDI (Comprobante Fiscal Digital por Internet) en formato XML, junto con su representación impresa en PDF.

### Características principales:
- Soporte para CFDI versión 3.3 y 4.0
- Validación automática de estructura XML
- Validación en tiempo real con el SAT
- Detección de facturas duplicadas
- Almacenamiento organizado por empresa y UUID

---

## 2. Flujo del Proceso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROCESO DE CARGA DE FACTURA                          │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │ USUARIO  │
     │ Sube XML │
     │  + PDF   │
     └────┬─────┘
          │
          ▼
┌─────────────────────┐
│ 1. RECEPCIÓN        │
│ - Validar sesión    │
│ - Validar archivos  │
│ - Max 10MB c/u      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 2. PARSEO XML       │
│ - Extraer datos     │
│ - Validar formato   │
│ - CFDI 3.3 / 4.0    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────┐
│ 3. VALIDACIÓN       │────▶│ ❌ ERROR        │
│ - UUID válido       │ NO  │ Retorna mensaje │
│ - RFC válidos       │     └─────────────────┘
│ - Montos correctos  │
└─────────┬───────────┘
          │ OK
          ▼
┌─────────────────────┐     ┌─────────────────┐
│ 4. DUPLICADOS       │────▶│ ❌ ERROR 409    │
│ - Buscar UUID en BD │ SÍ  │ "Ya existe"     │
└─────────┬───────────┘     └─────────────────┘
          │ NO
          ▼
┌─────────────────────┐     ┌─────────────────┐
│ 5. VALIDACIÓN SAT   │────▶│ ❌ ERROR 400    │
│ - Consulta SOAP     │CANC.│ "Cancelada"     │
│ - Verifica estado   │     └─────────────────┘
│ - Verifica EFOS     │     ┌─────────────────┐
│                     │────▶│ ❌ ERROR 400    │
│                     │EFOS │ "Lista negra"   │
└─────────┬───────────┘     └─────────────────┘
          │ OK/PENDIENTE
          ▼
┌─────────────────────┐
│ 6. GUARDAR ARCHIVOS │
│ - Crear directorio  │
│ - Guardar XML       │
│ - Guardar PDF       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 7. INSERTAR EN BD   │
│ - Datos CFDI        │
│ - Datos SAT         │
│ - Rutas archivos    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 8. NOTIFICACIÓN     │
│ - Crear registro    │
│ - (Opcional email)  │
└─────────┬───────────┘
          │
          ▼
     ┌──────────┐
     │ RESPUESTA│
     │ Status   │
     │ 201 OK   │
     └──────────┘
```

---

## 3. Datos Extraídos del XML

El parser extrae los siguientes datos de un archivo XML CFDI:

### 3.1 Datos del Comprobante

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `version` | String | Versión del CFDI | "4.0" |
| `serie` | String | Serie del comprobante | "A" |
| `folio` | String | Folio del comprobante | "12345" |
| `fecha` | DateTime | Fecha de emisión | "2026-01-15T10:30:00" |
| `tipoDeComprobante` | String | Tipo: I=Ingreso, E=Egreso, P=Pago | "I" |
| `lugarExpedicion` | String | Código postal de expedición | "64000" |
| `metodoPago` | String | PUE=Pago en Una Exhibición, PPD=Parcialidades | "PUE" |
| `formaPago` | String | Forma de pago (catálogo SAT) | "03" (Transferencia) |

### 3.2 Datos Monetarios

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `subTotal` | Decimal(18,2) | Suma de importes antes de impuestos | 10000.00 |
| `descuento` | Decimal(18,2) | Descuento aplicado | 500.00 |
| `total` | Decimal(18,2) | Total de la factura | 11040.00 |
| `moneda` | String(3) | Código de moneda | "MXN" |
| `tipoCambio` | Decimal(10,4) | Tipo de cambio (si no es MXN) | 17.5000 |
| `totalImpuestosTrasladados` | Decimal(18,2) | Total de IVA/IEPS trasladado | 1600.00 |
| `totalImpuestosRetenidos` | Decimal(18,2) | Total de retenciones | 60.00 |

### 3.3 Datos del Emisor (Proveedor)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `rfcEmisor` | String(13) | RFC del emisor | "XAXX010101000" |
| `nombreEmisor` | String(250) | Razón social del emisor | "Proveedor SA de CV" |
| `regimenFiscalEmisor` | String | Régimen fiscal | "601" |

### 3.4 Datos del Receptor (Empresa)

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `rfcReceptor` | String(13) | RFC del receptor | "ABC123456789" |
| `nombreReceptor` | String(250) | Razón social del receptor | "Empresa SA de CV" |
| `usoCFDI` | String | Uso del CFDI (catálogo SAT) | "G03" |
| `regimenFiscalReceptor` | String | Régimen fiscal receptor | "601" |
| `domicilioFiscalReceptor` | String | CP del domicilio fiscal | "64000" |

### 3.5 Timbre Fiscal Digital

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `uuid` | String(36) | Folio fiscal único | "6B6A8B9C-1234-5678-9ABC-DEF012345678" |
| `fechaTimbrado` | DateTime | Fecha/hora del timbrado | "2026-01-15T10:35:22" |
| `rfcProvCertif` | String | RFC del PAC que timbró | "SPR190613I52" |
| `noCertificadoSAT` | String | Número de certificado SAT | "00001000000504465028" |
| `selloCFD` | String | Sello digital del CFDI | "base64..." |
| `selloSAT` | String | Sello del SAT | "base64..." |

### 3.6 Conceptos (Líneas de detalle)

Por cada concepto/línea de la factura:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `claveProdServ` | String | Clave del catálogo SAT | "84111506" |
| `cantidad` | Decimal | Cantidad | 10.00 |
| `claveUnidad` | String | Clave de unidad SAT | "H87" |
| `unidad` | String | Descripción de unidad | "Pieza" |
| `descripcion` | String | Descripción del producto | "Servicio de consultoría" |
| `valorUnitario` | Decimal | Precio unitario | 1000.00 |
| `importe` | Decimal | Importe de la línea | 10000.00 |

### 3.7 Impuestos

**Traslados (IVA, IEPS):**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `impuesto` | Código del impuesto | "002" (IVA) |
| `tipoFactor` | Tipo de factor | "Tasa" |
| `tasaOCuota` | Tasa aplicada | 0.160000 |
| `importe` | Importe del impuesto | 1600.00 |
| `base` | Base del impuesto | 10000.00 |

**Retenciones (ISR, IVA Retenido):**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `impuesto` | Código del impuesto | "001" (ISR) |
| `importe` | Importe retenido | 1000.00 |

---

## 4. Almacenamiento de Archivos

### 4.1 Estructura de Directorios

Los archivos se almacenan en la siguiente estructura:

```
/uploads/
└── facturas/
    └── {EMPRESA_CODE}/
        └── {UUID}/
            ├── factura.xml
            └── factura.pdf
```

### 4.2 Ejemplo Real

```
/uploads/
└── facturas/
    └── CANTERA/
        ├── 6B6A8B9C-1234-5678-9ABC-DEF012345678/
        │   ├── factura.xml
        │   └── factura.pdf
        ├── 7C7B9C0D-2345-6789-0BCD-EF0123456789/
        │   ├── factura.xml
        │   └── factura.pdf
        └── ...
```

### 4.3 Ruta Base

```
{DIRECTORIO_PROYECTO}/uploads/facturas/
```

En producción típicamente:
```
C:\inetpub\wwwroot\lacantera\uploads\facturas\
```

O en Linux:
```
/var/www/lacantera/uploads/facturas/
```

### 4.4 Permisos Requeridos

El directorio `uploads` debe tener permisos de escritura para el usuario que ejecuta la aplicación:

- **Windows (IIS)**: `IIS_IUSRS` con permisos de escritura
- **Linux**: `www-data` o el usuario de Node.js con permisos 755

---

## 5. Base de Datos

### 5.1 Servidor y Base de Datos

| Parámetro | Valor |
|-----------|-------|
| **Servidor** | Configurado en `.env.local` como `PP_DB_SERVER` |
| **Base de datos** | `PP` (Portal Proveedores) |
| **Tabla** | `proveedor_facturas` |

### 5.2 Estructura de la Tabla

```sql
CREATE TABLE proveedor_facturas (
    -- ============ IDENTIFICADORES ============
    id                      UNIQUEIDENTIFIER    NOT NULL PRIMARY KEY DEFAULT NEWID(),
    portal_user_id          NVARCHAR(50)        NOT NULL,    -- ID del usuario del portal
    empresa_code            VARCHAR(50)         NOT NULL,    -- Código de empresa (CANTERA, etc.)

    -- ============ DATOS DEL CFDI ============
    uuid                    VARCHAR(36)         NOT NULL UNIQUE,  -- Folio fiscal
    serie                   VARCHAR(25)         NULL,
    folio                   VARCHAR(40)         NULL,
    fecha_emision           DATETIME2           NOT NULL,
    fecha_timbrado          DATETIME2           NOT NULL,

    -- ============ EMISOR (PROVEEDOR) ============
    rfc_emisor              VARCHAR(13)         NOT NULL,
    nombre_emisor           NVARCHAR(250)       NOT NULL,

    -- ============ RECEPTOR (EMPRESA) ============
    rfc_receptor            VARCHAR(13)         NOT NULL,
    nombre_receptor         NVARCHAR(250)       NOT NULL,

    -- ============ IMPORTES ============
    subtotal                DECIMAL(18, 2)      NOT NULL,
    descuento               DECIMAL(18, 2)      NULL DEFAULT 0,
    impuestos               DECIMAL(18, 2)      NULL DEFAULT 0,
    total                   DECIMAL(18, 2)      NOT NULL,
    moneda                  VARCHAR(3)          NOT NULL DEFAULT 'MXN',
    tipo_cambio             DECIMAL(10, 4)      NULL DEFAULT 1,

    -- ============ ARCHIVOS ============
    xml_contenido           NVARCHAR(MAX)       NULL,    -- Contenido completo del XML
    xml_ruta                VARCHAR(500)        NULL,    -- Ruta física del XML
    pdf_ruta                VARCHAR(500)        NULL,    -- Ruta física del PDF
    xml_tamano              INT                 NULL,    -- Tamaño en bytes
    pdf_tamano              INT                 NULL,    -- Tamaño en bytes

    -- ============ VALIDACIÓN SAT ============
    sat_validado            BIT                 NULL DEFAULT 0,   -- 1=Validado OK, 0=Pendiente/Error
    sat_estado              VARCHAR(50)         NULL,    -- Vigente, Cancelado, No Encontrado, PENDIENTE
    sat_codigo_estatus      VARCHAR(100)        NULL,    -- Código del SAT (ej: "S - Comprobante obtenido...")
    sat_es_cancelable       VARCHAR(50)         NULL,    -- Cancelable sin aceptación, Con aceptación, No cancelable
    sat_validacion_efos     VARCHAR(100)        NULL,    -- Resultado validación EFOS
    sat_fecha_consulta      DATETIME2           NULL,    -- Fecha/hora de la consulta al SAT
    sat_mensaje             NVARCHAR(500)       NULL,    -- Mensaje descriptivo

    -- ============ ESTADO Y CONTROL ============
    estatus                 VARCHAR(50)         NOT NULL DEFAULT 'PENDIENTE',
    -- Valores posibles:
    --   PENDIENTE    = Recién subida, pendiente de revisión
    --   VALIDADA     = Aprobada por administrador
    --   RECHAZADA    = Rechazada por administrador
    --   EN_REVISION  = En proceso de revisión
    --   PAGADA       = Factura pagada
    --   CANCELADA    = Cancelada

    motivo_rechazo          NVARCHAR(500)       NULL,    -- Motivo si fue rechazada
    fecha_validacion        DATETIME2           NULL,    -- Fecha de validación/rechazo
    validado_por            NVARCHAR(50)        NULL,    -- Usuario que validó/rechazó

    -- ============ RELACIÓN CON OC ============
    orden_compra_id         UNIQUEIDENTIFIER    NULL,    -- FK a orden de compra (si aplica)
    orden_compra_folio      VARCHAR(50)         NULL,    -- Folio de la OC relacionada

    -- ============ AUDITORÍA ============
    created_at              DATETIME2           NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2           NOT NULL DEFAULT GETDATE(),
    created_by              NVARCHAR(50)        NULL,
    updated_by              NVARCHAR(50)        NULL
);
```

### 5.3 Índices

```sql
-- Búsqueda por UUID (único)
CREATE UNIQUE INDEX IX_proveedor_facturas_uuid
    ON proveedor_facturas (uuid);

-- Búsqueda por usuario del portal
CREATE INDEX IX_proveedor_facturas_portal_user
    ON proveedor_facturas (portal_user_id);

-- Búsqueda por empresa
CREATE INDEX IX_proveedor_facturas_empresa
    ON proveedor_facturas (empresa_code);

-- Búsqueda por RFC emisor
CREATE INDEX IX_proveedor_facturas_rfc_emisor
    ON proveedor_facturas (rfc_emisor);

-- Búsqueda por estatus
CREATE INDEX IX_proveedor_facturas_estatus
    ON proveedor_facturas (estatus);

-- Búsqueda por fecha de emisión
CREATE INDEX IX_proveedor_facturas_fecha_emision
    ON proveedor_facturas (fecha_emision DESC);

-- Búsqueda por estado SAT
CREATE INDEX IX_proveedor_facturas_sat_estado
    ON proveedor_facturas (sat_estado)
    WHERE sat_estado IS NOT NULL;

-- Índice compuesto para consultas frecuentes
CREATE INDEX IX_proveedor_facturas_user_empresa_estatus
    ON proveedor_facturas (portal_user_id, empresa_code, estatus);
```

### 5.4 Script de Creación

El script completo para crear la tabla se encuentra en:

```
/sql/create_proveedor_facturas.sql
```

---

## 6. Validación SAT

### 6.1 ¿Qué se valida?

1. **Estado del CFDI**: Verifica si la factura está Vigente o Cancelada en el SAT
2. **Lista EFOS**: Verifica si el RFC emisor está en la lista de factureras (ver sección 6.6)
3. **Existencia**: Confirma que el UUID existe en los registros del SAT

### 6.2 Servicio del SAT

```
URL SOAP: https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc
```

### 6.3 Datos enviados al SAT

Se construye una "expresión impresa" con los datos del CFDI:

```
?re={RFC_EMISOR}&rr={RFC_RECEPTOR}&tt={TOTAL}&id={UUID}
```

Ejemplo:
```
?re=XAXX010101000&rr=ABC123456789&tt=11040.000000&id=6B6A8B9C-1234-5678-9ABC-DEF012345678
```

### 6.4 Posibles Respuestas del SAT

| Código | Estado | Significado |
|--------|--------|-------------|
| S - Comprobante obtenido satisfactoriamente | Vigente | La factura es válida y está activa |
| S - Comprobante obtenido satisfactoriamente | Cancelado | La factura fue cancelada |
| N - 601: La expresión impresa... | No Encontrado | No se encontró en el SAT |
| N - 602: Comprobante no encontrado | No Encontrado | UUID no existe |

### 6.5 Reglas de Negocio

| Resultado SAT | Acción |
|---------------|--------|
| **Vigente** | ✅ Se acepta la factura |
| **Cancelado** | ❌ Se rechaza con error 400 |
| **EFOS (Lista negra)** | ❌ Se rechaza con error 400 |
| **Error de conexión** | ⚠️ Se acepta con estado "PENDIENTE" |

### 6.6 Validación EFOS (Empresas que Facturan Operaciones Simuladas)

La validación de EFOS se realiza a través de **la respuesta del servicio SOAP del SAT**.

Cuando se consulta un CFDI, el SAT devuelve un campo `ValidacionEFOS` con los siguientes posibles valores:

| Valor | Significado | Acción |
|-------|-------------|--------|
| `No incluida en EL SAT` | El emisor NO está en lista EFOS | ✅ Se acepta |
| `200 – Empresa que factura operaciones simuladas` | Emisor en lista EFOS | ❌ Se rechaza |
| `300 – Empresa que ampara operaciones simuladas` | Emisor ampara operaciones simuladas | ❌ Se rechaza |

**Importante:**
- Esta validación **funciona automáticamente** cuando `SAT_MODO=produccion`
- El SAT incluye el estatus EFOS en la misma respuesta de validación del CFDI
- **No se requiere** una base de datos local de lista negra, ya que el SAT proporciona esta información en tiempo real
- Si en el futuro se requiere validación adicional contra la Lista de Contribuyentes Incumplidos (LDI), se puede implementar una tabla local que el cliente actualice periódicamente con los datos publicados por el SAT

### 6.7 Configuración

En `.env.local`:

```env
# Modo de validación SAT
# desarrollo = Simula respuestas (para pruebas)
# produccion = Consulta real al SAT
SAT_MODO=produccion
```

---

## 7. API Endpoints

### 7.1 Subir Factura

```
POST /api/proveedor/facturas/upload
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token} (via NextAuth session)
```

**Body (form-data):**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `xmlFile` | File | Sí | Archivo XML del CFDI |
| `pdfFile` | File | No | Archivo PDF (representación impresa) |
| `empresaCode` | String | Sí | Código de la empresa receptora |

**Respuesta Exitosa (201):**

```json
{
  "success": true,
  "factura": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "uuid": "6B6A8B9C-1234-5678-9ABC-DEF012345678",
    "serie": "A",
    "folio": "12345",
    "fechaEmision": "2026-01-15T10:30:00",
    "rfcEmisor": "XAXX010101000",
    "nombreEmisor": "Proveedor SA de CV",
    "rfcReceptor": "ABC123456789",
    "nombreReceptor": "Empresa SA de CV",
    "subtotal": 10000.00,
    "impuestos": 1600.00,
    "total": 11600.00,
    "moneda": "MXN",
    "estatus": "PENDIENTE",
    "empresaCode": "CANTERA"
  },
  "archivos": {
    "xml": "/uploads/facturas/CANTERA/6B6A8B9C.../factura.xml",
    "pdf": "/uploads/facturas/CANTERA/6B6A8B9C.../factura.pdf",
    "xmlTamano": 15420,
    "pdfTamano": 245000
  },
  "validacion": {
    "warnings": []
  },
  "validacionSAT": {
    "validado": true,
    "estado": "Vigente",
    "codigoEstatus": "S - Comprobante obtenido satisfactoriamente",
    "esCancelable": "Cancelable sin aceptación",
    "validacionEFOS": "200",
    "fechaConsulta": "2026-01-15T10:35:45.123Z",
    "mensaje": "CFDI válido ante el SAT"
  }
}
```

**Errores Posibles:**

| Código | Descripción |
|--------|-------------|
| 400 | Archivo XML faltante o inválido |
| 400 | Factura cancelada en el SAT |
| 400 | Emisor en lista EFOS |
| 401 | No autenticado |
| 409 | Factura duplicada (UUID ya existe) |
| 500 | Error interno del servidor |

---

## 8. Configuración Requerida

### 8.1 Variables de Entorno (.env.local)

```env
# ========== Base de Datos Portal Proveedores ==========
PP_DB_SERVER=servidor_sql
PP_DB_NAME=PP
PP_DB_USER=usuario
PP_DB_PASSWORD=contraseña

# ========== Validación SAT ==========
# desarrollo = Simula respuestas
# produccion = Consulta real al SAT
SAT_MODO=produccion

# ========== Correo (Notificaciones) ==========
SMTP_HOST=mail.arkitem.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=notificaciones@arkitem.com
SMTP_PASSWORD=********
```

### 8.2 Dependencias NPM

```json
{
  "fast-xml-parser": "^4.x",  // Parser de XML
  "soap": "^1.x",             // Cliente SOAP para SAT
  "axios": "^1.x",            // HTTP client
  "uuid": "^9.x",             // Generación de UUIDs
  "mssql": "^10.x"            // Conexión SQL Server
}
```

### 8.3 Permisos de Directorio

Asegurarse de que el directorio de uploads tenga permisos de escritura:

```bash
# Linux
chmod -R 755 /var/www/lacantera/uploads
chown -R www-data:www-data /var/www/lacantera/uploads

# Windows (PowerShell como Admin)
icacls "C:\inetpub\wwwroot\lacantera\uploads" /grant "IIS_IUSRS:(OI)(CI)M"
```

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/proveedor/facturas/upload/route.ts` | API de carga de facturas |
| `src/lib/parsers/cfdi-parser.ts` | Parser de XML CFDI |
| `src/lib/sat-validator.ts` | Validador SAT (lógica principal) |
| `src/lib/sat-soap-client.ts` | Cliente SOAP para consulta al SAT |
| `sql/create_proveedor_facturas.sql` | Script de creación de tabla |

---

## Contacto

Para dudas técnicas sobre este módulo, contactar al equipo de desarrollo.

**Última actualización:** Enero 2026
