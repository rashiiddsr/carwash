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

### Superadmin
- Semua fitur admin
- Manajemen admin kasir
- Ubah data perusahaan (nama perusahaan, alamat, nomor hp, upload logo)

### Karyawan
- Dashboard pekerjaan
- Update status pekerjaan yang ditugaskan
- Lihat riwayat pekerjaan

### Customer
- Dashboard progres cucian
- Lihat status cucian real-time dengan stepper
- Riwayat transaksi

## Role-Based Access Control (RBAC)

- **SUPERADMIN**: Akses penuh fitur admin + manajemen admin kasir + data perusahaan
- **ADMIN**: Akses fitur operasional kasir
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

File `.env.example` di root berisi konfigurasi frontend untuk mengarah ke API.

Format `.env.example`:
```
VITE_API_BASE_URL=
```

File `api/.env` berisi konfigurasi backend:
```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=roya2064_cw
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

### Superadmin
- Phone: `0812711101111`
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
- role (enum: SUPERADMIN, ADMIN, KARYAWAN, CUSTOMER)
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

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────┐
│        USERS            │
├─────────────────────────┤
│ id (PK)                 │
│ name                    │
│ phone (UNIQUE)          │
│ password_hash           │
│ role (ENUM)             │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
           │
           │ 1:N (as employee)
           │
           ├──────────────────────────────┐
           │                              │
           │ 1:N (as customer)            │
           │                              │
           ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│      CATEGORIES         │    │     TRANSACTIONS        │
├─────────────────────────┤    ├─────────────────────────┤
│ id (PK)                 │    │ id (PK)                 │
│ name                    │◄───┤ trx_date                │
│ price                   │ N:1│ customer_id (FK)        │
│ is_active               │    │ category_id (FK)        │
│ created_at              │    │ car_brand               │
│ updated_at              │    │ plate_number            │
└─────────────────────────┘    │ employee_id (FK)        │
                               │ price (snapshot)        │
                               │ status (ENUM)           │
                               │ notes                   │
                               │ created_at              │
                               │ updated_at              │
                               └─────────────────────────┘
```

### Enum Types

**user_role**
- ADMIN
- KARYAWAN
- CUSTOMER

**transaction_status**
- QUEUED (antri)
- WASHING (sedang dicuci)
- FINISHING (finishing)
- DONE (selesai)

### Relationships

**USERS → TRANSACTIONS (as employee)**
- Type: One-to-Many
- Foreign Key: transactions.employee_id → users.id
- On Delete: RESTRICT

**USERS → TRANSACTIONS (as customer)**
- Type: One-to-Many (Optional)
- Foreign Key: transactions.customer_id → users.id (NULLABLE)
- On Delete: SET NULL

**CATEGORIES → TRANSACTIONS**
- Type: One-to-Many
- Foreign Key: transactions.category_id → categories.id
- On Delete: RESTRICT

## Status Workflow

Transaksi mengikuti alur status:
1. **QUEUED** - Baru masuk antrian
2. **WASHING** - Sedang dicuci
3. **FINISHING** - Proses finishing/packing
4. **DONE** - Selesai

## API Endpoints (REST)

### Base URL
- REST API: `{API_BASE_URL}` (contoh: `http://localhost:4000`)

### Authentication
Semua endpoint (kecuali login) membutuhkan JWT di header:
```
Authorization: Bearer {token}
```

### Auth

#### POST /auth/login
Login dengan phone number dan password.

**Request Body:**
```json
{
  "phone": "081271110555",
  "password": "1234"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "Admin Royal Carwash",
    "phone": "081271110555",
    "role": "ADMIN",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### GET /auth/verify
Verify JWT token dan dapatkan user data terbaru.

**Headers:**
```
Authorization: Bearer {token}
```

### Users API

#### GET /users?role=ADMIN
**Access:** Admin only

#### POST /users
**Access:** Admin only

```json
{
  "name": "Karyawan Baru",
  "phone": "081234567890",
  "password": "password123",
  "role": "KARYAWAN"
}
```

#### PUT /users/{id}
**Access:** Admin only

#### DELETE /users/{id}
**Access:** Admin only (gagal jika user punya transaksi)

### Categories API

#### GET /categories?activeOnly=true
**Access:** All authenticated users

#### POST /categories
**Access:** Admin only

#### PUT /categories/{id}
**Access:** Admin only

#### PATCH /categories/{id}/status
**Access:** Admin only

#### DELETE /categories/{id}
**Access:** Admin only (gagal jika kategori dipakai transaksi)

### Transactions API

#### GET /transactions
```
GET /transactions?date=YYYY-MM-DD&status=QUEUED&categoryId=uuid
```

**Access:**
- Admin: semua transaksi
- Karyawan: transaksi yang ditugaskan
- Customer: transaksi milik sendiri

#### GET /transactions/{id}
**Access:** sesuai role (sama seperti GET /transactions)

#### POST /transactions
**Access:** Admin only

```json
{
  "trx_date": "2024-01-15",
  "customer_id": "uuid-or-null",
  "category_id": "uuid",
  "car_brand": "Toyota Avanza",
  "plate_number": "B 1234 XYZ",
  "employee_id": "uuid",
  "price": 50000,
  "notes": "Cucian detail"
}
```

#### PUT /transactions/{id}
**Access:** Admin only

#### PATCH /transactions/{id}/status
**Access:** Admin & karyawan (karyawan hanya untuk transaksi yang ditugaskan)

**Status:** `QUEUED` | `WASHING` | `FINISHING` | `DONE`

#### DELETE /transactions/{id}
**Access:** Admin only

### Error Responses

**400 Bad Request**
```json
{ "message": "Validation error message" }
```

**401 Unauthorized**
```json
{ "message": "No token provided / Invalid token" }
```

**403 Forbidden**
```json
{ "message": "Insufficient permissions" }
```

**404 Not Found**
```json
{ "message": "Resource not found" }
```

**500 Internal Server Error**
```json
{ "message": "Internal server error" }
```

### Data Validation

- **Phone Number**: format nomor HP Indonesia dan unique.
- **Password**: minimum 6 karakter, di-hash dengan bcrypt (salt rounds: 10).
- **Transaction Date**: format `YYYY-MM-DD`.
- **Price**: integer (IDR) minimal 1, disimpan sebagai snapshot.
- **Status**: harus mengikuti workflow QUEUED → WASHING → FINISHING → DONE.

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
