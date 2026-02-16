'use server';
// src/app/actions/facturas.ts

import { database } from '@/lib/database';
import type { Factura, StatusFactura } from '@/types/backend';
import type { FacturaFilters } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { validacionCompletaSAT } from '@/lib/sat-validator';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getStoredProcedures } from '@/lib/database/stored-procedures';
import sql from 'mssql';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ==================== OBTENER FACTURAS ====================

export async function getFacturasByProveedor(
  proveedorId: string,
  filters?: FacturaFilters
) {
  try {
    const facturas = await database.getFacturasByProveedor(proveedorId, filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters) {
  try {
    const facturas = await database.getFacturasByEmpresa(empresaId, filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllFacturas(filters?: FacturaFilters) {
  try {
    const facturas = await database.getAllFacturas(filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getFactura(id: string) {
  try {
    const factura = await database.getFactura(id);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }
    return { success: true, data: factura };
  } catch (error: any) {
    console.error('Error obteniendo factura:', error);
    return { success: false, error: error.message };
  }
}

export async function getFacturaByUUID(uuid: string) {
  try {
    const factura = await database.getFacturaByUUID(uuid);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }
    return { success: true, data: factura };
  } catch (error: any) {
    console.error('Error obteniendo factura por UUID:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CREAR FACTURA ====================

export async function createFactura(data: {
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  empresaId: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: Date;
  subtotal: number;
  iva: number;
  total: number;
  moneda: 'MXN' | 'USD';
  tipoCambio?: number;
  xmlUrl: string;
  pdfUrl: string;
  ordenCompraId?: string;
  observaciones?: string;
  uploadedBy: string;
}) {
  try {
    // Verificar que no exista una factura con el mismo UUID
    const existing = await database.getFacturaByUUID(data.uuid);
    if (existing) {
      return {
        success: false,
        error: 'Ya existe una factura con este UUID',
      };
    }

    const facturaData: Omit<Factura, 'id'> = {
      facturaId: `FACT-${Date.now()}`,
      ...data,
      status: 'pendiente_revision',
      validadaSAT: false,
      pagada: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await database.createFactura(facturaData);

    // TODO: Crear notificación para admin

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: { id, message: 'Factura creada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error creando factura:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ACTUALIZAR FACTURA ====================

export async function updateFacturaStatus(
  id: string,
  status: StatusFactura,
  motivoRechazo?: string,
  revisadoPor?: string
) {
  try {
    const updateData: Partial<Factura> = {
      status,
      revisadoPor,
      fechaRevision: new Date(),
    };

    if (status === 'rechazada' && motivoRechazo) {
      updateData.motivoRechazo = motivoRechazo;
    }

    if (status === 'pagada') {
      updateData.pagada = true;
      updateData.fechaPago = new Date();
    }

    await database.updateFactura(id, updateData);

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: { message: 'Factura actualizada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando factura:', error);
    return { success: false, error: error.message };
  }
}

export async function marcarFacturaComoPagada(
  id: string,
  complementoPagoId?: string,
  revisadoPor?: string
) {
  try {
    await database.updateFactura(id, {
      status: 'pagada',
      pagada: true,
      fechaPago: new Date(),
      complementoPagoId,
      revisadoPor,
    });

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');
    revalidatePath('/pagos');

    return {
      success: true,
      data: { message: 'Factura marcada como pagada' },
    };
  } catch (error: any) {
    console.error('Error marcando factura como pagada:', error);
    return { success: false, error: error.message };
  }
}

export async function asociarFacturaAOrdenCompra(facturaId: string, ordenCompraId: string) {
  try {
    await database.updateFactura(facturaId, { ordenCompraId });

    // También actualizar la orden de compra
    await database.updateOrdenCompra(ordenCompraId, {
      facturada: true,
      facturaId,
    });

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Factura asociada a orden de compra' },
    };
    return {
      success: true,
      data: { message: 'Factura asociada a orden de compra' },
    };
  } catch (error: any) {
    console.error('Error asociando factura:', error);
    return { success: false, error: error.message };
  }
}

// ==================== APROBACIÓN ADMIN ====================

export async function approveFacturaAndSendToERP(id: string, adminId: string) {
  try {
    const pool = await getPortalConnection();

    // 1. Obtener la factura de la BD
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT ID, Empresa, UUID, Serie, Folio, XMLContenido, OrdenCompraMovID
        FROM ProvFacturas
        WHERE ID = @id
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return { success: false, error: 'Factura no encontrada' };
    }

    const factura = result.recordset[0];

    if (!factura.XMLContenido) {
      return { success: false, error: 'La factura no tiene contenido XML guardado' };
    }

    if (!factura.OrdenCompraMovID) {
      return { success: false, error: 'La factura no tiene Orden de Compra asociada' };
    }

    // 2. Escribir XML a disco local (Requerido por SP legacy)
    const facturasProvPath = 'C:\\FacturasProv';
    const serie = factura.Serie || 'F';
    const folio = factura.Folio || '';
    const facturaParam = `${serie}${folio ? '-' + folio : ''}`;
    // Limpieza de nombre archivo (mismo logic que en upload)
    const safeFilename = facturaParam.replace(/[^a-zA-Z0-9-]/g, '_');
    const erpArchivo = `${safeFilename}.xml`;
    const erpXmlPath = path.join(facturasProvPath, erpArchivo);

    try {
      if (!existsSync(facturasProvPath)) {
        await mkdir(facturasProvPath, { recursive: true });
      }
      await writeFile(erpXmlPath, factura.XMLContenido);
      console.log(`✅ XML guardado para aprobación: ${erpXmlPath}`);
    } catch (saveError: any) {
      console.error('❌ Error escribiendo XML en disco:', saveError);
      return {
        success: false,
        error: 'Error interno: No se pudo preparar el archivo XML para el ERP.'
      };
    }

    // 3. Llamar al SP de ERP
    const sp = getStoredProcedures();
    const remisionResult = await sp.generaRemisionCompra({
      empresa: factura.Empresa,
      movId: factura.OrdenCompraMovID,
      factura: safeFilename
    });

    if (!remisionResult.success) {
      return {
        success: false,
        error: 'El ERP rechazó la generación de la remisión: ' + remisionResult.message
      };
    }

    // 4. Actualizar estatus a APROBADA
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('adminId', sql.NVarChar(50), adminId)
      .query(`
        UPDATE ProvFacturas
        SET Estatus = 'APROBADA',
            RevisadoPor = @adminId,
            FechaRevision = GETDATE()
        WHERE ID = @id
      `);

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas'); // Ruta de admin

    return {
      success: true,
      data: { message: 'Factura aprobada y enviada a ERP exitosamente' }
    };

  } catch (error: any) {
    console.error('Error aprobando factura:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDACIÓN SAT ====================

export async function validarFacturaConSAT(id: string) {
  try {
    const factura = await database.getFactura(id);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }

    console.log(`🔍 Iniciando validación SAT para factura ${factura.uuid}`);

    // Realizar validación completa con el SAT
    const validacionSAT = await validacionCompletaSAT({
      uuid: factura.uuid,
      rfcEmisor: factura.proveedorRFC,
      rfcReceptor: factura.receptorRFC,
      total: factura.total
    });

    console.log('📊 Resultado validación SAT:', validacionSAT);

    // Verificar si la validación fue aprobada
    if (!validacionSAT.aprobada) {
      // Actualizar factura como rechazada
      await database.updateFactura(id, {
        validadaSAT: false,
        estatusSAT: validacionSAT.validacionCFDI.estado === 'Cancelado' ? 'cancelada' : undefined,
        fechaValidacionSAT: new Date(),
        status: 'rechazada',
        motivoRechazo: validacionSAT.motivo || 'No pasó validación SAT'
      });

      revalidatePath('/proveedores/facturacion');
      revalidatePath('/facturas');

      return {
        success: false,
        error: validacionSAT.motivo,
        data: {
          validadaSAT: false,
          estatusSAT: validacionSAT.validacionCFDI.estado,
          motivo: validacionSAT.motivo
        }
      };
    }

    // Validación exitosa - actualizar factura
    await database.updateFactura(id, {
      validadaSAT: true,
      estatusSAT: validacionSAT.validacionCFDI.estado === 'Vigente' ? 'vigente' : 'cancelada',
      fechaValidacionSAT: new Date(),
    });

    console.log('✅ Factura validada exitosamente con SAT');

    // TODO: Crear notificación para proveedor
    // await crearNotificacionFactura({
    //   proveedorId: factura.proveedorId,
    //   facturaId: id,
    //   folio: factura.folio,
    //   empresaId: factura.empresaId,
    //   tipo: 'aprobada'
    // });

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: {
        validadaSAT: true,
        estatusSAT: validacionSAT.validacionCFDI.estado,
        codigoEstatus: validacionSAT.validacionCFDI.codigoEstatus,
        esCancelable: validacionSAT.validacionCFDI.esCancelable,
        validacionEFOS: validacionSAT.validacionCFDI.validacionEFOS,
        message: 'Factura validada con SAT exitosamente',
      },
    };
  } catch (error: any) {
    console.error('❌ Error validando factura con SAT:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS ====================

export async function getEstadisticasFacturas(proveedorId?: string, empresaId?: string) {
  try {
    let facturas: Factura[];

    if (proveedorId) {
      const result = await database.getFacturasByProveedor(proveedorId);
      facturas = result;
    } else if (empresaId) {
      const result = await database.getFacturasByEmpresa(empresaId);
      facturas = result;
    } else {
      const result = await database.getAllFacturas();
      facturas = result;
    }

    const total = facturas.length;
    const pendientes = facturas.filter((f) => f.status === 'pendiente_revision').length;
    const aprobadas = facturas.filter((f) => f.status === 'aprobada').length;
    const pagadas = facturas.filter((f) => f.status === 'pagada').length;
    const rechazadas = facturas.filter((f) => f.status === 'rechazada').length;

    const montoTotal = facturas.reduce((sum, f) => sum + f.total, 0);
    const montoPagado = facturas
      .filter((f) => f.pagada)
      .reduce((sum, f) => sum + f.total, 0);
    const montoPendiente = montoTotal - montoPagado;

    return {
      success: true,
      data: {
        total,
        pendientes,
        aprobadas,
        pagadas,
        rechazadas,
        montoTotal,
        montoPagado,
        montoPendiente,
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
}