import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function OnboardingChecklist() {
  const { profile, church } = useAuth();
  const [steps, setSteps] = useState(null);
  const [videoWatched, setVideoWatched] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know

  useEffect(() => {
    async function check() {
      if (!profile?.church_id) return;

      const [{ data: churchData }, { count: deptCount }, { count: cellCount }, { count: memberCount }, { count: bankCount }] = await Promise.all([
        supabase.from('churches').select('logo_url, onboarding_dismissed').eq('id', profile.church_id).single(),
        supabase.from('departments').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).is('deleted_at', null),
        supabase.from('cell_groups').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).is('deleted_at', null),
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).is('deleted_at', null),
        supabase.from('church_bank_accounts').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id),
      ]);

      setDismissed(!!churchData?.onboarding_dismissed);
      setSteps({
        logo: !!churchData?.logo_url,
        department: (deptCount || 0) > 0,
        cellGroup: (cellCount || 0) > 0,
        member: (memberCount || 0) > 0,
        giving: (bankCount || 0) > 0,
      });
    }
    check();
  }, [profile]);

  async function dismiss() {
    await supabase.from('churches').update({ onboarding_dismissed: true }).eq('id', profile.church_id);
    setDismissed(true);
  }

  if (!steps || dismissed) return null;

  const items = [
    { label: 'Set your church logo', done: steps.logo, to: '/settings' },
    { label: 'Add your first department', done: steps.department, to: '/settings' },
    { label: 'Create your first cell group', done: steps.cellGroup, to: '/cell-groups' },
    { label: 'Add your first member', done: steps.member, to: '/members/new' },
    { label: 'Add your church bank account', done: steps.giving, to: '/giving/bank-accounts' },
    { label: 'Watch the 3-minute walkthrough', done: videoWatched, to: null },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const percent = Math.round((completedCount / items.length) * 100);

  if (percent === 100) return null; // auto-hides once genuinely complete

  return (
    <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display text-lg font-bold text-ink">Getting {church?.name || 'your church'} set up</p>
          <p className="text-ink/50 text-sm">{completedCount} of {items.length} steps done</p>
        </div>
        <button onClick={dismiss} className="text-xs text-ink/40 hover:text-ink/60">Hide this</button>
      </div>

      <div className="w-full bg-ink/5 rounded-full h-2 mb-4">
        <div className="bg-signal h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          item.to ? (
            <Link key={item.label} to={item.to} className="flex items-center gap-2 text-sm hover:text-signal transition-colors">
              {item.done ? <CheckCircle2 size={18} className="text-sage shrink-0" /> : <Circle size={18} className="text-ink/20 shrink-0" />}
              <span className={item.done ? 'text-ink/40 line-through' : 'text-ink/80'}>{item.label}</span>
            </Link>
          ) : (
            <button key={item.label} onClick={() => setVideoWatched(true)} className="flex items-center gap-2 text-sm text-left hover:text-signal transition-colors">
              {item.done ? <CheckCircle2 size={18} className="text-sage shrink-0" /> : <Circle size={18} className="text-ink/20 shrink-0" />}
              <span className={item.done ? 'text-ink/40 line-through' : 'text-ink/80'}>
                {item.label} <span className="text-ink/30">(coming soon — mark done to skip)</span>
              </span>
            </button>
          )
        ))}
      </div>
    </div>
  );
}
