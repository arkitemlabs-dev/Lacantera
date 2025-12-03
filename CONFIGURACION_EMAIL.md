# 📧 Guía de Configuración de Email

Esta guía te ayudará a configurar el sistema de notificaciones por email paso a paso.

---

## 📋 Opción 1: Gmail (Recomendado para desarrollo)

### Paso 1: Habilitar Verificación en 2 Pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú lateral, selecciona **Seguridad**
3. Busca la sección **Cómo inicias sesión en Google**
4. Haz clic en **Verificación en 2 pasos**
5. Sigue los pasos para habilitar la verificación en 2 pasos (necesitarás tu teléfono)

### Paso 2: Crear Contraseña de Aplicación

1. Una vez habilitada la verificación en 2 pasos, ve a: https://myaccount.google.com/apppasswords
2. Puede que te pida iniciar sesión nuevamente
3. En "Selecciona la app y el dispositivo", elige:
   - **App**: Correo
   - **Dispositivo**: Otro (personalizado)
   - Escribe: "La Cantera Portal"
4. Haz clic en **Generar**
5. Google te mostrará una contraseña de 16 caracteres (ejemplo: `abcd efgh ijkl mnop`)
6. **¡COPIA esta contraseña!** No podrás verla de nuevo

### Paso 3: Configurar Variables de Entorno

Abre tu archivo `.env.local` y actualiza estas líneas:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop  # La contraseña de 16 caracteres SIN espacios
SMTP_FROM_EMAIL=tu-email@gmail.com
SMTP_FROM_NAME=La Cantera
```

**Importante**: La contraseña debe ir sin espacios. Si Google te dio `abcd efgh ijkl mnop`, debes escribir `abcdefghijklmnop`

### Paso 4: Reiniciar el Servidor

```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
npm run dev
```

---

## 📧 Opción 2: Outlook / Office 365

### Configuración

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@outlook.com
SMTP_PASSWORD=tu-contraseña-normal
SMTP_FROM_EMAIL=tu-email@outlook.com
SMTP_FROM_NAME=La Cantera
```

**Nota**: Outlook permite usar tu contraseña normal, no necesita contraseña de aplicación.

---

## 🏢 Opción 3: Servidor SMTP Corporativo

Si tu empresa tiene un servidor SMTP propio:

### Puerto 587 (STARTTLS - Recomendado)

```env
SMTP_HOST=mail.tuempresa.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@tuempresa.com
SMTP_PASSWORD=tu-contraseña
SMTP_FROM_EMAIL=noreply@tuempresa.com
SMTP_FROM_NAME=La Cantera
```

### Puerto 465 (SSL)

```env
SMTP_HOST=mail.tuempresa.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@tuempresa.com
SMTP_PASSWORD=tu-contraseña
SMTP_FROM_EMAIL=noreply@tuempresa.com
SMTP_FROM_NAME=La Cantera
```

**Consulta con tu departamento de IT:**
- Host del servidor SMTP
- Puerto (usualmente 587 o 465)
- Credenciales de la cuenta de correo
- Si se requiere SSL/TLS

---

## 🧪 Probar la Configuración

### Opción 1: Usar el API Endpoint (Recomendado)

Crea un archivo de prueba: `test-email.js`

```javascript
// test-email.js
const testEmail = async () => {
  const response = await fetch('http://localhost:3000/api/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'tu-email-personal@gmail.com', // Email donde recibirás la prueba
    }),
  });

  const result = await response.json();
  console.log(result);
};

testEmail();
```

Ejecutar:
```bash
node test-email.js
```

### Opción 2: Probar con un Job Manual

```bash
# Iniciar el servidor
npm run dev

# En otra terminal, ejecutar:
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Content-Type: application/json" \
  -d '{"jobName": "documentos-vencidos"}'
```

Este job enviará emails a todos los proveedores con documentos vencidos (si hay alguno).

---

## ❌ Solución de Problemas

### Error: "Invalid login credentials"

**Gmail:**
- ✅ Verifica que hayas habilitado la verificación en 2 pasos
- ✅ Asegúrate de usar la contraseña de aplicación (16 caracteres), NO tu contraseña normal
- ✅ La contraseña debe ir sin espacios

**Outlook:**
- ✅ Verifica que tu contraseña sea correcta
- ✅ Si tienes 2FA habilitado, necesitas una contraseña de aplicación

**Servidor Corporativo:**
- ✅ Verifica las credenciales con tu departamento de IT
- ✅ Asegúrate de tener permisos para enviar desde esa cuenta

