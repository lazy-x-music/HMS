import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Moon, Signature, Loader2, AlertCircle } from 'lucide-react';
import { supabase, type ClosingRoutineTemplate, type ClosingRoutineTemplateItem } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

type Props = { onBack: () => void; onComplete: (id: string) => void };

export default function ClosingRoutine({ onBack, onComplete }: Props) {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<ClosingRoutineTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<Record<string, ClosingRoutineTemplateItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ClosingRoutineTemplate | null>(null);
  const [items, setItems] = useState<ClosingRoutineTemplateItem[]>([]);
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: tData }, { data: iData }] = await Promise.all([
      supabase.from('closing_routine_templates').select('*').eq('active', true).order('sort_order', { ascending: true }),
      supabase.from('closing_routine_template_items').select('*').order('sort_order', { ascending: true }),
    ]);
    const tList = (tData || []) as ClosingRoutineTemplate[];
    setTemplates(tList);
    const itemMap: Record<string, ClosingRoutineTemplateItem[]> = {};
    for (const it of (iData || []) as ClosingRoutineTemplateItem[]) {
      if (!itemMap[it.template_id]) itemMap[it.template_id] = [];
      itemMap[it.template_id].push(it);
    }
    setTemplateItems(itemMap);

    // If only one active template, auto-select it
    if (tList.length === 1) {
      const first = tList[0];
      setSelectedTemplate(first);
      setItems(itemMap[first.id] || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function chooseTemplate(t: ClosingRoutineTemplate) {
    setSelectedTemplate(t);
    setItems(templateItems[t.id] || []);
    setChecked({});
    setStep(1);
  }

  const allDone = items.length > 0 && items.every((item) => checked[item.id]);

  async function save() {
    if (!signature.trim()) {
      setError('Legg inn signatur.');
      return;
    }
    if (!selectedTemplate) {
      setError('Velg en stengerutine-mal.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('closing_routines')
        .insert({
          inspector_name: profile?.full_name || '',
          inspector_id: profile?.id || null,
          template_id: selectedTemplate.id,
          status: 'completed',
          signature: signature.trim(),
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (err || !data) {
        setError(err?.message || 'Kunne ikke lagre');
        setBusy(false);
        return;
      }

      const { error: itemErr } = await supabase.from('closing_routine_items').insert(
        items.map((item) => ({
          closing_routine_id: data.id,
          template_item_id: item.id,
          item_key: item.item_key,
          item_label: item.item_label,
          status: 'ok',
          comment: '',
        }))
      );

      if (itemErr) {
        setError(itemErr.message);
        setBusy(false);
        return;
      }
      onComplete(data.id);
    } catch {
      setError('Kunne ikke lagre stengerutine');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-neutral-900 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">Daglig rutine</p>
                <h1 className="text-xl font-bold">Kvelds- & stengerutiner</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-10">
      <header className="bg-neutral-900 px-5 pb-6 pt-7 text-white sm:px-8 sm:pt-9">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">Daglig rutine</p>
              <h1 className="text-xl font-bold">Kvelds- & stengerutiner</h1>
            </div>
          </div>
          {selectedTemplate && step === 1 && (
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary-400 transition-all duration-500"
                style={{ width: `${(Object.keys(checked).length / items.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Template selection (only if multiple templates and none selected) */}
        {!selectedTemplate && (
          <>
            {templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                <Moon className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
                <p className="font-semibold text-neutral-600">Ingen aktive stengerutine-maler</p>
                <p className="mt-1 text-sm text-neutral-400">En administrator må opprette en mal først i Control Tower.</p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Velg rutine</p>
                  <h2 className="mt-1 text-2xl font-bold text-neutral-900">Hvilken rutine skal du gjennomføre?</h2>
                </div>
                <div className="space-y-3">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => chooseTemplate(t)}
                      className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <Moon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-neutral-900">{t.name}</p>
                        {t.scope && <p className="mt-0.5 text-sm text-neutral-500">{t.scope}</p>}
                        {t.description && <p className="mt-1 text-xs text-neutral-400">{t.description}</p>}
                        <p className="mt-1 text-xs text-neutral-400">{(templateItems[t.id] || []).length} sjekkpunkter</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-neutral-300" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Checklist step */}
        {selectedTemplate && step === 1 && (
          <>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Steg 1 av 2</p>
                <h2 className="mt-1 text-2xl font-bold text-neutral-900">{selectedTemplate.name}</h2>
                {selectedTemplate.scope && <p className="mt-1 text-sm text-neutral-500">{selectedTemplate.scope}</p>}
              </div>
              {templates.length > 1 && (
                <button onClick={() => { setSelectedTemplate(null); setItems([]); setChecked({}); }} className="text-xs font-semibold text-primary-700">
                  Bytt rutine
                </button>
              )}
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
                  <p className="text-sm text-neutral-400">Denne malen har ingen sjekkpunkter ennå.</p>
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setChecked({ ...checked, [item.id]: !checked[item.id] })}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-5 text-left transition ${
                      checked[item.id] ? 'border-success-200 bg-success-50' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                      checked[item.id] ? 'bg-success-500 text-white' : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      {checked[item.id] ? <Check className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </div>
                    <span className="flex-1 font-semibold text-neutral-900">{item.item_label}</span>
                    {checked[item.id] && <CheckCircle2 className="h-5 w-5 text-success-600" />}
                  </button>
                ))
              )}
            </div>

            <Button
              variant="dark"
              className="mt-5 w-full"
              disabled={!allDone}
              onClick={() => setStep(2)}
            >
              Gå til signering <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Signature step */}
        {selectedTemplate && step === 2 && (
          <>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Steg 2 av 2</p>
              <h2 className="mt-1 text-2xl font-bold text-neutral-900">Bekreft & signer</h2>
            </div>

            <div className="rounded-2xl border border-success-200 bg-success-50 p-5 text-success-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" />
                <p className="font-bold">Alle {items.length} punkter er bekreftet</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <Signature className="h-5 w-5 text-neutral-600" />
                <p className="font-bold text-neutral-900">Digital signatur</p>
              </div>
              <input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Fullt navn"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:bg-white"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Tilbake</Button>
              <Button variant="primary" className="flex-[2]" disabled={busy} onClick={save}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Send inn rutine
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
