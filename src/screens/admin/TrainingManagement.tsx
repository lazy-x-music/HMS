import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Loader2, AlertCircle, CheckCircle2, Clock, FileCheck,
  Search, Filter, ExternalLink, Upload, X, Award, User as UserIcon,
} from 'lucide-react';
import {
  supabase, formatDate, type Profile, type TruckTraining,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Badge, Button, Modal, Spinner, EmptyState } from '@/components/ui';

const TRUCK_CLASSES = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

export default function TrainingManagement() {
  const { profile: me } = useAuth();
  const [trainings, setTrainings] = useState<TruckTraining[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selected, setSelected] = useState<TruckTraining | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tR, uR] = await Promise.all([
      supabase.from('truck_trainings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, role, created_at').order('full_name', { ascending: true }),
    ]);
    setTrainings((tR.data || []) as TruckTraining[]);
    setUsers((uR.data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const userMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trainings.filter((t) => {
      if (filter === 'pending' && t.approved) return false;
      if (filter === 'approved' && !t.approved) return false;
      if (needle) {
        const hay = `${t.employee_name} ${t.truck_name} ${t.truck_class} ${t.instructor_name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [trainings, filter, query]);

  const pendingCount = trainings.filter((t) => !t.approved).length;
  const approvedCount = trainings.filter((t) => t.approved).length;

  async function approve(t: TruckTraining) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('truck_trainings')
      .update({
        approved: true,
        approved_by: me?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', t.id);
    if (err) setError(err.message);
    else await load();
    setBusy(false);
  }

  async function revoke(t: TruckTraining) {
    setBusy(true);
    setError('');
    const { error: err } = await supabase
      .from('truck_trainings')
      .update({
        approved: false,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', t.id);
    if (err) setError(err.message);
    else await load();
    setBusy(false);
  }

  async function uploadCertificate(t: TruckTraining, file: File) {
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${t.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('training-certificates')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('training-certificates').getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from('truck_trainings')
        .update({ certificate_url: urlData.publicUrl })
        .eq('id', t.id);
      if (dbErr) throw dbErr;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste opp sertifikat');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <GraduationCap className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{trainings.length}</p>
          <p className="text-xs text-neutral-400">Totalt opplæringer</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 text-warning-700">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{pendingCount}</p>
          <p className="text-xs text-neutral-400">Venter godkjenning</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{approvedCount}</p>
          <p className="text-xs text-neutral-400">Godkjente</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk ansatt, truck eller instruktør"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm">
            <Filter className="h-4 w-4 text-neutral-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'approved')}
              className="bg-transparent outline-none"
            >
              <option value="all">Alle</option>
              <option value="pending">Venter godkjenning</option>
              <option value="approved">Godkjente</option>
            </select>
          </div>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-10 w-10" />} title="Ingen opplæringer funnet" subtitle="Gjennomfør opplæring via employee-modulen for å se dem her." />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const employee = t.employee_id ? userMap[t.employee_id] : null;
            return (
              <Card key={t.id} className="p-4" hover>
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.approved ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-neutral-900">{t.employee_name}</p>
                      {t.truck_class && <Badge tone="blue">{t.truck_class}</Badge>}
                      {t.approved ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Godkjent</Badge> : <Badge tone="amber"><Clock className="h-3 w-3" /> Venter</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t.truck_name} · {t.truck_brand} {t.truck_model}
                      {t.truck_serial_no && ` · SN: ${t.truck_serial_no}`}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Fullført {formatDate(t.completed_date)} · Instruktør: {t.instructor_name}
                    </p>
                    {employee && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                        <UserIcon className="h-3 w-3" /> {employee.email}
                      </p>
                    )}
                    {t.certificate_url && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-700">
                        <FileCheck className="h-3 w-3" /> Sertifikat lagt ved
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                  {t.certificate_url ? (
                    <a
                      href={t.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Vis sertifikat
                    </a>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Laster opp...' : 'Last opp sertifikat'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadCertificate(t, f);
                        }}
                      />
                    </label>
                  )}
                  <button
                    onClick={() => setSelected(t)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    Detaljer
                  </button>
                  {t.approved ? (
                    <button
                      onClick={() => revoke(t)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-error-50 px-3 py-2 text-xs font-semibold text-error-700 transition hover:bg-error-100 disabled:opacity-50"
                    >
                      Trekk godkjenning
                    </button>
                  ) : (
                    <button
                      onClick={() => approve(t)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-success-700 disabled:opacity-50"
                    >
                      <Award className="h-3.5 w-3.5" /> Godkjenn
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Opplæringsdetaljer">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Ansatt" value={selected.employee_name} />
              <DetailRow label="Instruktør" value={selected.instructor_name} />
              <DetailRow label="Truck" value={selected.truck_name} />
              <DetailRow label="Merke / Modell" value={`${selected.truck_brand} ${selected.truck_model}`.trim() || '—'} />
              <DetailRow label="Klasse" value={selected.truck_class || '—'} />
              <DetailRow label="Serienr." value={selected.truck_serial_no || '—'} />
              <DetailRow label="Fullført" value={formatDate(selected.completed_date)} />
              <DetailRow label="Status" value={selected.approved ? 'Godkjent' : 'Venter godkjenning'} />
              <DetailRow label="Ansatt signatur" value={selected.employee_signature || '—'} />
              <DetailRow label="Instruktør signatur" value={selected.instructor_signature || '—'} />
            </div>
            {selected.certificate_url && (
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-500">Sertifikat</p>
                <a
                  href={selected.certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
                >
                  <ExternalLink className="h-4 w-4" /> Åpne sertifikat
                </a>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {selected.approved ? (
                <Button variant="danger" className="flex-1" onClick={() => { revoke(selected); setSelected(null); }}>Trekk godkjenning</Button>
              ) : (
                <Button variant="success" className="flex-1" onClick={() => { approve(selected); setSelected(null); }}>
                  <Award className="h-4 w-4" /> Godkjenn opplæring
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelected(null)}>Lukk</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-0.5 font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
