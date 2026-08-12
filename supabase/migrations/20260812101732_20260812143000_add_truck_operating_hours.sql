/*
# Add optional operating hours to daily forklift inspections

1. Modified tables
- `truck_checks.operating_hours` (numeric, nullable): optional hour-meter reading entered at the start of a daily forklift inspection.

2. Security
- No new table or access policy is introduced. Existing authenticated access policies on `truck_checks` continue to apply.

3. Important notes
- This is additive and preserves every existing inspection.
- The value is nullable because the hour meter may not be available.
- The migration is idempotent and safe to apply again.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'truck_checks'
      AND column_name = 'operating_hours'
  ) THEN
    ALTER TABLE public.truck_checks ADD COLUMN operating_hours numeric;
  END IF;
END $$;