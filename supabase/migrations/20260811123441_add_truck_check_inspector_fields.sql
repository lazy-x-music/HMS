/*
# Add inspector tracking fields to truck_checks

## Purpose
The Truck Audit History & Oversight module needs to display who completed each
daily forklift check — including their user ID and email — for superadmin oversight.
This migration adds two nullable columns to the existing `truck_checks` table.

## Changes
### Modified table: truck_checks
- `inspector_id` (uuid, nullable) — references auth.users, identifies who performed the check
- `inspector_email` (text, nullable, default '') — denormalized email for audit display

## Security
No policy changes needed — the existing CRUD policies on truck_checks already allow
authenticated users to read all rows and insert their own. The new columns are populated
by the frontend on insert and are readable by any authenticated user (consistent with
the existing owner-scoped pattern where all authenticated users can see all truck_checks).

## Notes
1. Both columns are nullable so existing rows are not affected.
2. No data is lost — this is a purely additive migration.
3. Idempotent: uses DO $$ ... IF NOT EXISTS ... END $$ for conditional column additions.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'truck_checks' AND column_name = 'inspector_id') THEN
    ALTER TABLE truck_checks ADD COLUMN inspector_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'truck_checks' AND column_name = 'inspector_email') THEN
    ALTER TABLE truck_checks ADD COLUMN inspector_email text NOT NULL DEFAULT '';
  END IF;
END $$;
