import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

export default function Children() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [service, setService] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const canInvite = ['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher'].includes(profile?.role);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    const { data: roster } = await supabase
      .from('members')
      .select('id, full_name, phone, gender, status')
      .eq('age_group', 'child')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('full_name');
    setChildren(roster || []);

    const { data, error } = await supabase.rpc('get_children_desk');
    if (error || !data?.ok) {
      setTeachers([]);
      setService(null);
      setAttendance({});
      setLoading(false);
      return;
    }
    if ((!roster || roster.length === 0) && Array.isArray(data.children)) {
      setChildren(data.children);
    }
    setTeachers(data.teachers || []);
    setService(data.service && data.service.open ? data.service : null);
    const map = {};
    for (const id of data.present_ids || []) {
      map[id] = { method: 'manual' };
    }
    setAttendance(map);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckIn(child) {
    if (!service || attendance[child.id]) return;
    setMessage('');
    setAttendance((prev) => ({ ...prev, [child.id]: { method: 'manual', at: new Date().toISOString() } }));
    const { data, error } = await supabase.rpc('teacher_check_in', { p_member_id: child.id });
    const ok = !error && data && (data.status === 'checked_in' || data.status === 'already_checked_in');
    if (!ok) {
      setAttendance((prev) => {
        const next = { ...prev };
        delete next[child.id];
        return next;
      });
      setMessage(
        data?.status === 'closed'
          ? 'The service has ended.'
          : `Could not check in ${child.full_name}. Please try again.`
      );
    }
  }

  async function handleUndo(child) {
    if (!service) return;
    if (!window.confirm(`Remove the check-in for ${child.full_name}?`)) return;
    const previous = attendance[child.id];
    setAttendance((prev) => {
      const next = { ...prev };
      delete next[child.id];
      return next;
    });
    const { data, error } = await supabase.rpc('teacher_undo_check_in', { p_member_id: child.id });
    if (error || !data || (data.status !== 'undone' && data.status !== 'not_found')) {
      setAttendance((prev) => ({ ...prev, [child.id]: previous }));
      setMessage(`Could not remove the check-in for ${child.full_name}. Please try again.`);
    }
  }

  const filtered = children.filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()));
  const presentCount = Object.keys(attendance).length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Children</h1>
            <p className="text-ink/50 text-sm mt-0.5">{children.length} child{children.length === 1 ? '' : 'ren'} on the list</p>
          </div>
          <div className="flex gap-2">
            {canInvite && (
              <Link
                to="/team/invite?role=childrens_teacher"
                className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
              >
                Invite teacher
              </Link>
            )}
            <Link
              to="/members/new?from=children"
              className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold"
            >
              + Add child
            </Link>
          </div>
        </div>

        {service ? (
          <div className={`${CARD} p-4 flex items-center justify-between gap-3`}>
            <div>
              <p className="text-sm font-semibold text-ink">{service.service_name}</p>
              <p className="text-xs text-sage">Service is open — tap a name to mark present</p>
            </div>
            <p className="text-sm font-semibold text-ink">{presentCount} here</p>
          </div>
        ) : (
          <p className="text-sm text-ink/50">When a pastor or Admin starts a service on Attendance, you can mark children present here.</p>
        )}

        {message && <p className="text-sm text-rose">{message}</p>}

        {teachers.length > 0 && (
          <div className={`${CARD} p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-2">Teachers</p>
            <p className="text-sm text-ink/70">{teachers.map((t) => t.full_name).join(', ')}</p>
          </div>
        )}

        <div className={`${CARD} p-5 space-y-3`}>
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
          />

          {filtered.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">No children yet. People marked Child on the member list should appear here.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => {
                const record = attendance[c.id];
                return (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    {service ? (
                      <button
                        type="button"
                        onClick={() => handleCheckIn(c)}
                        disabled={!!record}
                        className="flex-1 flex items-center gap-3 py-2.5 px-1 text-left disabled:cursor-default"
                      >
                        {record ? <CheckCircle2 size={20} className="text-sage shrink-0" /> : <Circle size={20} className="text-ink/20 shrink-0" />}
                        <span className={`text-sm font-medium ${record ? 'text-ink/40' : 'text-ink'}`}>{c.full_name}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/members/${c.id}/edit?from=children`)}
                        className="flex-1 text-left py-2.5 px-1"
                      >
                        <p className="text-sm font-medium text-ink">{c.full_name}</p>
                        <p className="text-xs text-ink/40">{c.gender === 'male' ? 'Boy' : c.gender === 'female' ? 'Girl' : 'Child'}</p>
                      </button>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <ContactActions phone={c.phone} name={c.full_name} stopClick />
                      {service && record && (
                        <button type="button" onClick={() => handleUndo(c)} className="text-xs text-rose font-medium">
                          Undo
                        </button>
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
