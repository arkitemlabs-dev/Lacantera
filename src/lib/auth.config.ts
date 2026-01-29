import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import sql from 'mssql';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getUserTenants } from '@/lib/database/hybrid-queries';
import { TENANT_CONFIGS } from '@/lib/database/tenant-configs';



export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' },
        empresaId: { label: 'Empresa ID', type: 'text' },
        userAgent: { label: 'User Agent', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        try {
          console.log(`[AUTH] Intentando autenticar: ${credentials.email}`);
          const pool = await getPortalConnection();

          // 🔥 PASO 1: Intentar buscar en WebUsuario (tabla principal de usuarios web)
          console.log(`[AUTH] Buscando en WebUsuario...`);
          const webUserResult = await pool
            .request()
            .input('email', sql.VarChar(100), credentials.email)
            .query(`
              SELECT
                UsuarioWeb,
                Nombre,
                eMail,
                Contrasena,
                Rol,
                Estatus,
                Empresa,
                Proveedor,
                Cliente
              FROM WebUsuario
              WHERE eMail = @email AND Estatus = 'ACTIVO'
            `);

          if (webUserResult.recordset.length > 0) {
            // Usuario encontrado en WebUsuario
            const webUser = webUserResult.recordset[0];
            console.log(`[AUTH] Usuario encontrado en WebUsuario: ${webUser.eMail}, Rol: ${webUser.Rol}, Estatus: ${webUser.Estatus}`);

            // Verificar contraseña (bcrypt)
            console.log(`[AUTH] Verificando contraseña...`);
            const isValidPassword = await bcrypt.compare(
              credentials.password,
              webUser.Contrasena
            );

            if (!isValidPassword) {
              console.log(`[AUTH] Contraseña inválida para ${webUser.eMail}`);
              throw new Error('Credenciales inválidas');
            }

            console.log(`[AUTH] Usuario web autenticado: ${webUser.eMail} (Rol: ${webUser.Rol})`);

            // Registrar inicio de sesión exitoso (importación dinámica para evitar problemas de dependencia)
            import('@/app/actions/seguridad').then(({ registrarInicioSesion }) => {
              registrarInicioSesion({
                usuarioId: String(webUser.UsuarioWeb),
                ip: 'Desde servidor',
                userAgent: credentials.userAgent || '',
                exitoso: true,
              }).catch(err => console.error('[AUTH] Error registrando sesión:', err));
            }).catch(err => console.error('[AUTH] Error importando módulo de seguridad:', err));

            // Determinar userType basado en el rol
            let userType = 'Usuario';
            let role = webUser.Rol || 'user';

            if (role === 'super-admin' || role === 'admin') {
              userType = 'Administrador';
            } else if (webUser.Proveedor) {
              userType = 'Proveedor';
              role = 'proveedor';
            } else if (webUser.Cliente) {
              userType = 'Cliente';
            }

            return {
              id: String(webUser.UsuarioWeb),
              email: webUser.eMail,
              name: webUser.Nombre,
              role: role,
              userType: userType,
              empresa: webUser.Empresa,
              proveedor: webUser.Proveedor,
              empresaId: credentials.empresaId,
              requiresPasswordChange: false,
            };
          }

          // 🔥 PASO 2: Si no está en portal_usuarios, buscar en pNetUsuario (usuarios antiguos)
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
            empresaId: credentials.empresaId, // 🔥 NUEVO: Empresa seleccionada en login
          };
        } catch (error: any) {
          console.error('Error en authorize:', error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Login inicial: cargar datos del usuario
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
        token.empresa = user.empresa;
        token.proveedor = user.proveedor;

        // 🔥 MULTI-TENANT: Obtener empresas disponibles
        try {
          // Pasar el rol del usuario para determinar acceso a empresas
          const tenants = await getUserTenants(user.id, user.role);

          if (tenants.length === 0) {
            console.warn(`[AUTH] Usuario ${user.id} sin empresas asignadas`);
            token.empresasDisponibles = [];
            token.empresaActual = undefined;
          } else {
            token.empresasDisponibles = tenants;

            // 🔥 NUEVO: Si viene empresaId desde el login, usarlo
            // De lo contrario, seleccionar la primera empresa
            if (user.empresaId) {
              const hasAccess = tenants.some(t => t.tenantId === user.empresaId);
              if (hasAccess) {
                token.empresaActual = user.empresaId;
                const tenantInfo = tenants.find(t => t.tenantId === user.empresaId);
                const tenantConfig = (TENANT_CONFIGS as any)[user.empresaId];
                // Mapeo de código empresa a BD destino
                const BD_MAP: Record<string, string> = {
                  '01': 'Cantera', '02': 'Peralillo', '03': 'Galbd', '04': 'Galbd', '05': 'Icrear',
                  '06': 'Cantera_Ajustes', '07': 'Peralillo_Ajustes', '08': 'Galbd_Pruebas', '09': 'Galbd_Pruebas', '10': 'Icrear_Pruebas',
                };
                const erpCode = tenantConfig?.erpEmpresa || '?';
                const bdDestino = BD_MAP[erpCode] || 'Desconocida';
                console.log(`\n========================================`);
                console.log(`[AUTH] LOGIN EXITOSO`);
                console.log(`  Usuario: ${user.id} (${user.role})`);
                console.log(`  Empresa: ${tenantInfo?.tenantName || user.empresaId}`);
                console.log(`  Tenant ID: ${user.empresaId}`);
                console.log(`  Codigo ERP: ${erpCode}`);
                console.log(`  BD destino: ${bdDestino}`);
                console.log(`========================================\n`);
              } else {
                console.warn(`[AUTH] Usuario ${user.id} intentó seleccionar empresa sin acceso: ${user.empresaId}`);
                token.empresaActual = tenants[0].tenantId;
              }
            } else {
              // Por defecto, seleccionar la primera empresa
              token.empresaActual = tenants[0].tenantId;
            }

            console.log(`[AUTH] Usuario ${user.id} (rol: ${user.role}) tiene acceso a ${tenants.length} empresa(s)`);
          }
        } catch (error) {
          console.error('[AUTH] Error obteniendo empresas:', error);
          token.empresasDisponibles = [];
          token.empresaActual = undefined;
        }
      }

      // Empresa se fija en el login. Para cambiar de empresa, hacer logout.

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.userType = token.userType as string;
        session.user.empresa = token.empresa as string;
        session.user.proveedor = token.proveedor as string;

        // 🔥 MULTI-TENANT: Agregar empresas al session
        session.user.empresaActual = token.empresaActual as string | undefined;
        session.user.empresasDisponibles = token.empresasDisponibles as any;
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
