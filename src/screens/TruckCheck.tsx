import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, CircleAlert, Loader2, ShieldAlert, Signature, Truck as TruckIcon, X } from 'lucide-react';
import { supabase, TRUCK_CHECK_ITEMS, TRUCK_STATUS_META, type Truck, type TruckCheckItemStatus } from '@/lib/supabase';
import { fetchTrucks } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Props = { onBack: () => void; onComplete: (id: string) => void };
type Step = 1 | 2 | 3;
type ItemState = { status: TruckCheckItemStatus; comment: string };

const options: { value: TruckCheckItemStatus; label: string; icon: typeof Check; tone: string }[] = [
  { value: 'ok', label: 'OK', icon: Check, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'minor', label: 'Mindre avvik', icon: CircleAlert, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'red_flag', label: 'Rødt flagg', icon: ShieldAlert, tone: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'na', label: 'Ikke relevant', icon: X, tone: 'border-slate-200 bg-slate-50 text-slate-600' },
];

export default function TruckCheck({ onBack, onComplete }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrucks(true).then((data) => { setTrucks(data); setLoading(false); }).catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Kunne ikke laste trucker'); setLoading(false); });
  }, []);

  const redCount = useMemo(() => Object.values(items).filter((item) => item.status === 'red_flag').length, [items]);
  const answeredCount = useMemo(() => Object.keys(items).length, [items]);
  const progress = step === 1 ? 0 : step === 2 ? 50 : 100;

  function chooseTruck(selected: Truck) {
    setTruck(selected);
    const initial: Record<string, ItemState> = {};
    TRUCK_CHECK_ITEMS.forEach((item) => { initial[item.key] = { status: 'ok', comment: '' }; });
    setItems(initial);
    setStep(2);
  }

  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  async function save() {
    if (!truck || !signature.trim()) { setError('Velg truck og legg inn signatur før innsending.'); return; }
    setSaving(true); setError('');
    try {
      const { data: check, error: checkError } = await supabase.from('truck_checks').insert({ truck_id: truck.id, truck_name: truck.name, inspector_name: profile?.full_name || '', status: 'completed', has_red_flag: redCount > 0, signature: signature.trim(), completed_at: new Date().toISOString() }).select('id').single();
      if (checkError || !check) throw checkError || new Error('Kunne ikke lagre kontrollen');
      const rows = TRUCK_CHECK_ITEMS.map((item) => ({ truck_check_id: check.id, item_key: item.key, item_label: item.label, status: items[item.key].status, comment: items[item.key].comment }));
      const { error: itemsError } = await supabase.from('truck_check_items').insert(rows);
      if (itemsError) throw itemsError;
      if (redCount > 0) {
        const { error: truckError } = await supabase.from('trucks').update({ status: 'out_of_service' }).eq('id', truck.id);
        if (truckError) throw truckError;
        await supabase.from('ruh_reports').insert({ reporter_name: profile?.full_name || '', category: 'hazard', severity: 'high', location: truck.name, description: `Trucken er tatt ut av drift etter rødt flagg i trucksjekk. ${TRUCK_CHECK_ITEMS.filter((item) => items[item.key].status === 'red_flag').map((item) => item.label).join(', ')}`, action_taken: 'Truck satt ut av drift', status: 'open' });
      }
      onComplete(check.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunne ikke lagre trucksjekken'); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return <div className="min-h-screen bg-[#f5f7fa] pb-10">
    <header className="bg-slate-950 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9"><div className="mx-auto max-w-3xl"><div className="flex items-center gap-3"><button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Daglig kontroll</p><h1 className="text-xl font-bold">Trucksjekk</h1></div></div><div className="mt-6 flex items-center justify-between text-xs text-slate-400"><span>Steg {step} av 3</span><span>{truck?.name || 'Velg truck'}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} /></div></div></header>
    <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      {error && <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {step === 1 && <section className="animate-fade-in"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Steg 1</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Velg truck</h2><p className="mt-2 text-sm leading-6 text-slate-500">Velg kjøretøyet du skal kontrollere før bruk.</p></div><div className="space-y-3">{trucks.map((item) => <button key={item.id} onClick={() => chooseTruck(item)} className="group flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><TruckIcon className="h-6 w-6" /></div><div className="flex-1"><p className="font-bold">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.code} · <span className={item.status === 'out_of_service' ? 'font-semibold text-red-600' : 'text-emerald-600'}>{item.status === 'out_of_service' ? 'Ut av drift' : 'Klar for kontroll'}</span></p></div><ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1" /></button>)}</div></section>}
      {step === 2 && <section className="animate-fade-in"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Steg 2</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Kontroller trucken</h2></div><span className="text-sm font-semibold text-slate-500">{answeredCount}/{TRUCK_CHECK_ITEMS.length}</span></div><div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(answeredCount / TRUCK_CHECK_ITEMS.length) * 100}%` }} /></div><div className="space-y-3">{TRUCK_CHECK_ITEMS.map((item) => { const current = items[item.key]; return <div key={item.key} className={`rounded-3xl border bg-white p-5 shadow-sm ${current.status === 'red_flag' ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold uppercase text-slate-600">{item.key.slice(0, 2)}</div><div className="flex-1"><p className="font-bold">{item.label}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{options.map((option) => { const Icon = option.icon; return <button key={option.value} onClick={() => updateItem(item.key, { status: option.value })} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${current.status === option.value ? option.tone : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Icon className="h-3.5 w-3.5" />{option.label}</button>; })}</div>{current.status !== 'ok' && current.status !== 'na' && <textarea value={current.comment} onChange={(event) => updateItem(item.key, { comment: event.target.value })} placeholder="Beskriv avviket..." rows={2} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-cyan-400" />}</div></div></div>; })}</div><button onClick={() => setStep(3)} disabled={answeredCount !== TRUCK_CHECK_ITEMS.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Gå til gjennomgang <ChevronRight className="h-4 w-4" /></button></section>}
      {step === 3 && <section className="animate-fade-in"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Steg 3</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Gjennomgang & signering</h2><p className="mt-2 text-sm leading-6 text-slate-500">Bekreft kontrollen før den lagres.</p></div><div className={`mb-4 rounded-3xl border p-5 ${redCount > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>{redCount > 0 ? <div className="flex items-start gap-3 text-red-800"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Trucken settes ut av drift</p><p className="mt-1 text-sm leading-6">Rødt flagg registreres som et aktivt avvik og trucken kan ikke brukes før feilen er håndtert.</p></div></div> : <div className="flex items-start gap-3 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Alt ser bra ut</p><p className="mt-1 text-sm">Ingen røde flagg er registrert i denne kontrollen.</p></div></div>}</div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><Signature className="h-5 w-5 text-slate-600" /></div><div><p className="font-bold">Digital signatur</p><p className="text-sm text-slate-500">Skriv navnet ditt for å bekrefte</p></div></div><input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Fullt navn" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white" /></div><div className="mt-5 flex gap-3"><button onClick={() => setStep(2)} className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Tilbake</button><button onClick={save} disabled={saving || !signature.trim()} className="flex-[2] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-50">{saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Send inn trucksjekk'}</button></div></section>}
    </main>
  </div>;
}
