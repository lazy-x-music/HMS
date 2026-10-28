import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Role = 'admin' | 'inspector';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
};

// ============ Fire inspection (existing) ============

export type InspectionStatus = 'pending' | 'completed';

export type Inspection = {
  id: string;
  inspector_id: string | null;
  inspector_name: string;
  period_month: number;
  period_year: number;
  status: InspectionStatus;
  completed_at: string | null;
  created_at: string;
};

export type ItemStatus =
  | 'tilfredsstillende'
  | 'tiltak_vurderes'
  | 'tiltak_nodvendig'
  | 'ikke_relevant';

export type InspectionItem = {
  id: string;
  inspection_id: string;
  checklist_item_id: string | null;
  item_key: string;
  item_label: string;
  status: ItemStatus;
  comment: string;
  photo_url: string;
  created_at: string;
};

export type FireStation = {
  id: string;
  name: string;
  code: string;
  location: string;
  qr_token: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  item_key: string;
  item_label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type InspectionStation = {
  id: string;
  inspection_id: string;
  station_id: string | null;
  station_name: string;
  checked_method: 'scanned' | 'manual';
  skip_reason: string;
  checked_at: string;
};

export type Issue = {
  id: string;
  inspection_id: string;
  item_key: string;
  item_label: string;
  comment: string;
  photo_url: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
};

// ============ Truck check ============

export type TruckStatus = 'operational' | 'out_of_service';

export type Truck = {
  id: string;
  name: string;
  code: string;
  brand: string;
  model: string;
  serial_no: string;
  truck_class: string;
  truck_type: string;
  status: TruckStatus;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type TruckCheckStatus = 'pending' | 'completed';

export type TruckCheckItemStatus = 'ok' | 'minor' | 'red_flag' | 'na';

export type TruckCheck = {
  id: string;
  truck_id: string | null;
  truck_name: string;
  inspector_id: string | null;
  inspector_name: string;
  inspector_email: string;
  operating_hours: number | null;
  status: TruckCheckStatus;
  has_red_flag: boolean;
  signature: string;
  completed_at: string | null;
  created_at: string;
};

export type TruckCheckItem = {
  id: string;
  truck_check_id: string;
  item_key: string;
  item_label: string;
  status: TruckCheckItemStatus;
  comment: string;
  created_at: string;
};

// ============ Truck training (Typeopplæring § 10-4) ============

export type TruckTraining = {
  id: string;
  truck_id: string | null;
  truck_name: string;
  truck_brand: string;
  truck_model: string;
  truck_serial_no: string;
  truck_class: string;
  truck_type: string;
  employee_id: string | null;
  employee_name: string;
  instructor_id: string | null;
  instructor_name: string;
  instructor_email: string;
  completed_date: string | null;
  employee_signature: string;
  instructor_signature: string;
  status: string;
  certificate_url: string;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export type TruckTrainingItem = {
  id: string;
  truck_training_id: string;
  item_key: string;
  item_label: string;
  checked: boolean;
  note: string;
  created_at: string;
};

export const TRUCK_TRAINING_ITEMS: { key: string; label: string }[] = [
  { key: 'license_class', label: 'Truckførerbevis klasse' },
  { key: 'instruction_book', label: 'Instruksjonsbok' },
  { key: 'daily_inspection', label: 'Daglig kontroll, dokumentasjon og krav' },
  { key: 'truck_description', label: 'Beskrivelse og visning av trucken' },
  { key: 'user_training_controls', label: 'Brukeropplæring: Spaker, Bremser/Brytere/Pedaler, Tilleggsutstyr' },
  { key: 'capacity_plate', label: 'Maskinskilt, forståelse og løftekapasitet' },
  { key: 'mast_height', label: 'Mast / kjørehøyde (nedsenket, maks høyde, friløft)' },
  { key: 'charging_maintenance', label: 'Lading og vedlikehold av batteri / væsker' },
  { key: 'parking_safety', label: 'Parkering, sted og sikkerhet' },
  { key: 'local_extras', label: 'Lokalt tillegg / Tilleggsutstyr' },
];

export async function fetchTruckTrainings(): Promise<TruckTraining[]> {
  const { data, error } = await supabase
    .from('truck_trainings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TruckTraining[];
}

export async function fetchTruckTrainingsForEmployee(employeeId: string): Promise<TruckTraining[]> {
  const { data, error } = await supabase
    .from('truck_trainings')
    .select('*')
    .eq('employee_id', employeeId)
    .order('completed_date', { ascending: false });
  if (error) throw error;
  return (data || []) as TruckTraining[];
}

// ============ Clothing logs ============

export type ClothingLog = {
  id: string;
  employee_name: string;
  item_type: string;
  size: string;
  action: 'issued' | 'returned' | 'replaced';
  quantity: number;
  comment: string;
  created_at: string;
};

// ============ Closing routines ============

export type ClosingRoutine = {
  id: string;
  inspector_name: string;
  inspector_id: string | null;
  template_id: string | null;
  status: 'pending' | 'completed';
  signature: string;
  completed_at: string | null;
  created_at: string;
};

export type ClosingRoutineItem = {
  id: string;
  closing_routine_id: string;
  template_item_id: string | null;
  item_key: string;
  item_label: string;
  status: TruckCheckItemStatus;
  comment: string;
  created_at: string;
};

export type ClosingRoutineTemplate = {
  id: string;
  name: string;
  scope: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

export type ClosingRoutineTemplateItem = {
  id: string;
  template_id: string;
  item_key: string;
  item_label: string;
  sort_order: number;
  created_at: string;
};

// ============ RUH reports ============

export type RuhReport = {
  id: string;
  reporter_name: string;
  category: 'near_miss' | 'hazard' | 'incident' | 'unsafe_act';
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  action_taken: string;
  status: 'open' | 'resolved';
  photo_url: string;
  resolved_at: string | null;
  created_at: string;
};

// ============ HMS documents ============

export type HmsDocument = {
  id: string;
  title: string;
  category: 'procedure' | 'policy' | 'manual' | 'form' | 'guideline' | 'instruction' | 'report';
  description: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string;
  created_by: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

// ============ Checklist helpers ============

export const DEFAULT_CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: '1.19', label: 'Blokkerte eller låste rømningsveier' },
  { key: '1.20', label: 'Tilgang til slokkeutstyr' },
  { key: '1.21', label: 'Lagring av brennbare materialer' },
  { key: '1.22', label: 'Bruk av skjøteledning' },
  { key: '1.23', label: 'Bruk av komfyr' },
  { key: '1.24', label: 'Bruk av kaffetrakter/vannkoker' },
  { key: '1.25', label: 'Bruk av levende lys' },
  { key: '1.26', label: 'Utvendig sikring av avfallsdunker mht. mulighet for påsatt brann' },
  { key: '1.27', label: 'Synlige skader på det elektriske anlegget (kontakter, ledninger)' },
  { key: '1.28', label: 'Blinkende lysrør' },
  { key: '1.29', label: 'Tidsbrytere på kaffetraktere/vannvarmere' },
  { key: '1.30', label: 'Unødig bruk av skjøteledninger' },
];

export const TRUCK_CHECK_ITEMS: { key: string; label: string }[] = [
  { key: 'visual_damage', label: 'Visuell kontroll & Skader' },
  { key: 'wheels_tires', label: 'Hjul, Dekk & Hjulmuttere' },
  { key: 'lifting_forks', label: 'Løfteutstyr & Gafler' },
  { key: 'battery_fuel', label: 'Batteri / Drivstoff & Lading' },
  { key: 'operator_safety', label: 'Førerplass & Sikkerhetsutstyr' },
  { key: 'lights_signals', label: 'Lys, Signal & Fløyte' },
  { key: 'steering_brakes', label: 'Styre- og Bremsesystem' },
  { key: 'lifting_function', label: 'Løfte- og Senkefunksjon' },
  { key: 'emergency_safety', label: 'Nødstopp & Sikkerhetsbrytere' },
];

export const CLOSING_ROUTINE_ITEMS: { key: string; label: string }[] = [
  { key: 'lights_off', label: 'Alle lys slått av' },
  { key: 'doors_locked', label: 'Alle dører låst' },
  { key: 'appliances_off', label: 'Apparater slått av' },
  { key: 'emergency_exits', label: 'Nødutganger frie' },
  { key: 'waste_secured', label: 'Avfall sikret' },
  { key: 'alarm_system', label: 'Alarm aktivert' },
];

export async function fetchChecklistItems(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as ChecklistItem[];
}

export async function fetchAllChecklistItems(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as ChecklistItem[];
}

export async function fetchFireStations(activeOnly = true): Promise<FireStation[]> {
  let q = supabase.from('fire_stations').select('*').order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as FireStation[];
}

export async function fetchTrucks(activeOnly = true): Promise<Truck[]> {
  let q = supabase.from('trucks').select('*').order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Truck[];
}

export async function fetchTruckChecks(): Promise<TruckCheck[]> {
  const { data, error } = await supabase
    .from('truck_checks')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data || []) as TruckCheck[];
}

export async function fetchTruckCheckItems(checkId: string): Promise<TruckCheckItem[]> {
  const { data, error } = await supabase
    .from('truck_check_items')
    .select('*')
    .eq('truck_check_id', checkId);
  if (error) throw error;
  return (data || []) as TruckCheckItem[];
}

export type ComplianceEntry = {
  truck: Truck;
  checkedToday: boolean;
  lastCheck: TruckCheck | null;
};

export async function fetchDailyCompliance(): Promise<ComplianceEntry[]> {
  const [trucks, checks] = await Promise.all([fetchTrucks(false), fetchTruckChecks()]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return trucks.map((truck) => {
    const truckChecks = checks.filter((c) => c.truck_id === truck.id);
    const lastCheck = truckChecks[0] || null;
    const checkedToday = truckChecks.some(
      (c) => c.completed_at && new Date(c.completed_at) >= today,
    );
    return { truck, checkedToday, lastCheck };
  });
}

export const STATUS_META: Record<
  ItemStatus,
  { label: string; color: string; bg: string; border: string; dot: string; text: string }
> = {
  tilfredsstillende: {
    label: 'Tilfredsstillende',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
    text: 'Tilfredsstillende',
  },
  tiltak_vurderes: {
    label: 'Tiltak vurderes',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    dot: 'bg-amber-500',
    text: 'Tiltak vurderes',
  },
  tiltak_nodvendig: {
    label: 'Tiltak nødvendig',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-500',
    dot: 'bg-red-500',
    text: 'Tiltak nødvendig',
  },
  ikke_relevant: {
    label: 'Ikke relevant',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-400',
    dot: 'bg-gray-400',
    text: 'Ikke relevant',
  },
};

export const TRUCK_STATUS_META: Record<
  TruckCheckItemStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  ok: {
    label: 'OK',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    dot: 'bg-emerald-500',
  },
  minor: {
    label: 'Mindre avvik',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    dot: 'bg-amber-500',
  },
  red_flag: {
    label: 'Rødt flagg',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-500',
    dot: 'bg-red-500',
  },
  na: {
    label: 'Ikke relevant',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-400',
    dot: 'bg-gray-400',
  },
};

export const NORWEGIAN_MONTHS = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

export function formatMonthYear(month: number, year: number): string {
  return `${NORWEGIAN_MONTHS[month - 1]} ${year}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
