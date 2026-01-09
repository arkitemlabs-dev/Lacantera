# Especificacion de Stored Procedures - Facturas

## Documento de Requerimientos para el Equipo de Base de Datos

**Fecha:** Enero 2026
**Sistema:** Portal de Proveedores - La Cantera
**Base de Datos ERP:** Intelisis
**Base de Datos Portal:** PP

---

## Resumen

Este documento especifica los stored procedures requeridos para el modulo de Facturacion. El objetivo es migrar la logica de consultas del codigo de aplicacion a la base de datos para mejorar rendimiento y mantenibilidad.

**IMPORTANTE:** El portal requiere consultar facturas en TODOS los estatus:
- EN_REVISION (pendiente de revision por administrador)
- APROBADA (aprobada, pendiente de pago)
- PAGADA (factura pagada)
- RECHAZADA (factura rechazada)
- Todas (sin filtro de estatus)

---

## SP 1: sp_GetFacturas

### Descripcion
Obtiene listado de facturas con paginacion y filtros para la vista del administrador. Soporta filtrar por estatus o traer todas.

### Uso en el Sistema
- **API:** `GET /api/admin/facturas`
- **Pantalla:** Dashboard de administrador - Listado de facturas
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @Proveedor | VARCHAR(20) | NO | NULL | Codigo del proveedor para filtrar. Si es NULL, trae todos |
| @RFC | VARCHAR(13) | NO | NULL | RFC del proveedor para filtrar. Si es NULL, no filtra por RFC |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa ('01', '02', etc.). Si es NULL, trae todas |
| @Estatus | VARCHAR(20) | NO | NULL | Estatus a filtrar: 'EN_REVISION', 'APROBADA', 'PAGADA', 'RECHAZADA'. Si es NULL o 'todas', trae todos los estatus |
| @FechaDesde | DATE | NO | NULL | Fecha minima de emision (inclusive). Formato: YYYY-MM-DD |
| @FechaHasta | DATE | NO | NULL | Fecha maxima de emision (inclusive). Formato: YYYY-MM-DD |
| @NumeroFactura | VARCHAR(50) | NO | NULL | Busqueda por numero de factura (folio). Busqueda parcial con LIKE |
| @Page | INT | NO | 1 | Numero de pagina (1-based) |
| @Limit | INT | NO | 10 | Registros por pagina. Default 10 segun el frontend |

### Campos de Salida Requeridos (Result Set 1 - Facturas)

| Campo | Tipo SQL | Alias Requerido | Mapeo Frontend | Descripcion |
|-------|----------|-----------------|----------------|-------------|
| ID | INT | ID | id | ID unico de la factura |
| Empresa | VARCHAR(10) | Empresa | empresaId | Codigo de empresa |
| Folio | VARCHAR(50) | Folio | invoiceNumber | Numero de factura/folio fiscal |
| Serie | VARCHAR(10) | Serie | - | Serie del CFDI |
| UUID | VARCHAR(36) | UUID | cfdi | UUID del CFDI (Folio Fiscal Digital) |
| MovID | VARCHAR(20) | MovID | - | ID del movimiento |
| FechaEmision | DATETIME | FechaEmision | entryDate | Fecha de emision de la factura |
| Proveedor | VARCHAR(20) | Proveedor | - | Codigo del proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | supplierName | Nombre del proveedor (JOIN con Prov.Nombre) |
| ProveedorRFC | VARCHAR(13) | ProveedorRFC | - | RFC del proveedor (JOIN con Prov.RFC) |
| Moneda | VARCHAR(10) | Moneda | - | Codigo de moneda (MXN, USD) |
| TipoCambio | DECIMAL(18,4) | TipoCambio | - | Tipo de cambio |
| Subtotal | DECIMAL(18,2) | Subtotal | - | Subtotal sin impuestos |
| Impuestos | DECIMAL(18,2) | Impuestos | - | Total de impuestos (IVA) |
| Total | DECIMAL(18,2) | Total | amount | Monto total de la factura |
| Saldo | DECIMAL(18,2) | Saldo | - | Saldo pendiente de pago |
| Estatus | VARCHAR(20) | Estatus | status | Estatus de la factura |
| OrdenCompraID | INT | OrdenCompraID | - | ID de la orden de compra asociada |
| OrdenCompraMovID | VARCHAR(20) | OrdenCompraMovID | purchaseOrderIds | Numero de la OC asociada |
| Referencia | VARCHAR(50) | Referencia | - | Referencia externa |
| Observaciones | VARCHAR(MAX) | Observaciones | - | Observaciones/notas |
| Usuario | VARCHAR(50) | Usuario | - | Usuario que registro |
| FechaRegistro | DATETIME | FechaRegistro | - | Fecha de registro en sistema |
| FechaRevision | DATETIME | FechaRevision | - | Fecha de revision |
| RevisadoPor | VARCHAR(50) | RevisadoPor | - | Usuario que reviso |
| MotivoRechazo | VARCHAR(500) | MotivoRechazo | - | Motivo de rechazo (si aplica) |
| UrlPDF | VARCHAR(500) | UrlPDF | - | URL del archivo PDF |
| UrlXML | VARCHAR(500) | UrlXML | - | URL del archivo XML |

