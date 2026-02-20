// src/app/api/auth/empresas-proveedor/route.ts
// Llama CNspEmpresasDelProveedor para obtener las empresas a las que pertenece un RFC.
// Usado en: login (popula dropdown empresa) y registro (verifica RFC + obtiene empresas).

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { ERP_DATABASES } from '@/lib/database/tenant-configs';

/**
 * Intenta mapear una fila del SP al código portal (01-10).
 * El SP devuelve algún identificador de empresa; probamos varias columnas posibles.
 */
function mapToPortalCode(row: any, ambiente: string): string | null {
  const isTest = ambiente === 'Pruebas';
  const allowedCodes = isTest
    ? ['06', '07', '08', '09', '10']
    : ['01', '02', '03', '04', '05'];

  // Candidato: columna que devuelva el SP (probamos nombres comunes de Intelisis)
  const erpEmpresa = String(
    row.Empresa ?? row.EmpresaCodigo ?? row.IDEmpresa ?? row.CveEmpresa ?? ''
  ).trim();

  // 1. Si ya es un código portal directo (01-10)
  if (allowedCodes.includes(erpEmpresa)) return erpEmpresa;

  // 2. Buscar por @Empresa interno + nombre de BD (combinación única)
  const dbName = String(row.BaseDatos ?? row.Database ?? row.NombreBase ?? '').trim();
  for (const code of allowedCodes) {
    const config = ERP_DATABASES[code];
    const empresaMatch = config.empresa === erpEmpresa;
    const dbMatch = !dbName || config.db.toLowerCase() === dbName.toLowerCase();
    if (empresaMatch && dbMatch) return code;
  }

  // 3. Si no hay DB en la fila, empatar solo por @Empresa (primer match en rango)
  if (!dbName) {
    for (const code of allowedCodes) {
      if (ERP_DATABASES[code].empresa === erpEmpresa) return code;
    }
  }

  // 4. Empatar por nombre de empresa (fallback)
  const nombre = String(row.NombreEmpresa ?? row.RazonSocial ?? row.Nombre ?? '').trim();
  if (nombre) {
    for (const code of allowedCodes) {
      if (ERP_DATABASES[code].nombre.toLowerCase() === nombre.toLowerCase()) return code;
    }
  }

  return null;
}

/**
 * GET /api/auth/empresas-proveedor?rfc=XXX[&ambiente=Produccion|Pruebas]
 *
 * Devuelve las empresas a las que pertenece el RFC según CNspEmpresasDelProveedor.
 * Respuesta: { success, empresas: [{ codigoPortal, codigoERP, nombre, nombreProveedor }], rfcNombre }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfc = searchParams.get('rfc')?.toUpperCase().trim() ?? '';
    const ambiente = searchParams.get('ambiente') ?? 'Produccion';

    if (rfc.length < 12) {
      return NextResponse.json(
        { success: false, error: 'RFC inválido (mínimo 12 caracteres)', empresas: [] },
        { status: 400 }
      );
    }

    if (ambiente !== 'Produccion' && ambiente !== 'Pruebas') {
      return NextResponse.json(
        { success: false, error: 'Ambiente inválido. Use Produccion o Pruebas', empresas: [] },
        { status: 400 }
      );
    }

    // Conectar a la empresa "principal" del ambiente para ejecutar el SP
    // Por ahora forzamos ambiente de pruebas (06). Cambiar a '01' cuando se active producción.
    const empresaConexion = ambiente === 'Pruebas' ? '06' : '06';
    const pool = await getERPConnection(empresaConexion);

    console.log(`[CNspEmpresasDelProveedor] RFC=${rfc} Ambiente=${ambiente}`);

    const result = await pool
      .request()
      .input('Rfc', sql.VarChar(20), rfc)
      .input('Ambiente', sql.VarChar(20), ambiente)
      .execute('CNspEmpresasDelProveedor');

    const rows: any[] = result.recordset ?? [];

    // Log de columnas devueltas por el SP (ayuda a ajustar mapToPortalCode si es necesario)
    if (rows.length > 0) {
      console.log('[CNspEmpresasDelProveedor] Columnas:', Object.keys(rows[0]));
      console.log('[CNspEmpresasDelProveedor] Primera fila:', rows[0]);
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'RFC no encontrado como proveedor en ninguna empresa',
        empresas: [],
      });
    }

    const rfcNombre: string =
      rows[0]?.NombreProveedor ??
      rows[0]?.RazonSocialProveedor ??
      rows[0]?.NombreProv ??
      '';

    const empresas = rows
      .map((row) => {
        const codigoPortal = mapToPortalCode(row, ambiente);
        const codigoERP = String(
          row.Empresa ?? row.EmpresaCodigo ?? row.IDEmpresa ?? row.CveEmpresa ?? ''
        ).trim();
        const nombre =
          codigoPortal
            ? ERP_DATABASES[codigoPortal]?.nombre
            : String(row.NombreEmpresa ?? row.RazonSocial ?? codigoERP);

        return { codigoPortal, codigoERP, nombre };
      })
      .filter((e) => e.codigoPortal !== null) as {
        codigoPortal: string;
        codigoERP: string;
        nombre: string;
      }[];

    if (empresas.length === 0) {
      // El SP devolvió filas pero no pudimos mapear ninguna — devolvemos los datos crudos
      // para que el admin pueda diagnosticar en logs
      console.warn('[CNspEmpresasDelProveedor] No se pudo mapear ninguna empresa. Filas crudas:', rows);
      return NextResponse.json({
        success: false,
        error: 'No se pudo determinar las empresas del portal para este RFC',
        empresas: [],
      });
    }

    return NextResponse.json({ success: true, empresas, rfcNombre });
  } catch (error: any) {
    console.error('[CNspEmpresasDelProveedor] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, empresas: [] },
      { status: 500 }
    );
  }
}
