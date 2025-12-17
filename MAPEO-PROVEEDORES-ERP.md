# Mapeo de Proveedores - Portal ↔ ERP

## 📊 FLUJO DE DATOS

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REGISTRO EN PORTAL                          │
│  Usuario se registra con: Email, Password, Nombre, RFC             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CREAR EN TABLA WebUsuario                        │
│  UsuarioWeb, Nombre, eMail, Contrasena, Rol='proveedor'            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│              BUSCAR EN ERP POR RFC (Auto-Sync)                      │
│  Buscar en Cantera_ajustes.dbo.Prov WHERE RFC = @rfc               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                 ENCONTRADO                    NO ENCONTRADO
                    │                               │
                    ↓                               ↓
        ┌────────────────────────┐      ┌────────────────────────┐
        │  MAPEAR A PORTAL       │      │  CREAR PROVEEDOR       │
        │  portal_proveedor_     │      │  PENDIENTE EN PORTAL   │
        │  mapping               │      │  (sin código ERP)      │
        └────────────────────────┘      └────────────────────────┘
```

---

## 🗂️ CAMPOS CLAVE DE LA TABLA `Prov` (ERP)

### **Campos de Identificación**
```sql
Proveedor       VARCHAR(10)     -- Código único del proveedor (PK)
Nombre          VARCHAR(100)    -- Razón social
RFC             VARCHAR(15)     -- RFC fiscal ⭐ (para cruce)
```

### **Campos de Contacto**
```sql
eMail1          VARCHAR(100)    -- Email principal
eMail2          VARCHAR(100)    -- Email secundario
Contacto1       VARCHAR(100)    -- Nombre de contacto
Telefono        VARCHAR(50)     -- Teléfono
```

### **Campos de Dirección** (de otra parte de Prov)
```sql
Direccion       VARCHAR(255)    -- Dirección
Colonia         VARCHAR(100)    -- Colonia
Poblacion       VARCHAR(100)    -- Ciudad
Estado          VARCHAR(50)     -- Estado
Pais            VARCHAR(50)     -- País
CodigoPostal    VARCHAR(10)     -- Código postal
```

### **Campos Comerciales**
```sql
Condicion       VARCHAR(50)     -- Condición de pago (ej: "05 DIAS", "30 DIAS")
FormaPago       VARCHAR(50)     -- Forma de pago (ej: "03 TRANSFERENCIA")
Descuento       DECIMAL         -- % Descuento
Categoria       VARCHAR(50)     -- Categoría (ej: "PROVEEDORES COMPRA")
```

### **Campos Bancarios**
```sql
ProvBancoSucursal   VARCHAR(100)    -- Nombre del banco (ej: "BBVA", "BANAMEX")
ProvCuenta          VARCHAR(50)     -- Número de cuenta bancaria
```

### **Campos de Estatus**
```sql
Estatus         VARCHAR(15)     -- ALTA, BAJA, BLOQUEADO
Situacion       VARCHAR(50)     -- Situación especial (ej: "Autorizacion")
SituacionFecha  DATETIME        -- Fecha de cambio de situación
SituacionUsuario VARCHAR(50)    -- Usuario que cambió situación
SituacionNota   VARCHAR(255)    -- Nota de situación
```

### **Campos de Control**
```sql
Alta            DATETIME        -- Fecha de alta
UltimoCambio    DATETIME        -- Última modificación
TieneMovimientos BIT            -- Si tiene movimientos en el ERP
```

### **Campos de Configuración ERP**
```sql
Tipo            VARCHAR(20)     -- Tipo (ej: "Proveedor Nal")
DefMoneda       VARCHAR(10)     -- Moneda por defecto (ej: "Pesos")
Comprador       VARCHAR(50)     -- Comprador asignado
Agente          VARCHAR(50)     -- Agente asignado
CentroCostos    VARCHAR(50)     -- Centro de costos
```

### **Campos de Revisión y Pago**
```sql
DiaRevision1    VARCHAR(20)     -- Día de revisión 1 (ej: "Lunes")
DiaRevision2    VARCHAR(20)     -- Día de revisión 2 (ej: "Martes")
HorarioRevision VARCHAR(50)     -- Horario de revisión
DiaPago1        VARCHAR(20)     -- Día de pago 1 (ej: "Jueves")
DiaPago2        VARCHAR(20)     -- Día de pago 2 (ej: "Viernes")
HorarioPago     VARCHAR(50)     -- Horario de pago
```

### **Campos Contables**
```sql
Cuenta          VARCHAR(50)     -- Cuenta contable
CuentaRetencion VARCHAR(50)     -- Cuenta de retención
```

---

## 📋 MAPEO PARA EL PORTAL

### **Vista de Proveedores en Portal (Admin)**

```typescript
interface ProveedorPortalView {
  // Datos del Portal (WebUsuario)
  portalUserId: string;           // UsuarioWeb
  portalEmail: string;            // eMail del portal
  portalNombre: string;           // Nombre del portal
  portalEstatus: string;          // Estatus en portal
  portalFechaRegistro: Date;      // Fecha registro portal