### Campos de Salida Requeridos (Result Set 2 - Conteo Total)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Total | INT | Total | Total de registros sin paginacion |

### Mapeo de Estatus ERP a Portal

```sql
-- El ERP puede usar diferentes valores de estatus
-- El SP debe mapear al estatus del portal:
CASE
    WHEN c.Estatus = 'PENDIENTE' THEN 'EN_REVISION'
    WHEN c.Estatus = 'CONCLUIDO' AND c.Saldo > 0 THEN 'APROBADA'
    WHEN c.Estatus = 'CONCLUIDO' AND c.Saldo = 0 THEN 'PAGADA'
    WHEN c.Estatus = 'CANCELADO' THEN 'RECHAZADA'
    ELSE c.Estatus
END AS Estatus
```

### Logica de Filtro por Estatus
```sql
-- Si @Estatus es NULL o 'todas', NO filtrar por estatus
-- Si @Estatus tiene valor especifico, agregar filtro con mapeo inverso:
AND (
    @Estatus IS NULL
    OR @Estatus = 'todas'
    OR (
        (@Estatus = 'EN_REVISION' AND c.Estatus = 'PENDIENTE')
        OR (@Estatus = 'APROBADA' AND c.Estatus = 'CONCLUIDO' AND c.Saldo > 0)
        OR (@Estatus = 'PAGADA' AND c.Estatus = 'CONCLUIDO' AND c.Saldo = 0)
        OR (@Estatus = 'RECHAZADA' AND c.Estatus = 'CANCELADO')
    )
)
```

### Ordenamiento
```sql
ORDER BY c.FechaEmision DESC
```

### Ejemplo de Llamada - Solo En Revision
```sql
EXEC sp_GetFacturas
    @Proveedor = NULL,
    @Estatus = 'EN_REVISION',
    @FechaDesde = '2024-01-01',
    @FechaHasta = '2024-12-31',
    @Page = 1,
    @Limit = 10
```

### Ejemplo de Llamada - Todas las Facturas
```sql
EXEC sp_GetFacturas
    @Empresa = '01',
    @Estatus = NULL,  -- o 'todas'
    @Page = 1,
    @Limit = 10
```

### Ejemplo de Llamada - Por Proveedor y Numero de Factura
```sql
EXEC sp_GetFacturas
    @Proveedor = 'P00443',
    @NumeroFactura = 'FACT-001',
    @Page = 1,
    @Limit = 10
```

---

## SP 2: sp_GetFacturaPorID

### Descripcion
Obtiene los detalles completos de una factura especifica por su ID. Incluye datos del XML, informacion del proveedor y orden de compra asociada.

