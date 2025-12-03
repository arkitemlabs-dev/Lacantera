#  GUÍA DE USO - BASE DE DATOS PORTAL PROVEEDORES

##  Resumen

Esta guía muestra cómo usar las funciones de base de datos del Portal de Proveedores La Cantera.

---

##  Archivos Principales

### 1. Base de Datos
- **`sqlserver-pnet.ts`** - Funciones originales (auth, empresas básicas)
- **`sqlserver-extended.ts`** - Funciones nuevas (documentos, mensajería, notificaciones)

### 2. Scripts SQL
- **`create-portal-tables.sql`** - Crear todas las tablas
- **`insert-initial-data.sql`** - Datos iniciales de catálogos

---

## 🚀 INICIO RÁPIDO

### Paso 1: Ejecutar Scripts SQL

```sql
-- En SQL Server Management Studio, conectar a base de datos PP
USE PP;
GO

-- 1. Crear tablas
-- Ejecutar: database/create-portal-tables.sql

-- 2. Insertar datos iniciales
-- Ejecutar: database/insert-initial-data.sql
```

### Paso 2: Importar en TypeScript

```typescript
// Importar funciones extendidas
import { extendedDb } from '@/lib/database/sqlserver-extended';

// Importar funciones originales
import { SqlServerPNetDatabase } from '@/lib/database/sqlserver-pnet';
const db = new SqlServerPNetDatabase();
```

---

## 📖 EJEMPLOS DE USO

### 1. EXTENSIÓN DE USUARIO

#### Obtener datos extendidos de usuario

```typescript
import { extendedDb } from '@/lib/database/sqlserver-extended';

// Obtener extensión de usuario
const extension = await extendedDb.getUsuarioExtension(idUsuario);

if (extension) {
  console.log('RFC:', extension.rfc);
  console.log('Teléfono:', extension.telefono);
  console.log('Dirección:', extension.direccionCalle);
}
```

#### Actualizar datos extendidos

```typescript
await extendedDb.upsertUsuarioExtension({
  idUsuario: 123,
  rfc: 'ABC123456XYZ',
  razonSocial: 'Mi Empresa S.A. de C.V.',
  telefono: '5551234567',
  direccionCalle: 'Av. Principal 123',
  direccionCiudad: 'Ciudad de México',
  direccionEstado: 'CDMX',
  direccionCP: '01234',
  avatarURL: 'https://storage.com/avatar.jpg',
  emailVerified: true,
});
```

### 2. MULTI-EMPRESA

#### Obtener empresas de un usuario

```typescript
// Obtener todas las empresas asignadas al usuario
const empresas = await extendedDb.getEmpresasByUsuario(idUsuario);

empresas.forEach((ue) => {
  console.log(`Empresa: ${ue.empresa}`);
  console.log(`Rol: ${ue.rol}`);
  console.log(`Activo: ${ue.activo}`);
  console.log(`Documentos validados: ${ue.documentosValidados}`);
});
```

#### Asignar usuario a empresa

```typescript
const id = await extendedDb.asignarUsuarioEmpresa({
  idUsuario: 123,
  empresa: 'DEMO',
  rol: 'Proveedor',
  activo: true,
  proveedorID: 'PROV001',
  documentosValidados: false,
  configuracionesJSON: JSON.stringify({ notificaciones: true }),
});

console.log('Usuario asignado con ID:', id);
```

### 3. DOCUMENTOS DE PROVEEDORES

#### Obtener documentos de un proveedor

```typescript
const documentos = await extendedDb.getDocumentosProveedor('PROV001', 'DEMO');

documentos.forEach((doc) => {
  console.log(`Tipo: ${doc.tipoDocumento}`);
  console.log(`Nombre: ${doc.nombreArchivo}`);
  console.log(`Estatus: ${doc.estatus}`);
  console.log(`Vencimiento: ${doc.fechaVencimiento}`);
});
```

#### Subir nuevo documento

