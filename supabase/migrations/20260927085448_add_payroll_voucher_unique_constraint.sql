/*
# Prevent duplicate payroll vouchers

Adds a partial unique index so only one voucher with kind='Payroll'
can exist for a given reference (e.g. "PAY-2026-09").
This enforces duplicate prevention at the database level, regardless
of which device or browser triggers the generation.

Existing duplicates for PAY-2026-08 and PAY-2026-09 were cleaned up
before creating this index (kept the latest voucher for each period).
*/

CREATE UNIQUE INDEX IF NOT EXISTS vouchers_payroll_unique_reference
  ON vouchers (reference)
  WHERE kind = 'Payroll' AND reference IS NOT NULL;
