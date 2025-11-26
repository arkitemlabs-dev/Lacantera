// src/app/api/auth/register/route.ts
// API endpoint para registro de proveedores

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getConnection } from '@/lib/sql-connection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, rfc, razonSocial } = body;

    // Validaciones
    if (!email || !password || !nombre || !rfc || !razonSocial) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Validar RFC (formato básico)
    if (rfc.length < 12 || rfc.length > 13) {
      return NextResponse.json(
        { error: 'RFC inválido (debe tener 12 o 13 caracteres)' },
        { status: 400 }
      );
    }

    // Validar contraseña (mínimo 8 caracteres, al menos una mayúscula y un número)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // 1. Verificar que el email no esté registrado
      const existingEmail = await transaction
        .request()
        .input('email', sql.VarChar(50), email)
        .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

      if (existingEmail.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json(
          { error: 'Este email ya está registrado' },
          { status: 409 }
        );
      }

      // 2. Verificar que el RFC no esté registrado en Prov
      const existingRFC = await transaction
        .request()
        .input('rfc', sql.VarChar(15), rfc)
        .query('SELECT Proveedor FROM Prov WHERE RFC = @rfc');

      if (existingRFC.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json(
          {
            error:
              'Este RFC ya está registrado. Si ya eres proveedor, contacta al administrador.',
          },
          { status: 409 }
        );
      }

      // 3. Generar código único para el proveedor (formato: PROV + número secuencial)
      const lastProvResult = await transaction.request().query(`
        SELECT TOP 1 Proveedor
        FROM Prov
        WHERE Proveedor LIKE 'PROV%'
        ORDER BY Proveedor DESC
      `);

      let proveedorCodigo = 'PROV001';
      if (lastProvResult.recordset.length > 0) {
        const lastCode = lastProvResult.recordset[0].Proveedor;
        const lastNumber = parseInt(lastCode.replace('PROV', ''));
        const nextNumber = lastNumber + 1;
        proveedorCodigo = `PROV${String(nextNumber).padStart(3, '0')}`;
      }

      // 4. Crear registro en tabla Prov
      await transaction
        .request()
        .input('proveedor', sql.VarChar(10), proveedorCodigo)
        .input('nombre', sql.VarChar(100), razonSocial)
        .input('rfc', sql.VarChar(15), rfc)
        .input('estatus', sql.VarChar(15), 'BAJA') // Inicia como BAJA hasta que sea aprobado
        .query(`
          INSERT INTO Prov (Proveedor, Nombre, RFC, Estatus)
          VALUES (@proveedor, @nombre, @rfc, @estatus)
        `);

      // 5. Crear usuario en pNetUsuario
      const userResult = await transaction
        .request()
        .input('usuario', sql.VarChar(10), proveedorCodigo)
        .input('idUsuarioTipo', sql.Int, 4) // Tipo 4 = Proveedor
        .input('email', sql.VarChar(50), email)
        .input('nombreUsuario', sql.VarChar(100), nombre)
        .input('estatus', sql.VarChar(15), 'ACTIVO')
        .query(`
          INSERT INTO pNetUsuario (
            Usuario, IDUsuarioTipo, eMail, Nombre,
            Estatus, FechaRegistro, PrimeraVez
          )
          OUTPUT INSERTED.IDUsuario
          VALUES (
            @usuario, @idUsuarioTipo, @email, @nombreUsuario,
            @estatus, GETDATE(), 1
          )
        `);

      const userId = userResult.recordset[0].IDUsuario;

      // 6. Crear hash de contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // 7. Guardar contraseña
      await transaction
        .request()
        .input('userId', sql.Int, userId)
        .input('hash', sql.VarChar(255), passwordHash)
        .query(`
          INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)
          VALUES (@userId, @hash)
        `);

      await transaction.commit();

      return NextResponse.json(
        {
          success: true,
          message:
            'Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.',
          userId: String(userId),
          proveedorCodigo,
        },
        { status: 201 }
      );
    } catch (error: any) {
      await transaction.rollback();
      console.error('Error en transacción de registro:', error);

      // Verificar si es un error de violación de restricción única
      if (error.number === 2627 || error.number === 2601) {
        return NextResponse.json(
          { error: 'Ya existe un registro con estos datos' },
          { status: 409 }
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el registro. Por favor intenta de nuevo.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
