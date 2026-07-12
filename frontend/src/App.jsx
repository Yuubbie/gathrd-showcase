import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PublicOnboard from './pages/PublicOnboard';
import Members from './pages/Members';
import MemberForm from './pages/MemberForm';
import VisitorCheckIn from './pages/VisitorCheckIn';
import VisitorLog from './pages/VisitorLog';
import DiscipleshipTracker from './pages/DiscipleshipTracker';
import GivingSettings from './pages/GivingSettings';
import GivingLog from './pages/GivingLog';
import CountingSheet from './pages/CountingSheet';
import PublicGive from './pages/PublicGive';
import GiveSuccess from './pages/GiveSuccess';
import MemberGivingHistory from './pages/MemberGivingHistory';
import TopGivers from './pages/TopGivers';
import Announcements from './pages/Announcements';
import Milestones from './pages/Milestones';
import CellGroups from './pages/CellGroups';
import CellGroupDetail from './pages/CellGroupDetail';
import FollowUpDashboard from './pages/FollowUpDashboard';
import Settings from './pages/Settings';
import Billing from './pages/Billing';

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
          <Route
            path="/visitors"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <VisitorLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitors/check-in"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <VisitorCheckIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discipleship"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <DiscipleshipTracker />
              </ProtectedRoute>
            }
          />
          <Route path="/give/:slug" element={<PublicGive />} />
          <Route path="/give/success" element={<GiveSuccess />} />
          <Route
            path="/giving"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'finance_admin']}>
                <GivingLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/giving/settings"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <GivingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/giving/counting"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'finance_admin']}>
                <CountingSheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/giving/top-givers"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'finance_admin']}>
                <TopGivers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members/:id/giving"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'finance_admin']}>
                <MemberGivingHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <Announcements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/milestones"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <Milestones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cell-groups"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader']}>
                <CellGroups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cell-groups/:id"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader']}>
                <CellGroupDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <FollowUpDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor']}>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
