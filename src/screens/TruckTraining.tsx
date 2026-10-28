import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap,
  Loader2, ShieldCheck, Truck as TruckIcon, User as UserIcon, X,
} from 'lucide-react';
import {
  fetchTrucks, supabase, TRUCK_TRAINING_ITEMS,
  type Profile, type Truck,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Props = { onBack: () => void; onComplete: (id: string) => void };

type ItemState = { checked: boolean; note: string };

const TRUCK_CLASSES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

export default function TruckTraining({ onBack, onComplete }: Props) {
  const { profile, session } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [employee, setEmployee] = useState<Profile | null>(null);
  const [step, setStep] = useState(-1);
  const [items, setItems] = useState<Record<string, ItemState>>({});
  const [employeeSig, setEmployeeSig] = useState('');
  const [instructorSig, setInstructorSig] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const instructorName = profile?.full_name?.trim() || session?.user.email || 'Innlogget instruktør';
  const instructorEmail = profile?.email || session?.user.email || '';

  const currentItem = step >= 0 && step < TRUCK_TRAINING_ITEMS.length ? TRUCK_TRAINING_ITEMS[step] : null;
  const currentState = currentItem ? items[currentItem.key] : null;
  const checkedCount = useMemo(() => Object.values(items).filter((i) => i.checked).length, [items]);
  const isSummary = step === TRUCK_TRAINING_ITEMS.length;
  const progress = isSummary ? 100 : step < 0 ? 0 : ((step + 1) / 10) * 100;

  useEffect(() => {
    Promise.all([
      fetchTrucks(true),
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('full_name', { ascending: true }),
    ])
      .then(([truckData, empResult]) => {
        setTrucks(truckData);
        setEmployees((empResult.data || []) as Profile[]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Kunne ikke laste data'))
      .finally(() => setLoading(false));
  }, []);

  function selectTruck(selected: Truck) {
    setTruck(selected);
    setError('');
  }

  function selectEmployee(selected: Profile) {
    setEmployee(selected);
    setError('');
  }

  function startTraining() {
    if (!truck) { setError('Velg truck før du starter opplæringen.'); return; }
    if (!employee) { setError('Velg ansatt før du starter opplæringen.'); return; }
    const initial: Record<string, ItemState> = {};
    TRUCK_TRAINING_ITEMS.forEach((item) => { initial[item.key] = { checked: false, note: '' }; });
    setItems(initial);
    setError('');
    setStep(0);
  }

  function toggleChecked(checked: boolean) {
    if (!currentItem) return;
    setItems((cur) => ({ ...cur, [currentItem.key]: { ...cur[currentItem.key], checked } }));
    setError('');
  }

  function updateNote(note: string) {
    if (!currentItem) return;
    setItems((cur) => ({ ...cur, [currentItem.key]: { ...cur[currentItem.key], note } }));
  }

  function nextStep() {
    if (!currentItem || !currentState) return;
    if (!currentState.checked && !currentState.note.trim()) {
      setError('Marker punktet som gjennomgått eller legg til en merknad.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, TRUCK_TRAINING_ITEMS.length));
  }

  async function save() {
    if (!truck || !employee) { setError('Truck og ansatt må velges.'); return; }
    if (checkedCount !== TRUCK_TRAINING_ITEMS.length) { setError('Alle 10 punkter må være gjennomgått før innsending.'); return; }
    if (!employeeSig.trim()) { setError('Ansatt må signere (skriv inn fullt navn).'); return; }
    if (!instructorSig.trim()) { setError('Instruktør må signere (skriv inn fullt navn).'); return; }
    setSaving(true);
    setError('');
    try {
      const { data: training, error: trainingError } = await supabase
        .from('truck_trainings')
        .insert({
          truck_id: truck.id,
          truck_name: truck.name,
          truck_brand: truck.brand,
          truck_model: truck.model,
          truck_serial_no: truck.serial_no,
          truck_class: truck.truck_class,
          truck_type: truck.truck_type,
          employee_id: employee.id,
          employee_name: employee.full_name || employee.email,
          instructor_id: profile?.id || session?.user.id || null,
          instructor_name: instructorName,
          instructor_email: instructorEmail,
          completed_date: completedDate,
          employee_signature: employeeSig.trim(),
          instructor_signature: instructorSig.trim(),
          status: 'completed',
        })
        .select('id')
        .maybeSingle();
      if (trainingError || !training) throw trainingError || new Error('Kunne ikke lagre opplæringen');

      const rows = TRUCK_TRAINING_ITEMS.map((item) => ({
        truck_training_id: training.id,
        item_key: item.key,
        item_label: item.label,
        checked: items[item.key].checked,
        note: items[item.key].note,
      }));
      const { error: itemsError } = await supabase.from('truck_training_items').insert(rows);
      if (itemsError) throw itemsError;

      onComplete(training.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre opplæringen');
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Typeopplæring Truck</p>
              <h1 className="text-xl font-bold">Utstyrsspesifikk opplæring jf. § 10-4</h1>
            </div>
          </div>
          {step >= 0 && (
            <>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                <span>{isSummary ? 'Oppsummering' : `Steg ${step + 1} av 10 (${Math.round(progress)}%)`}</span>
                <span>{truck?.name || ''}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {error && <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><X className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {step < 0 && (
          <section className="animate-fade-in">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Oppstart</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Velg ansatt og truck</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Velg truckføreren som skal opplæres og hvilken truck opplæringen gjelder for.</p>
            </div>

            {/* Employee selection */}
            <div className="mb-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><UserIcon className="h-4 w-4 text-cyan-600" /> Velg ansatt (Truckfører)</p>
              <div className="space-y-2.5">
                {employees.length === 0 && <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500">Ingen ansatte funnet.</div>}
                {employees.map((emp) => (
                  <button key={emp.id} onClick={() => selectEmployee(emp)} className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${employee?.id === emp.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><UserIcon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{emp.full_name || 'Uten navn'}</p><p className="text-xs text-slate-500 truncate">{emp.email}</p></div>
                    {employee?.id === emp.id && <CheckCircle2 className="h-5 w-5 text-cyan-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Truck selection */}
            <div className="mb-5">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><TruckIcon className="h-4 w-4 text-cyan-600" /> Velg truck</p>
              <div className="space-y-2.5">
                {trucks.length === 0 && <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500">Ingen aktive trucker er tilgjengelige.</div>}
                {trucks.map((t) => (
                  <button key={t.id} onClick={() => selectTruck(t)} className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${truck?.id === t.id ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><TruckIcon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.brand && `${t.brand} `}
                        {t.model && `${t.model} `}
                        {t.truck_class && `· ${t.truck_class}`}
                        {t.serial_no && ` · SN: ${t.serial_no}`}
                      </p>
                    </div>
                    {truck?.id === t.id && <CheckCircle2 className="h-5 w-5 text-cyan-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Truck details preview */}
            {truck && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Truckdetaljer</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Merke" value={truck.brand} />
                  <Detail label="Modell" value={truck.model} />
                  <Detail label="Type" value={truck.truck_type} />
                  <Detail label="Klasse" value={truck.truck_class} />
                  <Detail label="Serienr." value={truck.serial_no} />
                  <Detail label="Kode" value={truck.code} />
                </div>
              </div>
            )}

            <button onClick={startTraining} disabled={!truck || !employee} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
              Start opplæring <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {currentItem && currentState && (
          <section className="animate-fade-in">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Punkt {step + 1}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">{currentItem.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Gå gjennom punktet med den ansatte. Marker som gjennomgått når det er utført.</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><GraduationCap className="h-6 w-6" /></div>
                <div><p className="text-sm font-bold text-slate-900">{truck?.name}</p><p className="text-xs text-slate-500">{employee?.full_name || employee?.email}</p></div>
              </div>

              <button
                onClick={() => toggleChecked(!currentState.checked)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.99] ${currentState.checked ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${currentState.checked ? 'bg-emerald-100' : 'bg-white'}`}>
                  {currentState.checked ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Check className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{currentState.checked ? 'Gjennomgått / Utført' : 'Marker som gjennomgått'}</p>
                  <p className="mt-0.5 text-sm text-slate-500">Trykk for å bekrefte at punktet er gjennomgått</p>
                </div>
              </button>

              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-slate-700">Merknad (valgfritt)</p>
                <textarea
                  value={currentState.note}
                  onChange={(e) => updateNote(e.target.value)}
                  placeholder="Legg til eventuelle merknader eller kommentarer..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <button onClick={nextStep} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-bold text-white">
                Neste steg <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> Forrige
              </button>
              <span className="self-center text-xs font-semibold text-slate-400">{checkedCount} av {TRUCK_TRAINING_ITEMS.length} gjennomgått</span>
            </div>
          </section>
        )}

        {isSummary && (
          <section className="animate-fade-in">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Steg 10 av 10</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Oppsummering & signering</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Gå gjennom og signer opplæringen. Begge parter må signere for å fullføre.</p>
            </div>

            {/* Status */}
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3 text-emerald-800">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Alle punkter gjennomgått</p>
                  <p className="mt-1 text-sm leading-6">{checkedCount} av {TRUCK_TRAINING_ITEMS.length} punkter er bekreftet gjennomgått.</p>
                </div>
              </div>
            </div>

            {/* Training details */}
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Opplæringsdetaljer</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Detail label="Ansatt" value={employee?.full_name || employee?.email || ''} />
                <Detail label="Instruktør" value={instructorName} />
                <Detail label="Truck" value={truck?.name || ''} />
                <Detail label="Merke / Modell" value={`${truck?.brand || ''} ${truck?.model || ''}`.trim() || '—'} />
                <Detail label="Klasse" value={truck?.truck_class || '—'} />
                <Detail label="Serienr." value={truck?.serial_no || '—'} />
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-bold text-slate-700">Fullføringsdato</span>
                <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
              </label>
            </div>

            {/* Checklist summary */}
            <div className="mt-4 space-y-2">
              {TRUCK_TRAINING_ITEMS.map((item) => {
                const state = items[item.key];
                return (
                  <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    {state?.checked ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-200" />}
                    <span className="flex-1 text-sm font-semibold text-slate-800">{item.label}</span>
                    {state?.note && <span className="text-xs text-slate-400 truncate max-w-32">{state.note}</span>}
                  </div>
                );
              })}
            </div>

            {/* Dual signatures */}
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-bold text-slate-800">Signaturer</p>
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">Ansatt signatur (fullt navn)</span>
                <input value={employeeSig} onChange={(e) => setEmployeeSig(e.target.value)} placeholder={employee?.full_name || 'Fullt navn'} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-slate-500">Instruktør signatur (fullt navn)</span>
                <input value={instructorSig} onChange={(e) => setInstructorSig(e.target.value)} placeholder={instructorName} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white" />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(TRUCK_TRAINING_ITEMS.length - 1)} className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200">Tilbake</button>
              <button onClick={save} disabled={saving} className="flex-[2] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 disabled:opacity-50">
                {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Send inn og godkjenn'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value || '—'}</p>
    </div>
  );
}
