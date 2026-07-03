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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading…</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-700 font-medium">This giving link isn't valid.</p>
          <p className="text-gray-500 text-sm mt-1">Please check with your church for the correct link.</p>
        </div>
      </div>
    );
  }

  if (!church.has_giving_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-700 font-medium">{church.church_name} hasn't activated online giving yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <form onSubmit={handleGive} className="w-full max-w-sm bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="text-center mb-2">
          <img src="/logo-mark.png" alt="Gathrd" className="h-12 w-12 mx-auto mb-2" />
          <h1 className="text-lg font-semibold">Give to {church.church_name}</h1>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-1">What are you giving toward?</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setCategory(value)}
                className={`text-sm rounded-md px-3 py-2 border font-medium ${
                  category === value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount (₦)</label>
          <input
            type="number"
            required
            min="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.target.blur()}
            className="w-full border rounded-md px-3 py-2 text-base"
            placeholder="0.00"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {QUICK_AMOUNTS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAmount(String(a))}
                className="text-xs border border-gray-300 rounded-full px-3 py-1"
              >
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Your name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" placeholder="For your receipt" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone (optional)</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-md px-3 py-2 text-base" />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white rounded-md py-3 font-semibold disabled:opacity-50">
          {submitting ? 'Redirecting to payment…' : `Give ₦${amount ? Number(amount).toLocaleString() : '0'}`}
        </button>

        <p className="text-xs text-gray-400 text-center">Payments processed securely by Paystack.</p>
      </form>
    </div>
  );
}
