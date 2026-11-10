import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { sendChurchPush } from '../lib/push';

export default function VisitorCheckIn() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', phone: '', address: '', how_heard: '', assigned_to: '',
  });
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadStaff() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('church_id', profile.church_id);
      if (data) setStaff(data);
    }
    loadStaff();
  }, [profile]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const { error } = await supabase.rpc('check_in_visitor', {
      p_church_id: profile.church_id,
      p_full_name: form.full_name,
      p_phone: form.phone || null,
      p_address: form.address || null,
      p_how_heard: form.how_heard || null,
      p_assigned_to: form.assigned_to || null,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(`${form.full_name} checked in! Follow-up assigned.`);
    if (form.assigned_to) {
      sendChurchPush(session, {
        title: 'Follow-up assigned',
        body: `${form.full_name} needs follow-up. Open Gathrd.`,
        url: '/follow-up',
        tag: 'follow-up',
        profile_ids: [form.assigned_to],
      });
    }
    setForm({ full_name: '', phone: '', address: '', how_heard: '', assigned_to: '' });
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Check In a Visitor</h1>
          <button type="button" onClick={() => navigate('/visitors')} className="text-sm text-signal font-semibold hover:text-signal-deep">
            View Log
          </button>
        </div>
        <p className="text-ink/50 text-sm -mt-2">
          Existing visitors are matched automatically by phone number.
        </p>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{success}</div>}

        <Field label="Full name" required>
          <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
        </Field>

        <Field label="Phone number">
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="Used to detect repeat visits" />
        </Field>

        <Field label="Address">
          <input value={form.address} onChange={(e) => update('address', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
        </Field>

        <Field label="How did they hear about the church?">
          <input value={form.how_heard} onChange={(e) => update('how_heard', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="Friend, social media, walk-in…" />
        </Field>

        <Field label="Assign follow-up to">
          <select value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
            ))}
          </select>
        </Field>

        <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
          {saving ? 'Checking in…' : 'Check In'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-rose">*</span>}
      </label>
      {children}
    </div>
  );
}
