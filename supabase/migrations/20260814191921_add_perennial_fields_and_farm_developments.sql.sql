/*
# Add perennial crop fields + create farm_developments table + seed categories

1. Modified Tables
- `crops` — adds two new nullable columns for perennial crop tracking:
  - `bearing_start_year` (text) — expected bearing start year for permanent crops
  - `perennial_status` (text) — one of 'Establishment / Non-Bearing', 'Active Bearing', 'Replanting'

2. New Tables
- `farm_developments` — stores fixed asset / CAPEX development costs (fencing, irrigation, etc.)
  - `id` (uuid, primary key)
  - `name` (text, not null) — development/asset name
  - `category` (text, not null) — Infrastructure, Land Prep, Irrigation, Machinery, Structures
  - `total_cost` (numeric, default 0) — total development cost in LKR
  - `implementation_date` (date, not null) — when the development was implemented
  - `lifespan_years` (integer, default 1) — expected lifespan in years
  - `linked_plot_id` (uuid, nullable) — optional link to a crop plot
  - `description` (text, nullable)
  - `created_at` (timestamptz, default now())

3. Seed Data
- Adds default categories to custom_categories for module 'development_category':
  Infrastructure, Land Prep, Irrigation, Machinery, Structures

4. Security
- Enable RLS on farm_developments with anon+authenticated CRUD (single-tenant app).
*/

-- Add perennial columns to crops
ALTER TABLE crops ADD COLUMN IF NOT EXISTS bearing_start_year text;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS perennial_status text;

-- Create farm_developments table
CREATE TABLE IF NOT EXISTS farm_developments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  total_cost numeric DEFAULT 0,
  implementation_date date NOT NULL,
  lifespan_years integer DEFAULT 1,
  linked_plot_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE farm_developments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farm_developments_select" ON farm_developments;
CREATE POLICY "farm_developments_select" ON farm_developments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "farm_developments_insert" ON farm_developments;
CREATE POLICY "farm_developments_insert" ON farm_developments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "farm_developments_update" ON farm_developments;
CREATE POLICY "farm_developments_update" ON farm_developments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "farm_developments_delete" ON farm_developments;
CREATE POLICY "farm_developments_delete" ON farm_developments FOR DELETE
  TO anon, authenticated USING (true);

-- Seed development categories
INSERT INTO custom_categories (module_name, name, is_system_default)
SELECT * FROM (VALUES
  ('development_category', 'Infrastructure', true),
  ('development_category', 'Land Prep', true),
  ('development_category', 'Irrigation', true),
  ('development_category', 'Machinery', true),
  ('development_category', 'Structures', true)
) AS t(module_name, name, is_system_default)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories WHERE module_name = t.module_name AND name = t.name
);
