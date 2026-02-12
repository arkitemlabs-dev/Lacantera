import { NextResponse } from 'next/server';

// Endpoint temporal para eliminar proveedor 6 del portal
// DELETE /api/debug/cleanup-proveedor
export async function DELETE() {
  try {
    const { hybridDB } = await import('@/lib/database/multi-tenant-connection');
    const results: string[] = [];

    // 1. Eliminar de portal_proveedor_mapping
    try {
      const r = await hybridDB.queryPortal(`
        DELETE FROM portal_proveedor_mapping WHERE portal_user_id = '6'
      `);
      results.push(`portal_proveedor_mapping: ${r.rowsAffected?.[0] || 0} eliminados`);
    } catch (e: any) { results.push(`portal_proveedor_mapping: error - ${e.message}`); }

    // 2. Eliminar de WebUsuario (por UsuarioWeb = '6' o email)
    try {
      const r = await hybridDB.queryPortal(`
        DELETE FROM WebUsuario WHERE UsuarioWeb = '6' OR eMail = 'lmontero@arkitem.com'
      `);
      results.push(`WebUsuario: ${r.rowsAffected?.[0] || 0} eliminados`);
    } catch (e: any) { results.push(`WebUsuario: error - ${e.message}`); }

    // 3. Eliminar password de pNetUsuarioPassword
    try {
      const r = await hybridDB.queryPortal(`
        DELETE FROM pNetUsuarioPassword WHERE IDUsuario = 6
      `);
      results.push(`pNetUsuarioPassword: ${r.rowsAffected?.[0] || 0} eliminados`);
    } catch (e: any) { results.push(`pNetUsuarioPassword: error - ${e.message}`); }

    // 4. Eliminar de pNetUsuario
    try {
      const r = await hybridDB.queryPortal(`
        DELETE FROM pNetUsuario WHERE IDUsuario = 6
      `);
      results.push(`pNetUsuario: ${r.rowsAffected?.[0] || 0} eliminados`);
    } catch (e: any) { results.push(`pNetUsuario: error - ${e.message}`); }

    // 5. Eliminar PROV003 de Prov (si existe - fue creado durante registro)
    try {
      const r = await hybridDB.queryPortal(`
        DELETE FROM Prov WHERE Proveedor = 'PROV003'
      `);
      results.push(`Prov (PROV003): ${r.rowsAffected?.[0] || 0} eliminados`);
    } catch (e: any) { results.push(`Prov: error - ${e.message}`); }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
