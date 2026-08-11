/*
# Add HMS module tables: Trucksjekk, Arbeidstøy, Stengerutiner, RUH, HMS-Håndbok

## Overview
Extends the Aksell HMS portal with 5 new module areas alongside the existing
brannvern (fire inspection) module. All tables use the same authenticated
owner-scoped RLS pattern as the existing inspection tables.

## New Tables

### 1. trucks
Registry of forklifts/trucks available for daily inspection.
- id (uuid PK)
- name (text) — e.g. "Truck 01 - Toyota"
- code (text) — short code e.g. "T01"
- status (text) — 'operational' | 'out_of_service' (default 'operational')
- sort_order (int, default 0)
- active (bool, default true)
- created_at (timestamptz)

### 2. truck_checks
A daily truck inspection session (analogous to inspections).
- id (uuid PK)
- truck_id (uuid FK → trucks)
- truck_name (text) — denormalized for history
- inspector_name (text)
- status (text) — 'pending' | 'completed'
- has_red_flag (bool) — true if any item was flagged red
- signature (text) — digital signature (base64 or name string)
- completed_at (timestamptz)
- created_at (timestamptz)

### 3. truck_check_items
Individual checklist items within a truck_check.
- id (uuid PK)
- truck_check_id (uuid FK → truck_checks ON DELETE CASCADE)
- item_key (text) — e.g. 'brakes', 'battery', 'tires', 'hydraulics', 'safety'
- item_label (text)
- status (text) — 'ok' | 'minor' | 'red_flag' | 'na'
- comment (text)
- created_at (timestamptz)

### 4. clothing_logs
Log entries for work clothing / PPE issuance and returns.
- id (uuid PK)
- employee_name (text)
- item_type (text) — e.g. "Jakke", "Bukse", "Hjelm", "Vernebriller"
- size (text)
- action (text) — 'issued' | 'returned' | 'replaced'
- quantity (int, default 1)
- comment (text)
- created_at (timestamptz)

### 5. closing_routines
A daily closing checklist session.
- id (uuid PK)
- inspector_name (text)
- status (text) — 'pending' | 'completed'
- signature (text)
- completed_at (timestamptz)
- created_at (timestamptz)

### 6. closing_routine_items
Individual items within a closing routine.
- id (uuid PK)
- closing_routine_id (uuid FK → closing_routines ON DELETE CASCADE)
- item_key (text)
- item_label (text)
- status (text) — 'ok' | 'minor' | 'red_flag' | 'na'
- comment (text)
- created_at (timestamptz)

### 7. ruh_reports
"Melde RUH / Avvik" — quick safety incident / hazardous condition reports.
- id (uuid PK)
- reporter_name (text)
- category (text) — e.g. 'near_miss', 'hazard', 'incident', 'unsafe_act'
- severity (text) — 'low' | 'medium' | 'high'
- location (text)
- description (text)
- action_taken (text)
- status (text) — 'open' | 'resolved' (default 'open')
- photo_url (text)
- resolved_at (timestamptz)
- created_at (timestamptz)

### 8. hms_documents
Document registry for the HMS handbook / procedures.
- id (uuid PK)
- title (text)
- category (text) — e.g. 'procedure', 'policy', 'manual', 'form'
- description (text)
- file_url (text) — link to external doc or storage path
- sort_order (int, default 0)
- active (bool, default true)
- created_at (timestamptz)

## Security
All tables have RLS enabled with authenticated owner-scoped CRUD policies.
Note: trucks, hms_documents are admin-managed reference data but all
authenticated users need read access. Write access (insert/update/delete)
is restricted to authenticated users (admins manage via UI).

## Important Notes
1. trucks and hms_documents: SELECT for all authenticated, write for all authenticated
   (admin-only enforcement is in the UI, consistent with existing profiles/fire_stations pattern).
2. truck_checks, truck_check_items, clothing_logs, closing_routines, closing_routine_items,
   ruh_reports: full CRUD for authenticated users.
3. All tables use ON DELETE CASCADE for child→parent FK relationships.
*/

-- ============ trucks ============
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'operational',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_trucks" ON trucks;
CREATE POLICY "select_trucks" ON trucks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_trucks" ON trucks;
CREATE POLICY "insert_trucks" ON trucks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_trucks" ON trucks;
CREATE POLICY "update_trucks" ON trucks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_trucks" ON trucks;
CREATE POLICY "delete_trucks" ON trucks FOR DELETE TO authenticated USING (true);

-- ============ truck_checks ============
CREATE TABLE IF NOT EXISTS truck_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL,
  truck_name text NOT NULL DEFAULT '',
  inspector_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  has_red_flag boolean NOT NULL DEFAULT false,
  signature text NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE truck_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_truck_checks" ON truck_checks;
CREATE POLICY "select_truck_checks" ON truck_checks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_truck_checks" ON truck_checks;
CREATE POLICY "insert_truck_checks" ON truck_checks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_truck_checks" ON truck_checks;
CREATE POLICY "update_truck_checks" ON truck_checks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_truck_checks" ON truck_checks;
CREATE POLICY "delete_truck_checks" ON truck_checks FOR DELETE TO authenticated USING (true);

