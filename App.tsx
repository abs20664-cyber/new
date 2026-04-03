import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PlatformProvider } from './contexts/PlatformContext';
import { Layout } from './components/Layout';

// Lazy load heavy page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Materials = lazy(() => import('./pages/Materials'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const EconomicDashboard = lazy(() => import('./pages/EconomicDashboard'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-institutional-400">Loading Protocol...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Global Loading State
  if (loading) {
      return (
          <div className="h-screen w-screen flex items-center justify-center bg-body">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-institutional-400">Initializing Platform...</p>
              </div>
          </div>
      );
  }

  // 2. Auth Guard: If no user, show login
  if (!user || !user.role) {
      return (
        <Suspense fallback={<div className="h-screen bg-slate-950" />}>
          <Login />
        </Suspense>
      );
  }

  return (
    <PlatformProvider>
        <Layout currentPath={location.pathname} onNavigate={(path) => navigate(path)}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard onNavigate={(path) => navigate(path)} />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/scanner" element={<Scanner classId={null} onBack={() => navigate('/')} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/economic" element={<EconomicDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
        </Layout>
    </PlatformProvider>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;