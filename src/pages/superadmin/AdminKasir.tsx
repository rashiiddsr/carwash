import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Users, Key } from 'lucide-react';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/utils';
import { User } from '../../types';

const adminKasirSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

type AdminKasirFormData = z.infer<typeof adminKasirSchema>;

export function AdminKasir() {
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  const queryClient = useQueryClient();
  const { showError, showSuccess, ToastComponent } = useToast();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['users', 'ADMIN'],
    queryFn: () => api.users.getAll('ADMIN'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminKasirFormData>({
    resolver: zodResolver(adminKasirSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: AdminKasirFormData) =>
      api.users.create({
        name: data.name,
        phone: data.phone,
        password: data.password || '123456',
        role: 'ADMIN',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Admin kasir berhasil ditambahkan');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => showError(error instanceof Error ? error.message : 'Gagal menambahkan admin kasir'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminKasirFormData }) =>
      api.users.update(id, { name: data.name, phone: data.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Admin kasir berhasil diupdate');
      setShowEditModal(false);
      setSelectedAdmin(null);
      reset();
    },
    onError: (error) => showError(error instanceof Error ? error.message : 'Gagal mengupdate admin kasir'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.users.resetPassword(id, password),
    onSuccess: () => {
      showSuccess('Password berhasil direset');
      setShowResetPasswordModal(false);
      setSelectedAdmin(null);
      reset();
    },
    onError: (error) => showError(error instanceof Error ? error.message : 'Gagal reset password'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Admin kasir berhasil dihapus');
    },
    onError: (error) => showError(error instanceof Error ? error.message : 'Gagal menghapus admin kasir'),
  });

  const onSubmit = (data: AdminKasirFormData) => {
    if (selectedAdmin) {
      updateMutation.mutate({ id: selectedAdmin.id, data });
      return;
    }

    createMutation.mutate(data);
  };

  const onResetPassword = (data: AdminKasirFormData) => {
    if (selectedAdmin && data.password) {
      resetPasswordMutation.mutate({ id: selectedAdmin.id, password: data.password });
    }
  };

  const openAddModal = () => {
    setSelectedAdmin(null);
    reset({ name: '', phone: '', password: '' });
    setShowAddModal(true);
  };

  const openEditModal = (admin: User) => {
    setSelectedAdmin(admin);
    reset({ name: admin.name, phone: admin.phone, password: '' });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (admin: User) => {
    setSelectedAdmin(admin);
    reset({ name: '', phone: '', password: '' });
    setShowResetPasswordModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus admin kasir ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Admin Kasir</h1>
          <p className="text-gray-600 mt-1">Kelola akun admin kasir</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Admin Kasir
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada data admin kasir</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nama</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Nomor HP</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Dibuat</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-t border-gray-100">
                  <td className="px-6 py-4 font-medium text-gray-900">{admin.name}</td>
                  <td className="px-6 py-4 text-gray-700 font-mono">{admin.phone}</td>
                  <td className="px-6 py-4 text-gray-700">{formatDate(admin.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openResetPasswordModal(admin)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(admin)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Admin Kasir"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input {...register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
            <input {...register('phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" {...register('password')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Admin Kasir">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input {...register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
            <input {...register('phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Menyimpan...' : 'Update'}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Reset Password Admin Kasir"
      >
        <form onSubmit={handleSubmit(onResetPassword)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <input type="password" {...register('password')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" disabled={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending ? 'Menyimpan...' : 'Reset Password'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
