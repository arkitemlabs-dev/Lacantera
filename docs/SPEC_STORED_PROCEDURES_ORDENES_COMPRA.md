# Especificacion de Stored Procedures - Ordenes de Compra

## Documento de Requerimientos para el Equipo de Base de Datos

**Fecha:** Enero 2026
**Sistema:** Portal de Proveedores - La Cantera
**Base de Datos ERP:** Intelisis
**Base de Datos Portal:** PP

---

## Resumen

Este documento especifica los stored procedures requeridos para el modulo de Ordenes de Compra. El objetivo es migrar la logica de consultas del codigo de aplicacion a la base de datos para mejorar rendimiento y mantenibilidad.

**IMPORTANTE:** El portal requiere consultar ordenes en TODOS los estatus:
- PENDIENTE
- CONCLUIDO
- CANCELADO
- Todas (sin filtro de estatus)

---

## SP 1: sp_GetOrdenesCompra

### Descripcion
Obtiene listado de ordenes de compra con paginacion y filtros. Soporta filtrar por estatus o traer todas.

### Uso en el Sistema
- **API:** `GET /api/admin/ordenes`
- **API:** `GET /api/admin/proveedores/[id]/ordenes`
- **Pantalla:** Dashboard de administrador - Listado de ordenes
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @Proveedor | VARCHAR(20) | NO | NULL | Codigo del proveedor para filtrar. Si es NULL, trae todos |
| @RFC | VARCHAR(13) | NO | NULL | RFC del proveedor para filtrar. Si es NULL, no filtra por RFC |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa ('01', '02', etc.). Si es NULL, trae todas |
| @Estatus | VARCHAR(20) | NO | NULL | Estatus a filtrar: 'PENDIENTE', 'CONCLUIDO', 'CANCELADO'. Si es NULL o 'todas', trae todos los estatus |
| @FechaDesde | DATE | NO | NULL | Fecha minima de emision (inclusive). Formato: YYYY-MM-DD |
| @FechaHasta | DATE | NO | NULL | Fecha maxima de emision (inclusive). Formato: YYYY-MM-DD |
| @Page | INT | NO | 1 | Numero de pagina (1-based) |
| @Limit | INT | NO | 50 | Registros por pagina. Maximo recomendado: 100 |

### Campos de Salida Requeridos (Result Set 1 - Ordenes)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID unico de la orden |
| Empresa | VARCHAR(10) | Empresa | Codigo de empresa |
| Mov | VARCHAR(20) | Mov | Tipo de movimiento |
| MovID | VARCHAR(20) | MovID | ID del movimiento |
| FechaEmision | DATETIME | FechaEmision | Fecha de emision |
| UltimoCambio | DATETIME | UltimoCambio | Fecha ultimo cambio |
| Concepto | VARCHAR(50) | Concepto | Concepto de la orden |
| Proyecto | VARCHAR(50) | Proyecto | Proyecto asociado |
| Proveedor | VARCHAR(20) | Proveedor | Codigo del proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre del proveedor (JOIN con Prov.Nombre) |
| ProveedorRFC | VARCHAR(13) | ProveedorRFC | RFC del proveedor (JOIN con Prov.RFC) |
| Moneda | VARCHAR(10) | Moneda | Codigo de moneda |
| TipoCambio | DECIMAL(18,4) | TipoCambio | Tipo de cambio |
| Usuario | VARCHAR(50) | Usuario | Usuario que creo |
| Referencia | VARCHAR(50) | Referencia | Referencia externa |
| Estatus | VARCHAR(20) | Estatus | Estatus de la orden (PENDIENTE, CONCLUIDO, CANCELADO) |
| Situacion | VARCHAR(50) | Situacion | Situacion actual |
| SituacionFecha | DATETIME | SituacionFecha | Fecha de situacion |
| SituacionUsuario | VARCHAR(50) | SituacionUsuario | Usuario situacion |
| SituacionNota | VARCHAR(500) | SituacionNota | Nota de situacion |
| FechaRequerida | DATETIME | FechaRequerida | Fecha requerida entrega |
| Almacen | VARCHAR(20) | Almacen | Almacen destino |
| Condicion | VARCHAR(50) | Condicion | Condicion de pago |
| Vencimiento | DATETIME | Vencimiento | Fecha vencimiento |
| Importe | DECIMAL(18,2) | Importe | Importe sin impuestos |
| Impuestos | DECIMAL(18,2) | Impuestos | Total de impuestos |
| DescuentoLineal | DECIMAL(18,2) | DescuentoLineal | Descuento lineal aplicado |
| Saldo | DECIMAL(18,2) | Saldo | Saldo pendiente |
| FechaRegistro | DATETIME | FechaRegistro | Fecha de registro |
| FechaEntrega | DATETIME | FechaEntrega | Fecha de entrega |
| Observaciones | VARCHAR(MAX) | Observaciones | Observaciones |
| Prioridad | VARCHAR(20) | Prioridad | Prioridad |
| Agente | VARCHAR(20) | Agente | Agente |
| Descuento | DECIMAL(18,2) | Descuento | Descuento aplicado |
| TipoMovimiento | VARCHAR(20) | TipoMovimiento | Clave del tipo de movimiento (mt.Clave) |

