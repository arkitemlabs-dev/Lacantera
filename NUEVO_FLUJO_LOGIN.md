# 🔐 Nuevo Flujo de Login Multi-Tenant

## 📋 Resumen

Ahora el login funciona en **2 pasos**:

1. **Paso 1:** Usuario ingresa email y contraseña → Sistema valida y muestra empresas disponibles
2. **Paso 2:** Usuario selecciona una empresa → Sistema crea sesión con esa empresa

---

## 🎯 Flujo Completo

### Paso 1: Validar Credenciales

**Pantalla:** Formulario de login básico

```
┌──────────────────────────────────────┐
│ Email: _____________________________ │
│ Password: __________________________ │
│                                      │
│         [Continuar]                  │
└──────────────────────────────────────┘
```

**Usuario ingresa:**
- Email: `proveedor@test.com`
- Password: `Test123!`

**Sistema:**
1. Click en "Continuar"
2. Llama a `/api/auth/validate-and-get-empresas`
3. Valida credenciales en BD
4. Obtiene lista de empresas del usuario
5. Muestra paso 2

---

### Paso 2: Seleccionar Empresa

**Pantalla:** Selector de empresas

```
┌──────────────────────────────────────┐
│    Seleccione una Empresa            │
│    Tiene acceso a 5 empresa(s)       │
│                                      │
│  ┌───────────────────────────────┐  │
│  │ 🏢 La Cantera Desarrollos     │  │
│  │    Código: LCDM               │ ✓│
│  └───────────────────────────────┘  │
│                                      │
│  ┌───────────────────────────────┐  │
│  │ 🏢 Peralillo S.A de C.V       │  │
│  │    Código: PERA               │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌───────────────────────────────┐  │
│  │ 🏢 Plaza Galereña             │  │
│  │    Código: PLAZ               │  │
│  └───────────────────────────────┘  │
│                                      │
│  ... (2 more)                        │
│                                      │
│  [Atrás]    [Iniciar Sesión]        │
└──────────────────────────────────────┘
```

**Usuario:**
- Click en una empresa (ej: "La Cantera")
- Click en "Iniciar Sesión"

**Sistema:**
1. Llama a `signIn('credentials', { empresaId: 'la-cantera' })`
2. NextAuth valida y crea JWT con `empresaActual: 'la-cantera'`
3. Redirige al dashboard
4. Usuario ya está logueado en La Cantera

---

## 🔄 Caso Especial: Usuario con 1 Sola Empresa

Si el usuario solo tiene acceso a **1 empresa**, el sistema **saltea el paso 2** y hace login automáticamente:

```
Usuario ingresa credenciales
    ↓
Sistema valida
    ↓
¿Tiene 1 sola empresa?
    ↓ Sí
Login automático con esa empresa
    ↓
Dashboard
```

---

## 🛠️ Implementación Técnica

### Archivos Modificados

1. **[src/app/login/page.tsx](src/app/login/page.tsx)**
   - Formulario de 2 pasos
   - Paso 1: Email + Password
   - Paso 2: Selector visual de empresas

2. **[src/app/api/auth/validate-and-get-empresas/route.ts](src/app/api/auth/validate-and-get-empresas/route.ts)** (NUEVO)
   - Valida credenciales sin crear sesión
   - Devuelve lista de empresas disponibles

3. **[src/lib/auth.config.ts](src/lib/auth.config.ts)**
   - `authorize()` ahora recibe `empresaId`
   - JWT callback usa `empresaId` si viene del login
   - Si no viene, usa la primera empresa

### API Endpoint Nuevo

```typescript
POST /api/auth/validate-and-get-empresas

Request:
{
  "email": "proveedor@test.com",
  "password": "Test123!"
}

Response (éxito):
{
  "success": true,
  "userId": "3",
  "empresas": [
    {
      "tenantId": "la-cantera",
      "tenantName": "La Cantera Desarrollos Mineros",
      "empresaCodigo": "LCDM",
      "proveedorCodigo": "PROV001"
    },
    {
      "tenantId": "peralillo",
      "tenantName": "Peralillo S.A de C.V",
      "empresaCodigo": "PERA",
      "proveedorCodigo": "PROV001"
    },
    ...
  ],
  "totalEmpresas": 5
}

Response (error):
{
  "error": "Credenciales inválidas"
}
```

---

## 🧪 Cómo Probarlo

### 1. Asegúrate de tener los mappings creados

```sql
-- Ejecuta si aún no lo hiciste:
-- scripts/crear-mappings-manual.sql
-- scripts/resetear-password-usuario.sql
```

### 2. Ve al login

```
http://localhost:3000/login
```

### 3. Ingresa credenciales

```
Email: proveedor@test.com
Password: Test123!
```

### 4. Click en "Continuar"

Deberías ver la pantalla de selección de empresas con **5 opciones**.

