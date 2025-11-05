
import { navItems } from "@/app/(app)/nav";

export type Permission = 'ver' | 'crear_editar' | 'eliminar';

export type Role = {
    name: string;
    permissions: {
        [module: string]: Permission[];
    };
};

export const initialRoles: Role[] = [
    {
      name: 'Super Admin',
      permissions: Object.fromEntries(navItems.map(item => [item.href, ['ver', 'crear_editar', 'eliminar']])),
    },
    {
      name: 'Compras',
      permissions: {
        '/dashboard': ['ver'],
        '/perfil': ['ver'],
        '/proveedores': ['ver', 'crear_editar'],
        '/ordenes-de-compra': ['ver', 'crear_editar'],
        '/facturas': ['ver'],
        '/mensajeria': ['ver'],
        '/notificaciones': ['ver'],
      },
    },
    {
      name: 'Contabilidad',
      permissions: {
        '/dashboard': ['ver'],
        '/perfil': ['ver'],
        '/facturas': ['ver', 'crear_editar'],
        '/pagos': ['ver', 'crear_editar'],
        '/mensajeria': ['ver'],
        '/notificaciones': ['ver'],
      },
    },
    {
      name: 'Solo lectura',
      permissions: Object.fromEntries(navItems.map(item => [item.href, ['ver']])),
    },
    {
      name: 'Proveedor',
      permissions: {}, // Permissions for supplier are handled by its own nav
    }
  ];
