// src/app/api/verify-smtp/route.ts
// Endpoint para verificar configuración SMTP (solo desarrollo)

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(request: NextRequest) {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible en produccion' }, { status: 403 });
  }

  try {
    console.log('🔍 Verificando configuracion SMTP...');
    console.log('   Host:', process.env.SMTP_HOST);
    console.log('   Port:', process.env.SMTP_PORT);
    console.log('   Secure:', process.env.SMTP_SECURE);
    console.log('   User:', process.env.SMTP_USER);

    const isConfigured =
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_HOST;

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Configuracion SMTP incompleta',
        config: {
          host: process.env.SMTP_HOST || 'NO CONFIGURADO',
          port: process.env.SMTP_PORT || 'NO CONFIGURADO',
          user: process.env.SMTP_USER ? '✓ Configurado' : 'NO CONFIGURADO',
          password: process.env.SMTP_PASSWORD ? '✓ Configurado' : 'NO CONFIGURADO',
        }
      });
    }

    // Crear transporter con configuración detallada
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // Opciones adicionales para debug
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false // Permitir certificados auto-firmados
      }
    });

    // Intentar conexión
    console.log('🔌 Intentando conexion...');
    await transporter.verify();
    console.log('✅ Conexion exitosa!');

    return NextResponse.json({
      success: true,
      message: '✅ Conexion SMTP exitosa! El sistema puede enviar emails.',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      }
    });

  } catch (error: any) {
    console.error('❌ Error verificando SMTP:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      errorResponse: error.response,
      hint: 'Posibles causas: credenciales incorrectas, host/puerto incorrecto, o firewall bloqueando conexion',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
      }
    }, { status: 500 });
  }
}
