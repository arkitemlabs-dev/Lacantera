import type { LucideIcon } from 'lucide-react';

export type SupplierStatus = 'active' | 'pending' | 'attention' | 'inactive' | 'review';
export type SupplierType = 'supplies' | 'services' | 'leasing' | 'transport';

export type Supplier = {
  id: string;
  name: string;
  taxId: string;
  contactEmail: string;
  contactName?: string;
  status: SupplierStatus;
  type: SupplierType;
  registrationDate: string;
  spent: number;
  trend: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  entryDate: string;
  status: 'Aprobada' | 'En Revisión' | 'Rechazada' | 'Pagada';
  actionable: boolean;
  purchaseOrderId: string;
};

export type PurchaseOrderStatus = 'Pendiente' | 'Completa' | 'Atrasada' | 'Cancelada';

export type PurchaseOrder = {
  id: string;
  name: string;
  supplierName: string;
  emissionDate: string;
  status: PurchaseOrderStatus;
  amount: number;
  deliveryDate: string;
  area: string;
  invoice?: string;
  createdBy: string;
  budget: number;
};

export type PaymentStatus = 'Completo' | 'Realizado en espera de complemento' | 'Programado' | 'Cancelado';

export type Payment = {
  id: string;
  invoiceId: string;
  supplierName: string;
  amount: number;
  executionDate: string;
  status: PaymentStatus;
  method: 'Transferencia' | 'Tarjeta de Crédito';
  paymentProof: boolean;
  paymentComplement: boolean;
};

export type Notification = {
  id: number;
  type: 'new_supplier' | 'doc_update' | 'invoice_status';
  title: string;
  description: string;
  date: string;
  read: boolean;
};

export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};
