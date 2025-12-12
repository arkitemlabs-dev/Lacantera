# 🧪 Guía de Testing - Sincronización Arkitem

**Proveedor de prueba:** Arkitem
**Empresas ERP:** La Cantera, Peralillo, Plaza Galereña, Icrear

---

## 🚀 Plan de Testing (30 minutos)

### ✅ Pre-requisitos
- Servidor corriendo: http://localhost:3000
- Usuario logueado en el portal
- Bases de datos conectadas:
  - `PP` (Portal)
  - `Cantera_ajustes`
  - `Peralillo_ajustes`
  - `GALBD_PRUEBAS`
  - `ICREAR_PRUEBAS`

---

## 📋 Paso 1: Explorar Estructura de ERPs (5 min)

### Test 1.1: Explorar todas las empresas

```bash
# Desde el navegador (Console)
fetch('/api/erp/explore')
  .then(r => r.json())
  .then(console.log);
```

**Resultado esperado:**
```json
{
  "success": true,
  "results": {
    "la-cantera": {
      "proveedores": {
        "tableName": "Prov",  // o el nombre que descubra
        "fieldMapping": {
          "codigo": "Proveedor",
          "nombre": "Nombre",
          "rfc": "RFC",
          ...
        }
      },
      "ordenes": {
        "tableName": "Compra",
        "fieldMapping": {...}
      }
    },
    "peralillo": {...},
    "plaza-galerena": {...},
    "icrear": {...}
  }
}
```

**✅ Verificar:**
- Todas las empresas encontraron tabla de proveedores
- Todas las empresas encontraron tabla de órdenes
- Los `fieldMapping` tienen los campos principales mapeados

### Test 1.2: Explorar una empresa específica

```bash
fetch('/api/erp/explore?empresa=la-cantera')
  .then(r => r.json())
  .then(console.log);
```

---

## 🔍 Paso 2: Buscar Arkitem en ERPs (10 min)

### Test 2.1: Buscar en todas las empresas

```bash
fetch('/api/erp/arkitem')
  .then(r => r.json())
  .then(console.log);
```

**Resultado esperado:**
```json
{
  "success": true,
  "searchTerm": "ARKITEM",
  "results": {
    "la-cantera": {
      "found": true,
      "proveedor": {
        "codigo": "ARKITEM",
        "nombre": "ARKITEM SA DE CV",
        "rfc": "AIT123456XXX",
        ...
      },
      "ordenes": {
        "count": 5,
        "data": [...]
      }
    },
    ...
  }
}
```

**✅ Verificar:**
- `found: true` en las empresas donde Arkitem existe
- Datos del proveedor se muestran correctamente
- Si hay órdenes, se muestran

### Test 2.2: Buscar en una empresa específica

```bash
fetch('/api/erp/arkitem?empresa=la-cantera')
  .then(r => r.json())
  .then(console.log);
```

### Test 2.3: Buscar con otro término

```bash
fetch('/api/erp/arkitem?search=PROVEEDOR123')
  .then(r => r.json())
  .then(console.log);
```

---

## 🔄 Paso 3: Sincronizar Arkitem al Portal (10 min)

### Test 3.1: Sincronizar en todas las empresas

```bash
fetch('/api/erp/arkitem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log);
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Sincronización completada",
  "results": {
    "la-cantera": {
      "success": true,
      "action": "created",
      "proveedor": {
        "codigo": "ARKITEM",
        "nombre": "ARKITEM SA DE CV",
        "rfc": "AIT123456XXX"
      }
    },
    ...
  }
}
```

**✅ Verificar en SQL:**
```sql
-- Verificar que se crearon los mappings
SELECT * FROM portal_proveedor_mapping
WHERE erp_proveedor_code LIKE '%ARKITEM%';

-- Deberías ver 1 fila por cada empresa donde se encontró Arkitem
```

### Test 3.2: Sincronizar en una empresa específica

```bash
fetch('/api/erp/arkitem', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    empresa: 'la-cantera'
  })
}).then(r => r.json()).then(console.log);
```

---

## 📊 Paso 4: Verificar Datos Sincronizados (5 min)

