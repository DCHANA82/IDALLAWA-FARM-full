/*
# Payroll Advances & Salary Payments System

## Overview
Adds dedicated employee advance tracking, advance recovery history, and salary payment
records to the farm payroll system. Also adds missing columns to the workers table
(employment_type, base_monthly_salary, default_daily_rate) that were used in the
frontend but never persisted to the database.

## 1. Modified Table: workers
- employment_type text DEFAULT 'DAILY' — DAILY | MONTHLY | HYBRID salary type
- base_monthly_salary numeric(14,2) DEFAULT 0 — explicit monthly salary for MONTHLY/HYBRID
- default_daily_rate numeric(14,2) DEFAULT 0 — explicit daily rate for DAILY/HYBRID

## 2. New Table: employee_advances
Tracks money paid in advance to an employee (NOT salary). Each advance has its own
ID, date, original amount, recovered amount, remaining balance, and status.
- id text PRIMARY KEY
- worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- advance_date date NOT NULL — when the advance was given
- amount numeric(14,2) NOT NULL — original advance amount
- recovered_amount numeric(14,2) NOT NULL DEFAULT 0 — total recovered so far
- remaining_balance numeric(14,2) NOT NULL DEFAULT 0 — amount still outstanding
- payment_method text DEFAULT 'Cash' — Cash | Cheque | Bank Transfer
- reference text DEFAULT '' — reference/note
- recovery_target text DEFAULT 'ANY' — DAILY | MONTHLY | ANY (where to recover from)
- status text NOT NULL DEFAULT 'Outstanding' — Outstanding | Partially Recovered | Fully Recovered
- created_at timestamptz DEFAULT now()

## 3. New Table: advance_recoveries
Each recovery deduction from a salary payment, linked to a specific advance.
- id text PRIMARY KEY
- advance_id text NOT NULL REFERENCES employee_advances(id) ON DELETE CASCADE
- worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- recovery_date date NOT NULL — when the deduction happened
- amount numeric(14,2) NOT NULL — amount recovered
- source text NOT NULL DEFAULT 'DAILY' — DAILY | MONTHLY (which salary type it was deducted from)
- salary_payment_id text DEFAULT '' — link to the salary payment that triggered this recovery
- reference text DEFAULT '' — note

## 4. New Table: salary_payments
Records every salary payment (daily or monthly) with separate work date and payment date.
- id text PRIMARY KEY
- worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- salary_type text NOT NULL DEFAULT 'DAILY' — DAILY | MONTHLY
- work_date date NOT NULL — the date work was performed (or month for monthly)
- payment_date date NOT NULL — the date payment was actually made
- pay_month text NOT NULL DEFAULT '' — YYYY-MM for monthly salary, or the work date month
- gross_amount numeric(14,2) NOT NULL DEFAULT 0 — gross earnings
- allowances numeric(14,2) NOT NULL DEFAULT 0 — total allowances
- advance_deduction numeric(14,2) NOT NULL DEFAULT 0 — advance recovered from this payment
- other_deductions numeric(14,2) NOT NULL DEFAULT 0 — other deductions
- net_amount numeric(14,2) NOT NULL DEFAULT 0 — net amount paid
- payment_method text DEFAULT 'Cash' — Cash | Cheque | Bank Transfer
- reference text DEFAULT '' — reference number
- days_worked integer DEFAULT 0 — for daily payments, number of days covered
- status text NOT NULL DEFAULT 'Paid' — Paid | Pending
- attendance_ids text DEFAULT '' — comma-separated attendance IDs (for daily payments)

## 5. Security
- All 3 new tables have RLS enabled.
- Single-tenant app: TO anon, authenticated with USING (true) / WITH CHECK (true).

## 6. Indexes
- employee_advances: worker_id, status
- advance_recoveries: advance_id, worker_id, recovery_date
- salary_payments: worker_id, payment_date, salary_type, pay_month
*/

-- Add missing columns to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'DAILY';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS base_monthly_salary numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS default_daily_rate numeric(14,2) NOT NULL DEFAULT 0;

-- employee_advances
CREATE TABLE IF NOT EXISTS employee_advances (
  id text PRIMARY KEY,
  worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  recovered_amount numeric(14,2) NOT NULL DEFAULT 0,
  remaining_balance numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  reference text DEFAULT '',
  recovery_target text NOT NULL DEFAULT 'ANY',
  status text NOT NULL DEFAULT 'Outstanding',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_advances_worker_id ON employee_advances(worker_id);
CREATE INDEX IF NOT EXISTS idx_employee_advances_status ON employee_advances(status);

-- advance_recoveries
CREATE TABLE IF NOT EXISTS advance_recoveries (
  id text PRIMARY KEY,
  advance_id text NOT NULL REFERENCES employee_advances(id) ON DELETE CASCADE,
  worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  recovery_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'DAILY',
  salary_payment_id text DEFAULT '',
  reference text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_advance_id ON advance_recoveries(advance_id);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_worker_id ON advance_recoveries(worker_id);
CREATE INDEX IF NOT EXISTS idx_advance_recoveries_recovery_date ON advance_recoveries(recovery_date);

-- salary_payments
CREATE TABLE IF NOT EXISTS salary_payments (
  id text PRIMARY KEY,
  worker_id text NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  salary_type text NOT NULL DEFAULT 'DAILY',
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  pay_month text NOT NULL DEFAULT '',
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  allowances numeric(14,2) NOT NULL DEFAULT 0,
  advance_deduction numeric(14,2) NOT NULL DEFAULT 0,
  other_deductions numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  reference text DEFAULT '',
  days_worked integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Paid',
  attendance_ids text DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_salary_payments_worker_id ON salary_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_payment_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_salary_type ON salary_payments(salary_type);
CREATE INDEX IF NOT EXISTS idx_salary_payments_pay_month ON salary_payments(pay_month);

-- Enable RLS on new tables
ALTER TABLE employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- employee_advances policies
DROP POLICY IF EXISTS "employee_advances_select" ON employee_advances;
CREATE POLICY "employee_advances_select" ON employee_advances FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "employee_advances_insert" ON employee_advances;
CREATE POLICY "employee_advances_insert" ON employee_advances FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "employee_advances_update" ON employee_advances;
CREATE POLICY "employee_advances_update" ON employee_advances FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employee_advances_delete" ON employee_advances;
CREATE POLICY "employee_advances_delete" ON employee_advances FOR DELETE TO anon, authenticated USING (true);

-- advance_recoveries policies
DROP POLICY IF EXISTS "advance_recoveries_select" ON advance_recoveries;
CREATE POLICY "advance_recoveries_select" ON advance_recoveries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "advance_recoveries_insert" ON advance_recoveries;
CREATE POLICY "advance_recoveries_insert" ON advance_recoveries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "advance_recoveries_update" ON advance_recoveries;
CREATE POLICY "advance_recoveries_update" ON advance_recoveries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "advance_recoveries_delete" ON advance_recoveries;
CREATE POLICY "advance_recoveries_delete" ON advance_recoveries FOR DELETE TO anon, authenticated USING (true);

-- salary_payments policies
DROP POLICY IF EXISTS "salary_payments_select" ON salary_payments;
CREATE POLICY "salary_payments_select" ON salary_payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "salary_payments_insert" ON salary_payments;
CREATE POLICY "salary_payments_insert" ON salary_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "salary_payments_update" ON salary_payments;
CREATE POLICY "salary_payments_update" ON salary_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "salary_payments_delete" ON salary_payments;
CREATE POLICY "salary_payments_delete" ON salary_payments FOR DELETE TO anon, authenticated USING (true);