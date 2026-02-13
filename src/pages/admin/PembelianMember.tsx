import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Crown, Printer } from 'lucide-react';
import { api } from '../../lib/api';
import {
  EXTRA_VEHICLE_PLATINUM_FEE,
  getMembershipTier,
  MEMBERSHIP_TIERS,
  MembershipTierKey,
} from '../../lib/membership';
import { formatCurrency, formatDate, getTodayDate, toSafeNumber } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { printMembershipReceipt } from '../../lib/receipt';

const formSchema = z.object({
  customerId: z.string().min(1, 'Customer wajib dipilih'),
  vehicleId: z.string().min(1, 'Kendaraan wajib dipilih'),
  membership: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM_VIP']),
  durationMonths: z.number().min(1, 'Minimal 1 bulan'),
  extraVehicles: z.number().min(0),
  extraVehicleIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function PembelianMember() {
  const { showSuccess, showError, ToastComponent } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const today = getTodayDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

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

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.company.get(),
  });

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((purchase) => {
        const purchaseDate = purchase.created_at.slice(0, 10);
        return purchaseDate >= startDate && purchaseDate <= endDate;
      }),
    [purchases, startDate, endDate]
  );

  const totalOmzetMembership = filteredPurchases.reduce(
    (sum, purchase) => sum + toSafeNumber(purchase.total_price),
    0
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      durationMonths: 1,
      extraVehicles: 0,
      membership: 'BRONZE',
      customerId: '',
      vehicleId: '',
      extraVehicleIds: [],
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedMembership = watch('membership');
  const durationMonths = watch('durationMonths');
  const selectedVehicleId = watch('vehicleId');
  const extraVehicles = watch('extraVehicles');
  const extraVehicleIds = watch('extraVehicleIds');


  const { data: activeMemberships = [] } = useQuery({
    queryKey: ['memberships', 'active', selectedVehicleId],
    queryFn: () =>
      api.memberships.getAll({
        vehicleId: selectedVehicleId || undefined,
      }),
    enabled: Boolean(selectedVehicleId),
  });

  const activeMembership = activeMemberships[0] || null;

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
        extra_vehicle_ids: data.membership === 'PLATINUM_VIP' ? data.extraVehicleIds : [],
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
        extraVehicleIds: [],
      });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal membuat transaksi');
    },
  });

  const onSubmit = (data: FormValues) => {
    if (data.membership === 'PLATINUM_VIP' && data.extraVehicles !== data.extraVehicleIds.length) {
      showError('Pilih kendaraan tambahan sesuai jumlah tambahan kendaraan.');
      return;
    }

    if (
      activeMembership &&
      activeMembership.tier !== 'BASIC' &&
      !window.confirm(
        `Kendaraan ini masih memiliki membership ${getMembershipTier(activeMembership.tier).label} aktif sampai ${formatDate(`${activeMembership.ends_at}T00:00:00`)}. Lanjutkan? Membership aktif sebelumnya akan ditukar dengan paket baru.`
      )
    ) {
      return;
    }

    createMembership.mutate(data);
  };

  const selectableExtraVehicles = useMemo(
    () => customerVehicles.filter((vehicle) => vehicle.id !== selectedVehicleId),
    [customerVehicles, selectedVehicleId]
  );

  const toggleExtraVehicleSelection = (vehicleId: string) => {
    const selectedIds = getValues('extraVehicleIds');
    const exists = selectedIds.includes(vehicleId);
    const updated = exists
      ? selectedIds.filter((id) => id !== vehicleId)
      : [...selectedIds, vehicleId];
    setValue('extraVehicleIds', updated);
    setValue('extraVehicles', updated.length);
  };

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );

  const handlePrintReceipt = (purchase: (typeof purchases)[number]) => {
    if (!companyProfile) {
      showError('Profil perusahaan belum tersedia.');
      return;
    }

    const vehicle = vehicleMap.get(purchase.vehicle_id);
    const customer = vehicle ? customerMap.get(vehicle.customer_id) : undefined;

    try {
      printMembershipReceipt({
        membership: purchase,
        company: companyProfile,
        vehicle,
        customerName: customer?.name,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Gagal mencetak struk membership');
    }
  };

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter Customer</label>
            <select
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Semua customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Omzet Membership ({startDate} s/d {endDate})</p>
            <p className="text-xs text-emerald-600">{filteredPurchases.length} pembelian</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalOmzetMembership)}</p>
        </div>
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
          ) : filteredPurchases.length === 0 ? (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Transaksi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => {
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
                      <td className="px-6 py-4 text-sm text-gray-700 font-mono">{purchase.transaction_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <button
                          onClick={() => handlePrintReceipt(purchase)}
                          className="p-1 hover:bg-green-50 text-green-600 rounded transition"
                          title="Cetak struk membership 58mm"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
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
                setValue('extraVehicles', 0);
                setValue('extraVehicleIds', []);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
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


          {activeMembership && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 mt-2">
              Kendaraan ini masih memiliki membership{' '}
              <span className="font-semibold">{getMembershipTier(activeMembership.tier).label}</span>{' '}
              aktif hingga {formatDate(`${activeMembership.ends_at}T00:00:00`)}. Jika lanjut beli,
              membership aktif sebelumnya akan ditukar dengan paket baru.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paket Membership</label>
            <select
              {...register('membership')}
              onChange={(event) => {
                const selectedTier = event.target.value as FormValues['membership'];
                setValue('membership', selectedTier);
                if (selectedTier !== 'PLATINUM_VIP') {
                  setValue('extraVehicles', 0);
                  setValue('extraVehicleIds', []);
                }
              }}
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
                disabled={selectedMembership !== 'PLATINUM_VIP'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Rp149.000 per kendaraan tambahan per bulan.</p>
            </div>
          </div>

          {selectedMembership === 'PLATINUM_VIP' && extraVehicles > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih kendaraan tambahan Platinum VIP
              </label>
              <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {selectableExtraVehicles.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Tidak ada kendaraan lain yang bisa dipilih sebagai tambahan.
                  </div>
                ) : (
                  selectableExtraVehicles.map((vehicle) => (
                    <label key={vehicle.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={extraVehicleIds.includes(vehicle.id)}
                        onChange={() => toggleExtraVehicleSelection(vehicle.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        {vehicle.car_brand} - {vehicle.plate_number}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs mt-1 text-gray-500">
                Terpilih {extraVehicleIds.length} dari {extraVehicles} kendaraan tambahan.
              </p>
            </div>
          )}

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
