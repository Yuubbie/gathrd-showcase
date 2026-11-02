import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';

function formatServiceLabel(s) {
  if (!s) return '';
  const date = new Date(`${s.service_date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${date} — ${s.service_name}${s.open ? ' (open)' : ''}`;
}

function parseNames(raw) {
  return [...new Set(
    raw
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean)
  )];
}

function childRecordForSession(present, roster, extraChildren) {
  const presentKids = present || [];
  const presentIds = new Set(presentKids.map((p) => p.member_id));
  const seen = new Set(presentIds);
  const absentKids = [];
  for (const row of [...(roster || []), ...(extraChildren || [])]) {
    const id = row.member_id || row.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    absentKids.push({
      member_id: id,
      id,
      full_name: row.full_name,
      gender: row.gender,
    });
  }
  return {
    presentKids,
    presentIds,
    absentKids,
    presentCount: presentKids.length,
    absentCount: absentKids.length,
    totalCount: presentKids.length + absentKids.length,
  };
}

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
  const [okMessage, setOkMessage] = useState('');

  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState('');
  const [adding, setAdding] = useState(false);

  const [pastServices, setPastServices] = useState([]);
  const [pastSessionId, setPastSessionId] = useState('');
  const [pastNames, setPastNames] = useState('');
  const [recording, setRecording] = useState(false);
  const [pastRecord, setPastRecord] = useState({ present: [], roster: [] });
  const [pastPresentLoading, setPastPresentLoading] = useState(false);

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

  const loadServices = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_recent_services', { p_limit: 14 });
    if (error || !data?.ok) {
      setPastServices([]);
      return [];
    }
    const list = data.services || [];
    setPastServices(list);
    setPastSessionId((current) => {
      if (current && list.some((s) => s.session_id === current)) return current;
      return list[0]?.session_id || '';
    });
    return list;
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices, profile?.church_id]);

  const loadPastPresent = useCallback(async (sessionId) => {
    if (!sessionId) {
      setPastRecord({ present: [], roster: [] });
      return;
    }
    setPastPresentLoading(true);
    const { data, error } = await supabase.rpc('get_session_children_attendance', { p_session_id: sessionId });
    setPastRecord(!error && data?.ok ? { present: data.present || [], roster: data.roster || [] } : { present: [], roster: [] });
    setPastPresentLoading(false);
  }, []);

  useEffect(() => {
    loadPastPresent(pastSessionId);
  }, [pastSessionId, loadPastPresent]);

  async function handleAddChild(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    setMessage('');
    setOkMessage('');
    const { data, error } = await supabase.rpc('add_child_member', {
      p_full_name: name,
      p_gender: newGender || null,
    });
    setAdding(false);
    if (error || !data?.ok) {
      setMessage(data?.status === 'invalid_name' ? 'Enter the child\'s name.' : 'Could not add that child. Please try again.');
      return;
    }
    setNewName('');
    setNewGender('');
    if (data.status === 'exists') {
      setOkMessage(`${data.full_name} is already on the children list.`);
    } else {
      setOkMessage(`${data.full_name} was added.`);
    }
    await load();
  }

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

  async function handleRecordPast(e) {
    e.preventDefault();
    const names = parseNames(pastNames);
    if (!pastSessionId || names.length === 0 || recording) return;
    setRecording(true);
    setMessage('');
    setOkMessage('');
    const { data, error } = await supabase.rpc('record_children_for_session', {
      p_session_id: pastSessionId,
      p_names: names,
    });
    setRecording(false);
    if (error || !data?.ok) {
      setMessage(
        data?.status === 'too_many'
          ? 'Please paste 100 names or fewer at a time.'
          : 'Could not record those names. Please try again.'
      );
      return;
    }
    const parts = [];
    if (data.checked_in) parts.push(`${data.checked_in} marked present`);
    if (data.created) parts.push(`${data.created} added to the children list`);
    if (data.already_checked_in) parts.push(`${data.already_checked_in} already on that service`);
    setOkMessage(parts.join('. ') + '.');
    setPastNames('');
    await Promise.all([load(), loadServices(), loadPastPresent(pastSessionId)]);
  }

  async function handlePastCheckIn(child) {
    if (!pastSessionId) return;
    setMessage('');
    setPastRecord((prev) => ({
      ...prev,
      present: prev.present.some((p) => p.member_id === child.id)
        ? prev.present
        : [...prev.present, { member_id: child.id, full_name: child.full_name, gender: child.gender, method: 'manual' }],
    }));
    const { data, error } = await supabase.rpc('check_in_child_for_session', {
      p_session_id: pastSessionId,
      p_member_id: child.id,
    });
    const ok = !error && data && (data.status === 'checked_in' || data.status === 'already_checked_in');
    if (!ok) {
      await loadPastPresent(pastSessionId);
      setMessage(`Could not check in ${child.full_name}. Please try again.`);
      return;
    }
    await loadServices();
  }

  async function handlePastUndo(child) {
    if (!pastSessionId) return;
    if (!window.confirm(`Remove the check-in for ${child.full_name}?`)) return;
    setMessage('');
    setPastRecord((prev) => ({
      ...prev,
      present: prev.present.filter((p) => p.member_id !== child.id),
    }));
    const { data, error } = await supabase.rpc('undo_child_for_session', {
      p_session_id: pastSessionId,
      p_member_id: child.id,
    });
    if (error || !data || (data.status !== 'undone' && data.status !== 'not_found')) {
      await loadPastPresent(pastSessionId);
      setMessage(`Could not remove the check-in for ${child.full_name}. Please try again.`);
      return;
    }
    await loadServices();
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
              className="text-sm border border-ink/15 text-ink/70 rounded-lg px-3.5 py-2 font-semibold hover:bg-parchment"
            >
              Full form
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
          <p className="text-sm text-ink/50">When a pastor or Admin starts a service on Attendance, you can mark children present here. You can still add a child, or record names from a past service below.</p>
        )}

        {message && <p className="text-sm text-rose">{message}</p>}
        {okMessage && <p className="text-sm text-sage">{okMessage}</p>}

        <form onSubmit={handleAddChild} className={`${CARD} p-4 space-y-3`}>
          <p className="text-sm font-semibold text-ink">Add a child</p>
          <p className="text-xs text-ink/50">Name is enough. They stay on this church's children list, not the adult People list.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Child's full name"
              className="flex-1 border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none"
            />
            <select
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
              className="sm:w-32 border border-ink/10 rounded-lg px-3 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none bg-white"
            >
              <option value="">Boy / Girl</option>
              <option value="male">Boy</option>
              <option value="female">Girl</option>
            </select>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold disabled:opacity-50"
            >
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </div>
        </form>

        <form onSubmit={handleRecordPast} className={`${CARD} p-4 space-y-3`}>
          <p className="text-sm font-semibold text-ink">Past services</p>
          <p className="text-xs text-ink/50">Tap a service to open its record. Adults and children are listed separately, including who was not in church. Tap a child to mark them present.</p>
          {pastServices.length === 0 ? (
            <p className="text-sm text-ink/50">No services yet. A pastor or Admin needs to start one on Attendance first.</p>
          ) : (
            <>
              <div className="space-y-2">
                {pastServices.map((s) => {
                  const selected = s.session_id === pastSessionId;
                  const adultsPresent = s.adults_present ?? 0;
                  const adultsAbsent = s.adults_absent ?? 0;
                  const selectedKids = selected
                    ? childRecordForSession(pastRecord.present, pastRecord.roster, children)
                    : null;
                  const kidsPresent = selectedKids ? selectedKids.presentCount : (s.children_present ?? 0);
                  const kidsAbsent = selectedKids ? selectedKids.absentCount : (s.children_absent ?? 0);
                  const kidsTotal = kidsPresent + kidsAbsent;
                  const adultsTotal = adultsPresent + adultsAbsent;
                  return (
                    <button
                      key={s.session_id}
                      type="button"
                      onClick={() => setPastSessionId(s.session_id)}
                      className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
                        selected ? 'border-signal bg-signal/5' : 'border-ink/10 hover:border-ink/20 bg-white'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${selected ? 'text-signal-deep' : 'text-ink'}`}>
                        {formatServiceLabel(s)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Adults · {adultsTotal}</p>
                          <p className="text-sm text-ink">{adultsPresent} present · {adultsAbsent} absent</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Children · {kidsTotal}</p>
                          <p className="text-sm text-ink">{kidsPresent} present · {kidsAbsent} absent</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {pastSessionId && (
                <div className="rounded-xl border border-ink/10 bg-parchment/60 p-3 space-y-3">
                  {(() => {
                    const { presentKids, presentIds, absentKids, presentCount, absentCount, totalCount } = childRecordForSession(
                      pastRecord.present,
                      pastRecord.roster,
                      children
                    );
                    const selectedService = pastServices.find((s) => s.session_id === pastSessionId);
                    const adultsPresent = selectedService?.adults_present ?? 0;
                    const adultsAbsent = selectedService?.adults_absent ?? 0;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-white p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Adults · {adultsPresent + adultsAbsent}</p>
                            <p className="text-sm font-semibold text-ink mt-0.5">
                              {adultsPresent} present
                            </p>
                            <p className="text-xs text-ink/50">{adultsAbsent} not in church</p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">Children · {totalCount}</p>
                            <p className="text-sm font-semibold text-ink mt-0.5">
                              {presentCount} present
                            </p>
                            <p className="text-xs text-ink/50">{absentCount} not in church</p>
                          </div>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Children on this service</p>
                        {pastPresentLoading ? (
                          <p className="text-sm text-ink/40">Loading…</p>
                        ) : (pastRecord.roster || []).length === 0 && presentKids.length === 0 ? (
                          <p className="text-sm text-ink/50">No children on the list yet. Add a child above, or paste names below.</p>
                        ) : (
                          <div className="divide-y max-h-64 overflow-y-auto">
                            {[...presentKids.map((p) => ({ id: p.member_id, full_name: p.full_name, gender: p.gender })), ...absentKids.map((a) => ({ id: a.member_id, full_name: a.full_name, gender: a.gender }))].map((c) => {
                              const here = presentIds.has(c.id);
                              return (
                                <div key={c.id} className="flex items-center justify-between py-1">
                                  <button
                                    type="button"
                                    onClick={() => handlePastCheckIn(c)}
                                    disabled={here}
                                    className="flex-1 flex items-center gap-3 py-2 px-1 text-left disabled:cursor-default"
                                  >
                                    {here ? <CheckCircle2 size={18} className="text-sage shrink-0" /> : <Circle size={18} className="text-ink/20 shrink-0" />}
                                    <span className={`text-sm font-medium ${here ? 'text-ink/40' : 'text-ink'}`}>{c.full_name}</span>
                                  </button>
                                  {here && (
                                    <button type="button" onClick={() => handlePastUndo(c)} className="text-xs text-rose font-medium shrink-0">
                                      Undo
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              <textarea
                value={pastNames}
                onChange={(e) => setPastNames(e.target.value)}
                rows={4}
                placeholder={'Paste extra names, one per line:\nAda Okafor\nChinedu Bello'}
                className="w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none"
              />
              <button
                type="submit"
                disabled={recording || !pastSessionId || parseNames(pastNames).length === 0}
                className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold disabled:opacity-50"
              >
                {recording ? 'Recording…' : 'Add these names to this service'}
              </button>
            </>
          )}
        </form>

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
            <p className="text-ink/40 text-sm py-6 text-center">No children yet. Add a name above, or use Full form for extra details.</p>
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
