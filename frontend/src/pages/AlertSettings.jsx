import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Cake, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FIRST_ALERT = [
  { value: '', label: 'No early reminder' },
  { value: '360', label: '6 hours before' },
  { value: '300', label: '5 hours before' },
  { value: '240', label: '4 hours before' },
  { value: '180', label: '3 hours before' },
  { value: '120', label: '2 hours before' },
];

const SECOND_ALERT = [
  { value: '', label: 'No final reminder' },
  { value: '120', label: '2 hours before' },
  { value: '90', label: '90 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '30', label: '30 minutes before' },
];

const BIRTHDAY_HOURS = [5, 6, 7, 8, 9, 10, 11, 12];

function hourLabel(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${suffix}`;
}

const cardClass =
  'bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3';
const inputClass =
  'w-full border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none';

function errorText(code) {
  switch (code) {
    case 'not_allowed':
      return 'Only a pastor or church admin can change this.';
    case 'bad_input':
      return 'Check the name, day, time and reminders, then try again.';
    case 'too_many':
      return 'You have reached the limit of 30 activities.';
    case 'not_found':
      return 'That activity no longer exists. Refresh the page.';
    default:
      return 'Could not save. Please try again.';
  }
}

function ActivityRow({ activity, onSaved, onRemoved, onError }) {
  const isNew = !activity;
  const [form, setForm] = useState({
    name: activity?.name || '',
    weekday: String(activity?.weekday ?? 0),
    start_time: (activity?.start_time || '18:00').slice(0, 5),
    alert_1: activity?.alert_1_minutes_before ? String(activity.alert_1_minutes_before) : isNew ? '360' : '',
    alert_2: activity?.alert_2_minutes_before ? String(activity.alert_2_minutes_before) : isNew ? '60' : '',
    enabled: activity?.enabled ?? true,
  });
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    onError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('save_alert_activity', {
      p_id: activity?.id || null,
      p_name: form.name.trim(),
      p_weekday: Number(form.weekday),
      p_start_time: form.start_time,
      p_alert_1: form.alert_1 ? Number(form.alert_1) : null,
      p_alert_2: form.alert_2 ? Number(form.alert_2) : null,
      p_enabled: form.enabled,
    });
    setBusy(false);
    if (error || !data?.ok) {
      onError(errorText(data?.error));
      return;
    }
    if (isNew) {
      setForm((f) => ({ ...f, name: '' }));
    }
    onSaved();
  }

  async function remove() {
    if (!window.confirm(`Remove "${activity.name}"? Members will stop getting reminders for it.`)) return;
    onError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('delete_alert_activity', { p_id: activity.id });
    setBusy(false);
    if (error || !data?.ok) {
      onError(errorText(data?.error));
      return;
    }
    onRemoved();
  }

  return (
    <form onSubmit={save} className={`rounded-xl border border-ink/10 p-3 space-y-2.5 ${isNew ? 'bg-parchment' : ''}`}>
      <input
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="e.g. Bible Study, Prayer Meeting, Sunday Service"
        maxLength={80}
        required
        className={inputClass}
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={form.weekday} onChange={(e) => set('weekday', e.target.value)} className={inputClass} aria-label="Day">
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              Every {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={form.start_time}
          onChange={(e) => set('start_time', e.target.value)}
          required
          className={inputClass}
          aria-label="Start time"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={form.alert_1} onChange={(e) => set('alert_1', e.target.value)} className={inputClass} aria-label="First reminder">
          {FIRST_ALERT.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={form.alert_2} onChange={(e) => set('alert_2', e.target.value)} className={inputClass} aria-label="Final reminder">
          {SECOND_ALERT.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        {isNew ? (
          <span className="text-xs text-ink/40">Reminders start from the next matching day.</span>
        ) : (
          <label className="flex items-center gap-2 text-xs text-ink/70">
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
            Reminders on
          </label>
        )}
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" onClick={remove} disabled={busy} aria-label="Remove" className="text-rose hover:text-rose/80 p-1.5 disabled:opacity-50">
              <Trash2 size={15} />
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-1.5 font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving…' : isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function AlertSettings() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [birthday, setBirthday] = useState({ enabled: false, hour: 7 });
  const [loading, setLoading] = useState(true);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const [actRes, setRes] = await Promise.all([
      supabase
        .from('church_alert_activities')
        .select('id, name, weekday, start_time, alert_1_minutes_before, alert_2_minutes_before, enabled')
        .order('weekday')
        .order('start_time'),
      supabase.from('church_alert_settings').select('birthday_enabled, birthday_hour').maybeSingle(),
    ]);
    setActivities(actRes.data || []);
    if (setRes.data) {
      setBirthday({ enabled: setRes.data.birthday_enabled, hour: setRes.data.birthday_hour });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (profile?.church_id) load();
  }, [profile?.church_id]);

  async function saveBirthday(next) {
    setError('');
    setMessage('');
    setSavingBirthday(true);
    const { data, error: rpcError } = await supabase.rpc('save_alert_settings', {
      p_birthday_enabled: next.enabled,
      p_birthday_hour: next.hour,
    });
    setSavingBirthday(false);
    if (rpcError || !data?.ok) {
      setError(errorText(data?.error));
      return;
    }
    setBirthday(next);
    setMessage('Saved.');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/40">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <BackButton />
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <Bell size={22} className="text-signal" /> Alerts &amp; reminders
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Choose what your church gets reminded about. Everything is off until you set it up. Alerts show in the bell, and as a
            lock-screen alert for members who turned on Phone alerts. Times are Nigerian time.
          </p>
        </div>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {message && <div className="text-sm text-sage bg-sage-50 rounded-lg p-3">{message}</div>}

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-ink/80">Service &amp; meeting reminders</h2>
          <p className="text-xs text-ink/50">
            Add each activity with its own day and time, so Bible Study at 6 PM and Prayer Meeting at 5 PM can each have the right
            reminders. Everyone in your church gets them.
          </p>

          {activities.length === 0 && <p className="text-sm text-ink/40">No activities yet. Add your first one below.</p>}
          {activities.map((a) => (
            <ActivityRow key={a.id} activity={a} onSaved={() => { setMessage('Saved.'); load(); }} onRemoved={() => { setMessage('Removed.'); load(); }} onError={setError} />
          ))}

          <p className="text-xs font-semibold text-ink/60 pt-1">Add an activity</p>
          <ActivityRow key={`new-${activities.length}`} onSaved={() => { setMessage('Added.'); load(); }} onRemoved={() => {}} onError={setError} />
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-semibold text-ink/80 flex items-center gap-2">
            <Cake size={16} className="text-signal" /> Birthday celebrants
          </h2>
          <p className="text-xs text-ink/50">
            Once a day, tell the whole church who is celebrating a birthday today, so they can bless them. Only adult members are
            included.
          </p>
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input
              type="checkbox"
              checked={birthday.enabled}
              disabled={savingBirthday}
              onChange={(e) => saveBirthday({ ...birthday, enabled: e.target.checked })}
            />
            Send the daily birthday notice
          </label>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Send at</label>
            <select
              value={birthday.hour}
              disabled={savingBirthday}
              onChange={(e) => saveBirthday({ ...birthday, hour: Number(e.target.value) })}
              className={inputClass}
            >
              {BIRTHDAY_HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-ink/40">
          Looking for announcements? Those are sent from <Link to="/announcements" className="text-signal font-semibold">Announcements</Link>.
        </p>
      </div>
    </div>
  );
}
