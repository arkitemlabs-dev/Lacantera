# Guía del Sistema de Email - La Cantera

Esta guía explica cómo usar el sistema de email de La Cantera para enviar notificaciones y comunicaciones a los usuarios.

## 📋 Tabla de Contenidos

1. [Configuración](#configuración)
2. [Servicio de Email](#servicio-de-email)
3. [Templates Disponibles](#templates-disponibles)
4. [Uso Básico](#uso-básico)
5. [Ejemplos Completos](#ejemplos-completos)
6. [Personalización](#personalización)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuración

### 1. Variables de Entorno

Configura las siguientes variables en tu archivo `.env`:

```env
# Configuración SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion

# Email remitente
EMAIL_FROM=noreply@lacantera.com
EMAIL_FROM_NAME=La Cantera
```

### 2. Configuración para Gmail

Si usas Gmail, necesitas crear una **Contraseña de Aplicación**:

1. Ve a tu cuenta de Google
2. Seguridad → Verificación en dos pasos (actívala si no la tienes)
3. Contraseñas de aplicaciones
4. Selecciona "Correo" y "Otro dispositivo"
5. Copia la contraseña generada y úsala en `SMTP_PASSWORD`

### 3. Alternativas de Servicio

#### SendGrid
```env
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@tuempresa.com
```

#### Mailgun
```env
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=mg.tudominio.com
```

#### AWS SES
```env
AWS_SES_ACCESS_KEY=your-access-key
AWS_SES_SECRET_KEY=your-secret-key
AWS_SES_REGION=us-east-1
```

### 4. Instalar Dependencias

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

## 📧 Servicio de Email

### Arquitectura

El sistema está compuesto por:

1. **`email-service.ts`** - Servicio centralizado para envío de emails
2. **`email-templates/`** - Templates HTML para diferentes tipos de emails
   - `base.ts` - Template base y componentes
   - `proveedor.ts` - Emails relacionados con proveedores
   - `factura.ts` - Emails relacionados con facturas
   - `pago.ts` - Emails relacionados con pagos
   - `notificacion.ts` - Emails de notificaciones generales

### Características

- ✅ Modo desarrollo (usa Ethereal Email para testing)
- ✅ Modo producción (usa SMTP real)
- ✅ Templates HTML responsivos
- ✅ Soporte para adjuntos
- ✅ Reintentos automáticos
- ✅ Logging detallado

---

## 📨 Templates Disponibles

### Templates de Proveedores

| Template | Descripción | Cuándo usar |
|----------|-------------|-------------|
| `getWelcomeEmail` | Email de bienvenida | Cuando un proveedor se registra |
| `getInvitationEmail` | Invitación a registro | Para invitar nuevos proveedores |
| `getDocumentRequestEmail` | Solicitud de documentos | Cuando faltan documentos |
| `getApprovalEmail` | Aprobación de proveedor | Cuando se aprueba un proveedor |
| `getRejectionEmail` | Rechazo de solicitud | Cuando se rechaza un proveedor |

### Templates de Facturas

| Template | Descripción | Cuándo usar |
|----------|-------------|-------------|
| `getFacturaRecibidaEmail` | Confirmación de recepción | Al recibir una factura |
| `getFacturaAprobadaEmail` | Factura aprobada | Al aprobar una factura |
| `getFacturaRechazadaEmail` | Factura rechazada | Al rechazar una factura |
| `getFacturaPendienteEmail` | Recordatorio de factura | Recordatorio de facturas pendientes |

### Templates de Pagos

| Template | Descripción | Cuándo usar |
|----------|-------------|-------------|
| `getPagoProgramadoEmail` | Pago programado | Al programar un pago |
| `getPagoRealizadoEmail` | Pago realizado | Al realizar un pago |
| `getComplementoDisponibleEmail` | Complemento disponible | Cuando está listo el complemento |
| `getRecordatorioPagoEmail` | Recordatorio de pago | Días antes del pago |

### Templates de Notificaciones

| Template | Descripción | Cuándo usar |
|----------|-------------|-------------|
| `getMensajeNuevoEmail` | Nuevo mensaje | Al recibir un mensaje |
| `getNotificacionSistemaEmail` | Notificación del sistema | Alertas importantes |
| `getResumenSemanalEmail` | Resumen semanal | Resumen de actividad |
| `getCambioPasswordEmail` | Cambio de contraseña | Al cambiar contraseña |
| `getRecuperarPasswordEmail` | Recuperar contraseña | Para reset de password |

---

## 🚀 Uso Básico

### 1. Importar el Servicio

```typescript
import { sendEmail } from '@/lib/email-service';
import { getWelcomeEmail } from '@/lib/email-templates';
```

### 2. Enviar un Email Simple

```typescript
// Generar el HTML del email
const emailHtml = getWelcomeEmail({
  nombreProveedor: "Constructora ABC",
  nombreContacto: "Juan Pérez",
  email: "juan@constructora.com",
  empresaCliente: "La Cantera",
  loginUrl: "https://lacantera.com/login"
});

// Enviar el email
const result = await sendEmail({
  to: "juan@constructora.com",
  subject: "¡Bienvenido a La Cantera!",
  html: emailHtml
});

if (result.success) {
  console.log('Email enviado:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

### 3. Enviar a Múltiples Destinatarios

```typescript
await sendEmail({
  to: ["usuario1@example.com", "usuario2@example.com"],
  cc: "supervisor@example.com",
  subject: "Asunto del email",
  html: emailHtml
});
```

### 4. Enviar con Adjuntos

```typescript
await sendEmail({
  to: "proveedor@example.com",
  subject: "Complemento de Pago",
  html: emailHtml,
  attachments: [
    {
      filename: "complemento.xml",
      content: xmlBuffer,
      contentType: "application/xml"
    },
    {
      filename: "complemento.pdf",
      path: "/path/to/file.pdf"
    }
  ]
});
```

---

## 💡 Ejemplos Completos

### Ejemplo 1: Email de Bienvenida

```typescript
// src/app/actions/proveedores.ts

import { sendEmail } from '@/lib/email-service';
import { getWelcomeEmail } from '@/lib/email-templates';

export async function registrarProveedor(data: ProveedorData) {
  // ... código de registro ...

  // Enviar email de bienvenida
  const emailHtml = getWelcomeEmail({
    nombreProveedor: data.nombreEmpresa,
    nombreContacto: data.nombreContacto,
    email: data.email,
    empresaCliente: "La Cantera",
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
  });

  await sendEmail({
    to: data.email,
    subject: "¡Bienvenido a La Cantera!",
    html: emailHtml
  });

  return { success: true };
}
```

### Ejemplo 2: Notificación de Factura Aprobada

```typescript
// src/app/actions/facturas.ts

import { sendEmail } from '@/lib/email-service';
import { getFacturaAprobadaEmail } from '@/lib/email-templates';

export async function aprobarFactura(facturaId: string) {
  const factura = await getFacturaById(facturaId);
  const proveedor = await getProveedorById(factura.proveedorId);

  // Actualizar status
  await updateFactura(facturaId, {
    status: 'aprobada',
    fechaAprobacion: new Date()
  });

  // Enviar notificación
  const emailHtml = getFacturaAprobadaEmail({
    nombreProveedor: proveedor.nombre,
    nombreContacto: proveedor.contacto,
    empresaCliente: "La Cantera",
    folioFactura: factura.folio,
    uuid: factura.uuid,
    total: factura.total,
    fechaPagoEstimada: calcularFechaPago(factura),
    facturaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/facturas/${facturaId}`
  });

  await sendEmail({
    to: proveedor.email,
    subject: `Factura ${factura.folio} Aprobada`,
    html: emailHtml
  });

  return { success: true };
}
```

### Ejemplo 3: Notificación de Pago con Complemento

```typescript
// src/app/actions/pagos.ts

import { sendEmail } from '@/lib/email-service';
import { getPagoRealizadoEmail } from '@/lib/email-templates';

export async function procesarPago(pagoId: string) {
  const pago = await getPagoById(pagoId);
  const proveedor = await getProveedorById(pago.proveedorId);
  const facturas = await getFacturasByIds(pago.facturasIds);

  // Procesar pago y generar complemento
  const complemento = await generarComplementoPago(pago);

  // Enviar email con complemento adjunto
  const emailHtml = getPagoRealizadoEmail({
    nombreProveedor: proveedor.nombre,
    nombreContacto: proveedor.contacto,
    empresaCliente: "La Cantera",
    facturas: facturas.map(f => ({
      folio: f.folio,
      uuid: f.uuid,
      monto: f.total
    })),
    montoTotal: pago.monto,
    fechaPago: new Date(),
    metodoPago: pago.metodoPago,
    referencia: pago.referencia,
    uuidComplemento: complemento.uuid,
    complementoUrl: `${process.env.NEXT_PUBLIC_APP_URL}/complementos/${complemento.id}`,
    pagoUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pagos/${pagoId}`
  });

  await sendEmail({
    to: proveedor.email,
    subject: `Pago Realizado - ${pago.referencia}`,
    html: emailHtml,
    attachments: [
      {
        filename: `${complemento.folio}.xml`,
        content: complemento.xml,
        contentType: 'application/xml'
      },
      {
        filename: `${complemento.folio}.pdf`,
        content: complemento.pdf,
        contentType: 'application/pdf'
      }
    ]
  });

  return { success: true };
}
```

### Ejemplo 4: Resumen Semanal Automático

```typescript
// src/lib/cron/weekly-summary.ts

import { sendEmail } from '@/lib/email-service';
import { getResumenSemanalEmail } from '@/lib/email-templates';

export async function enviarResumenSemanal() {
  const proveedores = await getAllProveedoresActivos();

  for (const proveedor of proveedores) {
    const estadisticas = await getEstadisticasSemanales(proveedor.id);
    const proximosPagos = await getProximosPagos(proveedor.id);

    const emailHtml = getResumenSemanalEmail({
      nombreProveedor: proveedor.nombre,
      nombreContacto: proveedor.contacto,
      semana: getNumeroSemana(),
      estadisticas,
      proximosPagos,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });

    await sendEmail({
      to: proveedor.email,
      subject: `Resumen Semanal - La Cantera`,
      html: emailHtml
    });
  }
}
```

### Ejemplo 5: Recuperación de Contraseña

```typescript
// src/app/actions/auth.ts

import { sendEmail } from '@/lib/email-service';
import { getRecuperarPasswordEmail } from '@/lib/email-templates';

export async function solicitarRecuperarPassword(email: string) {
  const usuario = await getUserByEmail(email);

  if (!usuario) {
    // Por seguridad, no revelar si el email existe
    return { success: true };
  }

  // Generar token de reset
  const resetToken = await generarResetToken(usuario.id);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

  const emailHtml = getRecuperarPasswordEmail({
    nombreUsuario: usuario.nombre,
    email: usuario.email,
    resetUrl,
    expiraEn: 60, // minutos
    ipAddress: obtenerIP()
  });

  await sendEmail({
    to: usuario.email,
    subject: 'Recuperar Contraseña - La Cantera',
    html: emailHtml
  });

  return { success: true };
}
```

---

## 🎨 Personalización

### Crear un Template Personalizado

```typescript
// src/lib/email-templates/custom.ts

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

export interface MiTemplateData {
  nombre: string;
  mensaje: string;
  url: string;
}

export function getMiTemplate(data: MiTemplateData): string {
  const content = `
    <h1>Hola ${data.nombre}! 👋</h1>

    ${getAlert(data.mensaje, 'info')}

    ${getCard(`
      <p>Contenido de la tarjeta aquí</p>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Mi Botón', data.url)}
    </div>
  `;

  return getBaseTemplate(content, 'Preview del email');
}
```

### Componentes Disponibles

```typescript
// Botón
getButton('Texto del botón', 'https://url.com', 'primary' | 'success' | 'danger' | 'warning')

// Alerta
getAlert('Mensaje de la alerta', 'info' | 'success' | 'warning' | 'danger')

// Tarjeta
getCard(`<p>Contenido HTML aquí</p>`)

// Divisor
getDivider()
```

---

## ✅ Mejores Prácticas

### 1. Modo Desarrollo vs Producción

```typescript
// El servicio automáticamente detecta el modo
if (process.env.NODE_ENV !== 'production') {
  // Usa Ethereal Email (emails de prueba)
  // Ver preview en: https://ethereal.email
} else {
  // Usa SMTP real
}
```

### 2. Manejo de Errores

```typescript
const result = await sendEmail({
  to: email,
  subject: asunto,
  html: htmlContent
});

if (!result.success) {
  // Registrar error
  console.error('Error enviando email:', result.error);

  // Guardar en cola de reintentos
  await agregarAColaReintentos(email, asunto, htmlContent);

  // Notificar al admin
  await notificarAdmin('Error de email', result.error);
}
```

### 3. Previsualización de Emails

En desarrollo, puedes ver los emails en Ethereal:

```typescript
const info = await sendEmail({...});
// Busca en la consola:
// "Preview URL: https://ethereal.email/message/xxx"
```

### 4. Templates Responsivos

Todos los templates son responsivos. Usan tablas HTML para compatibilidad con clientes de email antiguos.

### 5. Testing

```typescript
// tests/email.test.ts

import { getWelcomeEmail } from '@/lib/email-templates';

describe('Email Templates', () => {
  it('debe generar email de bienvenida', () => {
    const html = getWelcomeEmail({
      nombreProveedor: "Test",
      nombreContacto: "Test User",
      email: "test@test.com",
      empresaCliente: "Test Company",
      loginUrl: "https://test.com"
    });

    expect(html).toContain('Bienvenido');
    expect(html).toContain('Test User');
  });
});
```

---

## 🐛 Troubleshooting

### Error: "Invalid login"

**Causa:** Credenciales SMTP incorrectas

**Solución:**
- Verifica `SMTP_USER` y `SMTP_PASSWORD`
- Si usas Gmail, asegúrate de usar una Contraseña de Aplicación
- Verifica que la verificación en 2 pasos esté activa

### Error: "Connection timeout"

**Causa:** Puerto o host incorrectos

**Solución:**
- Gmail: `smtp.gmail.com:587` o `smtp.gmail.com:465`
- Outlook: `smtp-mail.outlook.com:587`
- Verifica el firewall

### Error: "Self signed certificate"

**Causa:** Certificado SSL no confiable

**Solución:**
```typescript
// Solo para desarrollo local
const transporter = nodemailer.createTransport({
  // ...otras opciones
  tls: {
    rejectUnauthorized: false
  }
});
```

### Emails van a spam

**Soluciones:**
- Configura SPF, DKIM y DMARC en tu dominio
- Usa un servicio de email profesional (SendGrid, Mailgun, etc.)
- Evita palabras spam en el asunto
- Incluye un link de "unsubscribe"

### Emails no llegan

**Checklist:**
1. ✅ Verifica que el email existe
2. ✅ Revisa la carpeta de spam
3. ✅ Revisa los logs del servidor
4. ✅ Verifica los límites de envío de tu proveedor
5. ✅ Usa herramientas como [Mail Tester](https://www.mail-tester.com/)

---

## 📚 Recursos Adicionales

- [Nodemailer Documentation](https://nodemailer.com/)
- [Email Design Guide](https://www.campaignmonitor.com/css/)
- [HTML Email Templates](https://htmlemail.io/)
- [Email Testing Tools](https://www.emailonacid.com/)

---

## 🔄 Actualizaciones Futuras

Características planeadas:

- [ ] Templates en diferentes idiomas
- [ ] Editor visual de templates
- [ ] A/B testing de emails
- [ ] Analytics de apertura y clicks
- [ ] Cola de envío con prioridades
- [ ] Plantillas dinámicas desde base de datos

---

¿Preguntas o sugerencias? Contacta al equipo de desarrollo.