  // Datos del ERP (Prov) - Pueden ser null si no hay mapeo
  erpProveedor?: string;          // Código Proveedor
  erpNombre?: string;             // Razón social del ERP
  erpRFC?: string;                // RFC
  erpEmail1?: string;             // Email principal ERP
  erpEmail2?: string;             // Email secundario ERP
  erpTelefono?: string;           // Teléfono
  erpContacto1?: string;          // Contacto principal

  // Dirección
  erpDireccion?: string;
  erpColonia?: string;
  erpCiudad?: string;
  erpEstado?: string;
  erpPais?: string;
  erpCP?: string;

  // Comercial
  erpCondicionPago?: string;      // Ej: "30 DIAS"
  erpFormaPago?: string;          // Ej: "03 TRANSFERENCIA"
  erpCategoria?: string;          // Categoría
  erpDescuento?: number;          // % Descuento

  // Bancario
  erpBanco?: string;              // Banco
  erpCuenta?: string;             // Número de cuenta

  // Estatus ERP
  erpEstatus?: string;            // ALTA/BAJA/BLOQUEADO
  erpSituacion?: string;          // Situación especial
  erpSituacionFecha?: Date;
  erpSituacionNota?: string;

  // Control
  erpAlta?: Date;
  erpUltimoCambio?: Date;
  erpTieneMovimientos?: boolean;

  // Días de revisión/pago
  erpDiasRevision?: string[];     // ["Lunes", "Martes"]
  erpDiasPago?: string[];         // ["Jueves", "Viernes"]

  // Mapeo
  empresasAsignadas: string[];    // ['la-cantera', 'peralillo']
  codigoEnEmpresa: Record<string, string>; // { 'la-cantera': 'PROV001' }
}
```

---

## 🔍 QUERY HÍBRIDA PARA GESTIÓN DE PROVEEDORES

### **Query SQL para traer datos combinados**

```sql
-- Portal: WebUsuario + Mapeo + ERP: Prov
SELECT
    -- PORTAL
    wu.UsuarioWeb as portalUserId,
    wu.eMail as portalEmail,
    wu.Nombre as portalNombre,
    wu.Estatus as portalEstatus,
    wu.Alta as portalFechaRegistro,
    wu.Rol as portalRol,

    -- MAPEO
    ppm.empresa_code,
    ppm.erp_proveedor_code,
    ppm.activo as mappingActivo,

    -- ERP - IDENTIFICACIÓN
    p.Proveedor as erpProveedor,
    p.Nombre as erpNombre,
    p.RFC as erpRFC,

    -- ERP - CONTACTO
    p.eMail1 as erpEmail1,
    p.eMail2 as erpEmail2,
    p.Telefono as erpTelefono,
    p.Contacto1 as erpContacto1,

    -- ERP - DIRECCIÓN
    p.Direccion as erpDireccion,
    p.Colonia as erpColonia,
    p.Poblacion as erpCiudad,
    p.Estado as erpEstado,
    p.Pais as erpPais,
    p.CodigoPostal as erpCP,

    -- ERP - COMERCIAL
    p.Condicion as erpCondicionPago,
    p.FormaPago as erpFormaPago,
    p.Categoria as erpCategoria,
    p.Descuento as erpDescuento,

    -- ERP - BANCARIO
    p.ProvBancoSucursal as erpBanco,
    p.ProvCuenta as erpCuenta,

    -- ERP - ESTATUS
    p.Estatus as erpEstatus,
    p.Situacion as erpSituacion,
    p.SituacionFecha as erpSituacionFecha,
    p.SituacionNota as erpSituacionNota,
    p.SituacionUsuario as erpSituacionUsuario,

    -- ERP - CONTROL
    p.Alta as erpAlta,
    p.UltimoCambio as erpUltimoCambio,
    p.TieneMovimientos as erpTieneMovimientos,
    p.Tipo as erpTipo,

    -- ERP - DÍAS REVISIÓN/PAGO
    p.DiaRevision1,
    p.DiaRevision2,
    p.HorarioRevision,
    p.DiaPago1,
    p.DiaPago2,
    p.HorarioPago,

    -- ERP - OTROS
    p.Comprador as erpComprador,
    p.Agente as erpAgente,
    p.CentroCostos as erpCentroCostos,
    p.DefMoneda as erpMoneda

