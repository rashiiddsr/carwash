export type UserRole = 'ADMIN' | 'KARYAWAN' | 'CUSTOMER';
export type TransactionStatus = 'QUEUED' | 'WASHING' | 'FINISHING' | 'DONE';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  trx_date: string;
  customer_id: string | null;
  category_id: string;
  car_brand: string;
  plate_number: string;
  employee_id: string;
  price: number;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: User | null;
  category?: Category;
  employee?: User;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  car_brand: string;
  plate_number: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  queuedCount: number;
  washingCount: number;
  finishingCount: number;
  doneCount: number;
}
