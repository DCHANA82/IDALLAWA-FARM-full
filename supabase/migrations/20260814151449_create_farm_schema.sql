/*
# Create Farm Management Schema

## Overview
Creates the complete database schema for the farm management system — a single-tenant
application managing crops, nursery, labor/payroll, vouchers, ledger, and expenses.

## New Tables (13 total)
1. farm_profile — singleton row with farm name and owner name
2. crops — crop/plot records (seasonal & perennial)
3. crop_expenses — per-crop field input costs
4. crop_harvests — harvest records with buyer & sale price
5. nursery_batches — seedling/planting material batches
6. nursery_costs — costs associated with nursery batches
7. nursery_sales — sales of nursery seedlings/material
8. nursery_transfers — transfers of seedlings from nursery to crop plots
9. workers — permanent & casual labor
10. attendance — daily attendance with task allocation
11. vouchers — payment/sales/loan/payroll vouchers
12. ledger_entries — capital, loans, shop transfers, equity
13. expenses — general farm expenses

## Security
- All tables have RLS enabled.
- Single-tenant app with no user sign-in. All data is intentionally shared/public,
  so policies use TO anon, authenticated with USING (true) / WITH CHECK (true).

## Notes
- All primary keys are text to match the frontend ID format.
- Numeric columns use numeric(14,2) for monetary precision.
- No seed data is inserted — the app starts with empty tables.
*/

