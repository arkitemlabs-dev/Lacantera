// src/lib/email-templates/examples.ts
// Ejemplos de uso del sistema de email

import { sendEmail } from '../email-service';
import {
  getWelcomeEmail,
  getInvitationEmail,
  getFacturaRecibidaEmail,
  getFacturaAprobadaEmail,
  getPagoRealizadoEmail,
  getComplementoDisponibleEmail,
  getMensajeNuevoEmail,
  getResumenSemanalEmail,
  getRecuperarPasswordEmail,
} from './index';

// ==================== EJEMPLOS DE USO ====================

/**
 * Ejemplo 1: Enviar email de bienvenida a un nuevo proveedor
 */
export async function ejemploBienvenida() {
  const emailHtml = getWelcomeEmail({
    nombreProveedor: "Constructora Ejemplo S.A. de C.V.",
    nombreContacto: "Juan Pérez García",
    email: "juan.perez@constructora-ejemplo.com",
    empresaCliente: "La Cantera - Materiales de Construcción",
    loginUrl: "https://lacantera.com/login"
  });

  const result = await sendEmail({
    to: "juan.perez@constructora-ejemplo.com",
    subject: "¡Bienvenido a La Cantera! 🎉",
    html: emailHtml
  });

  console.log('Email de bienvenida enviado:', result.success);
  return result;
}

/**
 * Ejemplo 2: Invitar a un proveedor
 */
export async function ejemploInvitacion() {
  const emailHtml = getInvitationEmail({
    nombreProveedor: "Aceros del Norte",
    nombreContacto: "María Rodríguez",
    empresaCliente: "La Cantera",
    mensajePersonalizado: "Queremos invitarte a formar parte de nuestra red de proveedores de confianza. Tu empresa tiene un excelente historial y creemos que podemos tener una gran relación comercial.",
    registroUrl: "https://lacantera.com/registro?invite=ABC123"
  });

  await sendEmail({
    to: "maria@acerosdelnorte.com",
    subject: "Invitación para unirte a La Cantera",
    html: emailHtml
  });
}

/**
 * Ejemplo 3: Notificar recepción de factura
 */
export async function ejemploFacturaRecibida() {
  const emailHtml = getFacturaRecibidaEmail({
    nombreProveedor: "Ferretería Los Pinos",
    nombreContacto: "Carlos Sánchez",
    empresaCliente: "La Cantera",
    folioFactura: "F-2024-001234",
    uuid: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
    total: 125450.50,
    fechaRecepcion: new Date(),
    facturaUrl: "https://lacantera.com/facturas/12345"
  });

  await sendEmail({
    to: "carlos@ferreterialospinos.com",
    subject: "Factura F-2024-001234 Recibida ✅",
    html: emailHtml
  });
}

/**
 * Ejemplo 4: Notificar aprobación de factura
 */
export async function ejemploFacturaAprobada() {
  const emailHtml = getFacturaAprobadaEmail({
    nombreProveedor: "Maderas y Tableros del Sur",
    nombreContacto: "Ana López",
    empresaCliente: "La Cantera",
    folioFactura: "F-2024-001235",
    uuid: "A1B2C3D4-E5F6-7890-ABCD-EF1234567891",
    total: 89750.00,
    fechaPagoEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    ordenCompraRelacionada: "OC-2024-00456",
    facturaUrl: "https://lacantera.com/facturas/12346"
  });

  await sendEmail({
    to: "ana@maderasytableros.com",
    subject: "¡Factura F-2024-001235 Aprobada! 🎉",
    html: emailHtml
  });
}

/**
 * Ejemplo 5: Notificar pago realizado con complemento
 */
export async function ejemploPagoRealizado() {
  const emailHtml = getPagoRealizadoEmail({
    nombreProveedor: "Cemento y Agregados SA",
    nombreContacto: "Roberto Martínez",
    empresaCliente: "La Cantera",
    facturas: [
      {
        folio: "F-2024-001100",
        uuid: "A1B2C3D4-E5F6-7890-ABCD-EF1234567892",
        monto: 45000.00
      },
      {
        folio: "F-2024-001101",
        uuid: "A1B2C3D4-E5F6-7890-ABCD-EF1234567893",
        monto: 38500.00
      }
    ],
    montoTotal: 83500.00,
    fechaPago: new Date(),
    metodoPago: "Transferencia Bancaria",
    referencia: "REF-2024-12345",
    uuidComplemento: "C1D2E3F4-G5H6-7890-IJKL-MN1234567894",
    complementoUrl: "https://lacantera.com/complementos/789",
    pagoUrl: "https://lacantera.com/pagos/456"
  });

  await sendEmail({
    to: "roberto@cementoyagregados.com",
    subject: "¡Pago Realizado! REF-2024-12345 💰",
    html: emailHtml
  });
}

