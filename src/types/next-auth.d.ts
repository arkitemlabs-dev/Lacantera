import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    userType: string;
    empresa?: string;
    proveedor?: string;
    // Multi-tenant
    empresaActual?: string;
    empresasDisponibles?: Array<{
      tenantId: string;
      tenantName: string;
      empresaCodigo: string;
      proveedorCodigo: string;
    }>;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      userType: string;
      empresa?: string;
      proveedor?: string;
      // Multi-tenant
      empresaActual?: string;
      empresasDisponibles?: Array<{
        tenantId: string;
        tenantName: string;
        empresaCodigo: string;
        proveedorCodigo: string;
      }>;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    userType: string;
    empresa?: string;
    proveedor?: string;
    // Multi-tenant
    empresaActual?: string;
    empresasDisponibles?: Array<{
      tenantId: string;
      tenantName: string;
      empresaCodigo: string;
      proveedorCodigo: string;
    }>;
  }
}
