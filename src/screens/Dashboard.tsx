import { useEffect, useState, useCallback } from 'react';
import {
  Flame, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  History, ClipboardList, LogOut, User as UserIcon, ShieldCheck, Loader2,
  FlaskConical, Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatMonthYear, formatDateTime, type Inspection } from '@/lib/supabase';

type Tab = 'dashboard' | 'history' | 'issues';

type Props = {
  onNavigate: (tab: Tab) => void;
  onStartInspection: () => void;
  onStartTestInspection: () => void;
  testMode: boolean;
  onToggleTestMode: () => void;
  onViewInspection: (id: string) => void;
  inspections: Inspection[];
  issuesCount: number;
  loading: boolean;
  onOpenAdmin: () => void;
};

export default function Dashboard({ onNavigate, onStartInspection, onStartTestInspection, testMode, onToggleTestMode, onViewInspection, inspections, issuesCount, loading, onOpenAdmin }: Props) {
  const { profile, signOut } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthInspection = inspections.find(
    (i) => i.period_month === currentMonth && i.period_year === currentYear,
  );
  const isCompleted = monthInspection?.status === 'completed';

  const completed = inspections.filter((i) => i.status === 'completed');
  const recentCompleted = [...completed]
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, 3);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-12 pb-20 rounded-b-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-white font-bold text-lg">Brannvernrunde</span>
          </div>
          <button
            onClick={signOut}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
            aria-label="Logg ut"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="relative">
          <p className="text-slate-400 text-sm mb-1">Velkommen tilbake,</p>
          <h1 className="text-white text-2xl font-bold">{profile?.full_name || 'Bruker'}</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-200 font-medium">
              {isAdmin ? 'Administrator' : 'Inspektør'}
            </span>
          </div>
        </div>
      </header>

      {/* Monthly Status Card */}
      <div className="px-5 -mt-12">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Denne måneden</p>
              <p className="text-slate-900 font-bold text-lg mt-0.5">{formatMonthYear(currentMonth, currentYear)}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isCompleted ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              {isCompleted ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              ) : (
                <Clock className="w-7 h-7 text-amber-500" />
              )}
            </div>
          </div>

          <div className={`rounded-xl p-4 ${
            isCompleted ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <p className={`font-semibold text-sm ${
              isCompleted ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              {isCompleted ? 'Inspeksjon fullført' : 'Inspeksjon pågår'}
            </p>
            <p className={`text-xs mt-1 ${
              isCompleted ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {isCompleted && monthInspection?.completed_at
                ? `Fullført ${formatDateTime(monthInspection.completed_at)}`
                : 'Frist: 1. i måneden. Start inspeksjonen nå.'}
            </p>
          </div>

          {!isCompleted && (
            <button
              onClick={onStartInspection}
              className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-4.5 h-4.5" />
              Start inspeksjon
            </button>
          )}
          {isCompleted && monthInspection && (
            <button
              onClick={() => onViewInspection(monthInspection.id)}
              className="w-full mt-4 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              Se rapport
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Test mode toggle + test inspection button */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onToggleTestMode}
              className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                testMode
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              {testMode ? 'Testmodus PÅ' : 'Testmodus AV'}
            </button>
            {testMode && (
              <button
                onClick={onStartTestInspection}
                className="w-full mt-2 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Start testinspeksjon
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          value={completed.length}
          label="Fullførte"
          color="emerald"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          value={issuesCount}
          label="Åpne avvik"
          color="red"
        />
      </div>

      {/* Admin entry (admins only) - prominent */}
      {isAdmin && (
        <div className="px-5 mt-4">
          <button
            onClick={onOpenAdmin}
            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-lg p-4 flex items-center gap-3 hover:shadow-xl hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Admin-panel</p>
              <p className="text-slate-400 text-xs">Brukere · Brannposter · Sjekkliste · QR-koder</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Recent */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-900 font-bold text-base">Siste inspeksjoner</h2>
          <button onClick={() => onNavigate('history')} className="text-red-600 text-sm font-medium">
            Se alle
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : recentCompleted.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Ingen fullførte inspeksjoner ennå</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentCompleted.map((insp) => (
              <button
                key={insp.id}
                onClick={() => onViewInspection(insp.id)}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold text-sm truncate">
                    {formatMonthYear(insp.period_month, insp.period_year)}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">
                    {insp.inspector_name} · {formatDateTime(insp.completed_at)}
                  </p>
                </div>
                <ChevronRight className="w-4.5 h-4.5 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNav active="dashboard" onNavigate={onNavigate} />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: 'emerald' | 'red' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-slate-900 text-2xl font-bold">{value}</p>
      <p className="text-slate-400 text-xs">{label}</p>
    </div>
  );
}

export function BottomNav({ active, onNavigate }: { active: Tab; onNavigate: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Hjem', icon: <Flame className="w-5 h-5" /> },
    { id: 'history', label: 'Historikk', icon: <History className="w-5 h-5" /> },
    { id: 'issues', label: 'Avvik', icon: <AlertTriangle className="w-5 h-5" /> },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors ${
              active === tab.id ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
