import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// Common Nigerian banks with their Paystack bank codes.
// Full list is available from Paystack's List Banks endpoint if
// you need to expand this later.
const NIGERIAN_BANKS = [
  ['044', 'Access Bank'],
  ['023', 'Citibank Nigeria'],
  ['050', 'Ecobank Nigeria'],
  ['070', 'Fidelity Bank'],
  ['011', 'First Bank of Nigeria'],
  ['214', 'First City Monument Bank'],
  ['058', 'Guaranty Trust Bank'],
  ['030', 'Heritage Bank'],
  ['301', 'Jaiz Bank'],
  ['082', 'Keystone Bank'],
  ['076', 'Polaris Bank'],
  ['221', 'Stanbic IBTC Bank'],
  ['068', 'Standard Chartered Bank'],
  ['232', 'Sterling Bank'],
  ['100', 'Suntrust Bank'],
  ['032', 'Union Bank of Nigeria'],
  ['033', 'United Bank For Africa'],
  ['215', 'Unity Bank'],
  ['035', 'Wema Bank'],
  ['057', 'Zenith Bank'],
  ['50515', 'Moniepoint MFB'],
  ['999992', 'Opay'],
  ['999991', 'Palmpay'],
  ['090405', 'Kuda Bank'],
];

export default function GivingSettings() {
  const { profile, session } = useAuth();
  const [church, setChurch] = useState(null);
  const [form, setForm] = useState({ bank_code: '', account_number: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('id, name, settlement_bank_code, settlement_bank_name, settlement_account_number, settlement_account_name, paystack_subaccount_code, giving_slug')
        .eq('id', profile.church_id)
        .single();
      if (data) {
        setChurch(data);
        setForm({
          bank_code: data.settlement_bank_code || '',
          account_number: data.settlement_account_number || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  async function saveBankDetails(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const bankName = NIGERIAN_BANKS.find(([code]) => code === form.bank_code)?.[1] || '';

    const { error } = await supabase
      .from('churches')
      .update({
        settlement_bank_code: form.bank_code,
        settlement_bank_name: bankName,
        settlement_account_number: form.account_number,
      })
      .eq('id', profile.church_id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess('Bank details saved. Now click "Activate Online Giving" below.');
    setChurch((c) => ({ ...c, settlement_bank_code: form.bank_code, settlement_bank_name: bankName, settlement_account_number: form.account_number }));
  }

  async function activateGiving() {
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subaccount`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setCreating(false);
        return;
      }

      setSuccess(`Online giving activated! Payments will settle to ${data.account_name}.`);
      setChurch((c) => ({ ...c, paystack_subaccount_code: data.subaccount_code, settlement_account_name: data.account_name }));
    } catch (err) {
      setError('Could not reach the server. Try again.');
    }
    setCreating(false);
  }

  const givingUrl = church ? `${window.location.origin}/give/${church.giving_slug}` : '';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Giving Settings</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {success && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{success}</div>}

        <form onSubmit={saveBankDetails} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink/80">1. Settlement Bank Account</h2>
          <p className="text-xs text-ink/50 -mt-2">
            All online giving (Tithe, Offering, Thanksgiving, Building/Project, Welfare) settles to this one account.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">Bank</label>
            <select
              required
              value={form.bank_code}
              onChange={(e) => setForm((f) => ({ ...f, bank_code: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            >
              <option value="">Select your bank…</option>
              {NIGERIAN_BANKS.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Account Number</label>
            <input
              required
              value={form.account_number}
              onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
              placeholder="10-digit account number"
              maxLength={10}
            />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-ink hover:bg-void text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Bank Details'}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink/80">2. Activate Online Giving</h2>

          {church?.paystack_subaccount_code ? (
            <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">
              ✓ Online giving is active. Payments settle directly to {church.settlement_account_name} ({church.settlement_bank_name}).
            </div>
          ) : (
            <>
              <p className="text-xs text-ink/50">
                This connects your bank account to Paystack so gifts settle directly to you — Gathrd never holds your money.
              </p>
              <button
                onClick={activateGiving}
                disabled={creating || !church?.settlement_bank_code}
                className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
              >
                {creating ? 'Activating…' : 'Activate Online Giving'}
              </button>
            </>
          )}
        </div>

        {church?.paystack_subaccount_code && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-3">
            <h2 className="text-sm font-semibold text-ink/80">3. Your Give QR Code & Link</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(givingUrl)}`}
                alt="Give QR code"
                className="border rounded-lg"
                width={160}
                height={160}
              />
              <div className="flex-1 min-w-[200px]">
                <input readOnly value={givingUrl} onClick={(e) => e.target.select()} className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment" />
                <button onClick={() => navigator.clipboard.writeText(givingUrl)} className="mt-2 text-sm text-signal font-semibold hover:text-signal-deep">
                  Copy link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
