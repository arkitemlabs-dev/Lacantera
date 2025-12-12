# Sistema de Facturas y Complementos de Pago - Completado ✅

## Resumen

Se ha implementado un sistema completo para que los proveedores puedan:
1. ✅ **Consultar facturas** existentes en los ERPs (tabla Cxc)
2. ✅ **Consultar complementos de pago** existentes (tablas CFDI_Complementopago/D)
3. ✅ **Subir nuevas facturas** en formato XML + PDF
4. ✅ **Relacionar facturas** con órdenes de compra (una factura puede relacionarse con múltiples órdenes)

---

## 📋 Pasos para Activar el Sistema

### 1. Ejecutar Script de Base de Datos en Portal (PP)

**Servidor**: cloud.arkitem.com
**Base de Datos**: PP

**Script a ejecutar**: [scripts/crear-tabla-facturas-proveedor.sql](scripts/crear-tabla-facturas-proveedor.sql)

Este script creará 3 tablas:
- `proveedor_facturas` - Almacena facturas subidas por proveedores
- `proveedor_facturas_ordenes` - Relación muchos-a-muchos entre facturas y órdenes
- `proveedor_complementos_pago` - Complementos de pago subidos

```bash
# Ejecutar en SSMS o Azure Data Studio conectado al Portal
USE PP;
GO
-- Pegar contenido del script aquí
```

### 2. Crear Directorio de Uploads

El sistema guardará archivos XML y PDF en el servidor. Crear directorio:

```bash
# En el servidor donde corre Next.js
mkdir -p uploads/facturas
chmod 755 uploads/facturas
```

**Nota**: Los archivos se organizarán automáticamente como:
```
uploads/facturas/
├── la-cantera/
│   └── {UUID}/
│       ├── {UUID}.xml
│       └── {UUID}.pdf
├── peralillo/
│   └── {UUID}/
│       ├── {UUID}.xml
│       └── {UUID}.pdf
...
```

### 3. Verificar Dependencias

Todas las dependencias ya están instaladas en `package.json`:
- ✅ `fast-xml-parser` v5.3.2 (para parsear XML CFDI)
- ✅ `uuid` v13.0.0 (para generar IDs)
- ✅ `mssql` v12.1.1 (para SQL Server)

Si falta algo:
```bash
npm install
```

### 4. Reiniciar Servidor de Desarrollo

```bash
npm run dev
```

---

## 🎯 Endpoints Implementados

### Endpoints de Lectura (GET)

#### 1. **GET /api/proveedor/facturas**
Lista todas las facturas del proveedor desde la tabla `Cxc` de los ERPs.

**Query Parameters:**
- `empresa` (opcional): la-cantera, peralillo, plaza-galerena, inmobiliaria-galerena, icrear
- `fecha_desde` (opcional): YYYY-MM-DD
- `fecha_hasta` (opcional): YYYY-MM-DD
- `estatus` (opcional): CONCLUIDO, CANCELADO, PENDIENTE
- `limite` (opcional, default: 50)

**Ejemplo:**
```bash
GET /api/proveedor/facturas?empresa=la-cantera&fecha_desde=2024-01-01
```

**Archivo**: [src/app/api/proveedor/facturas/route.ts](src/app/api/proveedor/facturas/route.ts)

---

#### 2. **GET /api/proveedor/facturas/[id]**
Detalle completo de una factura específica.

**URL Params:**
- `id`: ID de la factura en el ERP

**Query Parameters:**
- `empresa` (requerido): Código de empresa

**Ejemplo:**
```bash
GET /api/proveedor/facturas/114?empresa=la-cantera
```

**Incluye:**
- Datos completos de la factura (Cxc)
- XML del SAT si existe (SatXml)
- Información del proveedor (Clie)
- Resumen con saldo pagado/pendiente

**Archivo**: [src/app/api/proveedor/facturas/[id]/route.ts](src/app/api/proveedor/facturas/[id]/route.ts)

---

