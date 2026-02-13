import { authApi } from './auth';
import {
  Category,
  CompanyProfile,
  Membership,
  PointEntry,
  Transaction,
  TransactionPricingPreview,
  User,
  Vehicle,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Missing API base URL');
}

const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
};

async function request<T>(path: string, options: RequestInit = {}, params?: Record<string, string | number | boolean | undefined>) {
  const token = authApi.getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(buildUrl(path, params), {
    ...options,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const api = {
  users: {
    async getAll(role?: string): Promise<User[]> {
      return request<User[]>('/users', {}, { role });
    },

    async create(data: { name: string; phone: string; password: string; role: string }) {
      return request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: { name: string; phone: string }) {
      return request<User>(`/users/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    },

    async resetPassword(id: string, newPassword: string) {
      return request<{ success: boolean }>(`/users/${id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
    },

    async delete(id: string) {
      return request<{ success: boolean }>(`/users/${id}`,
        {
          method: 'DELETE',
        }
      );
    },
  },

  categories: {
    async getAll(activeOnly = false): Promise<Category[]> {
      return request<Category[]>('/categories', {}, { activeOnly });
    },

    async create(data: { name: string; price: number }) {
      return request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: { name: string; price: number }) {
      return request<Category>(`/categories/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    },

    async toggleActive(id: string, isActive: boolean) {
      return request<Category>(`/categories/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
    },

    async delete(id: string) {
      return request<{ success: boolean }>(`/categories/${id}`,
        {
          method: 'DELETE',
        }
      );
    },
  },

  transactions: {
    async getAll(filters?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      categoryId?: string;
      employeeId?: string;
      customerId?: string;
    }): Promise<Transaction[]> {
      return request<Transaction[]>('/transactions', {}, {
        date: filters?.date,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status,
        categoryId: filters?.categoryId,
        employeeId: filters?.employeeId,
        customerId: filters?.customerId,
      });
    },

    async getById(id: string): Promise<Transaction> {
      return request<Transaction>(`/transactions/${id}`);
    },

    async previewPricing(data: {
      trx_date: string;
      customer_id?: string | null;
      vehicle_id?: string | null;
      category_id: string;
      plate_number: string;
      rain_guarantee_free?: boolean;
    }): Promise<TransactionPricingPreview> {
      return request<TransactionPricingPreview>('/transactions/preview-pricing', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async create(data: {
      trx_date: string;
      customer_id?: string | null;
      vehicle_id?: string | null;
      category_id: string;
      car_brand: string;
      plate_number: string;
      employee_id: string;
      notes?: string | null;
      rain_guarantee_free?: boolean;
    }): Promise<Transaction> {
      return request<Transaction>('/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: {
      customer_id?: string | null;
      vehicle_id?: string | null;
      category_id?: string;
      car_brand?: string;
      plate_number?: string;
      employee_id?: string;
      notes?: string | null;
      rain_guarantee_free?: boolean;
    }): Promise<Transaction> {
      return request<Transaction>(`/transactions/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
    },

    async updateStatus(id: string, status: string): Promise<Transaction> {
      return request<Transaction>(`/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    async delete(id: string) {
      return request<{ success: boolean }>(`/transactions/${id}`,
        {
          method: 'DELETE',
        }
      );
    },
  },

  vehicles: {
    async getAll(filters?: { customerId?: string }): Promise<Vehicle[]> {
      return request<Vehicle[]>('/vehicles', {}, { customerId: filters?.customerId });
    },

    async create(data: { customer_id: string; car_brand: string; plate_number: string }) {
      return request<Vehicle>('/vehicles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: string, data: { car_brand: string; plate_number: string }) {
      return request<Vehicle>(`/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string) {
      return request<{ success: boolean }>(`/vehicles/${id}`, {
        method: 'DELETE',
      });
    },
  },

  memberships: {
    async getAll(filters?: { customerId?: string; vehicleId?: string; includeExpired?: boolean }): Promise<Membership[]> {
      return request<Membership[]>('/memberships', {}, {
        customerId: filters?.customerId,
        vehicleId: filters?.vehicleId,
        includeExpired: filters?.includeExpired,
      });
    },

    async create(data: {
      vehicle_id: string;
      tier: Membership['tier'];
      duration_months: number;
      starts_at?: string;
      extra_vehicles?: number;
      extra_vehicle_ids?: string[];
    }) {
      return request<Membership>('/memberships', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  points: {
    async getAll(filters?: { customerId?: string }): Promise<PointEntry[]> {
      return request<PointEntry[]>('/points', {}, { customerId: filters?.customerId });
    },
  },

  company: {
    async get(): Promise<CompanyProfile> {
      return request<CompanyProfile>('/company-profile');
    },

    async update(data: {
      company_name: string;
      address: string;
      phone: string;
      logo_file?: {
        file_name: string;
        mime_type: string;
        base64_data: string;
        size: number;
      } | null;
    }): Promise<CompanyProfile> {
      return request<CompanyProfile>('/company-profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },
};
