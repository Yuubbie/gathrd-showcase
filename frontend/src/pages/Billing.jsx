import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  { id: 'basic', name: 'Basic', price: '₦10,000/month', desc: 'Essentials for small churches getting started' },
  { id: 'advanced', name: 'Advanced', price: '₦20,000/month', desc: 'For growing churches with multiple departments' },
  { id: 'premium', name: 'Premium', price: '₦50,000/month', desc: 'Full power for established churches and networks' },
];

const STATUS_LABELS = {
  trialing: 'Free Trial',
  active: 'Active',
  grace_period: 'Grace Period',
  read_only: 'Read-Only',
  suspended: 'Suspended',
};

export default function Billing() {
  const { profile } = useAuth();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('plan, subscription_status, current_period_end, trial_started_at, trial_ends_at, paystack_plan_code, paystack_subscription_code')
        .eq('id', profile.church_id)
        .single();
      setChurch(data);
      setLoading(false);
    }
    load();
  }, [profile]);

  async function subscribe(planId) {
    setSubscribing(true);
    setNotice('');
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);

      // Open Paystack Inline Checkout
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      const handler = window.PaystackPop;
      if (handler) {
        handler.setup({
          key: paystackKey,
          email: session.user.email,
          amount: data.amount,
          currency: 'NGN',
          ref: data.reference,
          callback: () => {
            window.location.href = '/billing?subscription=success';
          },
          onClose: () => {
            setSubscribing(false);
          },
        });
        handler.openIframe();
      } else {
        // Fallback: redirect to Paystack
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize payment. Please try again.');
      setSubscribing(false);
    }
  }

  // Check for success message in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      setNotice('Successfully subscribed! Your subscription is now active.');
      // Clean up URL
      window.history.replaceState({}, '', '/billing');
      // Reload church data
      if (profile?.church_id) {
        supabase
          .from('churches')
          .select('plan, subscription_status, current_period_end, trial_started_at, trial_ends_at, paystack_plan_code, paystack_subscription_code')
          .eq('id', profile.church_id)
          .single()
          .then(({ data }) => setChurch(data));
      }
    }
  }, [profile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  const isTrial = church?.subscription_status === 'trialing';
  const isActive = church?.subscription_status === 'active';
  const isGrace = church?.subscription_status === 'grace_period';
  const isSuspended = church?.subscription_status === 'suspended';
  const trialDaysLeft = church?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(church.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Billing & Plan</h1>

        {/* Trial Banner */}
        {isTrial && (
          <div className="bg-signal-50 border border-signal-100 rounded-lg p-4">
            <p className="font-display font-bold text-signal-deep">
              {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your free trial
            </p>
            <p className="text-xs text-signal-deep/70 mt-1">
              Your trial ends on {new Date(church?.trial_ends_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}.
              Subscribe now to keep access after your trial.
            </p>
          </div>
        )}

        {/* Grace Period Banner */}
        {isGrace && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-display font-bold text-amber-800">Payment failed — grace period active</p>
            <p className="text-xs text-amber-700 mt-1">
              Your subscription payment failed. You have 3 days to update your payment method before your church is suspended.
            </p>
          </div>
        )}

        {/* Suspended Banner */}
        {isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-display font-bold text-red-800">Subscription expired</p>
            <p className="text-xs text-red-700 mt-1">
              Your free trial has ended. Subscribe to a plan below to restore access.
            </p>
          </div>
        )}

        {/* Notices */}
        {notice && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{notice}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</div>}

        {/* Current Status */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          <p className="text-sm text-ink/50 mb-1">Current status</p>
          <p className="font-display text-xl font-bold text-ink">{STATUS_LABELS[church?.subscription_status] || 'Trial'}</p>
          {church?.current_period_end && isActive && (
            <p className="text-ink/50 text-sm mt-1">
              Next billing date: {new Date(church.current_period_end).toLocaleDateString('en-NG', { dateStyle: 'long' })}
            </p>
          )}
          {isTrial && (
            <p className="text-ink/50 text-sm mt-1">
              Trial started: {new Date(church?.trial_started_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
            </p>
          )}
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-3">
          {PLANS.map((p) => {
            const isCurrentPlan = church?.plan === p.id && (isActive || isGrace);
            return (
              <div key={p.id} className={`bg-white rounded-2xl border p-4 flex flex-col ${isCurrentPlan ? 'border-signal ring-1 ring-signal/20' : 'border-ink/5'}`}>
                <p className="font-display font-bold text-ink">{p.name}</p>
                <p className="text-signal font-semibold text-sm mt-1">{p.price}</p>
                <p className="text-ink/50 text-xs mt-1 mb-3 flex-1">{p.desc}</p>
                {isCurrentPlan ? (
                  <span className="text-xs text-sage font-semibold text-center">✓ Current plan</span>
                ) : (
                  <button
                    onClick={() => subscribe(p.id)}
                    disabled={subscribing}
                    className="text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold transition-colors disabled:opacity-50"
                  >
                    {subscribing ? 'Processing…' : `Subscribe to ${p.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-ink/5 p-4 text-xs text-ink/50">
          <p className="font-semibold text-ink/70 mb-1">How billing works</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>60-day free trial for all new churches</li>
            <li>After trial, subscribe to a plan to continue</li>
            <li>Payments processed securely via Paystack</li>
            <li>Monthly billing — cancel anytime</li>
            <li>3-day grace period if a payment fails</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
