import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ROLE_OPTIONS = [
  ['assistant_pastor', 'Assistant Pastor'],
  ['church_admin', 'Church Admin'],
  ['finance_admin', 'Finance Admin'],
  ['department_head', 'Department Head'],
  ['cell_leader', 'Cell Leader'],
  ['childrens_teacher', "Children's Teacher"],
  ['member', 'Member'],
];

export default function InviteStaff() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('church_admin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

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
        setMessage({ type: 'success', text: `Invite sent to ${email}. They'll get an email to set up their login.` });
        setEmail('');
        setFullName('');
        setRole('church_admin');
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Invite Staff</h1>
          <p className="text-ink/50 text-sm mt-1">
            Add pastors, admins, cell leaders, and other staff to your church. They'll get an email to set their own password — no need to share a login.
          </p>
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
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            >
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending invite…' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
