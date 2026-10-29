import { useState, useEffect, type ReactNode } from 'react';
import {
  ArrowLeft, Users, Building2, ClipboardList, Truck, History,
  ShieldCheck, LayoutDashboard, GraduationCap, Moon, FileText,
  Loader2, AlertCircle, CircleAlert, CheckCircle2, Settings, Flame,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'stations'
  | 'checklist'
  | 'trucks'
  | 'truck-log'
  | 'training'
  | 'closing'
  | 'documents'
  | 'fire-rounds';

type Props = {
  onBack: () => void;
  children: (tab: AdminTab) => ReactNode;
  initialTab?: AdminTab;
};

type Overview = {
  userCount: number;
  truckCount: number;
  openIssues: number;
  truckChecksToday: number;
  pendingTrainings: number;
  approvedTrainings: number;
  documents: number;
  closingRoutinesToday: number;
  ruhOpen: number;
};

export default function AdminLayout({ onBack, children, initialTab = 'dashboard' }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ovLoading, setOvLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setOvLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [
        usersR, trucksR, issuesR, truckChecksR, trainingsR,
        docsR, closingR, ruhR,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('trucks').select('*', { count: 'exact', head: true }),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('truck_checks').select('completed_at', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('truck_trainings').select('approved', { count: 'exact' }),
        supabase.from('hms_documents').select('*', { count: 'exact', head: true }),
        supabase.from('closing_routines').select('created_at', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('ruh_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      const trainings = (trainingsR.data || []) as { approved: boolean }[];
      const truckChecksToday = (truckChecksR.data || []).filter(
        (c: { completed_at: string | null }) => c.completed_at && new Date(c.completed_at) >= today
      ).length;
      const closingToday = (closingR.data || []).filter(
        (c: { created_at: string | null }) => c.created_at && new Date(c.created_at) >= today
      ).length;

      setOverview({
        userCount: usersR.count || 0,
        truckCount: trucksR.count || 0,
        openIssues: (issuesR.count || 0) + (ruhR.count || 0),
        truckChecksToday,
        pendingTrainings: trainings.filter((t) => !t.approved).length,
        approvedTrainings: trainings.filter((t) => t.approved).length,
        documents: docsR.count || 0,
        closingRoutinesToday: closingToday,
        ruhOpen: ruhR.count || 0,
      });
      setOvLoading(false);
    }
    loadOverview();
  }, []);

  const tabs: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Oversikt', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'users', label: 'Brukere', icon: <Users className="h-4 w-4" /> },
    { id: 'stations', label: 'Brannposter', icon: <Building2 className="h-4 w-4" /> },
    { id: 'trucks', label: 'Trucker', icon: <Truck className="h-4 w-4" /> },
    { id: 'truck-log', label: 'Truck logg', icon: <History className="h-4 w-4" /> },
    { id: 'training', label: 'Typeopplæring', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'closing', label: 'Stengerutiner', icon: <Moon className="h-4 w-4" /> },
    { id: 'documents', label: 'Dokumenter', icon: <FileText className="h-4 w-4" /> },
    { id: 'fire-rounds', label: 'Brannvernrunder', icon: <Flame className="h-4 w-4" /> },
    { id: 'checklist', label: 'Sjekkliste', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-neutral-950 text-white">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-600/15 blur-[90px]" />
        </div>
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pt-7 pb-5 sm:px-8 sm:pt-9">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow-primary">
                <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-300">
                  Control Tower
                </p>
                <h1 className="font-display text-xl font-bold tracking-tight">Administrasjon</h1>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{profile?.full_name || 'Admin'}</p>
              <p className="text-xs text-neutral-400">{profile?.email}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-1 no-scrollbar backdrop-blur-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-300 hover:bg-white/5'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        {tab === 'dashboard' ? (
          <AdminDashboard overview={overview} loading={ovLoading} onNavigate={setTab} />
        ) : (
          children(tab)
        )}
      </main>
    </div>
  );
}

function AdminDashboard({
  overview,
  loading,
  onNavigate,
}: {
  overview: Overview | null;
  loading: boolean;
  onNavigate: (tab: AdminTab) => void;
}) {
  if (loading || !overview) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const stats: {
    tab: AdminTab;
    icon: ReactNode;
    value: number | string;
    label: string;
    tone: string;
  }[] = [
    { tab: 'truck-log', icon: <Truck className="h-5 w-5" />, value: overview.truckChecksToday, label: 'Truckkontroller i dag', tone: 'blue' },
    { tab: 'truck-log', icon: <CircleAlert className="h-5 w-5" />, value: overview.openIssues, label: 'Åpne avvik', tone: 'amber' },
    { tab: 'training', icon: <GraduationCap className="h-5 w-5" />, value: overview.pendingTrainings, label: 'Venter godkjenning', tone: 'red' },
    { tab: 'training', icon: <CheckCircle2 className="h-5 w-5" />, value: overview.approvedTrainings, label: 'Godkjente opplæringer', tone: 'green' },
    { tab: 'closing', icon: <Moon className="h-5 w-5" />, value: overview.closingRoutinesToday, label: 'Stengerutiner i dag', tone: 'blue' },
    { tab: 'documents', icon: <FileText className="h-5 w-5" />, value: overview.documents, label: 'HMS-dokumenter', tone: 'green' },
    { tab: 'users', icon: <Users className="h-5 w-5" />, value: overview.userCount, label: 'Brukere', tone: 'neutral' },
    { tab: 'trucks', icon: <Truck className="h-5 w-5" />, value: overview.truckCount, label: 'Trucker', tone: 'neutral' },
  ];

  const tones: Record<string, string> = {
    blue: 'bg-primary-50 text-primary-700',
    green: 'bg-success-50 text-success-700',
    amber: 'bg-warning-50 text-warning-700',
    red: 'bg-error-50 text-error-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-600/15 blur-[80px]" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-300">Ledelsesoversikt</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Sikkerhetsettersynelse</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
              Følg etterlevelse, godkjente opplæringer, åpne avvik og stengerutiner i sanntid.
            </p>
          </div>
          <Settings className="hidden h-10 w-10 text-primary-300 sm:block" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-in-stagger">
        {stats.map((stat, idx) => (
          <button
            key={idx}
            onClick={() => onNavigate(stat.tab)}
            className="group rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${tones[stat.tone]}`}>
              {stat.icon}
            </div>
            <p className="mt-3 text-2xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-xs text-neutral-400">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          onClick={() => onNavigate('fire-rounds')}
          icon={<Flame className="h-5 w-5" />}
          title="Brannvernrunder"
          desc="Oversikt over alle månedlige brannvernkontroller"
        />
        <QuickLink
          onClick={() => onNavigate('training')}
          icon={<GraduationCap className="h-5 w-5" />}
          title="Typeopplæring § 10-4"
          desc="Godkjenn og administrer truckførerkompetanse"
        />
        <QuickLink
          onClick={() => onNavigate('closing')}
          icon={<Moon className="h-5 w-5" />}
          title="Stengerutiner"
          desc="Opprett og overvåk stengerutine-maler"
        />
        <QuickLink
          onClick={() => onNavigate('documents')}
          icon={<FileText className="h-5 w-5" />}
          title="Dokumentbibliotek"
          desc="Last opp og organiser HMS-dokumenter"
        />
      </div>
    </div>
  );
}

function QuickLink({
  onClick,
  icon,
  title,
  desc,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-transform group-hover:scale-105">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold text-neutral-900">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-1" />
    </button>
  );
}