#### 3. **GET /api/proveedor/complementos**
Lista complementos de pago del proveedor.

**Query Parameters:**
- `empresa` (opcional)
- `fecha_desde` (opcional): YYYY-MM-DD
- `fecha_hasta` (opcional): YYYY-MM-DD
- `limite` (opcional, default: 50)

**Ejemplo:**
```bash
GET /api/proveedor/complementos?empresa=la-cantera
```

**Características:**
- Agrupa complementos por UUID
- Muestra todas las facturas pagadas en cada complemento
- Resumen por empresa

**Archivo**: [src/app/api/proveedor/complementos/route.ts](src/app/api/proveedor/complementos/route.ts)

---

### Endpoints de Escritura (POST)

#### 4. **POST /api/proveedor/facturas/upload**
Permite a proveedores subir facturas en XML + PDF.

**Body (multipart/form-data):**
- `xml`: Archivo XML del CFDI (requerido)
- `pdf`: Archivo PDF (opcional)
- `empresa_code`: Código de empresa (requerido)

**Ejemplo con fetch:**
```javascript
const formData = new FormData();
formData.append('xml', xmlFile);
formData.append('pdf', pdfFile);
formData.append('empresa_code', 'la-cantera');

const response = await fetch('/api/proveedor/facturas/upload', {
  method: 'POST',
  body: formData
});
```

**Proceso:**
1. Autentica usuario (proveedor)
2. Parsea y valida XML CFDI
3. Verifica UUID no duplicado
4. Guarda archivos en servidor
5. Inserta registro en `proveedor_facturas`
6. Crea notificación para empresa
7. Retorna datos de la factura

**Validaciones:**
- XML debe ser CFDI válido (versión 3.3 o 4.0)
- Debe tener Timbre Fiscal Digital (UUID)
- Montos deben ser coherentes
- UUID no debe estar duplicado

**Archivo**: [src/app/api/proveedor/facturas/upload/route.ts](src/app/api/proveedor/facturas/upload/route.ts)

---

#### 5. **POST /api/proveedor/facturas/[id]/relacionar-ordenes**
Relaciona una factura con una o más órdenes de compra.

**URL Params:**
- `id`: UUID de la factura (de tabla `proveedor_facturas`)

**Body (JSON):**
```json
{
  "ordenes": [
    { "orden_erp_id": 12345, "monto_aplicado": 5000.00 },
    { "orden_erp_id": 12346, "monto_aplicado": 3000.00 }
  ]
}
```

**Validaciones:**
- Factura debe existir y pertenecer al proveedor
- Factura no debe estar cancelada/rechazada
- Suma de montos aplicados no puede exceder total de factura
- Cada orden debe existir en ERP y pertenecer al proveedor
- Monto aplicado por orden no puede exceder total de la orden

**Proceso:**
1. Valida factura y permisos
2. Valida que cada orden exista en el ERP
3. Elimina relaciones anteriores
4. Crea nuevas relaciones en `proveedor_facturas_ordenes`
5. Actualiza campo JSON `ordenes_relacionadas` en factura

**Archivo**: [src/app/api/proveedor/facturas/[id]/relacionar-ordenes/route.ts](src/app/api/proveedor/facturas/[id]/relacionar-ordenes/route.ts)

---

## 📦 Archivos Creados

### Librería CFDI Parser
**Archivo**: [src/lib/parsers/cfdi-parser.ts](src/lib/parsers/cfdi-parser.ts)

Parser completo de XML CFDI con soporte para:
- CFDI versión 3.3 y 4.0
- Tipos de comprobante: Ingreso, Egreso, Traslado, Pago, Nómina
- Timbre Fiscal Digital
- Impuestos (traslados y retenciones)
- Conceptos (líneas de factura)
- Complemento de Pago

**Funciones principales:**
```typescript
// Parsear XML a objeto tipado
const cfdiData = await parseCFDI(xmlString);

// Validar estructura
const validation = validateCFDI(cfdiData);
console.log(validation.isValid); // true/false
console.log(validation.errors); // Array de errores
console.log(validation.warnings); // Array de advertencias
```

