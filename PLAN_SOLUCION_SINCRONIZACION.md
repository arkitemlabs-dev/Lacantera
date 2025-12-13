# Plan de Solución: Problema de Sincronización ACE140813E29

## Problema Actual

Te registraste como ARQUITECTURA Y CONSULTORIA (RFC: ACE140813E29) pero:
- ❌ Información general muestra datos de prueba
- ❌ No aparece información de Arquitectura y Consultoria S.A. de C.V.
- ❌ Órdenes de compra: vacías
- ❌ Facturas: vacías
- ❌ Pagos: vacíos

**Causa probable**: La auto-sincronización no creó los mappings necesarios en `portal_proveedor_mapping`.

---

## Solución: 3 Pasos

### PASO 1: Diagnóstico ✅ EJECUTAR PRIMERO

**Ejecutar en**: Servidor Portal (cloud.arkitem.com) - Database: PP

**Script**: [scripts/diagnostico-sincronizacion.sql](scripts/diagnostico-sincronizacion.sql)

**Este script te mostrará**:
1. ✅ Si el usuario ACE140813E29 fue creado correctamente
2. ✅ Si existen mappings para este usuario
3. ✅ Si la tabla `portal_proveedor_mapping` existe
4. ✅ Estructura de la tabla (si existe)

**Resultados esperados**:

#### Caso A: Tabla NO existe
```
❌ Tabla portal_proveedor_mapping NO EXISTE - DEBE CREARSE
```
→ **Ir a PASO 2A**

#### Caso B: Tabla existe pero NO hay mappings
```
✅ Tabla portal_proveedor_mapping existe
(Query 2 retorna 0 filas)
```
→ **Ir a PASO 2B**

#### Caso C: Tabla y mappings existen
```
✅ Tabla portal_proveedor_mapping existe
(Query 2 retorna 5 filas con empresas)
```
→ **Problema es otro, ir a PASO 3**

---

### PASO 2A: Crear Tabla (solo si no existe)

**Ejecutar en**: Servidor Portal (cloud.arkitem.com) - Database: PP

**Script**: [scripts/crear-tabla-portal-proveedor-mapping.sql](scripts/crear-tabla-portal-proveedor-mapping.sql)

**Qué hace**:
- Crea la tabla `portal_proveedor_mapping`
- Crea índices para optimizar consultas
- Muestra estructura de la tabla

**Después de ejecutar**: Ir a PASO 2B

---

### PASO 2B: Sincronización Manual

**Ejecutar en**: Servidor Portal (cloud.arkitem.com) - Database: PP

**Script**: [scripts/sincronizar-arquitectura-manual.sql](scripts/sincronizar-arquitectura-manual.sql)

**Qué hace**:
1. Busca el IDUsuario del registro con RFC ACE140813E29
2. Verifica que la tabla `portal_proveedor_mapping` existe
3. Crea 5 mappings (uno por cada empresa):
   - La Cantera → Proveedor P00443
   - Peralillo → Proveedor P00443
   - Plaza Galereña → Proveedor PV-56
   - Inmobiliaria Galereña → Proveedor PV-56
   - Icrear → Proveedor PV-56
4. Muestra resumen de mappings creados

**Resultado esperado**:
```
✅ Usuario encontrado: 123
✅ Tabla portal_proveedor_mapping existe
✅ La Cantera (P00443) - Mapping creado
✅ Peralillo (P00443) - Mapping creado
✅ Plaza Galereña (PV-56) - Mapping creado
✅ Inmobiliaria Galereña (PV-56) - Mapping creado
✅ Icrear (PV-56) - Mapping creado
```

**Después de ejecutar**: Ir a PASO 3

---

### PASO 3: Cerrar Sesión y Volver a Iniciar

**Importante**: Los cambios en mappings solo se reflejan al hacer login.

**Proceso**:

1. **En el portal web**:
   - Cierra sesión (logout)

2. **Vuelve a hacer login**:
   - Email: contacto@arquitectura.com (o el que usaste)
   - Password: (tu password)

3. **Verifica que ahora veas**:
   - ✅ Selector de empresa con 5 opciones:
     - La Cantera
     - Peralillo
     - Plaza Galereña
     - Inmobiliaria Galereña
     - Icrear

