import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, Truck as TruckIcon, X } from 'lucide-react';
import { fetchTrucks, supabase, type Truck, type TruckStatus } from '@/lib/supabase';

type EditState = {
  id?: string;
  name: string;
  code: string;
  brand: string;
  model: string;
  serial_no: string;
  truck_class: string;
  truck_type: string;
  status: TruckStatus;
  sort_order: number;
};

const TRUCK_CLASSES = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

function emptyEdit(count: number): EditState {
  return { name: '', code: '', brand: '', model: '', serial_no: '', truck_class: '', truck_type: '', status: 'operational', sort_order: count + 1 };
}

function toEdit(truck: Truck): EditState {
  return {
    id: truck.id,
    name: truck.name,
    code: truck.code,
    brand: truck.brand || '',
    model: truck.model || '',
    serial_no: truck.serial_no || '',
    truck_class: truck.truck_class || '',
    truck_type: truck.truck_type || '',
    status: truck.status,
    sort_order: truck.sort_order,
  };
}

export default function TruckManagement() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setTrucks(await fetchTrucks(false)); } catch (err) { setError(err instanceof Error ? err.message : 'Kunne ikke laste trucker'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing || !editing.name.trim() || !editing.code.trim()) { setError('Navn og kode er påkrevd.'); return; }
    setBusy(true); setError('');
    const payload = {
      name: editing.name.trim(),
      code: editing.code.trim(),
      brand: editing.brand.trim(),
      model: editing.model.trim(),
      serial_no: editing.serial_no.trim(),
      truck_class: editing.truck_class.trim(),
      truck_type: editing.truck_type.trim(),
      status: editing.status,
      sort_order: editing.sort_order,
    };
    const result = editing.id ? await supabase.from('trucks').update(payload).eq('id', editing.id) : await supabase.from('trucks').insert(payload);
    if (result.error) setError(result.error.message); else { setEditing(null); await load(); }
    setBusy(false);
  }
  async function remove(truck: Truck) { if (!window.confirm(`Slette ${truck.name}?`)) return; await supabase.from('trucks').delete().eq('id', truck.id); await load(); }
  async function resetStatus(truck: Truck) { await supabase.from('trucks').update({ status: 'operational' }).eq('id', truck.id); await load(); }

  return <div>
    <button onClick={() => setEditing(emptyEdit(trucks.length))} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Ny truck</button>
    {error && <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-slate-400" /> : (
      <div className="space-y-3">
        {trucks.map((truck) => (
          <div key={truck.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><TruckIcon className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="font-bold">{truck.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {truck.code} · <span className={truck.status === 'out_of_service' ? 'font-semibold text-red-600' : 'text-emerald-600'}>{truck.status === 'out_of_service' ? 'Ut av drift' : 'Operativ'}</span>
                </p>
                {(truck.brand || truck.model || truck.truck_class || truck.serial_no) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {truck.brand && `${truck.brand} `}
                    {truck.model && `${truck.model} `}
                    {truck.truck_class && `· ${truck.truck_class}`}
                    {truck.serial_no && ` · SN: ${truck.serial_no}`}
                  </p>
                )}
              </div>
              <button onClick={() => setEditing(toEdit(truck))} className="rounded-xl bg-slate-100 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(truck)} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            {truck.status === 'out_of_service' && <button onClick={() => resetStatus(truck)} className="mt-3 w-full rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700">Sett tilbake som operativ</button>}
          </div>
        ))}
      </div>
    )}

    {editing && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">{editing.id ? 'Rediger truck' : 'Ny truck'}</h2>
            <button onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 p-2"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            <FieldInput label="Navn" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="Truck 04 - Linde" />
            <FieldInput label="Kode" value={editing.code} onChange={(v) => setEditing({ ...editing, code: v })} placeholder="T04" />
            <FieldInput label="Merke" value={editing.brand} onChange={(v) => setEditing({ ...editing, brand: v })} placeholder="Toyota" />
            <FieldInput label="Modell" value={editing.model} onChange={(v) => setEditing({ ...editing, model: v })} placeholder="8FBE20" />
            <FieldInput label="Type" value={editing.truck_type} onChange={(v) => setEditing({ ...editing, truck_type: v })} placeholder="Reach truck" />
            <label className="block text-xs font-semibold text-slate-500">Truckklasse (T1–T8)
              <select value={editing.truck_class} onChange={(e) => setEditing({ ...editing, truck_class: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none">
                {TRUCK_CLASSES.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
              </select>
            </label>
            <FieldInput label="Serienummer" value={editing.serial_no} onChange={(v) => setEditing({ ...editing, serial_no: v })} placeholder="SN-12345" />
            <label className="block text-xs font-semibold text-slate-500">Status
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as TruckStatus })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none">
                <option value="operational">Operativ</option>
                <option value="out_of_service">Ut av drift</option>
              </select>
            </label>
          </div>
          <button onClick={save} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre truck
          </button>
        </div>
      </div>
    )}
  </div>;
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block text-xs font-semibold text-slate-500">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" />
    </label>
  );
}
