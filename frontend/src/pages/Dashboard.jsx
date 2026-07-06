import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Wallet, Sparkles, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';

const ROLE_LABELS = {
  senior_pastor: 'Senior Pastor', assistant_pastor: 'Assistant Pastor',
  church_admin: 'Church Admin', finance_admin: 'Finance Admin',
  department_head: 'Department Head', cell_leader: 'Cell Group Leader',
  childrens_teacher: "Children's Ministry Teacher", member: 'Church Member',
};

export default function Dashboard() {
  const { profile, church } = useAuth();
  const [stats, setStats] = useState({ members: 0, visitors: 0, givingThisMonth: 0, converts: 0 });
  const [loading, setLoading] = useState(true);
  const canSeeFinance = ['senior_pastor', 'assistant_pastor', 'finance_admin'].includes(profile?.role);

  useEffect(() => {
    async function load() {
      if (!profile?.church_id) return;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startStr = startOfMonth.toISOString().slice(0, 10);

      const [{ count: memberCount }, { count: visitorCount }, { count: convertCount }, { data: giving }] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id).eq('status', 'active'),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id),
        supabase.from('discipleship_records').select('id', { count: 'exact', head: true }).eq('church_id', profile.church_id),
        canSeeFinance
          ? supabase.from('giving_records').select('amount').eq('status', 'success').gte('given_at', startStr)
          : Promise.resolve({ data: [] }),
      ]);

      setStats({
        members: memberCount || 0,
        visitors: visitorCount || 0,
        converts: convertCount || 0,
        givingThisMonth: (giving || []).reduce((sum, g) => sum + Number(g.amount), 0),
      });
      setLoading(false);
    }
    load();
  }, [profile, canSeeFinance]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-5 py-8 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-ink/50 text-sm">{greeting()}, {ROLE_LABELS[profile?.role]}</p>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink mt-0.5">
          {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        {church?.name && (
          <p className="text-ink/40 text-sm mt-1">{church.name}</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Members" value={loading ? '—' : stats.members} to="/members" color="signal" />
        <StatCard icon={UserPlus} label="Visitors Logged" value={loading ? '—' : stats.visitors} to="/visitors" color="sage" />
        <StatCard icon={Sparkles} label="In Discipleship" value={loading ? '—' : stats.converts} to="/discipleship" color="amberflag" />
        {canSeeFinance && (
          <StatCard
            icon={Wallet}
            label="Giving This Month"
            value={loading ? '—' : `₦${stats.givingThisMonth.toLocaleString()}`}
            to="/giving"
            color="signal"
          />
        )}
      </div>

      <Card className="p-6 md:p-8 bg-signal-gradient border-0">
        <p className="text-white/60 text-xs font-medium uppercase tracking-wide mb-2">Getting things done</p>
        <h2 className="font-display text-xl font-bold text-white mb-4">What would you like to do?</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <QuickAction to="/members/new" label="Add a new member" />
          <QuickAction to="/visitors/check-in" label="Check in a visitor" />
          <QuickAction to="/announcements" label="Send an announcement" />
          {canSeeFinance && <QuickAction to="/giving" label="Record a gift" />}
        </div>
      </Card>
    </div>
  );
}

const COLOR_STYLES = {
  signal: { bg: 'bg-signal-50', text: 'text-signal-deep' },
  sage: { bg: 'bg-sage-50', text: 'text-sage' },
  amberflag: { bg: 'bg-amberflag/10', text: 'text-amberflag' },
};

function StatCard({ icon: Icon, label, value, to, color }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.signal;
  return (
    <Link to={to}>
      <Card className="p-4 md:p-5 hover:shadow-[0_1px_2px_rgba(21,17,31,0.04),0_12px_28px_-8px_rgba(21,17,31,0.14)] transition-shadow h-full">
        <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${styles.bg} mb-3`}>
          <Icon size={18} className={styles.text} strokeWidth={2} />
        </div>
        <p className="font-display text-xl md:text-2xl font-bold text-ink">{value}</p>
        <p className="text-ink/50 text-xs mt-0.5">{label}</p>
      </Card>
    </Link>
  );
}

function QuickAction({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
    >
      {label}
      <ArrowUpRight size={16} />
    </Link>
  );
}
