import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Loader2, Flame } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Inspection } from '@/lib/supabase';
import AuthScreen from '@/screens/AuthScreen';
import Dashboard from '@/screens/Dashboard';

const InspectionForm = lazy(() => import('@/screens/InspectionForm'));
const HistoryScreen = lazy(() => import('@/screens/HistoryScreen'));
const InspectionDetail = lazy(() => import('@/screens/InspectionDetail'));
const IssuesScreen = lazy(() => import('@/screens/IssuesScreen'));
const AdminLayout = lazy(() => import('@/screens/admin/AdminLayout'));
const UserManagement = lazy(() => import('@/screens/admin/UserManagement'));
const StationManagement = lazy(() => import('@/screens/admin/StationManagement'));
const ChecklistManagement = lazy(() => import('@/screens/admin/ChecklistManagement'));

type View =
  | { name: 'dashboard' }
  | { name: 'history' }
  | { name: 'issues' }
  | { name: 'form'; testMode?: boolean }
  | { name: 'detail'; inspectionId: string }
  | { name: 'admin' };

type Tab = 'dashboard' | 'history' | 'issues';

function AppInner() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [issuesCount, setIssuesCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    const [{ data: insps }, { count }] = await Promise.all([
      supabase.from('inspections').select('*').order('created_at', { ascending: false }),
      supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setInspections((insps || []) as Inspection[]);
    setIssuesCount(count || 0);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
          <Flame className="w-9 h-9 text-white" strokeWidth={2.2} />
        </div>
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  const navigate = (tab: Tab) => setView({ name: tab } as View);
  const viewInspection = (id: string) => setView({ name: 'detail', inspectionId: id });

  const onInspectionComplete = async (_id: string) => {
    await loadData();
    setView({ name: 'detail', inspectionId: _id });
  };

  const Fallback = (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );

  if (view.name === 'form') {
    const now = new Date();
    const existing = !view.testMode ? inspections.find(
      (i) => i.period_month === now.getMonth() + 1 && i.period_year === now.getFullYear(),
    ) : null;
    return (
      <Suspense fallback={Fallback}>
        <InspectionForm
          onBack={() => setView({ name: 'dashboard' })}
          onComplete={onInspectionComplete}
          existing={existing}
          testMode={!!view.testMode}
        />
      </Suspense>
    );
  }

  if (view.name === 'detail') {
    return (
      <Suspense fallback={Fallback}>
        <InspectionDetail
          inspectionId={view.inspectionId}
          onBack={() => setView({ name: 'dashboard' })}
        />
      </Suspense>
    );
  }

  if (view.name === 'history') {
    return (
      <Suspense fallback={Fallback}>
        <HistoryScreen
          onBack={() => setView({ name: 'dashboard' })}
          onNavigate={navigate}
          onViewInspection={viewInspection}
          inspections={inspections}
          loading={dataLoading}
          isAdmin={profile.role === 'admin'}
          onDeleted={loadData}
        />
      </Suspense>
    );
  }

  if (view.name === 'issues') {
    return (
      <Suspense fallback={Fallback}>
        <IssuesScreen
          onBack={() => setView({ name: 'dashboard' })}
          onNavigate={navigate}
          onViewInspection={viewInspection}
        />
      </Suspense>
    );
  }

  if (view.name === 'admin') {
    if (profile.role !== 'admin') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <p className="text-slate-400 text-sm">Du har ikke tilgang til admin-panelet.</p>
          <button onClick={() => setView({ name: 'dashboard' })} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium">
            Tilbake til hjem
          </button>
        </div>
      );
    }
    return (
      <Suspense fallback={Fallback}>
        <AdminLayout onBack={() => setView({ name: 'dashboard' })}>
          {(tab) =>
            tab === 'users' ? <UserManagement /> : tab === 'stations' ? <StationManagement /> : <ChecklistManagement />
          }
        </AdminLayout>
      </Suspense>
    );
  }

  return (
    <Dashboard
      onNavigate={navigate}
      onStartInspection={() => setView({ name: 'form' })}
      onStartTestInspection={() => setView({ name: 'form', testMode: true })}
      testMode={testMode}
      onToggleTestMode={() => setTestMode((v) => !v)}
      onViewInspection={viewInspection}
      inspections={inspections}
      issuesCount={issuesCount}
      loading={dataLoading}
      onOpenAdmin={() => setView({ name: 'admin' })}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