### Error: "Connection timeout"

- ✅ Verifica que el puerto esté correcto (587 o 465)
- ✅ Verifica tu firewall/antivirus no esté bloqueando la conexión
- ✅ Si estás en una red corporativa, puede que bloqueen puertos SMTP

### Error: "Self signed certificate"

Si estás usando un servidor corporativo con certificado autofirmado:

```env
# Agregar al .env.local
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**⚠️ Advertencia**: Solo usar en desarrollo, nunca en producción.

### Los emails no llegan

1. ✅ Verifica la carpeta de SPAM
2. ✅ Verifica que el email del remitente sea válido
3. ✅ Revisa los logs del servidor (busca "[JOB]" o "Email enviado")
4. ✅ Verifica que `ENABLE_SCHEDULED_JOBS=true` en `.env.local`

### Ver logs en tiempo real

```bash
# En la terminal donde corre npm run dev, verás mensajes como:
[SCHEDULER] Inicializando jobs programados...
[JOB] Email enviado a proveedor@email.com (2 documentos vencidos)
```

---

## 📊 Verificar que Todo Funcione

### 1. Verificar que los Jobs están activos

Abre: http://localhost:3000/api/jobs/run

Deberías ver:
```json
{
  "jobs": [
    {
      "name": "documentos-vencidos",
      "schedule": "0 8 * * *",
      "scheduleDescription": "Diario a las 8:00 AM"
    },
    ...
  ]
}
```

### 2. Verificar configuración SMTP

Abre: http://localhost:3000/api/init

Deberías ver:
```json
{
  "status": "ok",
  "message": "Servidor inicializado",
  "jobs": "enabled",
  "timestamp": "2025-01-03T..."
}
```

### 3. Ejecutar un Job de Prueba

```bash
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Content-Type: application/json" \
  -d '{"jobName": "documentos-proximos-vencer"}'
```

Deberías ver en los logs:
```
[JOB] Iniciando verificación de documentos próximos a vencer...
[JOB] Encontrados X documentos próximos a vencer
[JOB] Email enviado a proveedor@email.com (X documentos próximos a vencer)
```

---

## 📅 Horarios de los Jobs

Los jobs se ejecutan automáticamente en estos horarios:

| Job | Horario | Función |
|-----|---------|---------|
| **documentos-vencidos** | Diario 8:00 AM | Marca documentos como VENCIDO y envía notificaciones urgentes |
| **documentos-proximos-vencer** | Diario 9:00 AM | Envía recordatorios de documentos que vencen en 7, 15 o 30 días |
| **limpiar-notificaciones** | Domingos 2:00 AM | Elimina notificaciones leídas de más de 30 días |
| **limpiar-audit-logs** | Mensual (día 1, 3:00 AM) | Elimina logs de auditoría de más de 1 año |

**Nota**: Los horarios están en la zona horaria del servidor. Puedes cambiarlos en `.env.local`

---

## 🔐 Seguridad

### ✅ Buenas Prácticas

1. **NUNCA** subir `.env.local` a Git (ya está en `.gitignore`)
2. Usar contraseñas de aplicación, no contraseñas normales
3. En producción, usar un servicio de email dedicado (SendGrid, AWS SES, etc.)
4. Rotar las contraseñas periódicamente
5. Monitorear los logs de envío de emails

### 🚫 NO hacer

- ❌ NO compartir las contraseñas de aplicación
- ❌ NO usar tu email personal en producción
- ❌ NO deshabilitar SSL/TLS en producción
- ❌ NO ignorar errores de certificado en producción

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir esta guía sigues teniendo problemas:

1. Revisa los logs del servidor
2. Verifica que todas las variables de entorno estén configuradas
3. Prueba con una cuenta de Gmail nueva
4. Consulta la documentación de Nodemailer: https://nodemailer.com/

---

## ✅ Checklist Final

Antes de considerar que todo está configurado correctamente:

- [ ] Verificación en 2 pasos habilitada (Gmail)
- [ ] Contraseña de aplicación generada y copiada
- [ ] Variables de entorno actualizadas en `.env.local`
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Endpoint `/api/init` responde correctamente
- [ ] Endpoint `/api/jobs/run` lista los jobs
- [ ] Job de prueba ejecutado manualmente con éxito
- [ ] Email de prueba recibido correctamente
- [ ] Logs del servidor muestran "[JOB]" y "Email enviado"

¡Listo! Tu sistema de emails está configurado correctamente. 🎉
