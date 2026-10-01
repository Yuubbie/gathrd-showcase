import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import PlanComparison from '../components/PlanComparison';
import { PLANS, CHECKOUT_READY, TRIAL_DAYS, formatNaira, getPlan } from '../lib/plans';

const STATUS_LABELS = {
  trialing: 'Free Trial',
  active: 'Active',
  grace_period: 'Grace Period',
  read_only: 'Read-Only',
  suspended: 'Suspended',
};

const CHURCH_FIELDS =
  'plan, subscription_status, current_period_end, trial_started_at, trial_ends_at, paystack_plan_code, paystack_subscription_code, hierarchy_level, parent_church_id';

export default function Billing() {
  const { profile } = useAuth();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function loadChurch() {
    if (!profile?.church_id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('churches')
      .select(CHURCH_FIELDS)
      .eq('id', profile.church_id)
      .single();
    setChurch(data);
    setLoading(false);
  }

  useEffect(() => {
    loadChurch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function subscribe(planId) {
    if (!CHECKOUT_READY) return;

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
      loadChurch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  // A church that sits under a district or zone is billed through the church above it.
  const isCovered = Boolean(church?.parent_church_id);

  const isTrial = church?.subscription_status === 'trialing';
  const isActive = church?.subscription_status === 'active';
  const isGrace = church?.subscription_status === 'grace_period';
  const isSuspended = church?.subscription_status === 'suspended';
  const trialDaysLeft = church?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(church.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;
  const currentPlan = getPlan(church?.plan);

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <BackButton />
        <h1 className="font-display text-2xl font-bold text-ink">Billing & Plan</h1>

        {/* Covered branch view */}
        {isCovered && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
            <p className="font-display text-xl font-bold text-ink">Your billing is covered</p>
            <p className="text-ink/60 text-sm mt-2 max-w-xl">
              Your church is billed through the church that oversees it. You do not pay separately, and you do not need to subscribe to a plan.
            </p>
          </div>
        )}

        {/* Trial Banner */}
        {!isCovered && isTrial && (
          <div className="bg-signal-50 border border-signal-100 rounded-lg p-4">
            <p className="font-display font-bold text-signal-deep">
              {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left in your free trial
            </p>
            <p className="text-xs text-signal-deep/70 mt-1">
              Your trial ends on {new Date(church?.trial_ends_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}.
              {CHECKOUT_READY
                ? ' Subscribe now to keep access after your trial.'
                : ' Online subscription is opening soon. Compare the plans below.'}
            </p>
          </div>
        )}

        {/* Grace Period Banner */}
        {!isCovered && isGrace && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-display font-bold text-amber-800">Payment failed — grace period active</p>
            <p className="text-xs text-amber-700 mt-1">
              Your subscription payment failed. You have 3 days to update your payment method before your church is suspended.
            </p>
          </div>
        )}

        {/* Suspended Banner */}
        {!isCovered && isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-display font-bold text-red-800">Subscription expired</p>
            <p className="text-xs text-red-700 mt-1">
              {CHECKOUT_READY
                ? 'Your free trial has ended. Subscribe to a plan below to restore access.'
                : 'Your free trial has ended. Online subscription is opening soon.'}
            </p>
          </div>
        )}

        {/* Notices */}
        {notice && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{notice}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</div>}

        {/* Current Status */}
        {!isCovered && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
            <p className="text-sm text-ink/50 mb-1">Current status</p>
            <p className="font-display text-xl font-bold text-ink">{STATUS_LABELS[church?.subscription_status] || 'Trial'}</p>
            {currentPlan && (isActive || isGrace) && (
              <p className="text-ink/50 text-sm mt-1">Plan: {currentPlan.name}</p>
            )}
            {church?.current_period_end && isActive && (
              <p className="text-ink/50 text-sm mt-1">
                Next billing date: {new Date(church.current_period_end).toLocaleDateString('en-NG', { dateStyle: 'long' })}
              </p>
            )}
            {isTrial && church?.trial_started_at && (
              <p className="text-ink/50 text-sm mt-1">
                Trial started: {new Date(church.trial_started_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}
              </p>
            )}
          </div>
        )}

        {/* Plans */}
        {!isCovered && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PLANS.map((p) => {
                const isCurrentPlan = currentPlan?.id === p.id && (isActive || isGrace);
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-4 flex flex-col ${
                      isCurrentPlan ? 'border-signal ring-1 ring-signal/20' : p.popular ? 'border-signal/40' : 'border-ink/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-bold text-ink">{p.name}</p>
                      {p.popular && (
                        <span className="text-[11px] font-semibold bg-signal/10 text-signal-deep rounded-full px-2 py-0.5">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="text-signal font-semibold text-sm mt-1">{formatNaira(p.price)}/month</p>
                    <p className="text-ink/50 text-xs mt-1">{p.desc}</p>
                    <p className="text-ink/70 text-xs mt-2 font-medium">{p.audience}</p>
                    <ul className="mt-3 mb-4 space-y-1 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="text-xs text-ink/60 flex gap-1.5">
                          <span className="text-sage" aria-hidden="true">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <span className="text-xs text-sage font-semibold text-center">✓ Current plan</span>
                    ) : (
                      <button
                        onClick={() => subscribe(p.id)}
                        disabled={subscribing || !CHECKOUT_READY}
                        className="text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!CHECKOUT_READY ? 'Opening soon' : subscribing ? 'Processing…' : `Subscribe to ${p.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comparison */}
            <div>
              <h2 className="font-display text-lg font-bold text-ink mb-2">Compare plans</h2>
              <PlanComparison />
            </div>
          </>
        )}

        {/* Info */}
        <div className="bg-white rounded-2xl border border-ink/5 p-4 text-xs text-ink/50">
          <p className="font-semibold text-ink/70 mb-1">How billing works</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>{TRIAL_DAYS}-day free trial for all new churches</li>
            <li>After trial, subscribe to a plan to continue</li>
            <li>District and Zone plans cover every branch under them, on one invoice</li>
            <li>Payments processed securely via Paystack</li>
            <li>Monthly billing — cancel anytime</li>
            <li>3-day grace period if a payment fails</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
