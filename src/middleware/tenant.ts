// src/middleware/tenant.ts
// Middleware para validar y gestionar contexto de tenant en requests

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getTenantConfig } from '@/lib/database/multi-tenant-connection';
import { validateUserTenantAccess } from '@/lib/database/hybrid-queries';

/**
 * Interface para request con tenant context
 */
export interface TenantRequest extends NextRequest {
  tenant?: {
    tenantId: string;
    tenantName: string;
    empresaCodigo: string;
    erpDatabase: string;
    proveedorCodigo?: string;
  };
  user?: {
    id: string;
    email: string;
    role: string;
    userType: string;
  };
}

/**
 * Middleware para API routes que requieren tenant context
 * Uso en API route:
 *
 * export async function GET(request: NextRequest) {
 *   const { tenant, user } = await validateTenantContext(request);
 *   // ... tu lógica
 * }
 */
export async function validateTenantContext(request: NextRequest) {
  // 1. Verificar sesión
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new TenantError('No autorizado', 401);
  }

  // 2. Obtener tenant del header o sesión
  const tenantId =
    request.headers.get('x-tenant-id') ||
    (session.user as any).empresaActual ||
    (session.user as any).empresa;

  if (!tenantId) {
    throw new TenantError(
      'Tenant ID requerido. Debe seleccionar una empresa',
      400
    );
  }

  // 3. Validar configuración del tenant
  let tenantConfig;
  try {
    tenantConfig = getTenantConfig(tenantId);
  } catch (error) {
    throw new TenantError(`Tenant inválido: ${tenantId}`, 400);
  }

  // 4. Validar que el usuario tenga acceso al tenant
  if ((session.user as any).role === 'proveedor') {
    const hasAccess = await validateUserTenantAccess(
      (session.user as any).id,
      tenantId
    );

    if (!hasAccess) {
      throw new TenantError(
        `No tiene acceso a la empresa: ${tenantConfig.nombre}`,
        403
      );
    }
  }

  // 5. Retornar contexto completo
  return {
    tenant: {
      tenantId: tenantConfig.id,
      tenantName: tenantConfig.nombre,
      empresaCodigo: tenantConfig.codigoEmpresa,
      erpDatabase: tenantConfig.erpDatabase,
      proveedorCodigo: (session.user as any).proveedor,
    },
    user: {
      id: (session.user as any).id,
      email: (session.user as any).email!,
      role: (session.user as any).role,
      userType: (session.user as any).userType,
    },
  };
}

/**
 * Wrapper para API routes con tenant context automático
 * Simplifica el código repetitivo de validación
 *
 * Ejemplo de uso:
 *
 * export const GET = withTenantContext(async (request, { tenant, user }) => {
 *   // tenant y user ya están validados
 *   const ordenes = await getOrdenesCompraHybrid(
 *     tenant.tenantId,
 *     tenant.proveedorCodigo!
 *   );
 *   return NextResponse.json({ ordenes });
 * });
 */
export function withTenantContext<TArgs = any>(
  handler: (
    request: NextRequest,
    context: {
      tenant: NonNullable<TenantRequest['tenant']>;
      user: NonNullable<TenantRequest['user']>;
    },
    additionalArgs?: TArgs
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, additionalArgs?: TArgs) => {
    try {
      const context = await validateTenantContext(request);
      return await handler(request, context, additionalArgs);
    } catch (error) {
      if (error instanceof TenantError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: error.code,
          },
          { status: error.statusCode }
        );
      }

      console.error('[TENANT_MIDDLEWARE] Unexpected error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error interno del servidor',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware para páginas (Page Router)
 * Uso en getServerSideProps:
 *
 * export const getServerSideProps = withTenantContextSSR(async (context, tenantContext) => {
 *   // tenantContext ya validado
 *   return { props: { ... } };
 * });
 */
export function withTenantContextSSR(
  handler: (context: any, tenantContext: any) => Promise<any>
) {
  return async (context: any) => {
    try {
      const session = await getServerSession(
        context.req,
        context.res,
        authOptions
      );

      if (!session?.user) {
        return {
          redirect: {
            destination: '/login',
            permanent: false,
          },
        };
      }

      const tenantId =
        context.req.headers['x-tenant-id'] ||
        (session.user as any).empresaActual ||
        (session.user as any).empresa;

      if (!tenantId) {
        return {
          redirect: {
            destination: '/select-empresa',
            permanent: false,
          },
        };
      }

      const tenantConfig = getTenantConfig(tenantId);

      // Validar acceso
      if ((session.user as any).role === 'proveedor') {
        const hasAccess = await validateUserTenantAccess(
          (session.user as any).id,
          tenantId
        );

        if (!hasAccess) {
          return {
            redirect: {
              destination: '/unauthorized',
              permanent: false,
            },
          };
        }
      }

      const tenantContext = {
        tenant: {
          tenantId: tenantConfig.id,
          tenantName: tenantConfig.nombre,
          empresaCodigo: tenantConfig.codigoEmpresa,
          erpDatabase: tenantConfig.erpDatabase,
          proveedorCodigo: (session.user as any).proveedor,
        },
        user: {
          id: (session.user as any).id,
          email: (session.user as any).email,
          role: (session.user as any).role,
          userType: (session.user as any).userType,
        },
      };

      return await handler(context, tenantContext);
    } catch (error) {
      console.error('[TENANT_MIDDLEWARE_SSR] Error:', error);
      return {
        redirect: {
          destination: '/error',
          permanent: false,
        },
      };
    }
  };
}

/**
 * Error personalizado para manejo de tenants
 */
export class TenantError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'TenantError';
    this.code = code || `TENANT_ERROR_${statusCode}`;
  }
}

/**
 * Helper para extraer tenant ID de diferentes fuentes
 */
export function extractTenantId(
  request: NextRequest,
  session: any
): string | null {
  // Prioridad: Header > Session (empresaActual) > Session (empresa)
  return (
    request.headers.get('x-tenant-id') ||
    session?.user?.empresaActual ||
    session?.user?.empresa ||
    null
  );
}

/**
 * Helper para validar que el tenant sea válido
 */
export function isValidTenant(tenantId: string): boolean {
  try {
    getTenantConfig(tenantId);
    return true;
  } catch {
    return false;
  }
}
