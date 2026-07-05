import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const CATEGORIES = [
  ['tithe', 'Tithe'],
  ['offering', 'Offering'],
  ['thanksgiving', 'Thanksgiving'],
  ['building_project', 'Building / Project'],
  ['welfare', 'Welfare'],
];

const QUICK_AMOUNTS = [1000, 5000, 10000, 20000];

export default function PublicGive() {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [category, setCategory] = useState('tithe');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadChurch() {
      const { data, error } = await supabase.rpc('get_church_giving_info_by_slug', { p_slug: slug });
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setChurch(data[0]);
      }
      setLoadingChurch(false);
    }
    loadChurch();
  }, [slug]);

  async function handleGive(e) {
    e.preventDefault();
    setError('');

    if (!amount || Number(amount) < 100) {
      setError('Please enter an amount of at least ₦100.');
      return;
    }
    if (!email) {
      setError('Email is required — your receipt goes here.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-giving`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, category, amount, email, name, phone, origin: window.location.origin }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not start payment.');
        setSubmitting(false);
        return;
      }

      // Redirect to Paystack's hosted checkout page
      window.location.href = data.authorization_url;
    } catch (err) {
      setError('Could not reach the server. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (loadingChurch) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="text-center">
          <p className="text-ink font-medium">This giving link isn't valid.</p>
          <p className="text-ink/50 text-sm mt-1">Please check with your church for the correct link.</p>
        </div>
      </div>
    );
  }

  if (!church.has_giving_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-parchment">
        <div className="text-center">
          <p className="text-ink font-medium">{church.church_name} hasn't activated online giving yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-parchment">
      <form onSubmit={handleGive} className="w-full max-w-sm bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-4">
        <div className="text-center mb-2">
          <img src="/logo-mark.png" alt="Gathrd" className="h-12 w-12 mx-auto mb-2" />
          <h1 className="font-display text-lg font-bold text-ink">Give to {church.church_name}</h1>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1.5">What are you giving toward?</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setCategory(value)}
                className={`text-sm rounded-md px-3 py-2 border font-medium ${
                  category === value ? 'bg-signal text-white border-signal' : 'border-ink/15 text-ink/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1.5">Amount (₦)</label>
          <input
            type="number"
            required
            min="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onWheel={(e) => e.target.blur()}
            className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            placeholder="0.00"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {QUICK_AMOUNTS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAmount(String(a))}
                className="text-xs border border-ink/15 text-ink/70 rounded-full px-3 py-1 hover:border-signal hover:text-signal transition-colors"
              >
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1.5">Your name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1.5">Email <span className="text-rose">*</span></label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="For your receipt" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink/80 mb-1.5">Phone (optional)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3.5 font-semibold transition-colors disabled:opacity-50">
          {submitting ? 'Redirecting to payment…' : `Give ₦${amount ? Number(amount).toLocaleString() : '0'}`}
        </button>

        <p className="text-xs text-ink/40 text-center">Payments processed securely by Paystack.</p>
      </form>
    </div>
  );
}
