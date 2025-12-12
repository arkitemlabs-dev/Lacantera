# 🔍 Guía: Buscar y Sincronizar Proveedor por RFC

## Paso 1: Encontrar el RFC del Proveedor

### Opción A: Ejecutar Script SQL

Conecta al servidor ERP y ejecuta:

```bash
# Servidor: 104.46.127.151
# Usuario: sa_intelisis9
# Password: }eR88ndWX*Rv
```

Ejecuta el archivo: [scripts/buscar-proveedor-por-rfc.sql](scripts/buscar-proveedor-por-rfc.sql)

Este script buscará en las 3 bases de datos y te mostrará:
- Código del proveedor
- Nombre completo
- **RFC** (esto es lo que necesitas)
- Email, teléfonos, etc.

### Opción B: Usar la API desde el navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Buscar por nombre
const response = await fetch('/api/erp/buscar-proveedor?patron=ARQUITECTURA');
const result = await response.json();
console.log('Resultados:', result);

// Revisar los RFCs encontrados
result.results['la-cantera'].proveedores.forEach(p => {
  console.log(`${p.Proveedor} - RFC: ${p.RFC}`);
});
```

---

## Paso 2: Buscar Específicamente por RFC

Una vez que tengas el RFC (por ejemplo: "ACE123456ABC"), usa el nuevo endpoint:

```javascript
// Buscar por RFC exacto
const response = await fetch('/api/erp/buscar-por-rfc?rfc=ACE123456ABC');
const result = await response.json();
console.log('Proveedores con este RFC:', result);
```

O puedes buscar por RFC parcial:

```javascript
// Buscar por RFC parcial (solo las primeras letras)
const response = await fetch('/api/erp/buscar-por-rfc?rfc=ACE');
const result = await response.json();
console.log('Proveedores:', result);
```

---

## Paso 3: Sincronizar por RFC

Una vez confirmado el RFC, sincroniza usando el patrón RFC:

```javascript
// Sincronizar usando el RFC como patrón
const response = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patron: 'ACE123456ABC'  // Usa el RFC exacto aquí
  })
});

const result = await response.json();
console.log('✅ Resultado sincronización:', result);
```

---

## Ejemplo Completo Paso a Paso

### 1. Buscar el proveedor primero

```javascript
// Paso 1: Buscar por nombre para obtener el RFC
const busqueda = await fetch('/api/erp/buscar-proveedor?patron=ARQUITECTURA');
const datos = await busqueda.json();

// Paso 2: Ver los resultados
console.log('Empresas encontradas:');
Object.entries(datos.results).forEach(([empresa, data]) => {
  if (data.proveedores && data.proveedores.length > 0) {
    console.log(`\n${empresa}:`);
    data.proveedores.forEach(p => {
      console.log(`  Código: ${p.Proveedor}`);
      console.log(`  Nombre: ${p.Nombre}`);
      console.log(`  RFC: ${p.RFC}`);
      console.log(`  ---`);
    });
  }
});
```

### 2. Copiar el RFC y sincronizar

```javascript
// Supongamos que el RFC es: ACE890123XYZ
const rfc = 'ACE890123XYZ';

// Sincronizar usando ese RFC
const sync = await fetch('/api/erp/sync-proveedor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ patron: rfc })
});

const resultado = await sync.json();

if (resultado.success) {
  console.log('✅ Sincronización exitosa!');
  console.log(`Empresas sincronizadas: ${Object.keys(resultado.results).length}`);

  // Ver detalles por empresa
  Object.entries(resultado.results).forEach(([empresa, data]) => {
    if (data.success) {
      console.log(`\n✓ ${empresa}: ${data.proveedor.codigo} - ${data.action}`);
    }
  });
} else {
  console.log('❌ Error:', resultado.message);
}
```

---

## Script SQL Directo (Más Rápido)

Si prefieres usar SQL directamente:

```sql
-- Conectar al servidor ERP: 104.46.127.151

-- Buscar en La Cantera
USE Cantera_ajustes;
SELECT Proveedor, Nombre, RFC
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%';

-- Buscar en Peralillo
USE Peralillo_Ajustes;
SELECT Proveedor, Nombre, RFC
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%';

-- Buscar en Plaza Galereña
USE GALBD_PRUEBAS;
SELECT Proveedor, Nombre, RFC
FROM Prov
WHERE Nombre LIKE '%ARQUITECTURA%';
```

Copia el RFC que te aparece y úsalo en el paso 3.

---

## Endpoints Disponibles

### 1. Buscar por RFC
```
GET /api/erp/buscar-por-rfc?rfc=ACE123456ABC
```

### 2. Buscar por patrón general
```
GET /api/erp/buscar-proveedor?patron=ARQUITECTURA
```

### 3. Sincronizar proveedor
```
POST /api/erp/sync-proveedor
Body: { "patron": "ACE123456ABC" }
```

---

## Troubleshooting

### ❌ No encuentra el proveedor

**Solución:** Verifica que el RFC sea correcto:
```javascript
// Prueba con RFC parcial
await fetch('/api/erp/buscar-por-rfc?rfc=ACE').then(r => r.json()).then(console.log);
```

### ❌ Sincronización falla

**Posibles causas:**
1. No estás autenticado (inicia sesión primero)
2. La tabla `portal_proveedor_mapping` no existe (ejecuta el script SQL de creación)
3. El RFC no coincide exactamente

**Solución:** Ejecuta primero una búsqueda para confirmar:
```javascript
// Confirmar que existe
const check = await fetch('/api/erp/buscar-por-rfc?rfc=TU_RFC');
const data = await check.json();
console.log('Encontrado en:', data.empresasEncontradas, 'empresas');
```

---

## Resumen de Pasos

1. ✅ Ejecutar script SQL o buscar por API para obtener el RFC
2. ✅ Copiar el RFC exacto
3. ✅ Sincronizar usando ese RFC como patrón
4. ✅ Verificar en la base de datos PP que se crearon los mappings

¡Listo! 🚀
