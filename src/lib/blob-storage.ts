// src/lib/blob-storage.ts
// Servicio Azure Blob Storage - Singleton con funciones puras de infraestructura

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  ContainerClient,
} from '@azure/storage-blob';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UploadBlobResult {
  blobPath: string;
  container: string;
  url: string;
  size: number;
  contentType: string;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _blobServiceClient: BlobServiceClient | null = null;
let _sharedKeyCredential: StorageSharedKeyCredential | null = null;

function getConnectionString(): string {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!cs) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING no está configurado en las variables de entorno');
  }
  return cs;
}

function getDefaultContainer(): string {
  return process.env.BLOB_DEFAULT_CONTAINER || 'portal-proveedores';
}

function getSasExpiryMinutes(): number {
  return parseInt(process.env.BLOB_SAS_EXPIRY_MINUTES || '60', 10);
}

function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    _blobServiceClient = BlobServiceClient.fromConnectionString(getConnectionString());
  }
  return _blobServiceClient;
}

function getSharedKeyCredential(): StorageSharedKeyCredential {
  if (!_sharedKeyCredential) {
    const cs = getConnectionString();
    // Extraer AccountName y AccountKey del connection string
    const accountNameMatch = cs.match(/AccountName=([^;]+)/);
    const accountKeyMatch = cs.match(/AccountKey=([^;]+)/);

    if (!accountNameMatch || !accountKeyMatch) {
      throw new Error('No se pudo extraer AccountName o AccountKey del connection string');
    }

    _sharedKeyCredential = new StorageSharedKeyCredential(
      accountNameMatch[1],
      accountKeyMatch[1]
    );
  }
  return _sharedKeyCredential;
}

async function ensureContainer(containerName: string): Promise<ContainerClient> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

// ─── Funciones públicas ──────────────────────────────────────────────────────

/**
 * Sube un buffer a Azure Blob Storage.
 * Crea el container si no existe.
 */
export async function uploadBufferToBlob(
  buffer: Buffer,
  blobPath: string,
  contentType: string,
  container?: string
): Promise<UploadBlobResult> {
  const containerName = container || getDefaultContainer();
  const containerClient = await ensureContainer(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return {
    blobPath,
    container: containerName,
    url: blockBlobClient.url,
    size: buffer.length,
    contentType,
  };
}

/**
 * Obtiene un stream de lectura del blob.
 * Retorna null si el blob no existe.
 */
export async function getBlobStream(
  blobPath: string,
  container?: string
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; size: number } | null> {
  const containerName = container || getDefaultContainer();
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);

  try {
    const properties = await blobClient.getProperties();
    const downloadResponse = await blobClient.download(0);

    if (!downloadResponse.readableStreamBody) return null;

    return {
      stream: downloadResponse.readableStreamBody,
      contentType: properties.contentType || 'application/octet-stream',
      size: properties.contentLength || 0,
    };
  } catch (error: any) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

/**
 * Descarga el blob completo como Buffer.
 * Retorna null si el blob no existe.
 */
export async function getBlobBuffer(
  blobPath: string,
  container?: string
): Promise<Buffer | null> {
  const containerName = container || getDefaultContainer();
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);

  try {
    const response = await blobClient.downloadToBuffer();
    return response;
  } catch (error: any) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

/**
 * Genera una URL SAS de solo lectura con expiración.
 */
export function generateReadSasUrl(
  blobPath: string,
  container?: string,
  expiryMinutes?: number
): string {
  const containerName = container || getDefaultContainer();
  const credential = getSharedKeyCredential();
  const cs = getConnectionString();
  const accountNameMatch = cs.match(/AccountName=([^;]+)/);
  if (!accountNameMatch) throw new Error('AccountName no encontrado en connection string');
  const accountName = accountNameMatch[1];

  const expiry = expiryMinutes || getSasExpiryMinutes();
  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiry * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
}

/**
 * Elimina un blob. Retorna true si se eliminó, false si no existía.
 */
export async function deleteBlob(
  blobPath: string,
  container?: string
): Promise<boolean> {
  const containerName = container || getDefaultContainer();
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);

  try {
    await blobClient.deleteIfExists();
    return true;
  } catch (error: any) {
    if (error.statusCode === 404) return false;
    throw error;
  }
}
