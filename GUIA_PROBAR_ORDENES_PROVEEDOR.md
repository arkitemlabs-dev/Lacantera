# 🛒 Guía: Obtener Órdenes de Compra del Proveedor

## ✅ Lo que se implementó

He creado 2 nuevos endpoints para que el proveedor pueda ver sus órdenes de compra:

1. **GET /api/proveedor/ordenes** - Lista todas las órdenes del proveedor
2. **GET /api/proveedor/ordenes/[id]** - Detalle completo de una orden específica

---

## 🚀 Prueba Rápida

### **1. Obtener todas las órdenes del proveedor**

Copia y pega en la consola del navegador (F12):

```javascript
// Obtener todas las órdenes de todas las empresas
const response = await fetch('/api/proveedor/ordenes');
const data = await response.json();

console.log('📊 RESUMEN DE ÓRDENES:');
console.log(`Total de órdenes: ${data.totalOrdenes}`);
console.log(`Empresas: ${data.totalEmpresas}\n`);

// Resumen por empresa
console.log('Por empresa:');
Object.entries(data.resumenPorEmpresa).forEach(([empresa, resumen]) => {
  console.log(`\n🏢 ${empresa}:`);
  console.log(`  Código proveedor: ${resumen.codigoProveedor}`);
  console.log(`  Total órdenes: ${resumen.totalOrdenes}`);
  console.log(`  Monto total: $${resumen.montoTotal?.toLocaleString()}`);
});

// Mostrar primeras 5 órdenes
console.log('\n📋 ÚLTIMAS ÓRDENES:');
data.ordenes.slice(0, 5).forEach(orden => {
  console.log(`\n${orden.Folio} - ${orden.EmpresaNombre}`);
  console.log(`  Fecha: ${new Date(orden.FechaEmision).toLocaleDateString()}`);
  console.log(`  Total: $${orden.Total?.toLocaleString()} ${orden.Moneda}`);
  console.log(`  Estatus: ${orden.Estatus}`);
});
```

### **2. Filtrar por empresa específica**

```javascript
// Solo órdenes de La Cantera
const response = await fetch('/api/proveedor/ordenes?empresa=la-cantera');
const data = await response.json();

console.log(`Órdenes en La Cantera: ${data.totalOrdenes}`);
data.ordenes.forEach(orden => {
  console.log(`${orden.Folio}: $${orden.Total} - ${orden.Estatus}`);
});
```

### **3. Filtrar por fechas**

```javascript
// Órdenes del último mes
const hoy = new Date();
const haceUnMes = new Date();
haceUnMes.setMonth(haceUnMes.getMonth() - 1);

const response = await fetch(
  `/api/proveedor/ordenes?fechaDesde=${haceUnMes.toISOString().split('T')[0]}&fechaHasta=${hoy.toISOString().split('T')[0]}`
);
const data = await response.json();

console.log(`Órdenes del último mes: ${data.totalOrdenes}`);
```

### **4. Ver detalle de una orden específica**

```javascript
// Primero obtén el ID de una orden
const ordenes = await fetch('/api/proveedor/ordenes').then(r => r.json());
const primeraOrden = ordenes.ordenes[0];

console.log(`\nObteniendo detalle de orden: ${primeraOrden.Folio}`);

// Ahora obtén el detalle completo
const detalle = await fetch(
  `/api/proveedor/ordenes/${primeraOrden.ID}?empresa=${primeraOrden.Empresa}`
).then(r => r.json());

console.log('\n📦 DETALLE DE LA ORDEN:');
console.log(`Folio: ${detalle.orden.Folio}`);
console.log(`Empresa: ${detalle.orden.EmpresaNombre}`);
console.log(`Fecha: ${new Date(detalle.orden.FechaEmision).toLocaleDateString()}`);
console.log(`Estatus: ${detalle.orden.Estatus}`);
console.log(`\nProductos (${detalle.resumen.totalArticulos}):`);

detalle.detalle.forEach(item => {
  console.log(`\n  ${item.Articulo}`);
  console.log(`    Descripción: ${item.Descripcion}`);
  console.log(`    Cantidad: ${item.Cantidad} ${item.Unidad}`);
  console.log(`    Precio: $${item.Precio?.toLocaleString()}`);
});

console.log(`\n💰 TOTALES:`);
console.log(`  Subtotal: $${detalle.resumen.subtotal?.toLocaleString()}`);
console.log(`  Impuestos: $${detalle.resumen.impuestos?.toLocaleString()}`);
console.log(`  TOTAL: $${detalle.resumen.total?.toLocaleString()}`);
```

---

## 📊 Estructura de Respuestas

### **GET /api/proveedor/ordenes**

