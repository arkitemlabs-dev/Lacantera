# 🎯 Resumen: Sistema de Sincronización de Proveedores

## ✅ Lo que se ha implementado

He creado un sistema completo para sincronizar proveedores desde los ERPs al Portal, comenzando con **ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV** como prueba de concepto.

---

## 📁 Archivos Creados

### 1. **API Endpoint de Sincronización**
📄 [`src/app/api/erp/sync-proveedor/route.ts`](src/app/api/erp/sync-proveedor/route.ts)

**Funcionalidad:**
- `POST /api/erp/sync-proveedor` - Sincroniza un proveedor buscándolo por patrón
- `GET /api/erp/sync-proveedor` - Obtiene los mappings actuales del usuario

**Características:**
- Busca el proveedor en las 3 empresas (La Cantera, Peralillo, Plaza Galereña)
- Crea mappings automáticos en `portal_proveedor_mapping`
- Evita duplicados con UNIQUE constraint
- Asigna permisos por defecto (ver_ordenes, subir_facturas, ver_pagos, descargar_reportes)
- Maneja actualizaciones si el mapping ya existe

### 2. **Script de Creación de Tabla**
📄 [`scripts/crear-tabla-portal-proveedor-mapping.sql`](scripts/crear-tabla-portal-proveedor-mapping.sql)

**Funcionalidad:**
- Crea la tabla `portal_proveedor_mapping` en la base de datos **PP** (Portal)
- Incluye índices para mejorar el rendimiento
- Tiene UNIQUE constraint para evitar duplicados
- Incluye verificación de existencia (no falla si ya existe)

### 3. **Página de Testing Visual**
📄 [`src/app/test-sync/page.tsx`](src/app/test-sync/page.tsx)

**Funcionalidad:**
- Interfaz visual para probar la sincronización
- Campo de búsqueda con patrón (nombre/código/RFC)
- Muestra resultados detallados por empresa
- Lista los mappings actuales del usuario
- Feedback visual de éxito/error

**Acceso:** http://localhost:3000/test-sync

### 4. **Guía de Implementación**
📄 [`GUIA_SINCRONIZACION_ARQUITECTURA.md`](GUIA_SINCRONIZACION_ARQUITECTURA.md)

**Contenido:**
- Instrucciones paso a paso para sincronizar
- Ejemplos de código JavaScript y cURL
- Queries SQL para verificación
- Troubleshooting común
- Checklist de implementación

---

## 🔍 Proveedores Identificados

### ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV

| Empresa | Código ERP | Base de Datos |
|---------|-----------|---------------|
| La Cantera | `P00443` | Cantera_ajustes |
| Peralillo | `P00443` | Peralillo_Ajustes |
| Plaza Galereña | `PV-56` | GALBD_PRUEBAS |

---

## 🚀 Cómo Usar el Sistema

### Opción 1: Interfaz Visual (Recomendado para testing)

1. Abre tu navegador en http://localhost:3000/test-sync
2. Ingresa el patrón de búsqueda: `ARQUITECTURA` o `ARQUI`
3. Haz clic en "Sincronizar Proveedor"
4. Verás los resultados en pantalla

### Opción 2: Desde la Consola del Navegador

```javascript
// 1. Inicia sesión en el portal
// 2. Abre la consola del navegador (F12)
// 3. Ejecuta:

const response = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patron: 'ARQUITECTURA'
  })
});

const result = await response.json();
console.log('Resultado:', result);
```

### Opción 3: API Directa (Para automatización)

```bash
curl -X POST http://localhost:3000/api/erp/sync-proveedor \
  -H "Content-Type: application/json" \
  -d '{"patron": "ARQUITECTURA"}'
```

---

## 📊 Estructura de la Base de Datos

### Tabla: `portal_proveedor_mapping` (Base de datos: PP)

```sql
CREATE TABLE portal_proveedor_mapping (
    id UNIQUEIDENTIFIER PRIMARY KEY,
    portal_user_id NVARCHAR(50) NOT NULL,     -- ID del usuario en el portal
    erp_proveedor_code VARCHAR(20) NOT NULL,  -- Código del proveedor en ERP
    empresa_code VARCHAR(10) NOT NULL,        -- Empresa (la-cantera, peralillo, etc.)
    permisos NVARCHAR(MAX),                   -- JSON con permisos
    activo BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NOT NULL,

    UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
);
```

**Índices:**
- `IX_portal_proveedor_mapping_user` (portal_user_id)
- `IX_portal_proveedor_mapping_empresa` (empresa_code)
- `IX_portal_proveedor_mapping_proveedor` (erp_proveedor_code)
- `IX_portal_proveedor_mapping_activo` (activo)

---

## 🔐 Permisos Asignados por Defecto

```json
{
  "ver_ordenes": true,
  "subir_facturas": true,
  "ver_pagos": true,
  "descargar_reportes": true
}
```

Estos permisos se asignan automáticamente cuando se crea un mapping nuevo.

---

## ✅ Pasos Siguientes (Para implementar)

### 1. **Crear la Tabla en el Portal**

Ejecuta el script SQL en la base de datos **PP**:

```sql
-- Archivo: scripts/crear-tabla-portal-proveedor-mapping.sql
-- Servidor: cloud.arkitem.com
-- Base de datos: PP
-- Usuario: sa_ediaz
```

### 2. **Probar la Sincronización**

