import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getTodayDate, formatCurrency, formatTime } from '../../lib/utils';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Droplets,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Transaction } from '../../types';

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
    FINISHING: { label: 'Finishing', class: 'bg-yellow-100 text-yellow-700' },
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

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', today],
    queryFn: () => api.transactions.getAll({ date: today }),
  });

  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + t.price, 0);
  const queuedCount = transactions.filter((t) => t.status === 'QUEUED').length;
  const washingCount = transactions.filter((t) => t.status === 'WASHING').length;
  const finishingCount = transactions.filter((t) => t.status === 'FINISHING').length;
  const doneCount = transactions.filter((t) => t.status === 'DONE').length;

  const recentTransactions = transactions.slice(0, 5);

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
          title="Finishing"
          value={finishingCount}
          icon={<Sparkles className="w-6 h-6 text-yellow-600" />}
          color="bg-yellow-50"
        />
        <StatCard
          title="Selesai"
          value={doneCount}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
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
