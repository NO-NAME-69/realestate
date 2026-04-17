import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './lib/auth';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';

// Lazy loading for pages
const LandingPage = React.lazy(() => import('./pages/landing/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const VerifyOTPPage = React.lazy(() => import('./pages/auth/VerifyOTPPage'));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage'));
const WalletPage = React.lazy(() => import('./pages/wallet/WalletPage'));
const ProjectsPage = React.lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = React.lazy(() => import('./pages/projects/ProjectDetailPage'));
const InvestmentsPage = React.lazy(() => import('./pages/investments/InvestmentsPage'));
const PlotsPage = React.lazy(() => import('./pages/plots/PlotsPage'));
const TeamPage = React.lazy(() => import('./pages/team/TeamPage'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const ManageProjectsPage = React.lazy(() => import('./pages/admin/ManageProjectsPage'));
const SalesPage = React.lazy(() => import('./pages/admin/SalesPage'));
const AuditPage = React.lazy(() => import('./pages/admin/AuditPage'));
const ConfigPage = React.lazy(() => import('./pages/admin/ConfigPage'));
const AdminKycPage = React.lazy(() => import('./pages/admin/KycPage').then(m => ({ default: m.AdminKycPage })));
const AdminGlobalWalletPage = React.lazy(() => import('./pages/admin/GlobalWalletPage').then(m => ({ default: m.AdminGlobalWalletPage })));
const AdminManagePlotsPage = React.lazy(() => import('./pages/admin/ManagePlotsPage').then(m => ({ default: m.AdminManagePlotsPage })));
const AdminLedgerPage = React.lazy(() => import('./pages/admin/LedgerPage').then(m => ({ default: m.AdminLedgerPage })));
const AdminReportsPage = React.lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.AdminReportsPage })));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing page — accessible to everyone */}
          <Route path="/" element={<React.Suspense fallback={null}><LandingPage /></React.Suspense>} />

          {/* Public Routes (only unauthenticated users) */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<React.Suspense fallback={null}><LoginPage /></React.Suspense>} />
              <Route path="/register" element={<React.Suspense fallback={null}><RegisterPage /></React.Suspense>} />
              <Route path="/verify-otp" element={<React.Suspense fallback={null}><VerifyOTPPage /></React.Suspense>} />
            </Route>
          </Route>

          {/* Protected Routes (authenticated users only) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<React.Suspense fallback={null}><DashboardPage /></React.Suspense>} />
              <Route path="/wallet" element={<React.Suspense fallback={null}><WalletPage /></React.Suspense>} />
              <Route path="/investments" element={<React.Suspense fallback={null}><InvestmentsPage /></React.Suspense>} />
              <Route path="/projects" element={<React.Suspense fallback={null}><ProjectsPage /></React.Suspense>} />
              <Route path="/projects/:id" element={<React.Suspense fallback={null}><ProjectDetailPage /></React.Suspense>} />
              <Route path="/plots" element={<React.Suspense fallback={null}><PlotsPage /></React.Suspense>} />
              <Route path="/team" element={<React.Suspense fallback={null}><TeamPage /></React.Suspense>} />
              <Route path="/admin" element={<React.Suspense fallback={null}><AdminDashboard /></React.Suspense>} />
              <Route path="/admin/users" element={<React.Suspense fallback={null}><UsersPage /></React.Suspense>} />
              <Route path="/admin/kyc" element={<React.Suspense fallback={null}><AdminKycPage /></React.Suspense>} />
              <Route path="/admin/wallet" element={<React.Suspense fallback={null}><AdminGlobalWalletPage /></React.Suspense>} />
              <Route path="/admin/projects" element={<React.Suspense fallback={null}><ManageProjectsPage /></React.Suspense>} />
              <Route path="/admin/plots" element={<React.Suspense fallback={null}><AdminManagePlotsPage /></React.Suspense>} />
              <Route path="/admin/sales" element={<React.Suspense fallback={null}><SalesPage /></React.Suspense>} />
              <Route path="/admin/ledger" element={<React.Suspense fallback={null}><AdminLedgerPage /></React.Suspense>} />
              <Route path="/admin/reports" element={<React.Suspense fallback={null}><AdminReportsPage /></React.Suspense>} />
              <Route path="/admin/audit" element={<React.Suspense fallback={null}><AuditPage /></React.Suspense>} />
              <Route path="/admin/config" element={<React.Suspense fallback={null}><ConfigPage /></React.Suspense>} />
              
              {/* Fallback for protected routes */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* Global Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            },
            success: {
              iconTheme: {
                primary: 'var(--success)',
                secondary: 'var(--bg-tertiary)',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
