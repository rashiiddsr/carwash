import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Users, Key, Car } from 'lucide-react';
import { User, Vehicle } from '../../types';

const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const vehicleSchema = z.object({
  car_brand: z.string().min(1, 'Tipe kendaraan wajib diisi'),
  plate_number: z.string().min(1, 'Nomor plat wajib diisi'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export function Customer() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedCustomerForVehicles, setSelectedCustomerForVehicles] = useState<User | null>(null);

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['users', 'CUSTOMER'],
    queryFn: () => api.users.getAll('CUSTOMER'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const {
    register: registerVehicle,
    handleSubmit: handleSubmitVehicle,
    reset: resetVehicle,
    formState: { errors: vehicleErrors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormData) =>
      api.users.create({
        name: data.name,
        phone: data.phone,
        password: data.password || '123456',
        role: 'CUSTOMER',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Customer berhasil ditambahkan');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan customer');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerFormData }) =>
      api.users.update(id, { name: data.name, phone: data.phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Customer berhasil diupdate');
      setShowEditModal(false);
      setSelectedCustomer(null);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate customer');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.users.resetPassword(id, password),
    onSuccess: () => {
      showSuccess('Password berhasil direset');
      setShowResetPasswordModal(false);
      setSelectedCustomer(null);
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
      showSuccess('Customer berhasil dihapus');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menghapus customer');
    },
  });

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['vehicles', selectedCustomerForVehicles?.id],
    queryFn: () => api.vehicles.getAll({ customerId: selectedCustomerForVehicles?.id }),
    enabled: Boolean(selectedCustomerForVehicles?.id),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormData) =>
      api.vehicles.create({
        customer_id: selectedCustomerForVehicles?.id ?? '',
        car_brand: data.car_brand,
        plate_number: data.plate_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Kendaraan berhasil ditambahkan');
      resetVehicle({ car_brand: '', plate_number: '' });
      setSelectedVehicle(null);
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan kendaraan');
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VehicleFormData }) =>
      api.vehicles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Kendaraan berhasil diupdate');
      resetVehicle({ car_brand: '', plate_number: '' });
      setSelectedVehicle(null);
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate kendaraan');
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.vehicles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Kendaraan berhasil dihapus');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menghapus kendaraan');
    },
  });

  const handleAdd = () => {
    reset({ name: '', phone: '', password: '' });
    setShowAddModal(true);
  };

  const handleEdit = (customer: User) => {
    setSelectedCustomer(customer);
    reset({ name: customer.name, phone: customer.phone, password: '' });
    setShowEditModal(true);
  };

  const handleManageVehicles = (customer: User) => {
    setSelectedCustomerForVehicles(customer);
    setSelectedVehicle(null);
    resetVehicle({ car_brand: '', plate_number: '' });
    setShowVehicleModal(true);
  };

  const handleResetPassword = (customer: User) => {
    setSelectedCustomer(customer);
    reset({ name: '', phone: '', password: '' });
    setShowResetPasswordModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus customer ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    resetVehicle({ car_brand: vehicle.car_brand, plate_number: vehicle.plate_number });
  };

  const handleDeleteVehicle = (id: string) => {
    if (confirm('Yakin ingin menghapus kendaraan ini?')) {
      deleteVehicleMutation.mutate(id);
    }
  };

  const onSubmit = (data: CustomerFormData) => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onResetPassword = (data: CustomerFormData) => {
    if (selectedCustomer && data.password) {
      resetPasswordMutation.mutate({ id: selectedCustomer.id, password: data.password });
    }
  };

  const onSubmitVehicle = (data: VehicleFormData) => {
    if (selectedVehicle) {
      updateVehicleMutation.mutate({ id: selectedVehicle.id, data });
      return;
    }

    createVehicleMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Customer</h1>
          <p className="text-gray-600 mt-1">Kelola data customer</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Customer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada data customer</p>
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
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleManageVehicles(customer)}
                          className="p-1 hover:bg-green-50 text-green-600 rounded transition"
                          title="Kelola Kendaraan"
                        >
                          <Car className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(customer)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Customer">
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
          setSelectedCustomer(null);
        }}
        title="Edit Customer"
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
                setSelectedCustomer(null);
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
          setSelectedCustomer(null);
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
                setSelectedCustomer(null);
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

      <Modal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          setSelectedCustomerForVehicles(null);
          setSelectedVehicle(null);
        }}
        title={`Daftar Kendaraan ${selectedCustomerForVehicles?.name || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Kendaraan Terdaftar</h3>
            </div>
            <div className="overflow-x-auto">
              {isLoadingVehicles ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-6 text-center text-gray-600">Belum ada kendaraan terdaftar.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipe Kendaraan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nomor Plat
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{vehicle.car_brand}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {vehicle.plate_number}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditVehicle(vehicle)}
                              className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(vehicle.id)}
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

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              {selectedVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
            </h3>
            <form onSubmit={handleSubmitVehicle(onSubmitVehicle)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe Kendaraan <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerVehicle('car_brand')}
                  type="text"
                  placeholder="Contoh: Toyota Avanza"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {vehicleErrors.car_brand && (
                  <p className="text-red-500 text-xs mt-1">{vehicleErrors.car_brand.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Plat <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerVehicle('plate_number')}
                  type="text"
                  placeholder="Contoh: B 1234 XYZ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {vehicleErrors.plate_number && (
                  <p className="text-red-500 text-xs mt-1">
                    {vehicleErrors.plate_number.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                {selectedVehicle && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(null);
                      resetVehicle({ car_brand: '', plate_number: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {createVehicleMutation.isPending || updateVehicleMutation.isPending
                    ? 'Menyimpan...'
                    : selectedVehicle
                      ? 'Update'
                      : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
}
