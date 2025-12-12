# Guía de Sincronización: ARQUITECTURA Y CONSULTORIA EMPRESARIAL

## 📋 Resumen

Este documento explica cómo sincronizar el proveedor **ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV** desde los ERPs al Portal, como prueba de concepto para el sistema de auto-reconocimiento de proveedores.

### Códigos del Proveedor Identificados:
- **La Cantera**: P00443
- **Peralillo**: P00443
- **Plaza Galereña**: PV-56

---

## 🔧 Paso 1: Crear la Tabla en el Portal (Si no existe)

Antes de sincronizar, necesitas crear la tabla `portal_proveedor_mapping` en la base de datos **PP** (Portal).

### Ejecutar Script SQL:

```bash
# Conectarse al servidor del Portal
Server: cloud.arkitem.com
Database: PP
User: sa_ediaz
```

Ejecuta el script:
```sql
-- Ver archivo: scripts/crear-tabla-portal-proveedor-mapping.sql
```

O ejecuta directamente:

```sql
USE PP;
GO

CREATE TABLE portal_proveedor_mapping (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    portal_user_id NVARCHAR(50) NOT NULL,
    erp_proveedor_code VARCHAR(20) NOT NULL,
    empresa_code VARCHAR(10) NOT NULL,
    permisos NVARCHAR(MAX),
    activo BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_portal_mapping UNIQUE (portal_user_id, erp_proveedor_code, empresa_code)
);

CREATE INDEX IX_portal_proveedor_mapping_user ON portal_proveedor_mapping(portal_user_id);
CREATE INDEX IX_portal_proveedor_mapping_empresa ON portal_proveedor_mapping(empresa_code);
GO
```

---

## 🚀 Paso 2: Sincronizar el Proveedor

### Opción A: Usar la API desde el Frontend

1. **Inicia sesión en el portal** como usuario proveedor
2. Abre la consola del navegador (F12)
3. Ejecuta este código:

```javascript
// Sincronizar ARQUITECTURA Y CONSULTORIA EMPRESARIAL
const response = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patron: 'ARQUITECTURA Y CONSULTORIA EMPRESARIAL'
  })
});

const result = await response.json();
console.log('✅ Resultado de sincronización:', result);
```

### Opción B: Usar cURL

```bash
# Reemplaza <SESSION_TOKEN> con tu token de sesión
curl -X POST http://localhost:3000/api/erp/sync-proveedor \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<SESSION_TOKEN>" \
  -d '{
    "patron": "ARQUITECTURA"
  }'
```

### Opción C: Sincronizar con un patrón más corto

```javascript
// Buscar por patrón más corto (más rápido)
const response = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patron: 'ARQUI'  // Patrón más corto
  })
});

const result = await response.json();
console.log('Resultado:', result);
```

---

## ✅ Paso 3: Verificar la Sincronización

### Verificar en la Base de Datos:

```sql
USE PP;
GO

SELECT
    id,
    portal_user_id,
    erp_proveedor_code,
    empresa_code,
    permisos,
    activo,
    created_at,
    updated_at
FROM portal_proveedor_mapping
WHERE erp_proveedor_code IN ('P00443', 'PV-56')
ORDER BY empresa_code;
```

### Verificar mediante la API:

```javascript
// Obtener todos los mappings del usuario actual
const response = await fetch('/api/erp/sync-proveedor');
const result = await response.json();
console.log('Mappings del usuario:', result);
```

---

## 📊 Respuesta Esperada

### Respuesta Exitosa:

```json
{
  "success": true,
  "patron": "ARQUITECTURA",
  "portalUserId": "ARQ001",
  "message": "Sincronización completada con éxito en al menos una empresa",
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
    "peralillo": {
      "success": true,
      "action": "created",
      "proveedor": {
        "codigo": "P00443",
        "nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
        "rfc": "ACE890123XYZ"
      },
      "message": "Mapping creado exitosamente"
    },
    "plaza-galerena": {
      "success": true,
      "action": "created",
      "proveedor": {
        "codigo": "PV-56",
        "nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
        "rfc": "ACE890123XYZ"
      },
      "message": "Mapping creado exitosamente"
    }
  }
}
```

