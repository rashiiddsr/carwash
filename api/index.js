import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 4000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  dateStrings: true,
});

const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

const sanitizeUser = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  role: row.role,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildTransaction = (row) => ({
  id: row.id,
  trx_date: row.trx_date,
  customer_id: row.customer_id,
  category_id: row.category_id,
  car_brand: row.car_brand,
  plate_number: row.plate_number,
  employee_id: row.employee_id,
  price: row.price,
  status: row.status,
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  customer: row.customer_ref_id
    ? {
        id: row.customer_ref_id,
        name: row.customer_name,
        phone: row.customer_phone,
      }
    : null,
  category: row.category_ref_id
    ? {
        id: row.category_ref_id,
        name: row.category_name,
        price: row.category_price,
      }
    : null,
  employee: row.employee_ref_id
    ? {
        id: row.employee_ref_id,
        name: row.employee_name,
        phone: row.employee_phone,
      }
    : null,
});

const authRequired = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const fetchTransactionById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
      t.*, 
      customer.id AS customer_ref_id,
      customer.name AS customer_name,
      customer.phone AS customer_phone,
      category.id AS category_ref_id,
      category.name AS category_name,
      category.price AS category_price,
      employee.id AS employee_ref_id,
      employee.name AS employee_name,
      employee.phone AS employee_phone
    FROM transactions t
    LEFT JOIN users customer ON t.customer_id = customer.id
    LEFT JOIN categories category ON t.category_id = category.id
    LEFT JOIN users employee ON t.employee_id = employee.id
    WHERE t.id = ?
    LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    return null;
  }

  return buildTransaction(rows[0]);
};

app.post('/auth/login', asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: 'Phone and password are required' });
  }

  const [rows] = await pool.query(
    'SELECT id, name, phone, role, password_hash, created_at, updated_at FROM users WHERE phone = ? LIMIT 1',
    [phone]
  );

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid phone or password' });
  }

  const userRow = rows[0];
  const isValid = await bcrypt.compare(password, userRow.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid phone or password' });
  }

  const user = sanitizeUser(userRow);
  const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });

  return res.json({ token, user });
}));

app.get('/auth/verify', authRequired, asyncHandler(async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload' });
  }

  const [rows] = await pool.query(
    'SELECT id, name, phone, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: sanitizeUser(rows[0]) });
}));

app.use(authRequired);

app.get('/users', asyncHandler(async (req, res) => {
  const { role } = req.query;
  const values = [];
  let query = 'SELECT id, name, phone, role, created_at, updated_at FROM users';

  if (role) {
    query += ' WHERE role = ?';
    values.push(role);
  }

  query += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(query, values);
  res.json(rows.map(sanitizeUser));
}));

app.post('/users', asyncHandler(async (req, res) => {
  const { name, phone, password, role } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (id, name, phone, role, password_hash) VALUES (UUID(), ?, ?, ?, ?)',
    [name, phone, role, passwordHash]
  );

  const [rows] = await pool.query(
    'SELECT id, name, phone, role, created_at, updated_at FROM users WHERE phone = ? LIMIT 1',
    [phone]
  );

  return res.status(201).json(sanitizeUser(rows[0]));
}));

app.put('/users/:id', asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const { id } = req.params;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone are required' });
  }

  await pool.query(
    'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, phone, id]
  );

  const [rows] = await pool.query(
    'SELECT id, name, phone, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );

  return res.json(sanitizeUser(rows[0]));
}));

app.put('/users/:id/reset-password', asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { id } = req.params;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, id]
  );

  return res.json({ success: true });
}));

app.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ success: true });
}));

app.get('/categories', asyncHandler(async (req, res) => {
  const { activeOnly } = req.query;
  let query = 'SELECT id, name, price, is_active, created_at, updated_at FROM categories';

  if (activeOnly === 'true') {
    query += ' WHERE is_active = true';
  }

  query += ' ORDER BY name';

  const [rows] = await pool.query(query);
  res.json(rows);
}));

app.post('/categories', asyncHandler(async (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  await pool.query(
    'INSERT INTO categories (id, name, price, is_active) VALUES (UUID(), ?, ?, true)',
    [name, price]
  );

  const [rows] = await pool.query(
    'SELECT id, name, price, is_active, created_at, updated_at FROM categories WHERE name = ? ORDER BY created_at DESC LIMIT 1',
    [name]
  );

  return res.status(201).json(rows[0]);
}));

