import { useEffect, useState } from 'react';
import {
  ShieldCheck, Settings, Flame, Truck, Moon,
  TriangleAlert, BookOpen, ChevronRight, CircleAlert, CheckCircle2,
  LogOut, GraduationCap, FileText, History, AlertCircle, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatMonthYear, type Inspection } from '@/lib/supabase';

type Tab = 'dashboard' | 'history' | 'issues';

type Props = {
  onNavigate: (tab: Tab) => void;
  onOpenModule: (module: ModuleId) => void;
  onOpenAdmin: () => void;
  issuesCount: number;
  completedToday: number;
};

export type ModuleId = 'fire' | 'truck' | 'clothing' | 'closing' | 'ruh' | 'handbook' | 'training';

type Module = {
  id: ModuleId;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Flame;
  gradient: string;
  iconBg: string;
  barTone: string;
  priority?: boolean;
};

const modules: Module[] = [
  {
    id: 'truck',
    title: 'Trucksjekk',
    subtitle: 'Daglig kontroll',
    description: '10-stegs sikkerhetssjekk av truck før bruk.',
    icon: Truck,
    gradient: 'from-primary-500 to-primary-700',
    iconBg: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-500',
    priority: true,
  },
  {
    id: 'fire',
    title: 'Brannvern & brannposter',
    subtitle: 'Månedlig kontroll',
    description: 'Sjekk alle brannposter og kontrollpunkter.',
    icon: Flame,
    gradient: 'from-accent-500 to-accent-700',
    iconBg: 'bg-accent-50 text-accent-700',
    barTone: 'bg-accent-500',
    priority: true,
  },
  {
    id: 'training',
    title: 'Typeopplæring Truck',
    subtitle: '§ 10-4 utstyrsspesifikk',
    description: 'Gjennomfør og signer utstyrsspesifikk opplæring.',
    icon: GraduationCap,
    gradient: 'from-primary-500 to-primary-700',
    iconBg: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-600',
  },
  {
    id: 'closing',
    title: 'Stengerutiner',
    subtitle: 'Daglig sjekkliste',
    description: 'Sikre lokaler og utstyr før dagen avsluttes.',
    icon: Moon,
    gradient: 'from-neutral-600 to-neutral-800',
    iconBg: 'bg-neutral-100 text-neutral-700',
    barTone: 'bg-neutral-700',
  },
  {
    id: 'ruh',
    title: 'Meld RUH / avvik',
    subtitle: 'Rask registrering',
    description: 'Meld fra om uønskede hendelser og farlige forhold.',
    icon: TriangleAlert,
    gradient: 'from-warning-500 to-warning-700',
    iconBg: 'bg-warning-50 text-warning-700',
    barTone: 'bg-warning-500',
  },
  {
    id: 'handbook',
    title: 'HMS-håndbok',
    subtitle: 'Dokumenter & prosedyrer',
    description: 'Finn rutiner, skjemaer og HMS-dokumentasjon.',
    icon: BookOpen,
    gradient: 'from-primary-500 to-primary-700',
    iconBg: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-500',
  },
];

