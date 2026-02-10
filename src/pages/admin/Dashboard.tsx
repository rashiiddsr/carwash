import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getTodayDate, formatCurrency, formatTime, formatDate } from '../../lib/utils';
import { calculatePointSummary, getDaysRemaining, POINT_EXPIRY_DAYS } from '../../lib/points';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Droplets,
  CheckCircle,
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    QUEUED: { label: 'Antri', class: 'bg-gray-100 text-gray-700' },
    WASHING: { label: 'Dicuci', class: 'bg-blue-100 text-blue-700' },
    DONE: { label: 'Selesai', class: 'bg-green-100 text-green-700' },
  };

  const { label, class: className } = config[status as keyof typeof config] || config.QUEUED;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function AdminDashboard() {
  const today = getTodayDate();
  const todayDate = new Date();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', today],
    queryFn: () => api.transactions.getAll({ date: today }),
  });

  const { data: pointEntries = [], isLoading: isLoadingPoints } = useQuery({
    queryKey: ['points', 'admin'],
    queryFn: () => api.points.getAll(),
  });

  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + t.price, 0);
  const queuedCount = transactions.filter((t) => t.status === 'QUEUED').length;
  const washingCount = transactions.filter((t) => t.status === 'WASHING').length;
  const doneCount = transactions.filter((t) => t.status === 'DONE').length;

  const recentTransactions = transactions.slice(0, 5);
  const pointSummary = calculatePointSummary(pointEntries, todayDate);
  const expiringSoonCount = pointSummary.activeEntries
    .filter((entry) => getDaysRemaining(entry.expiresAt, todayDate) <= 30)
    .reduce((sum, entry) => sum + entry.points, 0);
  const upcomingPoints = pointSummary.activeEntries.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-1">Ringkasan aktivitas hari ini</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Transaksi"
          value={totalTransactions}
          icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Total Omzet"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Antri"
          value={queuedCount}
          icon={<Clock className="w-6 h-6 text-gray-600" />}
          color="bg-gray-50"
        />
        <StatCard
          title="Sedang Dicuci"
          value={washingCount}
          icon={<Droplets className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Selesai"
          value={doneCount}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pantauan Poin Member</h2>
            <p className="text-sm text-gray-600 mt-1">
              Masa berlaku poin dihitung {POINT_EXPIRY_DAYS} hari per transaksi selesai.
            </p>
          </div>
        </div>
        <div className="p-6">
          {isLoadingPoints ? (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <p className="text-xs text-emerald-700 mb-1">Total Poin Aktif</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {pointSummary.totalPoints.toFixed(1).replace('.0', '')}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-xs text-amber-700 mb-1">Poin Expired 30 Hari</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {expiringSoonCount.toFixed(1).replace('.0', '')}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Expired Terdekat</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {pointSummary.nextExpiryDate
                      ? formatDate(pointSummary.nextExpiryDate.toISOString())
                      : '-'}
                  </p>
                  {pointSummary.nextExpiryDate && (
                    <p className="text-xs text-slate-500 mt-1">
                      {pointSummary.nextExpiryCount.toFixed(1).replace('.0', '')} poin akan kadaluarsa
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Poin yang Akan Kadaluarsa Terdekat
                </h3>
                {upcomingPoints.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">
                    Belum ada poin aktif dalam periode ini
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingPoints.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {entry.customerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.points.toFixed(1).replace('.0', '')} poin · Didapat{' '}
                            {formatDate(entry.earnedAt.toISOString())}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Expired</p>
                          <p className="text-sm font-semibold text-rose-600">
                            {formatDate(entry.expiresAt.toISOString())}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getDaysRemaining(entry.expiresAt, todayDate)} hari lagi
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Transaksi Terbaru</h2>
        </div>
        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada transaksi hari ini</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kendaraan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Karyawan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customer?.name || 'Umum'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{transaction.car_brand}</div>
                        <div className="text-gray-500 text-xs">{transaction.plate_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.category?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.employee?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={transaction.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