### Uso en el Sistema
- **API:** `GET /api/admin/facturas/[id]`
- **Pantalla:** Modal de revision de factura (administrador)
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @ID | INT | SI | - | ID de la factura |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa (validacion adicional) |

### Campos de Salida Requeridos (Result Set 1 - Encabezado Factura)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID de la factura |
| Empresa | VARCHAR(10) | Empresa | Codigo empresa |
| Folio | VARCHAR(50) | Folio | Numero de factura |
| Serie | VARCHAR(10) | Serie | Serie del CFDI |
| UUID | VARCHAR(36) | UUID | UUID del CFDI |
| MovID | VARCHAR(20) | MovID | ID movimiento |
| FechaEmision | DATETIME | FechaEmision | Fecha emision |
| UltimoCambio | DATETIME | UltimoCambio | Fecha ultimo cambio |
| Concepto | VARCHAR(50) | Concepto | Concepto |
| Proyecto | VARCHAR(50) | Proyecto | Proyecto |
| Moneda | VARCHAR(10) | Moneda | Moneda |
| TipoCambio | DECIMAL(18,4) | TipoCambio | Tipo cambio |
| Usuario | VARCHAR(50) | Usuario | Usuario creador |
| Referencia | VARCHAR(50) | Referencia | Referencia |
| Observaciones | VARCHAR(MAX) | Observaciones | Observaciones |
| Estatus | VARCHAR(20) | Estatus | Estatus (mapeado) |
| EstatusERP | VARCHAR(20) | EstatusERP | Estatus original ERP |
| Proveedor | VARCHAR(20) | Proveedor | Codigo proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre proveedor |
| ProveedorRFC | VARCHAR(13) | ProveedorRFC | RFC proveedor |
| ProveedorEmail | VARCHAR(100) | ProveedorEmail | Email proveedor |
| Subtotal | DECIMAL(18,2) | Subtotal | Subtotal |
| Impuestos | DECIMAL(18,2) | Impuestos | Impuestos |
| Total | DECIMAL(18,2) | Total | Total |
| Saldo | DECIMAL(18,2) | Saldo | Saldo pendiente |
| Vencimiento | DATETIME | Vencimiento | Fecha vencimiento |
| Condicion | VARCHAR(50) | Condicion | Condicion pago |
| FormaCobro | VARCHAR(50) | FormaCobro | Forma de cobro |
| FechaRegistro | DATETIME | FechaRegistro | Fecha registro |
| FechaConclusion | DATETIME | FechaConclusion | Fecha conclusion |
| FechaCancelacion | DATETIME | FechaCancelacion | Fecha cancelacion |
| FechaRevision | DATETIME | FechaRevision | Fecha revision |
| RevisadoPor | VARCHAR(50) | RevisadoPor | Usuario revisor |
| MotivoRechazo | VARCHAR(500) | MotivoRechazo | Motivo rechazo |
| UrlPDF | VARCHAR(500) | UrlPDF | URL archivo PDF |
| UrlXML | VARCHAR(500) | UrlXML | URL archivo XML |

### Campos de Salida Requeridos (Result Set 2 - Datos XML/SAT)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| FolioFiscal | VARCHAR(36) | FolioFiscal | UUID del CFDI |
| RFCEmisor | VARCHAR(13) | RFCEmisor | RFC del emisor (proveedor) |
| NombreEmisor | VARCHAR(200) | NombreEmisor | Razon social emisor |
| RFCReceptor | VARCHAR(13) | RFCReceptor | RFC del receptor (empresa) |
| NombreReceptor | VARCHAR(200) | NombreReceptor | Razon social receptor |
| FechaEmisionXML | DATETIME | FechaEmisionXML | Fecha emision del XML |
| SubtotalXML | DECIMAL(18,2) | SubtotalXML | Subtotal del XML |
| ImpuestosXML | DECIMAL(18,2) | ImpuestosXML | Impuestos del XML |
| TotalXML | DECIMAL(18,2) | TotalXML | Total del XML |
| MonedaXML | VARCHAR(10) | MonedaXML | Moneda del XML |
| SerieXML | VARCHAR(10) | SerieXML | Serie del XML |
| FolioXML | VARCHAR(50) | FolioXML | Folio del XML |
| EstadoComprobante | VARCHAR(20) | EstadoComprobante | Estado en SAT (vigente/cancelado) |
| EsCancelable | BIT | EsCancelable | Si es cancelable |
| ValidadoSAT | BIT | ValidadoSAT | Si fue validado con SAT |
| FechaValidacionSAT | DATETIME | FechaValidacionSAT | Fecha validacion SAT |

