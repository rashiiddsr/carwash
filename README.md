# Royal Carwash POS System

Aplikasi Point of Sale (POS) untuk bisnis cuci mobil dengan fitur manajemen transaksi, karyawan, customer, dan laporan.

## Teknologi

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Routing**: React Router v6
- **Form**: React Hook Form + Zod
- **Backend**: Node.js + Express
- **Database**: MySQL
- **Auth**: JWT dengan bcrypt

## Fitur

### Admin
- Dashboard dengan statistik harian
- Kasir Harian (CRUD transaksi)
- Master Data (Kategori, Karyawan, Customer)
- Laporan Transaksi dengan filter & export CSV
- Manajemen status transaksi

### Karyawan
- Dashboard pekerjaan
- Update status pekerjaan yang ditugaskan
- Lihat riwayat pekerjaan

### Customer
- Dashboard progres cucian
- Lihat status cucian real-time dengan stepper
- Riwayat transaksi

## Role-Based Access Control (RBAC)

- **ADMIN**: Akses penuh ke semua fitur
- **KARYAWAN**: Dashboard + Pekerjaan Saya
- **CUSTOMER**: Dashboard + Progres Cucian

## Setup & Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd royal-carwash
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

File `.env` di root berisi konfigurasi frontend untuk mengarah ke API.

Contoh isi `.env`:
```
VITE_API_BASE_URL=http://localhost:4000
```

File `api/.env` berisi konfigurasi backend:
```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=roya2064_pos
DB_USER=roya2064_rgi_nexaproc
DB_PASSWORD=roya2064_rgi_nexaproc
CORS_ORIGIN=https://localhost:5173
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d
```

### 4. Database Setup

Database MySQL menggunakan schema di `database/schema.sql` dengan:
- Tabel: users, categories, transactions
- Enum types: role dan status

Import schema ke MySQL:
```bash
mysql -u <user> -p < database/schema.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### 6. Jalankan API Backend

```bash
cd api
npm install
npm run dev
```

### 7. Build Production

```bash
npm run build
```

## Akun Default (Testing)

### Admin
- Phone: `081271110555`
- Password: `1234`

### Karyawan
- Phone: `0812711103333`
- Password: `1234`

### Customer
- Phone: `0812711104444`
- Password: `1234`

## Database Schema

### Users Table
- id (uuid)
- name (text)
- phone (text, unique)
- password_hash (text)
- role (enum: ADMIN, KARYAWAN, CUSTOMER)
- created_at, updated_at

### Categories Table
- id (uuid)
- name (text)
- price (integer)
- is_active (boolean)
- created_at, updated_at

### Transactions Table
- id (uuid)
- trx_date (date)
- customer_id (uuid, nullable)
- category_id (uuid)
- car_brand (text)
- plate_number (text)
- employee_id (uuid)
- price (integer, snapshot)
- status (enum: QUEUED, WASHING, FINISHING, DONE)
- notes (text, nullable)
- created_at, updated_at

## Status Workflow

Transaksi mengikuti alur status:
1. **QUEUED** - Baru masuk antrian
2. **WASHING** - Sedang dicuci
3. **FINISHING** - Proses finishing/packing
4. **DONE** - Selesai

## API Endpoints (REST)

### Auth
- `POST /auth/login` - Login dengan phone & password
- `GET /auth/verify` - Verify JWT token

### Frontend API (via REST API)
- Users CRUD (admin only)
- Categories CRUD (admin only)
- Transactions CRUD dengan filtering
- Status update (admin & karyawan)

## Security

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Protected routes di frontend

## Scripts

```bash
npm run dev          # Run development server
npm run build        # Build production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── ui/          # UI components (Modal, Toast)
│   ├── Layout.tsx   # Main layout dengan sidebar
│   └── ProtectedRoute.tsx
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── hooks/           # Custom hooks
│   └── useToast.tsx
├── lib/             # Utilities & API
│   ├── api.ts       # REST API calls
│   ├── auth.ts      # Auth utilities
│   └── utils.ts     # Helper functions
├── pages/           # Page components
│   ├── admin/       # Admin pages
│   ├── karyawan/    # Karyawan pages
│   ├── customer/    # Customer pages
│   ├── Login.tsx
│   └── Profil.tsx
├── types/           # TypeScript types
│   └── index.ts
├── App.tsx          # Main app dengan routing
└── main.tsx         # Entry point
api/
└── index.js         # Express API (MySQL)

database/
└── schema.sql       # MySQL schema
```

## Best Practices

- Format currency selalu dalam Rupiah (IDR)
- Tanggal menggunakan format ISO (YYYY-MM-DD)
- Empty state untuk tabel kosong
- Toast notification untuk feedback
- Loading state untuk async operations
- Responsive design (mobile-first)

## License

Private - Royal Carwash © 2024
