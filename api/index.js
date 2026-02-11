import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRootDir = path.join(__dirname, 'uploads');
const logoUploadDir = path.join(uploadsRootDir, 'logos');

fs.mkdirSync(logoUploadDir, { recursive: true });

app.use('/uploads', express.static(uploadsRootDir));


const saveCompanyLogoFile = ({ fileName, mimeType, base64Data }) => {
  if (!base64Data) {
    return null;
  }

  const extension = path.extname(fileName || '') || (mimeType?.split('/')[1] ? `.${mimeType.split('/')[1]}` : '.png');
  const safeExtension = extension.replace(/[^a-zA-Z0-9.]/g, '') || '.png';
  const fileNameOnDisk = `${randomUUID()}${safeExtension}`;
  const absolutePath = path.join(logoUploadDir, fileNameOnDisk);
  const fileBuffer = Buffer.from(base64Data, 'base64');

  fs.writeFileSync(absolutePath, fileBuffer);

  return `/uploads/logos/${fileNameOnDisk}`;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const sanitizeUser = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  role: row.role,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const ADMIN_ROLES = new Set(['ADMIN', 'SUPERADMIN']);

const isAdminRole = (role) => ADMIN_ROLES.has(role || '');

const isSuperAdmin = (role) => role === 'SUPERADMIN';

const buildCompanyProfile = (row) => ({
  id: row.id,
  company_name: row.company_name,
  address: row.address,
  phone: row.phone,
  logo_path: row.logo_path,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildVehicle = (row) => ({
  id: row.id,
  customer_id: row.customer_id,
  car_brand: row.car_brand,
  plate_number: row.plate_number,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildMembership = (row) => ({
  id: row.id,
  vehicle_id: row.vehicle_id,
  tier: row.tier,
  starts_at: row.starts_at,
  ends_at: row.ends_at,
  duration_months: row.duration_months,
  extra_vehicles: row.extra_vehicles,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildPointEntry = (row) => ({
  id: row.id,
  customer_id: row.customer_id,
  transaction_id: row.transaction_id,
  points: Number(row.points),
  earned_at: row.earned_at,
  expires_at: row.expires_at,
  created_at: row.created_at,
  customer: row.customer_ref_id
    ? {
        id: row.customer_ref_id,
        name: row.customer_name,
        phone: row.customer_phone,
      }
    : null,
});

const MEMBERSHIP_POINT_RATE = {
  BASIC: 1,
  BRONZE: 1,
  SILVER: 1.5,
  GOLD: 2.5,
  PLATINUM_VIP: 3,
};

const MEMBERSHIP_DISCOUNT_RATE = {
  BASIC: 0,
  BRONZE: 5,
  SILVER: 10,
  GOLD: 15,
  PLATINUM_VIP: 20,
};

const MEMBERSHIP_FREE_WASH_QUOTA = {
  BASIC: 1,
  BRONZE: 1,
  SILVER: 1,
  GOLD: 4,
  PLATINUM_VIP: 5,
};

const REGULAR_CATEGORY_NAMES = new Set([
  'Big SUV/Double Cabin',
  'Small/City Car',
  'SUV/MPV',
]);

const EXPRESS_CATEGORY_NAME = 'Cuci Express';

const POINT_EXPIRY_DAYS = 365;

const DEFAULT_CATEGORIES = [
  { name: 'Small/City Car', price: 45000 },
  { name: 'SUV/MPV', price: 50000 },
  { name: 'Big SUV/Double Cabin', price: 55000 },
  { name: 'Cuci Express', price: 35000 },
  { name: 'Small Bike', price: 15000 },
  { name: 'Medium Bike', price: 20000 },
  { name: 'Large Bike', price: 30000 },
];

const buildTransaction = (row) => ({
  id: row.id,
  trx_date: row.trx_date,
  customer_id: row.customer_id,
  category_id: row.category_id,
  car_brand: row.car_brand,
  plate_number: row.plate_number,
  employee_id: row.employee_id,
  price: Number(row.price) || 0,
  base_price: Number(row.base_price) || Number(row.price) || 0,
  discount_percent: Number(row.discount_percent) || 0,
  discount_amount: Number(row.discount_amount) || 0,
  is_membership_quota_free: Boolean(row.is_membership_quota_free),
  is_loyalty_free: Boolean(row.is_loyalty_free),
  is_rain_guarantee_free: Boolean(row.is_rain_guarantee_free),
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
        price: Number(row.category_price) || 0,
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

const fetchVehicleById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, customer_id, car_brand, plate_number, created_at, updated_at FROM vehicles WHERE id = ? LIMIT 1',
    [id]
  );

  if (!rows.length) {
    return null;
  }

  return buildVehicle(rows[0]);
};

const fetchActiveMembershipByVehicle = async (vehicleId, referenceDate) => {
  const [rows] = await pool.query(
    `SELECT id, vehicle_id, tier, starts_at, ends_at, duration_months, extra_vehicles, created_at, updated_at
     FROM memberships
     WHERE vehicle_id = ? AND ends_at >= ?
     ORDER BY starts_at DESC
     LIMIT 1`,
    [vehicleId, referenceDate]
  );

  if (!rows.length) {
    return null;
  }

  return buildMembership(rows[0]);
};

const findVehicleByCustomerAndPlate = async (customerId, plateNumber) => {
  const [rows] = await pool.query(
    `SELECT id, customer_id, car_brand, plate_number, created_at, updated_at
     FROM vehicles
     WHERE customer_id = ? AND plate_number = ?
     LIMIT 1`,
    [customerId, plateNumber]
  );

  if (!rows.length) {
    return null;
  }

  return buildVehicle(rows[0]);
};

const ensureDefaultCategories = async () => {
  for (const category of DEFAULT_CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (id, name, price, is_active)
       SELECT UUID(), ?, ?, true
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM categories WHERE name = ?
       )`,
      [category.name, category.price, category.name]
    );
  }
};

const ensureTransactionPricingColumns = async () => {
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS base_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER price');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER base_price');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_percent');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_membership_quota_free BOOLEAN NOT NULL DEFAULT FALSE AFTER discount_amount');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_loyalty_free BOOLEAN NOT NULL DEFAULT FALSE AFTER is_membership_quota_free');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_rain_guarantee_free BOOLEAN NOT NULL DEFAULT FALSE AFTER is_loyalty_free');
};

const ensureUserRoleSupportsSuperAdmin = async () => {
  await pool.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('SUPERADMIN', 'ADMIN', 'KARYAWAN', 'CUSTOMER') NOT NULL"
  );
};

const ensureCompanyProfileTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS company_profiles (
      id CHAR(36) NOT NULL PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL,
      address TEXT NOT NULL,
      phone VARCHAR(30) NOT NULL,
      logo_path TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await pool.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS logo_path TEXT NULL AFTER phone');
  await pool.query('ALTER TABLE company_profiles DROP COLUMN IF EXISTS logo_url');

  await pool.query(
    `INSERT INTO company_profiles (id, company_name, address, phone, logo_path)
     SELECT UUID(), 'Royal Carwash', '-', '-', NULL
     FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM company_profiles)`
  );
};

const computeTransactionPricing = async ({
  trxDate,
  customerId,
  vehicleId,
  category,
  plateNumber,
  rainGuaranteeFree,
  excludeTransactionId,
}) => {
  const basePrice = Number(category.price) || 0;
  const tier = 'BASIC';
  let resolvedTier = tier;
  let membership = null;

  if (vehicleId) {
    membership = await fetchActiveMembershipByVehicle(vehicleId, trxDate);
    if (membership?.tier) {
      resolvedTier = membership.tier;
    }
  }

  const discountPercent = MEMBERSHIP_DISCOUNT_RATE[resolvedTier] ?? 0;
  const discountAmount = Math.round((basePrice * discountPercent)) / 100;
  let finalPrice = Math.max(0, basePrice - discountAmount);
  let isMembershipQuotaFree = false;
  let isLoyaltyFree = false;
  let isRainGuaranteeFree = false;

  if (membership && customerId) {
    const freeWashQuota = MEMBERSHIP_FREE_WASH_QUOTA[resolvedTier] ?? 0;

    if (freeWashQuota > 0) {
      const monthStartDate = `${trxDate.slice(0, 7)}-01`;
      const [usageRows] = await pool.query(
        `SELECT COUNT(*) AS used_quota
         FROM transactions
         WHERE customer_id = ?
           AND plate_number = ?
           AND trx_date BETWEEN ? AND ?
           AND is_membership_quota_free = TRUE
           ${excludeTransactionId ? 'AND id <> ?' : ''}`,
        excludeTransactionId
          ? [customerId, plateNumber, monthStartDate, trxDate, excludeTransactionId]
          : [customerId, plateNumber, monthStartDate, trxDate]
      );

      const usedQuota = Number(usageRows[0]?.used_quota) || 0;
      if (usedQuota < freeWashQuota) {
        isMembershipQuotaFree = true;
      }
    }
  }

  if (!isMembershipQuotaFree && customerId) {
    const isWashCategory = REGULAR_CATEGORY_NAMES.has(category.name) || category.name === EXPRESS_CATEGORY_NAME;
    if (isWashCategory) {
      const [loyaltyRows] = await pool.query(
        `SELECT COUNT(*) AS wash_count
         FROM transactions
         WHERE customer_id = ?
           AND plate_number = ?
           AND category_id IN (
             SELECT id FROM categories WHERE name IN ('Big SUV/Double Cabin', 'Small/City Car', 'SUV/MPV', 'Cuci Express')
           )
           AND is_membership_quota_free = FALSE
           AND is_rain_guarantee_free = FALSE
           AND trx_date <= ?
           ${excludeTransactionId ? 'AND id <> ?' : ''}`,
        excludeTransactionId
          ? [customerId, plateNumber, trxDate, excludeTransactionId]
          : [customerId, plateNumber, trxDate]
      );

      const priorEligibleCount = Number(loyaltyRows[0]?.wash_count) || 0;
      if (priorEligibleCount % 9 === 8) {
        isLoyaltyFree = true;
      }
    }
  }

  const canUseRainGuarantee =
    membership
    && (resolvedTier === 'GOLD' || resolvedTier === 'PLATINUM_VIP')
    && category.name === EXPRESS_CATEGORY_NAME
    && Boolean(rainGuaranteeFree);

  if (canUseRainGuarantee) {
    isRainGuaranteeFree = true;
  }

  if (isMembershipQuotaFree || isLoyaltyFree || isRainGuaranteeFree) {
    finalPrice = 0;
  }

  return {
    membership,
    tier: resolvedTier,
    base_price: basePrice,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    is_membership_quota_free: isMembershipQuotaFree,
    is_loyalty_free: isLoyaltyFree,
    is_rain_guarantee_free: isRainGuaranteeFree,
    final_price: finalPrice,
  };
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

app.get('/company-profile', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, company_name, address, phone, logo_path, created_at, updated_at FROM company_profiles ORDER BY created_at ASC LIMIT 1'
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'Company profile not found' });
  }

  return res.json(buildCompanyProfile(rows[0]));
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
  const requesterRole = req.user?.role;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!isAdminRole(requesterRole)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (role === 'SUPERADMIN' && !isSuperAdmin(requesterRole)) {
    return res.status(403).json({ message: 'Hanya superadmin yang bisa membuat superadmin' });
  }

  if (role === 'ADMIN' && !isSuperAdmin(requesterRole)) {
    return res.status(403).json({ message: 'Hanya superadmin yang bisa membuat admin kasir' });
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
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;

  if (!isAdminRole(requesterRole) && requesterId !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

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
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;

  if (!isAdminRole(requesterRole) && requesterId !== id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

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
  const requesterRole = req.user?.role;

  if (!isAdminRole(requesterRole)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'User not found' });
  }

  const targetRole = rows[0].role;
  if ((targetRole === 'SUPERADMIN' || targetRole === 'ADMIN') && !isSuperAdmin(requesterRole)) {
    return res.status(403).json({ message: 'Hanya superadmin yang dapat menghapus superadmin/admin' });
  }

  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ success: true });
}));

app.put('/company-profile', asyncHandler(async (req, res) => {
  const requesterRole = req.user?.role;
  const { company_name, address, phone, logo_file } = req.body;

  if (!isSuperAdmin(requesterRole)) {
    return res.status(403).json({ message: 'Hanya superadmin yang dapat mengubah data perusahaan' });
  }

  if (!company_name || !address || !phone) {
    return res.status(400).json({ message: 'Nama perusahaan, alamat, dan nomor hp wajib diisi' });
  }

  const [rows] = await pool.query('SELECT id, logo_path FROM company_profiles ORDER BY created_at ASC LIMIT 1');
  if (!rows.length) {
    return res.status(404).json({ message: 'Company profile not found' });
  }

  const companyId = rows[0].id;
  const existingLogoPath = rows[0].logo_path || null;

  let nextLogoPath = existingLogoPath;
  if (logo_file?.base64_data) {
    if (!logo_file.mime_type?.startsWith('image/')) {
      return res.status(400).json({ message: 'File logo harus berupa gambar' });
    }

    if (logo_file.size && Number(logo_file.size) > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'Ukuran logo maksimal 2MB' });
    }

    nextLogoPath = saveCompanyLogoFile({
      fileName: logo_file.file_name,
      mimeType: logo_file.mime_type,
      base64Data: logo_file.base64_data,
    });

    if (existingLogoPath) {
      const existingFilePath = path.join(__dirname, existingLogoPath.replace(/^\//, ''));
      if (fs.existsSync(existingFilePath)) {
        fs.unlinkSync(existingFilePath);
      }
    }
  }

  await pool.query(
    'UPDATE company_profiles SET company_name = ?, address = ?, phone = ?, logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [company_name, address, phone, nextLogoPath, companyId]
  );

  const [updatedRows] = await pool.query(
    'SELECT id, company_name, address, phone, logo_path, created_at, updated_at FROM company_profiles WHERE id = ? LIMIT 1',
    [companyId]
  );

  return res.json(buildCompanyProfile(updatedRows[0]));
}));

app.get('/vehicles', asyncHandler(async (req, res) => {
  const { customerId } = req.query;
  const requesterId = req.user?.userId;
  const requesterRole = req.user?.role;
  const values = [];
  let query = 'SELECT id, customer_id, car_brand, plate_number, created_at, updated_at FROM vehicles';

  if (requesterRole === 'CUSTOMER') {
    query += ' WHERE customer_id = ?';
    values.push(requesterId);
  } else if (customerId) {
    query += ' WHERE customer_id = ?';
    values.push(customerId);
  }

  query += ' ORDER BY created_at DESC';

  const [rows] = await pool.query(query, values);
  res.json(rows.map(buildVehicle));
}));

app.post('/vehicles', asyncHandler(async (req, res) => {
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;
  const { customer_id, car_brand, plate_number } = req.body;
  const resolvedCustomerId = requesterRole === 'CUSTOMER' ? requesterId : customer_id;

  if (!resolvedCustomerId || !car_brand || !plate_number) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const vehicleId = randomUUID();
  await pool.query(
    'INSERT INTO vehicles (id, customer_id, car_brand, plate_number) VALUES (?, ?, ?, ?)',
    [vehicleId, resolvedCustomerId, car_brand, plate_number]
  );

  const vehicle = await fetchVehicleById(vehicleId);
  if (!vehicle) {
    return res.status(500).json({ message: 'Failed to load vehicle' });
  }

  return res.status(201).json(vehicle);
}));

app.put('/vehicles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { car_brand, plate_number } = req.body;
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;

  if (!car_brand) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const vehicle = await fetchVehicleById(id);
  if (!vehicle) {
    return res.status(404).json({ message: 'Vehicle not found' });
  }

  if (requesterRole === 'CUSTOMER') {
    if (vehicle.customer_id !== requesterId) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await pool.query(
      'UPDATE vehicles SET car_brand = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [car_brand, id]
    );
  } else {
    if (!plate_number) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await pool.query(
      'UPDATE vehicles SET car_brand = ?, plate_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [car_brand, plate_number, id]
    );
  }

  const updatedVehicle = await fetchVehicleById(id);
  return res.json(updatedVehicle);
}));

app.delete('/vehicles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;

  if (requesterRole === 'CUSTOMER') {
    const vehicle = await fetchVehicleById(id);
    if (!vehicle || vehicle.customer_id !== requesterId) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
  }

  await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
  return res.json({ success: true });
}));

app.get('/memberships', asyncHandler(async (req, res) => {
  const { customerId, vehicleId, includeExpired } = req.query;
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;
  const skipActiveFilter = includeExpired === 'true';
  const params = [];
  let query = `
    SELECT m.id, m.vehicle_id, m.tier, m.starts_at, m.ends_at, m.duration_months, m.extra_vehicles,
      m.created_at, m.updated_at
    FROM memberships m
    JOIN vehicles v ON m.vehicle_id = v.id`;

  if (requesterRole === 'CUSTOMER') {
    query += ' WHERE v.customer_id = ?';
    params.push(requesterId);
  } else if (vehicleId) {
    query += ' WHERE m.vehicle_id = ?';
    params.push(vehicleId);
  } else if (customerId) {
    query += ' WHERE v.customer_id = ?';
    params.push(customerId);
  }

  if (!skipActiveFilter) {
    query += params.length ? ' AND m.ends_at >= CURDATE()' : ' WHERE m.ends_at >= CURDATE()';
  }

  query += ' ORDER BY m.starts_at DESC';

  const [rows] = await pool.query(query, params);
  const memberships = rows.map(buildMembership);
  const latestByVehicle = memberships.reduce((acc, membership) => {
    if (!acc.has(membership.vehicle_id)) {
      acc.set(membership.vehicle_id, membership);
    }
    return acc;
  }, new Map());

  return res.json(Array.from(latestByVehicle.values()));
}));

app.post('/memberships', asyncHandler(async (req, res) => {
  const {
    vehicle_id,
    tier,
    duration_months,
    starts_at,
    extra_vehicles,
    extra_vehicle_ids,
  } = req.body;

  if (!vehicle_id || !tier || !duration_months) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const vehicle = await fetchVehicleById(vehicle_id);
  if (!vehicle) {
    return res.status(404).json({ message: 'Vehicle not found' });
  }

  const parsedExtraVehicleIds = Array.isArray(extra_vehicle_ids)
    ? Array.from(new Set(extra_vehicle_ids.filter(Boolean)))
    : [];

  if (tier === 'PLATINUM_VIP' && Number(extra_vehicles || 0) !== parsedExtraVehicleIds.length) {
    return res.status(400).json({
      message: 'Jumlah kendaraan tambahan harus sesuai dengan kendaraan yang dipilih',
    });
  }

  if (tier !== 'PLATINUM_VIP' && parsedExtraVehicleIds.length > 0) {
    return res.status(400).json({
      message: 'Kendaraan tambahan hanya tersedia untuk Platinum VIP',
    });
  }

  if (parsedExtraVehicleIds.includes(vehicle_id)) {
    return res.status(400).json({
      message: 'Kendaraan utama tidak boleh dipilih sebagai kendaraan tambahan',
    });
  }

  const extraVehicles = [];
  for (const extraVehicleId of parsedExtraVehicleIds) {
    const extraVehicle = await fetchVehicleById(extraVehicleId);
    if (!extraVehicle) {
      return res.status(404).json({ message: `Kendaraan tambahan tidak ditemukan: ${extraVehicleId}` });
    }

    if (extraVehicle.customer_id !== vehicle.customer_id) {
      return res.status(400).json({
        message: 'Kendaraan tambahan harus milik customer yang sama',
      });
    }

    extraVehicles.push(extraVehicle);
  }

  const startDate = starts_at ? new Date(starts_at) : new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + Number(duration_months));

  const membershipId = randomUUID();
  const resolvedExtraVehicles = tier === 'PLATINUM_VIP' ? parsedExtraVehicleIds.length : 0;
  const startDateString = startDate.toISOString().slice(0, 10);
  const endDateString = endDate.toISOString().slice(0, 10);
  const affectedVehicleIds = [vehicle_id, ...extraVehicles.map((item) => item.id)];

  if (affectedVehicleIds.length > 0) {
    const placeholders = affectedVehicleIds.map(() => '?').join(', ');
    await pool.query(
      `UPDATE memberships
       SET ends_at = DATE_SUB(?, INTERVAL 1 DAY), updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_id IN (${placeholders})
         AND ends_at >= ?`,
      [startDateString, ...affectedVehicleIds, startDateString]
    );
  }

  await pool.query(
    `INSERT INTO memberships
      (id, vehicle_id, tier, starts_at, ends_at, duration_months, extra_vehicles)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membershipId,
      vehicle_id,
      tier,
      startDateString,
      endDateString,
      Number(duration_months),
      resolvedExtraVehicles,
    ]
  );

  for (const extraVehicle of extraVehicles) {
    await pool.query(
      `INSERT INTO memberships
        (id, vehicle_id, tier, starts_at, ends_at, duration_months, extra_vehicles)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        extraVehicle.id,
        tier,
        startDateString,
        endDateString,
        Number(duration_months),
        0,
      ]
    );
  }

  const [rows] = await pool.query(
    `SELECT id, vehicle_id, tier, starts_at, ends_at, duration_months, extra_vehicles, created_at, updated_at
     FROM memberships
     WHERE id = ?
     LIMIT 1`,
    [membershipId]
  );

  return res.status(201).json(buildMembership(rows[0]));
}));

app.get('/points', asyncHandler(async (req, res) => {
  const { customerId } = req.query;
  const requesterRole = req.user?.role;
  const requesterId = req.user?.userId;
  const resolvedCustomerId = requesterRole === 'CUSTOMER' ? requesterId : customerId;

  const values = [];
  let query = `SELECT
      p.id,
      p.customer_id,
      p.transaction_id,
      p.points,
      p.earned_at,
      p.expires_at,
      p.created_at,
      customer.id AS customer_ref_id,
      customer.name AS customer_name,
      customer.phone AS customer_phone
     FROM points p
     LEFT JOIN users customer ON p.customer_id = customer.id`;

  if (resolvedCustomerId) {
    query += ' WHERE customer_id = ?';
    values.push(resolvedCustomerId);
  }

  query += ' ORDER BY p.earned_at DESC';

  const [rows] = await pool.query(query, values);

  return res.json(rows.map(buildPointEntry));
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

app.post('/transactions/preview-pricing', asyncHandler(async (req, res) => {
  const { trx_date, customer_id, vehicle_id, category_id, plate_number, rain_guarantee_free } = req.body;

  if (!trx_date || !category_id || !plate_number) {
    return res.status(400).json({ message: 'trx_date, category_id, dan plate_number wajib diisi' });
  }

  const [categoryRows] = await pool.query(
    'SELECT id, name, price FROM categories WHERE id = ? LIMIT 1',
    [category_id]
  );

  if (!categoryRows.length) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  }

  const pricing = await computeTransactionPricing({
    trxDate: trx_date,
    customerId: customer_id || null,
    vehicleId: vehicle_id || null,
    category: categoryRows[0],
    plateNumber: plate_number,
    rainGuaranteeFree: rain_guarantee_free,
  });

  return res.json(pricing);
}));

app.post('/transactions', asyncHandler(async (req, res) => {
  const {
    trx_date,
    customer_id,
    vehicle_id,
    category_id,
    car_brand,
    plate_number,
    employee_id,
    notes,
    rain_guarantee_free,
  } = req.body;

  if (!trx_date || !category_id || !car_brand || !plate_number || !employee_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const [categoryRows] = await pool.query(
    'SELECT id, name, price FROM categories WHERE id = ? LIMIT 1',
    [category_id]
  );

  if (!categoryRows.length) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  }

  const pricing = await computeTransactionPricing({
    trxDate: trx_date,
    customerId: customer_id || null,
    vehicleId: vehicle_id || null,
    category: categoryRows[0],
    plateNumber: plate_number,
    rainGuaranteeFree: rain_guarantee_free,
  });

  const transactionId = randomUUID();
  await pool.query(
    `INSERT INTO transactions
      (id, trx_date, customer_id, category_id, car_brand, plate_number, employee_id, price, base_price,
       discount_percent, discount_amount, is_membership_quota_free, is_loyalty_free, is_rain_guarantee_free,
       notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')`,
    [
      transactionId,
      trx_date,
      customer_id || null,
      category_id,
      car_brand,
      plate_number,
      employee_id,
      pricing.final_price,
      pricing.base_price,
      pricing.discount_percent,
      pricing.discount_amount,
      pricing.is_membership_quota_free,
      pricing.is_loyalty_free,
      pricing.is_rain_guarantee_free,
      notes || null,
    ]
  );

  const transaction = await fetchTransactionById(transactionId);
  if (!transaction) {
    return res.status(500).json({ message: 'Failed to load transaction' });
  }

  return res.status(201).json(transaction);
}));

app.put('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    customer_id,
    vehicle_id,
    category_id,
    car_brand,
    plate_number,
    employee_id,
    notes,
    rain_guarantee_free,
  } = req.body;

  const existingTransaction = await fetchTransactionById(id);
  if (!existingTransaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const resolvedCategoryId = category_id || existingTransaction.category_id;
  const [categoryRows] = await pool.query(
    'SELECT id, name, price FROM categories WHERE id = ? LIMIT 1',
    [resolvedCategoryId]
  );

  if (!categoryRows.length) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  }

  const resolvedCustomerId = customer_id !== undefined ? (customer_id || null) : existingTransaction.customer_id;
  const resolvedPlateNumber = plate_number || existingTransaction.plate_number;
  const resolvedTrxDate = existingTransaction.trx_date;

  const pricing = await computeTransactionPricing({
    trxDate: resolvedTrxDate,
    customerId: resolvedCustomerId,
    vehicleId: vehicle_id || null,
    category: categoryRows[0],
    plateNumber: resolvedPlateNumber,
    rainGuaranteeFree: rain_guarantee_free,
    excludeTransactionId: id,
  });

  await pool.query(
    `UPDATE transactions
     SET customer_id = ?,
         category_id = ?,
         car_brand = ?,
         plate_number = ?,
         employee_id = ?,
         price = ?,
         base_price = ?,
         discount_percent = ?,
         discount_amount = ?,
         is_membership_quota_free = ?,
         is_loyalty_free = ?,
         is_rain_guarantee_free = ?,
         notes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      resolvedCustomerId,
      resolvedCategoryId,
      car_brand || existingTransaction.car_brand,
      resolvedPlateNumber,
      employee_id || existingTransaction.employee_id,
      pricing.final_price,
      pricing.base_price,
      pricing.discount_percent,
      pricing.discount_amount,
      pricing.is_membership_quota_free,
      pricing.is_loyalty_free,
      pricing.is_rain_guarantee_free,
      notes !== undefined ? (notes || null) : existingTransaction.notes,
      id,
    ]
  );

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
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  if (status === 'DONE' && transaction.customer_id) {
    const [existing] = await pool.query(
      'SELECT id FROM points WHERE transaction_id = ? LIMIT 1',
      [transaction.id]
    );

    if (!existing.length) {
      const vehicle = await findVehicleByCustomerAndPlate(
        transaction.customer_id,
        transaction.plate_number
      );
      const membership = vehicle
        ? await fetchActiveMembershipByVehicle(vehicle.id, transaction.trx_date)
        : null;
      const tier = membership?.tier || 'BASIC';
      const points = MEMBERSHIP_POINT_RATE[tier] ?? MEMBERSHIP_POINT_RATE.BASIC;
      const earnedDate = new Date(transaction.trx_date);
      const expiresDate = addDays(earnedDate, POINT_EXPIRY_DAYS);

      await pool.query(
        `INSERT INTO points
          (id, customer_id, transaction_id, points, earned_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          transaction.customer_id,
          transaction.id,
          points,
          earnedDate.toISOString().slice(0, 10),
          expiresDate.toISOString().slice(0, 10),
        ]
      );
    }
  }

  if (status !== 'DONE') {
    await pool.query('DELETE FROM points WHERE transaction_id = ?', [transaction.id]);
  }

  return res.json(transaction);
}));

app.delete('/transactions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
  return res.json({ success: true });
}));

Promise.all([
  ensureUserRoleSupportsSuperAdmin(),
  ensureDefaultCategories(),
  ensureTransactionPricingColumns(),
  ensureCompanyProfileTable(),
])
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API server running on port ${port}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize API server', error);
    process.exit(1);
  });
