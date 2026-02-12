// src/lib/auth.config.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import sql from 'mssql';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getUserTenants } from '@/lib/database/hybrid-queries';
import { ERP_DATABASES, validateEmpresaCode } from '@/lib/database/tenant-configs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        empresaCode: { label: 'Empresa Code', type: 'text' }, // Código 01-10
        userAgent: { label: 'User Agent', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.empresaCode) {
          throw new Error('Email, contraseña y empresa son requeridos');
        }

        const empresaSeleccionada = credentials.empresaCode;
        validateEmpresaCode(empresaSeleccionada);

        try {
          console.log(`[AUTH] Intentando autenticar: ${credentials.email} para empresa ${empresaSeleccionada}`);
          const pool = await getPortalConnection();

          // 1. Buscar en WebUsuario (Fuente Única de Verdad)
          const webUserResult = await pool
            .request()
            .input('email', sql.VarChar(100), credentials.email)
            .query(`
              SELECT
                UsuarioWeb, Nombre, eMail, Contrasena,
                Rol, Estatus, Empresa, Proveedor
              FROM WebUsuario
              WHERE eMail = @email AND Estatus = 'ACTIVO'
            `);

          let userData: any = null;

          if (webUserResult.recordset.length > 0) {
            const webUser = webUserResult.recordset[0];

            // Validar bcrypt
            const isValidPassword = await bcrypt.compare(credentials.password, webUser.Contrasena);
            if (!isValidPassword) {
              console.log(`[AUTH] Contraseña inválida para ${webUser.eMail}`);
              throw new Error('Credenciales inválidas');
            }

            userData = {
              id: webUser.UsuarioWeb,
              email: webUser.eMail,
              name: webUser.Nombre,
              role: webUser.Rol,
              empresaDefault: webUser.Empresa,
              proveedorCode: webUser.Proveedor,
            };
          } else {
            // 2. Sistema Legacy (pNetUsuario)
            const legacyUserResult = await pool
              .request()
              .input('email', sql.VarChar(50), credentials.email)
              .query(`
                SELECT u.IDUsuario, u.Usuario, u.eMail, u.Nombre, u.IDUsuarioTipo, p.PasswordHash
                FROM pNetUsuario u
                INNER JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
                WHERE u.eMail = @email AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
              `);

            if (legacyUserResult.recordset.length > 0) {
              const legacyUser = legacyUserResult.recordset[0];
              const isValidPassword = await bcrypt.compare(credentials.password, legacyUser.PasswordHash);
              if (!isValidPassword) throw new Error('Credenciales inválidas');

              userData = {
                id: String(legacyUser.IDUsuario),
                email: legacyUser.eMail,
                name: legacyUser.Nombre,
                role: legacyUser.IDUsuarioTipo === 1 ? 'admin' : 'proveedor',
                proveedorCode: legacyUser.Usuario,
              };
            }
          }

          if (!userData) {
            throw new Error('Credenciales inválidas');
          }

          // 3. Obtener empresas disponibles
          const tenants = await getUserTenants(userData.id, userData.role, userData.email);
          const empresasDisponibles = tenants.map((t: any) => t.codigo);

          // 4. VALIDACIÓN CRÍTICA: Solo códigos numéricos
          if (!empresasDisponibles.includes(empresaSeleccionada)) {
            // Excepción: super-admin tiene acceso a todo (01-10)
            if (userData.role !== 'super-admin') {
              throw new Error("No tiene acceso a esta empresa");
            }
          }

          console.log(`[AUTH] Login exitoso para ${userData.email} en empresa ${empresaSeleccionada}`);

          // Determinar userType
          let userType = 'Usuario';
          if (userData.role === 'super-admin' || userData.role === 'admin') {
            userType = 'Administrador';
          } else if (userData.role === 'proveedor') {
            userType = 'Proveedor';
          }

          const dbConfig = ERP_DATABASES[empresaSeleccionada];

          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            userType: userType,
            empresaActual: empresaSeleccionada,
            erpDatabase: dbConfig.db,
            erpEmpresa: dbConfig.empresa, // Legacy compat
            erpEmpresaCode: dbConfig.empresa,
            empresasDisponibles: empresasDisponibles,
            proveedor: userData.proveedorCode,
          };

        } catch (error: any) {
          console.error('Error en authorize:', error.message);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.userType = u.userType;
        token.empresaActual = u.empresaActual;
        token.empresasDisponibles = u.empresasDisponibles;
        token.proveedor = u.proveedor;

        // Resolución de empresa ERP (Basado en ERP_DATABASES)
        const config = ERP_DATABASES[u.empresaActual];
        if (config) {
          token.erpDatabase = config.db;
          token.erpEmpresaCode = config.empresa;
        }
      }
      return token;
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.userType = token.userType;
        session.user.empresaActual = token.empresaActual;
        session.user.erpDatabase = token.erpDatabase;
        session.user.erpEmpresaCode = token.erpEmpresaCode;
        session.user.empresasDisponibles = token.empresasDisponibles;
        session.user.proveedor = token.proveedor;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 días
  },

  secret: process.env.NEXTAUTH_SECRET,
};
