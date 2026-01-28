# API Endpoints - Royal Carwash POS

## Base URLs

- **REST API**: `{API_BASE_URL}` (contoh: `http://localhost:4000`)

## Authentication

All endpoints (except login) require authentication via JWT token in Authorization header:
```
Authorization: Bearer {token}
```

---

## Auth Endpoints

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

## Users API (REST)

### GET Users by Role
```
GET /users?role=ADMIN
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
```
POST /users
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
```
PUT /users/{id}
```

**Access**: Admin only

---

### PUT Reset Password
```
PUT /users/{id}/reset-password
```

**Access**: Admin only

---

### DELETE User
```
DELETE /users/{id}
```

**Access**: Admin only
**Note**: Will fail if user has associated transactions

---

## Categories API

### GET All Categories
```
GET /categories?activeOnly=true
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
```
POST /categories
```

**Access**: Admin only

---

### PUT Update Category
```
PUT /categories/{id}
```

**Access**: Admin only

---

### PATCH Toggle Active Status
```
PATCH /categories/{id}/status
```

**Access**: Admin only

---

### DELETE Category
```
DELETE /categories/{id}
```

**Access**: Admin only
**Note**: Will fail if category is used in transactions

---

## Transactions API

### GET All Transactions
```
GET /transactions?date=YYYY-MM-DD&status=QUEUED&categoryId=uuid
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
```
GET /transactions/{id}
```

**Access**: Based on role (same as getAll)

---

### POST Create Transaction
```
POST /transactions
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
```
PUT /transactions/{id}
```

**Access**: Admin only

---

### PATCH Update Status
```
PATCH /transactions/{id}/status
```

**Access**:
- Admin: Any transaction
- Karyawan: Only assigned transactions (employeeId = current user)

**Status Values**: 'QUEUED' | 'WASHING' | 'FINISHING' | 'DONE'

---

### DELETE Transaction
```
DELETE /transactions/{id}
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
