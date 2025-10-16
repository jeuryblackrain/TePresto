import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider.tsx';
import { ThemeProvider } from './contexts/ThemeProvider.tsx';
import { ToastProvider } from './contexts/ToastContext.ts';
import useAuth from './hooks/useAuth.ts';

import MainLayout from './components/layout/MainLayout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import LoansPage from './pages/LoansPage.tsx';
import LoanDetailPage from './pages/LoanDetailPage.tsx';
import ClientsPage from './pages/ClientsPage.tsx';
import ClientDetailPage from './pages/ClientDetailPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import RoutesPage from './pages/RoutesPage.tsx';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage.tsx';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage.tsx';
import { Role } from './types.ts';

/**
 * A protected route wrapper.
 * Checks if a user session exists. If it does, it renders the main application layout.
 * If not, it redirects the user to the login page.
 */
const ProtectedRoute: React.FC = () => {
  const { session } = useAuth();
  return session ? <MainLayout /> : <Navigate to="/login" replace />;
};

/**
 * An admin-only route wrapper.
 * Checks if the logged-in user has the 'admin' role.
 * If they do, it renders the nested admin routes. Otherwise, it redirects to the main dashboard.
 */
const AdminRoute: React.FC = () => {
  const { profile } = useAuth();
  return profile?.role === Role.ADMIN ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

/**
 * A protected route wrapper specifically for the Super Admin panel.
 * Checks for a flag in session storage to verify authentication.
 * If authenticated, it renders the nested routes. Otherwise, it redirects to the Super Admin login page.
 */
const SuperAdminProtectedRoute: React.FC = () => {
  const isAuthenticated = sessionStorage.getItem('superAdminAuth') === 'true';
  return isAuthenticated ? <Outlet /> : <Navigate to="/loginadmin" replace />;
};

/**
 * A wrapper for public routes like the login page.
 * If a user is already logged in, it redirects them to the dashboard,
 * preventing them from seeing the login page again.
 */
const PublicRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { session } = useAuth();
  return !session ? element : <Navigate to="/dashboard" replace />;
};


// The main App component that sets up providers and routing.
function App() {
  return (
    <ThemeProvider>
        <ToastProvider>
            <Router>
                <AuthProvider>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />

                        {/* Super Admin routes */}
                        <Route path="/loginadmin" element={<SuperAdminLoginPage />} />
                        <Route element={<SuperAdminProtectedRoute />}>
                            <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
                        </Route>

                        {/* Protected user routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/loans" element={<LoansPage />} />
                            <Route path="/loans/:loanId" element={<LoanDetailPage />} />
                            <Route path="/clients" element={<ClientsPage />} />
                            <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                            <Route path="/routes" element={<RoutesPage />} />
                            <Route path="/reports" element={<ReportsPage />} />
                            <Route element={<AdminRoute />}>
                                <Route path="/admin" element={<AdminPage />} />
                            </Route>
                        </Route>
                        
                        {/* Fallback route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </ToastProvider>
    </ThemeProvider>
  );
}

export default App;