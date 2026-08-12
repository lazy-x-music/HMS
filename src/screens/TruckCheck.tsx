import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, CircleDot, Loader2, ShieldAlert, Truck as TruckIcon, X } from 'lucide-react';
import { fetchTrucks, supabase, TRUCK_CHECK_ITEMS, type Truck, type TruckCheckItemStatus } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Props = { onBack: () => void; onComplete: (id: string) => void };
type ItemState = { status: TruckCheckItemStatus | null; comment: string };
type Choice = { value: TruckCheckItemStatus; label: string; description: string; icon: typeof Check; className: string };

const choices: Choice[] = [
  { value: 'ok', label: 'OK', description: 'Ingen feil funnet', icon: Check, className: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400' },
  { value: 'minor', label: 'Bør utbedres', description: 'Registrer et mindre avvik', icon: CircleAlert, className: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400' },
  { value: 'red_flag', label: 'Defekt', description: 'Trucken tas ut av drift', icon: ShieldAlert, className: 'border-red-200 bg-red-50 text-red-800 hover:border-red-400' },
];

function getInspector(profile: ReturnType<typeof useAuth>['profile'], email: string | undefined) {
  const name = profile?.full_name?.trim() || email || 'Innlogget bruker';
  return { name, email: profile?.email || email || '' };
}

export default function TruckCheck({ onBack, onComplete }: Props) {
  const { profile, session } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [operatingHours, setOperatingHours] = useState('');
  const [step, setStep] = useState(-1);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoName, setPhotoName] = useState('');

  const inspector = getInspector(profile, session?.user.email);
  const currentItem = step >= 0 && step < TRUCK_CHECK_ITEMS.length ? TRUCK_CHECK_ITEMS[step] : null;
  const currentState = currentItem ? items[currentItem.key] : null;
  const redCount = useMemo(() => Object.values(items).filter((item) => item.status === 'red_flag').length, [items]);
  const answeredCount = useMemo(() => Object.values(items).filter((item) => item.status !== null).length, [items]);
  const isSummary = step === TRUCK_CHECK_ITEMS.length;
  const progress = isSummary ? 100 : step < 0 ? 0 : ((step + 1) / 10) * 100;

  useEffect(() => {
    fetchTrucks(true)
      .then(setTrucks)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Kunne ikke laste trucker'))
      .finally(() => setLoading(false));
  }, []);

  function selectTruck(selected: Truck) {
    setTruck(selected);
    const initial: Record<string, ItemState> = {};
    TRUCK_CHECK_ITEMS.forEach((item) => { initial[item.key] = { status: null, comment: '' }; });
    setItems(initial);
    setError('');
  }

  function startInspection() {
    if (!truck) { setError('Velg truck før du starter kontrollen.'); return; }
    setError('');
    setStep(0);
  }

  function chooseStatus(status: TruckCheckItemStatus) {
    if (!currentItem) return;
    setItems((current) => ({ ...current, [currentItem.key]: { ...current[currentItem.key], status } }));
    setError('');
    if (status === 'ok') {
      window.setTimeout(() => setStep((currentStep) => Math.min(currentStep + 1, TRUCK_CHECK_ITEMS.length)), 220);
    }
  }

  function continueFromIssue() {
    if (!currentItem || !currentState?.status) return;
    if ((currentState.status === 'minor' || currentState.status === 'red_flag') && !currentState.comment.trim() && !photoName) {
      setError('Legg til en kort beskrivelse av avviket før du går videre.');
      return;
    }
    setError('');
    setStep((currentStep) => Math.min(currentStep + 1, TRUCK_CHECK_ITEMS.length));
  }

  function updateComment(comment: string) {
    if (!currentItem) return;
    setItems((current) => ({ ...current, [currentItem.key]: { ...current[currentItem.key], comment } }));
  }

  async function save() {
    if (!truck || answeredCount !== TRUCK_CHECK_ITEMS.length) { setError('Svar på alle kontrollpunktene før innsending.'); return; }
    setSaving(true);
    setError('');
    try {
      const { data: check, error: checkError } = await supabase
        .from('truck_checks')
        .insert({
          truck_id: truck.id,
          truck_name: truck.name,
          inspector_id: profile?.id || session?.user.id || null,
          inspector_name: inspector.name,
          inspector_email: inspector.email,
          operating_hours: operatingHours ? Number(operatingHours) : null,
          status: 'completed',
          has_red_flag: redCount > 0,
          signature: inspector.name,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
      if (checkError || !check) throw checkError || new Error('Kunne ikke lagre kontrollen');

      const rows = TRUCK_CHECK_ITEMS.map((item) => ({
        truck_check_id: check.id,
        item_key: item.key,
        item_label: item.label,
        status: items[item.key].status || 'ok',
        comment: items[item.key].comment,
      }));
      const { error: itemsError } = await supabase.from('truck_check_items').insert(rows);
      if (itemsError) throw itemsError;

      if (redCount > 0) {
        const { error: truckError } = await supabase.from('trucks').update({ status: 'out_of_service' }).eq('id', truck.id);
        if (truckError) throw truckError;
        const { error: reportError } = await supabase.from('ruh_reports').insert({
          reporter_name: inspector.name,
          category: 'hazard',
          severity: 'high',
          location: truck.name,
          description: `Trucken er tatt ut av drift etter defekt i daglig kontroll. ${TRUCK_CHECK_ITEMS.filter((item) => items[item.key].status === 'red_flag').map((item) => `${item.label}: ${items[item.key].comment}`).join('; ')}`,
          action_taken: 'Truck satt ut av drift',
          status: 'open',
        });
        if (reportError) throw reportError;
      }
      onComplete(check.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre trucksjekken');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-10">
      <header className="bg-slate-950 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15" aria-label="Tilbake"><ArrowLeft className="h-5 w-5" /></button>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Daglig kontroll truck</p><h1 className="text-xl font-bold">10-stegs sikkerhetssjekk</h1></div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-slate-400"><span>{step < 0 ? 'Oppstart' : `Steg ${step + 1} av 10 (${Math.round(progress)}%)`}</span><span>{truck?.name || 'Velg truck'}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {error && <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {step < 0 && <section className="animate-fade-in"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Oppstart</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Velg truck</h2><p className="mt-2 text-sm leading-6 text-slate-500">Velg kjøretøyet du skal kontrollere. Driftstimer er valgfritt.</p></div><div className="space-y-3">{trucks.map((item) => <button key={item.id} onClick={() => selectTruck(item)} className={`group flex w-full items-center gap-4 rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${truck?.id === item.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><TruckIcon className="h-6 w-6" /></div><div className="flex-1"><p className="font-bold">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.code} · <span className={item.status === 'out_of_service' ? 'font-semibold text-red-600' : 'text-emerald-600'}>{item.status === 'out_of_service' ? 'Ut av drift' : 'Klar for kontroll'}</span></p></div>{truck?.id === item.id ? <CheckCircle2 className="h-5 w-5 text-cyan-600" /> : <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1" />}</button>)}</div>{trucks.length === 0 && <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">Ingen aktive trucker er tilgjengelige.</div>}<label className="mt-5 block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-bold text-slate-800">Driftstimer <span className="font-normal text-slate-400">(valgfritt)</span></span><input type="number" min="0" step="0.1" inputMode="decimal" value={operatingHours} onChange={(event) => setOperatingHours(event.target.value)} placeholder="F.eks. 1240,5" className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white" /></label><button onClick={startInspection} disabled={!truck} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Start kontroll <ChevronRight className="h-4 w-4" /></button></section>}

        {currentItem && <section className="animate-fade-in"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Kontrollpunkt {step + 1}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{currentItem.label}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Kontroller punktet fysisk før du velger status.</p></div><div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><CircleDot className="h-6 w-6" /></div><div><p className="text-sm font-bold text-slate-900">{truck?.name}</p><p className="text-xs text-slate-500">Velg én status for å gå videre</p></div></div><div className="space-y-3">{choices.map((choice) => { const Icon = choice.icon; const selected = currentState?.status === choice.value; return <button key={choice.value} onClick={() => chooseStatus(choice.value)} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${selected ? 'ring-2 ring-cyan-200' : ''} ${choice.className}`}><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80"><Icon className="h-6 w-6" /></div><div className="flex-1"><p className="font-bold">{choice.label}</p><p className="mt-0.5 text-sm opacity-75">{choice.description}</p></div>{selected && <CheckCircle2 className="h-5 w-5" />}</button>; })}</div>{currentState?.status && currentState.status !== 'ok' && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">Beskriv avviket</p><textarea value={currentState.comment} onChange={(event) => updateComment(event.target.value)} placeholder="Hva observerte du?" rows={4} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-cyan-400" /><label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600"><input type="file" accept="image/*" capture="environment" onChange={(event) => setPhotoName(event.target.files?.[0]?.name || '')} className="sr-only" /><span className="rounded-xl border border-slate-200 bg-white px-3 py-2">{photoName ? `Bilde valgt: ${photoName}` : 'Legg ved bilde (valgfritt)'}</span></label><button onClick={continueFromIssue} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white">Neste steg <ChevronRight className="h-4 w-4" /></button></div>}</div><div className="mt-5 flex justify-between"><button onClick={() => setStep((currentStep) => Math.max(currentStep - 1, 0))} disabled={step === 0} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> Forrige</button><span className="self-center text-xs font-semibold text-slate-400">{answeredCount} av {TRUCK_CHECK_ITEMS.length} besvart</span></div></section>}

        {isSummary && <section className="animate-fade-in"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Steg 10 av 10</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Oppsummering, status & Fullfør</h2><p className="mt-2 text-sm leading-6 text-slate-500">Se gjennom kontrollen før du godkjenner og sender inn.</p></div><div className={`rounded-3xl border p-5 ${redCount > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>{redCount > 0 ? <div className="flex items-start gap-3 text-red-800"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Trucken tas ut av drift</p><p className="mt-1 text-sm leading-6">{redCount} defekt(e) er registrert. Trucken kan ikke brukes før feilen er håndtert.</p></div></div> : <div className="flex items-start gap-3 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Kontroll klar for godkjenning</p><p className="mt-1 text-sm">Ingen defekter er registrert.</p></div></div>}</div><div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Inspeksjon utføres av</p><p className="mt-2 text-lg font-bold text-slate-900">{inspector.name}</p><p className="mt-1 text-sm text-slate-500">{inspector.email}</p><p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">Truck: <span className="font-semibold text-slate-900">{truck?.name}</span>{operatingHours && <span> · Driftstimer: <span className="font-semibold text-slate-900">{operatingHours}</span></span>}</p></div><div className="mt-4 space-y-2">{TRUCK_CHECK_ITEMS.map((item) => { const state = items[item.key]; const meta = choices.find((choice) => choice.value === state.status) || choices[0]; return <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><div className={`h-3 w-3 rounded-full ${state.status === 'red_flag' ? 'bg-red-500' : state.status === 'minor' ? 'bg-amber-500' : 'bg-emerald-500'}`} /><span className="flex-1 text-sm font-semibold text-slate-800">{item.label}</span><span className={`text-xs font-bold ${meta.value === 'red_flag' ? 'text-red-700' : meta.value === 'minor' ? 'text-amber-700' : 'text-emerald-700'}`}>{meta.label}</span></div>; })}</div><div className="mt-6 flex gap-3"><button onClick={() => setStep(TRUCK_CHECK_ITEMS.length - 1)} className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Tilbake</button><button onClick={save} disabled={saving} className="flex-[2] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-50">{saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Send inn og godkjenn'}</button></div></section>}
      </main>
    </div>
  );
}
