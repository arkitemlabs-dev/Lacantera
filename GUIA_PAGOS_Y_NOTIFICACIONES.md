# 💰🔔 Guía: Pagos y Notificaciones del Proveedor

## ✅ Lo que se implementó

He creado 2 sistemas completos:

### 1. **Sistema de Pagos**
- GET /api/proveedor/pagos - Consultar pagos recibidos

### 2. **Sistema de Notificaciones**
- GET /api/proveedor/notificaciones - Listar notificaciones
- POST /api/proveedor/notificaciones - Crear notificación
- PATCH /api/proveedor/notificaciones/[id] - Marcar como leída
- DELETE /api/proveedor/notificaciones/[id] - Eliminar notificación
- POST /api/proveedor/notificaciones/marcar-todas-leidas - Marcar todas como leídas

---

## 📝 PASO 1: Crear Tabla de Notificaciones

Primero debes ejecutar este script SQL en la base de datos **PP**:

```sql
-- Conectar a: cloud.arkitem.com
-- Base de datos: PP

USE PP;

CREATE TABLE proveedor_notificaciones (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    portal_user_id NVARCHAR(50) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(MAX),
    empresa_code VARCHAR(50),
    referencia_id NVARCHAR(50),
    referencia_tipo NVARCHAR(50),
    leida BIT NOT NULL DEFAULT 0,
    fecha_leida DATETIME2,
    prioridad VARCHAR(20) DEFAULT 'NORMAL',
    metadata NVARCHAR(MAX),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX IX_notificaciones_user (portal_user_id),
    INDEX IX_notificaciones_leida (leida),
    INDEX IX_notificaciones_fecha (created_at DESC),
    INDEX IX_notificaciones_user_leida (portal_user_id, leida) INCLUDE (created_at)
);
```

O ejecuta el archivo: [scripts/crear-tabla-notificaciones-proveedor.sql](scripts/crear-tabla-notificaciones-proveedor.sql)

---

## 💰 SISTEMA DE PAGOS

### **1. Ver todos los pagos recibidos**

```javascript
// Obtener todos los pagos del proveedor
const pagos = await fetch('/api/proveedor/pagos').then(r => r.json());

console.log('💰 RESUMEN DE PAGOS:');
console.log(`Total de pagos: ${pagos.totalPagos}`);
console.log(`Monto total: $${pagos.resumenGlobal.montoTotal?.toLocaleString()}`);
console.log(`Total pagado: $${pagos.resumenGlobal.totalPagado?.toLocaleString()}`);
console.log(`Saldo pendiente: $${pagos.resumenGlobal.saldoPendiente?.toLocaleString()}\n`);

// Por empresa
console.log('Por empresa:');
Object.entries(pagos.resumenPorEmpresa).forEach(([empresa, resumen]) => {
  console.log(`\n🏢 ${empresa}:`);
  console.log(`  Total pagos: ${resumen.totalPagos}`);
  console.log(`  Monto total: $${resumen.montoTotal?.toLocaleString()}`);
  console.log(`  Pagado: $${resumen.totalPagado?.toLocaleString()}`);
  console.log(`  Pendiente: $${resumen.saldoPendiente?.toLocaleString()}`);
});

// Primeros 5 pagos
console.log('\n📋 ÚLTIMOS PAGOS:');
pagos.pagos.slice(0, 5).forEach(pago => {
  console.log(`\n${pago.Folio} - ${pago.EmpresaNombre}`);
  console.log(`  Fecha: ${new Date(pago.FechaEmision).toLocaleDateString()}`);
  console.log(`  Total: $${pago.Total?.toLocaleString()}`);
  console.log(`  Pagado: $${pago.MontoPagado?.toLocaleString()} (${pago.PorcentajePagado}%)`);
  console.log(`  Saldo: $${pago.Saldo?.toLocaleString()}`);
  console.log(`  Estatus: ${pago.Estatus}`);
});
```

### **2. Filtrar pagos por empresa**

```javascript
// Solo pagos de La Cantera
const pagos = await fetch('/api/proveedor/pagos?empresa=la-cantera')
  .then(r => r.json());

console.log(`Pagos en La Cantera: ${pagos.totalPagos}`);
```

### **3. Filtrar por fechas**

```javascript
// Pagos del último mes
const hoy = new Date();
const hace1Mes = new Date();
hace1Mes.setMonth(hace1Mes.getMonth() - 1);

const pagos = await fetch(
  `/api/proveedor/pagos?fechaDesde=${hace1Mes.toISOString().split('T')[0]}&fechaHasta=${hoy.toISOString().split('T')[0]}`
).then(r => r.json());

console.log(`Pagos del último mes: ${pagos.totalPagos}`);
console.log(`Monto: $${pagos.resumenGlobal.montoTotal?.toLocaleString()}`);
```