### Campos de Salida Requeridos (Result Set 3 - Orden de Compra Asociada)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| OrdenID | INT | OrdenID | ID de la orden |
| OrdenMov | VARCHAR(20) | OrdenMov | Tipo movimiento |
| OrdenMovID | VARCHAR(20) | OrdenMovID | Numero de orden |
| OrdenFechaEmision | DATETIME | OrdenFechaEmision | Fecha emision OC |
| OrdenEstatus | VARCHAR(20) | OrdenEstatus | Estatus de la OC |
| OrdenImporte | DECIMAL(18,2) | OrdenImporte | Importe de la OC |

### Comportamiento si no existe
- Retornar result set vacio (0 filas)
- El codigo de aplicacion manejara el error 404

### Ejemplo de Llamada
```sql
EXEC sp_GetFacturaPorID @ID = 12345, @Empresa = '01'
```

---

## SP 3: sp_GetFacturasStats

### Descripcion
Obtiene estadisticas de facturas para el dashboard del administrador. Conteos por estatus y montos totales.

### Uso en el Sistema
- **API:** `GET /api/admin/facturas/stats`
- **Pantalla:** Dashboard de administrador - Widgets de KPI de facturas
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa. Si es NULL, todas las empresas |
| @Proveedor | VARCHAR(20) | NO | NULL | Codigo proveedor. Si es NULL, todos los proveedores |
| @FechaDesde | DATE | NO | NULL | Fecha minima para estadisticas |
| @FechaHasta | DATE | NO | NULL | Fecha maxima para estadisticas |

### Campos de Salida Requeridos

#### Result Set 1 - Totales por Estatus
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| TotalFacturas | INT | TotalFacturas | Total de facturas |
| TotalEnRevision | INT | TotalEnRevision | Cantidad en revision |
| TotalAprobadas | INT | TotalAprobadas | Cantidad aprobadas (pendiente pago) |
| TotalPagadas | INT | TotalPagadas | Cantidad pagadas |
| TotalRechazadas | INT | TotalRechazadas | Cantidad rechazadas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma total de todas las facturas |
| MontoEnRevision | DECIMAL(18,2) | MontoEnRevision | Suma facturas en revision |
| MontoAprobadas | DECIMAL(18,2) | MontoAprobadas | Suma facturas aprobadas |
| MontoPagadas | DECIMAL(18,2) | MontoPagadas | Suma facturas pagadas |
| MontoPendientePago | DECIMAL(18,2) | MontoPendientePago | Suma saldos pendientes |

#### Result Set 2 - Top 10 Proveedores por Facturacion
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Proveedor | VARCHAR(20) | Proveedor | Codigo del proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre del proveedor |
| CantidadFacturas | INT | CantidadFacturas | Numero de facturas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma de montos |

#### Result Set 3 - Facturacion por Mes (ultimos 6 meses)
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Anio | INT | Anio | Ano |
| Mes | INT | Mes | Mes (1-12) |
| CantidadFacturas | INT | CantidadFacturas | Numero de facturas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma de montos |

**Nota:** Incluir el mes actual + 5 meses anteriores = 6 registros total. Ordenar de mas antiguo a mas reciente.

#### Result Set 4 - Por Estatus (para grafico de pastel)
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Estatus | VARCHAR(20) | Estatus | Estatus de la factura |
| Cantidad | INT | Cantidad | Numero de facturas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma de montos |

