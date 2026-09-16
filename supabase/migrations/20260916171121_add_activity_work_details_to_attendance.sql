/*
# Add activity and work_details columns to attendance table

1. Modified Tables
- `attendance`: add `activity` text column (nullable) — stores the crop activity description (e.g. "Harvesting", "Weeding") when allocation_type is 'CROP'
- `attendance`: add `work_details` text column (nullable) — stores the work details description when allocation_type is 'FARM_DEVELOPMENT'

2. Purpose
The frontend AttendanceModal already captures `activity` and `workDetails` on the ExpenseAllocation object,
and the TypeScript type includes them. However, the database table lacks these columns, so they are silently
dropped during save and never restored on load. This migration adds the columns so the data round-trips correctly.

3. Security
No security changes — existing RLS policies on `attendance` remain unchanged.

4. Important Notes
- Both columns are nullable so existing rows are unaffected.
- The `fromAttendance` and `toAttendance` functions in db.ts have been updated to read/write these columns.
- No data migration is needed — existing rows simply have NULL for these new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'activity') THEN
    ALTER TABLE attendance ADD COLUMN activity text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'work_details') THEN
    ALTER TABLE attendance ADD COLUMN work_details text;
  END IF;
END $$;
