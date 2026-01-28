import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { Car, History, Clock } from 'lucide-react';

export function CustomerDashboard() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'customer', user?.id],
    queryFn: () => api.transactions.getAll({ customerId: user?.id }),
  });

  const activeTransactions = transactions.filter((t) => t.status !== 'DONE');
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Customer</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Mobil Sedang Dicuci</p>
              <p className="text-3xl font-bold text-blue-600">{activeTransactions.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Transaksi</p>
              <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
              <History className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Mobil Sedang Dicuci</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : activeTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Tidak ada mobil yang sedang dicuci</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{transaction.car_brand}</h3>
                      <p className="text-sm text-gray-600 font-mono">{transaction.plate_number}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'QUEUED'
                          ? 'bg-gray-100 text-gray-700'
                          : transaction.status === 'WASHING'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {transaction.status === 'QUEUED'
                        ? 'Antri'
                        : transaction.status === 'WASHING'
                        ? 'Sedang Dicuci'
                        : 'Finishing'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Kategori</p>
                      <p className="font-medium">{transaction.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Harga</p>
                      <p className="font-medium">{formatCurrency(transaction.price)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Terakhir</h2>
        </div>
        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada riwayat transaksi</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kendaraan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kategori
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
                      {formatDateTime(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{transaction.car_brand}</div>
                        <div className="text-gray-500 text-xs font-mono">{transaction.plate_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.category?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'DONE'
                            ? 'bg-green-100 text-green-700'
                            : transaction.status === 'WASHING'
                            ? 'bg-blue-100 text-blue-700'
                            : transaction.status === 'FINISHING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {transaction.status === 'QUEUED'
                          ? 'Antri'
                          : transaction.status === 'WASHING'
                          ? 'Dicuci'
                          : transaction.status === 'FINISHING'
                          ? 'Finishing'
                          : 'Selesai'}
                      </span>
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
