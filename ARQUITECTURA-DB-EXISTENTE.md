# Arquitectura de Base de Datos - Portal de Proveedores
## Usando Tablas Existentes de SQL Server PP

---

## 📊 RESUMEN EJECUTIVO

Tu base de datos **PP** ya tiene una infraestructura completa para el portal de proveedores con las tablas del sistema **pNet** (Portal Net). Vamos a usar estas tablas existentes en lugar de crear nuevas.

---

## 🎯 ARQUITECTURA PROPUESTA

### 1. **USUARIOS DEL PORTAL** → `pNetUsuario`

Esta es tu tabla principal para autenticación y usuarios del portal web.

```sql
pNetUsuario
├── IDUsuario         INT (PK, Identity)          -- ID único del usuario
├── Usuario           VARCHAR(10) (FK)            -- Clave de usuario (FK a Prov o Usuario)
├── IDUsuarioTipo     INT (FK)                    -- Tipo de usuario (1-7)
├── IDRole            INT                         -- Rol del usuario
├── eMail             VARCHAR(50) NOT NULL        -- Email para login ⭐
├── Nombre            VARCHAR(100)                -- Nombre completo
├── UrlImagen         VARCHAR(255)                -- Avatar del usuario
├── Estatus           VARCHAR(15)                 -- ACTIVO/INACTIVO
├── FechaRegistro     DATETIME DEFAULT GETDATE()  -- Fecha de alta
├── Telefono          VARCHAR(100)
├── PrimeraVez        BIT DEFAULT 1               -- Primera vez que ingresa
├── Empresa           VARCHAR(5) (FK)             -- Empresa predeterminada
├── Sucursal          INT
├── Acreedor          VARCHAR(10)
├── PersonalGastos    VARCHAR(10)
└── Agente            VARCHAR(10)
```

**Estado actual:** ✅ 2 usuarios existentes (tipo Intelisis)

---

### 2. **TIPOS DE USUARIO** → `pNetUsuarioTipo`

Define qué tipo de usuario es y a qué tabla se relaciona.

```sql
pNetUsuarioTipo
├── IDUsuarioTipo   INT (PK)              -- ID del tipo
├── Descripcion     VARCHAR(60)           -- Nombre del tipo
├── Tabla           VARCHAR(60)           -- Tabla relacionada
├── Campo           VARCHAR(60)           -- Campo de la FK
└── Estatus         BIT                   -- Activo/Inactivo
```

**Tipos disponibles:**

| ID | Descripción    | Tabla    | Campo     | Uso en Portal                    |
|----|----------------|----------|-----------|----------------------------------|
| 1  | Intelisis      | Usuario  | Usuario   | ❌ Usuarios internos del ERP    |
| 2  | Personal       | Personal | Personal  | ✅ Empleados de La Cantera      |
| 3  | Cliente        | Cte      | Cliente   | ⚠️ Opcional (clientes web)      |
| **4**  | **Proveedor**      | **Prov**     | **Proveedor** | **✅ PROVEEDORES DEL PORTAL**   |
| 5  | Acreedor       | Prov     | Proveedor | ✅ Acreedores (similar a prov)  |
| 6  | Proyecto       | Usuario  | Usuario   | ❌ Usuarios de proyecto         |
| 7  | Colaboradores  | Prov     | Proveedor | ✅ Colaboradores externos       |

---

### 3. **DATOS DE PROVEEDORES** → `Prov`

Tabla principal con toda la información de proveedores del ERP.

```sql
Prov (149 columnas totales)
├── Proveedor          VARCHAR(10) (PK)     -- Clave del proveedor ⭐
├── Nombre             VARCHAR(100)         -- Nombre del proveedor
├── RFC                VARCHAR(15)          -- RFC
├── RazonSocial        VARCHAR(100)         -- Razón social (probablemente en otra columna)
├── Direccion          VARCHAR(100)
├── DireccionNumero    VARCHAR
├── Colonia            VARCHAR(100)
├── Poblacion          VARCHAR(100)
├── Estado             VARCHAR(30)
├── Pais               VARCHAR(100)
├── CodigoPostal       VARCHAR(15)
├── Telefonos          VARCHAR
├── Estatus            VARCHAR(15)          -- ALTA/BAJA
├── Situacion          VARCHAR(50)
├── Observaciones      VARCHAR(100)
└── ... (más campos)
```

**Estado actual:** ✅ 7 proveedores registrados

---

### 4. **RELACIÓN USUARIO-EMPRESA** → `pNetUsuarioEmpresa`

