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
};

export type Notification = {
  id: number;
  type: 'warning' | 'success' | 'error' | 'info';
  title: string;
  description: string;
  time: string;
  tag: string;
  read: boolean;
};

export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};
