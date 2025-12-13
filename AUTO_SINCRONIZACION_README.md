# Sistema de Auto-Sincronización de Proveedores ✅

## Resumen

Se ha implementado un sistema de auto-sincronización que detecta automáticamente en qué empresas existe un proveedor (por RFC) y crea los mappings necesarios para que tenga acceso inmediato a sus datos.

---

## 🎯 ¿Cómo Funciona?

### Escenario 1: Registro de Proveedor Nuevo

Cuando un proveedor se registra con su RFC (ej: `ACE140813E29`):

1. **Se crea usuario en el portal** (tabla `pNetUsuario` y `Prov`)
2. **Auto-sincronización automática**:
   - Sistema busca el RFC en las 5 empresas (ERPs)
   - Por cada empresa donde lo encuentra, crea mapping en `portal_proveedor_mapping`
3. **Al hacer login**:
   - Usuario ve lista de empresas disponibles
   - Puede seleccionar la empresa para trabajar
   - Ve SOLO los datos de esa empresa

### Escenario 2: Proveedor Existente que se Registra

Ejemplo: ARQUITECTURA Y CONSULTORIA EMPRESARIAL ya existe en los ERPs.

**Antes (sin auto-sync)**:
- Proveedor se registra
- No ve ninguna empresa
- Admin debe crear mappings manualmente

**Ahora (con auto-sync)**:
- Proveedor se registra con RFC: `ACE140813E29`
- Sistema busca automáticamente en los 5 ERPs
- Encuentra:
  - La Cantera: código P00443
  - Peralillo: código P00443
  - Plaza Galereña: código PV-56
  - Inmobiliaria Galereña: código PV-56
  - Icrear: código PV-56
- Crea 5 mappings automáticamente
- Al login, usuario ve las 5 empresas disponibles

---

## 📦 Componentes Implementados

### 1. Servicio de Auto-Sincronización
**Archivo**: [src/lib/services/auto-sync-proveedor.ts](src/lib/services/auto-sync-proveedor.ts)

**Funciones principales**:

```typescript
// Sincronizar un proveedor por RFC
autoSyncProveedorByRFC(userId: string, rfc: string): Promise<SyncResult>

// Obtener empresas disponibles para un usuario
getEmpresasDisponibles(userId: string): Promise<Array<Empresa>>

// Sincronizar TODOS los proveedores (migración masiva)
syncAllProveedores(): Promise<MassiveSyncResult>
```

**Proceso de sincronización**:
1. Conecta a cada ERP (la-cantera, peralillo, plaza-galerena, inmobiliaria-galerena, icrear)
2. Busca proveedor por RFC en tabla `Prov`
3. Si lo encuentra, verifica si ya existe mapping
4. Si no existe mapping, lo crea en `portal_proveedor_mapping`
5. Retorna resumen con empresas encontradas

### 2. Endpoint de Auto-Sync
**Archivo**: [src/app/api/auth/auto-sync/route.ts](src/app/api/auth/auto-sync/route.ts)

#### POST /api/auth/auto-sync
Sincroniza manualmente un proveedor.

**Body (JSON)**:
```json
{
  "userId": "123",  // Opcional, usa sesión si no se proporciona
  "rfc": "ACE140813E29"  // Opcional, lo busca del usuario
}
```

**Respuesta**:
```json
{
  "success": true,
  "userId": "123",
  "rfc": "ACE140813E29",
  "empresasEncontradas": 5,
  "mappingsCreados": 5,
  "detalles": [
    {
      "empresa": "la-cantera",
      "codigoProveedor": "P00443",
      "nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
      "rfc": "ACE140813E29"
    },
    ...
  ],
  "empresasDisponibles": [
    {
      "code": "la-cantera",
      "nombre": "La Cantera",
      "codigoProveedor": "P00443"
    },
    ...
  ]
}
```

#### GET /api/auth/auto-sync
Verifica el estado de sincronización del usuario actual.

**Respuesta**:
```json
{
  "success": true,
  "userId": "123",
  "rfc": "ACE140813E29",
  "nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
  "empresasDisponibles": [...],
  "totalEmpresas": 5,
  "sincronizado": true
}
```

### 3. Integración en Registro
**Archivo**: [src/app/api/auth/register/route.ts](src/app/api/auth/register/route.ts)

**Modificación**:
Después de crear el usuario, automáticamente ejecuta:
```typescript
const syncResult = await autoSyncProveedorByRFC(userId, rfc);
```

