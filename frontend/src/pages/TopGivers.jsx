import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TopGivers() {
  const { profile } = useAuth();
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    const { data } = await supabase
      .from('giving_records')
      .select('member_id, amount, members(id, full_name, phone)')
      .eq('status', 'success')
      .not('member_id', 'is', null)
      .gte('given_at', from)
      .lte('given_at', `${to}T23:59:59`);

    const grouped = {};
    for (const r of data || []) {
      if (!r.member_id) continue;
      if (!grouped[r.member_id]) {
        grouped[r.member_id] = { member: r.members, total: 0, count: 0 };
      }
      grouped[r.member_id].total += Number(r.amount);
      grouped[r.member_id].count += 1;
    }

    const sorted = Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 20);
    setRanking(sorted);
    setLoading(false);
  }, [profile, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Top Givers</h1>
          <Link to="/giving" className="text-sm text-signal font-semibold hover:text-signal-deep">← Back to Giving</Link>
        </div>

        <div className="bg-amberflag/10 border border-amberflag/20 rounded-lg p-3 text-xs text-amberflag">
          Visible to pastors and finance admin only. Handle this report with discretion.
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
          </div>

          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : ranking.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">
              No linked gifts in this period. Only gifts linked to a member record (via cash entry or matched phone number) appear here.
            </p>
          ) : (
            <div className="divide-y">
              {ranking.map((r, i) => (
                <div key={r.member?.id || i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-ink/40 w-5">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{r.member?.full_name || 'Unknown'}</p>
                      <p className="text-ink/50 text-xs">{r.count} gift{r.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">₦{r.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
