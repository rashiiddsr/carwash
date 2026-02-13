import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Filter, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, formatTime, getTodayDate } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { Expense, ExpenseCategory } from '../../types';
import { useToast } from '../../hooks/useToast';

const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Tanggal wajib diisi'),
  amount: z.number().positive('Nominal wajib lebih dari 0'),
  category: z.enum(['KASBON', 'OPERASIONAL', 'LAINNYA']),
  notes: z.string().trim().min(1, 'Catatan wajib diisi'),
  employee_id: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.category === 'KASBON' && !data.employee_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['employee_id'],
      message: 'Karyawan wajib dipilih untuk kasbon',
    });
  }
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const CATEGORY_OPTIONS = [
  { value: 'KASBON', label: 'Kasbon' },
  { value: 'OPERASIONAL', label: 'Operasional' },
  { value: 'LAINNYA', label: 'Lainnya' },
] as const;

export function Pengeluaran() {
  const today = getTodayDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [showAddModal, setShowAddModal] = useState(false);

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', startDate, endDate, categoryFilter],
    queryFn: () => api.expenses.getAll({ startDate, endDate, category: categoryFilter }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users', 'KARYAWAN'],
    queryFn: () => api.users.getAll('KARYAWAN'),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: today,
      amount: 0,
      category: 'OPERASIONAL',
      notes: '',
      employee_id: '',
    },
  });


  const selectedCategory = watch('category');
  const selectedEmployeeId = watch('employee_id');

  const { data: weeklyKasbonSummary } = useQuery({
    queryKey: ['expenses', 'weekly-kasbon-summary', selectedEmployeeId],
    queryFn: () => api.expenses.getWeeklyKasbonSummary(selectedEmployeeId || ''),
    enabled: selectedCategory === 'KASBON' && Boolean(selectedEmployeeId),
  });
  const totalExpense = useMemo(
    () => expenses.reduce((sum: number, item: Expense) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => api.expenses.create({
      expense_date: today,
      amount: Number(data.amount),
      category: data.category,
      notes: data.notes,
      employee_id: data.category === 'KASBON' ? data.employee_id || null : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'dashboard', 'all'] });
      showSuccess('Pengeluaran berhasil ditambahkan');
      setShowAddModal(false);
      reset({
        expense_date: today,
        amount: 0,
        category: 'OPERASIONAL',
        notes: '',
        employee_id: '',
      });
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan pengeluaran');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pengeluaran</h1>
          <p className="text-gray-600 mt-1">Catat kasbon dan pengeluaran operasional</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengeluaran
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filter</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-700">Total Pengeluaran ({startDate} s/d {endDate})</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Semua Kategori</option>
              {CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" /></div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-gray-600">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            Belum ada pengeluaran pada rentang ini.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense: Expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{formatDate(expense.expense_date)} {formatTime(expense.created_at)}</div>
                    <div className="text-xs text-gray-500">{expense.expense_code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{CATEGORY_OPTIONS.find((item) => item.value === expense.category)?.label || expense.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{expense.employee?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{expense.notes}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600">{formatCurrency(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Pengeluaran" size="md">
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" value={today} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            <input type="hidden" {...register('expense_date')} value={today} />
            {errors.expense_date && <p className="text-red-500 text-xs mt-1">{errors.expense_date.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Tanggal pengeluaran dikunci ke hari ini.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Pengeluaran</label>
            <input type="number" min={1} step="0.01" {...register('amount', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Pengeluaran</label>
            <select {...register('category')} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          {selectedCategory === 'KASBON' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
              <select {...register('employee_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Pilih Karyawan</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
              {errors.employee_id && <p className="text-red-500 text-xs mt-1">{errors.employee_id.message}</p>}

              {weeklyKasbonSummary && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
                  <p>
                    <span className="font-semibold">Limit kasbon minggu ini (30%): </span>
                    {formatCurrency(weeklyKasbonSummary.max_kasbon)}
                  </p>
                  <p>
                    <span className="font-semibold">Kasbon terpakai minggu ini: </span>
                    {formatCurrency(weeklyKasbonSummary.kasbon_taken)}
                  </p>
                  <p>
                    <span className="font-semibold">Sisa limit kasbon: </span>
                    {formatCurrency(Math.max(weeklyKasbonSummary.max_kasbon - weeklyKasbonSummary.kasbon_taken, 0))}
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Wajib)</label>
            <textarea rows={3} {...register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Batal</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60">{createMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </Modal>

      {ToastComponent}
    </div>
  );
}
