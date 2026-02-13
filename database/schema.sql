CREATE DATABASE IF NOT EXISTS roya2064_cw;
USE roya2064_cw;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPERADMIN', 'ADMIN', 'KARYAWAN', 'CUSTOMER') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, phone, password_hash, role)
VALUES
  (UUID(), 'M Teddy Syahputra', '082392130852', '$2a$12$GKe0XsQKmn4p7K5KPOLijuZHf8XG8rErecLrHBJ7EFGSeR9MPtdJy', 'SUPERADMIN'),
  (UUID(), 'Vanessa', '08216205124', '$2a$12$NbzWkwMi/saoYQafPg.kCOLXlicuD1Vc1yY8jthuGq7FldU5NxZOy', 'ADMIN'),
  (UUID(), 'Risky Ramadan', '085335142086', '$2a$12$NbzWkwMi/saoYQafPg.kCOLXlicuD1Vc1yY8jthuGq7FldU5NxZOy', 'KARYAWAN'),
  (UUID(), 'Endra Saputra', '085136872024', '$2a$12$NbzWkwMi/saoYQafPg.kCOLXlicuD1Vc1yY8jthuGq7FldU5NxZOy', 'KARYAWAN');

CREATE TABLE IF NOT EXISTS company_profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  company_name VARCHAR(150) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(30) NOT NULL,
  logo_path TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO company_profiles (id, company_name, address, phone, logo_path)
SELECT UUID(), 'Royal Carwash', 'Jalan Raya Pandau Permai No 1 Siak Hulu, Pandau Jaya, Kampar, Riau', '08216205124', '/uploads/logos/logo.png' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM company_profiles);

CREATE TABLE IF NOT EXISTS vehicles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  car_brand VARCHAR(150) NOT NULL,
  plate_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicles_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicles_customer ON vehicles (customer_id);
CREATE INDEX idx_vehicles_plate ON vehicles (plate_number);

CREATE TABLE IF NOT EXISTS memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  transaction_code VARCHAR(40) NOT NULL,
  vehicle_id CHAR(36) NOT NULL,
  tier ENUM('BASIC', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM_VIP') NOT NULL,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  duration_months INT NOT NULL,
  extra_vehicles INT NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_memberships_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_memberships_vehicle ON memberships (vehicle_id);
CREATE INDEX idx_memberships_end ON memberships (ends_at);
CREATE UNIQUE INDEX idx_memberships_transaction_code ON memberships (transaction_code);

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Small/City Car', 45000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Small/City Car');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'SUV/MPV', 50000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'SUV/MPV');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Big SUV/Double Cabin', 55000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Big SUV/Double Cabin');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Cuci Express', 35000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Cuci Express');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Small Bike', 15000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Small Bike');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Medium Bike', 20000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Medium Bike');

INSERT INTO categories (id, name, price, is_active)
SELECT UUID(), 'Large Bike', 30000, TRUE FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Large Bike');

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  transaction_code VARCHAR(40) NOT NULL,
  trx_date DATE NOT NULL,
  customer_id CHAR(36) NULL,
  category_id CHAR(36) NOT NULL,
  car_brand VARCHAR(150) NOT NULL,
  plate_number VARCHAR(50) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  created_by CHAR(36) NULL,
  price DECIMAL(12,2) NOT NULL,
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_membership_quota_free BOOLEAN NOT NULL DEFAULT FALSE,
  is_loyalty_free BOOLEAN NOT NULL DEFAULT FALSE,
  is_rain_guarantee_free BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('QUEUED', 'WASHING', 'DONE') NOT NULL DEFAULT 'QUEUED',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transactions_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_trx_date ON transactions (trx_date);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_transactions_employee ON transactions (employee_id);
CREATE INDEX idx_transactions_created_by ON transactions (created_by);
CREATE INDEX idx_transactions_customer ON transactions (customer_id);
CREATE UNIQUE INDEX idx_transactions_transaction_code ON transactions (transaction_code);

CREATE TABLE IF NOT EXISTS points (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  transaction_id CHAR(36) NOT NULL UNIQUE,
  points DECIMAL(6,2) NOT NULL,
  earned_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_points_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_points_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_points_customer ON points (customer_id);
CREATE INDEX idx_points_expires ON points (expires_at);

CREATE TABLE IF NOT EXISTS expenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  expense_code VARCHAR(40) NOT NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category ENUM('KASBON', 'OPERASIONAL', 'LAINNYA') NOT NULL,
  notes TEXT NOT NULL,
  employee_id CHAR(36) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_expenses_expense_code ON expenses (expense_code);
CREATE INDEX idx_expenses_date ON expenses (expense_date);
CREATE INDEX idx_expenses_category ON expenses (category);
CREATE INDEX idx_expenses_employee ON expenses (employee_id);
