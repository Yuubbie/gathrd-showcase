import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, MapPin, Repeat } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STAFF_ROLES = ['senior_pastor', 'assistant_pastor', 'church_admin'];

const REPEAT_LABELS = { weekly: 'Every week', monthly: 'Every month' };

const CARD =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)]';
const INPUT =
  'w-full border border-ink/10 rounded-lg px-3.5 py-2 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors bg-white';
const LABEL = 'block text-sm text-ink/60 mb-1';

function pad(n) {
  return String(n).padStart(2, '0');
}

function monthBounds(year, month) {
  const last = new Date(year, month, 0).getDate();
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

function emptyForm(defaultDate) {
  return {
    id: null,
    title: '',
    event_date: defaultDate,
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    repeat_rule: 'none',
    repeat_until: '',
    cell_group_id: '',
    send_reminders: true,
  };
}

export default function ChurchCalendar() {
  const { profile } = useAuth();
  const isStaff = STAFF_ROLES.includes(profile?.role);
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [cellGroups, setCellGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm(''));

  const loadMonth = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const { start, end } = monthBounds(year, month);
    const [eventsRes, servicesRes] = await Promise.all([
      supabase.rpc('get_calendar', { p_from: start, p_to: end }),
      supabase
        .from('roster_services')
        .select('id, service_date, service_type, title')
        .eq('church_id', profile.church_id)
        .is('deleted_at', null)
        .gte('service_date', start)
        .lte('service_date', end)
        .order('service_date'),
    ]);
    if (eventsRes.error || servicesRes.error) {
      setMessage('Could not load the calendar. Please refresh the page.');
    }
    setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
    setServices(servicesRes.data || []);
    setLoading(false);
  }, [profile, year, month]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    if (!isStaff || !profile?.church_id) return undefined;
    let cancelled = false;
    async function run() {
      const { data } = await supabase
        .from('cell_groups')
        .select('id, name')
        .eq('church_id', profile.church_id)
        .is('deleted_at', null)
        .order('name');
      if (!cancelled) setCellGroups(data || []);
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

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openNew() {
    const today = new Date();
    const sameMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const defaultDate = sameMonth
      ? `${year}-${pad(month)}-${pad(today.getDate())}`
      : `${year}-${pad(month)}-01`;
    setForm(emptyForm(defaultDate));
    setMessage('');
    setFormOpen(true);
  }

  async function openEdit(eventId) {
    setMessage('');
    const { data, error } = await supabase.from('church_events').select('*').eq('id', eventId).single();
    if (error || !data) {
      setMessage('Could not open this event. Please try again.');
      return;
    }
    setForm({
      id: data.id,
      title: data.title,
      event_date: data.event_date,
      start_time: data.start_time ? data.start_time.slice(0, 5) : '',
      end_time: data.end_time ? data.end_time.slice(0, 5) : '',
      location: data.location || '',
      description: data.description || '',
      repeat_rule: data.repeat_rule,
      repeat_until: data.repeat_until || '',
      cell_group_id: data.cell_group_id || '',
      send_reminders: data.send_reminders,
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      setMessage('Give the event a title.');
      return;
    }
    if (!form.event_date) {
      setMessage('Pick a date.');
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setMessage('The end time must be after the start time.');
      return;
    }
    if (form.repeat_rule !== 'none' && form.repeat_until && form.repeat_until < form.event_date) {
      setMessage('"Repeat until" must be on or after the first date.');
      return;
    }

    setBusy(true);
    setMessage('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      repeat_rule: form.repeat_rule,
      repeat_until: form.repeat_rule === 'none' ? null : form.repeat_until || null,
      cell_group_id: form.cell_group_id || null,
      send_reminders: form.send_reminders,
    };

    const { error } = form.id
      ? await supabase.from('church_events').update(payload).eq('id', form.id)
      : await supabase.from('church_events').insert({ ...payload, church_id: profile.church_id });
    setBusy(false);

    if (error) {
      setMessage('Could not save the event. Please check the details and try again.');
      return;
    }

    setFormOpen(false);
    const [y, m] = form.event_date.split('-').map(Number);
    if (y !== year || m !== month) {
      setYear(y);
      setMonth(m);
    } else {
      await loadMonth();
    }
  }

  async function removeEvent(item) {
    const warning =
      item.repeat_rule && item.repeat_rule !== 'none'
        ? `Remove "${item.title}"? This removes every date in the series.`
        : `Remove "${item.title}"?`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase
      .from('church_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', item.event_id);
    setBusy(false);
    if (error) {
      setMessage('Could not remove the event. Please try again.');
      return;
    }
    await loadMonth();
  }

  const items = [
    ...services.map((s) => ({
      kind: 'service',
      key: `s-${s.id}`,
      date: s.service_date,
      title: s.title,
      start_time: null,
    })),
    ...events.map((e) => ({ kind: 'event', key: `e-${e.event_id}-${e.date}`, ...e })),
  ];
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === 'service' ? -1 : 1;
    const at = a.start_time || '';
    const bt = b.start_time || '';
    if (at !== bt) return at < bt ? -1 : 1;
    return (a.title || '').localeCompare(b.title || '');
  });

  const days = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last && last.date === item.date) {
      last.items.push(item);
    } else {
      days.push({ date: item.date, items: [item] });
    }
  }

  function cellName(id) {
    return cellGroups.find((g) => g.id === id)?.name || 'Cell group';
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CalendarDays size={20} /> Church Calendar
            </h1>
            <p className="text-ink/50 text-sm mt-0.5">Services, programmes and activities.</p>
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

        {isStaff && !formOpen && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add event
          </button>
        )}

        {message && <p className="text-sm text-rose text-center">{message}</p>}

        {isStaff && formOpen && (
          <div className={`${CARD} p-5 space-y-4`}>
            <h2 className="font-display font-bold text-ink">{form.id ? 'Edit event' : 'New event'}</h2>

            <div>
              <label htmlFor="event-title" className={LABEL}>
                Title
              </label>
              <input
                id="event-title"
                value={form.title}
                maxLength={120}
                placeholder="e.g. Prayer meeting, Youth outreach, Thanksgiving"
                onChange={(e) => setField('title', e.target.value)}
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="event-date" className={LABEL}>
                  Date
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setField('event_date', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="event-start" className={LABEL}>
                  Starts (optional)
                </label>
                <input
                  id="event-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setField('start_time', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label htmlFor="event-end" className={LABEL}>
                  Ends (optional)
                </label>
                <input
                  id="event-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setField('end_time', e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-location" className={LABEL}>
                Place (optional)
              </label>
              <input
                id="event-location"
                value={form.location}
                maxLength={120}
                placeholder="e.g. Main auditorium"
                onChange={(e) => setField('location', e.target.value)}
                className={INPUT}
              />
            </div>

            <div>
              <label htmlFor="event-description" className={LABEL}>
                Details (optional)
              </label>
              <textarea
                id="event-description"
                rows={3}
                value={form.description}
                maxLength={1000}
                onChange={(e) => setField('description', e.target.value)}
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-repeat" className={LABEL}>
                  Repeats
                </label>
                <select
                  id="event-repeat"
                  value={form.repeat_rule}
                  onChange={(e) => setField('repeat_rule', e.target.value)}
                  className={INPUT}
                >
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
              </div>
              {form.repeat_rule !== 'none' && (
                <div>
                  <label htmlFor="event-until" className={LABEL}>
                    Repeat until (optional)
                  </label>
                  <input
                    id="event-until"
                    type="date"
                    value={form.repeat_until}
                    onChange={(e) => setField('repeat_until', e.target.value)}
                    className={INPUT}
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="event-audience" className={LABEL}>
                Who is it for?
              </label>
              <select
                id="event-audience"
                value={form.cell_group_id}
                onChange={(e) => setField('cell_group_id', e.target.value)}
                className={INPUT}
              >
                <option value="">Everyone in the church</option>
                {cellGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Cell group: {g.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={form.send_reminders}
                onChange={(e) => setField('send_reminders', e.target.checked)}
              />
              Remind members the day before and on the day
            </label>

            {form.id && form.repeat_rule !== 'none' && (
              <p className="text-xs text-ink/40">Changes apply to every date in this series.</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEvent}
                disabled={busy}
                className="bg-signal hover:bg-signal-deep text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save event'}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-sm text-ink/60 px-3 py-2 hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-ink/40 text-sm text-center py-6">Loading…</p>
        ) : days.length === 0 ? (
          <div className={`${CARD} p-6 text-center`}>
            <p className="text-ink/50 text-sm">
              Nothing on the calendar for {monthLabel(year, month)}.
              {isStaff ? ' Use "Add event" to put something on it.' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((day) => (
              <div key={day.date} className={`${CARD} p-5`}>
                <h2 className="font-display font-bold text-ink text-sm mb-2">{formatDate(day.date)}</h2>
                <div className="divide-y divide-ink/5">
                  {day.items.map((item) =>
                    item.kind === 'service' ? (
                      <div key={item.key} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{item.title}</p>
                          <p className="text-xs text-ink/40 mt-0.5">Church service</p>
                        </div>
                        <Link to="/roster" className="text-xs text-signal font-semibold hover:text-signal-deep shrink-0">
                          Open roster →
                        </Link>
                      </div>
                    ) : (
                      <div key={item.key} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">{item.title}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-ink/50">
                              {item.start_time && (
                                <span>
                                  {formatTime(item.start_time)}
                                  {item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                                </span>
                              )}
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} /> {item.location}
                                </span>
                              )}
                              {item.repeat_rule && item.repeat_rule !== 'none' && (
                                <span className="flex items-center gap-1">
                                  <Repeat size={12} /> {REPEAT_LABELS[item.repeat_rule]}
                                </span>
                              )}
                              {item.cell_group_id && (
                                <span className="bg-ink/5 rounded-full px-2 py-0.5">{cellName(item.cell_group_id)}</span>
                              )}
                            </div>
                            {item.description && <p className="text-sm text-ink/60 mt-1.5">{item.description}</p>}
                          </div>
                          {isStaff && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEdit(item.event_id)}
                                aria-label={`Edit ${item.title}`}
                                className="text-ink/40 hover:text-signal"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeEvent(item)}
                                disabled={busy}
                                aria-label={`Remove ${item.title}`}
                                className="text-ink/30 hover:text-rose disabled:opacity-50"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}