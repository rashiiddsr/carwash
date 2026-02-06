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

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  trx_date DATE NOT NULL,
  customer_id CHAR(36) NULL,
  category_id CHAR(36) NOT NULL,
  car_brand VARCHAR(150) NOT NULL,
  plate_number VARCHAR(50) NOT NULL,
  employee_id CHAR(36) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  status ENUM('QUEUED', 'WASHING', 'FINISHING', 'DONE') NOT NULL DEFAULT 'QUEUED',
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
