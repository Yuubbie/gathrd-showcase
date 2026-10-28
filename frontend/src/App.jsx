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
import BankAccounts from './pages/BankAccounts';
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
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import Branches from './pages/Branches';
import BranchSignup from './pages/BranchSignup';
import DistrictDashboard from './pages/DistrictDashboard';
import PublicAttendanceCheckin from './pages/PublicAttendanceCheckin';
import ServiceAttendance from './pages/ServiceAttendance';
import Roster from './pages/Roster';
import ChurchCalendar from './pages/Calendar';
import InviteStaff from './pages/InviteStaff';
import SetPassword from './pages/SetPassword';
import ClaimAccount from './pages/ClaimAccount';
import AdminDashboard from './pages/AdminDashboard';
import MemberGivingPage from './pages/MemberGivingPage';
import TransferLog from './pages/TransferLog';
import Children from './pages/Children';

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
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/branch-signup/:token" element={<BranchSignup />} />
          <Route path="/district-dashboard" element={<DistrictDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/join/:slug" element={<PublicOnboard />} />
          <Route path="/checkin/:slug" element={<PublicAttendanceCheckin />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/claim/:slug" element={<ClaimAccount />} />
          <Route path="/admin" element={<AdminDashboard />} />

          <Route path="/give" element={<Navigate to="/give/me" replace />} />
          <Route path="/give/success" element={<GiveSuccess />} />
          <Route
            path="/give/me"
            element={
              <ProtectedRoute>
                <MemberGivingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/give/:slug" element={<PublicGive />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin']}>
                <ServiceAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roster"
            element={
              <ProtectedRoute>
                <Roster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <ChurchCalendar />
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
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher']}>
                <MemberForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher']}>
                <MemberForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher']}>
                <Children />
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
          <Route
            path="/giving"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'finance_admin']}>
                <GivingLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/giving/transfers"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin']}>
                <TransferLog />
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
            path="/giving/bank-accounts"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin']}>
                <BankAccounts />
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
            path="/team/invite"
            element={
              <ProtectedRoute allowedRoles={['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher']}>
                <InviteStaff />
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