### Ejemplo de Llamada
```sql
EXEC sp_GetFacturasStats @Empresa = '01', @Proveedor = NULL
```

---

## SP 4: sp_GetFacturasProveedor

### Descripcion
Obtiene facturas para un proveedor especifico (vista del portal del proveedor). Incluye TODAS las facturas del proveedor con sus diferentes estatus.

### Uso en el Sistema
- **API:** `GET /api/proveedor/facturas`
- **Pantalla:** Portal del proveedor - Mis facturas
- **Roles que lo usan:** `proveedor`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @RFC | VARCHAR(13) | SI | - | RFC del proveedor (OBLIGATORIO) |
| @Empresa | VARCHAR(10) | SI | - | Codigo de empresa ERP: '01', '02', etc. (OBLIGATORIO) |
| @Estatus | VARCHAR(20) | NO | NULL | Estatus a filtrar: 'EN_REVISION', 'APROBADA', 'PAGADA', 'RECHAZADA'. Si es NULL, trae todos |
| @FechaDesde | DATE | NO | NULL | Fecha minima de emision |
| @FechaHasta | DATE | NO | NULL | Fecha maxima de emision |
| @Busqueda | VARCHAR(50) | NO | NULL | Busqueda por folio o numero de orden |
| @Page | INT | NO | 1 | Numero de pagina (1-based) |
| @Limit | INT | NO | 50 | Registros por pagina |

### Campos de Salida Requeridos (Result Set 1 - Facturas)

| Campo | Tipo SQL | Alias Requerido | Mapeo Frontend | Descripcion |
|-------|----------|-----------------|----------------|-------------|
| ID | INT | ID | id | ID de la factura |
| Folio | VARCHAR(50) | Folio | folio | Numero de factura |
| Serie | VARCHAR(10) | Serie | - | Serie CFDI |
| UUID | VARCHAR(36) | UUID | cfdi | UUID del CFDI |
| Empresa | VARCHAR(10) | Empresa | - | Codigo empresa |
| FechaEmision | DATETIME | FechaEmision | fechaEmision | Fecha emision |
| Moneda | VARCHAR(10) | Moneda | - | Moneda |
| TipoCambio | DECIMAL(18,4) | TipoCambio | - | Tipo cambio |
| Subtotal | DECIMAL(18,2) | Subtotal | - | Subtotal |
| Impuestos | DECIMAL(18,2) | Impuestos | - | Impuestos |
| Total | DECIMAL(18,2) | Total | monto | Monto total |
| Saldo | DECIMAL(18,2) | Saldo | - | Saldo pendiente |
| Estatus | VARCHAR(20) | Estatus | estado | Estatus (mapeado al portal) |
| OrdenCompraID | INT | OrdenCompraID | - | ID orden asociada |
| OrdenCompraMovID | VARCHAR(20) | OrdenCompraMovID | ordenAsociada | Numero de OC asociada |
| Referencia | VARCHAR(50) | Referencia | - | Referencia |
| Observaciones | VARCHAR(MAX) | Observaciones | - | Observaciones |
| MotivoRechazo | VARCHAR(500) | MotivoRechazo | - | Motivo de rechazo |
| UrlPDF | VARCHAR(500) | UrlPDF | - | URL archivo PDF |
| UrlXML | VARCHAR(500) | UrlXML | - | URL archivo XML |
| FechaRegistro | DATETIME | FechaRegistro | - | Fecha registro |
| FechaRevision | DATETIME | FechaRevision | - | Fecha revision |

### Campos de Salida Requeridos (Result Set 2 - Conteo Total)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Total | INT | Total | Total de registros sin paginacion |

### Filtros Obligatorios
```sql
WHERE p.RFC = @RFC
  AND c.Empresa = @Empresa
```

### Logica de Busqueda
```sql
-- Si @Busqueda tiene valor, buscar en folio y numero de orden
AND (
    @Busqueda IS NULL
    OR c.Folio LIKE '%' + @Busqueda + '%'
    OR oc.MovID LIKE '%' + @Busqueda + '%'
)
```

