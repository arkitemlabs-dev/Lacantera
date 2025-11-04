
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
  status: 'Pendiente pago' | 'En Revisión' | 'Rechazada' | 'Pagada';
  actionable: boolean;
  purchaseOrderIds: string[];
};

export type PurchaseOrderStatus = 'Pendiente' | 'Completa' | 'Cancelada';

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
  company: string;
};

export type PaymentStatus = 'Completo' | 'Pendiente complemento' | 'En Revisión' | 'Rechazada';

export type Payment = {
  id: string;
  invoiceId: string;
  supplierName: string;
  amount: number;
  executionDate: string;
  status: PaymentStatus;
  method: 'Transferencia' | 'Tarjeta de Crédito';
  paymentComplement: boolean;
};

export type NotificationType = 'new_supplier' | 'doc_update' | 'invoice_status' | 'new_message' | 'payment_done';

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  date: string; // ISO 8601 string
  read: boolean;
  link: string;
  tag: string;
};


export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};
