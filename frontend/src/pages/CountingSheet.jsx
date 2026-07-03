import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const SERVICE_NAMES = ['Sunday Morning', 'Sunday Evening', 'Midweek', 'Special Service'];

const STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  discrepancy: 'bg-red-100 text-red-800',
};

export default function CountingSheet() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [entriesBySession, setEntriesBySession] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ service_name: SERVICE_NAMES[0], service_date: new Date().toISOString().slice(0, 10) });
  const [tallyInputs, setTallyInputs] = useState({});
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
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Offering Counting Sheets</h1>
          <button onClick={() => setShowNew((v) => !v)} className="text-sm bg-indigo-600 text-white rounded-md px-3 py-1.5 font-medium">
            + New Session
          </button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</div>}

        {showNew && (
          <form onSubmit={createSession} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select value={newForm.service_name} onChange={(e) => setNewForm((f) => ({ ...f, service_name: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base bg-white">
                {SERVICE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={newForm.service_date} onChange={(e) => setNewForm((f) => ({ ...f, service_date: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-base" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium">Create Session</button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm py-6 text-center">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No counting sessions yet.</p>
        ) : (
          sessions.map((s) => {
            const entries = entriesBySession[s.id] || [];
            const isLocked = s.status === 'confirmed';
            return (
              <div key={s.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm">{s.service_name} — {s.service_date}</p>
                    <p className="text-gray-500 text-xs">{entries.length} count{entries.length !== 1 ? 's' : ''} submitted</p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-1 font-medium ${STATUS_STYLES[s.status]}`}>
                    {s.status === 'confirmed' ? `Confirmed: ₦${Number(s.confirmed_amount).toLocaleString()}` :
                     s.status === 'discrepancy' ? '⚠ Discrepancy — counts don\'t match' : 'Awaiting counts'}
                  </span>
                </div>

                {entries.length > 0 && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {entries.map((e) => (
                      <div key={e.id} className="flex justify-between">
                        <span>{e.profiles?.full_name || 'Counter'}</span>
                        <span>₦{Number(e.tallied_amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Your tally (₦)"
                      value={tallyInputs[s.id] || ''}
                      onChange={(e) => setTallyInputs((t) => ({ ...t, [s.id]: e.target.value }))} onWheel={(e) => e.target.blur()}
                      className="flex-1 border rounded-md px-3 py-2 text-sm"
                    />
                    <button onClick={() => submitTally(s.id)} className="text-sm bg-gray-800 text-white rounded-md px-3 py-2 font-medium">
                      Submit Count
                    </button>
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
