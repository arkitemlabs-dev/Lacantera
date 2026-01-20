// src/app/api/admin/configuracion/route.ts
// API para gestionar la configuración de la empresa

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

// Configuración de conexión
const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  server: process.env.MSSQL_SERVER!,
  database: 'PP',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
};

/**
 * GET /api/admin/configuracion
 * Obtiene la configuración de la empresa
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo super-admin o admin puede ver configuración
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener empresa del query o usar default
    const { searchParams } = new URL(request.url);
    const empresaCode = searchParams.get('empresa') || 'CANTERA';

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('empresaCode', sql.VarChar(50), empresaCode)
      .query(`
        SELECT
          empresa_code,
          nombre_empresa,
          rfc,
          direccion_fiscal,
          logo_url,
          logo_nombre,
          idioma,
          zona_horaria,
          moneda,
          formato_fecha,
          formato_numeros,
          updated_at
        FROM configuracion_empresa
        WHERE empresa_code = @empresaCode
      `);

    await pool.close();

    if (result.recordset.length === 0) {
      // Retornar configuración por defecto si no existe
      return NextResponse.json({
        success: true,
        data: {
          empresaCode,
          nombreEmpresa: 'Mi Empresa',
          rfc: '',
          direccionFiscal: '',
          logoUrl: null,
          logoNombre: null,
          idioma: 'es',
          zonaHoraria: 'America/Mexico_City',
          moneda: 'MXN',
          formatoFecha: 'DD/MM/YYYY',
          formatoNumeros: 'comma',
        },
        isDefault: true,
      });
    }

    const config = result.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        empresaCode: config.empresa_code,
        nombreEmpresa: config.nombre_empresa,
        rfc: config.rfc || '',
        direccionFiscal: config.direccion_fiscal || '',
        logoUrl: config.logo_url,
        logoNombre: config.logo_nombre,
        idioma: config.idioma || 'es',
        zonaHoraria: config.zona_horaria || 'America/Mexico_City',
        moneda: config.moneda || 'MXN',
        formatoFecha: config.formato_fecha || 'DD/MM/YYYY',
        formatoNumeros: config.formato_numeros || 'comma',
        updatedAt: config.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[API CONFIGURACION] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/configuracion
 * Crea o actualiza la configuración de la empresa
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      empresaCode = 'CANTERA',
      nombreEmpresa,
      rfc,
      direccionFiscal,
      logoUrl,
      logoNombre,
      idioma,
      zonaHoraria,
      moneda,
      formatoFecha,
      formatoNumeros,
    } = body;

    // Validaciones
    if (!nombreEmpresa) {
      return NextResponse.json(
        { success: false, error: 'El nombre de la empresa es requerido' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Verificar si ya existe configuración para esta empresa
    const existing = await pool.request()
      .input('empresaCode', sql.VarChar(50), empresaCode)
      .query('SELECT id FROM configuracion_empresa WHERE empresa_code = @empresaCode');

    if (existing.recordset.length > 0) {
      // Actualizar
      await pool.request()
        .input('empresaCode', sql.VarChar(50), empresaCode)
        .input('nombreEmpresa', sql.NVarChar(250), nombreEmpresa)
        .input('rfc', sql.VarChar(13), rfc || null)
        .input('direccionFiscal', sql.NVarChar(500), direccionFiscal || null)
        .input('logoUrl', sql.VarChar(500), logoUrl || null)
        .input('logoNombre', sql.VarChar(255), logoNombre || null)
        .input('idioma', sql.VarChar(10), idioma || 'es')
        .input('zonaHoraria', sql.VarChar(50), zonaHoraria || 'America/Mexico_City')
        .input('moneda', sql.VarChar(3), moneda || 'MXN')
        .input('formatoFecha', sql.VarChar(20), formatoFecha || 'DD/MM/YYYY')
        .input('formatoNumeros', sql.VarChar(20), formatoNumeros || 'comma')
        .input('updatedBy', sql.NVarChar(50), session.user.email)
        .query(`
          UPDATE configuracion_empresa SET
            nombre_empresa = @nombreEmpresa,
            rfc = @rfc,
            direccion_fiscal = @direccionFiscal,
            logo_url = @logoUrl,
            logo_nombre = @logoNombre,
            idioma = @idioma,
            zona_horaria = @zonaHoraria,
            moneda = @moneda,
            formato_fecha = @formatoFecha,
            formato_numeros = @formatoNumeros,
            updated_at = GETDATE(),
            updated_by = @updatedBy
          WHERE empresa_code = @empresaCode
        `);
    } else {
      // Insertar
      await pool.request()
        .input('empresaCode', sql.VarChar(50), empresaCode)
        .input('nombreEmpresa', sql.NVarChar(250), nombreEmpresa)
        .input('rfc', sql.VarChar(13), rfc || null)
        .input('direccionFiscal', sql.NVarChar(500), direccionFiscal || null)
        .input('logoUrl', sql.VarChar(500), logoUrl || null)
        .input('logoNombre', sql.VarChar(255), logoNombre || null)
        .input('idioma', sql.VarChar(10), idioma || 'es')
        .input('zonaHoraria', sql.VarChar(50), zonaHoraria || 'America/Mexico_City')
        .input('moneda', sql.VarChar(3), moneda || 'MXN')
        .input('formatoFecha', sql.VarChar(20), formatoFecha || 'DD/MM/YYYY')
        .input('formatoNumeros', sql.VarChar(20), formatoNumeros || 'comma')
        .input('createdBy', sql.NVarChar(50), session.user.email)
        .query(`
          INSERT INTO configuracion_empresa (
            empresa_code, nombre_empresa, rfc, direccion_fiscal,
            logo_url, logo_nombre, idioma, zona_horaria, moneda,
            formato_fecha, formato_numeros, created_by, updated_by
          ) VALUES (
            @empresaCode, @nombreEmpresa, @rfc, @direccionFiscal,
            @logoUrl, @logoNombre, @idioma, @zonaHoraria, @moneda,
            @formatoFecha, @formatoNumeros, @createdBy, @createdBy
          )
        `);
    }

    await pool.close();

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
    });
  } catch (error: any) {
    console.error('[API CONFIGURACION] Error guardando:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