### Campos de Salida Requeridos (Result Set 2 - Conteo Total)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Total | INT | Total | Total de registros sin paginacion |

### Filtros Obligatorios (WHERE fijo)
```sql
WHERE EXISTS (
    SELECT 1 FROM MovTipo mt
    WHERE c.Mov = mt.Mov
      AND mt.Modulo = 'COMS'
      AND mt.Clave = 'COMS.O'
      AND mt.subClave IS NULL
  )
```

### Logica de Filtro por Estatus
```sql
-- Si @Estatus es NULL o 'todas', NO filtrar por estatus
-- Si @Estatus tiene valor especifico, agregar:
AND (@Estatus IS NULL OR @Estatus = 'todas' OR c.Estatus = @Estatus)
```

### Ordenamiento
```sql
ORDER BY c.FechaEmision DESC
```

### Ejemplo de Llamada - Solo Pendientes
```sql
EXEC sp_GetOrdenesCompra
    @Proveedor = 'P00443',
    @Estatus = 'PENDIENTE',
    @FechaDesde = '2024-01-01',
    @FechaHasta = '2024-12-31',
    @Page = 1,
    @Limit = 50
```

### Ejemplo de Llamada - Todas las Ordenes
```sql
EXEC sp_GetOrdenesCompra
    @Proveedor = 'P00443',
    @Estatus = NULL,  -- o 'todas'
    @Page = 1,
    @Limit = 100
```

### Ejemplo de Llamada - Por RFC y Empresa
```sql
EXEC sp_GetOrdenesCompra
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Estatus = 'todas',
    @Page = 1,
    @Limit = 50
```

---

## SP 2: sp_GetOrdenCompraPorID

### Descripcion
Obtiene los detalles de una orden de compra especifica por su ID. Incluye encabezado y detalle (partidas).

### Uso en el Sistema
- **API:** `GET /api/admin/ordenes/[id]`
- **API:** `GET /api/ordenes-compra-hybrid/[id]`
- **Pantalla:** Detalle de orden de compra
- **Roles que lo usan:** `super-admin`, `admin`, `proveedor`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @ID | INT | SI | - | ID de la orden de compra |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa (validacion adicional) |

### Campos de Salida Requeridos (Result Set 1 - Encabezado)

(Mismos campos que SP 1, Result Set 1, pero para un solo registro)

### Campos de Salida Requeridos (Result Set 2 - Detalle/Partidas)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID del registro de detalle (FK a Compra) |
| Renglon | INT | Renglon | Numero de renglon/linea |
| Cantidad | DECIMAL(18,4) | Cantidad | Cantidad solicitada |
| Codigo | VARCHAR(50) | Codigo | Codigo del articulo |
| Articulo | VARCHAR(100) | Articulo | Descripcion del articulo |
| SubCuenta | VARCHAR(50) | SubCuenta | SubCuenta contable |
| Costo | DECIMAL(18,4) | Costo | Costo unitario sin impuesto |
| Unidad | VARCHAR(20) | Unidad | Unidad de medida |

### Query de Detalle (CompraD)
```sql
SELECT
    ID,
    Renglon,
    Cantidad,
    Codigo,
    Articulo,
    SubCuenta,
    Costo,
    Unidad
FROM CompraD
WHERE ID = @OrdenID
ORDER BY Renglon
```

### Comportamiento si no existe
- Retornar result set vacio (0 filas)
- El codigo de aplicacion manejara el error 404

