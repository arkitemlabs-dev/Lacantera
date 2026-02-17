# Mapa de IDs de Proveedor — Portal vs ERP

## REGLA DE ORO

> **Todos los Stored Procedures y queries al ERP reciben el código de proveedor del ERP (`erp_proveedor_code`), NUNCA el ID del portal (`session.user.id`).**
>
> El ID del portal solo sirve para autenticar al usuario y buscar su mapeo. Una vez obtenido el `erp_proveedor_code`, ese es el que viaja a cualquier SP o query ERP.

---

## Las 3 Bases de Datos

| Base | Servidor | Propósito |
|------|----------|-----------|
| **PP** | SQL Server (auth) | Usuarios del portal, mapeos, facturas subidas, notificaciones |
| **Cantera** (y variantes por empresa) | SQL Server (ERP) | Datos maestros de proveedores, órdenes de compra, pagos |
| **Azure Blob Storage** | Azure | Archivos XML/PDF |

---

## Tablas Clave y sus IDs

### 1. `PP.dbo.WebUsuario` — Usuarios del Portal

| Columna | Tipo | Ejemplo | Descripción |
|---------|------|---------|-------------|
| **UsuarioWeb** (PK) | VARCHAR(50) | `PROV12345678` | **ID del Portal** — generado al registrarse |
| eMail | VARCHAR(100) | `prov@ejemplo.com` | Login del usuario |
| Contrasena | VARCHAR(255) | `$2b$10$...` | Hash bcrypt |
| Rol | VARCHAR(50) | `proveedor` | `proveedor`, `admin`, `super-admin` |
| Empresa | VARCHAR(2) | `01` | Empresa default (legacy) |
| **Proveedor** | VARCHAR(50) | `P00443` | **Código ERP** (DEPRECATED — usar tabla mapping) |

**Notas:**
- `UsuarioWeb` = lo que entra en `session.user.id`
- `Proveedor` se guarda por compatibilidad pero el flujo correcto es vía `portal_proveedor_mapping`

### 2. `PP.dbo.portal_proveedor_mapping` — Enlace Portal ↔ ERP (Multi-Tenant)

| Columna | Tipo | Ejemplo | Descripción |
|---------|------|---------|-------------|
| id (PK) | UNIQUEIDENTIFIER | GUID | Auto-generado |
| **portal_user_id** | NVARCHAR(50) | `PROV12345678` | FK → `WebUsuario.UsuarioWeb` |
| **erp_proveedor_code** | VARCHAR(10) | `P00443` | FK lógica → `ERP.dbo.Prov.Proveedor` |
| **empresa_code** | VARCHAR(5) | `01` | Código de empresa (`01`-`10`) |
| activo | BIT | `1` | Registro activo |

**Constraint único:** `(portal_user_id, erp_proveedor_code, empresa_code)`

**Esta tabla es el puente oficial.** Un proveedor del portal puede tener diferentes códigos ERP en distintas empresas.

### 3. `ERP.dbo.Prov` — Proveedores en el ERP

| Columna | Tipo | Ejemplo | Descripción |
|---------|------|---------|-------------|
| **Proveedor** (PK) | VARCHAR(10) | `P00443` | **Código ERP** — este es el que usan todos los SPs |
| Nombre | NVARCHAR(100) | `Aceros del Norte` | Razón social |
| RFC | VARCHAR(15) | `ANO850101ABC` | RFC fiscal |
| Estatus | VARCHAR(20) | `ALTA` | `ALTA` / `BAJA` |
| eMail1, Telefono, Direccion, etc. | — | — | Datos de contacto y fiscales |

**Nota:** La tabla `Prov` existe en cada base ERP (Cantera, Peralillo, etc.) con datos potencialmente diferentes.

### 4. `PP.dbo.ProvFacturas` — Facturas Subidas

| Columna | Tipo | Debe Contener | Descripción |
|---------|------|---------------|-------------|
| **Proveedor** | VARCHAR(10) | `P00443` | **DEBE ser el código ERP**, NO el ID del portal |
| **SubidoPor** | VARCHAR(10) | `PROV1234...` | Puede ser el ID del portal (quién subió) |
| Empresa | VARCHAR(5) | `01` | Código de empresa |
| UUID, Folio, Total, etc. | — | — | Datos del CFDI |

---

## Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ REGISTRO                                                         │
│                                                                  │
│  1. Proveedor ingresa RFC                                        │
│  2. Sistema busca RFC en ERP → obtiene Prov.Proveedor (P00443)  │
│  3. Genera Portal ID: PROV + timestamp (PROV12345678)           │
│  4. INSERT WebUsuario (UsuarioWeb=PROV12345678, Prov=P00443)    │
│  5. INSERT portal_proveedor_mapping:                             │
│     portal_user_id=PROV12345678, erp_proveedor_code=P00443,     │
│     empresa_code=01                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LOGIN                                                            │
│                                                                  │
│  1. NextAuth autentica → session.user.id = PROV12345678         │
│  2. session.user.proveedor = P00443 (legacy, de WebUsuario)     │
│  3. session.user.empresasDisponibles = [                         │
│       { codigo: "01", proveedorCodigo: "P00443" },              │
│       { codigo: "03", proveedorCodigo: "P00556" }  ← diferente │
│     ]                                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LLAMADA A CUALQUIER API / SP                                     │
│                                                                  │
│  1. Obtener session.user.id (PROV12345678) ← solo para auth    │
│  2. Consultar portal_proveedor_mapping:                          │
│     WHERE portal_user_id = session.user.id                       │
│       AND empresa_code = session.user.empresaActual              │
│       AND activo = 1                                             │
│     → erp_proveedor_code = P00443                                │
│  3. Pasar erp_proveedor_code a TODOS los SPs y queries ERP     │
│                                                                  │
│  ⛔ NUNCA pasar session.user.id a un SP del ERP                 │
│  ⛔ NUNCA usar session.user.id como valor de columna Proveedor  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Patrón de Código Correcto

```typescript
// ✅ CORRECTO — Patrón estándar para obtener el código ERP
const userId = session.user.id;                    // Portal ID (solo para auth)
const empresaActual = session.user.empresaActual;  // Empresa seleccionada

// Buscar mapeo
const portalPool = await getPortalConnection();
const mappingResult = await portalPool.request()
  .input('userId', sql.NVarChar(50), userId)
  .input('empresaCode', sql.VarChar(50), empresaActual)
  .query(`
    SELECT erp_proveedor_code
    FROM portal_proveedor_mapping
    WHERE portal_user_id = @userId
      AND empresa_code = @empresaCode
      AND activo = 1
  `);

const erpProveedorCode = mappingResult.recordset[0]?.erp_proveedor_code;
if (!erpProveedorCode) {
  return NextResponse.json({ success: false, error: 'Sin acceso a esta empresa' }, { status: 403 });
}

// Usar erpProveedorCode en TODOS los SPs
await sp.getOrdenesCompra({ clave: erpProveedorCode, empresa: empresaActual });
await sp.getFacturas({ proveedor: erpProveedorCode, empresa: empresaActual });

// ✅ En INSERT a ProvFacturas
.input('proveedor', sql.VarChar(10), erpProveedorCode)  // Código ERP
.input('subidoPor', sql.VarChar(50), userId)             // ID Portal (quién hizo la acción)
```

```typescript
// ❌ INCORRECTO — NUNCA hacer esto
.input('proveedor', sql.VarChar(10), String(userId).substring(0, 10))  // ← BUG: Portal ID
.input('proveedor', sql.VarChar(10), session.user.id)                  // ← BUG: Portal ID
```

---

## Resumen de Variables en Session

| Variable | Valor Ejemplo | Es... | Usar para... |
|----------|---------------|-------|--------------|
| `session.user.id` | `PROV12345678` | ID Portal | Autenticación, auditoría, `SubidoPor` |
| `session.user.proveedor` | `P00443` | Código ERP (legacy) | **Fallback** si mapping falla |
| `session.user.empresaActual` | `01` | Empresa activa | Filtrar mapping y SPs |
| `session.user.empresasDisponibles[n].proveedorCodigo` | `P00443` | Código ERP por empresa | Alternativa al query directo |
| `portal_proveedor_mapping.erp_proveedor_code` | `P00443` | Código ERP (fuente oficial) | **TODOS los SPs y queries ERP** |

---

## Archivos que Participan en el Flujo

| Archivo | Rol |
|---------|-----|
| `src/lib/auth.config.ts` | Carga session con ambos IDs |
| `src/lib/database/stored-procedures.ts` | Wrapper SPs (reciben código ERP) |
| `src/lib/database/hybrid-queries.ts` | `getUserTenants()` consulta mapping |
| `src/app/api/auth/register/route.ts` | Registro: crea WebUsuario + mapping |
| `src/app/api/proveedor/*/route.ts` | Todos consultan mapping → usan ERP code |
| `src/types/next-auth.d.ts` | Tipos de session/JWT |

---

*Última actualización: 2026-02-16*
