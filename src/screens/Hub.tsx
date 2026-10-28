import {
  ShieldCheck, Settings, Flame, Truck, Shirt, Moon,
  TriangleAlert, BookOpen, ChevronRight, CircleAlert, CheckCircle2,
  ClipboardCheck, LogOut, GraduationCap, FileText, History,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  iconTone: string;
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
    iconTone: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-500',
    priority: true,
  },
  {
    id: 'fire',
    title: 'Brannvern & brannposter',
    subtitle: 'Månedlig kontroll',
    description: 'Sjekk alle brannposter og kontrollpunkter.',
    icon: Flame,
    iconTone: 'bg-accent-50 text-accent-700',
    barTone: 'bg-accent-500',
    priority: true,
  },
  {
    id: 'training',
    title: 'Typeopplæring Truck',
    subtitle: '§ 10-4 utstyrsspesifikk',
    description: 'Gjennomfør og signer utstyrsspesifikk opplæring.',
    icon: GraduationCap,
    iconTone: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-600',
  },
  {
    id: 'closing',
    title: 'Stengerutiner',
    subtitle: 'Daglig sjekkliste',
    description: 'Sikre lokaler og utstyr før dagen avsluttes.',
    icon: Moon,
    iconTone: 'bg-neutral-100 text-neutral-700',
    barTone: 'bg-neutral-700',
  },
  {
    id: 'ruh',
    title: 'Meld RUH / avvik',
    subtitle: 'Rask registrering',
    description: 'Meld fra om uønskede hendelser og farlige forhold.',
    icon: TriangleAlert,
    iconTone: 'bg-warning-50 text-warning-700',
    barTone: 'bg-warning-500',
  },
  {
    id: 'handbook',
    title: 'HMS-håndbok',
    subtitle: 'Dokumenter & prosedyrer',
    description: 'Finn rutiner, skjemaer og HMS-dokumentasjon.',
    icon: BookOpen,
    iconTone: 'bg-primary-50 text-primary-700',
    barTone: 'bg-primary-500',
  },
];

export default function Hub({ onNavigate, onOpenModule, onOpenAdmin, issuesCount, completedToday }: Props) {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'bruker';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 text-neutral-900">
      {/* Header */}
      <header className="bg-neutral-900 text-white">
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-7 sm:px-8 sm:pt-9">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-900/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-300">Aksell</p>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">HMS Portal</h1>
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
          <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-neutral-400">Hei, {firstName}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Hva skal du gjøre i dag?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onNavigate('issues')}
                className="flex min-w-[130px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <CircleAlert className="h-5 w-5 text-warning-300" />
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

      <main className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
        {/* Quick actions */}
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Hurtigvalg</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Dine arbeidsoppgaver</h2>
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
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${module.iconTone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {module.priority && (
                    <span className="rounded-full bg-success-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success-700">
                      Prioritet
                    </span>
                  )}
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {module.subtitle}
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-neutral-900">{module.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-6 text-neutral-500">{module.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4 text-sm font-semibold text-neutral-700">
                  <span>Åpne</span>
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom row: History + Admin */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
              <History className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Historikk</p>
              <p className="mt-1 text-sm text-neutral-500">Se tidligere kontroller og rapporter</p>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          </button>

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-primary-300">
                <Settings className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">Control Tower</p>
                <p className="mt-1 text-sm text-neutral-400">Administrer brukere, trucker og dokumenter</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </button>
          )}

          {!isAdmin && (
            <button
              onClick={() => onOpenModule('handbook')}
              className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold">Dokumenter</p>
                <p className="mt-1 text-sm text-neutral-500">HMS-håndbok og prosedyrer</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </button>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-primary-600">
            <ClipboardCheck className="h-5 w-5" />
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
