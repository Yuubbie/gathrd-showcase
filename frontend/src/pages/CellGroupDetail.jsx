import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function CellGroupDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [cellGroup, setCellGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [attendance, setAttendance] = useState({}); // member_id -> boolean
  const [newFaces, setNewFaces] = useState(0);
  const [prayerPoints, setPrayerPoints] = useState('');
  const [testimonies, setTestimonies] = useState('');

  const canManage = ['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role) ||
    (profile?.role === 'cell_leader' && cellGroup?.leader_profile_id === profile?.id);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: cg } = await supabase
      .from('cell_groups')
      .select('*, profiles!cell_groups_leader_profile_id_fkey(full_name)')
      .eq('id', id)
      .single();
    setCellGroup(cg);

    const { data: memberData } = await supabase
      .from('members')
      .select('id, full_name, phone')
      .eq('cell_group_id', id)
      .is('deleted_at', null)
      .eq('status', 'active');
    setMembers(memberData || []);

    const initialAttendance = {};
    for (const m of memberData || []) initialAttendance[m.id] = true;
    setAttendance(initialAttendance);

    const { data: reportData } = await supabase
      .from('cell_group_meeting_reports')
      .select('*')
      .eq('cell_group_id', id)
      .order('meeting_date', { ascending: false })
      .limit(10);
    setReports(reportData || []);

    const { data: absenteeData } = await supabase.rpc('get_cell_absentees', { p_cell_group_id: id, p_consecutive_threshold: 3 });
    setAbsentees(absenteeData || []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitReport(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const presentCount = Object.values(attendance).filter(Boolean).length;

    const { data: report, error: reportErr } = await supabase
      .from('cell_group_meeting_reports')
      .insert({
        cell_group_id: id,
        church_id: profile.church_id,
        attendance_count: presentCount,
        new_faces_count: Number(newFaces) || 0,
        prayer_points: prayerPoints || null,
        testimonies: testimonies || null,
        status: 'on_time',
      })
      .select('id')
      .single();

    if (reportErr) {
      setError(reportErr.message);
      setSaving(false);
      return;
    }

    const attendanceRows = members.map((m) => ({
      meeting_report_id: report.id,
      member_id: m.id,
      present: !!attendance[m.id],
    }));

    const { error: attendanceErr } = await supabase.from('cell_meeting_attendance').insert(attendanceRows);

    setSaving(false);
    if (attendanceErr) {
      setError(attendanceErr.message);
      return;
    }

    setShowForm(false);
    setPrayerPoints('');
    setTestimonies('');
    setNewFaces(0);
    load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;
  if (!cellGroup) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Cell group not found.</div>;

  const alreadyReportedToday = reports.some((r) => r.meeting_date === new Date().toISOString().slice(0, 10));

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/cell-groups" className="text-sm text-signal font-semibold hover:text-signal-deep">← All Cell Groups</Link>

        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{cellGroup.name}</h1>
          <p className="text-ink/50 text-sm">
            {cellGroup.zone ? `${cellGroup.zone} • ` : ''}{cellGroup.meeting_day}{cellGroup.meeting_time ? ` ${cellGroup.meeting_time}` : ''}
            {cellGroup.location ? ` • ${cellGroup.location}` : ''} • Led by {cellGroup.profiles?.full_name || 'Unassigned'}
          </p>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

        {absentees.length > 0 && (
          <div className="bg-amberflag/10 border border-amberflag/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-amberflag mb-1">⚠ {absentees.length} member(s) absent 3+ recent meetings</p>
            <ul className="text-xs text-amberflag space-y-0.5">
              {absentees.map((a) => <li key={a.member_id}>{a.full_name} — {a.consecutive_absences} absences</li>)}
            </ul>
          </div>
        )}

        {canManage && !alreadyReportedToday && (
          <button onClick={() => setShowForm((v) => !v)} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors">
            {showForm ? 'Cancel' : "Submit This Week's Report"}
          </button>
        )}
        {alreadyReportedToday && (
          <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">✓ Report already submitted for today.</div>
        )}

        {showForm && (
          <form onSubmit={submitReport} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink/80 mb-2">Attendance</p>
              {members.length === 0 ? (
                <p className="text-ink/40 text-sm">No members assigned to this cell group yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!attendance[m.id]}
                        onChange={(e) => setAttendance((a) => ({ ...a, [m.id]: e.target.checked }))}
                      />
                      {m.full_name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">New faces this week</label>
              <input type="number" min="0" value={newFaces} onChange={(e) => setNewFaces(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Prayer points</label>
              <textarea rows={2} value={prayerPoints} onChange={(e) => setPrayerPoints(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Testimonies</label>
              <textarea rows={2} value={testimonies} onChange={(e) => setTestimonies(e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            </div>

            <button type="submit" disabled={saving} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Report'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-ink/80">Recent Reports</p>
            {reports.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Date', 'Attendance', 'New Faces', 'Prayer Points', 'Testimonies'];
                  const rows = reports.map((r) => [r.meeting_date, r.attendance_count, r.new_faces_count, r.prayer_points || '', r.testimonies || '']);
                  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${cellGroup.name}-reports.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs border border-ink/15 text-ink/70 rounded-lg px-3 py-1.5 font-semibold hover:bg-parchment transition-colors"
              >
                Export CSV
              </button>
            )}
          </div>
          {reports.length === 0 ? (
            <p className="text-ink/40 text-sm">No reports submitted yet.</p>
          ) : (
            <div className="divide-y">
              {reports.map((r) => (
                <div key={r.id} className="py-2 flex justify-between text-sm">
                  <span className="text-ink/70">{r.meeting_date}</span>
                  <span className="text-ink/50">{r.attendance_count} present • {r.new_faces_count} new</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          <p className="text-sm font-semibold text-ink/80 mb-2">Members ({members.length})</p>
          {members.length === 0 ? (
            <p className="text-ink/40 text-sm">No members assigned yet — assign members to this cell group from their profile in Members.</p>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="py-2 text-sm text-ink/70">{m.full_name}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
