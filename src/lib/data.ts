import type { Supplier, Invoice, Notification, NavItem } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
} from 'lucide-react';

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Proveedores',
    href: '/proveedores',
    icon: Users,
  },
  {
    title: 'Facturas',
    href: '/facturas',
    icon: FileText,
  },
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];

export const suppliers: Supplier[] = [
  { id: '1', name: 'Aceros del Norte', contactEmail: 'contacto@acerosnorte.com', status: 'active', registrationDate: '2023-01-15', spent: 120500, trend: 12 },
  { id: '2', name: 'Materiales ABC', contactEmail: 'ventas@materialesabc.com', status: 'pending', registrationDate: '2023-02-20', spent: 75000, trend: -5 },
  { id: '3', name: 'Constructora Rápida', contactEmail: 'info@constructorarapida.dev', status: 'active', registrationDate: '2023-03-10', spent: 250000, trend: 8 },
  { id: '4', name: 'Ferretería La Llave', contactEmail: 'soporte@lallave.com', status: 'attention', registrationDate: '2023-04-05', spent: 45000, trend: 20 },
  { id: '5', name: 'Suministros Eléctricos LUX', contactEmail: 'cotiza@lux.com', status: 'active', registrationDate: '2023-05-12', spent: 98000, trend: -2 },
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
    { month: "Enero", "Aceros del Norte": 4000, "Materiales ABC": 2400, "Constructora Rápida": 1800 },
    { month: "Febrero", "Aceros del Norte": 3000, "Materiales ABC": 1398, "Constructora Rápida": 2210 },
    { month: "Marzo", "Aceros del Norte": 2000, "Materiales ABC": 9800, "Constructora Rápida": 2290 },
    { month: "Abril", "Aceros del Norte": 2780, "Materiales ABC": 3908, "Constructora Rápida": 2000 },
    { month: "Mayo", "Aceros del Norte": 1890, "Materiales ABC": 4800, "Constructora Rápida": 2181 },
    { month: "Junio", "Aceros del Norte": 2390, "Materiales ABC": 3800, "Constructora Rápida": 2500 },
    { month: "Julio", "Aceros del Norte": 3490, "Materiales ABC": 4300, "Constructora Rápida": 2100 },
];
