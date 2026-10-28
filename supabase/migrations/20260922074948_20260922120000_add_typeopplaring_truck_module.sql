/*
# Typeopplæring Truck — equipment-specific forklift training (§ 10-4)

## Overview
Adds equipment detail fields to the existing `trucks` table and creates two new
tables to store equipment-specific forklift training sessions and their checklist
items, per Norwegian regulation § 10-4 (Forskrift om utførelse av arbeid).

## Modified tables

### trucks (additive columns)
- `brand` (text, default '') — e.g. "Toyota", "Linde"
- `model` (text, default '') — e.g. "8FBE20", "E20"
- `serial_no` (text, default '') — chassis / serial number
- `truck_class` (text, default '') — forklift class T1–T8 per EN 1726 / ISO 3691
- `truck_type` (text, default '') — free-text type description (e.g. "Reach truck")

All columns are nullable / defaulted so existing trucks and the daily check flow
are unaffected. No data is lost.

## New tables

### 1. truck_trainings
A completed equipment-specific training session (certificate).
- id (uuid PK)
- truck_id (uuid FK → trucks, ON DELETE SET NULL)
- truck_name (text) — denormalized for display
- truck_brand, truck_model, truck_serial_no, truck_class, truck_type (text) — denormalized snapshot at time of training
- employee_id (uuid, nullable) — references auth.users (the trained truckfører)
- employee_name (text) — name of the trained employee
- instructor_id (uuid, nullable) — references auth.users (the logged-in instructor)
- instructor_name (text) — name of the instructor
- instructor_email (text) — email of the instructor
- completed_date (date) — the date the training was completed
- employee_signature (text) — digital signature (name or drawn base64)
- instructor_signature (text) — digital signature
- status (text) — 'completed' (all records stored are completed)
- created_at (timestamptz)

### 2. truck_training_items
Individual checklist items within a training session.
- id (uuid PK)
- truck_training_id (uuid FK → truck_trainings ON DELETE CASCADE)
- item_key (text) — e.g. 'license_class', 'instruction_book'
- item_label (text) — Norwegian label shown to instructor
- checked (boolean) — true = Gjennomgått / Utført
- note (text) — optional instructor note
- created_at (timestamptz)

## Security
- RLS enabled on both new tables.
- `truck_trainings` and `truck_training_items`: authenticated CRUD (all authenticated
  users can create training records and read all records, consistent with the
  existing truck_checks pattern where all authenticated users see all records).
- `trucks` existing policies already allow authenticated CRUD; the new columns
  inherit those policies automatically (column-level privileges default to the
  table's policies).

## Important notes
1. All new columns on `trucks` are additive with safe defaults — no data loss.
2. The migration is idempotent (DO $$ ... IF NOT EXISTS ... END $$ for columns,
   CREATE TABLE IF NOT EXISTS for tables, DROP+CREATE for policies).
3. Child table `truck_training_items` uses ON DELETE CASCADE so deleting a
   training record cleans up its items.
*/

-- ============ trucks: additive equipment fields ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='brand') THEN
    ALTER TABLE public.trucks ADD COLUMN brand text NOT NULL DEFAULT '';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='model') THEN
    ALTER TABLE public.trucks ADD COLUMN model text NOT NULL DEFAULT '';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='serial_no') THEN
    ALTER TABLE public.trucks ADD COLUMN serial_no text NOT NULL DEFAULT '';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='truck_class') THEN
    ALTER TABLE public.trucks ADD COLUMN truck_class text NOT NULL DEFAULT '';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trucks' AND column_name='truck_type') THEN
    ALTER TABLE public.trucks ADD COLUMN truck_type text NOT NULL DEFAULT '';
  END IF;
END $$;

-- ============ truck_trainings ============
CREATE TABLE IF NOT EXISTS public.truck_trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid REFERENCES public.trucks(id) ON DELETE SET NULL,
  truck_name text NOT NULL DEFAULT '',
  truck_brand text NOT NULL DEFAULT '',
  truck_model text NOT NULL DEFAULT '',
  truck_serial_no text NOT NULL DEFAULT '',
  truck_class text NOT NULL DEFAULT '',
  truck_type text NOT NULL DEFAULT '',
  employee_id uuid,
  employee_name text NOT NULL DEFAULT '',
  instructor_id uuid,
  instructor_name text NOT NULL DEFAULT '',
  instructor_email text NOT NULL DEFAULT '',
  completed_date date,
  employee_signature text NOT NULL DEFAULT '',
  instructor_signature text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.truck_trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_truck_trainings" ON public.truck_trainings;
CREATE POLICY "select_truck_trainings" ON public.truck_trainings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_truck_trainings" ON public.truck_trainings;
CREATE POLICY "insert_truck_trainings" ON public.truck_trainings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_truck_trainings" ON public.truck_trainings;
CREATE POLICY "update_truck_trainings" ON public.truck_trainings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_truck_trainings" ON public.truck_trainings;
CREATE POLICY "delete_truck_trainings" ON public.truck_trainings FOR DELETE TO authenticated USING (true);

-- ============ truck_training_items ============
CREATE TABLE IF NOT EXISTS public.truck_training_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_training_id uuid NOT NULL REFERENCES public.truck_trainings(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.truck_training_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_truck_training_items" ON public.truck_training_items;
CREATE POLICY "select_truck_training_items" ON public.truck_training_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_truck_training_items" ON public.truck_training_items;
CREATE POLICY "insert_truck_training_items" ON public.truck_training_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_truck_training_items" ON public.truck_training_items;
CREATE POLICY "update_truck_training_items" ON public.truck_training_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_truck_training_items" ON public.truck_training_items;
CREATE POLICY "delete_truck_training_items" ON public.truck_training_items FOR DELETE TO authenticated USING (true);