### Ordenamiento
```sql
ORDER BY c.FechaEmision DESC
```

### Ejemplo de Llamada - Todas las Facturas del Proveedor
```sql
EXEC sp_GetFacturasProveedor
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Estatus = NULL,
    @Page = 1,
    @Limit = 50
```

### Ejemplo de Llamada - Solo Aprobadas
```sql
EXEC sp_GetFacturasProveedor
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Estatus = 'APROBADA',
    @FechaDesde = '2024-01-01',
    @Page = 1,
    @Limit = 50
```

### Ejemplo de Llamada - Busqueda por Folio
```sql
EXEC sp_GetFacturasProveedor
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Busqueda = 'FACT-001',
    @Page = 1,
    @Limit = 50
```

---

## SP 5: sp_GetFacturasProveedorStats

### Descripcion
Obtiene estadisticas de facturas para el dashboard del proveedor. Conteos y montos por estatus.

### Uso en el Sistema
- **API:** `GET /api/proveedor/facturas/stats`
- **Pantalla:** Portal del proveedor - Dashboard KPIs
- **Roles que lo usan:** `proveedor`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @RFC | VARCHAR(13) | SI | - | RFC del proveedor (OBLIGATORIO) |
| @Empresa | VARCHAR(10) | SI | - | Codigo de empresa (OBLIGATORIO) |

### Campos de Salida Requeridos

#### Result Set 1 - Totales
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| TotalFacturas | INT | TotalFacturas | Total de facturas del proveedor |
| TotalEnRevision | INT | TotalEnRevision | Cantidad en revision |
| TotalAprobadas | INT | TotalAprobadas | Cantidad aprobadas |
| TotalPagadas | INT | TotalPagadas | Cantidad pagadas |
| TotalRechazadas | INT | TotalRechazadas | Cantidad rechazadas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma total facturado |
| MontoPendientePago | DECIMAL(18,2) | MontoPendientePago | Suma pendiente de pago |
| MontoPagado | DECIMAL(18,2) | MontoPagado | Suma ya pagado |

#### Result Set 2 - Facturacion por Mes (ultimos 6 meses)
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Anio | INT | Anio | Ano |
| Mes | INT | Mes | Mes (1-12) |
| CantidadFacturas | INT | CantidadFacturas | Numero de facturas |
| MontoTotal | DECIMAL(18,2) | MontoTotal | Suma de montos |

### Ejemplo de Llamada
```sql
EXEC sp_GetFacturasProveedorStats
    @RFC = 'XAXX010101000',
    @Empresa = '01'
```

---

## SP 6: sp_ValidarFacturaDuplicada

### Descripcion
Verifica si ya existe una factura con el mismo UUID para evitar duplicados al subir nuevas facturas.

### Uso en el Sistema
- **API:** `POST /api/proveedor/facturas/upload`
- **Pantalla:** Portal del proveedor - Subir factura
- **Roles que lo usan:** `proveedor`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @UUID | VARCHAR(36) | SI | - | UUID del CFDI a validar |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa |

### Campos de Salida Requeridos

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Existe | BIT | Existe | 1 si existe, 0 si no existe |
| FacturaID | INT | FacturaID | ID de la factura existente (NULL si no existe) |
| Folio | VARCHAR(50) | Folio | Folio de la factura existente |
| Estatus | VARCHAR(20) | Estatus | Estatus de la factura existente |
| FechaRegistro | DATETIME | FechaRegistro | Fecha de registro de la existente |

### Ejemplo de Llamada
```sql
EXEC sp_ValidarFacturaDuplicada
    @UUID = '6BA7B810-9DAD-11D1-80B4-00C04FD430C8',
    @Empresa = '01'
```

---

## SP 7: sp_GetFacturaConOrdenCompra

### Descripcion
Obtiene una factura junto con los detalles de la orden de compra asociada. Util para validar que los conceptos de la factura coincidan con la orden.