```typescript
const documentoID = await extendedDb.createDocumentoProveedor({
  documentoID: `DOC-${Date.now()}`,
  proveedor: 'PROV001',
  idUsuario: 123,
  empresa: 'DEMO',
  tipoDocumento: 'constancia_fiscal',
  nombreArchivo: 'constancia_fiscal_2024.pdf',
  archivoURL: 'https://storage.com/docs/constancia.pdf',
  archivoTipo: 'application/pdf',
  archivoTamanio: 1024000, // bytes
  estatus: 'PENDIENTE',
  fechaVencimiento: new Date('2024-12-31'),
});

console.log('Documento creado:', documentoID);
```

#### Aprobar/Rechazar documento

```typescript
// Aprobar documento
await extendedDb.updateDocumentoEstatus(
  'DOC-123456',
  'APROBADO',
  adminUserId,
  'Juan Pérez',
  'Documento válido y vigente'
);

// Rechazar documento
await extendedDb.updateDocumentoEstatus(
  'DOC-123456',
  'RECHAZADO',
  adminUserId,
  'Juan Pérez',
  'Documento no legible, favor de volver a cargar'
);
```

#### Obtener tipos de documentos

```typescript
const tipos = await extendedDb.getTiposDocumento(true);

tipos.forEach((tipo) => {
  console.log(`Código: ${tipo.codigo}`);
  console.log(`Nombre: ${tipo.nombre}`);
  console.log(`Vigencia: ${tipo.vigenciaDias || 'Sin vencimiento'} días`);
});
```

#### Obtener documentos por vencer

```typescript
// Documentos que vencen en los próximos 30 días
const porVencer = await extendedDb.getDocumentosPorVencer(30, 'DEMO');

porVencer.forEach((doc) => {
  console.log(`Proveedor: ${doc.proveedor}`);
  console.log(`Documento: ${doc.tipoDocumento}`);
  console.log(`Vence: ${doc.fechaVencimiento}`);
  console.log(`Email: ${doc.proveedorEmail}`);

  // Aquí puedes enviar alertas por email
});
```

### 4. NOTIFICACIONES

#### Crear notificación

```typescript
const notifID = await extendedDb.createNotificacion({
  notificacionID: `NOTIF-${Date.now()}`,
  idUsuario: 123,
  usuarioNombre: 'Juan Pérez',
  empresa: 'DEMO',
  tipo: 'documento_por_vencer',
  titulo: 'Documento por Vencer',
  mensaje: 'Tu Constancia Fiscal vence en 15 días',
  link: '/proveedores/perfil#documentos',
  datosJSON: JSON.stringify({
    documentoID: 'DOC-123',
    diasRestantes: 15,
  }),
  leida: false,
  emailEnviado: false,
  prioridad: 'alta',
});
```

#### Obtener notificaciones de usuario

```typescript
const notificaciones = await extendedDb.getNotificacionesUsuario(
  idUsuario,
  'DEMO',
  50 // límite
);

notificaciones.forEach((notif) => {
  console.log(`[${notif.prioridad}] ${notif.titulo}`);
  console.log(`Mensaje: ${notif.mensaje}`);
  console.log(`Leída: ${notif.leida ? 'Sí' : 'No'}`);
});
```

#### Marcar como leída

```typescript
await extendedDb.marcarNotificacionLeida('NOTIF-123456');
```

#### Contar no leídas

```typescript
const count = await extendedDb.contarNotificacionesNoLeidas(idUsuario, 'DEMO');
console.log(`Notificaciones pendientes: ${count}`);
```

### 5. MENSAJERÍA

#### Crear conversación

```typescript
const conversacionID = await extendedDb.createConversacion({
  conversacionID: `CONV-${Date.now()}`,
  empresa: 'DEMO',
  participantesJSON: JSON.stringify([
    { id: 123, nombre: 'Proveedor ABC', rol: 'proveedor' },
    { id: 456, nombre: 'Admin Compras', rol: 'admin' },
  ]),
  asunto: 'Consulta sobre Orden de Compra OC-127',
  activa: true,
});
```

#### Enviar mensaje

```typescript
const mensajeID = await extendedDb.createMensaje({
  mensajeID: `MSG-${Date.now()}`,
  conversacionID: 'conv-uuid-123',
  remitenteID: 123,
  remitenteNombre: 'Proveedor ABC',
  remitenteRol: 'proveedor',
  destinatarioID: 456,
  destinatarioNombre: 'Admin Compras',
  mensaje: '¿Cuál es el estatus de la orden de compra OC-127?',
  asunto: 'Consulta sobre OC-127',
  archivosJSON: null,
  leido: false,
});
```

