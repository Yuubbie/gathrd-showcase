import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
