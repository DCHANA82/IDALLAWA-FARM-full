/* Add payment_method and cheque_no columns to vouchers table */
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS cheque_no text;
