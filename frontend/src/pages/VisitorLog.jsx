import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  first_timer: 'First Timer',
  repeat_visitor: 'Repeat Visitor',
  convert: 'Convert',
  inactive: 'Inactive',
};

const FOLLOW_UP_LABELS = {
  pending: 'Pending',
  contacted: 'Contacted',
  visited: 'Visited',
  converted: 'Converted',
  inactive: 'Inactive',
};

const FOLLOW_UP_COLORS = {
  pending: 'bg-amberflag/10 text-amberflag',
  contacted: 'bg-signal-50 text-signal-deep',
  visited: 'bg-signal-50 text-signal-deep',
  converted: 'bg-sage-50 text-sage',
  inactive: 'bg-ink/5 text-ink/50',
};

export default function VisitorLog() {
  const { profile } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [tasksByVisitor, setTasksByVisitor] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [convertingId, setConvertingId] = useState(null);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    let query = supabase
      .from('visitors')
      .select('id, full_name, phone, status, first_visit_date')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);

    const { data: visitorData } = await query;
    setVisitors(visitorData || []);

    if (visitorData?.length) {
      const { data: tasks } = await supabase
        .from('follow_up_tasks')
        .select('id, visitor_id, status, due_at')
        .in('visitor_id', visitorData.map((v) => v.id))
        .order('created_at', { ascending: false });

      // Keep only the most recent task per visitor
      const map = {};
      for (const t of tasks || []) {
        if (!map[t.visitor_id]) map[t.visitor_id] = t;
      }
      setTasksByVisitor(map);
    }

    setLoading(false);
  }, [profile, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTaskStatus(taskId, newStatus) {
    await supabase.from('follow_up_tasks').update({ status: newStatus }).eq('id', taskId);
    load();
  }

  async function markAsConvert(visitorId) {
    setConvertingId(visitorId);
    await supabase.rpc('convert_visitor', {
      p_visitor_id: visitorId,
      p_assigned_pastor_id: profile.id,
    });
    setConvertingId(null);
    load();
  }

  function isOverdue(task) {
    return task && task.status === 'pending' && new Date(task.due_at) < new Date();
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Visitor Log</h1>
          <Link to="/visitors/check-in" className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors">
            + Check In Visitor
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-ink/10 rounded-lg px-3.5 py-2 text-sm bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : visitors.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No visitors logged yet.</p>
          ) : (
            <div className="divide-y">
              {visitors.map((v) => {
                const task = tasksByVisitor[v.id];
                const overdue = isOverdue(task);
                return (
                  <div key={v.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-sm">{v.full_name}</p>
                      <p className="text-ink/50 text-xs">
                        {v.phone || 'No phone'} • {STATUS_LABELS[v.status]} • first visit {v.first_visit_date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {task && (
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          className={`text-xs rounded-full px-2 py-1 border-0 font-medium ${FOLLOW_UP_COLORS[task.status]}`}
                        >
                          {Object.entries(FOLLOW_UP_LABELS).map(([v2, l]) => <option key={v2} value={v2}>{l}</option>)}
                        </select>
                      )}
                      {overdue && (
                        <span className="text-xs text-rose font-semibold">⚠ Overdue</span>
                      )}
                      {v.status !== 'convert' && (
                        <button
                          onClick={() => markAsConvert(v.id)}
                          disabled={convertingId === v.id}
                          className="text-xs border border-ink/15 text-ink/70 rounded-lg px-2.5 py-1.5 font-semibold hover:bg-parchment transition-colors disabled:opacity-50"
                        >
                          {convertingId === v.id ? 'Saving…' : 'Mark as Convert'}
                        </button>
                      )}
                      {v.status === 'convert' && (
                        <Link to="/discipleship" className="text-xs text-signal font-semibold">
                          View in Discipleship →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
