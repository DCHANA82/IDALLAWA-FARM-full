/*
# Add seed years for crop_year module

Adds default year entries to custom_categories for the dynamic year selector
in the Add Crop form. Seeds current year and next 3 upcoming years.
*/

INSERT INTO custom_categories (module_name, name, is_system_default)
SELECT 'crop_year', y, true
FROM (VALUES ('2025'), ('2026'), ('2027'), ('2028'), ('2029')) AS t(y)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories WHERE module_name = 'crop_year' AND name = t.y
);