---

## 🔍 Paso 4: Probar el Auto-Reconocimiento

Una vez sincronizado, el proveedor debería poder:

1. **Ver sus órdenes de compra** de las 3 empresas
2. **Subir facturas** relacionadas con sus órdenes
3. **Ver pagos** realizados por cada empresa
4. **Descargar reportes** de su actividad

### Ejemplo: Obtener Órdenes del Proveedor

```javascript
// Obtener órdenes de compra en todas las empresas
const empresas = ['la-cantera', 'peralillo', 'plaza-galerena'];

for (const empresa of empresas) {
  const response = await fetch(
    `/api/erp/ordenes?empresa=${empresa}`
  );
  const ordenes = await response.json();
  console.log(`Órdenes en ${empresa}:`, ordenes);
}
```

---

## 🎯 Próximos Pasos

### 1. **Automatizar el Registro de Proveedores**

Cuando un proveedor se registra en el portal, automáticamente:

1. Buscar su RFC en todas las bases de datos ERP
2. Crear los mappings automáticamente
3. Asignar permisos según su perfil

### 2. **Crear Dashboard del Proveedor**

Mostrar en una sola pantalla:

- Total de órdenes por empresa
- Facturas pendientes de subir
- Pagos recibidos
- Alertas y notificaciones

### 3. **Implementar Sincronización Bidireccional**

- **Leer** órdenes, facturas, pagos desde ERP
- **Escribir** facturas XML subidas por el proveedor
- **Notificar** cambios en tiempo real

---

## 🐛 Troubleshooting

### Error: "No se encontró proveedor"

```javascript
// Verifica primero si el proveedor existe en los ERPs
const response = await fetch('/api/erp/buscar-proveedor?patron=ARQUI');
const result = await response.json();
console.log('Proveedores encontrados:', result);
```

### Error: "No autenticado"

Asegúrate de estar logueado en el portal antes de ejecutar la sincronización.

### Error: "Tabla no existe"

Ejecuta el script SQL del Paso 1 para crear la tabla `portal_proveedor_mapping`.

---

## 📝 Notas Importantes

1. **El patrón de búsqueda** puede ser cualquier parte del:
   - Código del proveedor (ej: "P00443")
   - Nombre del proveedor (ej: "ARQUITECTURA")
   - RFC del proveedor

2. **Los permisos por defecto** son:
   ```json
   {
     "ver_ordenes": true,
     "subir_facturas": true,
     "ver_pagos": true,
     "descargar_reportes": true
   }
   ```

3. **La tabla usa `UNIQUE constraint`** para evitar duplicados:
   - No se puede tener el mismo (usuario + proveedor + empresa) dos veces
   - Si intentas sincronizar de nuevo, solo actualizará `updated_at`

---

## ✅ Checklist de Implementación

- [ ] Ejecutar script de creación de tabla `portal_proveedor_mapping`
- [ ] Verificar que el servidor del portal esté corriendo
- [ ] Iniciar sesión como usuario proveedor
- [ ] Ejecutar sincronización con patrón "ARQUITECTURA"
- [ ] Verificar mappings en la base de datos
- [ ] Probar acceso a órdenes de compra
- [ ] Implementar dashboard del proveedor
- [ ] Configurar auto-reconocimiento en registro

---

## 📞 Soporte

Si encuentras problemas durante la sincronización, verifica:

1. Conexiones a las bases de datos (Portal y ERPs)
2. Permisos del usuario en las tablas
3. Logs del servidor (`console.log` en la API)
4. Estado de las sesiones de NextAuth

¡Buena suerte con la implementación! 🚀
