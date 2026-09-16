/*
# Add reference column to crop_expenses table

1. Modified Tables
- `crop_expenses`: add `reference` text column (nullable) — stores a link to the source record
  (e.g. "LABOR-<attendanceId>" for labor costs generated from attendance entries)

2. Purpose
The frontend creates crop expense records with a `reference` field linking them back to the
attendance entry that generated them. This allows proper cleanup when attendance is edited or
deleted. Without this column, the reference is silently dropped during DB sync, making it
impossible to find and clean up orphaned records.

3. Security
No security changes — existing RLS policies on `crop_expenses` remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crop_expenses' AND column_name = 'reference') THEN
    ALTER TABLE crop_expenses ADD COLUMN reference text;
  END IF;
END $$;
