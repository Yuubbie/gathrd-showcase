import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Upload, CheckCircle2, History, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const FUNDS = [
  ['tithe', 'Tithe'],
  ['offering', 'Offering'],
  ['thanksgiving', 'Thanksgiving'],
  ['building_project', 'Building / Project'],
  ['welfare', 'Welfare'],
];

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 5 * 1024 * 1024;

function naira(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function statusChip(status) {
  if (status === 'verified') return 'bg-sage-50 text-sage';
  if (status === 'rejected') return 'bg-rose-50 text-rose';
  return 'bg-amberflag/10 text-amberflag';
}

function statusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function MemberGivingPage() {
  const { profile, church } = useAuth();
  const [tab, setTab] = useState('give');
  const [payload, setPayload] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [amount, setAmount] = useState('');
  const [fundType, setFundType] = useState('tithe');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [duplicateWarn, setDuplicateWarn] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadAccounts = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_my_church_give_accounts');
    if (rpcError || !data?.ok) {
      setPayload({ ok: false, accounts: [] });
      return;
    }
    setPayload(data);
    if (data.accounts?.length) setSelectedId(data.accounts[0].id);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data } = await supabase.rpc('get_my_bank_transfers');
    setHistory(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  }, []);

  async function copyNumber(number, id) {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError('Could not copy. Select the number and copy it by hand.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const nairaAmount = Number(amount);
    if (!nairaAmount || nairaAmount < 100) {
      setError('Enter an amount of at least ₦100.');
      return;
    }
    if (!selectedId) {
      setError('Select the church account you transferred to.');
      return;
    }
    if (!receiptFile) {
      setError('Upload a screenshot or PDF of the transfer.');
      return;
    }
    if (!ALLOWED_TYPES.includes(receiptFile.type)) {
      setError('Receipt must be a JPG, PNG, WEBP, or PDF.');
      return;
    }
    if (receiptFile.size > MAX_BYTES) {
      setError('Receipt must be 5 MB or smaller.');
      return;
    }

    setSubmitting(true);
    try {
      const ext = receiptFile.name.includes('.')
        ? receiptFile.name.split('.').pop().toLowerCase()
        : 'jpg';
      const path = `${profile.church_id}/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('giving-receipts')
        .upload(path, receiptFile, { contentType: receiptFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc('submit_bank_transfer', {
        p_amount: nairaAmount,
        p_fund_type: fundType,
        p_bank_account_id: selectedId,
        p_receipt_path: path,
        p_notes: null,
      });
      if (rpcError || !data?.ok) throw new Error(data?.error || rpcError?.message || 'submit_failed');

      setDuplicateWarn(Boolean(data.duplicate));
      setSubmitted(true);
      setAmount('');
      setReceiptFile(null);
    } catch (err) {
      setError('Could not save this transfer. Check the amount and receipt, then try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const accounts = payload?.accounts || [];
  const churchName = payload?.church_name || church?.name || 'your church';
  const selected = accounts.find((a) => a.id === selectedId) || null;
  const canManageBanks = ['senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin'].includes(profile?.role);

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Give to {churchName}</h1>
          <p className="text-ink/50 text-sm mt-1">
            Transfer to this church&apos;s own bank account. Your gift is confirmed only after the church verifies it.
          </p>
        </div>

        <div className="flex bg-ink/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('give')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg ${
              tab === 'give' ? 'bg-white text-ink shadow-sm' : 'text-ink/60'
            }`}
          >
            <Wallet size={14} /> Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('history');
              loadHistory();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg ${
              tab === 'history' ? 'bg-white text-ink shadow-sm' : 'text-ink/60'
            }`}
          >
            <History size={14} /> My giving
          </button>
        </div>

        {tab === 'give' ? (
          submitted ? (
            <div className={`${CARD} p-6 text-center space-y-3`}>
              <CheckCircle2 size={36} className="mx-auto text-sage" />
              <h2 className="font-display font-bold text-ink">Transfer recorded</h2>
              <p className="text-sm text-ink/60">
                Thank you. Finance still has to match this to the bank statement. Until then it stays Pending.
              </p>
              {duplicateWarn && (
                <p className="text-xs text-amberflag">
                  This looks similar to a transfer you already sent today. Finance will check before counting it twice.
                </p>
              )}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="bg-signal hover:bg-signal-deep text-white rounded-lg px-5 py-2.5 text-sm font-semibold"
              >
                Record another transfer
              </button>
            </div>
          ) : accounts.length === 0 ? (
            <div className={`${CARD} p-6 space-y-3`}>
              <p className="text-sm text-ink/70">
                {churchName} has not listed a bank account yet, so members cannot send an offering through Gathrd.
              </p>
              {canManageBanks ? (
                <Link
                  to="/giving/bank-accounts"
                  className="inline-block bg-signal hover:bg-signal-deep text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
                >
                  Add a bank account
                </Link>
              ) : (
                <p className="text-xs text-ink/50">Ask your pastor or finance admin to add one under Giving → Bank Accounts.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`${CARD} p-5 space-y-3`}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink/40">1. Church account</h2>
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <button
                      type="button"
                      key={acc.id}
                      onClick={() => setSelectedId(acc.id)}
                      className={`w-full text-left p-4 rounded-xl border ${
                        selectedId === acc.id ? 'border-signal bg-signal-50' : 'border-ink/10 bg-white'
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-signal-deep">{acc.label}</p>
                          <p className="font-bold text-ink mt-0.5">{acc.bank_name}</p>
                          <p className="text-xs text-ink/50 truncate">{acc.account_name}</p>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyNumber(acc.account_number, acc.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') copyNumber(acc.account_number, acc.id);
                          }}
                          className="flex items-center gap-1 text-xs bg-parchment px-3 py-1.5 rounded-lg font-medium shrink-0 h-fit"
                        >
                          {copiedId === acc.id ? <><Check size={13} className="text-sage" /> Copied</> : <><Copy size={13} /> Copy</>}
                        </span>
                      </div>
                      <p className="font-mono text-lg font-bold text-ink tracking-wider mt-2">{acc.account_number}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink/40">
                  Check the account name matches {churchName} before you send. Gathrd never holds this money.
                </p>
              </div>

              <form onSubmit={handleSubmit} className={`${CARD} p-5 space-y-3`}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink/40 flex items-center gap-2">
                  <Upload size={14} /> 2. Tell the church you sent it
                </h2>
                {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

                <div>
                  <label className="block text-sm font-medium mb-1">What is this for?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FUNDS.map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setFundType(value)}
                        className={`text-sm rounded-md px-3 py-2 border font-medium ${
                          fundType === value ? 'bg-signal text-white border-signal' : 'border-ink/15 text-ink/70'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount transferred (₦)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Transfer receipt (required)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-signal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-ink/40 mt-1">JPG, PNG, WEBP or PDF. 5 MB max.</p>
                </div>

                {selected && (
                  <p className="text-xs text-ink/50">
                    Sending to {selected.bank_name} · {selected.account_name}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Submit transfer'}
                </button>
              </form>
            </div>
          )
        ) : (
          <div className={`${CARD} p-5`}>
            {loadingHistory ? (
              <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-ink/40 text-sm py-6 text-center">No transfers recorded on this login yet.</p>
            ) : (
              <div className="divide-y">
                {history.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">
                        {FUNDS.find(([v]) => v === item.fund_type)?.[1] || item.fund_type} — {naira(item.amount)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {new Date(item.created_at).toLocaleString('en-NG')}
                        {item.account_label ? ` · ${item.account_label}` : ''}
                      </p>
                      {item.status === 'rejected' && item.rejection_reason && (
                        <p className="text-xs text-rose mt-1">Reason: {item.rejection_reason}</p>
                      )}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 font-medium h-fit ${statusChip(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
