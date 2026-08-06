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