FROM PP.dbo.WebUsuario wu

-- LEFT JOIN porque puede no tener mapeo aún
LEFT JOIN PP.dbo.portal_proveedor_mapping ppm
    ON wu.UsuarioWeb = ppm.portal_user_id
    AND ppm.activo = 1

-- LEFT JOIN porque puede no existir en el ERP
LEFT JOIN Cantera_ajustes.dbo.Prov p
    ON ppm.erp_proveedor_code = p.Proveedor

WHERE wu.Rol = 'proveedor'
    AND (@empresaCode IS NULL OR ppm.empresa_code = @empresaCode)

ORDER BY wu.Alta DESC;
```

---

## 🎨 PANTALLA DE GESTIÓN DE PROVEEDORES (Admin)

### **Tabla Principal**
- Columnas visibles:
  - ✅ Código Portal
  - ✅ Nombre (Portal)
  - ✅ Email
  - ✅ RFC
  - ✅ Estatus Portal
  - ✅ Estatus ERP
  - ✅ Empresa(s) Asignada(s)
  - ✅ Código ERP
  - ⚙️ Acciones

### **Filtros**
- Por empresa
- Por estatus portal (ACTIVO/INACTIVO)
- Por estatus ERP (ALTA/BAJA/BLOQUEADO)
- Por categoría
- Buscar por nombre/email/RFC

### **Vista Detalle de Proveedor**
Al hacer clic en un proveedor:

**Pestaña 1: Información General**
- Datos del portal
- Datos del ERP (si existe mapeo)
- Información de contacto
- Dirección completa

**Pestaña 2: Información Comercial**
- Condición de pago
- Forma de pago
- Categoría
- Descuento
- Días de revisión
- Días de pago

**Pestaña 3: Información Bancaria**
- Banco
- Cuenta
- CLABE

**Pestaña 4: Historial**
- Cambios de estatus
- Notas de situación
- Fecha de alta
- Última modificación

**Pestaña 5: Empresas Asignadas**
- Lista de empresas donde está mapeado
- Código en cada empresa
- Botón para agregar/quitar empresas

---

## 🔄 ACCIONES DEL ADMINISTRADOR

1. **Aprobar Proveedor**
   - Cambiar estatus de PENDIENTE → ACTIVO
   - Asignar a empresas
   - Mapear con código ERP (si existe)

2. **Bloquear Proveedor**
   - Cambiar estatus a BLOQUEADO
   - Desactivar mapeos

3. **Editar Información**
   - Solo datos del portal
   - Los datos del ERP son solo lectura

4. **Asignar a Empresas**
   - Seleccionar empresa(s)
   - Buscar/seleccionar código ERP correspondiente
   - Crear mapeo en `portal_proveedor_mapping`

5. **Ver Órdenes de Compra**
   - Ver OC del proveedor por empresa

6. **Ver Facturas**
   - Ver facturas del proveedor

---

## 📊 INDICADORES PARA EL DASHBOARD ADMIN

```typescript
interface ProveedoresStats {
  totalProveedores: number;
  activosPortal: number;
  pendientesAprobacion: number;
  bloqueados: number;

  conMapeoERP: number;
  sinMapeoERP: number;

  porEmpresa: {
    empresaCode: string;
    empresaName: string;
    totalProveedores: number;
    activos: number;
  }[];

  registrosRecientes: number; // Últimos 7 días

  estatusERP: {
    alta: number;
    baja: number;
    bloqueado: number;
  };
}
```

---

## 🚀 PRÓXIMOS PASOS

1. **Crear API endpoints**:
   - `GET /api/admin/proveedores` - Lista de proveedores
   - `GET /api/admin/proveedores/[id]` - Detalle de proveedor
   - `POST /api/admin/proveedores/[id]/aprobar` - Aprobar proveedor
   - `POST /api/admin/proveedores/[id]/bloquear` - Bloquear proveedor
   - `POST /api/admin/proveedores/[id]/asignar-empresa` - Asignar a empresa
   - `GET /api/admin/proveedores/stats` - Estadísticas

2. **Crear componentes UI**:
   - Tabla de proveedores con filtros
   - Modal de detalle de proveedor
   - Formulario de asignación de empresas
   - Tarjetas de estadísticas

3. **Implementar queries híbridas**:
   - Función para combinar datos Portal + ERP
   - Caché para mejorar rendimiento
   - Paginación y filtros

---

**Fecha:** 2025-12-16
**Base de Datos Portal:** PP
**Base de Datos ERP:** Cantera_ajustes, Peralillo_Ajustes, GALBD_PRUEBAS, ICREAR_PRUEBAS
