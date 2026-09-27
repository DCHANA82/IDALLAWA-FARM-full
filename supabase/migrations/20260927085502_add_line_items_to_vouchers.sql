/*
# Add line_items column to vouchers for employee breakdown

Stores a JSON array of per-employee rows for payroll vouchers:
  [{ name, crop, task, dailyWage, daysQty, totalAmount }]

This allows the printed voucher to show individual employees
instead of a generic "Labor Group" entry.

No existing data is modified.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'line_items') THEN
    ALTER TABLE vouchers ADD COLUMN line_items jsonb;
  END IF;
END $$;
