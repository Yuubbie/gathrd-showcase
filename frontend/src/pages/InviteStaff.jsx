import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const ALLOWED_ROLES = ROLE_OPTIONS.map(([v]) => v);

const SHORTCUTS = [
  { role: 'member', label: 'Member', hint: 'Login to see giving and attendance' },
  { role: 'church_admin', label: 'Admin', hint: 'Run the Sunday desk, including start and end attendance' },
  { role: 'finance_admin', label: 'Finance', hint: 'Count offering and verify transfers' },
  { role: 'department_head', label: 'Head of Department', hint: 'Lead one department' },
  { role: 'childrens_teacher', label: "Children's Teacher", hint: 'Children list and their attendance' },
  { role: 'media_team', label: 'Media Team', hint: "Post today's and yesterday's message highlight" },
  { role: 'assistant_pastor', label: 'Assistant Pastor', hint: 'Same desk as you, one church' },
  { role: 'senior_pastor', label: 'Senior Pastor', hint: 'Full access, same as you' },
];

export default function InviteStaff() {
  const { profile } = useAuth();
  const isTeacher = profile?.role === 'childrens_teacher';
  const isMedia = profile?.role === 'media_team';
  const canInviteSenior = profile?.role === 'senior_pastor';
  const visibleRoles = isTeacher
    ? ROLE_OPTIONS.filter(([v]) => v === 'childrens_teacher')
    : isMedia
      ? ROLE_OPTIONS.filter(([v]) => v === 'media_team')
      : ROLE_OPTIONS.filter(([v]) => v !== 'senior_pastor' || canInviteSenior);
  const visibleShortcuts = isTeacher
    ? SHORTCUTS.filter((s) => s.role === 'childrens_teacher')
    : isMedia
      ? SHORTCUTS.filter((s) => s.role === 'media_team')
      : SHORTCUTS.filter((s) => s.role !== 'senior_pastor' || canInviteSenior);
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const defaultRole = isTeacher
    ? 'childrens_teacher'
    : isMedia
      ? 'media_team'
      : (ALLOWED_ROLES.includes(roleFromUrl) ? roleFromUrl : 'member');
  const [role, setRole] = useState(defaultRole);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  function pickRole(nextRole) {
    const next = isTeacher ? 'childrens_teacher' : isMedia ? 'media_team' : nextRole;
    setRole(next);
    setSearchParams(next === 'member' ? {} : { role: next }, { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email, full_name: fullName, role }),
        }
      );
      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error || 'Something went wrong.' });
      } else {
        setMessage({
          type: 'success',
          text: result.message || `Invite sent to ${email}. They open the email, set a password, and land in your church. You do not share a login.`,
        });
        setEmail('');
        setFullName('');
        pickRole(isTeacher ? 'childrens_teacher' : isMedia ? 'media_team' : 'member');
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    }

    setSubmitting(false);
  }

  const roleLabel = ROLE_OPTIONS.find(([v]) => v === role)?.[1] || role;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Invite someone</h1>
          <p className="text-ink/50 text-sm mt-1">
            Prefer the church join link so everyone signs up as a member, then raise their role from Church logins. Use this only when you need to email one person a specific role.
          </p>
          {['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role) && (
            <Link to="/team" className="inline-block text-sm text-signal font-semibold mt-2">
              Copy join link / raise roles →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {visibleShortcuts.map((s) => (
            <button
              key={s.role}
              type="button"
              onClick={() => pickRole(s.role)}
              className={`text-left rounded-lg px-3.5 py-2.5 border transition-colors ${
                role === s.role
                  ? 'border-signal bg-signal/5'
                  : 'border-ink/10 bg-white hover:border-ink/20'
              }`}
            >
              <p className="text-sm font-semibold text-ink">{s.label}</p>
              <p className="text-xs text-ink/50">{s.hint}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
          {message && (
            <div className={`text-sm rounded-lg p-3 ${message.type === 'success' ? 'bg-sage-50 text-sage' : 'bg-rose-50 text-rose'}`}>
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">What they can do</label>
            <select
              value={role}
              onChange={(e) => pickRole(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            >
              {visibleRoles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending invite…' : `Send ${roleLabel} invite`}
          </button>

          <ol className="text-xs text-ink/50 space-y-1 list-decimal list-inside">
            <li>They get an email from Gathrd.</li>
            <li>They tap the link and choose a password.</li>
            <li>They log in and see this church — not a new one.</li>
          </ol>
        </form>
      </div>
    </div>
  );
}
