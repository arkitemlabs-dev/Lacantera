// src/app/api/facturas/route.ts
// Handler unificado para obtener facturas usando el SP sp_GetFacturas
// Soporta tanto vista de Administrador como de Proveedor

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { storedProcedures } from '@/lib/database/stored-procedures';

/**
 * GET /api/facturas
 * 
 * Filtros (Query Params):
 * - proveedor: Código del proveedor (Solo Admins. Proveedores ven lo propio)
 * - rfc: RFC del proveedor
 * - estatus: Estatus de la factura
 * - numeroFactura: Búsqueda por folio/número
 * - fecha_desde, fecha_hasta: Rango de fechas (YYYY-MM-DD)
 * - page, limit: Paginación
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/facturas] Iniciando petición...');

    // 1. Validar Sesión
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return createErrorResponse('No autenticado', 'UNAUTHORIZED', 401);
    }

    const { role, empresaActual, proveedor: proveedorSesion } = session.user;
    
    // 2. Validar Empresa (Obligatorio del contexto)
    if (!empresaActual) {
      return createErrorResponse('No hay empresa seleccionada en la sesión', 'MISSING_EMPRESA', 400);
    }

    const { searchParams } = new URL(request.url);
    
    // 3. Extraer y Limpiar Parámetros
    let proveedor = searchParams.get('proveedor') || '';
    let rfc = searchParams.get('rfc') || '';
    const estatus = searchParams.get('estatus') || '';
    const numeroFactura = searchParams.get('numeroFactura') || '';
    const fechaDesde = searchParams.get('fecha_desde') || null;
    const fechaHasta = searchParams.get('fecha_hasta') || null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 4. Lógica de Rol (Regla de Negocio)
    // proveedor: solo ve sus facturas. Ignora el parámetro proveedor del query.
    if (role === 'proveedor') {
      proveedor = proveedorSesion || ''; 
      // Si el SP requiere RFC y lo tenemos en la sesión, lo usamos como filtro adicional
      // rfc = session.user.rfc || rfc; 
      console.log(`[Facturas] Filtro forzado para Proveedor: ${proveedor}`);
    } 
    // admin: puede ver todo, opcionalmente filtra por lo que venga en el query.
    else if (role === 'admin' || role?.includes('admin')) {
      console.log(`[Facturas] Vista Admin. Consultando proveedor: ${proveedor || 'Todos'}`);
    } else {
      return createErrorResponse('No tienes permisos para consultar facturas', 'FORBIDDEN', 403);
    }

    // 5. Ejecutar Stored Procedure
    // Nota: storedProcedures.getFacturas ya usa la base Cantera_Ajustes por defectoa (actualizado)
    const result = await storedProcedures.getFacturas({
      empresa: empresaActual,
      proveedor,
      rfc,
      estatus: estatus as any,
      numeroFactura,
      fechaDesde,
      fechaHasta,
      page,
      limit
    });

    // 6. Mapear resultados al formato del portal
    const facturas = result.facturas.map((f: any) => ({
      id: f.ID,
      numeroFactura: f.Factura || f.Folio || f.NumeroFactura || `${f.Serie || ''}${f.Folio || f.ID}`,
      serie: f.Serie,
      folio: f.Folio,
      uuid: f.UUID,
      fechaEmision: f.FechaEmision || f.FechEstado,
      proveedor: f.Proveedor,
      proveedorNombre: f.NombreProveedor || f.ProveedorNombre || f.Proveedor,
      proveedorRFC: f.ProveedorRFC || f.RFC || f.Rfc,
      monto: f.Importe || f.Total || 0,
      saldo: f.Saldo || 0,
      moneda: f.Moneda || 'MXN',
      estado: mapEstadoToFrontend(f.Estado || f.Estatus),
      ordenCompra: f.Compra || f.OrdenCompraMovID || '-',
      empresa: f.Empresa,
      urlPDF: f.UrlPDF,
      urlXML: f.UrlXML,
    }));

    // 7. Retornar Respuesta Exitosa
    return NextResponse.json({
      ok: true,
      data: facturas,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ [API Facturas] Error Crítico:', error);
    
    // Loguear detalles para debug interno
    return createErrorResponse(
      'Error al procesar la solicitud de facturas',
      'SP_EXECUTION_ERROR',
      500,
      { 
        detalle: error.message,
        timestamp: new Date().toISOString()
      }
    );
  }
}

/**
 * Normaliza el estatus del SP a uno de los 4 valores canónicos de Intelisis.
 * El frontend se encarga de mostrar el label legible.
 */
function mapEstadoToFrontend(estatus: string | null | undefined): string {
  if (!estatus) return 'SINAFECTAR';
  const s = estatus.toUpperCase();
  if (s === 'SINAFECTAR') return 'SINAFECTAR';
  if (s === 'PENDIENTE' || s === 'EN_REVISION' || s === 'APROBADA') return 'PENDIENTE';
  if (s === 'CONCLUIDO' || s === 'PAGADA' || s === 'PENDIENTE_PAGO' || s === 'PENDIENTE PAGO') return 'CONCLUIDO';
  if (s === 'CANCELADO' || s === 'RECHAZADA') return 'CANCELADO';
  return s; // devolver tal cual si no coincide (para debug)
}

/**
 * Crea una respuesta de error estandarizada
 */
function createErrorResponse(message: string, code: string, status: number, details?: any) {
  return NextResponse.json({
    ok: false,
    message,
    code,
    details
  }, { status });
}
