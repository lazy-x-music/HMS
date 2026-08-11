import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, Truck as TruckIcon, X } from 'lucide-react';
import { fetchTrucks, supabase, type Truck, type TruckStatus } from '@/lib/supabase';

type EditState = { id?: string; name: string; code: string; status: TruckStatus; sort_order: number };

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
    const payload = { name: editing.name.trim(), code: editing.code.trim(), status: editing.status, sort_order: editing.sort_order };
    const result = editing.id ? await supabase.from('trucks').update(payload).eq('id', editing.id) : await supabase.from('trucks').insert(payload);
    if (result.error) setError(result.error.message); else { setEditing(null); await load(); }
    setBusy(false);
  }
  async function remove(truck: Truck) { if (!window.confirm(`Slette ${truck.name}?`)) return; await supabase.from('trucks').delete().eq('id', truck.id); await load(); }
  async function resetStatus(truck: Truck) { await supabase.from('trucks').update({ status: 'operational' }).eq('id', truck.id); await load(); }

  return <div>
    <button onClick={() => setEditing({ name: '', code: '', status: 'operational', sort_order: trucks.length + 1 })} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Ny truck</button>
    {error && <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-slate-400" /> : <div className="space-y-3">{trucks.map((truck) => <div key={truck.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><TruckIcon className="h-5 w-5" /></div><div className="flex-1"><p className="font-bold">{truck.name}</p><p className="mt-1 text-sm text-slate-500">{truck.code} · <span className={truck.status === 'out_of_service' ? 'font-semibold text-red-600' : 'text-emerald-600'}>{truck.status === 'out_of_service' ? 'Ut av drift' : 'Operativ'}</span></p></div><button onClick={() => setEditing({ id: truck.id, name: truck.name, code: truck.code, status: truck.status, sort_order: truck.sort_order })} className="rounded-xl bg-slate-100 p-2 text-slate-600"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(truck)} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button></div>{truck.status === 'out_of_service' && <button onClick={() => resetStatus(truck)} className="mt-3 w-full rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700">Sett tilbake som operativ</button>}</div>)}</div>}
    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"><div className="w-full max-w-sm rounded-3xl bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{editing.id ? 'Rediger truck' : 'Ny truck'}</h2><button onClick={() => setEditing(null)} className="rounded-xl bg-slate-100 p-2"><X className="h-4 w-4" /></button></div><div className="space-y-3"><label className="block text-xs font-semibold text-slate-500">Navn<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="Truck 04 - Linde" /></label><label className="block text-xs font-semibold text-slate-500">Kode<input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none" placeholder="T04" /></label><label className="block text-xs font-semibold text-slate-500">Status<select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as TruckStatus })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none"><option value="operational">Operativ</option><option value="out_of_service">Ut av drift</option></select></label></div><button onClick={save} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre truck</button></div></div>}
  </div>;
}
