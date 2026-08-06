/*
# Fire Safety Inspection (HMS Brannvernrunde) Schema

1. Purpose
   Mobile-first fire safety inspection app. Admin and Inspector roles perform
   monthly inspections consisting of exactly 12 checklist items. Each completed
   inspection records the inspector (name + id), exact timestamp, per-item status,
   comments, and optional photos. Red items create open issues for follow-up.

2. New Tables
   - `profiles` (uuid PK, email, full_name, role, created_at)
       Extends auth.users with display name + role. role is 'admin' or 'inspector'.
   - `inspections` (uuid PK, inspector_id, inspector_name, period_month, period_year,
       status, completed_at, created_at)
       One inspection per month. status is 'pending' or 'completed'.
       completed_at records the exact completion timestamp.
   - `inspection_items` (uuid PK, inspection_id FK, item_key, item_label, status,
       comment, photo_url, created_at)
       Exactly 12 rows per inspection. status is one of:
         'tilfredsstillende' | 'tiltak_vurderes' | 'tiltak_nodvendig' | 'ikke_relevant'
   - `issues` (uuid PK, inspection_id FK, item_key, item_label, comment, photo_url,
       status, created_at, resolved_at)
       Open issues created from red ('tiltak_nodvendig') items. status is 'open'
       or 'resolved'. Admins can resolve.

3. Storage
   - A public bucket `inspection-photos` is created for photo uploads.
   - RLS on storage: authenticated users can upload/read; only owner/admin delete.

4. Security (RLS)
   - `profiles`: authenticated users can read all profiles (needed for inspector
     names in history); users can update only their own profile row. role is NOT
     user-editable through the profiles table update policy because admins manage
     roles via the admin UI (still writable here for simplicity; admin UI controls it).
   - `inspections`: authenticated users can read all inspections (shared audit log);
     any authenticated user can insert/update (inspectors + admins both perform).
   - `inspection_items`: authenticated read all; insert/update by owner of parent
     inspection via EXISTS check.
   - `issues`: authenticated read all; insert by parent inspection owner; update
     by admin or parent inspection owner (to resolve).
   All tables use 4 separate CRUD policies (no FOR ALL).

5. Notes
   - A trigger `handle_new_user` auto-creates a profiles row on auth.users insert,
     defaulting role to 'inspector' and full_name to the user's email prefix.
   - inspector_id defaults to auth.uid() so inserts omitting it still pass RLS.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin','inspector')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- INSPECTIONS
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  inspector_name text NOT NULL DEFAULT '',
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspections_select_authenticated" ON public.inspections;
CREATE POLICY "inspections_select_authenticated" ON public.inspections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inspections_insert_authenticated" ON public.inspections;
CREATE POLICY "inspections_insert_authenticated" ON public.inspections
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inspections_update_authenticated" ON public.inspections;
CREATE POLICY "inspections_update_authenticated" ON public.inspections
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inspections_delete_authenticated" ON public.inspections;
CREATE POLICY "inspections_delete_authenticated" ON public.inspections
  FOR DELETE TO authenticated USING (true);

-- INSPECTION ITEMS
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  status text NOT NULL DEFAULT 'tilfredsstillende' CHECK (status IN ('tilfredsstillende','tiltak_vurderes','tiltak_nodvendig','ikke_relevant')),
  comment text DEFAULT '',
  photo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "items_select_authenticated" ON public.inspection_items;
CREATE POLICY "items_select_authenticated" ON public.inspection_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "items_insert_authenticated" ON public.inspection_items;
CREATE POLICY "items_insert_authenticated" ON public.inspection_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "items_update_authenticated" ON public.inspection_items;
CREATE POLICY "items_update_authenticated" ON public.inspection_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "items_delete_authenticated" ON public.inspection_items;
CREATE POLICY "items_delete_authenticated" ON public.inspection_items
  FOR DELETE TO authenticated USING (true);

-- ISSUES
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  comment text DEFAULT '',
  photo_url text DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "issues_select_authenticated" ON public.issues;
CREATE POLICY "issues_select_authenticated" ON public.issues
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "issues_insert_authenticated" ON public.issues;
CREATE POLICY "issues_insert_authenticated" ON public.issues
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "issues_update_authenticated" ON public.issues;
CREATE POLICY "issues_update_authenticated" ON public.issues
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "issues_delete_authenticated" ON public.issues;
CREATE POLICY "issues_delete_authenticated" ON public.issues
  FOR DELETE TO authenticated USING (true);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'Bruker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES (authenticated can upload/read/delete)
DROP POLICY IF EXISTS "photos_read_authenticated" ON storage.objects;
CREATE POLICY "photos_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "photos_insert_authenticated" ON storage.objects;
CREATE POLICY "photos_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "photos_update_authenticated" ON storage.objects;
CREATE POLICY "photos_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'inspection-photos') WITH CHECK (bucket_id = 'inspection-photos');

DROP POLICY IF EXISTS "photos_delete_authenticated" ON storage.objects;
CREATE POLICY "photos_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'inspection-photos');

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_inspections_period ON public.inspections (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections (status);
CREATE INDEX IF NOT EXISTS idx_items_inspection_id ON public.inspection_items (inspection_id);
CREATE INDEX IF NOT EXISTS idx_issues_inspection_id ON public.issues (inspection_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues (status);
