import { useState } from 'react';
import { ArrowLeft, Users, Building2, ClipboardList, ShieldCheck } from 'lucide-react';

export type AdminTab = 'users' | 'stations' | 'checklist';

type Props = {
  onBack: () => void;
  children: (tab: AdminTab) => React.ReactNode;
};

export default function AdminLayout({ onBack, children }: Props) {
  const [tab, setTab] = useState<AdminTab>('users');

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Brukere', icon: <Users className="w-4.5 h-4.5" /> },
    { id: 'stations', label: 'Brannposter', icon: <Building2 className="w-4.5 h-4.5" /> },
    { id: 'checklist', label: 'Sjekkliste', icon: <ClipboardList className="w-4.5 h-4.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-12 pb-5 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-white font-bold text-lg">Admin-panel</h1>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-white/10 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.id ? 'bg-white text-slate-900' : 'text-slate-300'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 mt-4">{children(tab)}</div>
    </div>
  );
}