### Test 4.1: Ver mappings en Portal

```sql
-- En SQL Server Management Studio
USE PP;

SELECT
  ppm.portal_user_id,
  ppm.erp_proveedor_code,
  ppm.empresa_code,
  ppm.permisos,
  ppm.activo,
  ppm.created_at
FROM portal_proveedor_mapping ppm
WHERE ppm.erp_proveedor_code LIKE '%ARKITEM%'
ORDER BY ppm.empresa_code;
```

**Resultado esperado:**
```
portal_user_id | erp_proveedor_code | empresa_code | activo
3              | ARKITEM            | la-cantera   | 1
3              | ARKITEM            | peralillo    | 1
3              | ARKITEM            | plaza-galerena | 1
...
```

### Test 4.2: Login con Arkitem

Si el mapping se creó correctamente, el usuario debería poder:

1. Ir a http://localhost:3000/login
2. Ingresar email/password del usuario
3. Seleccionar una empresa donde Arkitem existe
4. Debería ver las órdenes de compra de Arkitem en esa empresa

---

## 🐛 Troubleshooting

### Error: "No se encontró tabla de proveedores"

**Causa:** El explorador no encontró ninguna de las tablas conocidas

**Solución:**
1. Verifica que las bases de datos ERP tengan tablas de proveedores
2. Verifica la conexión a las BDs ERP
3. Checa los logs del servidor para ver qué tablas intentó buscar

```bash
# Ver logs del servidor
# Deberías ver mensajes como:
# "⏭️  [la-cantera] Tabla Prov no existe, continuando..."
```

### Error: "No se encontró Arkitem"

**Causa:** El proveedor no existe en esa empresa o tiene otro nombre

**Solución:**
1. Verifica en SQL Server qué proveedores existen:

```sql
-- En la BD ERP (ejemplo: Cantera_ajustes)
SELECT TOP 10 * FROM Prov
WHERE Nombre LIKE '%ARK%'
   OR Proveedor LIKE '%ARK%';
```

2. Usa el término correcto en la búsqueda:

```bash
fetch('/api/erp/arkitem?search=NOMBRE_CORRECTO')
  .then(r => r.json())
  .then(console.log);
```

### Error: "Invalid column name"

**Causa:** El mapeo automático de campos falló

**Solución:**
1. Revisa la estructura real de la tabla:

```sql
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Prov';
```

2. Verifica el `fieldMapping` en la respuesta de `/api/erp/explore`
3. Si un campo no se mapeó, puede que tenga un nombre no estándar

---

## ✅ Checklist de Validación

- [ ] Exploración de ERPs completa (4 empresas)
- [ ] Se encontró tabla de proveedores en todas las empresas
- [ ] Se encontró tabla de órdenes en todas las empresas
- [ ] Arkitem encontrado en al menos 1 empresa
- [ ] Sincronización exitosa (mapping creado en PP)
- [ ] Verificación en SQL: mappings existen
- [ ] Login funciona con la empresa sincronizada
- [ ] Se pueden ver órdenes de compra

---

## 📝 Notas Importantes

1. **Auto-descubrimiento:** El sistema busca automáticamente las tablas sin asumir nombres
2. **Mapeo inteligente:** Los campos se mapean por patrones (RFC, nombre, email, etc.)
3. **Flexible:** Se adapta a cualquier estructura de ERP Intelisis
4. **No destructivo:** Solo lectura en ERP, solo crea mappings en Portal PP

---

## 🎯 Próximos Pasos Después del Testing

1. **Si el testing es exitoso:**
   - Crear endpoint para sincronizar TODOS los proveedores (no solo Arkitem)
   - Crear endpoint para sincronizar órdenes de compra al portal
   - Programar sincronización automática cada hora

2. **Documentar:**
   - Nombres reales de tablas encontradas en cada ERP
   - Campos mapeados por empresa
   - Cualquier inconsistencia encontrada

3. **Optimizar:**
   - Cachear estructura descubierta para no explorar en cada request
   - Crear índices en tablas del portal si es necesario

---

**¡Listo para testing!** 🚀

Ejecuta los tests en orden y documenta los resultados.
