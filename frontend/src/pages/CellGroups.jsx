import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = {
  name: '', zone: '', meeting_day: 'Sunday', meeting_time: '', location: '', leader_profile_id: '',
};

export default function CellGroups() {
  const { profile, session } = useAuth();
  const [cellGroups, setCellGroups] = useState([]);
  const [staff, setStaff] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    const [{ data: cells }, { data: staffData }, { data: members }] = await Promise.all([
      supabase.from('cell_groups').select('*, profiles!cell_groups_leader_profile_id_fkey(full_name)').eq('church_id', profile.church_id).is('deleted_at', null),
      supabase.from('profiles').select('id, full_name, role').eq('church_id', profile.church_id),
      supabase.from('members').select('cell_group_id').eq('church_id', profile.church_id).is('deleted_at', null).eq('status', 'active'),
    ]);

    setCellGroups(cells || []);
    setStaff((staffData || []).filter((s) => ['cell_leader', 'senior_pastor', 'assistant_pastor', 'church_admin'].includes(s.role)));

    const counts = {};
    for (const m of members || []) {
      if (m.cell_group_id) counts[m.cell_group_id] = (counts[m.cell_group_id] || 0) + 1;
    }
    setMemberCounts(counts);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const { error } = await supabase.from('cell_groups').insert({
      church_id: profile.church_id,
      name: form.name,
      zone: form.zone || null,
      meeting_day: form.meeting_day,
      meeting_time: form.meeting_time || null,
      location: form.location || null,
      leader_profile_id: form.leader_profile_id || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function triggerReminders() {
    setSendingReminders(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-cell-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send reminders.');
      } else {
        setNotice(`Checked cell groups meeting today: ${data.sent} reminder(s) sent, ${data.skipped_already_reported} already reported.`);
      }
    } catch {
      setError('Could not reach the server.');
    }
    setSendingReminders(false);
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-display text-2xl font-bold text-ink">Cell Groups</h1>
          <div className="flex gap-2">
            <Link to="/follow-up" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Follow-Up Dashboard
            </Link>
            <button onClick={triggerReminders} disabled={sendingReminders} className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors disabled:opacity-50">
              {sendingReminders ? 'Checking…' : "Send Today's Reminders"}
            </button>
            <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
              + New Cell Group
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {notice && <div className="text-sm text-signal-deep bg-signal-50 rounded-lg p-3">{notice}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Cell group name</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Zone (for outreach mapping)</label>
              <input value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="e.g. Zone A, Lugbe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1.5">Meeting day</label>
                <select value={form.meeting_day} onChange={(e) => setForm((f) => ({ ...f, meeting_day: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white">
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1.5">Meeting time</label>
                <input value={form.meeting_time} onChange={(e) => setForm((f) => ({ ...f, meeting_time: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="e.g. 6:00 PM" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Location</label>
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Cell leader</label>
              <select value={form.leader_profile_id} onChange={(e) => setForm((f) => ({ ...f, leader_profile_id: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
              </select>
              <p className="text-xs text-ink/40 mt-1">
                Only staff with the "Cell Group Leader" role can submit weekly reports. Assign that role first from an invited account.
              </p>
            </div>
            <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Cell Group'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : cellGroups.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No cell groups yet.</p>
          ) : (
            <div className="divide-y">
              {cellGroups.map((c) => (
                <Link key={c.id} to={`/cell-groups/${c.id}`} className="flex items-center justify-between py-3 hover:bg-parchment -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium text-sm text-ink">{c.name}</p>
                    <p className="text-ink/50 text-xs">
                      {c.zone ? `${c.zone} • ` : ''}{c.meeting_day}{c.meeting_time ? ` ${c.meeting_time}` : ''} • Led by {c.profiles?.full_name || 'Unassigned'}
                    </p>
                  </div>
                  <span className="text-xs text-ink/40">{memberCounts[c.id] || 0} members</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