**Respuesta de registro incluye**:
```json
{
  "success": true,
  "message": "Registro exitoso...",
  "userId": "123",
  "proveedorCodigo": "PROV001",
  "autoSync": {
    "empresasEncontradas": ["la-cantera", "peralillo"],
    "mappingsCreados": 2,
    "detalles": [...]
  }
}
```

### 4. Actualización de Login
**Archivo**: [src/lib/database/hybrid-queries.ts](src/lib/database/hybrid-queries.ts)

**Función actualizada**: `getUserTenants(userId)`

Ahora usa los códigos correctos:
- `la-cantera` (antes era LCDM)
- `peralillo` (antes era PERA)
- `plaza-galerena` (antes era PLAZ)
- `inmobiliaria-galerena` (antes era INMO)
- `icrear` (antes era ICRE)

---

## 🔄 Flujo Completo de Usuario

### Paso 1: Registro
```
Usuario Ingresa:
├─ Email: contacto@arquitectura.com
├─ Password: ********
├─ Nombre: Juan Pérez
├─ RFC: ACE140813E29
└─ Razón Social: ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV

Sistema:
├─ Crea usuario en pNetUsuario
├─ Crea proveedor en Prov (si no existe)
├─ 🔄 AUTO-SYNC:
│   ├─ Busca RFC en La Cantera → ✅ Encontrado (P00443)
│   ├─ Busca RFC en Peralillo → ✅ Encontrado (P00443)
│   ├─ Busca RFC en Plaza Galereña → ✅ Encontrado (PV-56)
│   ├─ Busca RFC en Inmobiliaria → ✅ Encontrado (PV-56)
│   └─ Busca RFC en Icrear → ✅ Encontrado (PV-56)
└─ Crea 5 mappings en portal_proveedor_mapping

Respuesta:
✅ "Registro exitoso. Se encontró tu proveedor en 5 empresas."
```

### Paso 2: Login
```
Usuario Ingresa:
├─ Email: contacto@arquitectura.com
└─ Password: ********

Sistema:
├─ Valida credenciales
├─ Consulta portal_proveedor_mapping
└─ Carga empresasDisponibles:
    ├─ La Cantera (P00443)
    ├─ Peralillo (P00443)
    ├─ Plaza Galereña (PV-56)
    ├─ Inmobiliaria Galereña (PV-56)
    └─ Icrear (PV-56)

Session creada:
{
  user: {
    id: "123",
    email: "contacto@arquitectura.com",
    name: "Juan Pérez",
    role: "proveedor",
    proveedor: "ACE140813E29",
    empresasDisponibles: [
      { tenantId: "la-cantera", tenantName: "La Cantera", proveedorCodigo: "P00443" },
      ...
    ],
    empresaActual: "la-cantera"  // Primera empresa por defecto
  }
}
```

### Paso 3: Selección de Empresa
```
Usuario selecciona: "Peralillo"

Frontend llama:
await update({ empresaActual: "peralillo" })

Sistema:
├─ Valida que usuario tiene acceso a "peralillo"
├─ Actualiza session.user.empresaActual = "peralillo"
└─ Todos los endpoints usan ahora el contexto de Peralillo

Dashboard muestra:
├─ Órdenes de Compra de Peralillo (Proveedor P00443)
├─ Facturas de Peralillo (Cxc donde Cliente = P00443)
├─ Pagos de Peralillo
└─ Complementos de Peralillo
```

---

## 🧪 Testing

### 1. Probar Auto-Sync Manual
```bash
# Sincronizar proveedor existente
curl -X POST http://localhost:3000/api/auth/auto-sync \
  -H "Content-Type: application/json" \
  -d '{"rfc": "ACE140813E29"}'
```

### 2. Verificar Estado de Sincronización
```bash
# Requiere estar autenticado
curl http://localhost:3000/api/auth/auto-sync \
  -H "Cookie: next-auth.session-token=..."
```

### 3. Registrar Proveedor de Prueba
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@arquitectura.com",
    "password": "Password123",
    "nombre": "Juan Test",
    "rfc": "ACE140813E29",
    "razonSocial": "ARQUITECTURA TEST"
  }'
