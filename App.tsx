import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './src/pages/Login';
import PublicReport from './src/pages/PublicReport';
import PublicReportDetail from './src/pages/PublicReportDetail';
import AdminLayout from './src/components/AdminLayout';
import Complaints from './src/pages/Complaints';
import FinalizedReports from './src/pages/FinalizedReports';
import ExecutiveAnalytics from './src/pages/ExecutiveAnalytics';
import CatalogManagement from './src/pages/CatalogManagement';
import Roles from './src/pages/Roles';
import Profile from './src/pages/Profile';
import ReportDetail from './src/pages/ReportDetail';
import Landing from './src/pages/Landing';
import Register from './src/pages/Register';
import Success from './src/pages/Success';
import Billing from './src/pages/Billing';
import VerifyPortal from './src/pages/VerifyPortal';
import ProtectedRoute from './src/components/routing/ProtectedRoute';
import Dashboard from './src/pages/Dashboard';
import Trazability from './src/pages/Trazability';
import NotFound from './src/pages/NotFound';
import Reactivate from './src/pages/Reactivate';
import Settings from './src/pages/Settings';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { TenantProvider, useTenant } from './src/context/TenantContext';
import { Shield } from 'lucide-react';

// ─── Niveles permitidos ───────────────────────────────────────────────────────
const ALL_ADMIN = ['SUPER_ADMIN','IT_ADMIN','COMPLIANCE_OFFICER','CASE_MANAGER','FORENSIC_INVESTIGATOR','EXTERNAL_AUDITOR'];
const SUPER_AUDITOR = ['SUPER_ADMIN','EXTERNAL_AUDITOR'];
const SUPER_IT = ['SUPER_ADMIN','IT_ADMIN'];
const SUPER_COMPLIANCE_IT = ['SUPER_ADMIN','COMPLIANCE_OFFICER','IT_ADMIN'];
const CASE_TEAM = ['SUPER_ADMIN','COMPLIANCE_OFFICER','CASE_MANAGER','FORENSIC_INVESTIGATOR','EXTERNAL_AUDITOR'];
const CASE_TEAM_NO_AUDITOR = CASE_TEAM.filter(role => role !== 'EXTERNAL_AUDITOR');
const ONLY_SUPER_ADMIN = ['SUPER_ADMIN'];

const adminChildren = () => (
  <>
    <Route element={<AdminLayout />}>
      <Route path="dashboard" element={<Dashboard />} />

      <Route element={<ProtectedRoute allowedLevels={ONLY_SUPER_ADMIN} />}>
        <Route path="billing"  element={<Billing />} />
      </Route>

      <Route element={<ProtectedRoute allowedLevels={SUPER_AUDITOR} />}>
        <Route path="finalized"   element={<FinalizedReports />} />
        <Route path="trazability" element={<Trazability />} />
      </Route>

      <Route element={<ProtectedRoute allowedLevels={SUPER_IT} />}>
        <Route path="roles"    element={<Roles />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route element={<ProtectedRoute allowedLevels={SUPER_COMPLIANCE_IT} />}>
        <Route path="catalogs"  element={<CatalogManagement />} />
        <Route path="analytics" element={<ExecutiveAnalytics />} />
      </Route>

      <Route element={<ProtectedRoute allowedLevels={CASE_TEAM_NO_AUDITOR} />}>
        <Route path="complaints"     element={<Complaints />} />
      </Route>

      <Route element={<ProtectedRoute allowedLevels={CASE_TEAM} />}>
        <Route path="complaints/:id" element={<ReportDetail />} />
      </Route>

      <Route path="profile" element={<Profile />} />
    </Route>
  </>
);

// ─── Loading / Error screens ──────────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div className='min-h-screen flex items-center justify-center bg-slate-950'>
    <div className='text-center space-y-5'>
      <div className='relative mx-auto w-14 h-14'>
        <div className='absolute inset-0 rounded-full border border-slate-700' />
        <div className='absolute inset-0 rounded-full border-t border-blue-500 animate-spin' />
        <Shield className='absolute inset-0 m-auto w-5 h-5 text-blue-400' />
      </div>
      <p className='text-slate-500 text-xs tracking-widest uppercase'>Verificando portal</p>
    </div>
  </div>
);

const DomainNotFoundScreen: React.FC = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#020617', flexDirection: 'column', gap: 12, padding: 24,
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16,
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
    }}>🚫</div>
    <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Dominio no configurado</h1>
    <p style={{ color: '#64748b', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
      Este dominio no está asociado a ningún portal activo en SecureWhistle.
    </p>
  </div>
);

const PortalNotFoundScreen: React.FC = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#020617', flexDirection: 'column', gap: 12, padding: 24,
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16,
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
    }}>🔍</div>
    <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Portal no encontrado</h1>
    <p style={{ color: '#64748b', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
      El portal que intentas acceder no existe o no está disponible.
    </p>
  </div>
);

// ─── AppRoutes — sin <Router> aquí, ya viene de arriba ───────────────────────
const AppRoutes: React.FC = () => {
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();

  if (isCustomDomain && isLoading || !isCustomDomain && isLoading)    return <LoadingScreen />;
  if (!isCustomDomain && isLoading && portal === null) return <LoadingScreen />;
  if (isCustomDomain && domainError)  return <DomainNotFoundScreen />;
  if (isCustomDomain && portalError || !isCustomDomain && portalError) return <PortalNotFoundScreen />;

  return (
    <Routes>
      {/* ── Rutas públicas SaaS — sin AuthProvider ── */}
      {!isCustomDomain && (
        <>
          <Route path='/'              element={<Landing />} />
          <Route path='/verify-portal' element={<VerifyPortal />} />
          <Route path='/register'      element={<Register />} />
          <Route path='/success'       element={<Success />} />
        </>
      )}

      {/* ── Login y reporte público — sin AuthProvider ── */}
      {!isCustomDomain && (
        <>
          <Route path='/:portal/gateway'              element={<Login />} />
          <Route path='/:portal/public-report'        element={<PublicReport />} />
          <Route path='/:portal/public-report-detail' element={<PublicReportDetail />} />
          <Route path='/:portal/reactivate' element={<Reactivate />} />
        </>
      )}

      {isCustomDomain && portal && (
        <>
          <Route path='/gateway'              element={<Login />} />
          <Route path='/public-report'        element={<PublicReport />} />
          <Route path='/public-report-detail' element={<PublicReportDetail />} />
          <Route path='/reactivate' element={<Reactivate />} />
        </>
      )}

      {/* ── Rutas admin — solo aquí va AuthProvider ── */}
      {!isCustomDomain && (
        <Route path='/:portal' element={
            <ProtectedRoute allowedLevels={ALL_ADMIN} />
        }>
          {adminChildren()}
        </Route>
      )}

      {isCustomDomain && portal && (
        <Route path='/' element={
            <ProtectedRoute allowedLevels={ALL_ADMIN} />
        }>
          {adminChildren()}
        </Route>
      )}

      <Route path='*' element={<NotFound />} />
    </Routes>
  );
};

// ─── Root — Router envuelve TODO, incluido TenantProvider ────────────────────
const App: React.FC = () => (
  <Router>
    <TenantProvider>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </TenantProvider>
  </Router>
);

export default App;