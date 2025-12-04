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

          // Buscar usuario en pNetUsuario
          const userResult = await pool
            .request()
            .input('email', sql.VarChar(50), credentials.email)
            .query(`
              SELECT
                u.IDUsuario,
                u.Usuario,
                u.IDUsuarioTipo,
                u.eMail,
                u.Nombre,
                u.Estatus,
                u.Empresa,
                t.Descripcion as TipoUsuario
              FROM pNetUsuario u
              INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
              WHERE u.eMail = @email AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
            `);

          const user = userResult.recordset[0];

          if (!user) {
            throw new Error('Credenciales inválidas');
          }

          // Verificar contraseña
          const passwordResult = await pool
            .request()
            .input('userId', sql.Int, user.IDUsuario)
            .query(`
              SELECT PasswordHash
              FROM pNetUsuarioPassword
              WHERE IDUsuario = @userId
            `);

          if (passwordResult.recordset.length === 0) {
            throw new Error('Usuario sin contraseña configurada');
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            passwordResult.recordset[0].PasswordHash
          );

          if (!isValidPassword) {
            throw new Error('Credenciales inválidas');
          }

          // Verificar tipo de usuario si se especifica
          if (credentials.userType && user.TipoUsuario !== credentials.userType) {
            throw new Error('Tipo de usuario inválido');
          }

          // Determinar rol basado en el tipo de usuario
          let role = 'user';
          if (user.IDUsuarioTipo === 1) {
            // Intelisis = Admin
            role = 'admin';
          } else if (user.IDUsuarioTipo === 4) {
            // Proveedor
            role = 'proveedor';
          }

          return {
            id: String(user.IDUsuario),
            email: user.eMail,
            name: user.Nombre,
            role: role,
            userType: user.TipoUsuario,
            empresa: user.Empresa,
            proveedor: user.Usuario, // La clave del proveedor
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
        token.empresa = user.empresa;
        token.proveedor = user.proveedor;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as string;
        session.user.empresa = token.empresa as string;
        session.user.proveedor = token.proveedor as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  secret: process.env.NEXTAUTH_SECRET,
};