/**
 * Ejemplo 6: Notificar complemento de pago disponible
 */
export async function ejemploComplementoDisponible() {
  const emailHtml = getComplementoDisponibleEmail({
    nombreProveedor: "Pinturas y Recubrimientos SA",
    nombreContacto: "Laura Hernández",
    empresaCliente: "La Cantera",
    folioComplemento: "CP-2024-00789",
    uuidComplemento: "D1E2F3G4-H5I6-7890-JKLM-NO1234567895",
    fechaEmision: new Date(),
    montoTotal: 156800.00,
    facturasRelacionadas: 3,
    complementoUrl: "https://lacantera.com/complementos/790",
    xmlUrl: "https://lacantera.com/complementos/790/download/xml",
    pdfUrl: "https://lacantera.com/complementos/790/download/pdf"
  });

  await sendEmail({
    to: "laura@pinturasrecubrimientos.com",
    subject: "Complemento de Pago Disponible 📄",
    html: emailHtml
  });
}

/**
 * Ejemplo 7: Notificar nuevo mensaje
 */
export async function ejemploMensajeNuevo() {
  const emailHtml = getMensajeNuevoEmail({
    nombreDestinatario: "Jorge Ramírez",
    nombreRemitente: "Departamento de Compras - La Cantera",
    empresaOrigen: "La Cantera",
    asunto: "Consulta sobre Orden de Compra OC-2024-00789",
    mensaje: "Buenos días Jorge,\n\nNecesitamos confirmar la fecha de entrega para la OC-2024-00789. ¿Podrías proporcionarnos una actualización?\n\nQuedamos atentos.\n\nSaludos,\nEquipo de Compras",
    fechaEnvio: new Date(),
    mensajesUrl: "https://lacantera.com/mensajes"
  });

  await sendEmail({
    to: "jorge@proveedor.com",
    subject: "Nuevo Mensaje: Consulta sobre Orden de Compra",
    html: emailHtml
  });
}

/**
 * Ejemplo 8: Resumen semanal
 */
export async function ejemploResumenSemanal() {
  const emailHtml = getResumenSemanalEmail({
    nombreProveedor: "Materiales Industriales del Centro",
    nombreContacto: "Patricia González",
    semana: "13-19 de Noviembre 2024",
    estadisticas: {
      facturasSubidas: 5,
      facturasAprobadas: 4,
      facturasRechazadas: 0,
      facturasPendientes: 1,
      montoPagado: 234500.00,
      montoProximoPago: 156800.00
    },
    proximosPagos: [
      {
        fecha: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        monto: 156800.00,
        facturas: 2
      },
      {
        fecha: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        monto: 89400.00,
        facturas: 1
      }
    ],
    dashboardUrl: "https://lacantera.com/dashboard"
  });

  await sendEmail({
    to: "patricia@materialesindustriales.com",
    subject: "Tu Resumen Semanal - La Cantera 📊",
    html: emailHtml
  });
}

/**
 * Ejemplo 9: Recuperar contraseña
 */
export async function ejemploRecuperarPassword() {
  const emailHtml = getRecuperarPasswordEmail({
    nombreUsuario: "Miguel Torres",
    email: "miguel@empresa.com",
    resetUrl: "https://lacantera.com/reset-password?token=ABC123XYZ789",
    expiraEn: 60, // minutos
    ipAddress: "192.168.1.100"
  });

  await sendEmail({
    to: "miguel@empresa.com",
    subject: "Recuperar Contraseña - La Cantera 🔑",
    html: emailHtml
  });
}

/**
 * Ejemplo 10: Email con adjuntos (complemento de pago)
 */
