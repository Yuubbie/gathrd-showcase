import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const SERVICE_NAMES = ['Sunday Morning', 'Sunday Evening', 'Midweek', 'Special Service'];
const DENOMS = [1000, 500, 200, 100, 50];

const STATUS_STYLES = {
  open: 'bg-amberflag/10 text-amberflag',
  confirmed: 'bg-sage-50 text-sage',
  discrepancy: 'bg-rose-50 text-rose',
};

function naira(n) {
  return `₦${Number(n).toLocaleString()}`;
}

function denomTotal(counts) {
  return DENOMS.reduce((sum, d) => sum + d * (Number(counts?.[d]) || 0), 0);
}

export default function CountingSheet() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [entriesBySession, setEntriesBySession] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ service_name: SERVICE_NAMES[0], service_date: new Date().toISOString().slice(0, 10) });
  const [tallyInputs, setTallyInputs] = useState({});
  const [denomCounts, setDenomCounts] = useState({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const { data: sessionData } = await supabase
      .from('offering_counting_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    setSessions(sessionData || []);

    if (sessionData?.length) {
      const { data: entries } = await supabase
        .from('offering_counting_entries')
        .select('id, counting_session_id, tallied_amount, counted_by, submitted_at, profiles(full_name)')
        .in('counting_session_id', sessionData.map((s) => s.id));

      const grouped = {};
      for (const e of entries || []) {
        if (!grouped[e.counting_session_id]) grouped[e.counting_session_id] = [];
        grouped[e.counting_session_id].push(e);
      }
      setEntriesBySession(grouped);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSession(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.from('offering_counting_sessions').insert({
      church_id: profile.church_id,
      service_name: newForm.service_name,
      service_date: newForm.service_date,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setShowNew(false);
    load();
  }

  async function submitTally(sessionId) {
    const amount = tallyInputs[sessionId];
    if (!amount || Number(amount) < 0) {
      setError('Enter a valid tally amount.');
      return;
    }
    setError('');
    const { error } = await supabase.from('offering_counting_entries').insert({
      counting_session_id: sessionId,
      counted_by: profile.id,
      tallied_amount: Number(amount),
    });
    if (error) {
      setError(error.message);
      return;
    }
    setTallyInputs((t) => ({ ...t, [sessionId]: '' }));
    load();
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Offering Counting Sheets</h1>
          <button onClick={() => setShowNew((v) => !v)} className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
            + New Session
          </button>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

        {showNew && (
          <form onSubmit={createSession} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select value={newForm.service_name} onChange={(e) => setNewForm((f) => ({ ...f, service_name: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
                {SERVICE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={newForm.service_date} onChange={(e) => setNewForm((f) => ({ ...f, service_date: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <button type="submit" className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors">Create Session</button>
          </form>
        )}

        {loading ? (
          <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-ink/40 text-sm py-6 text-center">No counting sessions yet.</p>
        ) : (
          sessions.map((s) => {
            const entries = entriesBySession[s.id] || [];
            const isLocked = s.status === 'confirmed';
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm">{s.service_name} — {s.service_date}</p>
                    <p className="text-ink/50 text-xs">{entries.length} count{entries.length !== 1 ? 's' : ''} submitted</p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-1 font-medium ${STATUS_STYLES[s.status]}`}>
                    {s.status === 'confirmed' ? `Confirmed: ₦${Number(s.confirmed_amount).toLocaleString()}` :
                     s.status === 'discrepancy' ? '⚠ Discrepancy — counts don\'t match' : 'Awaiting counts'}
                  </span>
                </div>

                {entries.length > 0 && (
                  <div className="text-xs text-ink/60 space-y-1">
                    {entries.map((e) => (
                      <div key={e.id} className="flex justify-between">
                        <span>{e.profiles?.full_name || 'Counter'}</span>
                        <span>₦{Number(e.tallied_amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  <div className="space-y-3">
                    <div className="border border-ink/10 rounded-xl overflow-hidden text-xs">
                      <div className="grid grid-cols-3 bg-ink/5 p-2 font-bold text-ink/70">
                        <span>Denomination</span>
                        <span>Note count</span>
                        <span className="text-right">Subtotal</span>
                      </div>
                      {DENOMS.map((d) => {
                        const count = Number(denomCounts[s.id]?.[d]) || 0;
                        return (
                          <div key={d} className="grid grid-cols-3 p-2 items-center border-t border-ink/5">
                            <span>{naira(d)} notes</span>
                            <input
                              type="number"
                              min="0"
                              value={denomCounts[s.id]?.[d] ?? ''}
                              placeholder="0"
                              onChange={(e) => {
                                const next = { ...(denomCounts[s.id] || {}), [d]: e.target.value };
                                setDenomCounts((c) => ({ ...c, [s.id]: next }));
                              }}
                              onWheel={(e) => e.target.blur()}
                              className="w-20 border border-ink/10 rounded-md px-2 py-1 text-sm font-mono focus:border-signal outline-none"
                            />
                            <span className="text-right font-semibold">{naira(d * count)}</span>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-3 p-2 bg-ink/5 font-bold border-t border-ink/5">
                        <span>Cash total</span>
                        <span />
                        <span className="text-right text-signal">{naira(denomTotal(denomCounts[s.id]))}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTallyInputs((t) => ({ ...t, [s.id]: String(denomTotal(denomCounts[s.id])) }))}
                      className="text-xs text-signal font-semibold hover:text-signal-deep"
                    >
                      Use cash total as my tally
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Your tally (₦)"
                        value={tallyInputs[s.id] || ''}
                        onChange={(e) => setTallyInputs((t) => ({ ...t, [s.id]: e.target.value }))}
                        onWheel={(e) => e.target.blur()}
                        className="flex-1 border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
                      />
                      <button onClick={() => submitTally(s.id)} className="text-sm bg-ink hover:bg-void text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
                        Submit Count
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
