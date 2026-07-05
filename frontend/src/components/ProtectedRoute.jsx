import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from './AppShell';

/**
 * Wrap any page that requires login. Optionally restrict to specific roles.
 *
 * Usage:
 *   <ProtectedRoute><MemberRegistry /></ProtectedRoute>
 *   <ProtectedRoute allowedRoles={['senior_pastor','finance_admin']}>
 *     <BillingPage />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <AppShell>{children}</AppShell>;
}
