import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { getTodayDate, formatCurrency, formatTime } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit, Trash2, Eye, Filter, ShoppingCart } from 'lucide-react';
import { Transaction } from '../../types';

const transactionSchema = z.object({
  customer_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  category_id: z.string().min(1, 'Kategori wajib dipilih'),
  car_brand: z.string().min(1, 'Merk mobil wajib diisi'),
  plate_number: z.string().min(1, 'Nomor polisi wajib diisi'),
  employee_id: z.string().min(1, 'Karyawan wajib dipilih'),
  notes: z.string().optional().nullable(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

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

export function KasirHarian() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const queryClient = useQueryClient();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', selectedDate, statusFilter, categoryFilter, employeeFilter],
    queryFn: () =>
      api.transactions.getAll({
        date: selectedDate,
        status: statusFilter || undefined,
        categoryId: categoryFilter || undefined,
        employeeId: employeeFilter || undefined,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => api.categories.getAll(true),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users', 'KARYAWAN'],
    queryFn: () => api.users.getAll('KARYAWAN'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['users', 'CUSTOMER'],
    queryFn: () => api.users.getAll('CUSTOMER'),
  });

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });

  const selectedCategoryId = watch('category_id');
  const selectedCustomerId = watch('customer_id');
  const selectedVehicleId = watch('vehicle_id');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const previousCustomerId = useRef<string | null>(null);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', selectedCustomerId],
    queryFn: () => api.vehicles.getAll({ customerId: selectedCustomerId || undefined }),
    enabled: Boolean(selectedCustomerId),
  });

  useEffect(() => {
    const normalizedCustomerId = selectedCustomerId || '';

    if (previousCustomerId.current === null) {
      previousCustomerId.current = normalizedCustomerId;
      return;
    }

    if (previousCustomerId.current !== normalizedCustomerId) {
      setValue('vehicle_id', '');
      setValue('car_brand', '');
      setValue('plate_number', '');
      previousCustomerId.current = normalizedCustomerId;
    }
  }, [selectedCustomerId, setValue]);

  useEffect(() => {
    if (!selectedVehicleId) {
      return;
    }

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    if (selectedVehicle) {
      setValue('car_brand', selectedVehicle.car_brand);
      setValue('plate_number', selectedVehicle.plate_number);
    }
  }, [selectedVehicleId, setValue, vehicles]);

  useEffect(() => {
    if (!selectedCustomerId || selectedVehicleId || vehicles.length === 0) {
      return;
    }

    const currentCarBrand = getValues('car_brand');
    const currentPlateNumber = getValues('plate_number');
    const matchedVehicle = vehicles.find(
      (vehicle) =>
        vehicle.car_brand === currentCarBrand && vehicle.plate_number === currentPlateNumber
    );

    if (matchedVehicle) {
      setValue('vehicle_id', matchedVehicle.id);
    }
  }, [getValues, selectedCustomerId, selectedVehicleId, setValue, vehicles]);

  const createMutation = useMutation({
    mutationFn: (data: TransactionFormData) => {
      const category = categories.find((c) => c.id === data.category_id);
      return api.transactions.create({
        trx_date: selectedDate,
        customer_id: data.customer_id || null,
        category_id: data.category_id,
        car_brand: data.car_brand,
        plate_number: data.plate_number,
        employee_id: data.employee_id,
        price: category?.price || 0,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Transaksi berhasil ditambahkan');
      setShowAddModal(false);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menambahkan transaksi');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionFormData }) => {
      const category = categories.find((c) => c.id === data.category_id);
      return api.transactions.update(id, {
        customer_id: data.customer_id || null,
        category_id: data.category_id,
        car_brand: data.car_brand,
        plate_number: data.plate_number,
        employee_id: data.employee_id,
        price: category?.price || 0,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Transaksi berhasil diupdate');
      setShowEditModal(false);
      setSelectedTransaction(null);
      reset();
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal mengupdate transaksi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.transactions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showSuccess('Transaksi berhasil dihapus');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal menghapus transaksi');
    },
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

  const handleAdd = () => {
    previousCustomerId.current = '';
    reset({
      customer_id: '',
      vehicle_id: '',
      category_id: '',
      car_brand: '',
      plate_number: '',
      employee_id: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    previousCustomerId.current = transaction.customer_id || '';
    reset({
      customer_id: transaction.customer_id || '',
      vehicle_id: '',
      category_id: transaction.category_id,
      car_brand: transaction.car_brand,
      plate_number: transaction.plate_number,
      employee_id: transaction.employee_id,
      notes: transaction.notes || '',
    });
    setShowEditModal(true);
  };

  const handleDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const onSubmit = (data: TransactionFormData) => {
    if (selectedTransaction) {
      updateMutation.mutate({ id: selectedTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kasir Harian</h1>
          <p className="text-gray-600 mt-1">Kelola transaksi cuci mobil harian</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Tambah Transaksi
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Semua Kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Semua Karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
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
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Belum ada transaksi untuk tanggal ini</p>
              <button
                onClick={handleAdd}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Tambah transaksi pertama
              </button>
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
                    Merk Mobil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    No Polisi
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
                      {transaction.car_brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.plate_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.employee?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={transaction.status}
                        onChange={(e) => handleStatusChange(transaction.id, e.target.value)}
                        className="text-xs font-medium px-2 py-1 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                      >
                        <option value="QUEUED">Antri</option>
                        <option value="WASHING">Dicuci</option>
                        <option value="FINISHING">Finishing</option>
                        <option value="DONE">Selesai</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDetail(transaction)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Transaksi"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer (Optional)
            </label>
            <select
              {...register('customer_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Customer (Optional) --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kendaraan Member <span className="text-red-500">*</span>
              </label>
              <select
                {...register('vehicle_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">-- Pilih Kendaraan --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.car_brand} - {vehicle.plate_number}
                  </option>
                ))}
              </select>
              {vehiclesLoading ? (
                <p className="text-xs text-gray-500 mt-1">Memuat kendaraan...</p>
              ) : vehicles.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1">
                  Member ini belum memiliki kendaraan. Tambahkan di menu daftar kendaraan.
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              {...register('category_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} - {formatCurrency(category.price)}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>
            )}
            {selectedCategory && (
              <p className="text-sm text-gray-600 mt-2">
                Harga: <span className="font-semibold">{formatCurrency(selectedCategory.price)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merk Mobil <span className="text-red-500">*</span>
            </label>
            <input
              {...register('car_brand')}
              type="text"
              placeholder="Contoh: Toyota Avanza"
              readOnly={Boolean(selectedCustomerId && vehicles.length > 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.car_brand && (
              <p className="text-red-500 text-xs mt-1">{errors.car_brand.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Polisi <span className="text-red-500">*</span>
            </label>
            <input
              {...register('plate_number')}
              type="text"
              placeholder="Contoh: B 1234 XYZ"
              readOnly={Boolean(selectedCustomerId && vehicles.length > 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.plate_number && (
              <p className="text-red-500 text-xs mt-1">{errors.plate_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Karyawan <span className="text-red-500">*</span>
            </label>
            <select
              {...register('employee_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {errors.employee_id && (
              <p className="text-red-500 text-xs mt-1">{errors.employee_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Catatan tambahan (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        title="Edit Transaksi"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer (Optional)
            </label>
            <select
              {...register('customer_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Customer (Optional) --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomerId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kendaraan Member <span className="text-red-500">*</span>
              </label>
              <select
                {...register('vehicle_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">-- Pilih Kendaraan --</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.car_brand} - {vehicle.plate_number}
                  </option>
                ))}
              </select>
              {vehiclesLoading ? (
                <p className="text-xs text-gray-500 mt-1">Memuat kendaraan...</p>
              ) : vehicles.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1">
                  Member ini belum memiliki kendaraan. Tambahkan di menu daftar kendaraan.
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              {...register('category_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} - {formatCurrency(category.price)}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>
            )}
            {selectedCategory && (
              <p className="text-sm text-gray-600 mt-2">
                Harga baru: <span className="font-semibold">{formatCurrency(selectedCategory.price)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merk Mobil <span className="text-red-500">*</span>
            </label>
            <input
              {...register('car_brand')}
              type="text"
              readOnly={Boolean(selectedCustomerId && vehicles.length > 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.car_brand && (
              <p className="text-red-500 text-xs mt-1">{errors.car_brand.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Polisi <span className="text-red-500">*</span>
            </label>
            <input
              {...register('plate_number')}
              type="text"
              readOnly={Boolean(selectedCustomerId && vehicles.length > 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {errors.plate_number && (
              <p className="text-red-500 text-xs mt-1">{errors.plate_number.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Karyawan <span className="text-red-500">*</span>
            </label>
            <select
              {...register('employee_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {errors.employee_id && (
              <p className="text-red-500 text-xs mt-1">{errors.employee_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedTransaction(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTransaction(null);
        }}
        title="Detail Transaksi"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tanggal</p>
                <p className="font-medium">{formatTime(selectedTransaction.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <StatusBadge status={selectedTransaction.status} />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium">{selectedTransaction.customer?.name || 'Umum'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kategori</p>
              <p className="font-medium">{selectedTransaction.category?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Merk Mobil</p>
                <p className="font-medium">{selectedTransaction.car_brand}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nomor Polisi</p>
                <p className="font-medium font-mono">{selectedTransaction.plate_number}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Karyawan</p>
              <p className="font-medium">{selectedTransaction.employee?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Harga</p>
              <p className="font-bold text-lg">{formatCurrency(selectedTransaction.price)}</p>
            </div>
            {selectedTransaction.notes && (
              <div>
                <p className="text-sm text-gray-600">Catatan</p>
                <p className="font-medium">{selectedTransaction.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
