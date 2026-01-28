import { LoginResponse, User } from '../types';

const AUTH_TOKEN_KEY = 'royal_carwash_token';
const AUTH_USER_KEY = 'royal_carwash_user';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Missing API base URL');
}

export const authApi = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    const response = await fetch(
      new URL('/auth/login', API_BASE_URL),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      new URL('/auth/verify', API_BASE_URL),
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
