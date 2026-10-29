import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame, Loader2, AlertCircle, ChevronRight, CheckCircle2,
  Clock, XCircle, MapPin, ScanLine, Camera, Building2, Calendar,
  User, Filter, Search,
} from 'lucide-react';
import {
  supabase, formatMonthYear, formatDateTime, STATUS_META,
  type Inspection, type InspectionItem, type Issue, type InspectionStation,
} from '@/lib/supabase';
import { Button, Modal } from '@/components/ui';

type RoundWithDetails = Inspection & {
  items: InspectionItem[];
  issues: Issue[];
  stations: InspectionStation[];
  redCount: number;
  yellowCount: number;
  greenCount: number;
  naCount: number;
};

export default function FireRoundsManagement() {
  const [rounds, setRounds] = useState<RoundWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RoundWithDetails | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'has_issues' | 'completed'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: insps }, { data: items }, { data: issues }, { data: stations }] = await Promise.all([
        supabase.from('inspections').select('*').order('created_at', { ascending: false }),
        supabase.from('inspection_items').select('*'),
        supabase.from('issues').select('*'),
        supabase.from('inspection_stations').select('*'),
      ]);

      const inspList = (insps || []) as Inspection[];
      const itemList = (items || []) as InspectionItem[];
      const issueList = (issues || []) as Issue[];
      const stationList = (stations || []) as InspectionStation[];

      const detailed: RoundWithDetails[] = inspList.map((insp) => {
        const its = itemList.filter((i) => i.inspection_id === insp.id);
        const iss = issueList.filter((i) => i.inspection_id === insp.id);
        const sts = stationList.filter((s) => s.inspection_id === insp.id);
        return {
          ...insp,
          items: its,
          issues: iss,
          stations: sts,
          redCount: its.filter((i) => i.status === 'tiltak_nodvendig').length,
          yellowCount: its.filter((i) => i.status === 'tiltak_vurderes').length,
          greenCount: its.filter((i) => i.status === 'tilfredsstillende').length,
          naCount: its.filter((i) => i.status === 'ikke_relevant').length,
        };
      });

      setRounds(detailed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste brannvernrunder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = rounds;
    if (filter === 'has_issues') result = result.filter((r) => r.redCount > 0 || r.issues.some((i) => i.status === 'open'));
    if (filter === 'completed') result = result.filter((r) => r.status === 'completed');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) =>
        r.inspector_name?.toLowerCase().includes(q) ||
        formatMonthYear(r.period_month, r.period_year).toLowerCase().includes(q),
      );
    }
    return result;
  }, [rounds, filter, search]);

  // Compliance: check if current month is done
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthRound = rounds.find((r) => r.period_month === currentMonth && r.period_year === currentYear);
  const currentMonthDone = currentMonthRound?.status === 'completed';
  const overdue = !currentMonthDone && now.getDate() >= 1;

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compliance status banner */}
      <div className={`rounded-2xl border p-5 shadow-card ${overdue ? 'border-accent-200 bg-accent-50' : currentMonthDone ? 'border-success-200 bg-success-50' : 'border-neutral-200 bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${overdue ? 'bg-accent-100 text-accent-700' : currentMonthDone ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-700'}`}>
            {overdue ? <AlertCircle className="h-6 w-6" /> : currentMonthDone ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-neutral-900">
              {overdue
                ? `Brannvernrunde for ${formatMonthYear(currentMonth, currentYear)} mangler`
                : currentMonthDone
                ? `Brannvernrunde for ${formatMonthYear(currentMonth, currentYear)} er fullført`
                : `Brannvernrunde for ${formatMonthYear(currentMonth, currentYear)} pågår`}
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">
              {overdue
                ? 'Skal gjøres den 1. hver måned. En ansatt må starte runden.'
                : currentMonthDone && currentMonthRound
                ? `Fullført ${formatDateTime(currentMonthRound.completed_at)} av ${currentMonthRound.inspector_name}`
                : 'Venter på at en inspektør starter runden.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <Flame className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{rounds.length}</p>
          <p className="text-xs text-neutral-400">Totalt runder</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{rounds.filter((r) => r.status === 'completed').length}</p>
          <p className="text-xs text-neutral-400">Fullførte</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-50 text-error-700">
            <XCircle className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{rounds.reduce((sum, r) => sum + r.redCount, 0)}</p>
          <p className="text-xs text-neutral-400">Tiltak nødvendig</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50 text-warning-700">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-neutral-900">{rounds.reduce((sum, r) => sum + r.issues.filter((i) => i.status === 'open').length, 0)}</p>
          <p className="text-xs text-neutral-400">Åpne avvik</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {([
            { id: 'all', label: 'Alle' },
            { id: 'has_issues', label: 'Med avvik' },
            { id: 'completed', label: 'Fullførte' },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filter === f.id
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk etter inspektør eller måned..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-400"
          />
        </div>
      </div>

      {/* Rounds list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Flame className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
          <p className="font-semibold text-neutral-600">Ingen brannvernrunder funnet</p>
          <p className="mt-1 text-sm text-neutral-400">Når inspektører gjennomfører runder, vises de her.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((round) => (
            <button
              key={round.id}
              onClick={() => setSelected(round)}
              className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${round.status === 'completed' ? 'bg-success-50 text-success-600' : 'bg-neutral-100 text-neutral-500'}`}>
                {round.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-900">{formatMonthYear(round.period_month, round.period_year)}</p>
                <p className="mt-0.5 truncate text-sm text-neutral-500">
                  {round.inspector_name} · {formatDateTime(round.completed_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {round.greenCount > 0 && (
                    <span className="rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-bold text-success-700">{round.greenCount} OK</span>
                  )}
                  {round.yellowCount > 0 && (
                    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-bold text-warning-700">{round.yellowCount} vurderes</span>
                  )}
                  {round.redCount > 0 && (
                    <span className="rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-bold text-error-700">{round.redCount} tiltak</span>
                  )}
                  {round.issues.some((i) => i.status === 'open') && (
                    <span className="rounded-full bg-error-100 px-2 py-0.5 text-[10px] font-bold text-error-800">Åpne avvik</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-neutral-300" />
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? formatMonthYear(selected.period_month, selected.period_year) : ''} maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="flex flex-wrap gap-4 rounded-xl bg-neutral-50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-500">Fullført:</span>
                <span className="font-semibold text-neutral-900">{formatDateTime(selected.completed_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-500">Inspektør:</span>
                <span className="font-semibold text-neutral-900">{selected.inspector_name || '—'}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-2">
              <SummaryPill count={selected.greenCount} label="OK" cls="bg-success-50 text-success-700" />
              <SummaryPill count={selected.yellowCount} label="Vurderes" cls="bg-warning-50 text-warning-700" />
              <SummaryPill count={selected.redCount} label="Tiltak" cls="bg-error-50 text-error-700" />
              <SummaryPill count={selected.naCount} label="N/A" cls="bg-neutral-100 text-neutral-600" />
            </div>

            {/* Stations */}
            {selected.stations.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Brannposter ({selected.stations.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {selected.stations.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 rounded-xl bg-neutral-50 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-50">
                        {st.checked_method === 'scanned' ? <ScanLine className="h-4 w-4 text-success-600" /> : <MapPin className="h-4 w-4 text-neutral-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-neutral-900">{st.station_name}</p>
                        {st.skip_reason ? (
                          <p className="truncate text-[10px] text-warning-600">{st.skip_reason}</p>
                        ) : (
                          <p className="text-[10px] text-neutral-400">{st.checked_method === 'scanned' ? 'Skannet' : 'Manuell'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist items */}
            {selected.items.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Kontrollpunkter ({selected.items.length})</p>
                <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {selected.items
                    .slice()
                    .sort((a, b) => a.item_key.localeCompare(b.item_key))
                    .map((item) => {
                      const meta = STATUS_META[item.status];
                      const hasIssue = selected.issues.some((iss) => iss.item_key === item.item_key && iss.status === 'open');
                      return (
                        <div key={item.id} className={`rounded-xl border-l-4 bg-white p-3.5 shadow-sm ${meta.border.replace('border-', 'border-l-')}`}>
                          <div className="flex items-start gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                              <span className="text-[11px] font-bold text-neutral-700">{item.item_key}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug text-neutral-900">{item.item_label}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.color}`}>
                                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                                {hasIssue && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-error-100 px-2 py-0.5 text-[10px] font-semibold text-error-700">
                                    <AlertCircle className="h-2.5 w-2.5" /> Åpent avvik
                                  </span>
                                )}
                              </div>
                              {item.comment && (
                                <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{item.comment}</p>
                              )}
                              {item.photo_url && (
                                <button onClick={() => setPhotoModal(item.photo_url)} className="mt-2 inline-block">
                                  <img src={item.photo_url} alt="Bevis" className="h-16 w-16 rounded-lg object-cover" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {selected.items.length === 0 && selected.stations.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center">
                <p className="text-sm text-neutral-400">Ingen detaljer registrert for denne runden.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Photo viewer */}
      {photoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-5" onClick={() => setPhotoModal(null)}>
          <img src={photoModal} alt="Bevis" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function SummaryPill({ count, label, cls }: { count: number; label: string; cls: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${cls}`}>
      <p className="text-xl font-bold">{count}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  );
}