### Ejemplo de Llamada
```sql
EXEC sp_GetOrdenCompraPorID @ID = 12345, @Empresa = '01'
```

---

## SP 3: sp_GetOrdenesCompraStats

### Descripcion
Obtiene estadisticas de ordenes de compra para el dashboard. Puede filtrar por estatus o mostrar estadisticas globales.

### Uso en el Sistema
- **API:** `GET /api/admin/ordenes` (se llama junto con SP 1)
- **Pantalla:** Dashboard de administrador - Widgets de estadisticas
- **Roles que lo usan:** `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @Estatus | VARCHAR(20) | NO | NULL | Estatus a filtrar. Si es NULL, estadisticas globales |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa. Si es NULL, todas las empresas |

### Campos de Salida Requeridos

#### Result Set 1 - Totales Generales
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| TotalPendientes | INT | TotalPendientes | Cantidad de ordenes PENDIENTE |
| TotalConcluidas | INT | TotalConcluidas | Cantidad de ordenes CONCLUIDO |
| TotalCanceladas | INT | TotalCanceladas | Cantidad de ordenes CANCELADO |
| ImporteTotalPendiente | DECIMAL(18,2) | ImporteTotalPendiente | Suma importes PENDIENTE |
| ImporteTotalConcluido | DECIMAL(18,2) | ImporteTotalConcluido | Suma importes CONCLUIDO |
| ImporteTotal | DECIMAL(18,2) | ImporteTotal | Suma de todos los importes |

#### Result Set 2 - Top 10 Proveedores
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Proveedor | VARCHAR(20) | Proveedor | Codigo del proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre del proveedor |
| Cantidad | INT | Cantidad | Numero de ordenes |
| ImporteTotal | DECIMAL(18,2) | ImporteTotal | Suma de importes |

#### Result Set 3 - Ordenes por Mes (ultimos 6 meses)
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Anio | INT | Anio | Ano |
| Mes | INT | Mes | Mes (1-12) |
| Cantidad | INT | Cantidad | Numero de ordenes |
| ImporteTotal | DECIMAL(18,2) | ImporteTotal | Suma de importes |

#### Result Set 4 - Por Estatus
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| Estatus | VARCHAR(20) | Estatus | Estatus de la orden |
| Cantidad | INT | Cantidad | Numero de ordenes |
| ImporteTotal | DECIMAL(18,2) | ImporteTotal | Suma de importes |

### Ejemplo de Llamada
```sql
EXEC sp_GetOrdenesCompraStats @Estatus = NULL, @Empresa = '01'
```

---

## SP 4: sp_GetOrdenesCompraProveedor

### Descripcion
Obtiene ordenes de compra para un proveedor especifico (vista del proveedor). Incluye TODAS las ordenes (pendientes, concluidas y canceladas).

### Uso en el Sistema
- **API:** `GET /api/proveedor/ordenes`
- **API:** `GET /api/ordenes-compra-hybrid`
- **Pantalla:** Portal del proveedor - Mis ordenes de compra
- **Roles que lo usan:** `proveedor`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @RFC | VARCHAR(13) | SI | - | RFC del proveedor (OBLIGATORIO) |
| @Empresa | VARCHAR(10) | SI | - | Codigo de empresa ERP: '01', '02', etc. (OBLIGATORIO) |
| @Estatus | VARCHAR(20) | NO | NULL | Estatus a filtrar. Si es NULL, trae todos |
| @FechaDesde | DATE | NO | NULL | Fecha minima de emision |
| @FechaHasta | DATE | NO | NULL | Fecha maxima de emision |
| @Limit | INT | NO | 50 | Registros por pagina |
| @Offset | INT | NO | 0 | Offset para paginacion |

### Campos de Salida Requeridos (Result Set 1 - Ordenes)

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID de la orden |
| Mov | VARCHAR(20) | Mov | Tipo de movimiento |
| MovID | VARCHAR(20) | MovID | Numero/ID del movimiento |
| Empresa | VARCHAR(10) | Empresa | Codigo empresa |
| Estatus | VARCHAR(20) | Estatus | Estatus (PENDIENTE, CONCLUIDO, CANCELADO) |
| Situacion | VARCHAR(50) | Situacion | Situacion actual |
| SituacionFecha | DATETIME | SituacionFecha | Fecha de situacion |
| SituacionUsuario | VARCHAR(50) | SituacionUsuario | Usuario que cambio situacion |
| SituacionNota | VARCHAR(500) | SituacionNota | Nota de situacion |
| Proveedor | VARCHAR(20) | Proveedor | Codigo proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre del proveedor |
| ProveedorRFC | VARCHAR(13) | ProveedorRFC | RFC del proveedor |
| FechaEmision | DATETIME | FechaEmision | Fecha emision |
| FechaRequerida | DATETIME | FechaRequerida | Fecha requerida |
| FechaEntrega | DATETIME | FechaEntrega | Fecha entrega |
| Importe | DECIMAL(18,2) | Importe | Importe sin impuestos |
| Impuestos | DECIMAL(18,2) | Impuestos | Total impuestos |
| DescuentoLineal | DECIMAL(18,2) | DescuentoLineal | Descuento aplicado |
| Saldo | DECIMAL(18,2) | Saldo | Saldo pendiente |
| Moneda | VARCHAR(10) | Moneda | Codigo moneda |
| TipoCambio | DECIMAL(18,4) | TipoCambio | Tipo de cambio |
| Observaciones | VARCHAR(MAX) | Observaciones | Observaciones |
| Condicion | VARCHAR(50) | Condicion | Condicion de pago |
| Almacen | VARCHAR(20) | Almacen | Almacen |
| Referencia | VARCHAR(50) | Referencia | Referencia |
| Proyecto | VARCHAR(50) | Proyecto | Proyecto |
| Concepto | VARCHAR(50) | Concepto | Concepto |
| Prioridad | VARCHAR(20) | Prioridad | Prioridad |
| Usuario | VARCHAR(50) | Usuario | Usuario creador |
| UltimoCambio | DATETIME | UltimoCambio | Fecha ultimo cambio |
| TipoMovimiento | VARCHAR(20) | TipoMovimiento | Clave tipo movimiento |

### Filtros Obligatorios
```sql
WHERE p.RFC = @RFC
  AND c.Empresa = @Empresa
  AND EXISTS (
    SELECT 1 FROM MovTipo mt
    WHERE c.Mov = mt.Mov
      AND mt.Modulo = 'COMS'
      AND mt.Clave = 'COMS.O'
      AND mt.subClave IS NULL
  )
