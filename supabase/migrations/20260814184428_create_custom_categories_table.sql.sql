/*
# Create custom_categories table for dynamic category system

1. New Tables
- `custom_categories` — stores user-extensible category options for dropdowns across modules
  - `id` (uuid, primary key, auto-generated)
  - `module_name` (text, not null) — which module this category belongs to (e.g. 'crop_experience', 'nursery_cost', 'ledger_account', 'voucher_type', 'expense_type')
  - `name` (text, not null) — the category name displayed in dropdowns
  - `description` (text, nullable) — optional description
  - `is_system_default` (boolean, default false) — whether this is a seed/default category
  - `created_at` (timestamptz, default now())

2. Constraints
- Unique constraint on (module_name, name) to prevent duplicate categories within a module

3. Seed Data
- Inserts default categories for 5 modules:
  - crop_experience: Seeds, Land Preparation, Fertilizer, Pesticide, Harvesting, Planting Material, Maintenance, Other
  - nursery_cost: Seedling trays, Potting media, Poly bags, Shade house, Rooting hormone, Labor
  - ledger_account: Capital, Retail Shop Transfer, Bank Loan, Shop Credit, Owner Equity Return
  - voucher_type: Payment, Sales Receipt, Gate Pass, Loan Settlement, Payroll
  - expense_type: Electricity, Water, Fuel, Equipment Repair, Insurance, Office Supplies, Transport, Other

4. Security
- Enable RLS on `custom_categories`.
- Allow anon + authenticated CRUD (single-tenant app, anon key client).
*/

CREATE TABLE IF NOT EXISTS custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  name text NOT NULL,
  description text,
  is_system_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint to prevent duplicate (module_name, name) pairs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_categories_module_name_name_key') THEN
    ALTER TABLE custom_categories ADD CONSTRAINT custom_categories_module_name_name_key UNIQUE (module_name, name);
  END IF;
END $$;

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_categories_select" ON custom_categories;
CREATE POLICY "custom_categories_select" ON custom_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "custom_categories_insert" ON custom_categories;
CREATE POLICY "custom_categories_insert" ON custom_categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "custom_categories_update" ON custom_categories;
CREATE POLICY "custom_categories_update" ON custom_categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "custom_categories_delete" ON custom_categories;
CREATE POLICY "custom_categories_delete" ON custom_categories FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default categories (idempotent — only insert if table is empty)
INSERT INTO custom_categories (module_name, name, is_system_default)
SELECT * FROM (VALUES
  ('crop_experience', 'Seeds', true),
  ('crop_experience', 'Land Preparation', true),
  ('crop_experience', 'Fertilizer', true),
  ('crop_experience', 'Pesticide', true),
  ('crop_experience', 'Harvesting', true),
  ('crop_experience', 'Planting Material', true),
  ('crop_experience', 'Maintenance', true),
  ('crop_experience', 'Other', true),
  ('nursery_cost', 'Seedling trays', true),
  ('nursery_cost', 'Potting media', true),
  ('nursery_cost', 'Poly bags', true),
  ('nursery_cost', 'Shade house', true),
  ('nursery_cost', 'Rooting hormone', true),
  ('nursery_cost', 'Labor', true),
  ('ledger_account', 'Capital', true),
  ('ledger_account', 'Retail Shop Transfer', true),
  ('ledger_account', 'Bank Loan', true),
  ('ledger_account', 'Shop Credit', true),
  ('ledger_account', 'Owner Equity Return', true),
  ('voucher_type', 'Payment', true),
  ('voucher_type', 'Sales Receipt', true),
  ('voucher_type', 'Gate Pass', true),
  ('voucher_type', 'Loan Settlement', true),
  ('voucher_type', 'Payroll', true),
  ('expense_type', 'Electricity', true),
  ('expense_type', 'Water', true),
  ('expense_type', 'Fuel', true),
  ('expense_type', 'Equipment Repair', true),
  ('expense_type', 'Insurance', true),
  ('expense_type', 'Office Supplies', true),
  ('expense_type', 'Transport', true),
  ('expense_type', 'Other', true)
) AS t(module_name, name, is_system_default)
WHERE NOT EXISTS (SELECT 1 FROM custom_categories LIMIT 1);
