# Testing Endpoints de Facturas y Complementos

## Endpoints Creados

### 1. GET /api/proveedor/facturas
Obtiene listado de facturas del proveedor desde tabla Cxc

**Query Parameters:**
- `empresa` (opcional): la-cantera, peralillo, plaza-galerena, inmobiliaria-galerena, icrear
- `fecha_desde` (opcional): YYYY-MM-DD
- `fecha_hasta` (opcional): YYYY-MM-DD
- `estatus` (opcional): CONCLUIDO, CANCELADO, PENDIENTE
- `limite` (opcional, default: 50)

**Ejemplo de prueba:**
```bash
# Listar todas las facturas
curl http://localhost:3000/api/proveedor/facturas \
  -H "Cookie: your-session-cookie"

# Filtrar por empresa
curl http://localhost:3000/api/proveedor/facturas?empresa=la-cantera \
  -H "Cookie: your-session-cookie"

# Filtrar por fechas
curl http://localhost:3000/api/proveedor/facturas?fecha_desde=2024-01-01&fecha_hasta=2024-12-31 \
  -H "Cookie: your-session-cookie"

# Filtrar por estatus
curl http://localhost:3000/api/proveedor/facturas?estatus=CONCLUIDO \
  -H "Cookie: your-session-cookie"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "userId": "...",
  "totalFacturas": 10,
  "totalEmpresas": 3,
  "filtros": {
    "empresa": null,
    "fecha_desde": null,
    "fecha_hasta": null,
    "estatus": null,
    "limite": 50
  },
  "resumenPorEmpresa": {
    "la-cantera": {
      "codigoProveedor": "P00443",
      "totalFacturas": 5,
      "montoTotal": "150000.00",
      "saldoTotal": "50000.00",
      "montoMoneda": "MXN"
    }
  },
  "facturas": [
    {
      "ID": 114,
      "Empresa": "01",
      "Folio": "FF204",
      "MovID": "FF204",
      "FechaEmision": "2019-08-05T00:00:00.000Z",
      "Moneda": "Pesos",
      "TipoCambio": 1,
      "CodigoCliente": "C00006",
      "Subtotal": 364729.4198,
      "Impuestos": 29178.3536,
      "Total": 393907.7734,
      "Saldo": 0,
      "Estatus": "CONCLUIDO",
      "Referencia": "11 Julio-24 Julio",
      "Observaciones": "Estimacion Control BIS2",
      "EmpresaCodigo": "la-cantera",
      "EmpresaNombre": "La Cantera",
      "CodigoProveedor": "P00443"
    }
  ]
}
```

---

### 2. GET /api/proveedor/facturas/[id]
Obtiene detalle completo de una factura específica

**URL Params:**
- `id`: ID de la factura

**Query Parameters:**
- `empresa` (requerido): Código de empresa

**Ejemplo de prueba:**
```bash
# Obtener detalle de factura ID 114 de La Cantera
curl http://localhost:3000/api/proveedor/facturas/114?empresa=la-cantera \
  -H "Cookie: your-session-cookie"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "factura": {
    "ID": 114,
    "Empresa": "01",
    "Folio": "FF204",
    "MovID": "FF204",
    "FechaEmision": "2019-08-05T00:00:00.000Z",
    "UltimoCambio": "2019-09-05T00:00:00.000Z",
    "Concepto": null,
    "Proyecto": "17 BISMARK",
    "Moneda": "Pesos",
    "TipoCambio": 1,
    "Usuario": "CMONTES",
    "Referencia": "11 Julio-24 Julio",
    "Observaciones": "Estimacion Control BIS2 -",
    "Estatus": "CONCLUIDO",
    "Subtotal": 364729.4198,
    "Impuestos": 29178.3536,
    "Total": 393907.7734,
    "Saldo": 0,
    "Vencimiento": "2019-08-05T00:00:00.000Z",
    "EmpresaCodigo": "la-cantera",
    "EmpresaNombre": "La Cantera",
    "CodigoProveedor": "C00006"
  },
  "xml": {
    "UUID": "68803DD6-570F-4B1C-A0AD-D71EC35B84EA",
    "RFCEmisor": "ACE140813E29",
    "NombreEmisor": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL",
    "RFCReceptor": "LCM990101XXX",
    "NombreReceptor": "LA CANTERA DESARROLLOS MINEROS",
    "FechadeEmision": "2019-08-05T00:00:00.000Z",
    "Total": 393907.77,
    "SubTotal": 364729.42,
    "EstadodelComprobante": "VIGENTE"
  },
  "proveedor": {
    "Codigo": "C00006",
    "Nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
    "RFC": "ACE140813E29",
    "Telefono1": "...",
    "Email": "...",
    "Estatus": "ALTA"
  },
  "resumen": {
    "subtotal": 364729.42,
    "impuestos": 29178.35,
    "retencion": 0,
    "total": 393907.77,
    "saldo": 0,
    "pagado": 393907.77,
    "moneda": "Pesos",
    "estaPagada": true,
    "estaCancelada": false
  }
}
```

---

### 3. GET /api/proveedor/complementos
Obtiene listado de complementos de pago del proveedor