Opción A: Usar la interfaz en http://localhost:3000/test-sync

Opción B: Usar la consola del navegador:
```javascript
const response = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ patron: 'ARQUITECTURA' })
});
const result = await response.json();
console.log(result);
```

### 3. **Verificar los Mappings**

```sql
SELECT * FROM portal_proveedor_mapping
WHERE erp_proveedor_code IN ('P00443', 'PV-56')
ORDER BY empresa_code;
```

---

## 🎯 Arquitectura del Sistema

### Flujo de Sincronización:

```
1. Usuario inicia sesión en el portal
   ↓
2. Sistema recibe patrón de búsqueda (ej: "ARQUITECTURA")
   ↓
3. API busca en cada ERP:
   - La Cantera (Cantera_ajustes)
   - Peralillo (Peralillo_Ajustes)
   - Plaza Galereña (GALBD_PRUEBAS)
   ↓
4. Por cada empresa donde se encuentra:
   - Extrae código, nombre, RFC del proveedor
   - Verifica si ya existe mapping
   - Si NO existe: Crea nuevo mapping
   - Si existe: Actualiza fecha de modificación
   ↓
5. Retorna resultados detallados por empresa
```

### Estructura de Respuesta:

```json
{
  "success": true,
  "patron": "ARQUITECTURA",
  "portalUserId": "USR001",
  "message": "Sincronización completada con éxito",
  "results": {
    "la-cantera": {
      "success": true,
      "action": "created",
      "proveedor": {
        "codigo": "P00443",
        "nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
        "rfc": "ACE890123XYZ"
      },
      "message": "Mapping creado exitosamente"
    },
    "peralillo": { ... },
    "plaza-galerena": { ... }
  }
}
```

---

## 🔄 Próximos Pasos de Desarrollo

### Fase 1: Auto-reconocimiento en Registro ✨

Cuando un proveedor se registra en el portal:

1. Capturar RFC del proveedor
2. Buscar RFC en todas las bases de datos ERP
3. Crear mappings automáticamente
4. Asignar permisos según perfil
5. Enviar email de confirmación

### Fase 2: Dashboard del Proveedor 📊

Mostrar en una sola pantalla:

- Total de órdenes de compra por empresa
- Facturas pendientes de subir
- Pagos recibidos por empresa
- Alertas y notificaciones
- Gráficas de estadísticas

### Fase 3: Sincronización de Datos Transaccionales 💾

Implementar endpoints para:

- `GET /api/erp/ordenes` - Obtener órdenes de compra del proveedor
- `GET /api/erp/facturas` - Obtener facturas del proveedor
- `POST /api/erp/facturas` - Subir nueva factura XML
- `GET /api/erp/pagos` - Obtener pagos realizados

### Fase 4: Notificaciones en Tiempo Real 🔔

- Notificar cuando hay nueva orden de compra
- Alertar sobre facturas próximas a vencer
- Confirmar pagos recibidos
- WebSockets para actualizaciones en vivo

---

## 📝 Notas Importantes

1. **Seguridad:**
   - El sistema solo permite sincronizar proveedores para el usuario autenticado
   - Usa parámetros preparados para prevenir SQL injection
   - Los ERPs son de solo lectura (SELECT únicamente)

2. **Rendimiento:**
   - Las búsquedas están limitadas a TOP 1 por empresa
   - Los índices optimizan las consultas
   - Connection pooling para reutilizar conexiones

3. **Escalabilidad:**
   - Fácil agregar nuevas empresas al array de empresas
   - El sistema se adapta automáticamente a diferentes estructuras de ERP
   - Los permisos son configurables por mapping

---

## 🐛 Troubleshooting

### Error: "No se encontró proveedor"

**Causa:** El patrón de búsqueda no coincide con ningún registro

**Solución:**
- Verifica que el proveedor existe en los ERPs
- Usa un patrón más general (ej: "ARQUI" en vez de "ARQUITECTURA Y CONSULTORIA")
- Prueba buscar por código (ej: "P00443")

### Error: "No autenticado"

**Causa:** No hay sesión activa

**Solución:** Inicia sesión en el portal antes de sincronizar

### Error: "Tabla no existe"

**Causa:** La tabla `portal_proveedor_mapping` no ha sido creada

**Solución:** Ejecuta el script SQL en la base de datos PP

---

## 📞 Testing Checklist

- [ ] Ejecutar script de creación de tabla
- [ ] Servidor del portal está corriendo (localhost:3000)
- [ ] Iniciar sesión como usuario proveedor
- [ ] Acceder a http://localhost:3000/test-sync
- [ ] Ingresar patrón "ARQUITECTURA"
- [ ] Hacer clic en "Sincronizar Proveedor"
- [ ] Verificar que aparecen 3 empresas con éxito
- [ ] Verificar códigos: P00443, P00443, PV-56
- [ ] Verificar mappings en la base de datos

---

## 🎉 Resumen Final

Has implementado exitosamente:

✅ Sistema de sincronización de proveedores
✅ API RESTful completa (POST y GET)
✅ Interfaz de testing visual
✅ Script de creación de tabla
✅ Documentación completa
✅ Manejo de errores robusto
✅ Prevención de duplicados
✅ Búsqueda inteligente por patrón

**Próximo paso:** Ejecutar el script SQL y probar la sincronización en http://localhost:3000/test-sync

¡Buena suerte! 🚀
