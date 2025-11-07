export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  costPrice: number; // Preço de custo do produto
  stock: number;
  photo?: string; // URL or base64 string
  status: 'active' | 'inactive';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  cpf: string;
  status: 'active' | 'inactive';
}

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCostPrice: number; // Custo no momento da venda
}

export type PaymentMethod = 'cash' | 'credit';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue';

export interface Installment {
  id: string;
  saleId: string;
  amount: number;
  dueDate: Date;
  status: InstallmentStatus;
}

export interface Sale {
  id: string;
  customerId: string;
  items: SaleItem[];
  total: number;
  totalCost: number; // Custo total da venda
  paymentMethod: PaymentMethod;
  installments: Installment[];
  date: Date;
  firstDueDate?: Date;
  status: 'completed' | 'canceled';
}

export type Page = 'dashboard' | 'products' | 'sales' | 'customers' | 'reports' | 'settings';

export type FilterType = 'today' | 'week' | 'month' | 'to_date' | 'custom';

export type ReportType = 'sales' | 'profit' | 'overdue' | 'sold_products' | 'low_stock' | 'canceled_sales';