4. **Selecciona una empresa** (ej: La Cantera)

5. **Verifica que ahora aparezca**:
   - ✅ Información General: ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV
   - ✅ RFC: ACE140813E29
   - ✅ Código Proveedor: P00443 (o PV-56 según empresa)
   - ✅ Órdenes de compra de esa empresa
   - ✅ Facturas (Cxc) de esa empresa
   - ✅ Pagos de esa empresa

---

## Verificación Técnica (Opcional)

Si después del PASO 3 aún no funcionara, verificar:

### A. Logs del Servidor
```bash
# Buscar en logs del servidor Next.js
# Debería aparecer al hacer login:
"🔍 [getUserTenants] userId: 123"
"✅ Tenants encontrados: 5"
```

### B. Session en Frontend
```javascript
// En consola del navegador (DevTools)
console.log(session.user);

// Debería mostrar:
{
  id: "123",
  email: "contacto@arquitectura.com",
  name: "...",
  role: "proveedor",
  empresasDisponibles: [
    { tenantId: "la-cantera", tenantName: "La Cantera", proveedorCodigo: "P00443" },
    { tenantId: "peralillo", tenantName: "Peralillo", proveedorCodigo: "P00443" },
    // ... 3 más
  ],
  empresaActual: "la-cantera"
}
```

### C. Query Manual de Verificación
```sql
-- Ejecutar en Portal (PP)
-- Reemplaza 123 con el IDUsuario real

SELECT
    ppm.empresa_code AS Empresa,
    ppm.erp_proveedor_code AS CodigoProveedor,
    ppm.activo AS Activo,
    ppm.created_at AS FechaCreacion
FROM portal_proveedor_mapping ppm
WHERE ppm.portal_user_id = '123'
  AND ppm.activo = 1
ORDER BY ppm.empresa_code;

-- Debe retornar 5 filas
```

---

## Preguntas Frecuentes

### ¿Por qué no funcionó el auto-sync al registrarme?

Posibles causas:
1. La tabla `portal_proveedor_mapping` no existía en ese momento
2. Hubo un error en el código de auto-sync que se ignoró
3. La transacción del registro hizo rollback antes de llegar al auto-sync

La sincronización manual soluciona este problema.

### ¿Cada vez que un proveedor se registre tengo que hacer esto?

**NO**. Una vez que:
1. La tabla `portal_proveedor_mapping` existe
2. El código de auto-sync está implementado en `register/route.ts`

Los nuevos registros deberían auto-sincronizarse correctamente. Este es un caso especial porque quizás la tabla no existía.

### ¿Qué pasa si el proveedor existe en más empresas después?

El proveedor puede ejecutar manualmente la sincronización llamando al endpoint:

```bash
POST /api/auth/auto-sync
```

O un administrador puede ejecutar un script similar al de sincronización manual.

### ¿Por qué La Cantera y Peralillo tienen P00443 y las demás PV-56?

Porque ARQUITECTURA Y CONSULTORIA está dado de alta con diferentes códigos en cada empresa:
- **La Cantera**: P00443
- **Peralillo**: P00443
- **Plaza Galereña**: PV-56
- **Inmobiliaria Galereña**: PV-56
- **Icrear**: PV-56

Esto es normal y el sistema maneja múltiples códigos sin problema.

---

## Resumen de Archivos

| Archivo | Propósito | Cuándo Usar |
|---------|-----------|-------------|
| [diagnostico-sincronizacion.sql](scripts/diagnostico-sincronizacion.sql) | Diagnosticar estado actual | SIEMPRE PRIMERO |
| [crear-tabla-portal-proveedor-mapping.sql](scripts/crear-tabla-portal-proveedor-mapping.sql) | Crear tabla si no existe | Solo si diagnóstico indica que falta |
| [sincronizar-arquitectura-manual.sql](scripts/sincronizar-arquitectura-manual.sql) | Crear mappings manualmente | Si tabla existe pero no hay mappings |

---

## Siguiente Paso Inmediato

🎯 **EJECUTA AHORA**: `scripts/diagnostico-sincronizacion.sql` en el Servidor Portal (cloud.arkitem.com) - Database: PP

Comparte los resultados para continuar con el paso correspondiente.
