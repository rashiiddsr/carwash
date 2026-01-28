/*
  # Royal Carwash POS Database Schema

  ## Overview
  Complete database schema for Royal Carwash POS system with three user roles:
  ADMIN, KARYAWAN (Employee), and CUSTOMER.

  ## 1. New Tables

  ### `users`
  User accounts for all roles (ADMIN, KARYAWAN, CUSTOMER)
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, required) - Full name
  - `phone` (text, unique, required) - Phone number for login
  - `password_hash` (text, required) - Bcrypt hashed password
  - `role` (enum, required) - User role: ADMIN, KARYAWAN, CUSTOMER
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### `categories`
  Service categories for car wash (e.g., Cuci Mobil Sedang, Cuci Motor, etc.)
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, required) - Category name
  - `price` (integer, required) - Service price in IDR
  - `is_active` (boolean, default true) - Active status
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### `transactions`
  Daily car wash transactions
  - `id` (uuid, primary key, auto-generated)
  - `trx_date` (date, required, default today) - Transaction date
  - `customer_id` (uuid, nullable, foreign key to users) - Customer (optional for walk-in)
  - `category_id` (uuid, required, foreign key to categories) - Service category
  - `car_brand` (text, required) - Car brand/model
  - `plate_number` (text, required) - License plate number
  - `employee_id` (uuid, required, foreign key to users) - Assigned employee
  - `price` (integer, required) - Price snapshot at transaction time
  - `status` (enum, required, default QUEUED) - QUEUED, WASHING, FINISHING, DONE
  - `notes` (text, nullable) - Additional notes
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ## 2. Security (Row Level Security)

  ### Users Table
  - Admins can manage all users
  - Karyawan can view own profile
  - Customers can view own profile
  - All authenticated users can update their own profile

  ### Categories Table
  - All authenticated users can view active categories
  - Only admins can create/update/delete categories

  ### Transactions Table
  - Admins can view and manage all transactions
  - Karyawan can view and update status of their assigned transactions
  - Customers can view their own transactions (where customer_id matches)

  ## 3. Important Notes
  - Phone numbers must be unique across all users
  - Transactions store price snapshot to preserve historical pricing
  - Customer ID is nullable to support walk-in customers
  - Status workflow: QUEUED → WASHING → FINISHING → DONE
  - All tables use UUID for primary keys
  - Timestamps are automatically managed
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('ADMIN', 'KARYAWAN', 'CUSTOMER');
CREATE TYPE transaction_status AS ENUM ('QUEUED', 'WASHING', 'FINISHING', 'DONE');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trx_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  car_brand text NOT NULL,
  plate_number text NOT NULL,
  employee_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  price integer NOT NULL CHECK (price > 0),
  status transaction_status NOT NULL DEFAULT 'QUEUED',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_trx_date ON transactions(trx_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_employee_id ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- RLS Policies for categories table
CREATE POLICY "Anyone authenticated can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  ));

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- RLS Policies for transactions table
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Karyawan can view assigned transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Customers can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'KARYAWAN')
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Karyawan can update assigned transaction status"
  ON transactions FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins can delete transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();