import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import type { AdminTab } from '@/screens/admin/AdminLayout';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase, type Inspection } from '@/lib/supabase';
import AuthScreen from '@/screens/AuthScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import Hub, { type ModuleId } from '@/screens/Hub';
import TruckCheck from '@/screens/TruckCheck';
import TruckCheckDetail from '@/screens/TruckCheckDetail';
import TruckTraining from '@/screens/TruckTraining';
import TruckTrainingComplete from '@/screens/TruckTrainingComplete';
import ClothingLog from '@/screens/ClothingLog';
import ClosingRoutine from '@/screens/ClosingRoutine';
import RuhReport from '@/screens/RuhReport';
import Handbook from '@/screens/Handbook';

const InspectionForm = lazy(() => import('@/screens/InspectionForm'));
const HistoryScreen = lazy(() => import('@/screens/HistoryScreen'));
const InspectionDetail = lazy(() => import('@/screens/InspectionDetail'));
const IssuesScreen = lazy(() => import('@/screens/IssuesScreen'));
const AdminLayout = lazy(() => import('@/screens/admin/AdminLayout'));
const UserManagement = lazy(() => import('@/screens/admin/UserManagement'));
const StationManagement = lazy(() => import('@/screens/admin/StationManagement'));
const ChecklistManagement = lazy(() => import('@/screens/admin/ChecklistManagement'));
const TruckManagement = lazy(() => import('@/screens/admin/TruckManagement'));
const TruckAuditLog = lazy(() => import('@/screens/admin/TruckAuditLog'));
const FireRoundsManagement = lazy(() => import('@/screens/admin/FireRoundsManagement'));
const TrainingManagement = lazy(() => import('@/screens/admin/TrainingManagement'));
const ClosingRoutineManagement = lazy(() => import('@/screens/admin/ClosingRoutineManagement'));
const DocumentLibrary = lazy(() => import('@/screens/admin/DocumentLibrary'));

type Tab = 'dashboard' | 'history' | 'issues';
type View =
  | { name: 'hub' }
  | { name: 'history' }
  | { name: 'issues' }
  | { name: 'fire'; testMode?: boolean }
  | { name: 'truck' }
  | { name: 'truck-detail'; id: string }
  | { name: 'training' }
  | { name: 'training-complete'; id: string }
  | { name: 'clothing' }
  | { name: 'closing' }
  | { name: 'ruh' }
  | { name: 'handbook' }
  | { name: 'inspection-detail'; id: string }
  | { name: 'admin'; initialTab?: AdminTab };

