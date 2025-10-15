import type { LucideIcon } from 'lucide-react';

export type Supplier = {
  id: string;
  name: string;
  contactEmail: string;
  contactName?: string;
  status: 'active' | 'pending' | 'attention' | 'inactive';
  registrationDate: string;
  spent: number;
  trend: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: 'approved' | 'pending' | 'rejected' | 'paid';
};

export type Notification = {
  id: string;
  type: 'new_supplier' | 'doc_update' | 'invoice_status' | 'message';
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