#### Obtener conversaciones

```typescript
const conversaciones = await extendedDb.getConversacionesUsuario(idUsuario, 'DEMO');

conversaciones.forEach((conv) => {
  console.log(`Asunto: ${conv.asunto}`);
  console.log(`Último mensaje: ${conv.ultimoMensaje}`);
  console.log(`Fecha: ${conv.ultimoMensajeFecha}`);
});
```

#### Obtener mensajes de conversación

```typescript
const mensajes = await extendedDb.getMensajesConversacion('conv-uuid-123');

mensajes.forEach((msg) => {
  console.log(`${msg.remitenteNombre}: ${msg.mensaje}`);
  console.log(`Fecha: ${msg.createdAt}`);
  console.log(`Leído: ${msg.leido ? 'Sí' : 'No'}`);
});
```

#### Marcar mensaje como leído

```typescript
await extendedDb.marcarMensajeLeido('MSG-123456');
```

---

## 🔄 EJEMPLOS DE FLUJOS COMPLETOS

### Flujo 1: Registro de Proveedor

```typescript
import { SqlServerPNetDatabase } from '@/lib/database/sqlserver-pnet';
import { extendedDb } from '@/lib/database/sqlserver-extended';

const db = new SqlServerPNetDatabase();

async function registrarProveedor(data: {
  email: string;
  password: string;
  nombre: string;
  rfc: string;
  razonSocial: string;
  telefono: string;
  empresa: string;
}) {
  // 1. Crear usuario en pNet
  const userId = await db.createProveedorUser({
    email: data.email,
    password: data.password,
    nombre: data.nombre,
    rfc: data.rfc,
    razonSocial: data.razonSocial,
    empresa: data.empresa,
  });

  // 2. Crear extensión con datos adicionales
  await extendedDb.upsertUsuarioExtension({
    idUsuario: userId,
    rfc: data.rfc,
    razonSocial: data.razonSocial,
    telefono: data.telefono,
    emailVerified: false,
  });

  // 3. Asignar a empresa
  await extendedDb.asignarUsuarioEmpresa({
    idUsuario: userId,
    empresa: data.empresa,
    rol: 'Proveedor',
    activo: true,
    proveedorID: `PROV${userId}`,
    documentosValidados: false,
  });

  // 4. Enviar notificación de bienvenida
  await extendedDb.createNotificacion({
    notificacionID: `NOTIF-${Date.now()}`,
    idUsuario: userId,
    usuarioNombre: data.nombre,
    empresa: data.empresa,
    tipo: 'bienvenida',
    titulo: '¡Bienvenido al Portal!',
    mensaje: 'Completa tu documentación para comenzar',
    link: '/proveedores/perfil',
    prioridad: 'normal',
    leida: false,
    emailEnviado: false,
  });

  return userId;
}
```

### Flujo 2: Validar Documentos del Proveedor

```typescript
async function validarDocumentosProveedor(
  proveedor: string,
  empresa: string,
  adminId: number,
  adminNombre: string
) {
  // 1. Obtener documentos pendientes
  const documentos = await extendedDb.getDocumentosProveedor(proveedor, empresa);
  const pendientes = documentos.filter((d) => d.estatus === 'PENDIENTE');

  console.log(`Documentos pendientes: ${pendientes.length}`);

  // 2. Validar cada documento
  for (const doc of pendientes) {
    // Aquí iría la lógica de validación
    const esValido = validarDocumento(doc); // función de ejemplo

    if (esValido) {
      // Aprobar
      await extendedDb.updateDocumentoEstatus(
        doc.documentoID,
        'APROBADO',
        adminId,
        adminNombre,
        'Documento aprobado'
      );

      // Notificar al proveedor
      await extendedDb.createNotificacion({
        notificacionID: `NOTIF-${Date.now()}`,
        idUsuario: doc.idUsuario,
        usuarioNombre: '',
        empresa: empresa,
        tipo: 'documento_validado',
        titulo: 'Documento Aprobado',
        mensaje: `Tu documento ${doc.tipoDocumento} ha sido aprobado`,
        link: '/proveedores/perfil#documentos',
        prioridad: 'normal',
        leida: false,
        emailEnviado: false,
      });
    } else {
      // Rechazar
      await extendedDb.updateDocumentoEstatus(
        doc.documentoID,
        'RECHAZADO',
        adminId,
        adminNombre,
        'Documento no cumple con los requisitos'
      );
    }
  }

  // 3. Verificar si todos los documentos están aprobados
  const todosAprobados = documentos.every((d) => d.estatus === 'APROBADO');

  if (todosAprobados) {
    // Actualizar flag en pNetUsuarioEmpresa
    console.log('Todos los documentos aprobados para', proveedor);
  }
}
```

