# API Endpoints - Royal Carwash POS

## Base URLs

- **Edge Functions**: `{SUPABASE_URL}/functions/v1`
- **Supabase API**: Via Supabase Client SDK

## Authentication

All endpoints (except login) require authentication via JWT token in Authorization header:
```
Authorization: Bearer {token}
```

---

## Auth Endpoints (Edge Functions)

### POST /auth/login
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

**Error (401):**
```json
{
  "message": "Invalid phone or password"
}
```

---

### GET /auth/verify
Verify JWT token dan dapatkan user data terbaru.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
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

**Error (401):**
```json
{
  "message": "Invalid or expired token"
}
```

---

## Users API (Supabase Client)

### GET Users by Role
```typescript
api.users.getAll(role?: 'ADMIN' | 'KARYAWAN' | 'CUSTOMER')
```

**Access**: Admin only

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Karyawan Cuci",
    "phone": "0812711103333",
    "role": "KARYAWAN",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST Create User
```typescript
api.users.create({
  name: string,
  phone: string,
  password: string,
  role: string
})
```

**Access**: Admin only

**Request:**
```json
{
  "name": "Karyawan Baru",
  "phone": "081234567890",
  "password": "password123",
  "role": "KARYAWAN"
}
```

---

### PUT Update User
```typescript
api.users.update(id: string, {
  name: string,
  phone: string
})
```

**Access**: Admin only

---

### PUT Reset Password
```typescript
api.users.resetPassword(id: string, newPassword: string)
```

**Access**: Admin only

---

### DELETE User
```typescript
api.users.delete(id: string)
```

**Access**: Admin only
**Note**: Will fail if user has associated transactions

---

## Categories API

### GET All Categories
```typescript
api.categories.getAll(activeOnly?: boolean)
```

**Access**: All authenticated users

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Cuci Mobil Sedang",
    "price": 50000,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST Create Category
```typescript
api.categories.create({
  name: string,
  price: number
})
```

**Access**: Admin only

---

### PUT Update Category
```typescript
api.categories.update(id: string, {
  name: string,
  price: number
})
```

**Access**: Admin only

---

### PATCH Toggle Active Status
```typescript
api.categories.toggleActive(id: string, isActive: boolean)
```

**Access**: Admin only

---

### DELETE Category
```typescript
api.categories.delete(id: string)
```

**Access**: Admin only
**Note**: Will fail if category is used in transactions

---

## Transactions API

### GET All Transactions
```typescript
api.transactions.getAll(filters?: {
  date?: string,              // 'YYYY-MM-DD'
  startDate?: string,         // 'YYYY-MM-DD'
  endDate?: string,           // 'YYYY-MM-DD'
  status?: string,            // 'QUEUED' | 'WASHING' | 'FINISHING' | 'DONE'
  categoryId?: string,
  employeeId?: string,
  customerId?: string
})
```

**Access**:
- Admin: All transactions
- Karyawan: Only assigned transactions (employeeId = current user)
- Customer: Only own transactions (customerId = current user)

**Response:**
```json
[
  {
    "id": "uuid",
    "trx_date": "2024-01-15",
    "customer_id": "uuid",
    "category_id": "uuid",
    "car_brand": "Toyota Avanza",
    "plate_number": "B 1234 XYZ",
    "employee_id": "uuid",
    "price": 50000,
    "status": "WASHING",
    "notes": "Cucian detail",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "customer": {
      "id": "uuid",
      "name": "Customer Setia",
      "phone": "0812711104444"
    },
    "category": {
      "id": "uuid",
      "name": "Cuci Mobil Sedang",
      "price": 50000
    },
    "employee": {
      "id": "uuid",
      "name": "Karyawan Cuci",
      "phone": "0812711103333"
    }
  }
]
```

---

### GET Transaction by ID
```typescript
api.transactions.getById(id: string)
```

**Access**: Based on role (same as getAll)

---

### POST Create Transaction
```typescript
api.transactions.create({
  trx_date: string,          // 'YYYY-MM-DD', default today
  customer_id?: string,      // nullable
  category_id: string,       // required
  car_brand: string,         // required
  plate_number: string,      // required
  employee_id: string,       // required
  price: number,             // snapshot dari category
  notes?: string             // optional
})
```

**Access**: Admin only

**Request:**
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

---

### PUT Update Transaction
```typescript
api.transactions.update(id: string, {
  customer_id?: string,
  category_id?: string,      // jika berubah, price akan diupdate
  car_brand?: string,
  plate_number?: string,
  employee_id?: string,
  price?: number,
  notes?: string
})
```

**Access**: Admin only

---

### PATCH Update Status
```typescript
api.transactions.updateStatus(id: string, status: string)
```

**Access**:
- Admin: Any transaction
- Karyawan: Only assigned transactions (employeeId = current user)

**Status Values**: 'QUEUED' | 'WASHING' | 'FINISHING' | 'DONE'

---

### DELETE Transaction
```typescript
api.transactions.delete(id: string)
```

**Access**: Admin only

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "No token provided / Invalid token"
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

---

## Rate Limiting

Supabase applies standard rate limiting:
- Anonymous: 50 requests/second
- Authenticated: 200 requests/second

---

## Data Validation

### Phone Number
- Format: Indonesian phone number
- Example: `081234567890` or `0812711103333`
- Must be unique

### Password
- Minimum 6 characters
- Hashed dengan bcrypt (salt rounds: 10)

### Transaction Date
- Format: ISO date string `YYYY-MM-DD`
- Default: Today

### Price
- Type: Integer (in IDR)
- Minimum: 1
- Stored as snapshot (tidak berubah jika kategori berubah)

### Status
- Must follow workflow: QUEUED → WASHING → FINISHING → DONE
- Karyawan hanya bisa update transaksi yang ditugaskan
