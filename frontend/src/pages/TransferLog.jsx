import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { GivingTabs } from '../components/SectionTabs';

const FUNDS = [
  ['tithe', 'Tithe'],
  ['offering', 'Offering'],
  ['thanksgiving', 'Thanksgiving'],
  ['building_project', 'Building / Project'],
  ['welfare', 'Welfare'],
];

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

function naira(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function fundLabel(value) {
  return FUNDS.find(([v]) => v === value)?.[1] || value;
}

function statusChip(status) {
  if (status === 'verified') return 'bg-sage-50 text-sage';
  if (status === 'rejected') return 'bg-rose-50 text-rose';
  return 'bg-amberflag/10 text-amberflag';
}

export default function TransferLog() {
  const [payload, setPayload] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('get_church_bank_transfers');
    if (rpcError || !data?.ok) {
      setError('Could not load transfers for this church.');
      setPayload(null);
      return;
    }
    setError('');
    setPayload(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = (payload?.rows || []).filter((r) => (filter === 'all' ? true : r.status === filter));

  const totals = {};
  for (const [cat] of FUNDS) totals[cat] = 0;
  for (const r of payload?.rows || []) {
    if (r.status === 'verified') totals[r.fund_type] = (totals[r.fund_type] || 0) + Number(r.amount);
  }
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  async function review(id, action, rejectReason) {
    setBusyId(id);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('review_bank_transfer', {
      p_id: id,
      p_action: action,
      p_reason: rejectReason || null,
    });
    setBusyId(null);
    if (rpcError || !data?.ok) {
      setError(data?.error === 'reason' ? 'Enter a reason of at least 3 characters.' : 'Could not update this transfer.');
      return;
    }
    setRejectId(null);
    setReason('');
    await load();
  }

  async function openReceipt(path) {
    if (!path) return;
    const { data, error: signError } = await supabase.storage
      .from('giving-receipts')
      .createSignedUrl(path, 60);
    if (signError || !data?.signedUrl) {
      setError('Could not open this receipt.');
      return;
    }
    setReceiptUrl(data.signedUrl);
    setReceiptOpen(true);
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <GivingTabs />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Bank transfers</h1>
            <p className="text-ink/50 text-sm mt-1">
              Verify gifts only after you see them in this church&apos;s bank account. Nothing is confirmed until you do.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/give/me" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold">
              Give
            </Link>
            <Link to="/giving" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold">
              Cash log
            </Link>
            <Link to="/giving/bank-accounts" className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold">
              Bank accounts
            </Link>
          </div>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

        <div className={`${CARD} p-5`}>
          <p className="text-xs text-ink/50 mb-2">Verified totals (this church only)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FUNDS.map(([value, label]) => (
              <div key={value} className="bg-parchment rounded-lg p-3">
                <p className="text-xs text-ink/50">{label}</p>
                <p className="text-sm font-semibold">{naira(totals[value])}</p>
              </div>
            ))}
            <div className="bg-signal-50 rounded-lg p-3">
              <p className="text-xs text-signal">Verified total</p>
              <p className="text-sm font-semibold text-signal-deep">{naira(grand)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['pending', 'verified', 'rejected', 'all'].map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm rounded-full px-3 py-1.5 font-semibold capitalize ${
                filter === key ? 'bg-signal text-white' : 'bg-white border border-ink/10 text-ink/70'
              }`}
            >
              {key}
              {key === 'pending' && payload ? ` (${payload.pending_count || 0})` : ''}
            </button>
          ))}
        </div>

        <div className={`${CARD} p-5`}>
          {!payload ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No transfers in this view.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="py-4 space-y-2">
                  <div className="flex justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">
                        {fundLabel(r.fund_type)} — {naira(r.amount)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {r.given_by_name || 'Member'} {r.given_by_phone ? `· ${r.given_by_phone}` : ''} ·{' '}
                        {new Date(r.created_at).toLocaleString('en-NG')}
                      </p>
                      <p className="text-xs text-ink/40">
                        {r.account_label} {r.bank_name ? `· ${r.bank_name}` : ''}
                      </p>
                      {r.rejection_reason && <p className="text-xs text-rose mt-1">Reason: {r.rejection_reason}</p>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-1 font-medium h-fit capitalize ${statusChip(r.status)}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.receipt_path && (
                      <button
                        type="button"
                        onClick={() => openReceipt(r.receipt_path)}
                        className="text-xs border border-ink/15 rounded-lg px-3 py-1.5 font-semibold"
                      >
                        View receipt
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => review(r.id, 'verified')}
                          className="text-xs bg-sage text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectId(r.id);
                            setReason('');
                          }}
                          className="text-xs bg-rose text-white rounded-lg px-3 py-1.5 font-semibold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                  {rejectId === r.id && (
                    <div className="space-y-2">
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        placeholder="Why is this rejected?"
                        className="w-full border border-ink/10 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => review(r.id, 'rejected', reason)}
                        className="text-xs bg-rose text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {receiptOpen && (
        <div className="fixed inset-0 z-50 bg-void/60 flex items-center justify-center p-4" onClick={() => setReceiptOpen(false)}>
          <div className={`${CARD} max-w-lg w-full p-3`} onClick={(e) => e.stopPropagation()}>
            {receiptUrl.endsWith('.pdf') || receiptUrl.includes('application/pdf') ? (
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-signal font-semibold">
                Open PDF receipt
              </a>
            ) : (
              <img src={receiptUrl} alt="Transfer receipt" className="w-full rounded-lg" />
            )}
            <button type="button" onClick={() => setReceiptOpen(false)} className="mt-3 text-sm text-ink/60">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
