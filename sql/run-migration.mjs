// Script para ejecutar la migración de Azure Blob Storage contra BD PP
// Uso: node sql/run-migration.mjs

import sql from 'mssql';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE, // PP
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
};

console.log(`Conectando a ${config.server}/${config.database}...`);

const pool = await sql.connect(config);
console.log('Conectado.\n');

// Batch 1: Agregar xml_blob_container
console.log('1/4 Agregando columna xml_blob_container...');
await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'xml_blob_container')
  BEGIN
    ALTER TABLE proveedor_facturas ADD xml_blob_container VARCHAR(100) NULL;
  END
`);
console.log('    OK');

// Batch 2: Agregar pdf_blob_container
console.log('2/4 Agregando columna pdf_blob_container...');
await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'pdf_blob_container')
  BEGIN
    ALTER TABLE proveedor_facturas ADD pdf_blob_container VARCHAR(100) NULL;
  END
`);
console.log('    OK');

// Batch 3: Agregar storage_type
console.log('3/4 Agregando columna storage_type...');
await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('proveedor_facturas') AND name = 'storage_type')
  BEGIN
    ALTER TABLE proveedor_facturas ADD storage_type VARCHAR(20) NULL DEFAULT 'local';
  END
`);
console.log('    OK');

// Batch 4: Crear tabla archivos_blob
console.log('4/4 Creando tabla archivos_blob...');
await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = 'archivos_blob' AND type = 'U')
  BEGIN
    CREATE TABLE archivos_blob (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      empresa_code VARCHAR(50) NOT NULL,
      proveedor_code VARCHAR(20) NULL,
      blob_container VARCHAR(100) NOT NULL,
      blob_path VARCHAR(500) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      tamano BIGINT NOT NULL DEFAULT 0,
      tipo_archivo VARCHAR(50) NOT NULL,
      entidad_tipo VARCHAR(50) NULL,
      entidad_id VARCHAR(100) NULL,
      nombre_original NVARCHAR(255) NULL,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      created_by NVARCHAR(100) NULL,
      deleted_at DATETIME2 NULL
    );

    CREATE INDEX IX_archivos_blob_empresa ON archivos_blob (empresa_code);
    CREATE INDEX IX_archivos_blob_entidad ON archivos_blob (entidad_tipo, entidad_id);
    CREATE UNIQUE INDEX UX_archivos_blob_path ON archivos_blob (blob_container, blob_path) WHERE deleted_at IS NULL;
  END
`);
console.log('    OK');

// Verificar
const cols = await pool.request().query(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'proveedor_facturas'
    AND COLUMN_NAME IN ('xml_blob_container','pdf_blob_container','storage_type')
  ORDER BY COLUMN_NAME
`);

const tabla = await pool.request().query(`
  SELECT TABLE_NAME
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'archivos_blob'
`);

console.log('\n=== Verificación ===');
console.log('Columnas nuevas en proveedor_facturas:', cols.recordset.map(r => r.COLUMN_NAME));
console.log('Tabla archivos_blob existe:', tabla.recordset.length > 0);

await pool.close();
console.log('\nMigración completada.');
