
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeProvider.tsx';
import { ToastProvider } from './contexts/ToastContext.ts';
import useAuth from './hooks/useAuth.ts';

import MainLayout from './components/layout/MainLayout.tsx';
import FullPageLoader from './components/ui/FullPageLoader.tsx';
import { Role } from './types.ts';

// Lazy Load Pages
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.tsx'));
const LoansPage = lazy(() => import('./pages/LoansPage.tsx'));
const LoanDetailPage = lazy(() => import('./pages/LoanDetailPage.tsx'));
const ClientsPage = lazy(() => import('./pages/ClientsPage.tsx'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage.tsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.tsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.tsx'));
const RoutesPage = lazy(() => import('./pages/RoutesPage.tsx'));
const CashPage = lazy(() => import('./pages/CashPage.tsx'));
const SuperAdminLoginPage = lazy(() => import('./pages/SuperAdminLoginPage.tsx'));
const SuperAdminDashboardPage = lazy(() => import('./pages/SuperAdminDashboardPage.tsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.tsx'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const ProtectedRoute: React.FC = () => {
  const { session, profile, loading } = useAuth();
  
  if (loading) return <FullPageLoader />;
  
  // Strict Guard: Must have session AND profile.
  // If session exists but no profile, AuthProvider should handle logout, 
  // but if we reach here, redirect to login to be safe.
  return (session && profile) ? <MainLayout /> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return profile?.role === Role.ADMIN ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

const SuperAdminProtectedRoute: React.FC = () => {
  const isAuthenticated = sessionStorage.getItem('superAdminAuth') === 'true';
  return isAuthenticated ? <Outlet /> : <Navigate to="/loginadmin" replace />;
};

const PublicRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return !session ? element : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider>
        <ToastProvider>
            <QueryClientProvider client={queryClient}>
                <Router>
                    <AuthProvider>
                        <Suspense fallback={<FullPageLoader />}>
                            <Routes>
                                <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
                                <Route path="/register" element={<PublicRoute element={<RegisterPage />} />} />

                                <Route path="/loginadmin" element={<SuperAdminLoginPage />} />
                                <Route element={<SuperAdminProtectedRoute />}>
                                    <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
                                </Route>

                                <Route element={<ProtectedRoute />}>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/loans" element={<LoansPage />} />
                                    <Route path="/loans/:loanId" element={<LoanDetailPage />} />
                                    <Route path="/clients" element={<ClientsPage />} />
                                    <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                                    <Route path="/routes" element={<RoutesPage />} />
                                    <Route path="/cash" element={<CashPage />} />
                                    <Route path="/reports" element={<ReportsPage />} />
                                    <Route element={<AdminRoute />}>
                                        <Route path="/admin" element={<AdminPage />} />
                                    </Route>
                                </Route>
                                
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </AuthProvider>
                </Router>
            </QueryClientProvider>
        </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
