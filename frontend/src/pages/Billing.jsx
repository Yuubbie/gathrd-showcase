import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PLANS = [
  { id: 'starter', name: 'Starter', price: '₦3,000/month', desc: 'Small churches getting started' },
  { id: 'growth', name: 'Growth', price: '₦12,000/month', desc: 'Growing churches with multiple departments' },
  { id: 'church', name: 'Church', price: '₦25,000/month', desc: 'Established churches, multiple cell groups' },
  { id: 'enterprise', name: 'Enterprise', price: '₦45,000/month', desc: 'Multi-branch churches and networks' },
];

const STATUS_LABELS = {
  trialing: 'Trial',
  active: 'Active',
  grace_period: 'Grace Period',
  read_only: 'Read-Only',
  suspended: 'Suspended',
};

export default function Billing() {
  const { profile } = useAuth();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    async function load() {
      if (!profile?.church_id) return;
      const { data } = await supabase
        .from('churches')
        .select('plan, subscription_status, current_period_end')
        .eq('id', profile.church_id)
        .single();
      setChurch(data);
      setLoading(false);
    }
    load();
  }, [profile]);

  async function selectPlan(planId) {
    setSaving(true);
    setNotice('');
    const { error } = await supabase.from('churches').update({ plan: planId }).eq('id', profile.church_id);
    setSaving(false);
    if (!error) {
      setChurch((c) => ({ ...c, plan: planId }));
      setNotice(`Plan updated to ${PLANS.find((p) => p.id === planId)?.name}. This is recorded but not yet automatically billed — see note below.`);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Billing & Plan</h1>

        <div className="bg-signal-50 border border-signal-100 rounded-lg p-4 text-xs text-signal-deep">
          Automated monthly billing isn't switched on yet — plan changes here are recorded, but no card is charged automatically.
          This will be enabled once Gathrd has paying churches. For now, your plan reflects what you and Gathrd have agreed to directly.
        </div>

        {notice && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{notice}</div>}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          <p className="text-sm text-ink/50 mb-1">Current status</p>
          <p className="font-display text-xl font-bold text-ink">{STATUS_LABELS[church?.subscription_status] || 'Trial'}</p>
          {church?.current_period_end && (
            <p className="text-ink/50 text-sm mt-1">Renews {church.current_period_end}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border p-4 ${church?.plan === p.id ? 'border-signal' : 'border-ink/5'}`}>
              <p className="font-display font-bold text-ink">{p.name}</p>
              <p className="text-signal font-semibold text-sm">{p.price}</p>
              <p className="text-ink/50 text-xs mt-1 mb-3">{p.desc}</p>
              {church?.plan === p.id ? (
                <span className="text-xs text-sage font-semibold">✓ Current plan</span>
              ) : (
                <button onClick={() => selectPlan(p.id)} disabled={saving} className="text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold transition-colors disabled:opacity-50">
                  Switch to {p.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
