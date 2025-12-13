// src/app/api/proveedor/info/route.ts
// Endpoint para obtener información del proveedor desde el ERP

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * GET /api/proveedor/info
 *
 * Obtiene información del proveedor desde el ERP de la empresa actual
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/proveedor/info] Iniciando...');

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const empresaActual = session.user.empresaActual;

    console.log(`📍 Usuario: ${userId}, Empresa: ${empresaActual}`);

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada'
      }, { status: 400 });
    }

    // 2. Obtener el mapping para saber qué código de proveedor usar en el ERP
    const portalPool = await getPortalConnection();

    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaActual)
      .query(`
        SELECT
          erp_proveedor_code,
          empresa_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    if (mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró mapping para esta empresa'
      }, { status: 404 });
    }

    const mapping = mappingResult.recordset[0];
    const erp_proveedor_code = mapping.erp_proveedor_code;

    console.log(`📍 Código proveedor en ERP: ${erp_proveedor_code}`);

    // 3. Conectar al ERP de la empresa y obtener datos del proveedor
    const erpPool = await getERPConnection(empresaActual);

    const proveedorResult = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), erp_proveedor_code)
      .query(`
        SELECT TOP 1
          Proveedor AS Codigo,
          Nombre AS RazonSocial,
          RFC,
          Direccion AS DireccionFiscal,
          Contacto1 AS NombreContacto,
          eMail1 AS Email,
          Telefonos AS Telefono,
          Estatus,
          CuentaBancaria AS NumeroCuenta
        FROM Prov
        WHERE Proveedor = @proveedorCode
          AND Estatus = 'ALTA'
      `);

    if (proveedorResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proveedor no encontrado en el ERP'
      }, { status: 404 });
    }

    const proveedor = proveedorResult.recordset[0];

    console.log(`✅ Proveedor encontrado: ${proveedor.RazonSocial}`);

    // 4. Retornar datos
    return NextResponse.json({
      success: true,
      data: {
        // Datos fiscales
        razonSocial: proveedor.RazonSocial,
        rfc: proveedor.RFC,
        direccionFiscal: proveedor.DireccionFiscal,
        codigo: proveedor.Codigo,
        estatus: proveedor.Estatus,

        // Datos de contacto
        nombreContacto: proveedor.NombreContacto,
        email: proveedor.Email,
        telefono: proveedor.Telefonos,

        // Información bancaria
        numeroCuenta: proveedor.NumeroCuenta,
        clabe: proveedor.CLABE,

        // Contexto
        empresaActual: empresaActual,
        codigoProveedorERP: erp_proveedor_code
      }
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/info] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo información del proveedor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