### Flujo 3: Sistema de Alertas de Vencimiento

```typescript
async function enviarAlertasDocumentosVencimiento() {
  const empresas = ['DEMO', 'LCDM', 'ARKT']; // Empresas activas

  for (const empresa of empresas) {
    // Alertas 30 días
    const en30Dias = await extendedDb.getDocumentosPorVencer(30, empresa);
    for (const doc of en30Dias) {
      await extendedDb.createNotificacion({
        notificacionID: `NOTIF-${Date.now()}-${doc.documentoID}`,
        idUsuario: doc.idUsuario,
        usuarioNombre: doc.proveedorNombre,
        empresa: empresa,
        tipo: 'documento_por_vencer',
        titulo: 'Documento por Vencer (30 días)',
        mensaje: `Tu ${doc.tipoDocumentoNombre} vence el ${doc.fechaVencimiento}`,
        link: '/proveedores/perfil#documentos',
        prioridad: 'normal',
        leida: false,
        emailEnviado: false,
      });
    }

    // Alertas 15 días
    const en15Dias = await extendedDb.getDocumentosPorVencer(15, empresa);
    // Similar al anterior con prioridad 'alta'

    // Alertas 5 días
    const en5Dias = await extendedDb.getDocumentosPorVencer(5, empresa);
    // Similar al anterior con prioridad 'critica'
  }
}

// Ejecutar diariamente con un cron job
```

---

## ⚙️ CONFIGURACIÓN DE JOBS/TAREAS

### Job 1: Actualizar Estados de Documentos

```typescript
// Ejecutar diariamente a las 00:00
async function actualizarEstadosDocumentos() {
  const pool = await getConnection();

  await pool.request().query(`
    UPDATE ProvDocumentos
    SET Estatus = 'VENCIDO'
    WHERE Estatus = 'APROBADO'
      AND FechaVencimiento IS NOT NULL
      AND FechaVencimiento < GETDATE()
  `);

  console.log('Estados de documentos actualizados');
}
```

### Job 2: Limpiar Sesiones Expiradas

```typescript
// Ejecutar cada hora
async function limpiarSesionesExpiradas() {
  const pool = await getConnection();

  await pool.request().query(`
    DELETE FROM pNetSesiones
    WHERE ExpiresAt < GETDATE()
  `);

  await pool.request().query(`
    DELETE FROM pNetVerificationTokens
    WHERE ExpiresAt < GETDATE()
  `);

  await pool.request().query(`
    DELETE FROM pNetPasswordResetTokens
    WHERE ExpiresAt < GETDATE()
  `);

  console.log('Sesiones y tokens expirados eliminados');
}
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ **Ejecutar scripts SQL** en la base de datos PP
2. 🔄 **Crear API Routes** en Next.js para cada funcionalidad
3. 🔄 **Crear componentes React** para la UI
4. 🔄 **Implementar jobs** para alertas automáticas
5. 🔄 **Configurar emails** para notificaciones
6. 🔄 **Implementar validación SAT** para facturas

---

## 📚 DOCUMENTACIÓN ADICIONAL

- [DATABASE_MAPPING.md](DATABASE_MAPPING.md) - Mapeo de tablas
- [create-portal-tables.sql](../database/create-portal-tables.sql) - Script de creación
- [insert-initial-data.sql](../database/insert-initial-data.sql) - Datos iniciales

---

## 🆘 SOPORTE

Para dudas o problemas:
1. Revisar esta guía
2. Consultar el mapeo de base de datos
3. Verificar los scripts SQL ejecutados correctamente

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0