CREATE TABLE IF NOT EXISTS farm_profile (
  id text PRIMARY KEY DEFAULT 'singleton',
  farm_name text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crops (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Seasonal',
  season text NOT NULL DEFAULT 'Yala',
  plot text NOT NULL DEFAULT '',
  area_acres numeric(10,2) NOT NULL DEFAULT 0,
  planted_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Active',
  notes text
);

CREATE TABLE IF NOT EXISTS crop_expenses (
  id text PRIMARY KEY,
  crop_id text NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_crop_expenses_crop_id ON crop_expenses(crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_expenses_date ON crop_expenses(date);

CREATE TABLE IF NOT EXISTS crop_harvests (
  id text PRIMARY KEY,
  crop_id text NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_kg numeric(10,2) NOT NULL DEFAULT 0,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  buyer text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_crop_harvests_crop_id ON crop_harvests(crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_harvests_date ON crop_harvests(date);

CREATE TABLE IF NOT EXISTS nursery_batches (
  id text PRIMARY KEY,
  code text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Seasonal Seedling',
  variety text NOT NULL DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  qty_units integer NOT NULL DEFAULT 0,
  unit_type text NOT NULL DEFAULT 'tray',
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Growing'
);

CREATE TABLE IF NOT EXISTS nursery_costs (
  id text PRIMARY KEY,
  batch_id text NOT NULL DEFAULT 'shared',
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_nursery_costs_batch_id ON nursery_costs(batch_id);

CREATE TABLE IF NOT EXISTS nursery_sales (
  id text PRIMARY KEY,
  batch_id text NOT NULL REFERENCES nursery_batches(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  buyer text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 0,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  invoice_no text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_nursery_sales_batch_id ON nursery_sales(batch_id);

CREATE TABLE IF NOT EXISTS nursery_transfers (
  id text PRIMARY KEY,
  batch_id text NOT NULL REFERENCES nursery_batches(id) ON DELETE CASCADE,
  crop_id text NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  qty integer NOT NULL DEFAULT 0,
  unit_value numeric(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_nursery_transfers_batch_id ON nursery_transfers(batch_id);
CREATE INDEX IF NOT EXISTS idx_nursery_transfers_crop_id ON nursery_transfers(crop_id);

CREATE TABLE IF NOT EXISTS workers (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Casual',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT '',
  monthly_basic numeric(14,2) NOT NULL DEFAULT 0,
  allowances numeric(14,2) NOT NULL DEFAULT 0,
  daily_wage numeric(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
  id text PRIMARY KEY,
  worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Present',
  task_plot text DEFAULT '',
  hours numeric(5,1) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_id ON attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS vouchers (
  id text PRIMARY KEY,
  voucher_no text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL DEFAULT 'Payment',
  party text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reference text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id text PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL DEFAULT 'Capital',
  direction text NOT NULL DEFAULT 'In',
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reference text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date);
CREATE INDEX IF NOT EXISTS idx_ledger_kind ON ledger_entries(kind);

CREATE TABLE IF NOT EXISTS expenses (
  id text PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  class text NOT NULL DEFAULT 'Fixed Overhead',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reference text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'farm_profile','crops','crop_expenses','crop_harvests','nursery_batches',
    'nursery_costs','nursery_sales','nursery_transfers','workers','attendance',
    'vouchers','ledger_entries','expenses'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "farm_profile_select" ON farm_profile;
CREATE POLICY "farm_profile_select" ON farm_profile FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "farm_profile_insert" ON farm_profile;
CREATE POLICY "farm_profile_insert" ON farm_profile FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "farm_profile_update" ON farm_profile;
CREATE POLICY "farm_profile_update" ON farm_profile FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "farm_profile_delete" ON farm_profile;
CREATE POLICY "farm_profile_delete" ON farm_profile FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "crops_select" ON crops;
CREATE POLICY "crops_select" ON crops FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "crops_insert" ON crops;
CREATE POLICY "crops_insert" ON crops FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "crops_update" ON crops;
CREATE POLICY "crops_update" ON crops FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "crops_delete" ON crops;
CREATE POLICY "crops_delete" ON crops FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "crop_expenses_select" ON crop_expenses;
CREATE POLICY "crop_expenses_select" ON crop_expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "crop_expenses_insert" ON crop_expenses;
CREATE POLICY "crop_expenses_insert" ON crop_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "crop_expenses_update" ON crop_expenses;
CREATE POLICY "crop_expenses_update" ON crop_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "crop_expenses_delete" ON crop_expenses;
CREATE POLICY "crop_expenses_delete" ON crop_expenses FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "crop_harvests_select" ON crop_harvests;
CREATE POLICY "crop_harvests_select" ON crop_harvests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "crop_harvests_insert" ON crop_harvests;
CREATE POLICY "crop_harvests_insert" ON crop_harvests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "crop_harvests_update" ON crop_harvests;
CREATE POLICY "crop_harvests_update" ON crop_harvests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "crop_harvests_delete" ON crop_harvests;
CREATE POLICY "crop_harvests_delete" ON crop_harvests FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "nursery_batches_select" ON nursery_batches;
CREATE POLICY "nursery_batches_select" ON nursery_batches FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "nursery_batches_insert" ON nursery_batches;
CREATE POLICY "nursery_batches_insert" ON nursery_batches FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_batches_update" ON nursery_batches;
CREATE POLICY "nursery_batches_update" ON nursery_batches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_batches_delete" ON nursery_batches;
CREATE POLICY "nursery_batches_delete" ON nursery_batches FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "nursery_costs_select" ON nursery_costs;
CREATE POLICY "nursery_costs_select" ON nursery_costs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "nursery_costs_insert" ON nursery_costs;
CREATE POLICY "nursery_costs_insert" ON nursery_costs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_costs_update" ON nursery_costs;
CREATE POLICY "nursery_costs_update" ON nursery_costs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_costs_delete" ON nursery_costs;
CREATE POLICY "nursery_costs_delete" ON nursery_costs FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "nursery_sales_select" ON nursery_sales;
CREATE POLICY "nursery_sales_select" ON nursery_sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "nursery_sales_insert" ON nursery_sales;
CREATE POLICY "nursery_sales_insert" ON nursery_sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_sales_update" ON nursery_sales;
CREATE POLICY "nursery_sales_update" ON nursery_sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_sales_delete" ON nursery_sales;
CREATE POLICY "nursery_sales_delete" ON nursery_sales FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "nursery_transfers_select" ON nursery_transfers;
CREATE POLICY "nursery_transfers_select" ON nursery_transfers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "nursery_transfers_insert" ON nursery_transfers;
CREATE POLICY "nursery_transfers_insert" ON nursery_transfers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_transfers_update" ON nursery_transfers;
CREATE POLICY "nursery_transfers_update" ON nursery_transfers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "nursery_transfers_delete" ON nursery_transfers;
CREATE POLICY "nursery_transfers_delete" ON nursery_transfers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "workers_select" ON workers;
CREATE POLICY "workers_select" ON workers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workers_insert" ON workers;
CREATE POLICY "workers_insert" ON workers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workers_update" ON workers;
CREATE POLICY "workers_update" ON workers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workers_delete" ON workers;
CREATE POLICY "workers_delete" ON workers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_delete" ON attendance;
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vouchers_select" ON vouchers;
CREATE POLICY "vouchers_select" ON vouchers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "vouchers_insert" ON vouchers;
CREATE POLICY "vouchers_insert" ON vouchers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vouchers_update" ON vouchers;
CREATE POLICY "vouchers_update" ON vouchers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vouchers_delete" ON vouchers;
CREATE POLICY "vouchers_delete" ON vouchers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ledger_entries_select" ON ledger_entries;
CREATE POLICY "ledger_entries_select" ON ledger_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ledger_entries_insert" ON ledger_entries;
CREATE POLICY "ledger_entries_insert" ON ledger_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ledger_entries_update" ON ledger_entries;
CREATE POLICY "ledger_entries_update" ON ledger_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ledger_entries_delete" ON ledger_entries;
CREATE POLICY "ledger_entries_delete" ON ledger_entries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO anon, authenticated USING (true);
