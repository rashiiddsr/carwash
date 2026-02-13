import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Car,
  LayoutDashboard,
  CreditCard,
  Wallet,
  Crown,
  Tags,
  UserCircle,
  FileText,
  Briefcase,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN', 'KARYAWAN', 'CUSTOMER'],
  },
  {
    label: 'Kasir Harian',
    path: '/kasir',
    icon: <CreditCard className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN'],
  },
  {
    label: 'Pengeluaran',
    path: '/pengeluaran',
    icon: <Wallet className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN'],
  },
  {
    label: 'Pembelian Member',
    path: '/membership',
    icon: <Crown className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN'],
  },
  {
    label: 'Master Data',
    path: '#',
    icon: <Tags className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN'],
    children: [
      { label: 'Kategori', path: '/kategori', icon: null, roles: ['SUPERADMIN', 'ADMIN'] },
      { label: 'Karyawan', path: '/karyawan', icon: null, roles: ['SUPERADMIN'] },
      { label: 'Customer', path: '/customer', icon: null, roles: ['SUPERADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'Admin Kasir',
    path: '/admin-kasir',
    icon: <UserCircle className="w-5 h-5" />,
    roles: ['SUPERADMIN'],
  },
  {
    label: 'Data Perusahaan',
    path: '/perusahaan',
    icon: <Tags className="w-5 h-5" />,
    roles: ['SUPERADMIN'],
  },
  {
    label: 'Laporan Transaksi',
    path: '/laporan',
    icon: <FileText className="w-5 h-5" />,
    roles: ['SUPERADMIN', 'ADMIN'],
  },
  {
    label: 'Pekerjaan Saya',
    path: '/pekerjaan',
    icon: <Briefcase className="w-5 h-5" />,
    roles: ['KARYAWAN'],
  },
  {
    label: 'Progres Cucian',
    path: '/progres',
    icon: <TrendingUp className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
  {
    label: 'Daftar Kendaraan',
    path: '/kendaraan',
    icon: <Car className="w-5 h-5" />,
    roles: ['CUSTOMER'],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncLayout = (matchesDesktop: boolean) => {
      setIsDesktopView(matchesDesktop);
      setSidebarOpen(matchesDesktop);
    };

    syncLayout(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (!user) return null;

  const rolePrefix = `/${user.role.toLowerCase()}`;
  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user.role));

  const isActive = (path: string) => {
    if (path === '#') return false;
    const fullPath = rolePrefix + path;
    return location.pathname === fullPath;
  };

  const isChildActive = (children: MenuItem[]) => children.some((child) => isActive(child.path));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleExpanded = (label: string) => {
    setExpandedMenu(expandedMenu === label ? null : label);
  };

  const closeSidebarAfterNavigate = () => {
    if (!isDesktopView) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 h-11 w-11 rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 transition flex items-center justify-center"
          aria-label="Buka sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 z-40 w-64 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200 mt-16">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo subtitle="POS System" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="h-10 w-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition flex items-center justify-center"
              aria-label="Tutup sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const visibleChildren = (item.children || []).filter((child) => child.roles.includes(user.role));
              const hasChildren = visibleChildren.length > 0;
              const isExpanded = hasChildren && (expandedMenu === item.label || isChildActive(visibleChildren));

              return (
                <li key={item.label}>
                  {hasChildren ? (
                    <div>
                      <button
                        onClick={() => toggleExpanded(item.label)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition ${
                          hasChildren && isChildActive(visibleChildren)
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <ul className="mt-1 ml-4 space-y-1">
                          {visibleChildren.map((child) => (
                            <li key={child.path}>
                              <Link
                                to={rolePrefix + child.path}
                                onClick={closeSidebarAfterNavigate}
                                className={`block px-4 py-2 rounded-lg transition ${
                                  isActive(child.path)
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={rolePrefix + item.path}
                      onClick={closeSidebarAfterNavigate}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive(item.path)
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            to={`${rolePrefix}/profil`}
            onClick={closeSidebarAfterNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-2 ${
              location.pathname === `${rolePrefix}/profil`
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <UserCircle className="w-5 h-5" />
            <span>Profil</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && !isDesktopView && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className={`${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} pt-20 lg:pt-8 transition-all duration-300`}>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
