// src/app/api/admin/cleanup-user/route.ts
// Endpoint temporal para limpiar registros de un usuario por email
// ELIMINAR DESPUÉS DE USAR

import { NextRequest, NextResponse } from 'next/server';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getConnection } from '@/lib/sql-connection';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Parámetro email requerido' }, { status: 400 });
  }

  try {
    const portalPool = await getPortalConnection();
    const legacyPool = await getConnection();

    // 1. Buscar en WebUsuario
    const webUser = await portalPool.request()
      .query(`SELECT UsuarioWeb, Nombre, eMail, Rol, Estatus, Proveedor, Empresa FROM WebUsuario WHERE eMail = '${email}'`);

    // 2. Buscar en pNetUsuario
    const pnetUser = await legacyPool.request()
      .query(`SELECT IDUsuario, Usuario, eMail, Nombre, Estatus, IDUsuarioTipo FROM pNetUsuario WHERE eMail = '${email}'`);

    // 3. Buscar en portal_proveedor_mapping por portal_user_id
    let mappings: any[] = [];
    if (webUser.recordset.length > 0) {
      const userId = webUser.recordset[0].UsuarioWeb;
      const mapResult = await portalPool.request()
        .query(`SELECT id, portal_user_id, erp_proveedor_code, empresa_code, activo FROM portal_proveedor_mapping WHERE portal_user_id = '${userId}'`);
      mappings = mapResult.recordset;
    }

    // 4. Buscar en pNetUsuarioExtension
    let extensions: any[] = [];
    if (pnetUser.recordset.length > 0) {
      const userId = pnetUser.recordset[0].IDUsuario;
      try {
        const extResult = await legacyPool.request()
          .query(`SELECT IDUsuario, RFC, RazonSocial FROM pNetUsuarioExtension WHERE IDUsuario = ${userId}`);
        extensions = extResult.recordset;
      } catch { /* tabla puede no existir */ }
    }

    return NextResponse.json({
      email,
      encontrado: {
        webUsuario: webUser.recordset,
        pNetUsuario: pnetUser.recordset,
        mappings,
        extensions,
      },
      instruccion: 'Usa DELETE con el mismo email para eliminar todos los registros'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Parámetro email requerido' }, { status: 400 });
  }

  try {
    const portalPool = await getPortalConnection();
    const legacyPool = await getConnection();
    const eliminados: string[] = [];

    // 1. Obtener UsuarioWeb para limpiar mappings
    const webUser = await portalPool.request()
      .query(`SELECT UsuarioWeb FROM WebUsuario WHERE eMail = '${email}'`);

    if (webUser.recordset.length > 0) {
      const userId = webUser.recordset[0].UsuarioWeb;

      // Eliminar mappings
      const mapDel = await portalPool.request()
        .query(`DELETE FROM portal_proveedor_mapping WHERE portal_user_id = '${userId}'`);
      eliminados.push(`portal_proveedor_mapping: ${mapDel.rowsAffected[0]} registros`);

      // Eliminar WebUsuario
      const webDel = await portalPool.request()
        .query(`DELETE FROM WebUsuario WHERE eMail = '${email}'`);
      eliminados.push(`WebUsuario: ${webDel.rowsAffected[0]} registros`);
    }

    // 2. Limpiar pNetUsuario y extensiones
    const pnetUser = await legacyPool.request()
      .query(`SELECT IDUsuario FROM pNetUsuario WHERE eMail = '${email}'`);

    if (pnetUser.recordset.length > 0) {
      const userId = pnetUser.recordset[0].IDUsuario;

      try {
        const extDel = await legacyPool.request()
          .query(`DELETE FROM pNetUsuarioExtension WHERE IDUsuario = ${userId}`);
        eliminados.push(`pNetUsuarioExtension: ${extDel.rowsAffected[0]} registros`);
      } catch { /* tabla puede no existir */ }

      const pnetDel = await legacyPool.request()
        .query(`DELETE FROM pNetUsuario WHERE eMail = '${email}'`);
      eliminados.push(`pNetUsuario: ${pnetDel.rowsAffected[0]} registros`);
    }

    return NextResponse.json({
      success: true,
      email,
      eliminados,
      mensaje: eliminados.length > 0
        ? 'Registros eliminados. El usuario puede volver a registrarse.'
        : 'No se encontraron registros para este email.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
