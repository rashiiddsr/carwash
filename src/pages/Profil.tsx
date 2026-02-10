import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import { UserCircle, Phone, Calendar, Shield } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export function Profil() {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError, ToastComponent } = useToast();
  const userId = user?.id;
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPassword] = useState('');

  const roleLabels = {
    ADMIN: 'Administrator',
    KARYAWAN: 'Karyawan',
    CUSTOMER: 'Customer',
  };

  const updateProfileMutation = useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error('User tidak ditemukan');
      }
      return api.users.update(userId, { name, phone });
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      showSuccess('Profil berhasil diperbarui');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal memperbarui profil');
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error('User tidak ditemukan');
      }
      return api.users.resetPassword(userId, password);
    },
    onSuccess: () => {
      setPassword('');
      showSuccess('Password berhasil diperbarui');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal memperbarui password');
    },
  });

  const handleUpdateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showError('Nama dan nomor HP wajib diisi');
      return;
    }

    updateProfileMutation.mutate();
  };

  const handleUpdatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      showError('Password baru wajib diisi');
      return;
    }

    updatePasswordMutation.mutate();
  };

  if (!user) return null;

  const isCustomer = user.role === 'CUSTOMER';

  return (
    <div className="space-y-6">
      {ToastComponent}

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

      {isCustomer ? (
        <>
          <form
            onSubmit={handleUpdateProfile}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Ubah Profil</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </form>

          <form
            onSubmit={handleUpdatePassword}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Ganti Password</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti"
                className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={updatePasswordMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {updatePasswordMutation.isPending ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </form>
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Informasi</h3>
          <p className="text-sm text-blue-800">
            Untuk mengubah data profil Anda, silakan hubungi administrator.
          </p>
        </div>
      )}
    </div>
  );
}