```

### Logica de Filtro por Estatus
```sql
-- Si @Estatus es NULL o 'todas', NO filtrar por estatus (trae PENDIENTE, CONCLUIDO, CANCELADO)
AND (@Estatus IS NULL OR @Estatus = 'todas' OR c.Estatus = @Estatus)
```

### Ordenamiento
```sql
ORDER BY c.FechaEmision DESC
```

### Ejemplo de Llamada - Todas las Ordenes del Proveedor
```sql
EXEC sp_GetOrdenesCompraProveedor
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Estatus = NULL,  -- Trae todas
    @FechaDesde = '2024-01-01',
    @FechaHasta = NULL,
    @Limit = 50,
    @Offset = 0
```

### Ejemplo de Llamada - Solo Pendientes
```sql
EXEC sp_GetOrdenesCompraProveedor
    @RFC = 'XAXX010101000',
    @Empresa = '01',
    @Estatus = 'PENDIENTE',
    @Limit = 50,
    @Offset = 0
```

---

## SP 5: sp_GetOrdenCompraConDetalle

### Descripcion
Obtiene encabezado y detalle (partidas/lineas) de una orden de compra especifica. Retorna 2 result sets.

### Uso en el Sistema
- **API:** `GET /api/ordenes-compra-hybrid/[id]`
- **API:** `GET /api/admin/proveedores/[id]/ordenes` (detalle interno)
- **Pantalla:** Portal del proveedor - Detalle de orden
- **Roles que lo usan:** `proveedor`, `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @OrdenID | INT | SI | - | ID de la orden |
| @Empresa | VARCHAR(10) | NO | NULL | Codigo de empresa (validacion adicional) |

### Campos de Salida Requeridos

