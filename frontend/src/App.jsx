import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PublicOnboard from './pages/PublicOnboard';
import Members from './pages/Members';
import MemberForm from './pages/MemberForm';

function CheckEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center bg-gray-50">
      <p className="text-gray-700">
        Account created. Check your email to confirm before logging in.
      </p>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center bg-gray-50">
      <p className="text-gray-700">You don't have access to this page.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/join/:slug" element={<PublicOnboard />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader']}>
                <Members />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members/new"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <MemberForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <MemberForm />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
