import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import sql from 'mssql';

// Configuración de conexión a SQL Server
const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  server: process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool de conexiones reutilizable
let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' },
        empresaId: { label: 'Empresa ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        try {
          const pool = await getPool();

          // Buscar usuario por email
          const result = await pool
            .request()
            .input('email', sql.VarChar, credentials.email)
            .query(`
              SELECT
                id,
                email,
                password_hash,
                display_name,
                role,
                user_type,
                is_active,
                created_at
              FROM users
              WHERE email = @email AND is_active = 1
            `);

          const user = result.recordset[0];

          if (!user) {
            throw new Error('Credenciales inválidas');
          }

          // Verificar contraseña
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            throw new Error('Credenciales inválidas');
          }

          // Verificar tipo de usuario
          if (credentials.userType && user.user_type !== credentials.userType) {
            throw new Error('Tipo de usuario inválido');
          }

          // Verificar acceso a empresa si se especifica
          if (credentials.empresaId) {
            const empresaAccess = await pool
              .request()
              .input('userId', sql.UniqueIdentifier, user.id)
              .input('empresaId', sql.UniqueIdentifier, credentials.empresaId)
              .query(`
                SELECT 1 FROM usuario_empresa
                WHERE usuario_id = @userId AND empresa_id = @empresaId
              `);

            if (empresaAccess.recordset.length === 0) {
              throw new Error('No tienes acceso a esta empresa');
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.display_name,
            role: user.role,
            userType: user.user_type,
          };
        } catch (error: any) {
          console.error('Error en authorize:', error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  secret: process.env.NEXTAUTH_SECRET,
};