function AppInner() {
  const { session, profile, loading, passwordRecovery } = useAuth();
  const [view, setView] = useState<View>({ name: 'hub' });
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [issuesCount, setIssuesCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ data: insps }, { count: inspectionIssues }, { count: ruhIssues }] = await Promise.all([
      supabase.from('inspections').select('*').order('created_at', { ascending: false }),
      supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('ruh_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    const allInspections = (insps || []) as Inspection[];
    setInspections(allInspections);
    setIssuesCount((inspectionIssues || 0) + (ruhIssues || 0));
    setCompletedToday(allInspections.filter((item) => item.completed_at && new Date(item.completed_at) >= today).length);
    setDataLoading(false);
  }, []);

  useEffect(() => { if (session) loadData(); }, [session, loadData]);

  if (loading) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-900"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700"><ShieldCheck className="h-9 w-9 text-white" /></div><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>;
  if (passwordRecovery) return <ResetPasswordScreen />;
  if (!session || !profile) return <AuthScreen />;

  const fallback = <div className="flex min-h-screen items-center justify-center bg-neutral-50"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>;
  const navigate = (tab: Tab) => {
    if (tab === 'dashboard') setView({ name: 'hub' });
    else if (tab === 'history') setView({ name: 'history' });
    else setView({ name: 'issues' });
  };
  const openModule = (module: ModuleId) => {
    if (module === 'fire') setView({ name: 'fire' });
    else if (module === 'truck') setView({ name: 'truck' });
    else if (module === 'training') setView({ name: 'training' });
    else if (module === 'clothing') setView({ name: 'clothing' });
    else if (module === 'closing') setView({ name: 'closing' });
    else if (module === 'ruh') setView({ name: 'ruh' });
    else setView({ name: 'handbook' });
  };

  const renderAdminTab = (tab: AdminTab) => {
    switch (tab) {
      case 'users': return <UserManagement />;
      case 'stations': return <StationManagement />;
      case 'trucks': return <TruckManagement />;
      case 'truck-log': return <TruckAuditLog onOpenCheck={(id) => setView({ name: 'truck-detail', id })} />;
      case 'fire-rounds': return <FireRoundsManagement />;
      case 'training': return <TrainingManagement />;
      case 'closing': return <ClosingRoutineManagement />;
      case 'documents': return <DocumentLibrary />;
      case 'checklist': return <ChecklistManagement />;
      default: return <UserManagement />;
    }
  };

  if (view.name === 'hub') return <Hub onNavigate={navigate} onOpenModule={openModule} onOpenAdmin={() => setView({ name: 'admin' })} issuesCount={issuesCount} completedToday={completedToday} />;
  if (view.name === 'fire') return <Suspense fallback={fallback}><InspectionForm onBack={() => setView({ name: 'hub' })} onComplete={(id) => { loadData(); setView({ name: 'inspection-detail', id }); }} existing={view.testMode ? null : inspections.find((item) => item.period_month === new Date().getMonth() + 1 && item.period_year === new Date().getFullYear())} testMode={!!view.testMode} /></Suspense>;
  if (view.name === 'truck') return <TruckCheck onBack={() => setView({ name: 'hub' })} onComplete={(id) => { loadData(); setView({ name: 'truck-detail', id }); }} />;
  if (view.name === 'truck-detail') return <TruckCheckDetail id={view.id} onBack={() => setView({ name: 'hub' })} />;
  if (view.name === 'training') return <TruckTraining onBack={() => setView({ name: 'hub' })} onComplete={(id) => setView({ name: 'training-complete', id })} />;
  if (view.name === 'training-complete') return <TruckTrainingComplete id={view.id} onBack={() => setView({ name: 'hub' })} />;
  if (view.name === 'clothing') return <ClothingLog onBack={() => setView({ name: 'hub' })} />;
  if (view.name === 'closing') return <ClosingRoutine onBack={() => setView({ name: 'hub' })} onComplete={() => setView({ name: 'hub' })} />;
  if (view.name === 'ruh') return <RuhReport onBack={() => setView({ name: 'hub' })} />;
  if (view.name === 'handbook') return <Handbook onBack={() => setView({ name: 'hub' })} />;
  if (view.name === 'inspection-detail') return <Suspense fallback={fallback}><InspectionDetail inspectionId={view.id} onBack={() => setView({ name: 'hub' })} /></Suspense>;
  if (view.name === 'history') return <Suspense fallback={fallback}><HistoryScreen onBack={() => setView({ name: 'hub' })} onNavigate={navigate} onViewInspection={(id) => setView({ name: 'inspection-detail', id })} inspections={inspections} loading={dataLoading} isAdmin={profile.role === 'admin'} onDeleted={loadData} onOpenTruckLog={() => setView({ name: 'admin', initialTab: 'truck-log' })} /></Suspense>;
  if (view.name === 'issues') return <Suspense fallback={fallback}><IssuesScreen onBack={() => setView({ name: 'hub' })} onNavigate={navigate} onViewInspection={(id) => setView({ name: 'inspection-detail', id })} /></Suspense>;
  if (view.name === 'admin') return profile.role === 'admin' ? <Suspense fallback={fallback}><AdminLayout initialTab={view.initialTab} onBack={() => setView({ name: 'hub' })}>{renderAdminTab}</AdminLayout></Suspense> : <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-5 text-center"><div><p className="text-sm text-neutral-500">Du har ikke tilgang til admin-panelet.</p><button onClick={() => setView({ name: 'hub' })} className="mt-4 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white">Tilbake til Hub</button></div></div>;
  return null;
}

export default function App() { return <AuthProvider><AppInner /></AuthProvider>; }
