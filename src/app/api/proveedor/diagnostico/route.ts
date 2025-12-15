// src/app/api/proveedor/diagnostico/route.ts
// Endpoint de diagnóstico para verificar el flujo completo

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

export async function GET(request: NextRequest) {
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    pasos: []
  };

  try {
    // PASO 1: Verificar sesión
    diagnostico.pasos.push('1. Verificando sesión...');
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      diagnostico.error = 'No hay sesión activa';
      diagnostico.session = null;
      return NextResponse.json(diagnostico, { status: 401 });
    }

    diagnostico.session = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      empresaActual: session.user.empresaActual,
      empresasDisponibles: session.user.empresasDisponibles,
      proveedor: session.user.proveedor
    };
    diagnostico.pasos.push('✅ Sesión encontrada');

    // PASO 2: Verificar empresa actual
    diagnostico.pasos.push('2. Verificando empresa actual...');
    const empresaActual = session.user.empresaActual;

    if (!empresaActual) {
      diagnostico.error = 'No hay empresa seleccionada en la sesión';
      return NextResponse.json(diagnostico, { status: 400 });
    }

    diagnostico.empresaActual = empresaActual;
    diagnostico.pasos.push(`✅ Empresa actual: ${empresaActual}`);

    // PASO 3: Consultar mapping
    diagnostico.pasos.push('3. Consultando portal_proveedor_mapping...');
    const portalPool = await getPortalConnection();

    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), session.user.id)
      .input('empresaCode', sql.VarChar(50), empresaActual)
      .query(`
        SELECT
          id,
          portal_user_id,
          erp_proveedor_code,
          empresa_code,
          activo,
          created_at
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    diagnostico.mappingQuery = {
      userId: session.user.id,
      empresaCode: empresaActual,
      recordsFound: mappingResult.recordset.length
    };

    if (mappingResult.recordset.length === 0) {
      diagnostico.error = 'No se encontró mapping para esta empresa';
      diagnostico.pasos.push('❌ No hay mapping');
      return NextResponse.json(diagnostico, { status: 404 });
    }

    const mapping = mappingResult.recordset[0];
    diagnostico.mapping = mapping;
    diagnostico.pasos.push(`✅ Mapping encontrado: ${mapping.erp_proveedor_code}`);

    // PASO 4: Conectar al ERP
    diagnostico.pasos.push('4. Conectando al ERP...');
    let erpPool;

    try {
      erpPool = await getERPConnection(empresaActual);
      diagnostico.pasos.push('✅ Conexión ERP establecida');
    } catch (erpError: any) {
      diagnostico.error = 'Error conectando al ERP';
      diagnostico.erpError = erpError.message;
      diagnostico.pasos.push('❌ Error en conexión ERP');
      return NextResponse.json(diagnostico, { status: 500 });
    }

    // PASO 5: Consultar proveedor en ERP
    diagnostico.pasos.push('5. Consultando proveedor en ERP...');
    const proveedorResult = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), mapping.erp_proveedor_code)
      .query(`
        SELECT TOP 1
          Proveedor AS Codigo,
          Nombre AS RazonSocial,
          RFC,
          Direccion AS DireccionFiscal,
          Estatus
        FROM Prov
        WHERE Proveedor = @proveedorCode
          AND Estatus = 'ALTA'
      `);

    diagnostico.proveedorQuery = {
      proveedorCode: mapping.erp_proveedor_code,
      recordsFound: proveedorResult.recordset.length
    };

    if (proveedorResult.recordset.length === 0) {
      // Intentar sin filtro de estatus
      diagnostico.pasos.push('5b. Reintentando sin filtro de estatus...');
      const proveedorResult2 = await erpPool.request()
        .input('proveedorCode', sql.VarChar(20), mapping.erp_proveedor_code)
        .query(`
          SELECT TOP 1
            Proveedor AS Codigo,
            Nombre AS RazonSocial,
            RFC,
            Direccion AS DireccionFiscal,
            Estatus
          FROM Prov
          WHERE Proveedor = @proveedorCode
        `);

      diagnostico.proveedorQuery2 = {
        proveedorCode: mapping.erp_proveedor_code,
        recordsFound: proveedorResult2.recordset.length,
        data: proveedorResult2.recordset[0] || null
      };

      if (proveedorResult2.recordset.length === 0) {
        diagnostico.error = 'Proveedor no encontrado en el ERP';
        diagnostico.pasos.push('❌ Proveedor no existe en tabla Prov');
        return NextResponse.json(diagnostico, { status: 404 });
      } else {
        diagnostico.pasos.push(`✅ Proveedor encontrado (estatus: ${proveedorResult2.recordset[0].Estatus})`);
        diagnostico.proveedor = proveedorResult2.recordset[0];
      }
    } else {
      diagnostico.pasos.push('✅ Proveedor encontrado con estatus ALTA');
      diagnostico.proveedor = proveedorResult.recordset[0];
    }

    // PASO 6: Resumen final
    diagnostico.resultado = 'SUCCESS';
    diagnostico.pasos.push('✅ Diagnóstico completado exitosamente');

    return NextResponse.json(diagnostico);

  } catch (error: any) {
    diagnostico.error = 'Error durante diagnóstico';
    diagnostico.errorDetails = error.message;
    diagnostico.errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    diagnostico.pasos.push(`❌ Error: ${error.message}`);

    return NextResponse.json(diagnostico, { status: 500 });
  }
}
