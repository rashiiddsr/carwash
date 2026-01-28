import { LoginResponse, User } from '../types';

const AUTH_TOKEN_KEY = 'royal_carwash_token';
const AUTH_USER_KEY = 'royal_carwash_user';

export const authApi = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone, password }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    return data;
  },

  async verifyToken(token: string): Promise<{ user: User }> {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return response.json();
  },

  saveAuth(token: string, user: User) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser(): User | null {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },
};
