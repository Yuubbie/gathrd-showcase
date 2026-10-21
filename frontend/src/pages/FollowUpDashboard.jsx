import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Not seen yet';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FollowUpDashboard() {
  const [loading, setLoading] = useState(true);
  const [absentees, setAbsentees] = useState([]);
  const [sessionsCount, setSessionsCount] = useState(3);

  useEffect(() => {
    fetchFollowUpData();
  }, []);

  async function fetchFollowUpData() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_missed_services', { p_last: 3 });
      if (error) {
        console.error('Error fetching absentees:', error);
      } else if (data && Array.isArray(data.members)) {
        setAbsentees(data.members);
        setSessionsCount(data.sessions || 3);
      } else {
        setAbsentees([]);
      }
    } catch (err) {
      console.error('Exception fetching follow-up data:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Follow-Up & Care</h1>
            <p className="text-ink/50 text-sm mt-0.5">
              Track members who need retention calls, absentees, and care check-ins.
            </p>
          </div>
          <button
            onClick={fetchFollowUpData}
            className="text-xs bg-signal/10 text-signal hover:bg-signal/20 px-3 py-1.5 rounded-lg font-semibold transition-colors"
          >
            Refresh List
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-4">
          <div>
            <h2 className="font-display font-bold text-ink">Members Missing {sessionsCount}+ Consecutive Sundays</h2>
            <p className="text-ink/50 text-xs mt-0.5">
              {absentees.length} member{absentees.length === 1 ? '' : 's'} missed the last {sessionsCount} Sunday services.
            </p>
          </div>

          {loading ? (
            <p className="text-ink/40 text-sm py-8 text-center">Loading follow-up records…</p>
          ) : absentees.length > 0 ? (
            <div className="divide-y divide-ink/5">
              {absentees.map((m) => (
                <div key={m.member_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{m.full_name}</p>
                    <p className="text-xs text-ink/40">
                      {m.last_seen ? `Last seen ${formatShortDate(m.last_seen)}` : 'Not seen yet'}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {m.phone ? (
                      <a
                        href={`tel:${m.phone}`}
                        className="text-sm text-signal font-semibold hover:text-signal-deep"
                      >
                        {m.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-ink/30 italic">No phone</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-ink/50 text-sm">Everyone came to at least one of the last {sessionsCount} Sundays. 🎉</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}