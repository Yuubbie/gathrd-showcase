import { useCallback, useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ContactActions from '../components/ContactActions';

const STATUS_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  visited: 'Visited',
  converted: 'Converted',
  inactive: 'Inactive',
};

const STATUS_COLORS = {
  pending: 'bg-amberflag/10 text-amberflag',
  contacted: 'bg-signal-50 text-signal-deep',
  visited: 'bg-signal-50 text-signal-deep',
  converted: 'bg-sage-50 text-sage',
  inactive: 'bg-ink/5 text-ink/50',
};

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

export default function MyEvangelism() {
  const [form, setForm] = useState({ full_name: '', phone: '', notes: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('list_my_souls');
    if (rpcError || !data?.ok) {
      setError('Could not load your souls. Try again.');
      setRows([]);
    } else {
      setRows(Array.isArray(data.rows) ? data.rows : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc('add_personal_soul', {
      p_full_name: form.full_name,
      p_phone: form.phone || null,
      p_notes: form.notes || null,
    });
    setSaving(false);
    if (rpcError || !data?.ok) {
      setError('Could not save this person. Check the name and try again.');
      return;
    }
    setForm({ full_name: '', phone: '', notes: '' });
    setMessage(`${form.full_name} added. Follow them up from the list below.`);
    load();
  }

  async function updateStatus(id, status) {
    setUpdatingId(id);
    const { data } = await supabase.rpc('update_soul_follow_up', {
      p_id: id,
      p_status: status,
      p_follow_up_notes: null,
    });
    setUpdatingId(null);
    if (data?.ok) load();
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <HeartHandshake size={20} className="text-signal" />
          <h1 className="font-display text-xl font-bold text-ink">Souls I have won</h1>
        </div>
        <p className="text-ink/50 text-sm">Add people you led to Christ, then follow them up.</p>

        <form onSubmit={handleSubmit} className={`${CARD} p-5 space-y-3`}>
          <h2 className="text-sm font-semibold text-ink">Add a soul</h2>
          {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
          {message && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{message}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
              placeholder="Where you met them, prayer request…"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add soul'}
          </button>
        </form>

        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-semibold text-ink mb-3">Follow up</h2>
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No souls recorded yet.</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {rows.map((row) => (
                <div key={row.id} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{row.full_name}</p>
                      {row.notes && <p className="text-xs text-ink/50 mt-0.5">{row.notes}</p>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 font-medium h-fit ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <ContactActions phone={row.phone} name={row.full_name} />
                    <select
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(e) => updateStatus(row.id, e.target.value)}
                      className="border border-ink/10 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
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
