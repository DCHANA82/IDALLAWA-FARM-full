/*
# Add expense allocation columns to attendance table

1. Purpose
   Supports dual-channel expense allocation when logging worker attendance.
   Each attendance record can now be tagged as either:
     - CROP: labor cost allocated to a specific crop + plot
     - FARM_DEVELOPMENT: labor cost allocated to general farm development

2. New Columns on `attendance`
   - `allocation_type` (text, default NULL) — 'CROP' or 'FARM_DEVELOPMENT'
   - `crop_id` (text, default NULL) — FK to crops(id), used when allocation_type = 'CROP'
   - `plot_id` (text, default NULL) — reference to a plot, used when allocation_type = 'CROP'
   - `development_category` (text, default NULL) — e.g. Land Preparation, Fencing, Infrastructure

3. Security
   No new tables. Existing RLS policies on `attendance` already allow
   anon+authenticated CRUD (single-tenant shared data). No policy changes needed.

4. Notes
   - All columns are nullable for backward compatibility with existing rows.
   - Uses DO $$ ... IF NOT EXISTS ... END $$ for idempotency.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'allocation_type') THEN
    ALTER TABLE attendance ADD COLUMN allocation_type text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'crop_id') THEN
    ALTER TABLE attendance ADD COLUMN crop_id text DEFAULT NULL REFERENCES crops(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'plot_id') THEN
    ALTER TABLE attendance ADD COLUMN plot_id text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'development_category') THEN
    ALTER TABLE attendance ADD COLUMN development_category text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_crop_id ON attendance(crop_id);
CREATE INDEX IF NOT EXISTS idx_attendance_allocation_type ON attendance(allocation_type);