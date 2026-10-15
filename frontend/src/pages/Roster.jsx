import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STAFF_ROLES = ['senior_pastor', 'assistant_pastor', 'church_admin'];

const TYPE_LABELS = { sunday: 'Sunday', midweek: 'Midweek', special: 'Special' };
const SECTIONS = [
  { id: 'order', label: 'Order of service' },
  { id: 'duty', label: "Workers' duties" },
];
const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';
const INPUT =
  'w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors bg-white';

function pad(n) {
  return String(n).padStart(2, '0');
}

function monthBounds(year, month) {
  const last = new Date(year, month, 0).getDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function Roster() {
  const { profile } = useAuth();
  const isStaff = STAFF_ROLES.includes(profile?.role);
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lines, setLines] = useState([]);
  const [linesVersion, setLinesVersion] = useState(0);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Create-services forms (staff only)
  const [monthType, setMonthType] = useState('sunday');
  const [monthWeekday, setMonthWeekday] = useState(3);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('sunday');
  const [newTitle, setNewTitle] = useState('');

  // Editing one roster line (staff only)
  const [editingId, setEditingId] = useState(null);
  const [editMemberId, setEditMemberId] = useState('');
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');

  // Adding an extra line to one service (staff only)
  const [addSection, setAddSection] = useState('duty');
  const [addTitle, setAddTitle] = useState('');

  const loadServices = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const { start, end } = monthBounds(year, month);
    const { data, error } = await supabase
      .from('roster_services')
      .select('id, service_date, service_type, title')
      .eq('church_id', profile.church_id)
      .is('deleted_at', null)
      .gte('service_date', start)
      .lte('service_date', end)
      .order('service_date');
    if (error) {
      setMessage('Could not load the roster. Please refresh the page.');
      setServices([]);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  }, [profile, year, month]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Changing month closes any open service.
  useEffect(() => {
    setSelectedId(null);
    setEditingId(null);
  }, [year, month]);

  useEffect(() => {
    if (!selectedId) {
      setLines([]);
      return undefined;
    }
    let cancelled = false;
    async function run() {
      setLoadingLines(true);
      const { data, error } = await supabase
        .from('roster_assignments')
        .select('id, section, title, sort_order, member_id, assignee_name, note')
        .eq('roster_service_id', selectedId)
        .is('deleted_at', null)
        .order('sort_order');
      if (cancelled) return;
      if (error) {
        setMessage('Could not load this service. Please try again.');
        setLines([]);
      } else {
        setLines(data || []);
      }
      setLoadingLines(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedId, linesVersion]);

  useEffect(() => {
    if (!isStaff || !profile?.church_id) return undefined;
    let cancelled = false;
    async function run() {
      const { data } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('church_id', profile.church_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('full_name');
      if (!cancelled) setMembers(data || []);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [isStaff, profile]);

  function goPrev() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function goNext() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  async function handleCreateMonth() {
    setBusy(true);
    setMessage('');
    const weekday = monthType === 'sunday' ? 0 : Number(monthWeekday);
    const { data, error } = await supabase.rpc('create_roster_month', {
      p_year: year,
      p_month: month,
      p_type: monthType,
      p_weekday: weekday,
    });
    setBusy(false);
    if (error || !data) {
      setMessage('Could not create the services. Please try again.');
      return;
    }
    if (data.status === 'not_allowed') {
      setMessage('Only a pastor or church admin can create a roster.');
      return;
    }
    if (data.status !== 'ok') {
      setMessage('Could not create the services. Check the month and try again.');
      return;
    }
    setMessage(
      data.created > 0
        ? `${data.created} service${data.created === 1 ? '' : 's'} created for ${monthLabel(year, month)}.`
        : 'Those services already exist for this month.'
    );
    await loadServices();
  }

  async function handleAddService() {
    if (!newDate) {
      setMessage('Pick a date first.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.rpc('create_roster_service', {
      p_date: newDate,
      p_type: newType,
      p_title: newTitle.trim() || null,
    });
    setBusy(false);
    if (error || !data) {
      setMessage('Could not create the service. Please try again.');
      return;
    }
    if (data.status === 'not_allowed') {
      setMessage('Only a pastor or church admin can create a roster.');
      return;
    }
    if (data.status !== 'created' && data.status !== 'already_exists') {
      setMessage('Could not create the service. Check the date and try again.');
      return;
    }
    const [y, m] = newDate.split('-').map(Number);
    setMessage(
      data.status === 'created'
        ? `Service created for ${formatDate(newDate)}.`
        : 'That service already exists.'
    );
    setNewDate('');
    setNewTitle('');
    if (y !== year || m !== month) {
      setYear(y);
      setMonth(m);
    } else {
      await loadServices();
      if (data.roster_service_id) setSelectedId(data.roster_service_id);
    }
  }

  async function handleDeleteService(service) {
    if (!window.confirm(`Remove the roster for ${formatDate(service.service_date)}?`)) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase
      .from('roster_services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', service.id);
    setBusy(false);
    if (error) {
      setMessage('Could not remove this service. Please try again.');
      return;
    }
    setSelectedId(null);
    await loadServices();
  }

  function startEdit(line) {
    setEditingId(line.id);
    setEditMemberId(line.member_id || '');
    setEditName(line.member_id ? '' : line.assignee_name || '');
    setEditNote(line.note || '');
  }

  async function saveEdit(line) {
    setBusy(true);
    setMessage('');
    let memberId = null;
    let name = null;
    if (editMemberId) {
      const found = members.find((m) => m.id === editMemberId);
      if (found) {
        memberId = found.id;
        name = found.full_name.slice(0, 80);
      } else {
        memberId = line.member_id;
        name = line.assignee_name;
      }
    } else if (editName.trim()) {
      name = editName.trim().slice(0, 80);
    }
    const note = editNote.trim().slice(0, 200) || null;
    const { error } = await supabase
      .from('roster_assignments')
      .update({ member_id: memberId, assignee_name: name, note })
      .eq('id', line.id);
    setBusy(false);
    if (error) {
      setMessage('Could not save. Please try again.');
      return;
    }
    setEditingId(null);
    setLinesVersion((v) => v + 1);
  }

  async function handleAddLine() {
    const title = addTitle.trim().slice(0, 80);
    if (!title) {
      setMessage('Type a name for the new line.');
      return;
    }
    setBusy(true);
    setMessage('');
    const maxOrder = lines
      .filter((l) => l.section === addSection)
      .reduce((mx, l) => Math.max(mx, l.sort_order), 0);
    const { error } = await supabase.from('roster_assignments').insert({
      church_id: profile.church_id,
      roster_service_id: selectedId,
      section: addSection,
      title,
      sort_order: maxOrder + 10,
    });
    setBusy(false);
    if (error) {
      setMessage('Could not add the line. Please try again.');
      return;
    }
    setAddTitle('');
    setLinesVersion((v) => v + 1);
  }

  async function handleRemoveLine(line) {
    if (!window.confirm(`Remove "${line.title}" from this service?`)) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase
      .from('roster_assignments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', line.id);
    setBusy(false);
    if (error) {
      setMessage('Could not remove the line. Please try again.');
      return;
    }
    setLinesVersion((v) => v + 1);
  }

  const selectedService = services.find((s) => s.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CalendarDays size={20} /> Roster
            </h1>
            <p className="text-ink/50 text-sm mt-0.5">Who is doing what at each service.</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous month"
              className="p-2 rounded-lg border border-ink/15 text-ink/70 hover:bg-parchment transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-ink px-3 min-w-[140px] text-center">
              {monthLabel(year, month)}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="p-2 rounded-lg border border-ink/15 text-ink/70 hover:bg-parchment transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {message && <p className="text-sm text-rose text-center">{message}</p>}

        {loading ? (
          <p className="text-ink/40 text-sm text-center py-6">Loading…</p>
        ) : services.length === 0 ? (
          <div className={`${CARD} p-6 text-center`}>
            <p className="text-ink/50 text-sm">
              No services on the roster for {monthLabel(year, month)}.
              {isStaff ? ' Use "Create services" below to add them.' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                className={`${CARD} w-full text-left px-5 py-4 flex items-center justify-between gap-3 transition-colors ${
                  s.id === selectedId ? 'border-signal' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink">{formatDate(s.service_date)}</p>
                  <p className="text-ink/50 text-xs mt-0.5">{s.title}</p>
                </div>
                <span className="text-xs bg-ink/5 text-ink/60 rounded-full px-2.5 py-1 shrink-0">
                  {TYPE_LABELS[s.service_type] || s.service_type}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedService && (
          <div className={`${CARD} p-5 space-y-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-ink">{selectedService.title}</h2>
                <p className="text-ink/50 text-xs mt-0.5">{formatDate(selectedService.service_date)}</p>
              </div>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => handleDeleteService(selectedService)}
                  disabled={busy}
                  className="flex items-center gap-1.5 text-xs text-rose hover:text-rose/80 font-medium disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remove service
                </button>
              )}
            </div>

            {loadingLines ? (
              <p className="text-ink/40 text-sm text-center py-4">Loading…</p>
            ) : (
              SECTIONS.map((sec) => {
                const sectionLines = lines.filter((l) => l.section === sec.id);
                if (sectionLines.length === 0) return null;
                return (
                  <div key={sec.id}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">{sec.label}</h3>
                    <div className="divide-y divide-ink/5">
                      {sectionLines.map((line) => (
                        <div key={line.id} className="py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink">{line.title}</p>
                              {line.note && <p className="text-xs text-ink/40 mt-0.5">{line.note}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-sm ${line.assignee_name ? 'text-ink' : 'text-ink/30'}`}>
                                {line.assignee_name || 'Not assigned'}
                              </span>
                              {isStaff && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => (editingId === line.id ? setEditingId(null) : startEdit(line))}
                                    aria-label={`Assign ${line.title}`}
                                    className="text-ink/40 hover:text-signal"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line)}
                                    aria-label={`Remove ${line.title}`}
                                    className="text-ink/30 hover:text-rose"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isStaff && editingId === line.id && (
                            <div className="mt-3 space-y-2 bg-parchment rounded-lg p-3">
                              <select
                                value={editMemberId}
                                onChange={(e) => {
                                  setEditMemberId(e.target.value);
                                  if (e.target.value) setEditName('');
                                }}
                                className={INPUT}
                                aria-label="Choose a member"
                              >
                                <option value="">Choose a member…</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.full_name}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={editName}
                                maxLength={80}
                                placeholder="Or type a name (guest minister, choir…)"
                                onChange={(e) => {
                                  setEditName(e.target.value);
                                  if (e.target.value) setEditMemberId('');
                                }}
                                className={INPUT}
                              />
                              <input
                                value={editNote}
                                maxLength={200}
                                placeholder="Note (hymn number, topic…)"
                                onChange={(e) => setEditNote(e.target.value)}
                                className={INPUT}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(line)}
                                  disabled={busy}
                                  className="bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {busy ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="text-sm text-ink/60 px-3 py-2 hover:text-ink"
                                >
                                  Cancel
                                </button>
                              </div>
                              <p className="text-xs text-ink/40">Leave both empty and save to clear the assignment.</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {isStaff && !loadingLines && (
              <div className="border-t border-ink/5 pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Add a line to this service</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={addSection}
                    onChange={(e) => setAddSection(e.target.value)}
                    className={`${INPUT} sm:w-44`}
                    aria-label="Section"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={addTitle}
                    maxLength={80}
                    placeholder="e.g. Drama, Special number, Baby dedication"
                    onChange={(e) => setAddTitle(e.target.value)}
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={handleAddLine}
                    disabled={busy}
                    className="flex items-center justify-center gap-1.5 bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isStaff && (
          <div className={`${CARD} p-5 space-y-5`}>
            <h2 className="font-display font-bold text-ink">Create services</h2>

            <div className="space-y-2">
              <p className="text-sm text-ink/60">
                Create every service for {monthLabel(year, month)} at once. Each one starts with your church's
                template.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={monthType}
                  onChange={(e) => setMonthType(e.target.value)}
                  className={`${INPUT} sm:w-44`}
                  aria-label="Service type for the month"
                >
                  <option value="sunday">Every Sunday</option>
                  <option value="midweek">Every midweek day</option>
                </select>
                {monthType === 'midweek' && (
                  <select
                    value={monthWeekday}
                    onChange={(e) => setMonthWeekday(e.target.value)}
                    className={`${INPUT} sm:w-44`}
                    aria-label="Midweek day"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={handleCreateMonth}
                  disabled={busy}
                  className="bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? 'Creating…' : `Create for ${monthLabel(year, month)}`}
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-ink/5 pt-4">
              <p className="text-sm text-ink/60">Or add one service (a special programme, a vigil, a thanksgiving).</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={`${INPUT} sm:w-44`}
                  aria-label="Service date"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className={`${INPUT} sm:w-36`}
                  aria-label="Service type"
                >
                  <option value="sunday">Sunday</option>
                  <option value="midweek">Midweek</option>
                  <option value="special">Special</option>
                </select>
                <input
                  value={newTitle}
                  maxLength={80}
                  placeholder="Title (optional)"
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={handleAddService}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}