### 5. Selecciona una empresa

Click en cualquiera de las 5 empresas.

### 6. Click en "Iniciar Sesión"

El sistema debería:
- Crear sesión JWT
- Redirigir al dashboard
- Mostrar la empresa seleccionada en el selector del header

---

## ✅ Verificaciones

### Verificar que funcionó:

1. **En el header del dashboard:**
   - Deberías ver el selector con la empresa que elegiste

2. **En la consola del navegador:**
```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('Empresa actual:', data.user.empresaActual);
    console.log('Total empresas:', data.user.empresasDisponibles.length);
  });
```

Debería mostrar:
```
Empresa actual: la-cantera (o la que hayas elegido)
Total empresas: 5
```

---

## 🎨 UI del Selector de Empresas

El selector muestra:

- **Icono de edificio** 🏢
- **Nombre completo** de la empresa
- **Código** (LCDM, PERA, etc.)
- **Código de proveedor** (PROV001)
- **Checkmark** ✓ en la seleccionada
- **Hover effect** al pasar el mouse
- **Estado seleccionado** con border azul y fondo

---

## 🔒 Seguridad

### Validaciones implementadas:

1. **Credenciales:**
   - Email y password requeridos
   - Password hasheado con bcrypt
   - Usuario debe estar ACTIVO

2. **Empresas:**
   - Solo se muestran empresas con mapping activo
   - Usuario debe tener `erp_proveedor_code` configurado
   - No se puede elegir empresa sin acceso

3. **Session:**
   - JWT valida que empresa existe en `empresasDisponibles`
   - Si intenta elegir empresa sin acceso, se usa la primera por defecto
   - Logs de todos los intentos de acceso

---

## 📊 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────┐
│                      INICIO                             │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
      ┌────────────────┐
      │ Formulario     │
      │ Email/Password │
      └────────┬───────┘
               │
               ▼
      ┌────────────────────────┐
      │ POST /validate-and...  │
      │ Validar credenciales   │
      └────────┬───────────────┘
               │
               ▼
          ¿Válidas?
          /      \
        Sí        No
        │          │
        │          ▼
        │      [Error]
        │
        ▼
   ┌─────────────┐
   │ Obtener     │
   │ empresas    │
   └──────┬──────┘
          │
          ▼
      ¿Cuántas?
      /        \
   1 empresa   Múltiples
     │            │
     │            ▼
     │      ┌──────────────┐
     │      │ Mostrar      │
     │      │ selector     │
     │      └──────┬───────┘
     │             │
     │             ▼
     │      ┌──────────────┐
     │      │ Usuario      │
     │      │ selecciona   │
     │      └──────┬───────┘
     │             │
     └─────────────┴─────────────┐
                                 │
                                 ▼
                        ┌────────────────┐
                        │ signIn() con   │
                        │ empresaId      │
                        └────────┬───────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Crear JWT con  │
                        │ empresaActual  │
                        └────────┬───────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Redirigir a    │
                        │ Dashboard      │
                        └────────────────┘
```

---

## 💡 Ventajas del Nuevo Flujo

### Para el Usuario:
✅ **Control total** sobre qué empresa usar desde el inicio
✅ **Visual claro** de todas las empresas disponibles
✅ **Una sola contraseña** para todas las empresas
✅ **Puede cambiar** después con el selector del header

### Para el Sistema:
✅ **Seguro** - Valida antes de mostrar empresas
✅ **Auditable** - Logs de qué empresa eligió cada usuario
✅ **Escalable** - Fácil agregar más empresas
✅ **Flexible** - Auto-login si solo tiene 1 empresa

---

## 🐛 Troubleshooting

### No veo empresas en el selector

**Problema:** Paso 2 muestra "Tiene acceso a 0 empresa(s)"

**Solución:**
```sql
-- Verificar mappings
SELECT * FROM portal_proveedor_mapping WHERE portal_user_id = '3';

-- Si está vacío, ejecuta:
-- scripts/crear-mappings-manual.sql
```

### Error "Credenciales inválidas" en Paso 1

**Solución:**
```sql
-- Verificar usuario existe y está activo
SELECT * FROM pNetUsuario WHERE eMail = 'proveedor@test.com';

-- Verificar password existe
SELECT * FROM pNetUsuarioPassword WHERE IDUsuario = 3;

-- Si no tiene password, ejecuta:
-- scripts/resetear-password-usuario.sql
```

### Login se queda cargando

**Revisar logs en terminal:**
```bash
# Busca errores en la terminal donde corre npm run dev
# Especialmente:
[AUTH] Error obteniendo empresas: ...
[API] Error validando credenciales: ...
```

---

## 🎉 ¡Listo!

Ahora tu sistema tiene un **flujo de login moderno** con selección visual de empresas.

**Próximo paso:** Probar el login y verificar que todo funciona correctamente.
