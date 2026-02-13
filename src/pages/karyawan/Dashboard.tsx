import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { getTodayDate, formatCurrency, formatTime, formatDateISO } from '../../lib/utils';
import { Banknote, Briefcase, CheckCircle, Clock } from 'lucide-react';

const WAGE_BY_CATEGORY: Record<string, number> = {
  'small/city car': 15000,
  'suv/mpv': 16000,
  'suv/mvp': 16000,
  'big suv/double cabin': 17000,
  'big suv/double chain': 17000,
  'small bike': 6000,
  'medium bike': 7000,
  'large bike': 8000,
};

const PAID_CATEGORY_KEYS = [
  'small/city car',
  'suv/mpv',
  'big suv/double cabin',
  'small bike',
  'medium bike',
  'large bike',
] as const;

type PaidCategoryKey = (typeof PAID_CATEGORY_KEYS)[number];

function getWeekRange(date: Date): { start: string; end: string } {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  const day = localDate.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(localDate);
  monday.setDate(localDate.getDate() + offsetToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDateISO(monday),
    end: formatDateISO(sunday),
  };
}

function calculateWeeklyWageByCategory(categoryNames: string[]) {
  const counts: Record<PaidCategoryKey, number> = {
    'small/city car': 0,
    'suv/mpv': 0,
    'big suv/double cabin': 0,
    'small bike': 0,
    'medium bike': 0,
    'large bike': 0,
  };

  for (const categoryName of categoryNames) {
    const normalized = categoryName.trim().toLowerCase();
    if (normalized === 'suv/mvp') {
      counts['suv/mpv'] += 1;
      continue;
    }

    if (normalized === 'big suv/double chain') {
      counts['big suv/double cabin'] += 1;
      continue;
    }

    if (normalized in counts) {
      counts[normalized as PaidCategoryKey] += 1;
    }
  }

  const total = PAID_CATEGORY_KEYS.reduce((sum, key) => {
    return sum + counts[key] * WAGE_BY_CATEGORY[key];
  }, 0);

  return { counts, total };
}

const CATEGORY_LABELS: Record<PaidCategoryKey, string> = {
  'small/city car': 'Small/City Car',
  'suv/mpv': 'SUV/MPV',
  'big suv/double cabin': 'Big SUV/Double Cabin',
  'small bike': 'Small Bike',
  'medium bike': 'Medium Bike',
  'large bike': 'Large Bike',
};

export function KaryawanDashboard() {
  const { user } = useAuth();
  const today = getTodayDate();
  const weekRange = getWeekRange(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'employee', user?.id, today],
    queryFn: () => api.transactions.getAll({ employeeId: user?.id, date: today }),
  });

  const { data: weeklyTransactions = [], isLoading: isWeeklyLoading } = useQuery({
    queryKey: ['transactions', 'employee', 'weekly-wage', user?.id, weekRange.start, weekRange.end],
    queryFn: () =>
      api.transactions.getAll({
        employeeId: user?.id,
        startDate: weekRange.start,
        endDate: weekRange.end,
        status: 'DONE',
      }),
  });


  const { data: weeklyKasbonSummary } = useQuery({
    queryKey: ['expenses', 'employee', 'weekly-kasbon-summary', user?.id],
    queryFn: () => api.expenses.getWeeklyKasbonSummary(),
    enabled: Boolean(user?.id),
  });

  const totalJobs = transactions.length;
  const completedJobs = transactions.filter((t) => t.status === 'DONE').length;
  const activeJobs = transactions.filter((t) => t.status !== 'DONE');

  const weeklyCategories = weeklyTransactions.map((transaction) => transaction.category?.name ?? '');
  const realtimeWeeklyCategories = weeklyTransactions
    .filter((transaction) => transaction.trx_date <= today)
    .map((transaction) => transaction.category?.name ?? '');

  const weeklyWage = calculateWeeklyWageByCategory(weeklyCategories);
  const realtimeWeeklyWage = calculateWeeklyWageByCategory(realtimeWeeklyCategories);

  const kasbonLimit = weeklyKasbonSummary?.max_kasbon ?? (realtimeWeeklyWage.total * 0.3);
  const hasKasbonThisWeek = Boolean(weeklyKasbonSummary?.has_kasbon);
  const estimatedSalaryAfterKasbon = weeklyKasbonSummary?.estimated_salary_after_kasbon ?? realtimeWeeklyWage.total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Karyawan</h1>
        <p className="text-gray-600 mt-1">Selamat datang, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pekerjaan Hari Ini</p>
              <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Selesai</p>
              <p className="text-3xl font-bold text-green-600">{completedJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sedang Dikerjakan</p>
              <p className="text-3xl font-bold text-yellow-600">{activeJobs.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Gaji Mingguan (Senin-Minggu)</p>
              <p className="text-2xl font-bold text-emerald-600">
                {isWeeklyLoading ? '...' : formatCurrency(weeklyWage.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Realtime sampai hari ini:{' '}
                {isWeeklyLoading ? '...' : formatCurrency(realtimeWeeklyWage.total)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Rincian Gaji Minggu Berjalan</h2>
          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 w-fit">
            Periode {weekRange.start} s/d {weekRange.end}
          </span>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="text-left py-3">Kategori</th>
                  <th className="text-right py-3">Jumlah (Realtime)</th>
                  <th className="text-right py-3">Tarif</th>
                  <th className="text-right py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PAID_CATEGORY_KEYS.map((categoryKey) => {
                  const count = realtimeWeeklyWage.counts[categoryKey];
                  const rate = WAGE_BY_CATEGORY[categoryKey];
                  const subtotal = count * rate;

                  return (
                    <tr key={categoryKey} className="text-gray-800">
                      <td className="py-3 font-medium">{CATEGORY_LABELS[categoryKey]}</td>
                      <td className="py-3 text-right">{count}</td>
                      <td className="py-3 text-right">{formatCurrency(rate)}</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-100">
                  <td colSpan={3} className="py-4 text-right font-semibold text-gray-900">
                    Total Gaji Realtime
                  </td>
                  <td className="py-4 text-right font-bold text-emerald-700">
                    {formatCurrency(realtimeWeeklyWage.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Info Kasbon Mingguan</h2>
          <p className="text-sm text-gray-600 mt-1">Periode {weekRange.start} s/d {weekRange.end}</p>
        </div>
        <div className="p-6">
          {hasKasbonThisWeek ? (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-800">
              <p className="font-medium">Kasbon minggu ini sudah diambil.</p>
              <p className="text-sm mt-1">Estimasi gaji setelah potong kasbon: <span className="font-semibold">{formatCurrency(estimatedSalaryAfterKasbon)}</span></p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-emerald-800">
              <p className="font-medium">Batas kasbon minggu ini (30% dari gaji mingguan):</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(kasbonLimit)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Pekerjaan Aktif</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Semua pekerjaan hari ini sudah selesai</p>
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
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(job.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.customer?.name || 'Umum'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{job.car_brand}</div>
                        <div className="text-gray-500 text-xs font-mono">{job.plate_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.category?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(job.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'QUEUED'
                            ? 'bg-gray-100 text-gray-700'
                            : job.status === 'WASHING'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {job.status === 'QUEUED'
                          ? 'Antri'
                          : job.status === 'WASHING'
                          ? 'Dicuci'
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
