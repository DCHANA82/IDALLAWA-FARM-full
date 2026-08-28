ALTER TABLE farm_profile ADD COLUMN IF NOT EXISTS profile_photo text;
ALTER TABLE farm_profile ADD COLUMN IF NOT EXISTS logo text;

CREATE TABLE IF NOT EXISTS app_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  admin_password text NOT NULL DEFAULT 'password',
  dataentry_password text NOT NULL DEFAULT 'password',
  crop_expense_categories text[] NOT NULL DEFAULT ARRAY['Seeds', 'Land Preparation', 'Fertilizer', 'Pesticide', 'Harvesting', 'Planting Material', 'Maintenance', 'Other'],
  nursery_cost_categories text[] NOT NULL DEFAULT ARRAY['Seedling trays', 'Potting media', 'Poly bags', 'Shade house', 'Rooting hormone', 'Labor'],
  expense_categories text[] NOT NULL DEFAULT ARRAY['Electricity', 'Water', 'Fuel', 'Equipment Repair', 'Insurance', 'Office Supplies', 'Transport', 'Other'],
  seasons text[] NOT NULL DEFAULT ARRAY['Yala', 'Maha'],
  season_years text[] NOT NULL DEFAULT ARRAY['2025', '2026'],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "app_settings_insert" ON app_settings;
CREATE POLICY "app_settings_insert" ON app_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "app_settings_update" ON app_settings;
CREATE POLICY "app_settings_update" ON app_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "app_settings_delete" ON app_settings;
CREATE POLICY "app_settings_delete" ON app_settings FOR DELETE TO anon, authenticated USING (true);