/*
# Add allowance and override rate columns to attendance table

1. Purpose
   Supports customizable wage rates and extra allowances during attendance entry
   and month-end settlement, without changing the worker's default profile rates.

2. New Columns on `attendance`
   - `override_rate` (numeric, default NULL) — per-entry override of daily wage or monthly salary
   - `fuel_transport_allowance` (numeric, default 0) — fuel or vehicle expenses
   - `attendance_allowance` (numeric, default 0) — bonus for good attendance
   - `other_allowances` (numeric, default 0) — any extra one-off bonuses
   - `fuel_allocation` (text, default NULL) — 'CROP' or 'OVERHEAD'
   - `fuel_crop_id` (text, default NULL) — FK to crops(id), used when fuel_allocation = 'CROP'

3. Security
   No new tables. Existing RLS policies on `attendance` already allow
   anon+authenticated CRUD. No policy changes needed.

4. Notes
   - All new columns are nullable / default 0 for backward compatibility.
   - Uses DO $$ ... IF NOT EXISTS ... END $$ for idempotency.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'override_rate') THEN
    ALTER TABLE attendance ADD COLUMN override_rate numeric(14,2) DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'fuel_transport_allowance') THEN
    ALTER TABLE attendance ADD COLUMN fuel_transport_allowance numeric(14,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'attendance_allowance') THEN
    ALTER TABLE attendance ADD COLUMN attendance_allowance numeric(14,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'other_allowances') THEN
    ALTER TABLE attendance ADD COLUMN other_allowances numeric(14,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'fuel_allocation') THEN
    ALTER TABLE attendance ADD COLUMN fuel_allocation text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'fuel_crop_id') THEN
    ALTER TABLE attendance ADD COLUMN fuel_crop_id text DEFAULT NULL REFERENCES crops(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_fuel_crop_id ON attendance(fuel_crop_id);