Para soporte multi-empresa (La Cantera, Arkitem, etc.)

```sql
pNetUsuarioEmpresa
├── IDUsuarioEmpresa   INT (PK, Identity)
├── IDUsuario          VARCHAR(10) (FK a pNetUsuario.Usuario)
└── Empresa            VARCHAR(5) (FK a Empresa.Empresa)
```

---

### 5. **RECUPERACIÓN DE CONTRASEÑA** → `pNetUsuarioRecovery`

Sistema de tokens para reseteo de contraseña.

```sql
pNetUsuarioRecovery
├── Usuario           VARCHAR(10)
├── IDUsuarioTipo     INT
├── eMail             VARCHAR(50)
├── Token             VARCHAR(100)
└── FechaSolicitud    DATETIME DEFAULT GETDATE()
```

---

### 6. **DOCUMENTOS DE PROVEEDORES** → Tablas `wProv*`

Ya existen tablas web para anexar documentos:

#### a) **CFDIs / Facturas:** `wProvAnexarCFDI`
```sql
wProvAnexarCFDI (19 columnas)
├── Anexo ID
├── Proveedor (FK)
├── Archivo XML
├── Archivo PDF
├── UUID
├── Fecha
└── Estatus
```

#### b) **Otros Documentos:** `wProvAnexoArchivos`
```sql
wProvAnexoArchivos (8 columnas)
├── ID
├── Archivo
├── Nombre
├── Tipo
└── Fecha
```

#### c) **Soporte Alta:** `wProvSoporteAlta`
```sql
wProvSoporteAlta (14 columnas)
├── ID
├── Proveedor
├── Documentos requeridos
└── Estatus validación
```

---

### 7. **ÓRDENES DE COMPRA**

#### Tabla ERP: `Compra`
```sql
Compra (131 columnas)
├── ID
├── Mov              VARCHAR(20)    -- Tipo de movimiento
├── MovID            INT            -- ID del movimiento
├── Proveedor        VARCHAR(10)    -- FK a Prov
├── Fecha
├── Importe
├── Estatus
└── ...
```

#### Tabla Web: `wProvOrdCompra`
```sql
wProvOrdCompra (30 columnas)
├── ID
├── Proveedor
├── Orden
├── Fecha
├── Monto
├── Estatus
└── Detalles
```

---

### 8. **FACTURAS / CFDIs**

#### Opción 1: `DocumentacionXML`
```sql
DocumentacionXML (52 columnas)
├── ID
├── UUID
├── Proveedor
├── XML
├── PDF
├── Validación SAT
└── Estatus
```

#### Opción 2: Tabla CFDI específica
Hay múltiples tablas CFDI en el sistema.

---

## 🔄 FLUJO DE DATOS

### **REGISTRO DE PROVEEDOR:**

```
1. Usuario se registra con email
   ↓
2. Se crea registro en `pNetUsuario`
   - IDUsuarioTipo = 4 (Proveedor)
   - Usuario = Código del proveedor (generado)
   - eMail = email proporcionado
   - Estatus = 'PENDIENTE'
   ↓
3. Se crea/actualiza registro en `Prov`
   - Proveedor = mismo código
   - Datos del proveedor
   - Estatus = 'PENDIENTE_VALIDACION'
   ↓
4. Se relaciona con empresa en `pNetUsuarioEmpresa`
   - IDUsuario = del paso 2
   - Empresa = 'LCDM' o 'ARK'
```

### **LOGIN:**

```
1. Usuario ingresa email + password
   ↓
2. Se busca en `pNetUsuario` por eMail
   ↓
3. Se valida password (hash)
   ↓
4. Se obtiene tipo de usuario de `pNetUsuarioTipo`
   ↓
5. Si es Proveedor (tipo 4):
   - Se hace JOIN con `Prov` usando campo `Usuario`
   - Se obtienen datos completos del proveedor
   ↓
6. Se obtienen empresas de `pNetUsuarioEmpresa`
```

### **CONSULTA DE ÓRDENES DE COMPRA:**

```
1. Usuario proveedor autenticado
   ↓
2. Se obtiene campo `Usuario` de `pNetUsuario`
   (que corresponde al campo `Proveedor` en tabla `Prov`)
   ↓
3. Se consulta `Compra` o `wProvOrdCompra`
   WHERE Proveedor = usuario.Usuario
   ↓
4. Se filtran por empresa si aplica
```

---

## 💻 IMPLEMENTACIÓN EN CÓDIGO

### **Interface TypeScript:**

