import type { Supplier, Invoice, Notification, NavItem } from '@/lib/types';
import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Bell,
  Settings,
} from 'lucide-react';

export const navItems: NavItem[] = [
  {
    title: 'Inicio',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Gestión de proveedores',
    href: '/proveedores',
    icon: Users,
  },
  {
    title: 'Facturas',
    href: '/facturas',
    icon: FileText,
  },
  {
    title: 'Mensajería',
    href: '#',
    icon: MessageSquare,
  },
  {
    title: 'Notificaciones',
    href: '#',
    icon: Bell,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];

export const suppliers: Supplier[] = [
  { id: '1', name: 'Aceros del Norte S.A. de C.V.', contactName: 'Juan Pérez', contactEmail: 'contacto@acerosnorte.com', status: 'active', registrationDate: '15/01/2023', spent: 120500, trend: 12 },
  { id: '2', name: 'Logística Express Mexicana', contactName: 'Maria Garcia', contactEmail: 'ventas@materialesabc.com', status: 'active', registrationDate: '22/03/2023', spent: 75000, trend: -5 },
  { id: '3', name: 'Componentes Electrónicos Globales', contactName: 'Carlos López', contactEmail: 'info@constructorarapida.dev', status: 'inactive', registrationDate: '01/06/2023', spent: 250000, trend: 8 },
  { id: '4', name: 'Plásticos Industriales del Sureste', contactName: 'Ana Martinez', contactEmail: 'soporte@lallave.com', status: 'active', registrationDate: '19/08/2023', spent: 45000, trend: 20 },
];

export const invoices: Invoice[] = [
  { id: 'INV-001', invoiceNumber: '2023-001', supplierName: 'Aceros del Norte', amount: 25000, dueDate: '2023-08-01', status: 'approved' },
  { id: 'INV-002', invoiceNumber: '2023-002', supplierName: 'Materiales ABC', amount: 15000, dueDate: '2023-08-05', status: 'pending' },
  { id: 'INV-003', invoiceNumber: '2023-003', supplierName: 'Constructora Rápida', amount: 75000, dueDate: '2023-07-20', status: 'paid' },
  { id: 'INV-004', invoiceNumber: '2023-004', supplierName: 'Ferretería La Llave', amount: 5000, dueDate: '2023-08-10', status: 'rejected' },
  { id: 'INV-005', invoiceNumber: '2023-005', supplierName: 'Suministros Eléctricos LUX', amount: 12000, dueDate: '2023-08-15', status: 'pending' },
  { id: 'INV-006', invoiceNumber: '2023-006', supplierName: 'Aceros del Norte', amount: 30000, dueDate: '2023-08-20', status: 'pending' },
];

export const notifications: Notification[] = [
  { id: '1', type: 'new_supplier', title: 'Nueva Registración de Proveedor', description: 'Constructora Rápida se ha registrado.', date: 'Hace 2 horas', read: false },
  { id: '2', type: 'invoice_status', title: 'Cambio de Estado de Factura', description: 'Factura #INV-001 ha sido aprobada.', date: 'Hace 5 horas', read: false },
  { id: '3', type: 'doc_update', title: 'Actualización de Documentos', description: 'Aceros del Norte actualizó su RFC.', date: 'Hace 1 día', read: true },
  { id: '4', type: 'new_supplier', title: 'Nueva Registración de Proveedor', description: 'Ferretería La Llave se ha registrado.', date: 'Hace 2 días', read: true },
];

export const spendingData = [
  { month: 'Enero', 'Aceros del Norte': 2000, 'Materiales ABC': 1500, 'Constructora Rápida': 1000 },
  { month: 'Febrero', 'Aceros del Norte': 2500, 'Materiales ABC': 1800, 'Constructora Rápida': 1200 },
  { month: 'Marzo', 'Aceros del Norte': 3000, 'Materiales ABC': 2200, 'Constructora Rápida': 1500 },
  { month: 'Abril', 'Aceros del Norte': 2800, 'Materiales ABC': 2000, 'Constructora Rápida': 1300 },
  { month: 'Mayo', 'Aceros del Norte': 3200, 'Materiales ABC': 2500, 'Constructora Rápida': 1800 },
  { month: 'Junio', 'Aceros del Norte': 3500, 'Materiales ABC': 2800, 'Constructora Rápida': 2000 },
  { month: 'Julio', 'Aceros del Norte': 4000, 'Materiales ABC': 3000, 'Constructora Rápida': 2200 },
];
