CREATE DATABASE IF NOT EXISTS roya2064_cw;
USE roya2064_cw;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'KARYAWAN', 'CUSTOMER') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, phone, password_hash, role)
VALUES
  (UUID(), 'Admin Royal Carwash', '081271110555', '$2b$12$jlhRwWc74ItUZj9puebRu.dCwuZPsf2XrBeCeqvDCuuA0Co1lKtXO', 'ADMIN'),
  (UUID(), 'Karyawan Royal Carwash', '0812711103333', '$2b$12$jlhRwWc74ItUZj9puebRu.dCwuZPsf2XrBeCeqvDCuuA0Co1lKtXO', 'KARYAWAN'),
  (UUID(), 'Customer Royal Carwash', '0812711104444', '$2b$12$jlhRwWc74ItUZj9puebRu.dCwuZPsf2XrBeCeqvDCuuA0Co1lKtXO', 'CUSTOMER');

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
  vehicle_id CHAR(36) NOT NULL,
  tier ENUM('BASIC', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM_VIP') NOT NULL,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  duration_months INT NOT NULL,
  extra_vehicles INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_memberships_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_memberships_vehicle ON memberships (vehicle_id);
CREATE INDEX idx_memberships_end ON memberships (ends_at);

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
  trx_date DATE NOT NULL,
  customer_id CHAR(36) NULL,
  category_id CHAR(36) NOT NULL,
  car_brand VARCHAR(150) NOT NULL,
  plate_number VARCHAR(50) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  status ENUM('QUEUED', 'WASHING', 'DONE') NOT NULL DEFAULT 'QUEUED',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transactions_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_trx_date ON transactions (trx_date);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_transactions_employee ON transactions (employee_id);
CREATE INDEX idx_transactions_customer ON transactions (customer_id);

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
