import {
  ShieldCheck, UserCircle, Settings, Flame, Truck, Shirt, Moon,
  TriangleAlert, BookOpen, ChevronRight, CircleAlert, CheckCircle2,
  ClipboardCheck, LogOut, History, Wrench,
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

export type ModuleId = 'fire' | 'truck' | 'clothing' | 'closing' | 'ruh' | 'handbook';

type Module = {
  id: ModuleId;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Flame;
  tone: string;
  iconTone: string;
  active?: boolean;
};

const modules: Module[] = [
  { id: 'fire', title: 'Brannvern & brannposter', subtitle: 'Månedlig kontroll', description: 'Sjekk alle brannposter og kontrollpunkter steg for steg.', icon: Flame, tone: 'from-red-500 to-orange-500', iconTone: 'bg-red-50 text-red-600', active: true },
  { id: 'truck', title: 'Trucksjekk', subtitle: 'Daglig kontroll', description: 'Kontroller trucken før bruk og sett den ut av drift ved feil.', icon: Truck, tone: 'from-cyan-500 to-blue-600', iconTone: 'bg-cyan-50 text-cyan-700', active: true },
  { id: 'clothing', title: 'Arbeidstøy & verneutstyr', subtitle: 'Utstyrslogg', description: 'Registrer utlevering, retur og bytte av arbeidstøy og PPE.', icon: Shirt, tone: 'from-emerald-500 to-teal-600', iconTone: 'bg-emerald-50 text-emerald-700' },
  { id: 'closing', title: 'Kvelds- & stengerutiner', subtitle: 'Daglig sjekkliste', description: 'Sikre lokaler, utstyr og nødutganger før dagen avsluttes.', icon: Moon, tone: 'from-slate-600 to-slate-900', iconTone: 'bg-slate-100 text-slate-700' },
  { id: 'ruh', title: 'Meld RUH / avvik', subtitle: 'Rask registrering', description: 'Meld fra om uønskede hendelser og farlige forhold.', icon: TriangleAlert, tone: 'from-amber-400 to-orange-500', iconTone: 'bg-amber-50 text-amber-700' },
  { id: 'handbook', title: 'HMS-håndbok & dokumenter', subtitle: 'Prosedyrer', description: 'Finn rutiner, skjemaer og annen viktig HMS-dokumentasjon.', icon: BookOpen, tone: 'from-violet-500 to-indigo-600', iconTone: 'bg-violet-50 text-violet-700' },
];

export default function Hub({ onNavigate, onOpenModule, onOpenAdmin, issuesCount, completedToday }: Props) {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'bruker';

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900 pb-28">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-7 sm:px-8 sm:pt-9">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-900/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Aksell</p>
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">HMS Hub</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onOpenAdmin} className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 sm:flex">
                <Settings className="h-4 w-4 text-emerald-400" /> Admin-panel
              </button>
              <button onClick={signOut} aria-label="Logg ut" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-400">God morgen, {firstName}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Hva skal du gjøre i dag?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNavigate('issues')} className="flex min-w-[120px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-left transition hover:bg-white/15">
                <CircleAlert className="h-5 w-5 text-amber-300" />
                <span><strong className="block text-base leading-none">{issuesCount}</strong><small className="text-[11px] text-slate-400">Åpne avvik</small></span>
              </button>
              <div className="flex min-w-[120px] items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <span><strong className="block text-base leading-none">{completedToday}</strong><small className="text-[11px] text-slate-400">Fullført i dag</small></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Arbeidsflate</p><h2 className="mt-1 text-xl font-bold tracking-tight">HMS-moduler</h2></div>
          <p className="hidden text-sm text-slate-400 sm:block">Velg en modul for å starte</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button key={module.id} onClick={() => onOpenModule(module.id)} className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.tone}`} />
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.iconTone}`}><Icon className="h-6 w-6" /></div>
                  {module.active ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Aktiv</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Modul</span>}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{module.subtitle}</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{module.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{module.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-700"><span>Åpne modul</span><ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button onClick={() => onNavigate('history')} className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><History className="h-5 w-5" /></div><div className="flex-1"><p className="font-bold">Historikk</p><p className="mt-1 text-sm text-slate-500">Se tidligere kontroller og rapporter</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></button>
          <button onClick={onOpenAdmin} className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-slate-900 p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-emerald-300"><Wrench className="h-5 w-5" /></div><div className="flex-1"><p className="font-bold text-white">Admin-panel</p><p className="mt-1 text-sm text-slate-400">Administrer brukere, poster og sjekklister</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></button>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around"><button className="flex flex-col items-center gap-1 text-red-600"><ClipboardCheck className="h-5 w-5" /><span className="text-[10px] font-semibold">Hub</span></button><button onClick={() => onNavigate('issues')} className="flex flex-col items-center gap-1 text-slate-400"><CircleAlert className="h-5 w-5" /><span className="text-[10px] font-semibold">Avvik</span></button><button onClick={() => onNavigate('history')} className="flex flex-col items-center gap-1 text-slate-400"><History className="h-5 w-5" /><span className="text-[10px] font-semibold">Historikk</span></button><button onClick={onOpenAdmin} className="flex flex-col items-center gap-1 text-slate-400"><Settings className="h-5 w-5" /><span className="text-[10px] font-semibold">Admin</span></button></div>
      </nav>
    </div>
  );
}
