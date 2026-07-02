import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function VisitorCheckIn() {
  const { profile } = useAuth();
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
    setForm({ full_name: '', phone: '', address: '', how_heard: '', assigned_to: '' });
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Check In a Visitor</h1>
          <button type="button" onClick={() => navigate('/visitors')} className="text-sm text-indigo-600 font-medium">
            View Log
          </button>
        </div>
        <p className="text-gray-500 text-sm -mt-2">
          Existing visitors are matched automatically by phone number.
        </p>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</div>}
        {success && <div className="text-sm text-green-700 bg-green-50 rounded-md p-2">{success}</div>}

        <Field label="Full name" required>
          <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" />
        </Field>

        <Field label="Phone number">
          <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" placeholder="Used to detect repeat visits" />
        </Field>

        <Field label="Address">
          <input value={form.address} onChange={(e) => update('address', e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" />
        </Field>

        <Field label="How did they hear about the church?">
          <input value={form.how_heard} onChange={(e) => update('how_heard', e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" placeholder="Friend, social media, walk-in…" />
        </Field>

        <Field label="Assign follow-up to">
          <select value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)} className="w-full border rounded-md px-3 py-2 text-base bg-white">
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
            ))}
          </select>
        </Field>

        <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium disabled:opacity-50">
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
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
