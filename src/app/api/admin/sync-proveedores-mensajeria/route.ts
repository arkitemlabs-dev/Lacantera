// src/app/api/admin/sync-proveedores-mensajeria/route.ts
// Endpoint para sincronizar proveedores de pNetUsuario a WebUsuario para mensajería

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { sincronizarProveedoresParaMensajeria } from '@/app/actions/mensajes';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea admin o super-admin
    const rol = session.user.role;
    if (rol !== 'admin' && rol !== 'super-admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Sincronización iniciada por: ${session.user.email} (${rol})`);

    // Ejecutar sincronización
    const result = await sincronizarProveedoresParaMensajeria();

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error en endpoint de sincronización:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

// También permitir GET para ver el estado (sin ejecutar)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const rol = session.user.role;
    if (rol !== 'admin' && rol !== 'super-admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Obtener estadísticas de proveedores
    const { hybridDB } = await import('@/lib/database/hybrid-queries');

    // Contar proveedores en cada tabla
    const webUsuarioCount = await hybridDB.queryPortal(`
      SELECT COUNT(*) as count
      FROM WebUsuario
      WHERE Proveedor IS NOT NULL AND Proveedor != ''
        AND Estatus = 'ACTIVO'
    `);

    const pNetCount = await hybridDB.queryPortal(`
      SELECT COUNT(*) as count
      FROM pNetUsuario
      WHERE IDUsuarioTipo = 4
        AND (Estatus = 'ALTA' OR Estatus = 'ACTIVO')
    `);

    const pendientesSync = await hybridDB.queryPortal(`
      SELECT COUNT(*) as count
      FROM pNetUsuario u
      WHERE u.IDUsuarioTipo = 4
        AND (u.Estatus = 'ALTA' OR u.Estatus = 'ACTIVO')
        AND u.eMail IS NOT NULL
        AND u.eMail != ''
        AND NOT EXISTS (
          SELECT 1 FROM WebUsuario w WHERE w.eMail = u.eMail
        )
    `);

    return NextResponse.json({
      proveedoresEnWebUsuario: webUsuarioCount.recordset[0].count,
      proveedoresEnPNet: pNetCount.recordset[0].count,
      pendientesDeSincronizar: pendientesSync.recordset[0].count,
      mensaje: pendientesSync.recordset[0].count > 0
        ? `Hay ${pendientesSync.recordset[0].count} proveedores pendientes de sincronizar. Usa POST para sincronizar.`
        : 'Todos los proveedores están sincronizados.'
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500 }
    );
  }
}