**Query Parameters:**
- `empresa` (opcional): la-cantera, peralillo, etc.
- `fecha_desde` (opcional): YYYY-MM-DD
- `fecha_hasta` (opcional): YYYY-MM-DD
- `limite` (opcional, default: 50)

**Ejemplo de prueba:**
```bash
# Listar todos los complementos
curl http://localhost:3000/api/proveedor/complementos \
  -H "Cookie: your-session-cookie"

# Filtrar por empresa
curl http://localhost:3000/api/proveedor/complementos?empresa=la-cantera \
  -H "Cookie: your-session-cookie"

# Filtrar por fechas
curl http://localhost:3000/api/proveedor/complementos?fecha_desde=2020-01-01&fecha_hasta=2020-12-31 \
  -H "Cookie: your-session-cookie"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "userId": "...",
  "totalComplementos": 3,
  "totalDocumentosPagados": 5,
  "totalEmpresas": 1,
  "filtros": {
    "empresa": null,
    "fecha_desde": null,
    "fecha_hasta": null,
    "limite": 50
  },
  "resumenPorEmpresa": {
    "la-cantera": {
      "codigoProveedor": "P00443",
      "totalComplementos": 3,
      "montoTotal": "60332.32",
      "montoMoneda": "MXN"
    }
  },
  "complementos": [
    {
      "ID": 1,
      "ComplementoUUID": "0A82F756-2D73-4283-AEC6-53EE9FFBD165",
      "FechaPago": "2020-01-31T12:00:00.000Z",
      "FormaPago": "03",
      "Moneda": "MXN",
      "MontoTotal": 20455.56,
      "EmpresaCodigo": "la-cantera",
      "EmpresaNombre": "La Cantera",
      "CodigoProveedor": "P00443",
      "facturasRelacionadas": [
        {
          "FacturaUUID": "68803DD6-570F-4B1C-A0AD-D71EC35B84EA",
          "FacturaFolio": "284735",
          "FacturaMoneda": "MXN",
          "MetodoPago": "PPD",
          "Parcialidad": 1,
          "SaldoAnterior": 17547.75,
          "MontoPagado": 17547.75,
          "SaldoPendiente": 0
        },
        {
          "FacturaUUID": "A16503DD-9484-4270-9D35-8E43C2AC6FEF",
          "FacturaFolio": "32852",
          "FacturaMoneda": "MXN",
          "MetodoPago": "PPD",
          "Parcialidad": 1,
          "SaldoAnterior": 2907.81,
          "MontoPagado": 2907.81,
          "SaldoPendiente": 0
        }
      ]
    }
  ]
}
```

---

## Testing desde el Frontend

### En React/Next.js:

```typescript
// Ejemplo de hook para obtener facturas
async function fetchFacturas(filtros?: {
  empresa?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estatus?: string;
  limite?: number;
}) {
  const params = new URLSearchParams();
  if (filtros?.empresa) params.append('empresa', filtros.empresa);
  if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
  if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
  if (filtros?.estatus) params.append('estatus', filtros.estatus);
  if (filtros?.limite) params.append('limite', filtros.limite.toString());

  const response = await fetch(`/api/proveedor/facturas?${params.toString()}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data;
}

// Ejemplo de uso
const { facturas, resumenPorEmpresa } = await fetchFacturas({
  empresa: 'la-cantera',
  fecha_desde: '2024-01-01',
  estatus: 'CONCLUIDO'
});
```

---

## Notas Importantes

### Estructura de Datos

**Tabla Cxc (Facturas):**
- `Cliente` = Código del proveedor (en el contexto de facturas que la empresa recibe)
- `Importe` = Subtotal
- `Impuestos` = IVA y otros impuestos
- `Saldo` = Monto pendiente de pago
- `Estatus` = CONCLUIDO, CANCELADO, PENDIENTE, etc.

**Tabla CFDI_Complementopago:**
- `UUID` = Folio fiscal del complemento de pago
- `FechaPago` = Fecha en que se realizó el pago
- `FormaDePagoP` = Forma de pago (01=Efectivo, 02=Cheque, 03=Transferencia, etc.)
- `MonedaP` = Moneda del pago
- `Monto` = Monto total del complemento

**Tabla CFDI_ComplementopagoD:**
- `UUID` = UUID del complemento (relaciona con CFDI_Complementopago)
- `IdDocumento` = UUID de la factura que se está pagando
- `ImpPagado` = Monto pagado de esa factura específica
- `ImpSaldoInsoluto` = Saldo pendiente después del pago

### Autenticación

Todos los endpoints requieren:
1. Sesión activa (NextAuth)
2. Usuario tipo proveedor
3. Mapping en tabla `portal_proveedor_mapping`

### Códigos de Error

- `401`: No autenticado
- `403`: Sin acceso a la empresa solicitada
- `404`: Recurso no encontrado (factura, empresa, etc.)
- `400`: Parámetros faltantes o inválidos
- `500`: Error interno del servidor

---

## Siguiente Paso

Una vez probados y funcionando estos endpoints de lectura, proceder con:
1. Ejecutar `crear-tabla-facturas-proveedor.sql` en Portal DB (PP)
2. Implementar endpoints de upload (XML + PDF)
3. Implementar parser CFDI
4. Implementar validación SAT