#### Result Set 1 - Encabezado
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID de la orden |
| Mov | VARCHAR(20) | Mov | Tipo movimiento |
| MovID | VARCHAR(20) | MovID | Numero/Mov |
| Empresa | VARCHAR(10) | Empresa | Empresa |
| Estatus | VARCHAR(20) | Estatus | Estatus |
| Situacion | VARCHAR(50) | Situacion | Situacion |
| SituacionFecha | DATETIME | SituacionFecha | Fecha situacion |
| SituacionUsuario | VARCHAR(50) | SituacionUsuario | Usuario situacion |
| SituacionNota | VARCHAR(500) | SituacionNota | Nota situacion |
| Proveedor | VARCHAR(20) | Proveedor | Codigo proveedor |
| ProveedorNombre | VARCHAR(100) | ProveedorNombre | Nombre proveedor |
| ProveedorRFC | VARCHAR(13) | ProveedorRFC | RFC proveedor |
| ProveedorEmail | VARCHAR(100) | ProveedorEmail | Email proveedor |
| FechaEmision | DATETIME | FechaEmision | Fecha emision |
| FechaRequerida | DATETIME | FechaRequerida | Fecha requerida |
| FechaEntrega | DATETIME | FechaEntrega | Fecha entrega |
| Importe | DECIMAL(18,2) | Importe | Importe |
| Impuestos | DECIMAL(18,2) | Impuestos | Impuestos |
| DescuentoLineal | DECIMAL(18,2) | DescuentoLineal | Descuento |
| Saldo | DECIMAL(18,2) | Saldo | Saldo |
| Moneda | VARCHAR(10) | Moneda | Moneda |
| TipoCambio | DECIMAL(18,4) | TipoCambio | Tipo cambio |
| Observaciones | VARCHAR(MAX) | Observaciones | Observaciones |
| Condicion | VARCHAR(50) | Condicion | Condicion pago |
| Almacen | VARCHAR(20) | Almacen | Almacen |
| Referencia | VARCHAR(50) | Referencia | Referencia |
| Proyecto | VARCHAR(50) | Proyecto | Proyecto |
| Concepto | VARCHAR(50) | Concepto | Concepto |
| Prioridad | VARCHAR(20) | Prioridad | Prioridad |
| Usuario | VARCHAR(50) | Usuario | Usuario |
| UltimoCambio | DATETIME | UltimoCambio | Ultimo cambio |

#### Result Set 2 - Detalle (Partidas/Lineas de CompraD)
| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID del detalle (FK a Compra) |
| Renglon | INT | Renglon | Numero de renglon/linea |
| Cantidad | DECIMAL(18,4) | Cantidad | Cantidad solicitada |
| Codigo | VARCHAR(50) | Codigo | Codigo del articulo |
| Articulo | VARCHAR(100) | Articulo | Descripcion/nombre articulo |
| SubCuenta | VARCHAR(50) | SubCuenta | SubCuenta contable |
| Costo | DECIMAL(18,4) | Costo | Costo unitario sin impuesto |
| Unidad | VARCHAR(20) | Unidad | Unidad de medida |

### Ejemplo de Llamada
```sql
EXEC sp_GetOrdenCompraConDetalle
    @OrdenID = 12345,
    @Empresa = '01'
```

---

## SP 6: sp_GetPartidasOrdenCompra

### Descripcion
Obtiene SOLO las partidas/lineas de detalle de una orden de compra. Util cuando ya se tiene el encabezado y solo se requieren las partidas.

### Uso en el Sistema
- **API:** `GET /api/admin/proveedores/[id]/ordenes` (loop interno)
- **Pantalla:** Detalle de partidas
- **Roles que lo usan:** `proveedor`, `super-admin`, `admin`

### Parametros de Entrada

| Parametro | Tipo SQL | Obligatorio | Valor Default | Descripcion |
|-----------|----------|-------------|---------------|-------------|
| @OrdenID | INT | SI | - | ID de la orden de compra |

### Campos de Salida Requeridos

| Campo | Tipo SQL | Alias Requerido | Descripcion |
|-------|----------|-----------------|-------------|
| ID | INT | ID | ID del detalle (FK a Compra) |
| Renglon | INT | Renglon | Numero de renglon/linea |
| Cantidad | DECIMAL(18,4) | Cantidad | Cantidad solicitada |
| Codigo | VARCHAR(50) | Codigo | Codigo del articulo |
| Articulo | VARCHAR(100) | Articulo | Descripcion/nombre articulo |
| SubCuenta | VARCHAR(50) | SubCuenta | SubCuenta contable |
| Costo | DECIMAL(18,4) | Costo | Costo unitario sin impuesto |
| Unidad | VARCHAR(20) | Unidad | Unidad de medida |

