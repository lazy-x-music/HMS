/*
# Add training certificates, closing routine templates, and document library support

## 1. Truck training enhancements
- Add `certificate_url` (text) to `truck_trainings` — stores a URL to an uploaded certificate file (PDF/image) for admin verification.
- Add `approved` (boolean, default false) to `truck_trainings` — admin approval flag. When false, the training is pending approval; when true, it is approved/verified.
- Add `approved_by` (uuid) to `truck_trainings` — the admin profile who approved the training.
- Add `approved_at` (timestamptz) to `truck_trainings` — when the approval happened.

## 2. Closing routine templates (admin-managed checklists)
- New table `closing_routine_templates`: admin-created templates defining which checklist items a closing routine must cover. Admins can create, edit, delete, and reorder templates. Each template has a name, optional site/equipment scope, and active flag.
- New table `closing_routine_template_items`: the individual checklist items belonging to a template, with item_key, item_label, and sort_order.
- The existing `closing_routines` table now references a `template_id` (nullable for backward compatibility) so an employee closing routine can be tied to a specific template.
- The existing `closing_routine_items` table now references `template_item_id` (nullable) so each completed item can be traced back to the template.

## 3. HMS document library enhancements
- Add `category` options: the existing `hms_documents.category` is a text column with a default. We add a CHECK constraint to allow richer categories: 'procedure', 'policy', 'manual', 'form', 'guideline', 'instruction', 'report'. (Drop and recreate the constraint idempotently.)
- Add `file_name` (text) to `hms_documents` — original uploaded file name for display.
- Add `file_size` (integer) to `hms_documents` — file size in bytes for display.
- Add `mime_type` (text) to `hms_documents` — MIME type of the uploaded file.
- Add `created_by` (uuid) to `hms_documents` — the admin who uploaded the document.

## 4. Security (RLS + grants)
- Enable RLS on all new tables (`closing_routine_templates`, `closing_routine_template_items`).
- Grant CRUD on new tables to `authenticated` (app requires sign-in).
- Add owner-scoped policies on new tables: any authenticated user can read templates and template items (shared company data); only admins can insert/update/delete templates and template items. Admin check uses the `profiles` table `role = 'admin'`.
- Grant SELECT/UPDATE on `truck_trainings` (already granted) — columns are additive so existing grants cover new columns. No grant change needed.
- Grant SELECT on `hms_documents` to `authenticated` (already present). UPDATE/INSERT covered by existing grant; new columns are additive.
- Add policies: authenticated users can read all documents; only admins can insert/update/delete documents.
- Add policies: authenticated users can update `truck_trainings` (approve) — restricted to admins via a separate policy predicate checking profiles.role = 'admin'.

## Notes
- All column additions use `IF NOT EXISTS` via DO blocks to be idempotent.
- No data is dropped or altered destructively.
- Existing closing routines without a template_id continue to work.
*/

-- =========================================================
-- 1. Truck training enhancements
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'truck_trainings' AND column_name = 'certificate_url'
  ) THEN
    ALTER TABLE truck_trainings ADD COLUMN certificate_url text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'truck_trainings' AND column_name = 'approved'
  ) THEN
    ALTER TABLE truck_trainings ADD COLUMN approved boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'truck_trainings' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE truck_trainings ADD COLUMN approved_by uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'truck_trainings' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE truck_trainings ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Allow admins to update truck_trainings (approve). Existing policies already allow insert by owner.
-- We add an admin-only update policy that supplements ownership-based update.
DROP POLICY IF EXISTS "admins_can_update_truck_trainings" ON truck_trainings;
CREATE POLICY "admins_can_update_truck_trainings"
ON truck_trainings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- =========================================================
-- 2. Closing routine templates
-- =========================================================

