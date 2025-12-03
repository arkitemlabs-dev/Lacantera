# Sistema de Gestión de Documentos y Notificaciones

Este documento describe el sistema completo de gestión de documentos para proveedores, incluyendo notificaciones automáticas, validación SAT y auditoría.

## 📋 Tabla de Contenidos

1. [Funcionalidades Implementadas](#funcionalidades-implementadas)
2. [Configuración Inicial](#configuración-inicial)
3. [Sistema de Emails](#sistema-de-emails)
4. [Jobs Automáticos](#jobs-automáticos)
5. [Validación SAT](#validación-sat)
6. [API Endpoints](#api-endpoints)
7. [Componentes React](#componentes-react)
8. [Base de Datos](#base-de-datos)

---

## ✅ Funcionalidades Implementadas

### 1. Gestión de Documentos
- ✅ Subida de documentos (PDF, JPG, PNG)
- ✅ Validación de tipo y tamaño de archivo
- ✅ Estados: PENDIENTE, APROBADO, RECHAZADO, VENCIDO
- ✅ Fechas de vencimiento
- ✅ Comentarios de rechazo
- ✅ Historial de auditoría completo

### 2. Notificaciones
- ✅ Notificaciones en el portal (dropdown)
- ✅ Auto-refresh cada 30 segundos
- ✅ Badges de conteo de no leídas
- ✅ Prioridades: baja, normal, alta, urgente
- ✅ Links directos a la acción requerida

### 3. Sistema de Mensajería
- ✅ Conversaciones entre proveedores y administradores
- ✅ Mensajes con adjuntos
- ✅ Estado leído/no leído
- ✅ Auto-refresh cada 10 segundos

### 4. Emails Automáticos
- ✅ Documento aprobado
- ✅ Documento rechazado
- ✅ Documentos vencidos
- ✅ Documentos próximos a vencer
- ✅ Documentos solicitados
- ✅ Nuevos mensajes

### 5. Jobs Automáticos
- ✅ Verificación de documentos vencidos (diario 8:00 AM)
- ✅ Recordatorios de vencimiento (diario 9:00 AM)
- ✅ Limpieza de notificaciones (domingos 2:00 AM)
- ✅ Limpieza de logs de auditoría (mensual)

### 6. Validación SAT
- ✅ Validación de UUID/Folio Fiscal
- ✅ Validación de RFC (formato)
- ✅ Extracción de datos de XML CFDI
- ✅ Validación contra servicio web del SAT
- ✅ Componente UI para validación

### 7. Auditoría
- ✅ Registro automático de todas las acciones
- ✅ Captura de IP y User Agent
- ✅ Valores anteriores y nuevos
- ✅ Búsqueda por tabla y registro
- ✅ Componente de visualización

---

## 🚀 Configuración Inicial

### 1. Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y configura las siguientes variables:

```bash
# Base de datos
DATABASE_URL="Server=localhost,1433;Database=PP;User Id=sa;Password=yourPassword;TrustServerCertificate=true"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# SMTP (ejemplo con Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="noreply@lacantera.com"
SMTP_FROM_NAME="La Cantera"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Jobs
ENABLE_SCHEDULED_JOBS="true"
```

### 2. Instalar Dependencias

```bash
npm install nodemailer
npm install @types/nodemailer --save-dev
npm install node-cron
npm install @types/node-cron --save-dev
npm install axios
```

### 3. Inicializar Jobs

Agregar al archivo `src/app/layout.tsx` o crear un archivo `src/lib/init.ts`:

```typescript
import { initializeJobs } from '@/lib/jobs/scheduler';

// Inicializar jobs en el arranque de la aplicación
if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
  initializeJobs();
}
```

---

## 📧 Sistema de Emails

### Configuración SMTP

#### Gmail
1. Activar "Verificación en 2 pasos" en tu cuenta de Google
2. Ir a "Contraseñas de aplicaciones"
3. Generar una nueva contraseña para "Correo"
4. Usar esa contraseña en `SMTP_PASSWORD`

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="abcd efgh ijkl mnop"  # Contraseña de aplicación
```

#### Outlook/Office365
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="tu-email@outlook.com"
SMTP_PASSWORD="tu-contraseña"
```

#### Servidor SMTP propio
```env
SMTP_HOST="mail.tudominio.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@tudominio.com"
SMTP_PASSWORD="tu-contraseña"
```

### Templates de Email

Los templates están en `src/lib/email-templates/`:
- `base.ts` - Template base HTML
- `documento.ts` - Templates de documentos
- `notificacion.ts` - Templates de notificaciones
- `proveedor.ts` - Templates de proveedores
- `factura.ts` - Templates de facturas
- `pago.ts` - Templates de pagos

### Enviar Email Manualmente

```typescript
import { sendDocumentoAprobadoEmail } from '@/lib/helpers/email';

await sendDocumentoAprobadoEmail({
  to: 'proveedor@email.com',
  proveedorNombre: 'Proveedor ABC',
  nombreDocumento: 'Constancia_Fiscal.pdf',
  tipoDocumento: 'Constancia de Situación Fiscal',
  fechaAprobacion: new Date().toLocaleDateString('es-MX'),
  comentarios: 'Documento válido y vigente',
});
```

---

## ⏰ Jobs Automáticos

### Jobs Configurados

| Job | Horario | Descripción |
|-----|---------|-------------|
| Documentos vencidos | Diario 8:00 AM | Marca documentos como VENCIDO y envía notificaciones |
| Documentos próximos a vencer | Diario 9:00 AM | Notifica documentos que vencen en 7, 15 o 30 días |
| Limpiar notificaciones | Domingos 2:00 AM | Elimina notificaciones leídas de más de 30 días |
| Limpiar audit logs | Mensual (día 1, 3:00 AM) | Elimina logs de más de 1 año |

### Ejecutar Job Manualmente

Para testing, puedes ejecutar jobs manualmente:

```bash
# Usando el API endpoint
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Content-Type: application/json" \
  -d '{"jobName": "documentos-vencidos"}'
```

O desde código:

```typescript
import { runJobManually } from '@/lib/jobs/scheduler';

await runJobManually('documentos-vencidos');
```

### Listar Jobs Disponibles

```bash
curl http://localhost:3000/api/jobs/run
```

---

## 🔐 Validación SAT

### Validar CFDI por Datos

```typescript
const response = await fetch('/api/facturas/validar-sat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo: 'datos',
    datos: {
      uuid: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
      rfcEmisor: 'ABC123456XYZ',
      rfcReceptor: 'XYZ987654ABC',
      total: 1000.00,
    },
    validarConSAT: true,
  }),
});

const { resultado } = await response.json();
console.log(resultado.valido); // true/false
console.log(resultado.estado); // 'Vigente', 'Cancelado', etc.
```

### Validar CFDI desde XML

```typescript
const xmlContent = await file.text();

const response = await fetch('/api/facturas/validar-sat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tipo: 'xml',
    xmlContent,
    validarConSAT: true,
  }),
});
```

### Validar Solo Formato (sin SAT)

```typescript
const response = await fetch('/api/facturas/validar-sat?tipo=uuid&valor=A1B2C3D4-E5F6-7890-ABCD-EF1234567890');
const { valido, mensaje } = await response.json();
```

---

## 🌐 API Endpoints

### Documentos

#### `GET /api/proveedores/documentos`
Obtiene documentos de un proveedor
```
?proveedor=PROV001&empresa=EMP01
```

#### `POST /api/proveedores/documentos`
Registra un nuevo documento
```json
{
  "proveedor": "PROV001",
  "usuario": "demo",
  "empresa": "EMP01",
  "tipoDocumento": "Constancia de Situación Fiscal",
  "nombreArchivo": "constancia.pdf",
  "archivoURL": "https://...",
  "archivoTipo": "application/pdf",
  "archivoTamanio": 1024000,
  "fechaVencimiento": "2024-12-31"
}
```

#### `PATCH /api/proveedores/documentos`
Actualiza estatus de un documento
```json
{
  "documentoID": "DOC-001",
  "estatus": "APROBADO",
  "comentarios": "Documento válido"
}
```

### Notificaciones

#### `GET /api/notificaciones`
Obtiene notificaciones del usuario
```
?usuario=demo&empresa=EMP01
```

#### `PATCH /api/notificaciones`
Marca notificación como leída
```json
{
  "notificacionID": "NOT-001"
}
```

### Mensajes

#### `GET /api/mensajes`
Obtiene conversaciones o mensajes
```
?empresa=EMP01
?empresa=EMP01&conversacionID=CONV-001
```

#### `POST /api/mensajes`
Crea conversación o mensaje
```json
{
  "tipo": "mensaje",
  "conversacionID": "CONV-001",
  "remitenteID": "user1",
  "remitenteNombre": "Usuario 1",
  "remitenteRol": "proveedor",
  "destinatarioID": "user2",
  "destinatarioNombre": "Usuario 2",
  "mensaje": "Texto del mensaje",
  "asunto": "Asunto"
}
```

### Auditoría

#### `GET /api/auditoria`
Obtiene logs de auditoría
```
?tabla=ProvDocumentos&registroID=DOC-001
```

### Jobs

#### `GET /api/jobs/run`
Lista jobs disponibles

#### `POST /api/jobs/run`
Ejecuta un job manualmente
```json
{
  "jobName": "documentos-vencidos"
}
```

### Validación SAT

#### `POST /api/facturas/validar-sat`
Valida CFDI contra el SAT

#### `GET /api/facturas/validar-sat`
Valida formato de UUID o RFC
```
?tipo=uuid&valor=A1B2C3D4-...
?tipo=rfc&valor=ABC123456XYZ
```

---

## 🎨 Componentes React

### Proveedores

#### `<DocumentoUpload />`
Componente para subir documentos
```tsx
<DocumentoUpload
  proveedor="PROV001"
  empresa="EMP01"
  onUploadSuccess={() => console.log('Subido!')}
/>
```

#### `<DocumentosLista />`
Lista de documentos subidos
```tsx
<DocumentosLista
  proveedor="PROV001"
  empresa="EMP01"
  refreshTrigger={0}
/>
```

### Notificaciones

#### `<NotificacionesDropdown />`
Dropdown de notificaciones en el header
```tsx
<NotificacionesDropdown empresa="EMP01" />
```

### Mensajería

#### `<ConversacionLista />`
Lista de conversaciones
```tsx
<ConversacionLista
  empresa="EMP01"
  onSelectConversacion={(id) => console.log(id)}
/>
```

#### `<MensajesViewer />`
Visualizador de mensajes
```tsx
<MensajesViewer
  conversacionID="CONV-001"
  currentUser={{ id: 'user1', nombre: 'Usuario 1', rol: 'proveedor' }}
  destinatario={{ id: 'user2', nombre: 'Usuario 2' }}
  asunto="Asunto de la conversación"
/>
```

### Admin

#### `<DocumentoAprobacion />`
Componente para aprobar/rechazar documentos
```tsx
<DocumentoAprobacion
  documento={documento}
  onStatusChange={() => console.log('Estado cambiado')}
/>
```

#### `<AuditLogViewer />`
Visualizador de logs de auditoría
```tsx
<AuditLogViewer
  tabla="ProvDocumentos"
  registroID="DOC-001"
/>
```

### Facturas

#### `<ValidadorSAT />`
Validador de facturas contra el SAT
```tsx
<ValidadorSAT />
```

---

## 🗄️ Base de Datos

### Tablas Nuevas

1. **UsuarioExtension** - Datos extendidos de usuarios
2. **ProveedorCategoria** - Categorías de proveedores
3. **TipoDocumento** - Catálogo de tipos de documento
4. **ProvDocumentos** - Documentos subidos por proveedores
5. **NotificacionPortal** - Notificaciones del portal
6. **Conversacion** - Conversaciones de mensajería
7. **Mensaje** - Mensajes individuales
8. **AuditLog** - Registro de auditoría

### Esquema Completo

Ver archivo: `docs/database/DATABASE_USAGE_GUIDE.md`

---

## 🔧 Troubleshooting

### Error al enviar emails

1. Verificar credenciales SMTP
2. Verificar que el puerto esté abierto
3. Para Gmail, usar contraseña de aplicación
4. Verificar firewall/antivirus

### Jobs no se ejecutan

1. Verificar `ENABLE_SCHEDULED_JOBS=true`
2. Verificar que se llame a `initializeJobs()`
3. Revisar logs de consola
4. Probar job manualmente: `POST /api/jobs/run`

### Validación SAT falla

1. Verificar conexión a internet
2. El servicio del SAT puede estar temporalmente inactivo
3. Usar validación offline para testing:
```typescript
validarCFDIOffline(xmlContent)
```

### Notificaciones no aparecen

1. Verificar que el usuario esté autenticado
2. Verificar que la empresa esté seleccionada
3. Revisar la tabla `NotificacionPortal` en la base de datos
4. Verificar permisos de la API

---

## 📝 Notas Adicionales

### Seguridad

- Todos los endpoints requieren autenticación
- Los archivos se validan por tipo y tamaño
- Las acciones se registran en el audit log
- Los passwords nunca se almacenan en texto plano

### Performance

- Las notificaciones usan polling (30s)
- Los mensajes usan polling (10s)
- Considerar implementar WebSockets para real-time
- Los logs antiguos se limpian automáticamente

### Escalabilidad

- Los jobs usan node-cron (single server)
- Para múltiples servidores, usar:
  - Bull Queue con Redis
  - Agenda con MongoDB
  - Azure Functions / AWS Lambda

---

## 📚 Recursos

- [Nodemailer Documentation](https://nodemailer.com/)
- [Node-Cron Documentation](https://www.npmjs.com/package/node-cron)
- [SAT - Validación de CFDI](https://www.sat.gob.mx/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**¿Preguntas o problemas?** Contacta al equipo de desarrollo.
