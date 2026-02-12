
import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { ERP_DATABASES, validateEmpresaCode } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * POST /api/auth/verify-rfc
 * Endpoint PÚBLICO para verificar si un RFC existe en el ERP de una empresa específica.
 * Usado durante el registro para clasificar al usuario.
 */
export async function POST(request: NextRequest) {
  try {
    const { rfc, empresaCode } = await request.json();

    if (!rfc || !empresaCode) {
      return NextResponse.json({ error: 'RFC y Empresa son requeridos' }, { status: 400 });
    }

    let numericCode: string;
    try {
      numericCode = validateEmpresaCode(empresaCode);
    } catch {
      return NextResponse.json({ error: 'Empresa no válida' }, { status: 400 });
    }

    const dbConfig = ERP_DATABASES[numericCode];

    // Buscar RFC en ERP
    const erpPool = await getERPConnection(numericCode);
    const rfcResult = await erpPool
      .request()
      .input('rfc', sql.VarChar(15), rfc.toUpperCase())
      .query('SELECT Proveedor, Nombre, RFC, Estatus FROM Prov WHERE RFC = @rfc');

    if (rfcResult.recordset.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: `El RFC ${rfc} no se encontró en la base de datos de ${dbConfig.nombre}.`,
        isProvider: false 
      });
    }

    const proveedor = rfcResult.recordset[0];

    return NextResponse.json({
      success: true,
      isProvider: true,
      message: 'Proveedor validado correctamente.',
      data: {
        codigo: proveedor.Proveedor,
        nombre: proveedor.Nombre,
        rfc: proveedor.RFC,
        estatus: proveedor.Estatus
      }
    });

  } catch (error: any) {
    console.error('[VERIFY-RFC] Error:', error);
    return NextResponse.json({ error: 'Error al verificar RFC' }, { status: 500 });
  }
}
