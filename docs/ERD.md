# Entity Relationship Diagram (ERD)

## Database Schema - Royal Carwash POS

### Entities & Relationships

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

## Enum Types

### user_role
- ADMIN
- KARYAWAN
- CUSTOMER

### transaction_status
- QUEUED (antri)
- WASHING (sedang dicuci)
- FINISHING (finishing)
- DONE (selesai)

## Relationships

### USERS → TRANSACTIONS (as employee)
- **Type**: One-to-Many
- **Description**: Satu karyawan bisa mengerjakan banyak transaksi
- **Foreign Key**: transactions.employee_id → users.id
- **On Delete**: RESTRICT (tidak boleh hapus karyawan yang masih punya transaksi)

### USERS → TRANSACTIONS (as customer)
- **Type**: One-to-Many (Optional)
- **Description**: Satu customer bisa punya banyak transaksi
- **Foreign Key**: transactions.customer_id → users.id (NULLABLE)
- **On Delete**: SET NULL (jika customer dihapus, transaksi tetap ada tapi customer_id jadi null)

### CATEGORIES → TRANSACTIONS
- **Type**: One-to-Many
- **Description**: Satu kategori layanan bisa dipakai di banyak transaksi
- **Foreign Key**: transactions.category_id → categories.id
- **On Delete**: RESTRICT (tidak boleh hapus kategori yang masih dipakai)

## Indexes

Performance indexes untuk query optimization:

```sql
-- Users
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- Categories
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Transactions
CREATE INDEX idx_transactions_trx_date ON transactions(trx_date);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_employee_id ON transactions(employee_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
```

## Business Rules

1. **Phone Number**: Harus unique across semua users
2. **Transaction Price**: Snapshot dari category.price saat transaksi dibuat (tidak berubah jika harga kategori diupdate)
3. **Customer Optional**: transactions.customer_id bisa NULL untuk customer walk-in
4. **Status Workflow**: QUEUED → WASHING → FINISHING → DONE
5. **Category Delete**: Tidak bisa hapus kategori yang masih dipakai di transaksi
6. **Employee Delete**: Tidak bisa hapus karyawan yang masih punya transaksi terkait
7. **Active Categories**: Hanya kategori is_active=true yang muncul di dropdown form

## Row Level Security (RLS)

### Users Table
- Admin: Read/Write all users
- User: Read own profile
- User: Update own profile

### Categories Table
- All authenticated: Read active categories
- Admin: Full CRUD

### Transactions Table
- Admin: Read/Write all transactions
- Karyawan: Read own assigned transactions, Update status only
- Customer: Read own transactions only