app.put('/categories/:id', asyncHandler(async (req, res) => {
  const { name, price } = req.body;
  const { id } = req.params;

  if (!name || price === undefined) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  await pool.query(
    'UPDATE categories SET name = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, price, id]
  );

  const [rows] = await pool.query(
    'SELECT id, name, price, is_active, created_at, updated_at FROM categories WHERE id = ? LIMIT 1',
    [id]
  );

  return res.json(rows[0]);
}));

app.patch('/categories/:id/status', asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  const { id } = req.params;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ message: 'is_active must be boolean' });
  }

  await pool.query(
    'UPDATE categories SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [is_active, id]
  );

  const [rows] = await pool.query(
    'SELECT id, name, price, is_active, created_at, updated_at FROM categories WHERE id = ? LIMIT 1',
    [id]
  );

  return res.json(rows[0]);
}));

app.delete('/categories/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return res.json({ success: true });
}));

app.get('/transactions', asyncHandler(async (req, res) => {
  const { date, startDate, endDate, status, categoryId, employeeId, customerId } = req.query;
  const conditions = [];
  const values = [];

  if (date) {
    conditions.push('t.trx_date = ?');
    values.push(date);
  }

  if (startDate && endDate) {
    conditions.push('t.trx_date BETWEEN ? AND ?');
    values.push(startDate, endDate);
  }

  if (status) {
    conditions.push('t.status = ?');
    values.push(status);
  }

  if (categoryId) {
    conditions.push('t.category_id = ?');
    values.push(categoryId);
  }

  if (employeeId) {
    conditions.push('t.employee_id = ?');
    values.push(employeeId);
  }

  if (customerId) {
    conditions.push('t.customer_id = ?');
    values.push(customerId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
      t.*,
      customer.id AS customer_ref_id,
      customer.name AS customer_name,
      customer.phone AS customer_phone,
      category.id AS category_ref_id,
      category.name AS category_name,
      category.price AS category_price,
      employee.id AS employee_ref_id,
      employee.name AS employee_name,
      employee.phone AS employee_phone
    FROM transactions t
    LEFT JOIN users customer ON t.customer_id = customer.id
    LEFT JOIN categories category ON t.category_id = category.id
    LEFT JOIN users employee ON t.employee_id = employee.id
    ${whereClause}
    ORDER BY t.created_at DESC`,
    values
  );

  res.json(rows.map(buildTransaction));
}));

app.get('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const transaction = await fetchTransactionById(id);

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  return res.json(transaction);
}));

app.post('/transactions', asyncHandler(async (req, res) => {
  const { trx_date, customer_id, category_id, car_brand, plate_number, employee_id, price, notes } = req.body;

  if (!trx_date || !category_id || !car_brand || !plate_number || !employee_id || price === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const transactionId = randomUUID();
  await pool.query(
    `INSERT INTO transactions
      (id, trx_date, customer_id, category_id, car_brand, plate_number, employee_id, price, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
    [transactionId, trx_date, customer_id || null, category_id, car_brand, plate_number, employee_id, price, notes || null]
  );

  const transaction = await fetchTransactionById(transactionId);
  if (!transaction) {
    return res.status(500).json({ message: 'Failed to load transaction' });
  }

  return res.status(201).json(transaction);
}));

app.put('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { customer_id, category_id, car_brand, plate_number, employee_id, price, notes } = req.body;

  const fields = [];
  const values = [];

  if (customer_id !== undefined) {
    fields.push('customer_id = ?');
    values.push(customer_id || null);
  }
  if (category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(category_id);
  }
  if (car_brand !== undefined) {
    fields.push('car_brand = ?');
    values.push(car_brand);
  }
  if (plate_number !== undefined) {
    fields.push('plate_number = ?');
    values.push(plate_number);
  }
  if (employee_id !== undefined) {
    fields.push('employee_id = ?');
    values.push(employee_id);
  }
  if (price !== undefined) {
    fields.push('price = ?');
    values.push(price);
  }
  if (notes !== undefined) {
    fields.push('notes = ?');
    values.push(notes || null);
  }

  if (!fields.length) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  const updateQuery = `UPDATE transactions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  await pool.query(updateQuery, [...values, id]);

  const transaction = await fetchTransactionById(id);
  return res.json(transaction);
}));

app.patch('/transactions/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  await pool.query(
    'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id]
  );

  const transaction = await fetchTransactionById(id);
  return res.json(transaction);
}));

app.delete('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
  return res.json({ success: true });
}));

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server running on port ${port}`);
});
