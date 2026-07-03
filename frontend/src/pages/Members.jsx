import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  new_convert: 'New Convert',
  worker: 'Worker',
  transferred_out: 'Transferred Out',
  deceased: 'Deceased',
};

export default function Members() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [onboardingSlug, setOnboardingSlug] = useState(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('members')
      .select('id, full_name, phone, email, status, cell_group_id, date_joined, source')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);
    if (search) query = query.ilike('full_name', `%${search}%`);

    const { data, error } = await query;
    if (!error) setMembers(data || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    async function loadSlug() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('onboarding_slug')
        .eq('id', profile.church_id)
        .single();
      if (data) setOnboardingSlug(data.onboarding_slug);
    }
    loadSlug();
  }, [profile]);

  const onboardingUrl = onboardingSlug
    ? `${window.location.origin}/join/${onboardingSlug}`
    : '';

  function exportCsv() {
    const headers = ['Full Name', 'Phone', 'Email', 'Status', 'Date Joined', 'Source'];
    const rows = members.map((m) => [
      m.full_name, m.phone || '', m.email || '',
      STATUS_LABELS[m.status] || m.status, m.date_joined, m.source,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gathrd-members.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Members</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite((v) => !v)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 font-medium"
            >
              Invite Members
            </button>
            <Link
              to="/members/new"
              className="text-sm bg-indigo-600 text-white rounded-md px-3 py-1.5 font-medium"
            >
              + Add Member
            </Link>
          </div>
        </div>

        {showInvite && onboardingUrl && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-600">
              Share this link or QR code — anyone who opens it can register
              themselves as a member, no login needed.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(onboardingUrl)}`}
                alt="Onboarding QR code"
                className="border rounded-lg"
                width={160}
                height={160}
              />
              <div className="flex-1 min-w-[200px]">
                <input
                  readOnly
                  value={onboardingUrl}
                  onClick={(e) => e.target.select()}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(onboardingUrl)}
                  className="mt-2 text-sm text-indigo-600 font-medium"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] border rounded-md px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 font-medium"
            >
              Export CSV
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">
              No members yet. Add one, or share the invite link above.
            </p>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/members/${m.id}/edit`)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-sm">{m.full_name}</p>
                    <p className="text-gray-500 text-xs">
                      {m.phone || m.email || 'No contact info'}
                      {m.source === 'self_onboarded' && (
                        <span className="ml-2 text-indigo-600">• self-registered</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                    {['senior_pastor', 'assistant_pastor', 'finance_admin'].includes(profile?.role) && (
                      <Link
                        to={`/members/${m.id}/giving`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-indigo-600 font-medium"
                      >
                        Giving →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
