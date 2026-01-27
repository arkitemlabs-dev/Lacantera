// Función de actualización directa a la tabla Prov (BYPASS del SP)
// Esta es una solución temporal mientras se arregla el stored procedure

import sql from 'mssql';
import { getERPConnection, getTenantConfig } from './multi-tenant-connection';
import type { FormProveedorAdmin } from '@/types/admin-proveedores';

/**
 * Actualiza un proveedor directamente en la tabla Prov
 * BYPASS del stored procedure spDatosProveedor que no está guardando cambios
 */
export async function actualizarProveedorDirecto(
    empresa: string,
    cveProv: string,
    data: Partial<FormProveedorAdmin>
): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
        console.log('[DIRECT UPDATE] Actualizando proveedor:', cveProv);
        console.log('[DIRECT UPDATE] Datos:', data);

        const pool = await getERPConnection(empresa);

        // Construir el UPDATE dinámicamente solo con los campos proporcionados
        const updates: string[] = [];
        const request = pool.request();

        // Mapeo de campos del formulario a campos de la tabla Prov
        const fieldMapping: Record<string, { column: string; type: any }> = {
            nombre: { column: 'Nombre', type: sql.VarChar(100) },
            nombreCorto: { column: 'NombreCorto', type: sql.VarChar(20) },
            rfc: { column: 'RFC', type: sql.VarChar(15) },
            curp: { column: 'CURP', type: sql.VarChar(30) },
            regimen: { column: 'FiscalRegimen', type: sql.VarChar(30) },
            direccion: { column: 'Direccion', type: sql.VarChar(100) },
            numeroExterior: { column: 'DireccionNumero', type: sql.VarChar(20) },
            numeroInterior: { column: 'DireccionNumeroInt', type: sql.VarChar(20) },
            entreCalles: { column: 'EntreCalles', type: sql.VarChar(100) },
            colonia: { column: 'Colonia', type: sql.VarChar(100) },
            ciudad: { column: 'Poblacion', type: sql.VarChar(100) },
            estado: { column: 'Estado', type: sql.VarChar(30) },
            pais: { column: 'Pais', type: sql.VarChar(100) },
            codigoPostal: { column: 'CodigoPostal', type: sql.VarChar(15) },
            contactoPrincipal: { column: 'Contacto1', type: sql.VarChar(50) },
            contactoSecundario: { column: 'Contacto2', type: sql.VarChar(50) },
            email1: { column: 'eMail1', type: sql.VarChar(50) },
            email2: { column: 'eMail2', type: sql.VarChar(50) },
            telefonos: { column: 'Telefonos', type: sql.VarChar(100) },
            fax: { column: 'Fax', type: sql.VarChar(50) },
            extension1: { column: 'Extencion1', type: sql.VarChar(10) },
            extension2: { column: 'Extencion2', type: sql.VarChar(10) },
            banco: { column: 'ProvBancoSucursal', type: sql.VarChar(50) },
            cuentaBancaria: { column: 'ProvCuenta', type: sql.VarChar(20) },
            beneficiario: { column: 'Beneficiario', type: sql.Int },
            nombreBeneficiario: { column: 'BeneficiarioNombre', type: sql.VarChar(100) },
            leyendaCheque: { column: 'LeyendaCheque', type: sql.VarChar(100) },
        };

        // Agregar solo los campos que vienen en data
        let paramIndex = 0;
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null && fieldMapping[key]) {
                const mapping = fieldMapping[key];
                const paramName = `param${paramIndex}`;

                updates.push(`${mapping.column} = @${paramName}`);
                request.input(paramName, mapping.type, value);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return {
                success: false,
                error: 'No hay campos para actualizar'
            };
        }

        // Agregar UltimoCambio automáticamente
        updates.push('UltimoCambio = GETDATE()');

        // Construir y ejecutar el UPDATE
        request.input('cveProv', sql.VarChar(10), cveProv);

        const query = `
      UPDATE Prov 
      SET ${updates.join(', ')}
      WHERE Proveedor = @cveProv
    `;

        console.log('[DIRECT UPDATE] Query:', query);

        const result = await request.query(query);

        console.log('[DIRECT UPDATE] RowsAffected:', result.rowsAffected[0]);

        if (result.rowsAffected[0] > 0) {
            return {
                success: true,
                message: 'Proveedor actualizado exitosamente (actualización directa)'
            };
        } else {
            return {
                success: false,
                error: 'No se encontró el proveedor o no se actualizó ningún registro'
            };
        }

    } catch (error: any) {
        console.error('[DIRECT UPDATE] Error:', error);
        return {
            success: false,
            error: error.message || 'Error desconocido al actualizar proveedor'
        };
    }
}