export default function Hub({ onNavigate, onOpenModule, onOpenAdmin, issuesCount, completedToday }: Props) {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'bruker';
  const isAdmin = profile?.role === 'admin';

  const [fireStatus, setFireStatus] = useState<{ overdue: boolean; done: boolean; inspection: Inspection | null }>({
    overdue: false, done: false, inspection: null,
  });

  useEffect(() => {
    async function checkFireStatus() {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const { data } = await supabase
        .from('inspections')
        .select('*')
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear)
        .maybeSingle();
      const insp = data as Inspection | null;
      const done = insp?.status === 'completed';
      const overdue = !done && now.getDate() >= 1;
      setFireStatus({ overdue, done, inspection: insp });
    }
    checkFireStatus();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 text-neutral-900">
      {/* Header */}
      <header className="relative overflow-hidden bg-neutral-950 text-white">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-600/15 blur-[100px]" />
          <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-accent-600/10 blur-[100px]" />
        </div>
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-9 pt-7 sm:px-8 sm:pt-9">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow-primary">
                <ShieldCheck className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-300">Aksell</p>
                <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">HMS Portal</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 sm:flex"
                >
                  <Settings className="h-4 w-4 text-primary-300" /> Control Tower
                </button>
              )}
              <button
                onClick={signOut}
                aria-label="Logg ut"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Greeting + stats */}
          <div className="mt-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-400" />
                <p className="text-sm font-medium text-neutral-400">Hei, {firstName}</p>
              </div>
              <p className="mt-1.5 font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">Hva skal du gjøre i dag?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onNavigate('issues')}
                className="group flex min-w-[130px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-warning-400/30 hover:bg-warning-500/5"
              >
                <CircleAlert className="h-5 w-5 text-warning-300 transition group-hover:scale-110" />
                <span>
                  <strong className="block text-lg leading-none">{issuesCount}</strong>
                  <small className="text-[11px] text-neutral-400">Åpne avvik</small>
                </span>
              </button>
              <div className="flex min-w-[130px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-success-300" />
                <span>
                  <strong className="block text-lg leading-none">{completedToday}</strong>
                  <small className="text-[11px] text-neutral-400">Fullført i dag</small>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Fire round status banner */}
      {fireStatus.overdue && (
        <div className="mx-auto max-w-5xl px-5 pt-5 sm:px-8">
          <button
            onClick={() => onOpenModule('fire')}
            className="group flex w-full items-center gap-4 rounded-2xl border border-accent-300/50 bg-gradient-to-r from-accent-50 to-accent-100/50 p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 shadow-sm">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-accent-900">Brannvernrunde for {formatMonthYear(new Date().getMonth() + 1, new Date().getFullYear())} mangler</p>
              <p className="mt-0.5 text-sm text-accent-700/80">Dette skal gjøres den 1. hver måned. Start runden nå.</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-accent-600 transition group-hover:translate-x-1" />
          </button>
        </div>
      )}

      {fireStatus.done && fireStatus.inspection && (
        <div className="mx-auto max-w-5xl px-5 pt-5 sm:px-8">
          <div className="flex items-center gap-4 rounded-2xl border border-success-300/50 bg-gradient-to-r from-success-50 to-success-100/40 p-4 shadow-card">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-success-900">Brannvernrunde fullført for {formatMonthYear(new Date().getMonth() + 1, new Date().getFullYear())}</p>
              <p className="mt-0.5 text-sm text-success-700/80">Månedens kontroll er gjennomført.</p>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
        {/* Quick actions */}
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Hurtigvalg</p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight">Dine arbeidsoppgaver</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => onOpenModule(module.id)}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${module.barTone}`} />
                {/* Hover gradient glow */}
                <div className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${module.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-10`} />

                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${module.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {module.priority && (
                    <span className="rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success-700 ring-1 ring-success-200/40">
                      Prioritet
                    </span>
                  )}
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {module.subtitle}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-neutral-900">{module.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-6 text-neutral-500">{module.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm font-semibold text-neutral-700">
                  <span>Åpne</span>
                  <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom row: History + Admin */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => onNavigate('history')}
            className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 transition group-hover:scale-105">
              <History className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Historikk</p>
              <p className="mt-1 text-sm text-neutral-500">Se tidligere kontroller og rapporter</p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-1" />
          </button>

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="group flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:bg-neutral-900"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-primary-300 transition group-hover:scale-105">
                <Settings className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">Control Tower</p>
                <p className="mt-1 text-sm text-neutral-400">Administrer brukere, trucker og dokumenter</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-500 transition group-hover:translate-x-1" />
            </button>
          )}

          {!isAdmin && (
            <button
              onClick={() => onOpenModule('handbook')}
              className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition group-hover:scale-105">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold">Dokumenter</p>
                <p className="mt-1 text-sm text-neutral-500">HMS-håndbok og prosedyrer</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur-lg sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-primary-600">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Hub</span>
          </button>
          <button
            onClick={() => onNavigate('issues')}
            className="flex flex-col items-center gap-1 text-neutral-400"
          >
            <CircleAlert className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Avvik</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="flex flex-col items-center gap-1 text-neutral-400"
          >
            <History className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Historikk</span>
          </button>
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex flex-col items-center gap-1 text-neutral-400"
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