### Query Base
```sql
SELECT
    ID,
    Renglon,
    Cantidad,
    Codigo,
    Articulo,
    SubCuenta,
    Costo,
    Unidad
FROM CompraD
WHERE ID = @OrdenID
ORDER BY Renglon
```

### Ejemplo de Llamada
```sql
EXEC sp_GetPartidasOrdenCompra @OrdenID = 12345
```

---

## Notas Importantes

### 1. Valores de Estatus Soportados
El sistema maneja 3 estatus principales:
- **PENDIENTE**: Ordenes activas pendientes de completar
- **CONCLUIDO**: Ordenes completadas/finalizadas
- **CANCELADO**: Ordenes canceladas

Cuando el parametro @Estatus es NULL o 'todas', el SP debe retornar ordenes de TODOS los estatus.

### 2. Formato de Fechas
- Las fechas se reciben como `DATE` o `DATETIME`
- El frontend envia formato ISO: `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss`

### 3. Paginacion
- `@Page` es 1-based (la primera pagina es 1, no 0)
- `@Offset` es 0-based (se calcula como: `(Page - 1) * Limit`)
- Siempre retornar el conteo total en un result set separado

### 4. Valores NULL
- Los filtros opcionales con valor NULL deben ignorarse (no filtrar)
- Usar logica: `(@Parametro IS NULL OR campo = @Parametro)`
- Para @Estatus: `(@Estatus IS NULL OR @Estatus = 'todas' OR c.Estatus = @Estatus)`

### 5. Seguridad
- NO hacer validaciones de permisos en el SP
- La validacion de roles se hace en la capa de aplicacion
- Solo retornar los datos solicitados

### 6. Rendimiento
- Usar indices apropiados en:
  - `Compra.Estatus`
  - `Compra.Proveedor`
  - `Compra.FechaEmision`
  - `Compra.Empresa`
  - `CompraD.ID` (FK a Compra)
  - `CompraD.Renglon`
  - `Prov.RFC`
- Considerar indice compuesto: `(Estatus, FechaEmision DESC)`
- Considerar indice compuesto: `(Empresa, Estatus, FechaEmision DESC)`

### 7. Manejo de Errores
- En caso de error, usar `RAISERROR` o `THROW`
- El codigo de aplicacion captura y maneja los errores

### 8. Codigos de Empresa
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
| Compra | ERP Intelisis | Encabezado de ordenes de compra | ID, Mov, MovID, Empresa, Estatus, Proveedor, FechaEmision |
| CompraD | ERP Intelisis | Detalle/Partidas de ordenes de compra | ID (FK), Renglon, Codigo, Articulo, SubCuenta, Cantidad, Costo, Unidad |
| Prov | ERP Intelisis | Catalogo de proveedores | Proveedor, Nombre, RFC, eMail |
| MovTipo | ERP Intelisis | Tipos de movimiento | Mov, Modulo, Clave, subClave |

### Relaciones
```
Compra (ID) <---> CompraD (ID)     -- 1:N - Una orden tiene muchas partidas
Compra (Proveedor) <---> Prov (Proveedor)  -- N:1 - Muchas ordenes de un proveedor
Compra (Mov) <---> MovTipo (Mov)   -- N:1 - Tipo de movimiento
```

### Filtro de MovTipo para Ordenes de Compra
```sql
-- Solo ordenes de compra (no otros movimientos de COMS)
MovTipo.Modulo = 'COMS'
MovTipo.Clave = 'COMS.O'
MovTipo.subClave IS NULL
```

---

## Resumen de SPs

| SP | Descripcion | Parametros Clave |
|----|-------------|------------------|
| sp_GetOrdenesCompra | Lista ordenes con filtros y paginacion | @Estatus, @Proveedor, @RFC, @Empresa, @Page, @Limit |
| sp_GetOrdenCompraPorID | Detalle de una orden por ID | @ID |
| sp_GetOrdenesCompraStats | Estadisticas para dashboard | @Estatus, @Empresa |
| sp_GetOrdenesCompraProveedor | Ordenes de un proveedor (por RFC) | @RFC, @Empresa, @Estatus |
| sp_GetOrdenCompraConDetalle | Orden con sus partidas (2 result sets) | @OrdenID, @Empresa |
| sp_GetPartidasOrdenCompra | Solo partidas de una orden | @OrdenID |

---

## Contacto

Para dudas sobre esta especificacion, contactar al equipo de desarrollo del Portal de Proveedores.
