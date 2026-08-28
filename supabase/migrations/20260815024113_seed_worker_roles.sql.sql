/*
# Seed default worker roles

1. Purpose
   - Seeds the custom_categories table with four default worker role options
     for the "worker_role" module used by the Add Worker / Staff form.
2. Categories added
   - Manager (කළමනාකරු)
   - Supervisor (සුපවයිසර්)
   - Clerk (ලිපිකරු)
   - Laborer / Worker (කම්කරු)
3. Idempotent
   - Uses ON CONFLICT to avoid duplicates on re-run.
4. Security
   - No security changes; only inserts data into the existing custom_categories table.
*/

INSERT INTO custom_categories (module_name, name, is_system_default)
VALUES
  ('worker_role', 'Manager (කළමනාකරු)', true),
  ('worker_role', 'Supervisor (සුපවයිසර්)', true),
  ('worker_role', 'Clerk (ලිපිකරු)', true),
  ('worker_role', 'Laborer / Worker (කම්කරු)', true)
ON CONFLICT (module_name, name) DO NOTHING;
