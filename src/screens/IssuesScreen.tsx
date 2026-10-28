import { useEffect, useState } from 'react';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, ChevronRight, Loader2,
  Calendar, User, ImageOff, MapPin, TriangleAlert,
} from 'lucide-react';
import { supabase, formatDateTime, type Issue, type Inspection, type RuhReport } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Tab = 'dashboard' | 'history' | 'issues';

type Props = {
  onBack: () => void;
  onNavigate: (tab: Tab) => void;
  onViewInspection: (id: string) => void;
};

type CombinedIssue =
  | { kind: 'issue'; data: Issue }
  | { kind: 'ruh'; data: RuhReport };

export default function IssuesScreen({ onBack, onNavigate, onViewInspection }: Props) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ruhReports, setRuhReports] = useState<RuhReport[]>([]);
  const [inspMap, setInspMap] = useState<Record<string, Inspection>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: iss }, { data: ruhs }, { data: insps }] = await Promise.all([
      supabase.from('issues').select('*').order('created_at', { ascending: false }),
      supabase.from('ruh_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('inspections').select('*'),
    ]);
    setIssues((iss || []) as Issue[]);
    setRuhReports((ruhs || []) as RuhReport[]);
    const map: Record<string, Inspection> = {};
    for (const i of (insps || []) as Inspection[]) map[i.id] = i;
    setInspMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolve(issue: Issue) {
    setBusyId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', issue.id);
    if (!error) {
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i)));
    }
    setBusyId(null);
  }

  async function reopen(issue: Issue) {
    setBusyId(issue.id);
    const { error } = await supabase
      .from('issues')
      .update({ status: 'open', resolved_at: null })
      .eq('id', issue.id);
    if (!error) {
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status: 'open', resolved_at: null } : i)));
    }
    setBusyId(null);
  }

  async function resolveRuh(report: RuhReport) {
    setBusyId(report.id);
    const { error } = await supabase
      .from('ruh_reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', report.id);
    if (!error) {
      setRuhReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r)));
    }
    setBusyId(null);
  }

  async function reopenRuh(report: RuhReport) {
    setBusyId(report.id);
    const { error } = await supabase
      .from('ruh_reports')
      .update({ status: 'open', resolved_at: null })
      .eq('id', report.id);
    if (!error) {
      setRuhReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: 'open', resolved_at: null } : r)));
    }
    setBusyId(null);
  }

  const ruhCategoryLabel: Record<string, string> = {
    near_miss: 'Nestenulykke',
    hazard: 'Farlig forhold',
    incident: 'Hendelse',
    unsafe_act: 'Usikker handling',
  };
  const ruhSeverityTone: Record<string, string> = {
    low: 'bg-neutral-100 text-neutral-600',
    medium: 'bg-warning-100 text-warning-700',
    high: 'bg-error-100 text-error-700',
  };

  const combined: CombinedIssue[] = [
    ...issues.map((i) => ({ kind: 'issue' as const, data: i })),
    ...ruhReports.map((r) => ({ kind: 'ruh' as const, data: r })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  const filtered = combined.filter((item) => {
    const status = item.data.status;
    return filter === 'all' || status === filter;
  });

  const openCount = combined.filter((i) => i.data.status === 'open').length;
  const resolvedCount = combined.filter((i) => i.data.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-neutral-900 px-5 pt-7 pb-6 text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-warning-300">Hendelse & sikkerhet</p>
              <h1 className="text-xl font-bold">Avvik</h1>
            </div>
          </div>

          <div className="flex gap-1 rounded-xl bg-white/10 p-1">
            {([
              { id: 'open', label: `Åpne (${openCount})` },
              { id: 'resolved', label: `Løste (${resolvedCount})` },
              { id: 'all', label: 'Alle' },
            ] as const).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  filter === f.id ? 'bg-white text-neutral-900' : 'text-neutral-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-5 sm:px-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success-300" />
            <p className="text-sm text-neutral-400">Ingen avvik å vise</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              if (item.kind === 'issue') {
                const issue = item.data;
                const insp = inspMap[issue.inspection_id];
                const isOpen = issue.status === 'open';
                return (
                  <div
                    key={issue.id}
                    className={`rounded-2xl border border-neutral-200 border-l-4 bg-white p-4 shadow-card ${
                      isOpen ? 'border-l-error-500' : 'border-l-success-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOpen ? 'bg-error-50' : 'bg-success-50'}`}>
                        <AlertTriangle className={`h-5 w-5 ${isOpen ? 'text-error-500' : 'text-success-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-400">{issue.item_key}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOpen ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'}`}>
                            {isOpen ? 'ÅPEN' : 'LØST'}
                          </span>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                            Brannvern
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-neutral-900">{issue.item_label}</p>
                        {issue.comment && <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{issue.comment}</p>}
                        {issue.photo_url && (
                          <button onClick={() => setPhotoModal(issue.photo_url)} className="mt-2 inline-block">
                            <img src={issue.photo_url} alt="Bevis" className="h-20 w-20 rounded-xl object-cover" />
                          </button>
                        )}
                        {insp && (
                          <div className="mt-2.5 space-y-1 text-xs text-neutral-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {insp.inspector_name}
                            </div>
                          </div>
                        )}
                        {insp && (
                          <button
                            onClick={() => onViewInspection(insp.id)}
                            className="mt-2 flex items-center gap-1 text-xs font-medium text-error-600"
                          >
                            Se inspeksjon <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => (isOpen ? resolve(issue) : reopen(issue))}
                            disabled={busyId === issue.id}
                            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
                              isOpen ? 'bg-success-50 text-success-700 hover:bg-success-100' : 'bg-warning-50 text-warning-700 hover:bg-warning-100'
                            }`}
                          >
                            {busyId === issue.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isOpen ? 'Merk som løst' : 'Gjenåpne avvik'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              const report = item.data;
              const isOpen = report.status === 'open';
              return (
                <div
                  key={report.id}
                  className={`rounded-2xl border border-neutral-200 border-l-4 bg-white p-4 shadow-card ${
                    isOpen ? 'border-l-warning-500' : 'border-l-success-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOpen ? 'bg-warning-50' : 'bg-success-50'}`}>
                      <TriangleAlert className={`h-5 w-5 ${isOpen ? 'text-warning-500' : 'text-success-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOpen ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'}`}>
                          {isOpen ? 'ÅPEN' : 'LØST'}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                          RUH
                        </span>
                        <span className="text-xs font-bold text-neutral-600">{ruhCategoryLabel[report.category] || report.category}</span>
                        {report.severity && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ruhSeverityTone[report.severity] || 'bg-neutral-100 text-neutral-600'}`}>
                            {report.severity === 'low' ? 'Lav' : report.severity === 'medium' ? 'Middels' : 'Høy'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{report.description}</p>
                      {report.location && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-400">
                          <MapPin className="h-3 w-3" /> {report.location}
                        </p>
                      )}
                      {report.reporter_name && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                          <User className="h-3 w-3" /> {report.reporter_name}
                          <span>· {formatDateTime(report.created_at)}</span>
                        </div>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => (isOpen ? resolveRuh(report) : reopenRuh(report))}
                          disabled={busyId === report.id}
                          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
                            isOpen ? 'bg-success-50 text-success-700 hover:bg-success-100' : 'bg-warning-50 text-warning-700 hover:bg-warning-100'
                          }`}
                        >
                          {busyId === report.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {isOpen ? 'Merk som løst' : 'Gjenåpne avvik'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button onClick={onBack} className="flex flex-col items-center gap-1 text-neutral-400">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Hub</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Avvik</span>
          </button>
          <button onClick={() => onNavigate('history')} className="flex flex-col items-center gap-1 text-neutral-400">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Historikk</span>
          </button>
        </div>
      </nav>

      {photoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
          onClick={() => setPhotoModal(null)}
        >
          <img src={photoModal} alt="Bevis" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
