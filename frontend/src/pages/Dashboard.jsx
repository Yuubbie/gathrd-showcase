import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Week 1 placeholder. The real unified pastor dashboard is Week 8
// (Blueprint Section 12) — this just proves auth + roles work end to end.
export default function Dashboard() {
  const { profile, signOut } = useAuth();

  const roleLabels = {
    senior_pastor: 'Senior Pastor',
    assistant_pastor: 'Assistant Pastor',
    church_admin: 'Church Admin',
    finance_admin: 'Finance Admin',
    department_head: 'Department Head',
    cell_leader: 'Cell Group Leader',
    childrens_teacher: "Children's Ministry Teacher",
    member: 'Church Member',
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold">Welcome{profile ? `, ${profile.full_name}` : ''}</h1>
        <p className="text-gray-600 text-sm">
          Role: <span className="font-medium">{roleLabels[profile?.role] ?? '—'}</span>
        </p>
        <p className="text-gray-400 text-xs">
          Members, Visitor Log, and Discipleship Tracker are live.
          The full unified dashboard is coming as more modules ship.
        </p>
        <Link
          to="/members"
          className="block w-full text-center bg-indigo-600 text-white rounded-md py-2 text-sm font-medium"
        >
          Go to Members
        </Link>
        <Link
          to="/visitors"
          className="block w-full text-center border border-gray-300 rounded-md py-2 text-sm font-medium"
        >
          Visitor Log
        </Link>
        <Link
          to="/discipleship"
          className="block w-full text-center border border-gray-300 rounded-md py-2 text-sm font-medium"
        >
          Discipleship Tracker
        </Link>
        {['senior_pastor', 'assistant_pastor', 'finance_admin'].includes(profile?.role) && (
          <Link
            to="/giving"
            className="block w-full text-center border border-gray-300 rounded-md py-2 text-sm font-medium"
          >
            Giving
          </Link>
        )}
        {['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role) && (
          <>
            <Link
              to="/announcements"
              className="block w-full text-center border border-gray-300 rounded-md py-2 text-sm font-medium"
            >
              Announcements
            </Link>
            <Link
              to="/milestones"
              className="block w-full text-center border border-gray-300 rounded-md py-2 text-sm font-medium"
            >
              Birthdays & Milestones
            </Link>
          </>
        )}
        <button
          onClick={signOut}
          className="w-full border border-gray-300 rounded-md py-2 text-sm font-medium"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
