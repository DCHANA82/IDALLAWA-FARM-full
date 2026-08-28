/*
# Add seed categories for crop_name and expense_class modules

1. Seed Data
- Adds default categories to custom_categories for two new modules:
  - crop_name: Paddy, Banana, Capsicum, Okra, Bitter Gourd
  - expense_class: Direct Material, Labor, Equipment, Overheads
- Also adds current and upcoming years as crop_name-adjacent data in the
  existing app_settings seasonYears array is already used for years;
  no new year seed is needed in custom_categories.

2. Security
- No schema changes. Uses existing custom_categories table and RLS policies.
*/

INSERT INTO custom_categories (module_name, name, is_system_default)
SELECT * FROM (VALUES
  ('crop_name', 'Paddy', true),
  ('crop_name', 'Banana', true),
  ('crop_name', 'Capsicum', true),
  ('crop_name', 'Okra', true),
  ('crop_name', 'Bitter Gourd', true),
  ('expense_class', 'Direct Material', true),
  ('expense_class', 'Labor', true),
  ('expense_class', 'Equipment', true),
  ('expense_class', 'Overheads', true)
) AS t(module_name, name, is_system_default)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories WHERE module_name = t.module_name AND name = t.name
);