### **4. Filtrar por estatus**

```javascript
// Solo pagos concluidos
const pagos = await fetch('/api/proveedor/pagos?estatus=CONCLUIDO')
  .then(r => r.json());

console.log(`Pagos concluidos: ${pagos.totalPagos}`);
```

---

## 🔔 SISTEMA DE NOTIFICACIONES

### **1. Ver todas las notificaciones**

```javascript
// Obtener todas las notificaciones
const notif = await fetch('/api/proveedor/notificaciones').then(r => r.json());

console.log('🔔 NOTIFICACIONES:');
console.log(`Total: ${notif.totalNotificaciones}`);
console.log(`No leídas: ${notif.totalNoLeidas}\n`);

notif.notificaciones.forEach(n => {
  const icono = n.leida ? '✓' : '🔴';
  console.log(`${icono} [${n.tipo}] ${n.titulo}`);
  console.log(`   ${n.mensaje}`);
  console.log(`   Empresa: ${n.empresa_code || 'N/A'}`);
  console.log(`   Fecha: ${new Date(n.created_at).toLocaleString()}\n`);
});
```

### **2. Solo ver notificaciones no leídas**

```javascript
// Solo no leídas
const notif = await fetch('/api/proveedor/notificaciones?soloNoLeidas=true')
  .then(r => r.json());

console.log(`📬 Tienes ${notif.totalNoLeidas} notificaciones sin leer`);
```

### **3. Crear una notificación de prueba**

```javascript
// Crear notificación de nueva orden
const nueva = await fetch('/api/proveedor/notificaciones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '3', // Tu ID de usuario
    tipo: 'NUEVA_ORDEN',
    titulo: 'Nueva Orden de Compra',
    mensaje: 'Se ha creado una nueva orden de compra OC-2024-100',
    empresaCode: 'la-cantera',
    referenciaId: '12345',
    referenciaTipo: 'ORDEN',
    prioridad: 'ALTA',
    metadata: {
      folio: 'OC-2024-100',
      total: 15000,
      moneda: 'MXN'
    }
  })
}).then(r => r.json());

console.log('Notificación creada:', nueva);
```

### **4. Marcar una notificación como leída**

```javascript
// Primero obtener las notificaciones
const notif = await fetch('/api/proveedor/notificaciones').then(r => r.json());
const primeraNoLeida = notif.notificaciones.find(n => !n.leida);

if (primeraNoLeida) {
  console.log(`Marcando como leída: ${primeraNoLeida.titulo}`);

  const resultado = await fetch(
    `/api/proveedor/notificaciones/${primeraNoLeida.id}`,
    { method: 'PATCH' }
  ).then(r => r.json());

  console.log('Resultado:', resultado.message);
}
```

### **5. Marcar todas como leídas**

```javascript
// Marcar todas como leídas de una vez
const resultado = await fetch(
  '/api/proveedor/notificaciones/marcar-todas-leidas',
  { method: 'POST' }
).then(r => r.json());

console.log(`✅ ${resultado.totalMarcadas} notificaciones marcadas como leídas`);
```

### **6. Eliminar una notificación**

```javascript
// Eliminar notificación
const notificacionId = 'GUID-DE-LA-NOTIFICACION';

const resultado = await fetch(
  `/api/proveedor/notificaciones/${notificacionId}`,
  { method: 'DELETE' }
).then(r => r.json());

console.log('Resultado:', resultado.message);
```

---

## 🎯 Script Completo de Prueba

