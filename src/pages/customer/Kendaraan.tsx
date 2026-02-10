import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, Edit, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Vehicle } from '../../types';
import { getMembershipTier, MembershipTierKey } from '../../lib/membership';
import { formatCurrency } from '../../lib/utils';

const vehicleSchema = z.object({
  car_brand: z.string().min(1, 'Tipe kendaraan wajib diisi'),
  plate_number: z.string().min(1, 'Nomor plat wajib diisi'),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export function DaftarKendaraanCustomer() {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', 'customer', user?.id],
    queryFn: () => api.vehicles.getAll({ customerId: user?.id }),
    enabled: Boolean(user?.id),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships', 'customer', user?.id],
    queryFn: () => api.memberships.getAll({ customerId: user?.id }),
    enabled: Boolean(user?.id),
  });

  const membershipByVehicle = new Map<string, MembershipTierKey>(
    memberships.map((membership) => [membership.vehicle_id, membership.tier])
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: VehicleFormData) =>
      api.vehicles.create({
        customer_id: user?.id ?? '',
        car_brand: data.car_brand,
        plate_number: data.plate_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Kendaraan berhasil ditambahkan');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan kendaraan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VehicleFormData }) =>
      api.vehicles.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      showSuccess('Kendaraan berhasil diupdate');
      setShowEditModal(false);
      setSelectedVehicle(null);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate kendaraan');
    },
  });

  const deleteMutation = useMutation({
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
    reset({ car_brand: '', plate_number: '' });
    setShowAddModal(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    reset({ car_brand: vehicle.car_brand, plate_number: vehicle.plate_number });
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus kendaraan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: VehicleFormData) => {
    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daftar Kendaraan</h1>
          <p className="text-gray-600 mt-1">Kelola kendaraan member yang terdaftar</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Kendaraan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada kendaraan terdaftar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
            {vehicles.map((vehicle) => {
              const membershipKey = membershipByVehicle.get(vehicle.id) ?? 'BASIC';
              const tier = getMembershipTier(membershipKey);

              return (
                <div
                  key={vehicle.id}
                  className="border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vehicle.car_brand}</h3>
                      <p className="text-sm text-gray-600 font-mono">{vehicle.plate_number}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {tier.label}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-xs text-gray-500">
                            {formatCurrency(tier.price)}/bulan
                          </span>
                        )}
                        {tier.key === 'BASIC' && (
                          <span className="text-xs text-gray-500">
                            Default, upgrade via kasir
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Benefit Membership
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {tier.highlights.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.note && (
                      <p className="text-xs text-gray-500 mt-3">{tier.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Kendaraan">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Kendaraan <span className="text-red-500">*</span>
            </label>
            <input
              {...register('car_brand')}
              type="text"
              placeholder="Contoh: Toyota Avanza"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.car_brand && (
              <p className="text-red-500 text-xs mt-1">{errors.car_brand.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Plat <span className="text-red-500">*</span>
            </label>
            <input
              {...register('plate_number')}
              type="text"
              placeholder="Contoh: B 1234 XYZ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.plate_number && (
              <p className="text-red-500 text-xs mt-1">{errors.plate_number.message}</p>
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
          setSelectedVehicle(null);
        }}
        title="Edit Kendaraan"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Kendaraan <span className="text-red-500">*</span>
            </label>
            <input
              {...register('car_brand')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.car_brand && (
              <p className="text-red-500 text-xs mt-1">{errors.car_brand.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Plat <span className="text-red-500">*</span>
            </label>
            <input
              {...register('plate_number')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.plate_number && (
              <p className="text-red-500 text-xs mt-1">{errors.plate_number.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedVehicle(null);
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
    </div>
  );
}
