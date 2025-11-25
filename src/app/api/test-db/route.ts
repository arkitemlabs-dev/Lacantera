// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/sql-connection';

export async function GET() {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT 1 as test');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexión exitosa',
      data: result.recordset 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}