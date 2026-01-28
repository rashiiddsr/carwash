import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { TrendingUp, CheckCircle } from 'lucide-react';

function ProgressStepper({ status }: { status: string }) {
  const steps = [
    { key: 'QUEUED', label: 'Antri' },
    { key: 'WASHING', label: 'Dicuci' },
    { key: 'FINISHING', label: 'Finishing' },
    { key: 'DONE', label: 'Selesai' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                index <= currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentIndex ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            <p
              className={`mt-2 text-xs font-medium ${
                index <= currentIndex ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              {step.label}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 flex-1 mx-2 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ProgresCustomer() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'customer', user?.id, statusFilter],
    queryFn: () =>
      api.transactions.getAll({
        customerId: user?.id,
        status: statusFilter || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Progres Cucian</h1>
        <p className="text-gray-600 mt-1">Pantau progres cucian mobil Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">Semua Status</option>
          <option value="QUEUED">Antri</option>
          <option value="WASHING">Sedang Dicuci</option>
          <option value="FINISHING">Finishing</option>
          <option value="DONE">Selesai</option>
        </select>
      </div>

      <div>
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Tidak ada transaksi</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {transaction.car_brand}
                      </h3>
                      <p className="text-sm text-gray-600 font-mono mt-1">
                        {transaction.plate_number}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-sm font-medium ${
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
                        ? 'Sedang Dicuci'
                        : transaction.status === 'FINISHING'
                        ? 'Finishing'
                        : 'Selesai'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">Tanggal</p>
                      <p className="font-medium">{formatDateTime(transaction.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kategori</p>
                      <p className="font-medium">{transaction.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Harga</p>
                      <p className="font-medium">{formatCurrency(transaction.price)}</p>
                    </div>
                  </div>

                  <ProgressStepper status={transaction.status} />
                </div>

                {transaction.notes && (
                  <div className="px-6 py-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-1">Catatan:</p>
                    <p className="text-sm text-gray-900">{transaction.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
