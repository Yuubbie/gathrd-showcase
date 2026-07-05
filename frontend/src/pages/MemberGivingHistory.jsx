import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const CATEGORY_LABELS = {
  tithe: 'Tithe', offering: 'Offering', thanksgiving: 'Thanksgiving',
  building_project: 'Building / Project', welfare: 'Welfare',
};

function startOfYear() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function MemberGivingHistory() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [member, setMember] = useState(null);
  const [church, setChurch] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(startOfYear());
  const [to, setTo] = useState(today());

  const load = useCallback(async () => {
    setLoading(true);

    const { data: memberData } = await supabase
      .from('members')
      .select('id, full_name, phone, email')
      .eq('id', id)
      .single();
    setMember(memberData);

    if (profile?.church_id) {
      const { data: churchData } = await supabase
        .from('churches')
        .select('name')
        .eq('id', profile.church_id)
        .single();
      setChurch(churchData);
    }

    const { data } = await supabase
      .from('giving_records')
      .select('id, category, amount, payment_method, status, given_at')
      .eq('member_id', id)
      .eq('status', 'success')
      .gte('given_at', from)
      .lte('given_at', `${to}T23:59:59`)
      .order('given_at', { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }, [id, profile, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const total = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const byCategory = {};
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8 print:bg-white print:px-0 print:py-0">
      <div className="max-w-2xl mx-auto space-y-4 print:space-y-2">
        <div className="flex items-center justify-between print:hidden">
          <Link to="/members" className="text-sm text-signal font-semibold hover:text-signal-deep">← Back to Members</Link>
          <button onClick={() => window.print()} className="text-sm bg-ink hover:bg-void text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
            Print / Save Statement
          </button>
        </div>

        {/* Statement header — shows on screen and print */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 print:shadow-none print:rounded-none print:border-0">
          <div className="text-center mb-4 print:mb-6">
            <h1 className="text-lg font-semibold">{church?.name}</h1>
            <p className="text-sm text-ink/50">Giving Statement</p>
          </div>

          <div className="flex justify-between text-sm mb-4 print:mb-6">
            <div>
              <p className="font-medium">{member?.full_name}</p>
              <p className="text-ink/50">{member?.phone || member?.email || ''}</p>
            </div>
            <div className="text-right text-ink/50">
              <p>Period: {from} to {to}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 print:hidden">
            <div>
              <label className="block text-xs font-medium mb-1">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
          </div>

          {records.length === 0 ? (
            <p className="text-ink/40 text-sm text-center py-6">No gifts recorded in this period.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/50 border-b border-ink/10">
                    <th className="py-2">Date</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Method</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{new Date(r.given_at).toLocaleDateString()}</td>
                      <td className="py-2">{CATEGORY_LABELS[r.category]}</td>
                      <td className="py-2 capitalize">{r.payment_method}</td>
                      <td className="py-2 text-right">₦{Number(r.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t space-y-1">
                {Object.entries(byCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-sm text-ink/60">
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span>₦{amt.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-base pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>₦{total.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
