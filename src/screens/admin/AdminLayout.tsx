import { useState } from 'react';
import { ArrowLeft, Users, Building2, ClipboardList, ShieldCheck, Truck } from 'lucide-react';

export type AdminTab = 'users' | 'stations' | 'checklist' | 'trucks';

type Props = {
  onBack: () => void;
  children: (tab: AdminTab) => React.ReactNode;
};

export default function AdminLayout({ onBack, children }: Props) {
  const [tab, setTab] = useState<AdminTab>('users');

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Brukere', icon: <Users className="w-4 h-4" /> },
    { id: 'stations', label: 'Brannposter', icon: <Building2 className="w-4 h-4" /> },
    { id: 'trucks', label: 'Trucker', icon: <Truck className="w-4 h-4" /> },
    { id: 'checklist', label: 'Sjekkliste', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-5 pt-7 pb-5 sm:px-8 sm:pt-9">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Administrasjon</p>
                <h1 className="text-xl font-bold">Admin-panel</h1>
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-white/10 rounded-2xl">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/5'}`}>
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">{children(tab)}</main>
    </div>
  );
}
