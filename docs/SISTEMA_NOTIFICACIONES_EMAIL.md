# Sistema de Notificaciones por Email

## Resumen

Este documento describe el sistema de notificaciones por email implementado en el Portal de Proveedores de La Cantera.

---

## Funcionalidades Implementadas

### 1. Recuperacion de Contrasena

**Flujo:**
1. Usuario accede a `/forgot-password`
2. Ingresa su email y solicita recuperacion
3. Sistema genera token seguro (SHA256, expira en 60 minutos)
4. Se envia email con enlace de recuperacion
5. Usuario accede a `/reset-password?token=xxx&email=xxx`
6. Sistema valida token y permite establecer nueva contrasena
7. Se envia email de confirmacion de cambio

**APIs:**
- `POST /api/auth/forgot-password` - Solicita recuperacion
- `GET /api/auth/reset-password` - Valida token
- `POST /api/auth/reset-password` - Establece nueva contrasena

**Tabla SQL requerida:**
```sql
-- Ejecutar: sql/create_password_reset_tokens.sql
CREATE TABLE PasswordResetTokens (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    TokenHash VARCHAR(255) NOT NULL,
    TipoUsuario VARCHAR(20) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    ...
)
```

---

### 2. Email de Bienvenida en Registro

**Proveedores:**
- Se envia automaticamente al completar registro en `/proveedores/registro`
- Template: `getWelcomeEmail` con informacion de acceso

**Administradores:**
- Se envia automaticamente al completar registro en `/admin/registro`
- Template: `getNotificacionSistemaEmail` tipo success

---

### 3. Cambio de Email de Recuperacion con Confirmacion

**Flujo:**
1. Usuario solicita cambio de email en `/proveedores/seguridad`
2. `POST /api/auth/change-recovery-email` genera token y envia email al NUEVO email
3. Usuario hace clic en enlace de confirmacion
4. `GET /api/auth/confirm-email-change` valida y actualiza email
5. Se notifica al email ANTIGUO del cambio

**Tabla SQL requerida:**
```sql
-- Ejecutar: sql/create_password_reset_tokens.sql
CREATE TABLE EmailChangeTokens (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UserId VARCHAR(50) NOT NULL,
    TipoUsuario VARCHAR(20) NOT NULL,
    EmailActual VARCHAR(100) NOT NULL,
    EmailNuevo VARCHAR(100) NOT NULL,
    TokenHash VARCHAR(255) NOT NULL,
    ...
)
```

---

### 4. Servicio de Notificaciones por Modulo

**Archivo:** `src/lib/services/email-notification-service.ts`

#### Ordenes de Compra
- `notificarNuevaOrdenCompra()` - Al proveedor cuando hay nueva OC
- `notificarOrdenConfirmada()` - Al admin cuando proveedor confirma

#### Facturas
- `notificarFacturaRecibida()` - Al admin cuando proveedor sube factura
- `notificarFacturaAprobada()` - Al proveedor cuando se aprueba
- `notificarFacturaRechazada()` - Al proveedor cuando se rechaza

#### Pagos
- `notificarPagoProgramado()` - Al proveedor cuando se programa pago
- `notificarPagoRealizado()` - Al proveedor cuando se realiza pago
- `notificarComplementoDisponible()` - Al proveedor cuando esta el complemento

#### Mensajes
- `notificarNuevoMensaje()` - Al destinatario de un mensaje

---

## Configuracion

### Variables de Entorno Requeridas

```env
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-password-de-app

# Remitente
SMTP_FROM_EMAIL=noreply@lacantera.com
SMTP_FROM_NAME=Portal de Proveedores

# App URL (para enlaces en emails)
NEXT_PUBLIC_APP_URL=https://tudominio.com

# Emails de admin para notificaciones (separados por coma)
ADMIN_NOTIFICATION_EMAILS=admin1@lacantera.com,admin2@lacantera.com

# Soporte
SUPPORT_EMAIL=soporte@lacantera.com
```

---

## Uso del Servicio de Notificaciones

```typescript
import { emailNotificationService } from '@/lib/services/email-notification-service';

// Notificar nueva orden de compra
await emailNotificationService.notificarNuevaOrdenCompra({
  proveedor: {
    nombre: 'Proveedor ABC',
    email: 'contacto@proveedorabc.com'
  },
  orden: {
    id: 12345,
    movID: 'OC-001',
    total: 50000,
    moneda: 'MXN',
    fechaEmision: new Date(),
    fechaRequerida: new Date('2024-02-15'),
    empresa: 'La Cantera'
  }
});

// Notificar factura aprobada
await emailNotificationService.notificarFacturaAprobada({
  proveedor: {
    nombre: 'Proveedor ABC',
    email: 'contacto@proveedorabc.com'
  },
  factura: {
    id: 789,
    folio: 'FACT-001',
    total: 25000,
    moneda: 'MXN',
    fechaEmision: new Date(),
    empresa: 'La Cantera'
  }
});
```

---

## Archivos Creados/Modificados

### Nuevos Archivos
- `src/app/forgot-password/page.tsx` - Pagina de solicitud de recuperacion
- `src/app/reset-password/page.tsx` - Pagina para establecer nueva contrasena
- `src/app/api/auth/forgot-password/route.ts` - API de solicitud
- `src/app/api/auth/reset-password/route.ts` - API de reset
- `src/app/api/auth/change-recovery-email/route.ts` - API cambio de email
- `src/app/api/auth/confirm-email-change/route.ts` - API confirmacion
- `src/lib/services/email-notification-service.ts` - Servicio de notificaciones
- `sql/create_password_reset_tokens.sql` - Script SQL para tablas

### Archivos Modificados
- `src/app/api/auth/register/route.ts` - Agregado envio de email de bienvenida
- `src/app/login/page.tsx` - Enlace a forgot-password

---

## Templates de Email Disponibles

Los templates estan en `src/lib/email-templates/`:

| Template | Uso |
|----------|-----|
| `getWelcomeEmail` | Bienvenida a proveedores |
| `getRecuperarPasswordEmail` | Recuperacion de contrasena |
| `getCambioPasswordEmail` | Confirmacion de cambio de contrasena |
| `getNotificacionSistemaEmail` | Notificaciones generales |
| `getMensajeNuevoEmail` | Nuevo mensaje |
| `getFacturaAprobadaEmail` | Factura aprobada |
| `getFacturaRechazadaEmail` | Factura rechazada |
| `getPagoRealizadoEmail` | Pago realizado |

---

## Seguridad

- Tokens de recuperacion se almacenan hasheados (SHA256)
- Tokens expiran en 60 minutos (configurables)
- Se registra IP de solicitudes
- Respuestas genericas para no revelar existencia de emails
- Tokens de un solo uso (se marcan como usados)

---

## Proximos Pasos Sugeridos

1. Ejecutar script SQL para crear tablas de tokens
2. Configurar variables de entorno SMTP
3. Integrar llamadas a `emailNotificationService` en los endpoints de:
   - Creacion de ordenes de compra
   - Aprobacion/rechazo de facturas
   - Registro de pagos
4. Configurar emails de admin para recibir notificaciones
