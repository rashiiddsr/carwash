import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import {
  EXTRA_VEHICLE_PLATINUM_FEE,
  getMembershipTier,
  MEMBERSHIP_TIERS,
  MembershipTierKey,
} from '../../lib/membership';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';

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
  const [transactionPreview, setTransactionPreview] = useState<{
    tier: MembershipTierKey;
    total: number;
    months: number;
    extraVehicles: number;
  } | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['users', 'customers'],
    queryFn: () => api.users.getAll('CUSTOMER'),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      durationMonths: 1,
      extraVehicles: 0,
      membership: 'BRONZE',
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedMembership = watch('membership');
  const durationMonths = watch('durationMonths');
  const extraVehicles = watch('extraVehicles');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'customer', selectedCustomerId],
    queryFn: () => api.vehicles.getAll({ customerId: selectedCustomerId }),
    enabled: Boolean(selectedCustomerId),
  });

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
    return { tier, platinumExtra, total, monthlyTotal };
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
      setTransactionPreview({
        tier: pricing.tier.key,
        total: pricing.total,
        months: durationMonths,
        extraVehicles,
      });
      showSuccess('Transaksi membership berhasil dibuat');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal membuat transaksi');
    },
  });

  const onSubmit = (data: FormValues) => {
    createMembership.mutate(data);
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pembelian Membership</h1>
        <p className="text-gray-600 mt-1">
          Membership berlaku per mobil, default Basic. Upgrade dilakukan melalui kasir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <select
                {...register('customerId')}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kendaraan
              </label>
              <select
                {...register('vehicleId')}
                disabled={!selectedCustomerId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
              >
                <option value="">Pilih kendaraan</option>
                {vehicles.map((vehicle) => (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paket Membership
              </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durasi (bulan)
                </label>
                <input
                  {...register('durationMonths', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {errors.durationMonths && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.durationMonths.message}
                  </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  Rp149.000 per kendaraan tambahan per bulan.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={createMembership.isPending}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-60"
            >
              {createMembership.isPending ? 'Menyimpan...' : 'Buat Transaksi Membership'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ringkasan Harga</h2>
            <p className="text-sm text-gray-600">
              Harga dihitung per bulan sesuai durasi.
            </p>
          </div>
          <div className="space-y-3 text-sm">
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
            <div className="flex items-center justify-between">
              <span>Durasi</span>
              <span className="font-medium">{durationMonths || 1} bulan</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>

          {transactionPreview && (
            <div className="border-t border-gray-100 pt-4 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">Transaksi siap diproses</p>
              <p>Tier: {getMembershipTier(transactionPreview.tier).label}</p>
              <p>Durasi: {transactionPreview.months} bulan</p>
              {transactionPreview.extraVehicles > 0 && (
                <p>Tambahan kendaraan: {transactionPreview.extraVehicles} unit</p>
              )}
              <p>Total transaksi: {formatCurrency(transactionPreview.total)}</p>
              <p className="text-xs text-gray-400">
                Dibuat pada {formatDateTime(new Date().toISOString())}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