```typescript
// Tipos de usuario
export enum UserType {
  INTELISIS = 1,
  PERSONAL = 2,
  CLIENTE = 3,
  PROVEEDOR = 4,
  ACREEDOR = 5,
  PROYECTO = 6,
  COLABORADOR = 7
}

// Usuario del portal
export interface PNetUser {
  IDUsuario: number;
  Usuario: string;           // FK a Prov.Proveedor o Usuario.Usuario
  IDUsuarioTipo: UserType;
  eMail: string;
  Nombre: string;
  UrlImagen?: string;
  Estatus: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE';
  FechaRegistro: Date;
  Telefono?: string;
  PrimeraVez: boolean;
  Empresa?: string;

  // Datos relacionados (joins)
  Proveedor?: ProveedorData;  // Si es tipo PROVEEDOR
  UsuarioInterno?: Usuario;    // Si es tipo INTELISIS/PERSONAL
}

// Proveedor
export interface ProveedorData {
  Proveedor: string;      // PK
  Nombre: string;
  RFC?: string;
  Direccion?: string;
  Colonia?: string;
  Poblacion?: string;
  Estado?: string;
  CodigoPostal?: string;
  Pais?: string;
  Telefonos?: string;
  Estatus: string;
  Situacion?: string;
  Observaciones?: string;
}
```

### **Ejemplo de Query:**

```typescript
// Login de proveedor
async function loginProveedor(email: string, password: string) {
  const query = `
    SELECT
      u.IDUsuario,
      u.Usuario,
      u.eMail,
      u.Nombre,
      u.IDUsuarioTipo,
      u.Estatus,
      p.Proveedor,
      p.Nombre as ProveedorNombre,
      p.RFC,
      p.Direccion,
      p.Estatus as ProveedorEstatus
    FROM pNetUsuario u
    INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
    LEFT JOIN Prov p ON u.Usuario = p.Proveedor AND t.Tabla = 'Prov'
    WHERE u.eMail = @email
      AND u.Estatus = 'ACTIVO'
  `;

  const result = await pool.request()
    .input('email', sql.VarChar(50), email)
    .query(query);

  if (result.recordset.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  const user = result.recordset[0];

  // Validar password...

  return user;
}
```

---

## ✅ VENTAJAS DE USAR TABLAS EXISTENTES

1. ✅ **Integración total con ERP** - Los datos están sincronizados automáticamente
2. ✅ **No duplicar información** - Una sola fuente de verdad
3. ✅ **Sistema ya probado** - Las tablas pNet ya existen y funcionan
4. ✅ **Soporte multi-empresa** - Ya está implementado
5. ✅ **Recuperación de contraseña** - Ya implementado
6. ✅ **Tipos de usuario flexibles** - Sistema extensible

---

## 📋 PRÓXIMOS PASOS

### 1. **Actualizar la implementación SqlServerDatabase**
   - Reemplazar tablas custom por tablas pNet
   - Usar `pNetUsuario` en lugar de `users`
   - Usar `Prov` para datos de proveedores

### 2. **Crear vistas personalizadas** (opcional)
   - Crear views SQL que simplifiquen las consultas
   - Ejemplo: `vw_ProveedoresPortal` que une pNetUsuario + Prov

### 3. **Adaptar el sistema de autenticación**
   - NextAuth debe usar `pNetUsuario` y `pNetUsuarioRecovery`

### 4. **Documentar mapeo de campos**
   - Crear diccionario de qué campo del frontend mapea a qué campo de BD

---

## 🎯 RESUMEN DE TABLAS A USAR

| Funcionalidad | Tabla(s) | Estado |
|---------------|----------|--------|
| Usuarios Portal | `pNetUsuario` | ✅ Existe |
| Tipos Usuario | `pNetUsuarioTipo` | ✅ Existe (7 tipos) |
| Proveedores | `Prov` | ✅ Existe (7 registros) |
| Usuario-Empresa | `pNetUsuarioEmpresa` | ✅ Existe |
| Recovery Password | `pNetUsuarioRecovery` | ✅ Existe |
| Empresas | `Empresa` | ✅ Existe |
| Documentos | `wProvAnexarCFDI`, `wProvAnexoArchivos` | ✅ Existe |
| Órdenes Compra | `Compra`, `wProvOrdCompra` | ✅ Existe |
| Facturas | `DocumentacionXML`, `wProvAnexarCFDI` | ✅ Existe |

---

**Fecha:** 2025-11-26
**Base de Datos:** PP (cloud.arkitem.com)
**Sistema:** Portal de Proveedores - La Cantera
