import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import { UserCircle, Phone, Calendar, Shield } from 'lucide-react';

export function Profil() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabels = {
    ADMIN: 'Administrator',
    KARYAWAN: 'Karyawan',
    CUSTOMER: 'Customer',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">Informasi akun Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600"></div>
        <div className="px-8 pb-8">
          <div className="flex items-start gap-6 -mt-12">
            <div className="w-24 h-24 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
              <UserCircle className="w-16 h-16 text-blue-600" />
            </div>
            <div className="flex-1 pt-14">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{roleLabels[user.role]}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Nomor HP</p>
                <p className="font-semibold text-gray-900 font-mono">{user.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-semibold text-gray-900">{roleLabels[user.role]}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tanggal Bergabung</p>
                <p className="font-semibold text-gray-900">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Informasi</h3>
        <p className="text-sm text-blue-800">
          Untuk mengubah data profil Anda, silakan hubungi administrator.
        </p>
      </div>
    </div>
  );
}
