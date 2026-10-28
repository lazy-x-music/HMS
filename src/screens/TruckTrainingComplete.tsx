import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2, ShieldCheck, Truck as TruckIcon } from 'lucide-react';
import { supabase, formatDate, type TruckTraining, type TruckTrainingItem } from '@/lib/supabase';

type Props = { id: string; onBack: () => void };

export default function TruckTrainingComplete({ id, onBack }: Props) {
  const [training, setTraining] = useState<TruckTraining | null>(null);
  const [items, setItems] = useState<TruckTrainingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('truck_trainings').select('*').eq('id', id).maybeSingle(),
      supabase.from('truck_training_items').select('*').eq('truck_training_id', id),
    ]).then(([t, i]) => {
      setTraining(t.data as TruckTraining | null);
      setItems((i.data || []) as TruckTrainingItem[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-10">
      <header className="bg-slate-950 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15" aria-label="Tilbake"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Opplæringsbevis</p>
            <h1 className="text-xl font-bold">Typeopplæring gjennomført</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {!training ? (
          <p className="text-center text-sm text-slate-500">Opplæringen ble ikke funnet.</p>
        ) : (
          <>
            {/* Success banner */}
            <div className="mb-5 flex items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-800">Opplæring godkjent</p>
                <p className="mt-0.5 text-sm text-emerald-700">Bevis lagret i systemet jf. § 10-4.</p>
              </div>
            </div>

            {/* Certificate card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-indigo-500 to-blue-700 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Typeopplæring Truck</p>
                    <p className="font-bold">§ 10-4 Utstyrsspesifikk opplæring</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Ansatt" value={training.employee_name} />
                  <Field label="Fullføringsdato" value={formatDate(training.completed_date)} />
                  <Field label="Instruktør" value={training.instructor_name} />
                  <Field label="Instruktør e-post" value={training.instructor_email} />
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><TruckIcon className="h-4 w-4 text-cyan-600" /> Truck</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Navn" value={training.truck_name} />
                    <Field label="Merke / Modell" value={`${training.truck_brand} ${training.truck_model}`.trim()} />
                    <Field label="Klasse" value={training.truck_class} />
                    <Field label="Serienr." value={training.truck_serial_no} />
                  </div>
                </div>

                {/* Checklist items */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-sm font-bold text-slate-700">Gjennomgåtte punkter</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        {item.checked ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-200" />}
                        <span className="flex-1 text-sm font-medium text-slate-700">{item.item_label}</span>
                        {item.note && <span className="text-xs text-slate-400 truncate max-w-32">{item.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ansatt signatur</p>
                    <p className="mt-1 font-bold text-slate-900">{training.employee_signature}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instruktør signatur</p>
                    <p className="mt-1 font-bold text-slate-900">{training.instructor_signature}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Beviset er lagret og vises i brukerens profil i admin-panelet.
            </div>

            <button onClick={onBack} className="mt-5 w-full rounded-2xl bg-slate-950 py-4 text-sm font-bold text-white transition hover:bg-slate-800">
              Tilbake til Hub
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value || '—'}</p>
    </div>
  );
}
