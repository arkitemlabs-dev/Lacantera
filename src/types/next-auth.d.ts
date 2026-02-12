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
    // Multi-tenant (código numérico)
    empresaId?: string;
    empresaActual?: string;
    erpDatabase?: string;
    erpEmpresa?: string;
    erpEmpresaCode?: string;
    empresasDisponibles?: Array<{
      codigo: string;
      nombre: string;
      proveedorCodigo: string | null;
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
      // Multi-tenant (código numérico)
      empresaActual?: string;
      erpDatabase?: string;
      erpEmpresa?: string;
      erpEmpresaCode?: string;
      empresasDisponibles?: Array<{
        codigo: string;
        nombre: string;
        proveedorCodigo: string | null;
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
    // Multi-tenant (código numérico)
    empresaActual?: string;
    erpDatabase?: string;
    erpEmpresa?: string;
    erpEmpresaCode?: string;
    empresasDisponibles?: Array<{
      codigo: string;
      nombre: string;
      proveedorCodigo: string | null;
    }>;
  }
}
