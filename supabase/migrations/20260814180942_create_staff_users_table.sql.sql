/*
# Create staff_users table for multi-user authentication

1. New Tables
- `staff_users` — stores employee/staff login accounts for the farm management system
  - `id` (text, primary key) — unique identifier
  - `full_name` (text, not null) — employee's full display name
  - `username` (text, not null, unique) — login username
  - `password` (text, not null) — login password (plain text for this local system)
  - `role` (text, not null) — 'admin' or 'dataentry'
  - `status` (text, not null) — 'Active' or 'Inactive'
  - `created_at` (timestamptz) — when the account was created
  - `updated_at` (timestamptz) — last modification timestamp

2. Seed Data
- Inserts a default admin account: username 'admin', password '123', role 'admin', status 'Active'
- The old app_settings.admin_password and app_settings.dataentry_password columns remain
  for backward compatibility but the primary auth source is now staff_users.

3. Security
- Enable RLS on `staff_users`.
- Allow anon + authenticated CRUD because the app uses the anon key (no Supabase Auth sign-in).
  This is a single-tenant farm management system with its own internal auth logic.
*/

CREATE TABLE IF NOT EXISTS staff_users (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'dataentry' CHECK (role IN ('admin', 'dataentry')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_users_select" ON staff_users;
CREATE POLICY "staff_users_select" ON staff_users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_users_insert" ON staff_users;
CREATE POLICY "staff_users_insert" ON staff_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_users_update" ON staff_users;
CREATE POLICY "staff_users_update" ON staff_users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_users_delete" ON staff_users;
CREATE POLICY "staff_users_delete" ON staff_users FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default admin account (idempotent — only insert if table is empty)
INSERT INTO staff_users (id, full_name, username, password, role, status)
SELECT 'staff-admin', 'Administrator', 'admin', '123', 'admin', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM staff_users LIMIT 1);