```json
{
  "success": true,
  "userId": "3",
  "totalOrdenes": 25,
  "totalEmpresas": 3,
  "resumenPorEmpresa": {
    "la-cantera": {
      "codigoProveedor": "P00443",
      "totalOrdenes": 10,
      "montoTotal": 250000
    },
    "peralillo": {
      "codigoProveedor": "P00443",
      "totalOrdenes": 8,
      "montoTotal": 180000
    },
    "plaza-galerena": {
      "codigoProveedor": "PV-56",
      "totalOrdenes": 7,
      "montoTotal": 150000
    }
  },
  "ordenes": [
    {
      "ID": 12345,
      "Folio": "OC-2024-001",
      "Empresa": "la-cantera",
      "EmpresaNombre": "La Cantera",
      "CodigoProveedor": "P00443",
      "FechaEmision": "2024-12-01",
      "Subtotal": 10000,
      "Impuestos": 1600,
      "Total": 11600,
      "Moneda": "MXN",
      "Estatus": "CONCLUIDO",
      "Condicion": "CREDITO 30 DIAS",
      "Usuario": "JPEREZ"
    }
  ]
}
```

### **GET /api/proveedor/ordenes/[id]?empresa=la-cantera**

```json
{
  "success": true,
  "orden": {
    "ID": 12345,
    "Folio": "OC-2024-001",
    "Empresa": "la-cantera",
    "EmpresaNombre": "La Cantera",
    "FechaEmision": "2024-12-01",
    "Total": 11600,
    "Estatus": "CONCLUIDO"
  },
  "detalle": [
    {
      "Renglon": 1,
      "Articulo": "ART-001",
      "Descripcion": "Producto ejemplo",
      "Cantidad": 10,
      "Unidad": "PZA",
      "Precio": 1000,
      "Almacen": "ALM01"
    }
  ],
  "proveedor": {
    "Codigo": "P00443",
    "Nombre": "ARQUITECTURA Y CONSULTORIA EMPRESARIAL SA DE CV",
    "RFC": "ACE140813E29",
    "Email": "contacto@arquitectura.com"
  },
  "resumen": {
    "totalArticulos": 5,
    "cantidadTotal": 50,
    "subtotal": 10000,
    "impuestos": 1600,
    "total": 11600
  }
}
```

---

## 🎯 Parámetros Disponibles

### **GET /api/proveedor/ordenes**

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `empresa` | string | Filtrar por empresa | `?empresa=la-cantera` |
| `limite` | number | Límite de órdenes (default: 50) | `?limite=100` |
| `fechaDesde` | string | Desde fecha (YYYY-MM-DD) | `?fechaDesde=2024-01-01` |
| `fechaHasta` | string | Hasta fecha (YYYY-MM-DD) | `?fechaHasta=2024-12-31` |

### **GET /api/proveedor/ordenes/[id]**

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `id` | number | ID de la orden | ✅ Sí (en URL) |
| `empresa` | string | Código de empresa | ✅ Sí (query param) |

---

## 🔍 Ejemplos Avanzados

### **Script completo: Ver todas las órdenes con detalles**

```javascript
(async () => {
  console.log('🔍 Obteniendo órdenes del proveedor...\n');

  // 1. Obtener todas las órdenes
  const ordenes = await fetch('/api/proveedor/ordenes').then(r => r.json());

  console.log(`📊 Total: ${ordenes.totalOrdenes} órdenes en ${ordenes.totalEmpresas} empresas\n`);

  // 2. Mostrar resumen por empresa
  for (const [empresa, resumen] of Object.entries(ordenes.resumenPorEmpresa)) {
    console.log(`🏢 ${empresa.toUpperCase()}`);
    console.log(`   Código: ${resumen.codigoProveedor}`);
    console.log(`   Órdenes: ${resumen.totalOrdenes}`);
    console.log(`   Total: $${resumen.montoTotal?.toLocaleString()}\n`);
  }

  // 3. Ver detalle de la primera orden
  if (ordenes.ordenes.length > 0) {
    const primera = ordenes.ordenes[0];
    console.log(`\n📦 Detalle de: ${primera.Folio}`);

    const detalle = await fetch(
      `/api/proveedor/ordenes/${primera.ID}?empresa=${primera.Empresa}`
    ).then(r => r.json());

    console.log(`Productos: ${detalle.resumen.totalArticulos}`);
    console.log(`Total: $${detalle.resumen.total?.toLocaleString()}`);
  }
})();
```

---

## ✅ Checklist de Pruebas

- [ ] Obtener todas las órdenes (sin filtros)
- [ ] Filtrar por empresa (la-cantera)
- [ ] Filtrar por fechas (último mes)
- [ ] Ver detalle de una orden específica
- [ ] Verificar que solo ves órdenes de tu proveedor (código P00443 o PV-56)
- [ ] Verificar que aparecen las 3 empresas (si tienes órdenes en todas)

---

## 🚀 Próximos Pasos

Una vez que confirmes que los endpoints funcionan correctamente:

1. **Crear página de Dashboard** para visualizar las órdenes
2. **Implementar subida de facturas** XML relacionadas con órdenes
3. **Agregar endpoint de pagos** para ver pagos recibidos
4. **Notificaciones** cuando hay nuevas órdenes

¡Prueba los scripts y dime qué resulta! 🎉
