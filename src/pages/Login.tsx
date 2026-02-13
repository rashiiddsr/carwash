import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { BrandLogo } from '../components/BrandLogo';

export function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError, ToastComponent } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(phone, password);
      const user = JSON.parse(localStorage.getItem('royal_carwash_user') || '{}');

      if (user.role === 'SUPERADMIN') {
        navigate('/superadmin/dashboard');
      } else if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'KARYAWAN') {
        navigate('/karyawan/dashboard');
      } else if (user.role === 'CUSTOMER') {
        navigate('/customer/dashboard');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      {ToastComponent}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <BrandLogo
              sizeClassName="w-16 h-16 rounded-full mb-4"
              iconClassName="w-8 h-8"
              textClassName="text-3xl font-bold text-gray-900"
            />
            <p className="text-gray-600 mt-2">Sistem Kasir POS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Nomor HP
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