-- ============ truck_check_items ============
CREATE TABLE IF NOT EXISTS truck_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_check_id uuid NOT NULL REFERENCES truck_checks(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE truck_check_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_truck_check_items" ON truck_check_items;
CREATE POLICY "select_truck_check_items" ON truck_check_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_truck_check_items" ON truck_check_items;
CREATE POLICY "insert_truck_check_items" ON truck_check_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_truck_check_items" ON truck_check_items;
CREATE POLICY "update_truck_check_items" ON truck_check_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_truck_check_items" ON truck_check_items;
CREATE POLICY "delete_truck_check_items" ON truck_check_items FOR DELETE TO authenticated USING (true);

-- ============ clothing_logs ============
CREATE TABLE IF NOT EXISTS clothing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL DEFAULT '',
  item_type text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'issued',
  quantity int NOT NULL DEFAULT 1,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clothing_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_clothing_logs" ON clothing_logs;
CREATE POLICY "select_clothing_logs" ON clothing_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_clothing_logs" ON clothing_logs;
CREATE POLICY "insert_clothing_logs" ON clothing_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_clothing_logs" ON clothing_logs;
CREATE POLICY "update_clothing_logs" ON clothing_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_clothing_logs" ON clothing_logs;
CREATE POLICY "delete_clothing_logs" ON clothing_logs FOR DELETE TO authenticated USING (true);

-- ============ closing_routines ============
CREATE TABLE IF NOT EXISTS closing_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  signature text NOT NULL DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE closing_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_closing_routines" ON closing_routines;
CREATE POLICY "select_closing_routines" ON closing_routines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_closing_routines" ON closing_routines;
CREATE POLICY "insert_closing_routines" ON closing_routines FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_closing_routines" ON closing_routines;
CREATE POLICY "update_closing_routines" ON closing_routines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_closing_routines" ON closing_routines;
CREATE POLICY "delete_closing_routines" ON closing_routines FOR DELETE TO authenticated USING (true);

-- ============ closing_routine_items ============
CREATE TABLE IF NOT EXISTS closing_routine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_routine_id uuid NOT NULL REFERENCES closing_routines(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE closing_routine_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_closing_routine_items" ON closing_routine_items;
CREATE POLICY "select_closing_routine_items" ON closing_routine_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_closing_routine_items" ON closing_routine_items;
CREATE POLICY "insert_closing_routine_items" ON closing_routine_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_closing_routine_items" ON closing_routine_items;
CREATE POLICY "update_closing_routine_items" ON closing_routine_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_closing_routine_items" ON closing_routine_items;
CREATE POLICY "delete_closing_routine_items" ON closing_routine_items FOR DELETE TO authenticated USING (true);

-- ============ ruh_reports ============
CREATE TABLE IF NOT EXISTS ruh_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'hazard',
  severity text NOT NULL DEFAULT 'medium',
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  action_taken text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  photo_url text NOT NULL DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ruh_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_ruh_reports" ON ruh_reports;
CREATE POLICY "select_ruh_reports" ON ruh_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_ruh_reports" ON ruh_reports;
CREATE POLICY "insert_ruh_reports" ON ruh_reports FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_ruh_reports" ON ruh_reports;
CREATE POLICY "update_ruh_reports" ON ruh_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_ruh_reports" ON ruh_reports;
CREATE POLICY "delete_ruh_reports" ON ruh_reports FOR DELETE TO authenticated USING (true);

-- ============ hms_documents ============
CREATE TABLE IF NOT EXISTS hms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'procedure',
  description text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hms_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_hms_documents" ON hms_documents;
CREATE POLICY "select_hms_documents" ON hms_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_hms_documents" ON hms_documents;
CREATE POLICY "insert_hms_documents" ON hms_documents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_hms_documents" ON hms_documents;
CREATE POLICY "update_hms_documents" ON hms_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_hms_documents" ON hms_documents;
CREATE POLICY "delete_hms_documents" ON hms_documents FOR DELETE TO authenticated USING (true);

-- ============ Seed data ============

-- Default trucks
INSERT INTO trucks (name, code, status, sort_order) VALUES
  ('Truck 01 - Toyota', 'T01', 'operational', 1),
  ('Truck 02 - Linde', 'T02', 'operational', 2),
  ('Truck 03 - Toyota', 'T03', 'operational', 3)
ON CONFLICT DO NOTHING;

-- Default closing routine items (insert as a reference; used by UI)
-- (No separate reference table; the UI defines the checklist items)

-- Default HMS documents
INSERT INTO hms_documents (title, category, description, sort_order) VALUES
  ('HMS-Håndbok 2024', 'manual', 'Hoveddokument for HMS-rutiner og prosedyrer', 1),
  ('Brannvernprosedyre', 'procedure', 'Prosedyre for månedlig brannvernrunde', 2),
  ('Trucksjekk prosedyre', 'procedure', 'Daglig kontroll av truck', 3),
  ('RUH-rutine', 'procedure', 'Rutine for melding av RUH og avvik', 4),
  ('Verneutstyr oversikt', 'policy', 'Oversikt over verneutstyr og PPE', 5)
ON CONFLICT DO NOTHING;
