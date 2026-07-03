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
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Top Givers</h1>
          <Link to="/giving" className="text-sm text-indigo-600 font-medium">← Back to Giving</Link>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
          Visible to pastors and finance admin only. Handle this report with discretion.
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-md px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-md px-2 py-1 text-sm" />
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">Loading…</p>
          ) : ranking.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">
              No linked gifts in this period. Only gifts linked to a member record (via cash entry or matched phone number) appear here.
            </p>
          ) : (
            <div className="divide-y">
              {ranking.map((r, i) => (
                <div key={r.member?.id || i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-400 w-5">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{r.member?.full_name || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs">{r.count} gift{r.count !== 1 ? 's' : ''}</p>
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
