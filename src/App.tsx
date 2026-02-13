import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Profil } from './pages/Profil';
import { AdminDashboard } from './pages/admin/Dashboard';
import { KasirHarian } from './pages/admin/KasirHarian';
import { Kategori } from './pages/admin/Kategori';
import { Karyawan } from './pages/admin/Karyawan';
import { Customer } from './pages/admin/Customer';
import { Laporan } from './pages/admin/Laporan';
import { PembelianMember } from './pages/admin/PembelianMember';
import { Pengeluaran } from './pages/admin/Pengeluaran';
import { AdminKasir } from './pages/superadmin/AdminKasir';
import { Perusahaan } from './pages/superadmin/Perusahaan';
import { KaryawanDashboard } from './pages/karyawan/Dashboard';
import { PekerjaanSaya } from './pages/karyawan/Pekerjaan';
import { CustomerDashboard } from './pages/customer/Dashboard';
import { ProgresCustomer } from './pages/customer/Progres';
import { DaftarKendaraanCustomer } from './pages/customer/Kendaraan';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user.role === 'SUPERADMIN') {
    return <Navigate to="/superadmin/dashboard" replace />;
  } else if (user.role === 'KARYAWAN') {
    return <Navigate to="/karyawan/dashboard" replace />;
  } else if (user.role === 'CUSTOMER') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<RootRedirect />} />

            <Route
              path="/superadmin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/pengeluaran"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Pengeluaran />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/kasir"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <KasirHarian />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/kategori"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Kategori />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/membership"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <PembelianMember />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/karyawan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Karyawan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/customer"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Customer />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/laporan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Laporan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/admin-kasir"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <AdminKasir />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/perusahaan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Perusahaan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/profil"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Layout>
                    <Profil />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pengeluaran"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Pengeluaran />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kasir"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <KasirHarian />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kategori"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Kategori />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/membership"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <PembelianMember />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/karyawan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Karyawan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/customer"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Customer />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/laporan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Laporan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profil"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN']}>
                  <Layout>
                    <Profil />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/karyawan/dashboard"
              element={
                <ProtectedRoute allowedRoles={['KARYAWAN']}>
                  <Layout>
                    <KaryawanDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/karyawan/pekerjaan"
              element={
                <ProtectedRoute allowedRoles={['KARYAWAN']}>
                  <Layout>
                    <PekerjaanSaya />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/karyawan/profil"
              element={
                <ProtectedRoute allowedRoles={['KARYAWAN']}>
                  <Layout>
                    <Profil />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/customer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <Layout>
                    <CustomerDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/progres"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <Layout>
                    <ProgresCustomer />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/kendaraan"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <Layout>
                    <DaftarKendaraanCustomer />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/profil"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <Layout>
                    <Profil />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