---

## 🧪 Testing

### Guía de Testing
**Archivo**: [scripts/test-endpoints-facturas.md](scripts/test-endpoints-facturas.md)

Incluye:
- Ejemplos de curl para cada endpoint
- Respuestas esperadas
- Código de ejemplo para frontend
- Notas sobre estructura de datos

### Datos de Prueba en ERP

Según la exploración, hay facturas de ejemplo en `Cantera_ajustes`:

**Facturas (tabla Cxc):**
- ID 114: Factura FF204, CONCLUIDO, $393,907.77
- ID 113: Factura FF203, CANCELADO
- ID 112: Factura OI GG146, CANCELADO

**Complementos de Pago:**
- UUID 0A82F756...: Pagó 2 facturas el 2020-01-31 por $20,455.56
- UUID 0AEF3684...: Pago del 2019-12-26 por $10,910.06
- UUID 0C17FF37...: Pago del 2020-01-15 por $28,966.70

### Ejemplo de Prueba End-to-End

1. **Obtener facturas existentes:**
```bash
curl http://localhost:3000/api/proveedor/facturas?empresa=la-cantera
```

2. **Ver detalle de una factura:**
```bash
curl http://localhost:3000/api/proveedor/facturas/114?empresa=la-cantera
```

3. **Subir nueva factura:**
```bash
curl -X POST http://localhost:3000/api/proveedor/facturas/upload \
  -F "xml=@factura.xml" \
  -F "pdf=@factura.pdf" \
  -F "empresa_code=la-cantera"
```

4. **Relacionar con órdenes:**
```bash
curl -X POST http://localhost:3000/api/proveedor/facturas/{uuid}/relacionar-ordenes \
  -H "Content-Type: application/json" \
  -d '{"ordenes":[{"orden_erp_id":12345,"monto_aplicado":5000.00}]}'
```

---

## 🔒 Seguridad

### Autenticación
Todos los endpoints requieren:
- Sesión activa de NextAuth
- Usuario tipo `proveedor` o `admin`
- Mapping en tabla `portal_proveedor_mapping`

### Validaciones
- RFC emisor vs proveedor (pendiente implementar validación estricta)
- UUID no duplicado
- Montos coherentes
- Permisos por empresa
- Archivos XML válidos según estándar CFDI

### Almacenamiento
- Archivos separados por empresa y UUID
- XML guardado en BD y en servidor
- PDF solo en servidor (opcional)
- Rutas relativas en BD

---

## 🚀 Próximos Pasos (Opcionales)

### 1. Validación SAT
**Pendiente**: Implementar validación de UUID contra el SAT.

**Opciones:**
- API oficial del SAT (si existe)
- Servicio de PAC (Proveedor Autorizado de Certificación)
- Web scraping del portal de verificación SAT

**Archivo sugerido**: `src/lib/validators/sat-validator.ts`

**Proceso:**
- Validar UUID, RFC Emisor, RFC Receptor, Total
- Actualizar campos: `validado_sat`, `sat_estado`, `sat_mensaje`
- Puede ser asíncrono (cola de tareas)

---

### 2. Upload de Complementos de Pago
Similar al upload de facturas, pero para complementos (CFDI tipo "P").

**Archivo sugerido**: `src/app/api/proveedor/complementos/upload/route.ts`

**Diferencias:**
- Parsear nodo `Pagos` del complemento
- Extraer documentos relacionados (facturas que se pagan)
- Validar que las facturas existan previamente
- Guardar en tabla `proveedor_complementos_pago`

---

### 3. Dashboard de Facturas (Frontend)
Crear interfaz para proveedores:
- Lista de facturas subidas
- Filtros por empresa, fecha, estatus
- Detalle de factura con XML/PDF descargable
- Formulario de upload con drag & drop
- Selección de órdenes de compra para relacionar
- Visualización de complementos de pago

