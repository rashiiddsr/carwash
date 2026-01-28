import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Users, Key } from 'lucide-react';
import { User } from '../../types';

const karyawanSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

type KaryawanFormData = z.infer<typeof karyawanSchema>;

export function Karyawan() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedKaryawan, setSelectedKaryawan] = useState<User | null>(null);

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: karyawans = [], isLoading } = useQuery({
    queryKey: ['users', 'KARYAWAN'],
    queryFn: () => api.users.getAll('KARYAWAN'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KaryawanFormData>({
    resolver: zodResolver(karyawanSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: KaryawanFormData) =>
      api.users.create({
        name: data.name,
        phone: data.phone,
        password: data.password || '123456',
        role: 'KARYAWAN',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Karyawan berhasil ditambahkan');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan karyawan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KaryawanFormData }) =>
      api.users.update(id, { name: data.name, phone: data.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Karyawan berhasil diupdate');
      setShowEditModal(false);
      setSelectedKaryawan(null);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate karyawan');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.users.resetPassword(id, password),
    onSuccess: () => {
      showSuccess('Password berhasil direset');
      setShowResetPasswordModal(false);
      setSelectedKaryawan(null);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal reset password');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Karyawan berhasil dihapus');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menghapus karyawan');
    },
  });

  const handleAdd = () => {
    reset({ name: '', phone: '', password: '' });
    setShowAddModal(true);
  };

  const handleEdit = (karyawan: User) => {
    setSelectedKaryawan(karyawan);
    reset({ name: karyawan.name, phone: karyawan.phone, password: '' });
    setShowEditModal(true);
  };

  const handleResetPassword = (karyawan: User) => {
    setSelectedKaryawan(karyawan);
    reset({ name: '', phone: '', password: '' });
    setShowResetPasswordModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus karyawan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: KaryawanFormData) => {
    if (selectedKaryawan) {
      updateMutation.mutate({ id: selectedKaryawan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onResetPassword = (data: KaryawanFormData) => {
    if (selectedKaryawan && data.password) {
      resetPasswordMutation.mutate({ id: selectedKaryawan.id, password: data.password });
    }
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-gray-600 mt-1">Kelola data karyawan</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Karyawan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : karyawans.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada data karyawan</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    No HP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tanggal Dibuat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {karyawans.map((karyawan) => (
                  <tr key={karyawan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {karyawan.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {karyawan.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(karyawan.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(karyawan)}
                          className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(karyawan)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(karyawan.id)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Karyawan">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Nama lengkap"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor HP <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="0812xxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="Minimal 6 karakter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedKaryawan(null);
        }}
        title="Edit Karyawan"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor HP <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedKaryawan(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedKaryawan(null);
        }}
        title="Reset Password"
      >
        <form onSubmit={handleSubmit(onResetPassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru <span className="text-red-500">*</span>
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="Minimal 6 karakter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowResetPasswordModal(false);
                setSelectedKaryawan(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={resetPasswordMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {resetPasswordMutation.isPending ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
