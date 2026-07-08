import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PRIORITY_STYLES = {
  urgent: 'bg-rose-50 text-rose',
  normal: 'bg-amberflag/10 text-amberflag',
  low: 'bg-ink/5 text-ink/50',
};

export default function FollowUpDashboard() {
  const { profile } = useAuth();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const collected = [];

    // 1. Overdue visitor follow-up tasks (Week 3)
    const { data: overdueTasks } = await supabase
      .from('follow_up_tasks')
      .select('id, visitor_id, status, due_at, visitors(full_name, phone)')
      .eq('church_id', profile.church_id)
      .eq('status', 'pending')
      .lt('due_at', new Date().toISOString());

    for (const t of overdueTasks || []) {
      const hoursOverdue = Math.floor((Date.now() - new Date(t.due_at).getTime()) / (1000 * 60 * 60));
      collected.push({
        id: `visitor-${t.id}`,
        type: 'Visitor Follow-Up',
        name: t.visitors?.full_name || 'Unknown visitor',
        detail: `Follow-up overdue by ${hoursOverdue}h`,
        priority: hoursOverdue > 72 ? 'urgent' : 'normal',
        link: '/visitors',
      });
    }

    // 2. Converts stalled in discipleship 30+ days (Week 3)
    const { data: discipleship } = await supabase
      .from('discipleship_records')
      .select('id, current_stage, stage_entered_at, visitors(full_name)')
      .eq('church_id', profile.church_id)
      .is('deleted_at', null);

    for (const d of discipleship || []) {
      const days = Math.floor((Date.now() - new Date(d.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 30) {
        collected.push({
          id: `discipleship-${d.id}`,
          type: 'Discipleship Stalled',
          name: d.visitors?.full_name || 'Unknown',
          detail: `Stuck at "${d.current_stage.replace(/_/g, ' ')}" for ${days} days`,
          priority: days > 60 ? 'urgent' : 'normal',
          link: '/discipleship',
        });
      }
    }

    // 3. Cell group absentees (this week)
    const { data: cellGroups } = await supabase
      .from('cell_groups')
      .select('id, name')
      .eq('church_id', profile.church_id)
      .is('deleted_at', null);

    for (const cg of cellGroups || []) {
      const { data: absentees } = await supabase.rpc('get_cell_absentees', { p_cell_group_id: cg.id, p_consecutive_threshold: 3 });
      for (const a of absentees || []) {
        collected.push({
          id: `cell-${cg.id}-${a.member_id}`,
          type: 'Cell Group Absentee',
          name: a.full_name,
          detail: `Absent from ${cg.name} for ${a.consecutive_absences} consecutive meetings`,
          priority: 'normal',
          link: `/cell-groups/${cg.id}`,
        });
      }
    }

    collected.sort((a, b) => {
      const order = { urgent: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    setFlags(collected);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Follow-Up Dashboard</h1>

        <div className="bg-signal-50 border border-signal-100 rounded-lg p-4 text-xs text-signal-deep">
          Consolidates flags from Visitor Follow-Up, Discipleship, and Cell Groups.
          Attendance-based flags (3+ missed Sundays) and Welfare/Prayer request flags aren't included yet — those need
          the Attendance and Pastoral Care modules, which aren't built yet.
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : flags.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">Nothing needs attention right now. 🎉</p>
          ) : (
            <div className="divide-y">
              {flags.map((f) => (
                <Link key={f.id} to={f.link} className="flex items-center justify-between py-3 hover:bg-parchment -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium text-sm text-ink">{f.name}</p>
                    <p className="text-ink/50 text-xs">{f.type} — {f.detail}</p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-1 font-medium shrink-0 ml-2 ${PRIORITY_STYLES[f.priority]}`}>
                    {f.priority}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
