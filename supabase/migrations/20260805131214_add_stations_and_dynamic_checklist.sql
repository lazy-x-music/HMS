/*
# Fire Station & Dynamic Checklist Schema Update

1. Purpose
   Extends the inspection schema with:
   - Fire stations (Brannposter) that inspectors must scan/check during Step 1.
   - Dynamic, admin-managed checklist items (replacing the hard-coded 12 list).
   - Per-inspection station check records (scanned or manually selected, with reason if skipped).
   - Admin-only write access for stations and checklist items.

2. New Tables
   - `fire_stations` (id, name, code, location, qr_token, sort_order, active, created_at)
   - `checklist_items` (id, item_key, item_label, sort_order, active, created_at)
   - `inspection_stations` (id, inspection_id FK, station_id FK, station_name,
       checked_method, skip_reason, checked_at)

3. Modified Tables
   - `inspection_items` gains nullable `checklist_item_id` FK for dynamic linkage.

4. Security (RLS)
   - `fire_stations` / `checklist_items`: all authenticated read; admin-only write.
   - `inspection_stations`: all authenticated read/insert/update; delete by any authenticated.
   - Admin check: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin').

5. Seed Data
   - 8 default fire stations (BP1-BP8).
   - 12 default checklist items (1.19-1.30).
*/

-- FIRE STATIONS
CREATE TABLE IF NOT EXISTS public.fire_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  location text NOT NULL DEFAULT '',
  qr_token text NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fire_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stations_select_authenticated" ON public.fire_stations;
CREATE POLICY "stations_select_authenticated" ON public.fire_stations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stations_insert_admin" ON public.fire_stations;
CREATE POLICY "stations_insert_admin" ON public.fire_stations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "stations_update_admin" ON public.fire_stations;
CREATE POLICY "stations_update_admin" ON public.fire_stations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "stations_delete_admin" ON public.fire_stations;
CREATE POLICY "stations_delete_admin" ON public.fire_stations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL,
  item_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select_authenticated" ON public.checklist_items;
CREATE POLICY "checklist_select_authenticated" ON public.checklist_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "checklist_insert_admin" ON public.checklist_items;
CREATE POLICY "checklist_insert_admin" ON public.checklist_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "checklist_update_admin" ON public.checklist_items;
CREATE POLICY "checklist_update_admin" ON public.checklist_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "checklist_delete_admin" ON public.checklist_items;
CREATE POLICY "checklist_delete_admin" ON public.checklist_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSPECTION STATIONS
CREATE TABLE IF NOT EXISTS public.inspection_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  station_id uuid REFERENCES public.fire_stations(id) ON DELETE SET NULL,
  station_name text NOT NULL DEFAULT '',
  checked_method text NOT NULL DEFAULT 'manual' CHECK (checked_method IN ('scanned','manual')),
  skip_reason text DEFAULT '',
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inst_stations_select_authenticated" ON public.inspection_stations;
CREATE POLICY "inst_stations_select_authenticated" ON public.inspection_stations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inst_stations_insert_authenticated" ON public.inspection_stations;
CREATE POLICY "inst_stations_insert_authenticated" ON public.inspection_stations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inst_stations_update_authenticated" ON public.inspection_stations;
CREATE POLICY "inst_stations_update_authenticated" ON public.inspection_stations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inst_stations_delete_authenticated" ON public.inspection_stations;
CREATE POLICY "inst_stations_delete_authenticated" ON public.inspection_stations
  FOR DELETE TO authenticated USING (true);

-- Add checklist_item_id to inspection_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inspection_items' AND column_name = 'checklist_item_id'
  ) THEN
    ALTER TABLE public.inspection_items
      ADD COLUMN checklist_item_id uuid REFERENCES public.checklist_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- SEED: default fire stations
INSERT INTO public.fire_stations (name, code, location, sort_order) VALUES
  ('Brannpost 1', 'BP1', 'Hovedinngang', 1),
  ('Brannpost 2', 'BP2', 'Garasje', 2),
  ('Brannpost 3', 'BP3', 'Kjeller øst', 3),
  ('Brannpost 4', 'BP4', 'Kjeller vest', 4),
  ('Brannpost 5', 'BP5', '1. etasje', 5),
  ('Brannpost 6', 'BP6', '2. etasje', 6),
  ('Brannpost 7', 'BP7', 'Teknisk rom', 7),
  ('Brannpost 8', 'BP8', 'Lager', 8)
ON CONFLICT (code) DO NOTHING;

-- SEED: default checklist items (1.19-1.30)
INSERT INTO public.checklist_items (item_key, item_label, sort_order) VALUES
  ('1.19', 'Blokkerte eller låste rømningsveier', 1),
  ('1.20', 'Tilgang til slokkeutstyr', 2),
  ('1.21', 'Lagring av brennbare materialer', 3),
  ('1.22', 'Bruk av skjøteledning', 4),
  ('1.23', 'Bruk av komfyr', 5),
  ('1.24', 'Bruk av kaffetrakter/vannkoker', 6),
  ('1.25', 'Bruk av levende lys', 7),
  ('1.26', 'Utvendig sikring av avfallsdunker mht. mulighet for påsatt brann', 8),
  ('1.27', 'Synlige skader på det elektriske anlegget (kontakter, ledninger)', 9),
  ('1.28', 'Blinkende lysrør', 10),
  ('1.29', 'Tidsbrytere på kaffetraktere/vannvarmere', 11),
  ('1.30', 'Unødig bruk av skjøteledninger', 12)
ON CONFLICT DO NOTHING;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_fire_stations_active ON public.fire_stations (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_active ON public.checklist_items (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_inst_stations_inspection ON public.inspection_stations (inspection_id);