### Uso en el Sistema
- **API:** `GET /api/admin/facturas/[id]/validar`
- **Pantalla:** Modal de revision - Validacion de conceptos
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @FacturaID | INT | SI | - | ID de la factura |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa |

### Campos de Salida Requeridos

#### Result Set 1 - Factura (mismo que sp_GetFacturaPorID Result Set 1)

#### Result Set 2 - Orden de Compra Encabezado
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| OrdenID | INT | OrdenID | ID de la orden |
| OrdenMov | VARCHAR(20) | OrdenMov | Tipo movimiento |
| OrdenMovID | VARCHAR(20) | OrdenMovID | Numero de orden |
| OrdenFechaEmision | DATETIME | OrdenFechaEmision | Fecha emision |
| OrdenEstatus | VARCHAR(20) | OrdenEstatus | Estatus |
| OrdenImporte | DECIMAL(18,2) | OrdenImporte | Importe |
| OrdenImpuestos | DECIMAL(18,2) | OrdenImpuestos | Impuestos |
| OrdenTotal | DECIMAL(18,2) | OrdenTotal | Total |

#### Result Set 3 - Partidas de la Orden de Compra
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Renglon | INT | Renglon | Numero de linea |
| Codigo | VARCHAR(50) | Codigo | Codigo articulo |
| Articulo | VARCHAR(100) | Articulo | Descripcion |
| Cantidad | DECIMAL(18,4) | Cantidad | Cantidad |
| Costo | DECIMAL(18,4) | Costo | Costo unitario |
| Unidad | VARCHAR(20) | Unidad | Unidad medida |
| Importe | DECIMAL(18,2) | Importe | Importe linea |

### Ejemplo de Llamada
```sql
EXEC sp_GetFacturaConOrdenCompra
    @FacturaID = 12345,
    @Empresa = '01'
```

---

## Notas Importantes

### 1. Valores de Estatus del Portal
El portal maneja 4 estatus principales para facturas:
- **EN_REVISION**: Factura recibida, pendiente de revision por administrador
- **APROBADA**: Factura aprobada, pendiente de pago
- **PAGADA**: Factura pagada completamente
- **RECHAZADA**: Factura rechazada por algun motivo

### 2. Mapeo de Estatus ERP a Portal
```sql
-- Mapeo de estatus del ERP Intelisis al portal
ERP 'PENDIENTE' + cualquier saldo → Portal 'EN_REVISION'
ERP 'CONCLUIDO' + Saldo > 0       → Portal 'APROBADA'
ERP 'CONCLUIDO' + Saldo = 0       → Portal 'PAGADA'
ERP 'CANCELADO'                    → Portal 'RECHAZADA'
```

### 3. Formato de Fechas
- Las fechas se reciben como `DATE` o `DATETIME`
- El frontend envia formato ISO: `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss`

### 4. Paginacion
- `@Page` es 1-based (la primera pagina es 1, no 0)
- El SP internamente calcula el offset como: `(@Page - 1) * @Limit`
- Siempre retornar el conteo total en un result set separado
- Default de paginacion para admin: 10 registros por pagina

### 5. Valores NULL
- Los filtros opcionales con valor NULL deben ignorarse (no filtrar)
- Usar logica: `(@Parametro IS NULL OR campo = @Parametro)`

### 6. Seguridad
- NO hacer validaciones de permisos en el SP
- La validacion de roles se hace en la capa de aplicacion
- Solo retornar los datos solicitados

### 7. Rendimiento
- Usar indices apropiados en:
  - `Cxc.Estatus`
  - `Cxc.Cliente` (proveedor)
  - `Cxc.FechaEmision`
  - `Cxc.Empresa`
  - `SatXml.FolioFiscal` (UUID)
  - `Prov.RFC`
- Considerar indice compuesto: `(Empresa, Estatus, FechaEmision DESC)`
- Considerar indice compuesto: `(Cliente, Empresa, FechaEmision DESC)`

