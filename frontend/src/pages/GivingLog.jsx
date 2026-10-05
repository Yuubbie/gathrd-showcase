import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  ['tithe', 'Tithe'],
  ['offering', 'Offering'],
  ['thanksgiving', 'Thanksgiving'],
  ['building_project', 'Building / Project'],
  ['welfare', 'Welfare'],
];

const emptyForm = {
  category: 'tithe', amount: '', member_id: '', given_by_name: '', given_by_phone: '',
  tithe_card_number: '', notes: '',
};

export default function GivingLog() {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('members')
        .select('id, full_name, phone')
        .eq('church_id', profile.church_id)
        .is('deleted_at', null)
        .order('full_name');
      setMembers(data || []);
    }
    loadMembers();
  }, [profile]);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('giving_records')
      .select('id, category, amount, payment_method, source, status, given_by_name, given_at, tithe_card_number')
      .is('deleted_at', null)
      .order('given_at', { ascending: false })
      .limit(100);

    setRecords(data || []);

    const t = {};
    for (const [cat] of CATEGORIES) t[cat] = 0;
    for (const r of data || []) {
      if (r.status === 'success') t[r.category] = (t[r.category] || 0) + Number(r.amount);
    }
    setTotals(t);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddCash(e) {
    e.preventDefault();
    setError('');
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('giving_records').insert({
      church_id: profile.church_id,
      member_id: form.member_id || null,
      category: form.category,
      amount: Number(form.amount),
      payment_method: 'cash',
      source: 'manual',
      status: 'success',
      given_by_name: form.given_by_name || null,
      given_by_phone: form.given_by_phone || null,
      tithe_card_number: form.tithe_card_number || null,
      notes: form.notes || null,
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

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  function exportCsv() {
    const headers = ['Date', 'Category', 'Amount', 'Payment Method', 'Source', 'Status', 'Given By'];
    const rows = records.map((r) => [
      r.given_at, CATEGORIES.find(([v]) => v === r.category)?.[1] || r.category,
      r.amount, r.payment_method, r.source, r.status, r.given_by_name || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gathrd-giving.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-semibold">Giving</h1>
          {/* FIX: added flex-wrap — this row had 5 buttons with no wrap
              allowed, which at a ~344px mobile width forced horizontal
              scroll on the whole page instead of the buttons just
              stacking onto a second line. */}
          <div className="flex flex-wrap gap-2">
            <Link to="/giving/top-givers" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Top Givers
            </Link>
            <Link to="/giving/counting" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Counting Sheets
            </Link>
            <Link to="/giving/bank-accounts" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Bank Accounts
            </Link>
            <Link to="/giving/settings" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Settings
            </Link>
            <button onClick={exportCsv} className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment transition-colors">
              Export CSV
            </button>
            <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
              + Record Cash Gift
            </button>
          </div>
        </div>

        {/* Category totals */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          <p className="text-xs text-ink/50 mb-2">Totals (successful gifts shown, last 100 records)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(([value, label]) => (
              <div key={value} className="bg-parchment rounded-lg p-3">
                <p className="text-xs text-ink/50">{label}</p>
                <p className="text-sm font-semibold">₦{(totals[value] || 0).toLocaleString()}</p>
              </div>
            ))}
            <div className="bg-signal-50 rounded-lg p-3">
              <p className="text-xs text-signal">Total</p>
              <p className="text-sm font-semibold text-signal-deep">₦{grandTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleAddCash} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Record a Cash Gift</h2>
            {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₦)</label>
              <input type="number" required min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} onWheel={(e) => e.target.blur()} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Link to a member (optional)</label>
              <select
                value={form.member_id}
                onChange={(e) => {
                  const m = members.find((x) => x.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    member_id: e.target.value,
                    given_by_name: m ? m.full_name : f.given_by_name,
                  }));
                }}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              >
                <option value="">Not linked — anonymous / free text below</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}{m.phone ? ` (${m.phone})` : ''}</option>
                ))}
              </select>
              <p className="text-xs text-ink/40 mt-1">Linking lets this gift show in the member's giving history.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Giver's name (optional)</label>
              <input value={form.given_by_name} onChange={(e) => setForm((f) => ({ ...f, given_by_name: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tithe card number (optional)</label>
              <input value={form.tithe_card_number} onChange={(e) => setForm((f) => ({ ...f, tithe_card_number: e.target.value }))} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Gift'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : records.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No giving records yet.</p>
          ) : (
            <div className="divide-y">
              {records.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">
                      {CATEGORIES.find(([v]) => v === r.category)?.[1] || r.category} — ₦{Number(r.amount).toLocaleString()}
                    </p>
                    <p className="text-ink/50 text-xs">
                      {r.given_by_name || 'Anonymous'} • {r.payment_method} • {new Date(r.given_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-1 font-medium ${
                    r.status === 'success' ? 'bg-sage-50 text-sage' :
                    r.status === 'pending' ? 'bg-amberflag/10 text-amberflag' : 'bg-rose-50 text-rose'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
