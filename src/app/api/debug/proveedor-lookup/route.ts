import { NextResponse } from 'next/server';

// Endpoint temporal de diagnóstico - verifica vínculo portal↔ERP
// GET /api/debug/proveedor-lookup
export async function GET() {
  try {
    const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

    // 1. Todos los proveedores del portal (pNetUsuario tipo 4)
    const portalProveedores = await hybridDB.queryPortal(`
      SELECT IDUsuario, Nombre, eMail, Usuario, Estatus
      FROM pNetUsuario WHERE IDUsuarioTipo = 4
    `);

    // 2. Buscar los códigos PROV001/002/003 en la tabla Prov del ERP
    const provCodes = (portalProveedores.recordset || []).map((p: any) => `'${p.Usuario}'`).join(',');
    let erpPorCodigo: any[] = [];
    if (provCodes) {
      const erpResult = await hybridDB.queryERP('la-cantera', `
        SELECT Proveedor, Nombre, RFC, Estatus FROM Prov WHERE Proveedor IN (${provCodes})
      `);
      erpPorCodigo = erpResult.recordset || [];
    }

    // 3. Buscar P00443 directamente en ERP
    const erpP00443 = await hybridDB.queryERP('la-cantera', `
      SELECT Proveedor, Nombre, RFC, Estatus FROM Prov WHERE Proveedor = 'P00443'
    `);

    // 4. portal_proveedor_mapping
    let mappings: any[] = [];
    try {
      const mappingResult = await hybridDB.queryPortal(`
        SELECT * FROM portal_proveedor_mapping
      `);
      mappings = mappingResult.recordset || [];
    } catch (e: any) {
      mappings = [{ error: e.message }];
    }

    // 5. Si PROV003 tiene RFC, buscar ese RFC en ERP para ver si coincide con P00443
    let rfcMatch: any = null;
    const prov003erp = erpPorCodigo.find((p: any) => p.Proveedor === 'PROV003');
    if (prov003erp?.RFC) {
      const rfcResult = await hybridDB.queryERP('la-cantera', `
        SELECT Proveedor, Nombre, RFC, Estatus FROM Prov WHERE RFC = '${prov003erp.RFC}' AND Proveedor != 'PROV003'
      `);
      rfcMatch = {
        rfcBuscado: prov003erp.RFC,
        resultados: rfcResult.recordset || []
      };
    }

    return NextResponse.json({
      portalProveedores: portalProveedores.recordset || [],
      erpPorCodigoPortal: erpPorCodigo,
      erpP00443: erpP00443.recordset || [],
      portalProveedorMapping: mappings,
      rfcMatchPROV003: rfcMatch,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
