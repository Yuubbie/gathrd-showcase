import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { sendChurchPush } from '../lib/push';

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
}

function shiftISO(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

function formatMessageDate(iso) {
  if (!iso) return '';
  const today = todayISO();
  if (iso === today) return "Today's message";
  if (iso === shiftISO(today, -1)) return "Yesterday's message";
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const emptyForm = {
  service_date: todayISO(),
  title: '',
  summary: '',
  preacher_name: '',
  scripture: '',
};

export default function MediaDesk() {
  const { profile, session } = useAuth();
  const [rows, setRows] = useState([]);
  const [canPost, setCanPost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

  const today = todayISO();
  const yesterday = shiftISO(today, -1);
  const canInvite = ['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('list_message_highlights', { p_limit: 20 });
    if (rpcError || !data?.ok) {
      setError('Could not load message highlights.');
      setRows([]);
      setCanPost(false);
    } else {
      setError('');
      setCanPost(Boolean(data.can_post));
      setRows(Array.isArray(data.rows) ? data.rows : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function fillFromRow(row) {
    if (!row) return;
    setForm({
      service_date: row.service_date || today,
      title: row.title || '',
      summary: row.summary || '',
      preacher_name: row.preacher_name || '',
      scripture: row.scripture || '',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    const { data, error: rpcError } = await supabase.rpc('upsert_message_highlight', {
      p_service_date: form.service_date,
      p_title: form.title,
      p_summary: form.summary,
      p_preacher_name: form.preacher_name || null,
      p_scripture: form.scripture || null,
    });
    setSaving(false);
    if (rpcError || !data?.ok) {
      setError('Could not save this highlight. Check the title, summary, and date.');
      return;
    }
    setMessage('Saved. Everyone in the church can see this on Today.');
    sendChurchPush(session, {
      title: "Today's message",
      body: form.title || 'A new message highlight is ready in Gathrd.',
      url: '/media',
      tag: 'message-highlight',
    });
    load();
  }

  const selectedRow = useMemo(
    () => rows.find((r) => r.service_date === form.service_date),
    [rows, form.service_date]
  );

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-signal" />
              <h1 className="font-display text-xl font-bold text-ink">Message highlight</h1>
            </div>
            <p className="text-ink/50 text-sm mt-1">
              {canPost
                ? "Summarise the pastor's message so the church can read today's or yesterday's highlight."
                : "Read today's or yesterday's message highlight from the media team."}
            </p>
          </div>
          {canInvite && (
            <Link
              to="/team"
              className="text-xs text-signal font-semibold shrink-0"
            >
              Raise roles
            </Link>
          )}
        </div>

        {canPost && (
          <form onSubmit={handleSubmit} className={`${CARD} p-5 space-y-3`}>
            <h2 className="text-sm font-semibold text-ink">Media desk</h2>
            {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
            {message && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{message}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const existing = rows.find((r) => r.service_date === today);
                  setForm((f) => ({
                    ...f,
                    service_date: today,
                    title: existing?.title || '',
                    summary: existing?.summary || '',
                    preacher_name: existing?.preacher_name || '',
                    scripture: existing?.scripture || '',
                  }));
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border ${
                  form.service_date === today
                    ? 'border-signal bg-signal/5 text-signal-deep'
                    : 'border-ink/10 bg-white text-ink/70'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const existing = rows.find((r) => r.service_date === yesterday);
                  setForm((f) => ({
                    ...f,
                    service_date: yesterday,
                    title: existing?.title || '',
                    summary: existing?.summary || '',
                    preacher_name: existing?.preacher_name || '',
                    scripture: existing?.scripture || '',
                  }));
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold border ${
                  form.service_date === yesterday
                    ? 'border-signal bg-signal/5 text-signal-deep'
                    : 'border-ink/10 bg-white text-ink/70'
                }`}
              >
                Yesterday
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                placeholder="What God is saying"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scripture</label>
              <input
                value={form.scripture}
                onChange={(e) => setForm((f) => ({ ...f, scripture: e.target.value }))}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                placeholder="John 15:5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preacher</label>
              <input
                value={form.preacher_name}
                onChange={(e) => setForm((f) => ({ ...f, preacher_name: e.target.value }))}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                placeholder="Pastor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Summary</label>
              <textarea
                required
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={6}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                placeholder="Short recap the church can read after service."
              />
            </div>
            {selectedRow && (
              <p className="text-xs text-ink/40">
                Editing the highlight already posted for {formatMessageDate(form.service_date).toLowerCase()}.
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Publish highlight'}
            </button>
          </form>
        )}

        <div className={`${CARD} p-5`}>
          <h2 className="text-sm font-semibold text-ink mb-3">Recent highlights</h2>
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No message highlight yet.</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {rows.map((row) => (
                <div key={row.id} className="py-3 space-y-1">
                  <p className="text-xs text-signal font-semibold">{formatMessageDate(row.service_date)}</p>
                  <p className="text-sm font-semibold text-ink">{row.title}</p>
                  {row.scripture && <p className="text-xs text-ink/50">{row.scripture}</p>}
                  {row.preacher_name && <p className="text-xs text-ink/50">{row.preacher_name}</p>}
                  <p className="text-sm text-ink/70 whitespace-pre-wrap">{row.summary}</p>
                  {canPost && (
                    <button
                      type="button"
                      onClick={() => fillFromRow(row)}
                      className="text-xs text-signal font-semibold"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
