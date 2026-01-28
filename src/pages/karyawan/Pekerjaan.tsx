import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { getTodayDate, formatCurrency, formatTime } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Briefcase, Filter } from 'lucide-react';

export function PekerjaanSaya() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState('');

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'employee', user?.id, selectedDate, statusFilter],
    queryFn: () =>
      api.transactions.getAll({
        employeeId: user?.id,
        date: selectedDate,
        status: statusFilter || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.transactions.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Status berhasil diupdate');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate status');
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pekerjaan Saya</h1>
        <p className="text-gray-600 mt-1">Kelola pekerjaan yang ditugaskan kepada Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Semua Status</option>
              <option value="QUEUED">Antri</option>
              <option value="WASHING">Dicuci</option>
              <option value="FINISHING">Finishing</option>
              <option value="DONE">Selesai</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada pekerjaan untuk tanggal ini</p>
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
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kendaraan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.customer?.name || 'Umum'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.category?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{transaction.car_brand}</div>
                        <div className="text-gray-500 text-xs font-mono">{transaction.plate_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'QUEUED'
                            ? 'bg-gray-100 text-gray-700'
                            : transaction.status === 'WASHING'
                            ? 'bg-blue-100 text-blue-700'
                            : transaction.status === 'FINISHING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={transaction.status}
                        onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                        className="text-xs font-medium px-2 py-1 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="QUEUED">Antri</option>
                        <option value="WASHING">Dicuci</option>
                        <option value="FINISHING">Finishing</option>
                        <option value="DONE">Selesai</option>
                      </select>
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
