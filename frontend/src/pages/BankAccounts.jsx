import { useState, useEffect, useCallback } from 'react';
import { Copy, Plus, Pencil, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';
import BackButton from '../components/BackButton';

const BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank',
  'Guaranty Trust Bank',
  'Heritage Bank',
  'Jaiz Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'Suntrust Bank',
  'Union Bank of Nigeria',
  'United Bank For Africa',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
  'Moniepoint MFB',
  'Opay',
  'Palmpay',
  'Kuda Bank',
];

const OTHER = '__other__';
const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';
const INPUT =
  'w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors';

const emptyForm = { id: null, label: '', bankChoice: '', bankOther: '', accountNumber: '', accountName: '' };

const FIELD_MESSAGES = {
  label: 'Enter a label, for example Tithe or Offering.',
  bank_name: 'Choose the bank.',
  account_number: 'The account number must be exactly 10 digits.',
  account_name: 'Enter the account name exactly as the bank shows it.',
};

function formatWhen(value) {
  try {
    return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (err) {
    return '';
  }
}

function describeChange(c) {
  const where = `${c.label} (${c.bank_name} ••••${c.account_last4})`;
  if (c.change_type === 'added') return `Added ${where}`;
  if (c.change_type === 'removed') return `Removed ${where}`;
  if (c.previous_last4 && c.previous_last4 !== c.account_last4) {
    return `Updated ${c.label}: account number changed from ••••${c.previous_last4} to ••••${c.account_last4}`;
  }
  return `Updated ${where}`;
}

export default function BankAccounts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null); // null = hidden
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const load = useCallback(async () => {
    const { data: result, error } = await supabase.rpc('get_my_bank_accounts');
    if (error || !result) {
      setLoadError('Could not load bank accounts. Please refresh the page.');
    } else {
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (err) {
      setMessage('Could not copy. Select the text and copy it by hand.');
    }
  }

  function startAdd() {
    setMessage('');
    setForm({ ...emptyForm });
  }

  function startEdit(account) {
    setMessage('');
    const known = BANKS.includes(account.bank_name);
    setForm({
      id: account.id,
      label: account.label,
      bankChoice: known ? account.bank_name : OTHER,
      bankOther: known ? '' : account.bank_name,
      accountNumber: account.account_number,
      accountName: account.account_name,
      originalNumber: account.account_number,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage('');

    const bankName = form.bankChoice === OTHER ? form.bankOther.trim() : form.bankChoice;
    const number = form.accountNumber.replace(/\s/g, '');

    if (form.id && number !== form.originalNumber) {
      const ok = window.confirm(
        'You are changing the account number. Members who already copied the old number would send money to the wrong account. Continue?'
      );
      if (!ok) return;
    }

    setSaving(true);
    const { data: result, error } = await supabase.rpc('save_bank_account', {
      p_id: form.id,
      p_label: form.label,
      p_bank_name: bankName,
      p_account_number: number,
      p_account_name: form.accountName,
    });
    setSaving(false);

    if (error || !result) {
      setMessage('Could not save. Please try again.');
      return;
    }
    if (result.status === 'saved') {
      setForm(null);
      await load();
      return;
    }
    if (result.status === 'invalid') {
      setMessage(FIELD_MESSAGES[result.field] || 'Please check the details and try again.');
    } else if (result.status === 'limit_reached') {
      setMessage('You can list up to 3 bank accounts. Remove one first.');
    } else if (result.status === 'duplicate') {
      setMessage('This bank account is already listed.');
    } else if (result.status === 'not_allowed') {
      setMessage('Only the senior pastor and finance admin can change bank details.');
    } else {
      setMessage('Could not save. Please refresh the page and try again.');
    }
  }

  async function handleRemove(account) {
    if (!window.confirm(`Remove ${account.label} (${account.bank_name}) from your giving page?`)) return;
    setMessage('');
    const { data: result, error } = await supabase.rpc('remove_bank_account', { p_id: account.id });
    if (error || !result || (result.status !== 'removed' && result.status !== 'not_found')) {
      setMessage('Could not remove this account. Please try again.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-10">
        <p className="text-ink/40 text-sm text-center">Loading…</p>
      </div>
    );
  }

  if (loadError || !data?.allowed) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-10">
        <p className="text-ink/60 text-sm text-center">
          {loadError || "You don't have access to this page."}
        </p>
      </div>
    );
  }

  const canManage = data.can_manage;
  const accounts = data.accounts || [];
  const givingUrl = data.giving_slug ? `${window.location.origin}/give/${data.giving_slug}` : '';

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <BackButton />
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Bank Transfer Details</h1>
            <p className="text-ink/50 text-sm mt-1">
              Members see these on your giving page and can copy them to send an offering by bank transfer.
            </p>
          </div>
          {canManage && accounts.length < 3 && !form && (
            <button
              type="button"
              onClick={startAdd}
              className="flex items-center gap-1.5 bg-signal hover:bg-signal-deep text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Add account
            </button>
          )}
        </div>

        {!canManage && (
          <div className="text-sm text-ink/60 bg-white border border-ink/5 rounded-lg p-3">
            Only the senior pastor and finance admin can change bank details. You can view them here.
          </div>
        )}

        {message && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{message}</div>}

        {form && (
          <form onSubmit={handleSave} className={`${CARD} p-5 space-y-3`}>
            <h2 className="font-display font-bold text-ink">{form.id ? 'Edit account' : 'Add an account'}</h2>

            <div>
              <label htmlFor="ba-label" className="block text-sm font-medium mb-1">
                What is this account for?
              </label>
              <input
                id="ba-label"
                list="ba-label-options"
                required
                maxLength={40}
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={INPUT}
                placeholder="Tithe, Offering, Building Fund…"
              />
              <datalist id="ba-label-options">
                <option value="Tithe" />
                <option value="Offering" />
                <option value="Building Fund" />
                <option value="General" />
              </datalist>
            </div>

            <div>
              <label htmlFor="ba-bank" className="block text-sm font-medium mb-1">Bank</label>
              <select
                id="ba-bank"
                required
                value={form.bankChoice}
                onChange={(e) => setForm((f) => ({ ...f, bankChoice: e.target.value }))}
                className={INPUT}
              >
                <option value="">Select the bank…</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
                <option value={OTHER}>Other bank…</option>
              </select>
              {form.bankChoice === OTHER && (
                <input
                  required
                  maxLength={60}
                  value={form.bankOther}
                  onChange={(e) => setForm((f) => ({ ...f, bankOther: e.target.value }))}
                  className={`${INPUT} mt-2`}
                  placeholder="Type the bank name"
                />
              )}
            </div>

            <div>
              <label htmlFor="ba-number" className="block text-sm font-medium mb-1">Account number</label>
              <input
                id="ba-number"
                required
                inputMode="numeric"
                maxLength={12}
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                className={INPUT}
                placeholder="10-digit account number"
              />
            </div>

            <div>
              <label htmlFor="ba-name" className="block text-sm font-medium mb-1">Account name</label>
              <input
                id="ba-name"
                required
                maxLength={100}
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                className={INPUT}
                placeholder="Exactly as the bank shows it"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save account'}
              </button>
              <button
                type="button"
                onClick={() => { setForm(null); setMessage(''); }}
                disabled={saving}
                className="px-5 border border-ink/15 text-ink/70 rounded-lg font-semibold hover:bg-parchment transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {accounts.length === 0 && !form ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-ink/50 text-sm">No bank accounts listed yet.</p>
            {canManage && (
              <p className="text-ink/40 text-xs mt-1">Add one so members can give by bank transfer.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className={`${CARD} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-signal-deep uppercase tracking-wide">{a.label}</p>
                    <p className="font-display text-xl font-bold text-ink tracking-wider mt-1">{a.account_number}</p>
                    <p className="text-sm text-ink/70 mt-1">{a.bank_name}</p>
                    <p className="text-sm text-ink/50">{a.account_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => copy(a.account_number, a.id)}
                      className="flex items-center gap-1 text-xs text-signal font-semibold hover:text-signal-deep"
                    >
                      <Copy size={13} /> {copiedKey === a.id ? 'Copied' : 'Copy number'}
                    </button>
                    {canManage && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          className="flex items-center gap-1 text-xs text-ink/60 hover:text-ink"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(a)}
                          className="flex items-center gap-1 text-xs text-rose hover:text-rose/80"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {givingUrl && (
          <div className={`${CARD} p-5 space-y-3`}>
            <h2 className="font-display font-bold text-ink">Your giving page link and QR code</h2>
            <p className="text-ink/50 text-sm">
              Share this link or show the QR code. It opens your giving page, which lists the accounts above.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="p-2.5 bg-white border rounded-lg">
                <QRCodeSVG value={givingUrl} size={150} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  readOnly
                  value={givingUrl}
                  onClick={(e) => e.target.select()}
                  className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-parchment"
                />
                <button
                  type="button"
                  onClick={() => copy(givingUrl, 'link')}
                  className="mt-2 flex items-center gap-1 text-sm text-signal font-semibold hover:text-signal-deep"
                >
                  <Copy size={14} /> {copiedKey === 'link' ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`${CARD} p-5`}>
          <h2 className="font-display font-bold text-ink">Recent changes</h2>
          <p className="text-ink/50 text-xs mt-1">
            Every change to your bank details is recorded here. If you see a change you do not recognise, tell your
            senior pastor straight away.
          </p>
          {(data.changes || []).length === 0 ? (
            <p className="text-ink/40 text-sm mt-3">No changes yet.</p>
          ) : (
            <ul className="divide-y mt-3">
              {data.changes.map((c, i) => (
                <li key={`${c.changed_at}-${i}`} className="py-2.5">
                  <p className="text-sm text-ink">{describeChange(c)}</p>
                  <p className="text-xs text-ink/40 mt-0.5">
                    {c.changed_by_name || 'Unknown'} · {formatWhen(c.changed_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