### 8. Manejo de Errores
- En caso de error, usar `RAISERROR` o `THROW`
- El codigo de aplicacion captura y maneja los errores

### 9. Codigos de Empresa
El ERP usa codigos numericos para empresas:
| Codigo | Empresa |
|--------|---------|
| 01 | La Cantera |
| 02 | Peralillo |
| 03 | Plaza Galerena |
| 04 | Inmobiliaria Galerena |
| 05 | iCrear |

---

## Tablas Involucradas

| Tabla | Base de Datos | Descripcion | Campos Clave |
|-------|---------------|-------------|--------------|
| Cxc | ERP Intelisis | Cuentas por Cobrar (Facturas) | ID, Mov, MovID, Empresa, Estatus, Cliente, FechaEmision, Total, Saldo |
| SatXml | ERP Intelisis | Datos del XML CFDI | FolioFiscal (UUID), RFCEmisor, RFCReceptor, Total |
| Prov | ERP Intelisis | Catalogo de proveedores | Proveedor, Nombre, RFC, eMail |
| Compra | ERP Intelisis | Ordenes de compra | ID, Mov, MovID, Empresa |
| CompraD | ERP Intelisis | Detalle ordenes de compra | ID (FK), Renglon, Articulo |
| proveedor_facturas | Portal PP | Facturas subidas por proveedor | id, uuid, estatus, created_at |

### Relaciones
```
Cxc (Cliente) <---> Prov (Proveedor)     -- N:1 - Facturas de un proveedor
Cxc (ID) <---> SatXml (?)                -- 1:1 - Datos XML de la factura
Cxc (?) <---> Compra (ID)                -- N:1 - Factura asociada a OC
```

---

## Resumen de SPs

| SP | Descripcion | Parametros Clave | Vista |
|----|-------------|------------------|-------|
| sp_GetFacturas | Lista facturas con filtros y paginacion | @Estatus, @Proveedor, @Empresa, @Page | Admin |
| sp_GetFacturaPorID | Detalle completo de una factura | @ID, @Empresa | Admin |
| sp_GetFacturasStats | Estadisticas para dashboard admin | @Empresa, @Proveedor | Admin |
| sp_GetFacturasProveedor | Facturas de un proveedor (por RFC) | @RFC, @Empresa, @Estatus | Proveedor |
| sp_GetFacturasProveedorStats | Estadisticas del proveedor | @RFC, @Empresa | Proveedor |
| sp_ValidarFacturaDuplicada | Verifica si UUID ya existe | @UUID, @Empresa | Proveedor |
| sp_GetFacturaConOrdenCompra | Factura con OC para validacion | @FacturaID, @Empresa | Admin |

---

## Campos de la Tabla de Facturas (Frontend)

### Vista Administrador (`/facturas`)
| Columna UI | Campo SP | Descripcion |
|------------|----------|-------------|
| No. Factura | Folio | Numero de la factura |
| Proveedor | ProveedorNombre | Nombre del proveedor |
| Orden de Compra | OrdenCompraMovID | Numero(s) de OC asociada(s) |
| Fecha de Entrada | FechaEmision | Fecha de emision |
| Estado | Estatus | EN_REVISION, APROBADA, PAGADA, RECHAZADA |
| Monto | Total | Monto total (formato MXN) |
| Accion | - | Ver, Descargar PDF, Descargar XML |

### Vista Proveedor (`/proveedores/facturacion`)
| Columna UI | Campo SP | Descripcion |
|------------|----------|-------------|
| Folio | Folio | Numero de factura |
| CFDI | UUID | UUID del CFDI |
| Orden Asociada | OrdenCompraMovID | Numero de OC (link) |
| Fecha Emision | FechaEmision | Fecha de emision |
| Estado | Estatus | En revision, Aprobada, Pagada, Rechazada |
| Monto | Total | Monto total (formato MXN) |
| Acciones | - | Ver, Descargar PDF, Descargar XML |

---

## Contacto

Para dudas sobre esta especificacion, contactar al equipo de desarrollo del Portal de Proveedores.
