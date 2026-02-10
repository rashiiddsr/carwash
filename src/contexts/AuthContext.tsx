import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (nextUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = authApi.getToken();
      const savedUser = authApi.getUser();

      if (savedToken && savedUser) {
        try {
          const { user: verifiedUser } = await authApi.verifyToken(savedToken);
          setUser(verifiedUser);
          setToken(savedToken);
        } catch {
          authApi.clearAuth();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    const response = await authApi.login(phone, password);
    authApi.saveAuth(response.token, response.user);
    setUser(response.user);
    setToken(response.token);
  };

  const logout = () => {
    authApi.clearAuth();
    setUser(null);
    setToken(null);
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
    if (token) {
      authApi.saveAuth(token, nextUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
