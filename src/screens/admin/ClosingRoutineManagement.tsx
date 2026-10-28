import { useCallback, useEffect, useState } from 'react';
import {
  Moon, Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check,
  ArrowUp, ArrowDown, Clock, CheckCircle2, ClipboardList,
} from 'lucide-react';
import {
  supabase, formatDate, formatDateTime, type ClosingRoutineTemplate,
  type ClosingRoutineTemplateItem, type ClosingRoutine,
} from '@/lib/supabase';
import { Card, Badge, Button, Modal, Spinner, EmptyState } from '@/components/ui';

type EditTemplate = {
  id?: string;
  name: string;
  scope: string;
  description: string;
  sort_order: number;
  active: boolean;
  items: { id?: string; item_key: string; item_label: string; sort_order: number }[];
};

export default function ClosingRoutineManagement() {
  const [templates, setTemplates] = useState<ClosingRoutineTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<Record<string, ClosingRoutineTemplateItem[]>>({});
  const [routines, setRoutines] = useState<ClosingRoutine[]>([]);
  const [editing, setEditing] = useState<EditTemplate | null>(null);
  const [tab, setTab] = useState<'templates' | 'logs'>('templates');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [tR, tiR, rR] = await Promise.all([
      supabase.from('closing_routine_templates').select('*').order('sort_order', { ascending: true }),
      supabase.from('closing_routine_template_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('closing_routines').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setTemplates((tR.data || []) as ClosingRoutineTemplate[]);
    const itemMap: Record<string, ClosingRoutineTemplateItem[]> = {};
    (tiR.data || []).forEach((item) => {
      const it = item as ClosingRoutineTemplateItem;
      if (!itemMap[it.template_id]) itemMap[it.template_id] = [];
      itemMap[it.template_id].push(it);
    });
    setTemplateItems(itemMap);
    setRoutines((rR.data || []) as ClosingRoutine[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing || !editing.name.trim()) {
      setError('Navn er påkrevd.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: editing.name.trim(),
        scope: editing.scope.trim(),
        description: editing.description.trim(),
        sort_order: editing.sort_order,
        active: editing.active,
      };
      let templateId = editing.id;
      if (editing.id) {
        const { error: e } = await supabase.from('closing_routine_templates').update(payload).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from('closing_routine_templates').insert(payload).select('id').maybeSingle();
        if (e || !data) throw e || new Error('Kunne ikke opprette mal');
        templateId = (data as { id: string }).id;
      }

      if (templateId) {
        const validItems = editing.items.filter((i) => i.item_label.trim());
        if (editing.id) {
          await supabase.from('closing_routine_template_items').delete().eq('template_id', templateId);
        }
        if (validItems.length > 0) {
          const { error: ie } = await supabase.from('closing_routine_template_items').insert(
            validItems.map((item, idx) => ({
              template_id: templateId,
              item_key: item.item_key.trim() || `punkt-${idx + 1}`,
              item_label: item.item_label.trim(),
              sort_order: idx + 1,
            }))
          );
          if (ie) throw ie;
        }
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre mal');
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: ClosingRoutineTemplate) {
    if (!window.confirm(`Slette malen "${t.name}"?`)) return;
    setBusy(true);
    const { error: e } = await supabase.from('closing_routine_templates').delete().eq('id', t.id);
    if (e) setError(e.message);
    else await load();
    setBusy(false);
  }

  async function toggleActive(t: ClosingRoutineTemplate) {
    const { error: e } = await supabase.from('closing_routine_templates').update({ active: !t.active }).eq('id', t.id);
    if (e) setError(e.message);
    else await load();
  }

  function newTemplate() {
    setEditing({
      name: '',
      scope: '',
      description: '',
      sort_order: templates.length + 1,
      active: true,
      items: [{ item_key: '', item_label: '', sort_order: 1 }],
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab switch */}
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
        <button
          onClick={() => setTab('templates')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'templates' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
        >
          Maler
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'logs' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
        >
          Logg & status
        </button>
      </div>

      {tab === 'templates' && (
        <>
          <Button variant="primary" className="w-full" onClick={newTemplate}>
            <Plus className="h-4 w-4" /> Ny stengerutine-mal
          </Button>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : templates.length === 0 ? (
            <EmptyState icon={<Moon className="h-10 w-10" />} title="Ingen maler ennå" subtitle="Opprett en mal for å definere sjekkpunkter for stengerutiner." />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => {
                const items = templateItems[t.id] || [];
                return (
                  <Card key={t.id} className="p-4" hover>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <Moon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-neutral-900">{t.name}</p>
                          {t.active ? <Badge tone="green">Aktiv</Badge> : <Badge tone="neutral">Inaktiv</Badge>}
                          {t.scope && <Badge tone="blue">{t.scope}</Badge>}
                        </div>
                        {t.description && <p className="mt-1 text-sm text-neutral-500">{t.description}</p>}
                        <p className="mt-1 text-xs text-neutral-400">{items.length} sjekkpunkter</p>
                        {items.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {items.slice(0, 4).map((item, idx) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs text-neutral-600">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-100 text-[10px] font-bold">{idx + 1}</span>
                                {item.item_label}
                              </div>
                            ))}
                            {items.length > 4 && <p className="text-xs text-neutral-400">+{items.length - 4} flere</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                      <button onClick={() => toggleActive(t)} className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200">
                        {t.active ? 'Deaktiver' : 'Aktiver'}
                      </button>
                      <button onClick={() => setEditing(toEdit(t, items))} className="rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100">
                        <Pencil className="h-3.5 w-3.5" /> Rediger
                      </button>
                      <button onClick={() => remove(t)} className="rounded-xl bg-error-50 px-3 py-2 text-xs font-semibold text-error-700 transition hover:bg-error-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : routines.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="Ingen rutiner gjennomført" subtitle="Gjennomførte stengerutiner vises her med status og signatur." />
          ) : (
            routines.map((r) => (
              <Card key={r.id} className="p-4" hover>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.status === 'completed' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                    {r.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-neutral-900">{r.inspector_name || 'Ukjent'}</p>
                      {r.status === 'completed' ? <Badge tone="green">Fullført</Badge> : <Badge tone="amber">Pågår</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      Opprettet {formatDateTime(r.created_at)}
                      {r.completed_at && ` · Fullført ${formatDateTime(r.completed_at)}`}
                    </p>
                    {r.signature && <p className="mt-1 text-xs text-neutral-500">Signatur: {r.signature}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Rediger mal' : 'Ny stengerutine-mal'} maxWidth="max-w-lg">
          <div className="space-y-4">
            <Field label="Navn">
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="f.eks. Hovedlager stengerutine"
                className="input-field"
              />
            </Field>
            <Field label="Område / utstyr (valgfritt)">
              <input
                value={editing.scope}
                onChange={(e) => setEditing({ ...editing, scope: e.target.value })}
                placeholder="f.eks. Hovedlager"
                className="input-field"
              />
            </Field>
            <Field label="Beskrivelse (valgfritt)">
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className="input-field resize-none"
              />
            </Field>

            {/* Items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-700">Sjekkpunkter</p>
                <button
                  onClick={() => setEditing({ ...editing, items: [...editing.items, { item_key: '', item_label: '', sort_order: editing.items.length + 1 }] })}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Legg til punkt
                </button>
              </div>
              <div className="space-y-2">
                {editing.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500">{idx + 1}</span>
                    <input
                      value={item.item_label}
                      onChange={(e) => {
                        const items = [...editing.items];
                        items[idx] = { ...item, item_label: e.target.value };
                        setEditing({ ...editing, items });
                      }}
                      placeholder="Beskrivelse av sjekkpunkt"
                      className="input-field flex-1"
                    />
                    {editing.items.length > 1 && (
                      <button
                        onClick={() => setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-50 text-error-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editing.id ? 'Lagre endringer' : 'Opprett mal'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function toEdit(t: ClosingRoutineTemplate, items: ClosingRoutineTemplateItem[]): EditTemplate {
  return {
    id: t.id,
    name: t.name,
    scope: t.scope,
    description: t.description,
    sort_order: t.sort_order,
    active: t.active,
    items: items.map((i) => ({ id: i.id, item_key: i.item_key, item_label: i.item_label, sort_order: i.sort_order })),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-500">{label}</label>
      {children}
    </div>
  );
}
