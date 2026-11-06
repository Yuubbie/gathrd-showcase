import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  ['member', 'Member'],
  ['church_admin', 'Admin'],
  ['finance_admin', 'Finance'],
  ['department_head', 'Head of Department'],
  ['childrens_teacher', "Children's Teacher"],
  ['media_team', 'Media Team'],
  ['cell_leader', 'Cell Leader'],
  ['assistant_pastor', 'Assistant Pastor'],
  ['senior_pastor', 'Senior Pastor'],
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS);

const ERROR_TEXT = {
  cannot_change_own_role: 'You cannot change your own role.',
  only_senior_pastor: 'Only a Senior Pastor can grant or remove Senior Pastor.',
  last_senior_pastor: 'This church needs at least one Senior Pastor.',
  not_found: 'That login is not in this church.',
  forbidden: 'You do not have permission to change roles.',
  bad_role: 'That role is not available.',
};

export default function TeamRoles() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [canGrantSenior, setCanGrantSenior] = useState(false);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [joinUrl, setJoinUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_church_logins');
    if (error || !data?.ok) {
      setMessage({ type: 'error', text: 'Could not load church logins.' });
      setRows([]);
    } else {
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setCanGrantSenior(Boolean(data.can_grant_senior));
      setMe(data.me);
      setMessage(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function loadSlug() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('onboarding_slug')
        .eq('id', profile.church_id)
        .single();
      if (data?.onboarding_slug) {
        setJoinUrl(`${window.location.origin}/join/${data.onboarding_slug}`);
      }
    }
    loadSlug();
  }, [profile]);

  async function copyJoin() {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function changeRole(userId, nextRole) {
    setSavingId(userId);
    setMessage(null);
    const { data, error } = await supabase.rpc('set_church_member_role', {
      p_user_id: userId,
      p_role: nextRole,
    });
    setSavingId(null);
    if (error || !data?.ok) {
      setMessage({
        type: 'error',
        text: ERROR_TEXT[data?.error] || 'Could not update that role.',
      });
      return;
    }
    setRows((list) => list.map((row) => (row.id === userId ? { ...row, role: nextRole } : row)));
    setMessage({ type: 'success', text: 'Role updated. They will see it on their next refresh.' });
  }

  const visibleRoles = ROLE_OPTIONS.filter(([value]) => value !== 'senior_pastor' || canGrantSenior);
  const filteredRows = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${row.full_name} ${row.email || ''} ${ROLE_LABELS[row.role] || row.role}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Church logins</h1>
          <p className="text-ink/50 text-sm mt-1">
            Share one join link. Everyone signs up as a member. Then raise their role here.
          </p>
        </div>

        {joinUrl && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
            <p className="text-sm font-semibold text-ink">Church join link</p>
            <p className="text-sm text-ink/60">Send this to the whole church. They set their own password and log in as members.</p>
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(joinUrl)}`}
                alt="Church join QR code"
                className="border rounded-lg"
                width={160}
                height={160}
              />
              <div className="flex-1 min-w-[200px]">
                <input
                  readOnly
                  value={joinUrl}
                  onClick={(e) => e.target.select()}
                  className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment"
                />
                <button
                  onClick={copyJoin}
                  className="mt-2 text-sm text-signal font-semibold hover:text-signal-deep"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={`text-sm rounded-lg p-3 ${message.type === 'success' ? 'bg-sage-50 text-sage' : 'bg-rose-50 text-rose'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {rows.length > 6 && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full mb-3 border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment focus:border-signal focus:ring-1 focus:ring-signal outline-none"
            />
          )}
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No logins yet. Share the join link above.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No logins match that search.</p>
          ) : (
            <div className="divide-y">
              {filteredRows.map((row) => {
                const isMe = row.id === me;
                const options = visibleRoles.filter(([value]) => value !== 'senior_pastor' || canGrantSenior || row.role === 'senior_pastor');
                return (
                  <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {row.full_name}
                        {isMe ? ' (you)' : ''}
                      </p>
                      <p className="text-ink/50 text-xs truncate">{row.email || 'No email'}</p>
                    </div>
                    {isMe || (row.role === 'senior_pastor' && !canGrantSenior) ? (
                      <span className="text-xs text-ink/50 shrink-0">{ROLE_LABELS[row.role] || row.role}</span>
                    ) : (
                      <select
                        value={row.role}
                        disabled={savingId === row.id}
                        onChange={(e) => changeRole(row.id, e.target.value)}
                        className="border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                      >
                        {(row.role === 'senior_pastor' && !options.some(([v]) => v === 'senior_pastor')
                          ? [['senior_pastor', 'Senior Pastor'], ...options]
                          : options
                        ).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-ink/40">
          Need to send an email invite instead?{' '}
          <Link to="/team/invite" className="text-signal font-semibold">Invite by email</Link>
        </p>
      </div>
    </div>
  );
}
