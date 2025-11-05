
import type { Supplier, Invoice, Notification, NavItem, PurchaseOrder, Payment } from '@/lib/types';
import {
  Home,
  Users,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Building,
  ShoppingCart,
  CreditCard,
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

export const suppliers: Supplier[] = [
  { id: '1', name: 'Aceros del Norte S.A. de C.V.', taxId: 'ANO010203XYZ', contactName: 'Juan Pérez', contactEmail: 'contacto@acerosnorte.com', status: 'active', type: 'supplies', registrationDate: '15/01/2023', spent: 120500, trend: 12 },
  { id: '2', name: 'Logística Express Mexicana', taxId: 'LEM040506ABC', contactName: 'Maria Garcia', contactEmail: 'ventas@materialesabc.com', status: 'active', type: 'transport', registrationDate: '22/03/2023', spent: 75000, trend: -5 },
  { id: '3', name: 'Componentes Electrónicos Globales', taxId: 'CEG070809DEF', contactName: 'Carlos López', contactEmail: 'info@constructorarapida.dev', status: 'inactive', type: 'supplies', registrationDate: '01/06/2023', spent: 250000, trend: 8 },
  { id: '4', name: 'Arrendamientos y Maquinaria Pesada', taxId: 'AMP101112GHI', contactName: 'Ana Martinez', contactEmail: 'soporte@lallave.com', status: 'active', type: 'leasing', registrationDate: '19/08/2023', spent: 45000, trend: 20 },
  { id: '5', name: 'Servicios de Consultoría Integral', taxId: 'SCI131415JKL', contactName: 'Laura Sanchez', contactEmail: 'laura.s@suministros.com', status: 'attention', type: 'services', registrationDate: '05/02/2024', spent: 0, trend: 0 },
  { id: '6', name: 'Transportes Rápidos del Sur', taxId: 'TRS161718MNO', contactName: 'Miguel Hernandez', contactEmail: 'miguel.h@transportes.com', status: 'pending', type: 'transport', registrationDate: '12/03/2024', spent: 0, trend: 0 },
  { id: '7', name: 'Suministros Industriales de la Costa', taxId: 'SIC192021PQR', contactName: 'Elena Gómez', contactEmail: 'elena.g@sicosta.com', status: 'review', type: 'supplies', registrationDate: '25/04/2024', spent: 0, trend: 0 },
];

export const invoices: Invoice[] = [
  { id: 'INV-001', purchaseOrderIds: ['OC-128'], invoiceNumber: 'FACT-001', supplierName: 'Aceros del Norte S.A. de C.V.', amount: 25500.00, entryDate: '01/07/2024', status: 'Pagada', actionable: false },
  { id: 'INV-002', purchaseOrderIds: ['OC-127'], invoiceNumber: 'FACT-002', supplierName: 'Logística Express Mexicana', amount: 12300.50, entryDate: '03/07/2024', status: 'Pendiente pago', actionable: false },
  { id: 'INV-003', purchaseOrderIds: ['OC-126'], invoiceNumber: 'FACT-003', supplierName: 'Componentes Electrónicos Globales', amount: 8750.00, entryDate: '05/07/2024', status: 'Pagada', actionable: false },
  { id: 'INV-004', purchaseOrderIds: ['OC-125'], invoiceNumber: 'FACT-004', supplierName: 'Arrendamientos y Maquinaria Pesada', amount: 4200.00, entryDate: '06/07/2024', status: 'Rechazada', actionable: false },
  { id: 'INV-005', purchaseOrderIds: ['OC-124', 'OC-123'], invoiceNumber: 'FACT-005', supplierName: 'Aceros del Norte S.A. de C.V.', amount: 31000.00, entryDate: '08/07/2024', status: 'En Revisión', actionable: true },
];

export const payments: Payment[] = [
    { id: 'PAY-001', invoiceIds: ['FACT-001'], supplierName: 'Aceros del Norte S.A. de C.V.', amount: 25500.00, executionDate: '15/07/2024', status: 'Completo', method: 'Transferencia', paymentComplement: true, paymentReceipt: true },
    { id: 'PAY-002', invoiceIds: ['FACT-003'], supplierName: 'Componentes Electrónicos Globales', amount: 8750.00, executionDate: '18/07/2024', status: 'Pendiente complemento', method: 'Transferencia', paymentComplement: false, paymentReceipt: true },
    { id: 'PAY-003', invoiceIds: ['FACT-002'], supplierName: 'Logística Express Mexicana', amount: 12300.50, executionDate: '20/07/2024', status: 'Pendiente complemento', method: 'Transferencia', paymentComplement: false, paymentReceipt: false },
    { id: 'PAY-004', invoiceIds: ['FACT-005'], supplierName: 'Aceros del Norte S.A. de C.V.', amount: 31000.00, executionDate: '22/07/2024', status: 'En Revisión', method: 'Transferencia', paymentComplement: true, paymentReceipt: true },
    { id: 'PAY-005', invoiceIds: ['FACT-004'], supplierName: 'Arrendamientos y Maquinaria Pesada', amount: 4200.00, executionDate: '23/07/2024', status: 'Rechazada', method: 'Transferencia', paymentComplement: false, paymentReceipt: false },
    { id: 'PAY-006', invoiceIds: ['FACT-A', 'FACT-B'], supplierName: 'Servicios de Consultoría Integral', amount: 15000.00, executionDate: '25/07/2024', status: 'Completo', method: 'Transferencia', paymentComplement: true, paymentReceipt: true },
];

export const purchaseOrders: PurchaseOrder[] = [
    { id: 'OC-128', name: 'Material de oficina', supplierName: 'Aceros del Norte S.A. de C.V.', emissionDate: '2024-07-20', status: 'Pendiente', amount: 1500.00, deliveryDate: '2024-07-30', area: 'Administración', invoice: undefined, createdBy: 'Ana Lopez', budget: 2000, company: 'La Cantera Desarrollos Mineros' },
    { id: 'OC-127', name: 'Equipo de seguridad', supplierName: 'Logística Express Mexicana', emissionDate: '2024-07-18', status: 'Completa', amount: 8500.50, deliveryDate: '2024-07-25', area: 'Operaciones', invoice: 'INV-005', createdBy: 'Carlos Vera', budget: 10000, company: 'La Cantera Desarrollos Mineros' },
    { id: 'OC-126', name: 'Refacciones para maquinaria', supplierName: 'Componentes Electrónicos Globales', emissionDate: '2024-07-15', status: 'Pendiente', amount: 25000.00, deliveryDate: '2024-07-22', area: 'Mantenimiento', invoice: undefined, createdBy: 'Maria Garcia', budget: 25000, company: 'La Cantera Desarrollos Mineros' },
    { id: 'OC-125', name: 'Servicio de catering', supplierName: 'Servicios de Consultoría Integral', emissionDate: '2024-07-12', status: 'Cancelada', amount: 5000.00, deliveryDate: '2024-07-14', area: 'Eventos', invoice: undefined, createdBy: 'Juan Pérez', budget: 5000, company: 'La Cantera Desarrollos Mineros' },
    { id: 'OC-124', name: 'Herramientas manuales', supplierName: 'Suministros Industriales de la Costa', emissionDate: '2024-07-10', status: 'Completa', amount: 3200.75, deliveryDate: '2024-07-18', area: 'Taller', invoice: 'INV-004', createdBy: 'Pedro Gomez', budget: 4000, company: 'La Cantera Desarrollos Mineros' },
    { id: 'OC-123', name: 'Material de construcción', supplierName: 'Aceros del Norte S.A. de C.V.', emissionDate: '2024-07-09', status: 'Completa', amount: 15000.00, deliveryDate: '2024-07-15', area: 'Construcción', invoice: 'INV-005', createdBy: 'Ana Lopez', budget: 15000, company: 'La Cantera Desarrollos Mineros' },
]

export const notifications: Notification[] = [
  {
    id: 1,
    type: 'new_supplier',
    title: 'Nuevo proveedor registrado',
    description: 'El proveedor "Aceros del Norte" ha completado su registro.',
    date: new Date().toISOString(),
    read: false,
    link: '/proveedores/1',
    tag: 'Proveedores',
  },
  {
    id: 2,
    type: 'doc_update',
    title: 'Documento por vencer',
    description: '"Logística Express" tiene un documento que vence en 15 días.',
    date: new Date().toISOString(),
    read: false,
    link: '/proveedores/2',
    tag: 'Documentos',
  },
  {
    id: 3,
    type: 'invoice_status',
    title: 'Factura Aprobada',
    description: 'La factura #INV-002 por $12,300.50 ha sido aprobada para pago.',
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    read: true,
    link: '/facturas?search=INV-002',
    tag: 'Facturación',
  },
  {
    id: 4,
    type: 'invoice_status',
    title: 'Factura Rechazada',
    description: 'La factura #INV-004 fue rechazada. Motivo: Conceptos no coinciden.',
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    read: true,
    link: '/facturas?search=INV-004',
    tag: 'Facturación',
  },
  {
    id: 5,
    type: 'new_message',
    title: 'Nuevo Mensaje',
    description: 'Tienes un nuevo mensaje de "Componentes Electrónicos Globales".',
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    read: false,
    link: '/mensajeria',
    tag: 'Mensajería',
  },
  {
    id: 6,
    type: 'payment_done',
    title: 'Pago Realizado',
    description: 'Se ha realizado el pago de la factura #INV-001.',
    date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    read: true,
    link: '/pagos?search=PAY-001',
    tag: 'Pagos',
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