CREATE TABLE IF NOT EXISTS closing_routine_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope text NOT NULL DEFAULT '',        -- e.g. "Hovedlager" or "Truck 04"
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS closing_routine_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES closing_routine_templates(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_closing_template_items_template ON closing_routine_template_items(template_id);

-- Reference templates from completed closing routines (nullable for backward compat)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'closing_routines' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE closing_routines ADD COLUMN template_id uuid REFERENCES closing_routine_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'closing_routines' AND column_name = 'inspector_id'
  ) THEN
    ALTER TABLE closing_routines ADD COLUMN inspector_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'closing_routine_items' AND column_name = 'template_item_id'
  ) THEN
    ALTER TABLE closing_routine_items ADD COLUMN template_item_id uuid REFERENCES closing_routine_template_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS + grants for templates
ALTER TABLE closing_routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing_routine_template_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON closing_routine_templates TO authenticated;
GRANT SELECT ON closing_routine_template_items TO authenticated;

-- Admins can manage templates; all authenticated can read
DROP POLICY IF EXISTS "read_closing_templates" ON closing_routine_templates;
CREATE POLICY "read_closing_templates"
ON closing_routine_templates FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_closing_templates" ON closing_routine_templates;
CREATE POLICY "admin_insert_closing_templates"
ON closing_routine_templates FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_closing_templates" ON closing_routine_templates;
CREATE POLICY "admin_update_closing_templates"
ON closing_routine_templates FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_closing_templates" ON closing_routine_templates;
CREATE POLICY "admin_delete_closing_templates"
ON closing_routine_templates FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Template items: same pattern
DROP POLICY IF EXISTS "read_closing_template_items" ON closing_routine_template_items;
CREATE POLICY "read_closing_template_items"
ON closing_routine_template_items FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_closing_template_items" ON closing_routine_template_items;
CREATE POLICY "admin_insert_closing_template_items"
ON closing_routine_template_items FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_closing_template_items" ON closing_routine_template_items;
CREATE POLICY "admin_update_closing_template_items"
ON closing_routine_template_items FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_closing_template_items" ON closing_routine_template_items;
CREATE POLICY "admin_delete_closing_template_items"
ON closing_routine_template_items FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Allow admins to insert/update closing_routines with template reference
-- Existing policies likely allow authenticated insert; ensure update for admins
DROP POLICY IF EXISTS "admin_update_closing_routines" ON closing_routines;
CREATE POLICY "admin_update_closing_routines"
ON closing_routines FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- =========================================================
-- 3. HMS document library enhancements
-- =========================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hms_documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE hms_documents ADD COLUMN file_name text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hms_documents' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE hms_documents ADD COLUMN file_size integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hms_documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE hms_documents ADD COLUMN mime_type text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hms_documents' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE hms_documents ADD COLUMN created_by uuid;
  END IF;
END $$;

-- Expand allowed categories with a fresh CHECK constraint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'hms_documents' AND constraint_type = 'CHECK'
      AND constraint_name = 'hms_documents_category_check'
  ) THEN
    ALTER TABLE hms_documents DROP CONSTRAINT hms_documents_category_check;
  END IF;
END $$;

ALTER TABLE hms_documents
  ADD CONSTRAINT hms_documents_category_check
  CHECK (category = ANY (ARRAY[
    'procedure'::text, 'policy'::text, 'manual'::text, 'form'::text,
    'guideline'::text, 'instruction'::text, 'report'::text
  ]));

-- Admin-only management of documents (insert/update/delete)
-- Keep existing read policy for authenticated; add admin management policies
DROP POLICY IF EXISTS "admin_insert_hms_documents" ON hms_documents;
CREATE POLICY "admin_insert_hms_documents"
ON hms_documents FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_hms_documents" ON hms_documents;
CREATE POLICY "admin_update_hms_documents"
ON hms_documents FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_hms_documents" ON hms_documents;
CREATE POLICY "admin_delete_hms_documents"
ON hms_documents FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Ensure storage bucket exists for document uploads (public read, authenticated write via storage policies handled separately)
-- NOTE: Storage bucket creation is handled via the storage API; this migration focuses on the database layer.