---

### 4. Aprobación/Rechazo de Facturas
Workflow para que empresas aprueben o rechacen facturas:
- Endpoint `PATCH /api/admin/facturas/[id]/aprobar`
- Endpoint `PATCH /api/admin/facturas/[id]/rechazar`
- Notificaciones al proveedor
- Actualizar campo `estatus`

---

### 5. Reportes y Métricas
- Total de facturas por empresa
- Monto total facturado
- Facturas pendientes de aprobación
- Facturas con saldo pendiente
- Exportación a Excel/PDF

---

## 📊 Estructura de Base de Datos

### Tabla: proveedor_facturas
Almacena facturas subidas por proveedores.

**Columnas principales:**
- `id` (UNIQUEIDENTIFIER) - PK
- `portal_user_id` - Usuario que subió
- `empresa_code` - Empresa receptora
- `uuid` - Folio fiscal (único)
- `rfc_emisor`, `rfc_receptor`
- `subtotal`, `impuestos`, `total`
- `xml_contenido`, `xml_ruta`, `pdf_ruta`
- `validado_sat`, `sat_estado`
- `estatus` - PENDIENTE, APROBADA, RECHAZADA
- `ordenes_relacionadas` (JSON)

### Tabla: proveedor_facturas_ordenes
Relación muchos-a-muchos entre facturas y órdenes.

**Columnas:**
- `id` (UNIQUEIDENTIFIER) - PK
- `factura_id` - FK a proveedor_facturas
- `empresa_code`
- `orden_erp_id` - ID en tabla Compra del ERP
- `orden_folio`
- `monto_aplicado`

### Tabla: proveedor_complementos_pago
Complementos de pago subidos.

**Columnas:**
- `id` (UNIQUEIDENTIFIER) - PK
- `portal_user_id`
- `empresa_code`
- `uuid` - Folio fiscal del complemento
- `fecha_pago`, `monto`
- `facturas_relacionadas` (JSON)
- `xml_contenido`, `xml_ruta`

---

## ❓ Preguntas Frecuentes

### ¿Qué versiones de CFDI soporta?
CFDI 3.3 y 4.0

### ¿Es obligatorio subir el PDF?
No, solo el XML es obligatorio. El PDF es opcional.

### ¿Se puede relacionar una factura con múltiples órdenes?
Sí, ese es el caso de uso principal.

### ¿Se valida contra el SAT automáticamente?
No aún. Está pendiente implementar (ver "Próximos Pasos").

### ¿Qué pasa si subo la misma factura dos veces?
El sistema detecta UUID duplicado y rechaza la segunda subida.

### ¿Dónde se guardan los archivos?
En `uploads/facturas/{empresa}/{uuid}/` en el servidor.

### ¿Se puede editar una factura después de subirla?
No. Solo se puede relacionar con órdenes o cambiar estatus (aprobar/rechazar).

### ¿Qué tipos de comprobante soporta?
Principalmente Ingreso (I). También puede parsear Pago (P), Egreso (E), Traslado (T), y Nómina (N).

---

## 📞 Soporte

Si encuentras errores o necesitas ayuda:
1. Revisa logs del servidor (`console.log` en endpoints)
2. Verifica que las tablas existan en BD Portal
3. Confirma que el directorio `uploads/` tenga permisos
4. Valida que el XML sea un CFDI válido del SAT

---

## ✅ Checklist de Implementación

- [x] Parser CFDI creado
- [x] Endpoint GET facturas
- [x] Endpoint GET factura por ID
- [x] Endpoint GET complementos
- [x] Endpoint POST upload factura
- [x] Endpoint POST relacionar órdenes
- [ ] Ejecutar script de BD en Portal (PP)
- [ ] Crear directorio uploads/
- [ ] Probar upload de factura
- [ ] Probar relación con órdenes
- [ ] Implementar validación SAT (opcional)
- [ ] Crear interfaz frontend (opcional)

---

¡Sistema de Facturas Completado! 🎉
