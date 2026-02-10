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

export interface Membership {
  id: string;
  vehicle_id: string;
  tier: 'BASIC' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM_VIP';
  starts_at: string;
  ends_at: string;
  duration_months: number;
  extra_vehicles: number;
  created_at: string;
  updated_at: string;
}

export interface PointEntry {
  id: string;
  customer_id: string;
  transaction_id: string;
  points: number;
  earned_at: string;
  expires_at: string;
  created_at: string;
  customer?: User | null;
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
