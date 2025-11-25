// src/lib/email-templates/base.ts
// Template base para todos los emails

/**
 * Genera el HTML base para todos los emails
 */
export function getBaseTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>La Cantera</title>
  <style>
    /* Reset CSS */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }

    /* Estilos generales */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: #f4f4f4;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    /* Contenedor principal */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }

    /* Header */
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }

    .email-logo {
      font-size: 32px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      text-decoration: none;
    }

    /* Contenido */
    .email-content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }

    /* Footer */
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666666;
      font-size: 14px;
    }

    /* Botones */
    .btn {
      display: inline-block;
      padding: 14px 30px;
      margin: 20px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    }

    .btn-secondary {
      background: #6c757d;
    }

    .btn-success {
      background: #28a745;
    }

    .btn-danger {
      background: #dc3545;
    }

    .btn-warning {
      background: #ffc107;
      color: #212529 !important;
    }

    /* Cards */
    .card {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    /* Tabla de datos */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .data-table th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #dee2e6;
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
    }

    /* Alertas */
    .alert {
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .alert-info {
      background-color: #d1ecf1;
      border-color: #17a2b8;
      color: #0c5460;
    }

    .alert-success {
      background-color: #d4edda;
      border-color: #28a745;
      color: #155724;
    }

    .alert-warning {
      background-color: #fff3cd;
      border-color: #ffc107;
      color: #856404;
    }

    .alert-danger {
      background-color: #f8d7da;
      border-color: #dc3545;
      color: #721c24;
    }

    /* Divider */
    .divider {
      border: 0;
      border-top: 1px solid #dee2e6;
      margin: 30px 0;
    }

    /* Texto */
    h1 {
      font-size: 28px;
      margin: 0 0 20px 0;
      color: #333333;
    }

    h2 {
      font-size: 24px;
      margin: 30px 0 15px 0;
      color: #333333;
    }

    h3 {
      font-size: 20px;
      margin: 20px 0 10px 0;
      color: #333333;
    }

    p {
      margin: 0 0 15px 0;
    }

    .text-muted {
      color: #6c757d;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }

      .email-content {
        padding: 20px !important;
      }

      .btn {
        display: block;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `
  <!-- Preheader text (oculto, solo para vista previa en clientes de email) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>
  ` : ''}

  <!-- Contenedor principal -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container">

          <!-- Header -->
          <tr>
            <td class="email-header">
              <h1 class="email-logo">🏗️ La Cantera</h1>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td class="email-content">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0 0 10px 0;">
                <strong>La Cantera</strong><br>
                Sistema de Gestión de Proveedores
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Este es un correo automático, por favor no responder.<br>
                Si tienes alguna duda, contacta a soporte@lacantera.com
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px;">
                <a href="[UNSUBSCRIBE_URL]" style="color: #666666;">Cancelar suscripción</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Genera un botón de acción
 */
export function getButton(text: string, url: string, type: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' = 'primary'): string {
  const className = type === 'primary' ? 'btn' : `btn btn-${type}`;
  return `<a href="${url}" class="${className}" style="color: #ffffff !important; text-decoration: none;">${text}</a>`;
}

/**
 * Genera una alerta
 */
export function getAlert(message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): string {
  return `<div class="alert alert-${type}">${message}</div>`;
}

/**
 * Genera una tarjeta
 */
export function getCard(content: string): string {
  return `<div class="card">${content}</div>`;
}

/**
 * Genera un divisor
 */
export function getDivider(): string {
  return `<hr class="divider">`;
}
