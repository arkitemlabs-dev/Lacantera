// src/lib/sql-connection.ts
import sql from 'mssql';

const config: sql.config = {
  server: process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!,
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
  if (!pool) {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
  }
  return pool;
}

export async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}