// src/lib/blob-path-builder.ts
// Constructor de rutas multi-tenant para Azure Blob Storage

export type BlobFileKind =
  | 'factura-xml'
  | 'factura-pdf'
  | 'documento-proveedor'
  | 'comprobante-pago'
  | 'logo-empresa';

interface BaseBlobParams {
  kind: BlobFileKind;
  empresaCode: string;
}

interface FacturaBlobParams extends BaseBlobParams {
  kind: 'factura-xml' | 'factura-pdf';
  idProveedor: string;
  uuid: string;
}

interface DocumentoProveedorBlobParams extends BaseBlobParams {
  kind: 'documento-proveedor';
  idProveedor: string;
  tipoDocumento: string;
  extension: string;
}

interface ComprobantePagoBlobParams extends BaseBlobParams {
  kind: 'comprobante-pago';
  idProveedor: string;
  idPago: string;
  extension: string;
}

interface LogoEmpresaBlobParams extends BaseBlobParams {
  kind: 'logo-empresa';
  extension: string;
}

export type BlobPathParams =
  | FacturaBlobParams
  | DocumentoProveedorBlobParams
  | ComprobantePagoBlobParams
  | LogoEmpresaBlobParams;

/**
 * Construye la ruta del blob según convenciones multi-tenant.
 *
 * Estructura: empresa / {NO.Empresa} / {ID Proveedor ERP} / {módulo} / {archivo}
 *
 * Convenciones:
 * - Factura XML:  empresa/{emp}/{id}/facturas/{uuid}.xml
 * - Factura PDF:  empresa/{emp}/{id}/facturas/{uuid}.pdf
 * - Documento:    empresa/{emp}/{id}/documentos/{tipoDocumento}.{ext}
 * - Comprobante:  empresa/{emp}/{id}/pagos/comprobante-pago_{idPago}.{ext}
 * - Logo:         empresa/{emp}/configuracion/logo_{timestamp}.{ext}
 */
export function buildBlobPath(params: BlobPathParams): string {
  const { kind, empresaCode } = params;
  const emp = sanitize(empresaCode);

  switch (kind) {
    case 'factura-xml': {
      const p = params as FacturaBlobParams;
      requireFields(p, ['idProveedor', 'uuid']);
      const id = sanitize(p.idProveedor);
      const uuid = sanitize(p.uuid);
      return `empresa/${emp}/${id}/facturas/${uuid}.xml`;
    }

    case 'factura-pdf': {
      const p = params as FacturaBlobParams;
      requireFields(p, ['idProveedor', 'uuid']);
      const id = sanitize(p.idProveedor);
      const uuid = sanitize(p.uuid);
      return `empresa/${emp}/${id}/facturas/${uuid}.pdf`;
    }

    case 'documento-proveedor': {
      const p = params as DocumentoProveedorBlobParams;
      requireFields(p, ['idProveedor', 'tipoDocumento', 'extension']);
      const id = sanitize(p.idProveedor);
      const tipo = sanitize(p.tipoDocumento);
      const ext = sanitizeExt(p.extension);
      return `empresa/${emp}/${id}/documentos/${tipo}.${ext}`;
    }

    case 'comprobante-pago': {
      const p = params as ComprobantePagoBlobParams;
      requireFields(p, ['idProveedor', 'idPago', 'extension']);
      const id = sanitize(p.idProveedor);
      const pago = sanitize(p.idPago);
      const ext = sanitizeExt(p.extension);
      return `empresa/${emp}/${id}/pagos/comprobante-pago_${pago}.${ext}`;
    }

    case 'logo-empresa': {
      const p = params as LogoEmpresaBlobParams;
      requireFields(p, ['extension']);
      const ext = sanitizeExt(p.extension);
      const ts = Date.now();
      return `empresa/${emp}/configuracion/logo_${ts}.${ext}`;
    }

    default:
      throw new Error(`Tipo de blob desconocido: ${kind}`);
  }
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeExt(ext: string): string {
  return ext.replace(/^\./, '').replace(/[^a-zA-Z0-9]/g, '');
}

function requireFields(obj: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (!obj[field]) {
      throw new Error(`Campo requerido '${field}' falta para blob path tipo '${obj.kind}'`);
    }
  }
}