```

Debería retornar:
```json
{
  "success": true,
  "autoSync": {
    "empresasEncontradas": ["la-cantera", "peralillo", ...],
    "mappingsCreados": 5
  }
}
```

### 4. Login y Verificar Empresas
```javascript
// En el frontend después de login
const session = await getSession();
console.log(session.user.empresasDisponibles);
// Debería mostrar array con las 5 empresas
```

---

## 📊 Tablas Involucradas

### Portal (PP)

#### pNetUsuario
Usuarios del portal.
```sql
IDUsuario INT PRIMARY KEY
Usuario VARCHAR(10)  -- Código del proveedor o username
eMail VARCHAR(50)
Nombre VARCHAR(100)
IDUsuarioTipo INT  -- 1=Admin, 4=Proveedor
Estatus VARCHAR(15)
```

#### Prov
Catálogo de proveedores (para nuevos).
```sql
Proveedor VARCHAR(10) PRIMARY KEY
Nombre VARCHAR(100)
RFC VARCHAR(15)
Estatus VARCHAR(15)
```

#### portal_proveedor_mapping ⭐ CLAVE
Mapeo usuario <-> proveedor <-> empresa.
```sql
id UNIQUEIDENTIFIER PRIMARY KEY
portal_user_id NVARCHAR(50)  -- FK a pNetUsuario.IDUsuario
erp_proveedor_code VARCHAR(20)  -- Código del proveedor en ERP (P00443, PV-56, etc.)
empresa_code VARCHAR(50)  -- la-cantera, peralillo, etc.
permisos NVARCHAR(MAX)  -- JSON con permisos específicos
activo BIT
created_at DATETIME2
```

### ERPs (Cantera_ajustes, Peralillo_Ajustes, etc.)

#### Prov
Proveedores en cada ERP.
```sql
Proveedor VARCHAR(10) PRIMARY KEY  -- P00443, PV-56, etc.
Nombre VARCHAR(100)
RFC VARCHAR(15)  -- ACE140813E29
Estatus VARCHAR(15)
```

---

## 🔧 Sincronización Masiva (Opcional)

Si ya tienes proveedores registrados sin mappings, puedes sincronizarlos todos:

### Opción 1: Llamar función directamente
```typescript
import { syncAllProveedores } from '@/lib/services/auto-sync-proveedor';

const result = await syncAllProveedores();
console.log(`Sincronizados: ${result.sincronizados}/${result.total}`);
```

### Opción 2: Crear endpoint admin
```typescript
// src/app/api/admin/sync-all-proveedores/route.ts
export async function POST(request: NextRequest) {
  // Verificar que sea admin
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await syncAllProveedores();
  return NextResponse.json(result);
}
```

---

## 📝 Notas Importantes

### ¿Qué pasa si el RFC no existe en ningún ERP?
- La sincronización no falla
- Se retorna `empresasEncontradas: 0`
- Usuario puede seguir usando el portal (sin acceso a empresas)
- Admin puede crear mappings manualmente después

### ¿Se puede sincronizar manualmente después del registro?
Sí, el usuario o admin pueden llamar:
```bash
POST /api/auth/auto-sync
```

### ¿Los mappings se actualizan automáticamente?
- Al registro: SÍ (una sola vez)
- Al login: NO (solo lee los existentes)
- Manualmente: SÍ (llamando al endpoint)

### ¿Qué pasa si un proveedor se da de alta en un nuevo ERP?
Debe ejecutar manualmente la sincronización:
```bash
POST /api/auth/auto-sync
```
O el admin puede hacerlo desde un panel.

### ¿Los mappings se duplican si se ejecuta dos veces?
NO. El sistema verifica si ya existe el mapping antes de crearlo.

---

## ✅ Checklist de Implementación

- [x] Servicio de auto-sincronización creado
- [x] Endpoint POST/GET /api/auth/auto-sync
- [x] Integración en registro
- [x] Actualización de getUserTenants()
- [x] Documentación completa
- [ ] Probar con RFC ACE140813E29
- [ ] Probar con RFC que no existe
- [ ] Verificar login con múltiples empresas
- [ ] Probar cambio de empresa en sesión

---

## 🚀 Próximos Pasos Opcionales

1. **Dashboard de Sincronización (Admin)**:
   - Ver proveedores sin sincronizar
   - Ejecutar sincronización masiva
   - Ver historial de sincronizaciones

2. **Re-sincronización Periódica**:
   - Cron job que sincroniza proveedores semanalmente
   - Detecta nuevos proveedores en ERPs

3. **Notificaciones**:
   - Email al proveedor cuando se crea mapping
   - "Se detectó tu proveedor en 3 empresas nuevas"

4. **Interfaz de Selección de Empresa**:
   - Dropdown en header para cambiar empresa
   - Guardar empresa preferida del usuario

---

¡Sistema de Auto-Sincronización Completado! 🎉