export async function ejemploEmailConAdjuntos() {
  const emailHtml = getComplementoDisponibleEmail({
    nombreProveedor: "Electricidad y Luminarias SA",
    nombreContacto: "Fernando Castro",
    empresaCliente: "La Cantera",
    folioComplemento: "CP-2024-00800",
    uuidComplemento: "E1F2G3H4-I5J6-7890-KLMN-OP1234567896",
    fechaEmision: new Date(),
    montoTotal: 278900.00,
    facturasRelacionadas: 4,
    complementoUrl: "https://lacantera.com/complementos/800",
    xmlUrl: "https://lacantera.com/complementos/800/download/xml",
    pdfUrl: "https://lacantera.com/complementos/800/download/pdf"
  });

  // Ejemplo con archivos adjuntos
  await sendEmail({
    to: "fernando@electricidadyluminarias.com",
    subject: "Complemento de Pago CP-2024-00800",
    html: emailHtml,
    attachments: [
      {
        filename: "CP-2024-00800.xml",
        content: Buffer.from('<xml>ejemplo</xml>', 'utf-8'),
        contentType: "application/xml"
      },
      {
        filename: "CP-2024-00800.pdf",
        path: "/ruta/al/archivo/complemento.pdf"
      }
    ]
  });
}

/**
 * Ejemplo 11: Enviar a múltiples destinatarios
 */
export async function ejemploMultiplesDestinatarios() {
  const emailHtml = getInvitationEmail({
    nombreProveedor: "Tu Empresa",
    nombreContacto: "Equipo",
    empresaCliente: "La Cantera",
    registroUrl: "https://lacantera.com/registro"
  });

  await sendEmail({
    to: [
      "contacto1@empresa.com",
      "contacto2@empresa.com",
      "contacto3@empresa.com"
    ],
    cc: "supervisor@lacantera.com",
    bcc: "admin@lacantera.com",
    subject: "Invitación a La Cantera",
    html: emailHtml
  });
}

// ==================== FUNCIÓN PARA EJECUTAR TODOS LOS EJEMPLOS ====================

/**
 * Ejecuta todos los ejemplos (solo para testing)
 * NOTA: Esto enviará múltiples emails. Usar solo en desarrollo.
 */
export async function ejecutarTodosLosEjemplos() {
  console.log('⚠️  ADVERTENCIA: Esto enviará múltiples emails de prueba');
  console.log('Solo ejecutar en modo desarrollo\n');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ No ejecutar en producción');
    return;
  }

  const ejemplos = [
    { nombre: 'Bienvenida', fn: ejemploBienvenida },
    { nombre: 'Invitación', fn: ejemploInvitacion },
    { nombre: 'Factura Recibida', fn: ejemploFacturaRecibida },
    { nombre: 'Factura Aprobada', fn: ejemploFacturaAprobada },
    { nombre: 'Pago Realizado', fn: ejemploPagoRealizado },
    { nombre: 'Complemento Disponible', fn: ejemploComplementoDisponible },
    { nombre: 'Mensaje Nuevo', fn: ejemploMensajeNuevo },
    { nombre: 'Resumen Semanal', fn: ejemploResumenSemanal },
    { nombre: 'Recuperar Password', fn: ejemploRecuperarPassword },
  ];

  for (const ejemplo of ejemplos) {
    console.log(`\n📧 Enviando ejemplo: ${ejemplo.nombre}...`);
    try {
      await ejemplo.fn();
      console.log(`✅ ${ejemplo.nombre} enviado`);
    } catch (error) {
      console.error(`❌ Error en ${ejemplo.nombre}:`, error);
    }

    // Esperar 1 segundo entre emails
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Todos los ejemplos enviados');
  console.log('En modo desarrollo, revisa la consola para ver las URLs de Ethereal Email');
}

// ==================== EXPORTAR ====================

export default {
  ejemploBienvenida,
  ejemploInvitacion,
  ejemploFacturaRecibida,
  ejemploFacturaAprobada,
  ejemploPagoRealizado,
  ejemploComplementoDisponible,
  ejemploMensajeNuevo,
  ejemploResumenSemanal,
  ejemploRecuperarPassword,
  ejemploEmailConAdjuntos,
  ejemploMultiplesDestinatarios,
  ejecutarTodosLosEjemplos,
};
