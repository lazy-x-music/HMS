import { useCallback, useEffect, useState } from 'react';
import {
  FileText, Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check,
  Upload, ExternalLink, Search, Download, File,
} from 'lucide-react';
import { supabase, type HmsDocument } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Modal, Spinner, EmptyState } from '@/components/ui';

const CATEGORIES: { value: HmsDocument['category']; label: string; tone: string }[] = [
  { value: 'procedure', label: 'Prosedyre', tone: 'blue' },
  { value: 'policy', label: 'Retningslinje', tone: 'amber' },
  { value: 'manual', label: 'Håndbok', tone: 'green' },
  { value: 'form', label: 'Skjema', tone: 'neutral' },
  { value: 'guideline', label: 'Veiledning', tone: 'blue' },
  { value: 'instruction', label: 'Instruks', tone: 'amber' },
  { value: 'report', label: 'Rapport', tone: 'neutral' },
];

const catLabel = (c: string): string => CATEGORIES.find((cat) => cat.value === c as HmsDocument['category'])?.label || c;
const catTone = (c: string): string => CATEGORIES.find((cat) => cat.value === c as HmsDocument['category'])?.tone || 'neutral';

type EditDoc = {
  id?: string;
  title: string;
  category: HmsDocument['category'];
  description: string;
  sort_order: number;
  active: boolean;
  file: File | null;
  existingUrl: string;
};

export default function DocumentLibrary() {
  const { profile: me } = useAuth();
  const [docs, setDocs] = useState<HmsDocument[]>([]);
  const [editing, setEditing] = useState<EditDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('hms_documents').select('*').order('sort_order', { ascending: true });
    if (e) setError(e.message);
    else setDocs((data || []) as HmsDocument[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = docs.filter((d) => {
    if (catFilter !== 'all' && d.category !== catFilter) return false;
    if (query) {
      const needle = query.toLowerCase();
      if (!`${d.title} ${d.description}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  async function save() {
    if (!editing || !editing.title.trim()) {
      setError('Tittel er påkrevd.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let fileUrl = editing.existingUrl;
      let fileName = '';
      let fileSize: number | null = null;
      let mimeType = '';

      if (editing.file) {
        setUploading(true);
        const file = editing.file;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
        const ext = file.name.split('.').pop() || 'pdf';
        const path = `${editing.id || crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('hms-documents').upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('hms-documents').getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        setUploading(false);
      }

      const payload = {
        title: editing.title.trim(),
        category: editing.category,
        description: editing.description.trim(),
        sort_order: editing.sort_order,
        active: editing.active,
        file_url: fileUrl,
        file_name: fileName || (editing.id ? (docs.find((d) => d.id === editing.id)?.file_name || '') : ''),
        file_size: fileSize,
        mime_type: mimeType || (editing.id ? (docs.find((d) => d.id === editing.id)?.mime_type || '') : ''),
        created_by: editing.id ? undefined : (me?.id || null),
      };

      if (editing.id) {
        const clean = { ...payload };
        delete (clean as { created_by?: unknown }).created_by;
        const { error: e } = await supabase.from('hms_documents').update(clean).eq('id', editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('hms_documents').insert(payload);
        if (e) throw e;
      }

      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lagre dokument');
      setUploading(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: HmsDocument) {
    if (!window.confirm(`Slette "${d.title}"?`)) return;
    setBusy(true);
    const { error: e } = await supabase.from('hms_documents').delete().eq('id', d.id);
    if (e) setError(e.message);
    else await load();
    setBusy(false);
  }

  async function toggleActive(d: HmsDocument) {
    const { error: e } = await supabase.from('hms_documents').update({ active: !d.active }).eq('id', d.id);
    if (e) setError(e.message);
    else await load();
  }

  function newDoc() {
    setEditing({
      title: '',
      category: 'procedure',
      description: '',
      sort_order: docs.length + 1,
      active: true,
      file: null,
      existingUrl: '',
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

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-card">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk i dokumenter..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-card outline-none"
        >
          <option value="all">Alle kategorier</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <Button variant="primary" onClick={newDoc}>
          <Plus className="h-4 w-4" /> Nytt dokument
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText className="h-10 w-10" />} title="Ingen dokumenter funnet" subtitle="Last opp HMS-dokumenter, prosedyrer og manualer for å gjøre dem tilgjengelige for ansatte." />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="p-4" hover>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-neutral-900">{d.title}</p>
                    <Badge tone={catTone(d.category)}>{catLabel(d.category)}</Badge>
                    {!d.active && <Badge tone="neutral">Inaktiv</Badge>}
                  </div>
                  {d.description && <p className="mt-1 text-sm text-neutral-500">{d.description}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
                    {d.file_name || 'Ingen fil'} {d.file_size ? `· ${formatFileSize(d.file_size)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                {d.file_url && (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Åpne
                  </a>
                )}
                <button onClick={() => toggleActive(d)} className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200">
                  {d.active ? 'Deaktiver' : 'Aktiver'}
                </button>
                <button
                  onClick={() => setEditing({
                    id: d.id, title: d.title, category: d.category, description: d.description,
                    sort_order: d.sort_order, active: d.active, file: null, existingUrl: d.file_url,
                  })}
                  className="rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Rediger
                </button>
                <button onClick={() => remove(d)} className="rounded-xl bg-error-50 px-3 py-2 text-xs font-semibold text-error-700 transition hover:bg-error-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Rediger dokument' : 'Nytt HMS-dokument'} maxWidth="max-w-lg">
          <div className="space-y-4">
            <Field label="Tittel">
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="f.eks. Brannvern prosedyre 2026"
                className="input-field"
              />
            </Field>
            <Field label="Kategori">
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value as HmsDocument['category'] })}
                className="input-field"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Beskrivelse (valgfritt)">
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className="input-field resize-none"
              />
            </Field>
            <Field label="Fil (PDF, bilde eller dokument)">
              {editing.existingUrl && !editing.file && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  <File className="h-4 w-4" /> Eksisterende fil vil erstattes ved ny opplasting
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm font-semibold text-neutral-700 transition hover:border-primary-400 hover:bg-primary-50">
                <Upload className="h-5 w-5" />
                {editing.file ? editing.file.name : 'Velg fil...'}
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setEditing({ ...editing, file: f });
                  }}
                />
              </label>
            </Field>
            <Button variant="primary" className="w-full" onClick={save} disabled={busy || uploading}>
              {busy || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {uploading ? 'Laster opp...' : editing.id ? 'Lagre endringer' : 'Opprett dokument'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-neutral-500">{label}</label>
      {children}
    </div>
  );
}
