import type { Supplier, Invoice, Notification, NavItem } from '@/lib/types';
import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Building,
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

export const suppliers: Supplier[] = [
  { id: '1', name: 'Aceros del Norte S.A. de C.V.', contactName: 'Juan Pérez', contactEmail: 'contacto@acerosnorte.com', status: 'active', registrationDate: '15/01/2023', spent: 120500, trend: 12 },
  { id: '2', name: 'Logística Express Mexicana', contactName: 'Maria Garcia', contactEmail: 'ventas@materialesabc.com', status: 'active', registrationDate: '22/03/2023', spent: 75000, trend: -5 },
  { id: '3', name: 'Componentes Electrónicos Globales', contactName: 'Carlos López', contactEmail: 'info@constructorarapida.dev', status: 'inactive', registrationDate: '01/06/2023', spent: 250000, trend: 8 },
  { id: '4', name: 'Plásticos Industriales del Sureste', contactName: 'Ana Martinez', contactEmail: 'soporte@lallave.com', status: 'active', registrationDate: '19/08/2023', spent: 45000, trend: 20 },
  { id: '5', name: 'Suministros Industriales de la Costa', contactName: 'Laura Sanchez', contactEmail: 'laura.s@suministros.com', status: 'attention', registrationDate: '05/02/2024', spent: 0, trend: 0 },
  { id: '6', name: 'Transportes Rápidos del Sur', contactName: 'Miguel Hernandez', contactEmail: 'miguel.h@transportes.com', status: 'pending', registrationDate: '12/03/2024', spent: 0, trend: 0 },
];

export const invoices: Invoice[] = [
  { id: 'INV-001', invoiceNumber: 'INV-001', supplierName: 'Aceros del Norte S.A. de C.V.', amount: 25500.00, entryDate: '01/07/2024', status: 'Aprobada', actionable: false },
  { id: 'INV-002', invoiceNumber: 'INV-002', supplierName: 'Logística Express Mexicana', amount: 12300.50, entryDate: '03/07/2024', status: 'En Revisión', actionable: true },
  { id: 'INV-003', invoiceNumber: 'INV-003', supplierName: 'Componentes Electrónicos Globales', amount: 8750.00, entryDate: '05/07/2024', status: 'Pagada', actionable: false },
  { id: 'INV-004', invoiceNumber: 'INV-004', supplierName: 'Plásticos Industriales del Sureste', amount: 4200.00, entryDate: '06/07/2024', status: 'Rechazada', actionable: false },
  { id: 'INV-005', invoiceNumber: 'INV-005', supplierName: 'Aceros del Norte S.A. de C.V.', amount: 31000.00, entryDate: '08/07/2024', status: 'En Revisión', actionable: true },
];

export const notifications: Notification[] = [
    {
      id: 1,
      type: 'warning',
      title: 'Documento por vencer',
      description:
        'Estimado PROV-001, uno de sus documentos está próximo a vencer. Por favor, revise la sección de documentos para más detalles.',
      time: 'Hace 5 minutos',
      tag: 'Documento por vencer',
      read: false,
    },
    {
      id: 2,
      type: 'success',
      title: 'Pago Aplicado',
      description: 'Se ha aplicado un pago a su cuenta de proveedor PROV-001.',
      time: 'Hace 20 minutos',
      tag: 'Pago aplicado',
      read: false,
    },
    {
      id: 3,
      type: 'error',
      title: 'Factura Rechazada - ID PROV-001',
      description:
        'Su factura ha sido rechazada. Por favor, revise los detalles en el portal y realice las correcciones necesarias para PROV-001.',
      time: 'Hace 35 minutos',
      tag: 'Factura rechazada',
      read: true,
    },
    {
      id: 4,
      type: 'info',
      title: 'Nueva Alerta Automática',
      description:
        'Se ha generado una nueva alerta automática para PROV-001. Revise su portal de proveedor para más detalles.',
      time: 'Hace 50 minutos',
      tag: 'Alerta automática',
      read: true,
    },
    {
      id: 5,
      type: 'warning',
      title: 'Próximo vencimiento de documento',
      description:
        'Tu documento está próximo a vencer. Por favor, revisa tus documentos en el portal para evitar interrupciones en tus operaciones.',
      time: 'Hace 65 minutos',
      tag: 'Documento por vencer',
      read: true,
    },
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
