
import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  ShoppingCart,
  CreditCard,
  User
} from 'lucide-react';

export const navItems = [
  {
    title: 'Inicio',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Perfil',
    href: '/perfil',
    icon: User,
  },
  {
    title: 'Gestión de proveedores',
    href: '/proveedores',
    icon: Users,
  },
  {
    title: 'Órdenes de Compra',
    href: '/ordenes-de-compra',
    icon: ShoppingCart,
  },
  {
    title: 'Facturación',
    href: '/facturas',
    icon: FileText,
  },
   {
    title: 'Pagos',
    href: '/pagos',
    icon: CreditCard,
  },
  {
    title: 'Mensajería',
    href: '/mensajeria',
    icon: MessageSquare,
  },
  {
    title: 'Notificaciones',
    href: '/notificaciones',
    icon: Bell,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];
