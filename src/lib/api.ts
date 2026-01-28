import { supabase } from './supabase';
import { authApi } from './auth';

export async function apiCall<T>(
  fn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await fn();
  if (error) {
    throw new Error(error.message || 'An error occurred');
  }
  if (!data) {
    throw new Error('No data returned');
  }
  return data;
}

export function getAuthHeaders() {
  const token = authApi.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const api = {
  users: {
    async getAll(role?: string) {
      let query = supabase
        .from('users')
        .select('id, name, phone, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (role) {
        query = query.eq('role', role);
      }

      return apiCall(() => query);
    },

    async create(data: { name: string; phone: string; password: string; role: string }) {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      return response.json();
    },

    async update(id: string, data: { name: string; phone: string }) {
      return apiCall(() =>
        supabase.from('users').update(data).eq('id', id)
          .select('id, name, phone, role, created_at, updated_at').single()
      );
    },

    async resetPassword(id: string, newPassword: string) {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/users/${id}/reset-password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }

      return response.json();
    },

    async delete(id: string) {
      return apiCall(() => supabase.from('users').delete().eq('id', id));
    },
  },

  categories: {
    async getAll(activeOnly = false) {
      let query = supabase
        .from('categories')
        .select('*')
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      return apiCall(() => query);
    },

    async create(data: { name: string; price: number }) {
      return apiCall(() =>
        supabase.from('categories').insert(data).select().single()
      );
    },

    async update(id: string, data: { name: string; price: number }) {
      return apiCall(() =>
        supabase.from('categories').update(data).eq('id', id).select().single()
      );
    },

    async toggleActive(id: string, isActive: boolean) {
      return apiCall(() =>
        supabase.from('categories').update({ is_active: isActive }).eq('id', id).select().single()
      );
    },

    async delete(id: string) {
      return apiCall(() => supabase.from('categories').delete().eq('id', id));
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
    }) {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          customer:customer_id(id, name, phone),
          category:category_id(id, name, price),
          employee:employee_id(id, name, phone)
        `)
        .order('created_at', { ascending: false });

      if (filters?.date) {
        query = query.eq('trx_date', filters.date);
      }
      if (filters?.startDate && filters?.endDate) {
        query = query.gte('trx_date', filters.startDate).lte('trx_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      return apiCall(() => query);
    },

    async getById(id: string) {
      return apiCall(() =>
        supabase
          .from('transactions')
          .select(`
            *,
            customer:customer_id(id, name, phone),
            category:category_id(id, name, price),
            employee:employee_id(id, name, phone)
          `)
          .eq('id', id)
          .single()
      );
    },

    async create(data: {
      trx_date: string;
      customer_id?: string | null;
      category_id: string;
      car_brand: string;
      plate_number: string;
      employee_id: string;
      price: number;
      notes?: string | null;
    }) {
      return apiCall(() =>
        supabase.from('transactions').insert(data).select(`
          *,
          customer:customer_id(id, name, phone),
          category:category_id(id, name, price),
          employee:employee_id(id, name, phone)
        `).single()
      );
    },

    async update(id: string, data: {
      customer_id?: string | null;
      category_id?: string;
      car_brand?: string;
      plate_number?: string;
      employee_id?: string;
      price?: number;
      notes?: string | null;
    }) {
      return apiCall(() =>
        supabase.from('transactions').update(data).eq('id', id).select(`
          *,
          customer:customer_id(id, name, phone),
          category:category_id(id, name, price),
          employee:employee_id(id, name, phone)
        `).single()
      );
    },

    async updateStatus(id: string, status: string) {
      return apiCall(() =>
        supabase.from('transactions').update({ status }).eq('id', id).select(`
          *,
          customer:customer_id(id, name, phone),
          category:category_id(id, name, price),
          employee:employee_id(id, name, phone)
        `).single()
      );
    },

    async delete(id: string) {
      return apiCall(() => supabase.from('transactions').delete().eq('id', id));
    },
  },
};
