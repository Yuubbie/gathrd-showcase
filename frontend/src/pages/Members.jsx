import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';
import { PeopleTabs } from '../components/SectionTabs';

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
  // FIX: claim-account uses the same church slug — a member who already
  // registered (via this same QR or a manual add) uses this second link
  // to set up a login and see their own giving/attendance on Dashboard.
  const claimUrl = onboardingSlug
    ? `${window.location.origin}/claim/${onboardingSlug}`
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

  // FIX: a cell_leader's member list is RLS-scoped to their own cell
  // (cell_leader_read_own_cell_members in 0004_member_registry_rls.sql) —
  // an empty result for them means "no one in YOUR cell yet," not "the
  // church has zero members." The old copy didn't distinguish these, which
  // reads as broken/alarming to a leader whose church has plenty of members
  // they simply can't see from this screen.
  const isCellScopedView = profile?.role === 'cell_leader';
  const emptyStateMessage = isCellScopedView
    ? 'No members in your cell group yet.'
    : 'No members yet. Add one, or share the invite link above.';

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <PeopleTabs />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Members</h1>
          <div className="flex gap-2">
            {!isCellScopedView && (
              <button
                onClick={() => setShowInvite((v) => !v)}
                className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors"
              >
                Invite Members
              </button>
            )}
            <Link
              to="/members/new"
              className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors"
            >
              + Add Member
            </Link>
          </div>
        </div>

        {showInvite && onboardingUrl && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
            <p className="text-sm text-ink/60">
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
                  className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(onboardingUrl)}
                  className="mt-2 text-sm text-signal font-semibold hover:text-signal-deep"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        )}

        {showInvite && claimUrl && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-2">
            <p className="text-sm text-ink/60">
              Already-registered members use this link to set up a login and
              see their own giving and attendance history.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                readOnly
                value={claimUrl}
                onClick={(e) => e.target.select()}
                className="flex-1 min-w-[200px] border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment"
              />
              <button
                onClick={() => navigator.clipboard.writeText(claimUrl)}
                className="text-sm text-signal font-semibold hover:text-signal-deep"
              >
                Copy link
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors"
            >
              Export CSV
            </button>
          </div>

          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">
              {emptyStateMessage}
            </p>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/members/${m.id}/edit`)}
                  className="flex items-center justify-between py-3 hover:bg-parchment -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{m.full_name}</p>
                    <p className="text-ink/50 text-xs">
                      {m.phone || m.email || 'No contact info'}
                      {m.source === 'self_onboarded' && (
                        <span className="ml-2 text-signal">• self-registered</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ContactActions phone={m.phone} name={m.full_name} stopClick />
                    <span className="text-xs text-ink/40">
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                    {['senior_pastor', 'assistant_pastor', 'finance_admin'].includes(profile?.role) && (
                      <Link
                        to={`/members/${m.id}/giving`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-signal font-semibold"
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
