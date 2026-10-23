import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' });
  } catch (err) {
    return '';
  }
}

export default function PublicGive() {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bank, setBank] = useState({ accounts: [], lastChanged: null });
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    async function loadChurch() {
      const [{ data, error }, { data: bankData }] = await Promise.all([
        supabase.rpc('get_church_giving_info_by_slug', { p_slug: slug }),
        supabase.rpc('get_bank_accounts_by_slug', { p_slug: slug }),
      ]);
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setChurch(data[0]);
        const accounts = bankData && bankData.found ? bankData.accounts || [] : [];
        setBank({ accounts, lastChanged: bankData ? bankData.last_changed : null });
      }
      setLoadingChurch(false);
    }
    loadChurch();
  }, [slug]);

  async function copyNumber(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      // Number is on screen; copy by hand still works.
    }
  }

  if (loadingChurch) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="text-center">
          <p className="text-ink font-medium">This giving link is not valid.</p>
          <p className="text-ink/50 text-sm mt-1">Ask your church for the correct link.</p>
        </div>
      </div>
    );
  }

  if (bank.accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="text-center max-w-sm">
          <p className="text-ink font-medium">{church.church_name} has not listed a bank account yet.</p>
          <p className="text-ink/50 text-sm mt-2">If you have a Gathrd login, sign in and use Give after the church adds an account.</p>
          <Link to="/login" className="inline-block mt-4 text-sm font-semibold text-signal">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-parchment">
      <div className={`w-full max-w-sm ${CARD} p-6 space-y-4`}>
        <div className="text-center mb-2">
          <img src="/logo-mark.png" alt="Gathrd" className="h-12 w-12 mx-auto mb-2" />
          <h1 className="font-display text-lg font-bold text-ink">Give to {church.church_name}</h1>
          <p className="text-ink/50 text-sm mt-1">Bank transfer only. Card giving is not offered here.</p>
        </div>

        <div className="space-y-3">
          {bank.accounts.map((a, i) => (
            <div key={`${a.account_number}-${i}`} className="border border-ink/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-signal-deep uppercase tracking-wide">{a.label}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="font-display text-xl font-bold text-ink tracking-wider">{a.account_number}</p>
                <button
                  type="button"
                  onClick={() => copyNumber(a.account_number, i)}
                  className="flex items-center gap-1 text-xs text-signal font-semibold hover:text-signal-deep shrink-0"
                >
                  <Copy size={13} /> {copiedIndex === i ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-ink/70 mt-1">{a.bank_name}</p>
              <p className="text-sm text-ink/50">{a.account_name}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink/50">
          Put your name and what you are giving toward in the transfer narration.
        </p>
        <p className="text-xs text-ink/40">
          Always check that the account name matches this church before you send.
          {bank.lastChanged ? ` These details were last changed on ${formatDate(bank.lastChanged)}.` : ''}
        </p>
        <p className="text-xs text-ink/50">
          Already have a Gathrd login?{' '}
          <Link to="/give/me" className="font-semibold text-signal">Sign in to upload your receipt</Link>
          so finance can verify it.
        </p>
      </div>
    </div>
  );
}