```javascript
(async () => {
  console.log('🚀 Probando Sistema de Pagos y Notificaciones\n');

  // 1. PAGOS
  console.log('═'.repeat(50));
  console.log('💰 PAGOS RECIBIDOS');
  console.log('═'.repeat(50));

  const pagos = await fetch('/api/proveedor/pagos').then(r => r.json());

  if (pagos.success) {
    console.log(`Total pagos: ${pagos.totalPagos}`);
    console.log(`Monto total: $${pagos.resumenGlobal.montoTotal?.toLocaleString()}`);
    console.log(`Total pagado: $${pagos.resumenGlobal.totalPagado?.toLocaleString()}`);
    console.log(`Pendiente: $${pagos.resumenGlobal.saldoPendiente?.toLocaleString()}\n`);
  } else {
    console.log('⚠️  Error obteniendo pagos:', pagos.error);
    if (pagos.error?.includes('Invalid object name')) {
      console.log('💡 La tabla CxP no existe en los ERPs.');
      console.log('   Contacta al administrador para configurarla.\n');
    }
  }

  // 2. NOTIFICACIONES
  console.log('═'.repeat(50));
  console.log('🔔 NOTIFICACIONES');
  console.log('═'.repeat(50));

  try {
    const notif = await fetch('/api/proveedor/notificaciones').then(r => r.json());

    if (notif.success) {
      console.log(`Total: ${notif.totalNotificaciones}`);
      console.log(`No leídas: ${notif.totalNoLeidas}\n`);

      if (notif.totalNotificaciones === 0) {
        console.log('📭 No tienes notificaciones aún.');
        console.log('💡 Crear una notificación de prueba:\n');
        console.log('await fetch(\'/api/proveedor/notificaciones\', {');
        console.log('  method: \'POST\',');
        console.log('  headers: { \'Content-Type\': \'application/json\' },');
        console.log('  body: JSON.stringify({');
        console.log('    userId: \'3\',');
        console.log('    tipo: \'NUEVA_ORDEN\',');
        console.log('    titulo: \'Nueva Orden de Compra OC-2024-100\',');
        console.log('    mensaje: \'Se creó una orden por $15,000 MXN\',');
        console.log('    empresaCode: \'la-cantera\',');
        console.log('    prioridad: \'ALTA\'');
        console.log('  })');
        console.log('}).then(r => r.json());');
      } else {
        notif.notificaciones.slice(0, 3).forEach(n => {
          console.log(`${n.leida ? '✓' : '🔴'} [${n.tipo}] ${n.titulo}`);
          console.log(`   ${n.mensaje || 'Sin mensaje'}`);
          console.log(`   ${new Date(n.created_at).toLocaleString()}\n`);
        });
      }
    }
  } catch (error) {
    console.log('⚠️  Error obteniendo notificaciones:', error.message);
    console.log('💡 Ejecuta el script SQL para crear la tabla primero.\n');
  }

  console.log('═'.repeat(50));
  console.log('✅ Prueba completada');
  console.log('═'.repeat(50));
})();
```

---

## 📊 Tipos de Notificaciones Disponibles

| Tipo | Descripción | Prioridad Sugerida |
|------|-------------|--------------------|
| `NUEVA_ORDEN` | Nueva orden de compra creada | ALTA |
| `PAGO_RECIBIDO` | Pago registrado en el sistema | NORMAL |
| `FACTURA_APROBADA` | Factura aprobada | NORMAL |
| `FACTURA_RECHAZADA` | Factura rechazada | ALTA |
| `ORDEN_MODIFICADA` | Orden modificada | NORMAL |
| `ORDEN_CANCELADA` | Orden cancelada | ALTA |

---

## ⚠️ Notas Importantes

### **Sistema de Pagos:**
- La tabla `CxP` (Cuentas por Pagar) debe existir en los ERPs
- Si no existe, el endpoint te lo informará con un mensaje específico
- El endpoint está preparado para intentar con otras tablas alternativas

### **Sistema de Notificaciones:**
- Las notificaciones se almacenan en la base de datos **PP** (Portal)
- Debes crear la tabla `proveedor_notificaciones` primero
- Las notificaciones se ordenan por: No leídas primero → Prioridad → Fecha

---

## ✅ Checklist de Implementación

### Pagos:
- [ ] Probar endpoint de pagos sin filtros
- [ ] Filtrar por empresa
- [ ] Filtrar por fechas
- [ ] Verificar que aparecen los montos correctos
- [ ] Si hay error de tabla, contactar al administrador

### Notificaciones:
- [ ] Ejecutar script SQL de creación de tabla
- [ ] Crear notificación de prueba
- [ ] Ver todas las notificaciones
- [ ] Marcar una como leída
- [ ] Marcar todas como leídas
- [ ] Eliminar una notificación
- [ ] Filtrar solo no leídas

---

## 🚀 Integración con el Dashboard

Puedes integrar estos endpoints en tu dashboard existente:

```javascript
// En tu componente de dashboard
useEffect(() => {
  // Cargar pagos
  fetch('/api/proveedor/pagos')
    .then(r => r.json())
    .then(data => setPagos(data));

  // Cargar notificaciones no leídas
  fetch('/api/proveedor/notificaciones?soloNoLeidas=true')
    .then(r => r.json())
    .then(data => setNotificaciones(data));
}, []);
```

¡Prueba los scripts y cuéntame cómo te va! 🎉
