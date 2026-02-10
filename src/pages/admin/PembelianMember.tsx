import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Crown } from 'lucide-react';
import { api } from '../../lib/api';
import {
  EXTRA_VEHICLE_PLATINUM_FEE,
  getMembershipTier,
  MEMBERSHIP_TIERS,
  MembershipTierKey,
} from '../../lib/membership';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';

const formSchema = z.object({
  customerId: z.string().min(1, 'Customer wajib dipilih'),
  vehicleId: z.string().min(1, 'Kendaraan wajib dipilih'),
  membership: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM_VIP']),
  durationMonths: z.number().min(1, 'Minimal 1 bulan'),
  extraVehicles: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function PembelianMember() {
  const { showSuccess, showError, ToastComponent } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['users', 'customers'],
    queryFn: () => api.users.getAll('CUSTOMER'),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.vehicles.getAll(),
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['memberships', 'history', customerFilter],
    queryFn: () =>
      api.memberships.getAll({
        includeExpired: true,
        customerId: customerFilter || undefined,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      durationMonths: 1,
      extraVehicles: 0,
      membership: 'BRONZE',
      customerId: '',
      vehicleId: '',
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedMembership = watch('membership');
  const durationMonths = watch('durationMonths');
  const extraVehicles = watch('extraVehicles');

  const customerVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.customer_id === selectedCustomerId),
    [vehicles, selectedCustomerId]
  );

  const availableMemberships = useMemo(
    () => MEMBERSHIP_TIERS.filter((tier) => tier.key !== 'BASIC'),
    []
  );

  const pricing = useMemo(() => {
    const tier = getMembershipTier(selectedMembership as MembershipTierKey);
    const platinumExtra =
      tier.key === 'PLATINUM_VIP' ? extraVehicles * EXTRA_VEHICLE_PLATINUM_FEE : 0;
    const monthlyTotal = tier.price + platinumExtra;
    const total = monthlyTotal * (durationMonths || 1);
    return { tier, platinumExtra, total };
  }, [selectedMembership, extraVehicles, durationMonths]);

  const createMembership = useMutation({
    mutationFn: (data: FormValues) =>
      api.memberships.create({
        vehicle_id: data.vehicleId,
        tier: data.membership,
        duration_months: data.durationMonths,
        extra_vehicles: data.membership === 'PLATINUM_VIP' ? data.extraVehicles : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      showSuccess('Transaksi membership berhasil dibuat');
      setShowCreateModal(false);
      reset({
        durationMonths: 1,
        extraVehicles: 0,
        membership: 'BRONZE',
        customerId: '',
        vehicleId: '',
      });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal membuat transaksi');
    },
  });

  const onSubmit = (data: FormValues) => {
    createMembership.mutate(data);
  };

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pembelian Membership</h1>
          <p className="text-gray-600 mt-1">Kelola transaksi dan histori pembelian membership.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Pembelian
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter Customer</label>
        <select
          value={customerFilter}
          onChange={(event) => setCustomerFilter(event.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Semua customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.phone}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Histori Pembelian Membership</h2>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-10 text-center text-gray-600">Belum ada histori pembelian membership.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kendaraan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mulai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expired</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchases.map((purchase) => {
                  const vehicle = vehicleMap.get(purchase.vehicle_id);
                  const customer = vehicle ? customerMap.get(vehicle.customer_id) : undefined;
                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{customer?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {vehicle ? `${vehicle.car_brand} - ${vehicle.plate_number}` : purchase.vehicle_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {getMembershipTier(purchase.tier).label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(`${purchase.starts_at}T00:00:00`)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(`${purchase.ends_at}T00:00:00`)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{purchase.duration_months} bulan</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tambah Pembelian Membership"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
            <select
              {...register('customerId')}
              onChange={(event) => {
                setValue('customerId', event.target.value);
                setValue('vehicleId', '');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Pilih customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-xs text-red-500 mt-1">{errors.customerId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kendaraan</label>
            <select
              {...register('vehicleId')}
              disabled={!selectedCustomerId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
            >
              <option value="">Pilih kendaraan</option>
              {customerVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.car_brand} - {vehicle.plate_number}
                </option>
              ))}
            </select>
            {errors.vehicleId && (
              <p className="text-xs text-red-500 mt-1">{errors.vehicleId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paket Membership</label>
            <select
              {...register('membership')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {availableMemberships.map((tier) => (
                <option key={tier.key} value={tier.key}>
                  {tier.label} - {formatCurrency(tier.price)}/bulan
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durasi (bulan)</label>
              <input
                {...register('durationMonths', { valueAsNumber: true })}
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {errors.durationMonths && (
                <p className="text-xs text-red-500 mt-1">{errors.durationMonths.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tambahan kendaraan (Platinum VIP)
              </label>
              <input
                {...register('extraVehicles', { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Rp149.000 per kendaraan tambahan per bulan.</p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <Crown className="w-4 h-4" />
              Ringkasan Harga
            </div>
            <div className="flex items-center justify-between">
              <span>Paket {pricing.tier.label}</span>
              <span className="font-medium">{formatCurrency(pricing.tier.price)}</span>
            </div>
            {pricing.tier.key === 'PLATINUM_VIP' && (
              <div className="flex items-center justify-between">
                <span>Tambahan kendaraan</span>
                <span className="font-medium">{formatCurrency(pricing.platinumExtra)}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 flex items-center justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMembership.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-60"
            >
              {createMembership.isPending ? 'Menyimpan...' : 'Simpan Pembelian'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
