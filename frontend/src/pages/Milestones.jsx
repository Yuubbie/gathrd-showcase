import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const TEMPLATE_LABELS = {
  birthday: 'Birthday Message',
  wedding_anniversary: 'Wedding Anniversary Message',
  born_again_anniversary: 'Born-Again Anniversary Message',
};

const DEFAULT_TEMPLATES = {
  birthday: "Happy Birthday {{name}}! 🎉 The entire {{church_name}} family celebrates you today. God bless you richly.",
  wedding_anniversary: "Happy Anniversary {{name}}! 🎊 {{church_name}} celebrates your union today. Wishing you many more joyful years together.",
  born_again_anniversary: "Happy Spiritual Birthday {{name}}! 🙏 {{church_name}} celebrates the day you gave your life to Christ.",
};

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Parse using UTC getters — date-only strings like "1995-07-05" are
  // stored as UTC midnight, so reading the UTC month/day avoids the
  // date silently shifting backward/forward depending on local timezone.
  const original = new Date(dateStr);
  const month = original.getUTCMonth();
  const day = original.getUTCDate();

  let occurrence = new Date(todayMidnight.getFullYear(), month, day);
  if (occurrence < todayMidnight) {
    occurrence = new Date(todayMidnight.getFullYear() + 1, month, day);
  }

  const diffDays = Math.round((occurrence - todayMidnight) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

export default function Milestones() {
  const { profile, session } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateDraft, setTemplateDraft] = useState('');

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);

    const { data: memberData } = await supabase
      .from('members')
      .select('id, full_name, phone, date_of_birth, wedding_anniversary, born_again_date')
      .eq('church_id', profile.church_id)
      .eq('status', 'active')
      .is('deleted_at', null);
    setMembers(memberData || []);

    const { data: templateData } = await supabase
      .from('message_templates')
      .select('template_type, body_text')
      .eq('church_id', profile.church_id);

    const merged = { ...DEFAULT_TEMPLATES };
    for (const t of templateData || []) merged[t.template_type] = t.body_text;
    setTemplates(merged);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendTodaysMilestones() {
    setSending(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send.');
      } else {
        setNotice(`Sent ${data.sent} message(s). ${data.skipped_already_sent} already sent today were skipped.`);
      }
    } catch {
      setError('Could not reach the server.');
    }
    setSending(false);
  }

  async function saveTemplate(type) {
    await supabase.from('message_templates').upsert(
      { church_id: profile.church_id, template_type: type, body_text: templateDraft },
      { onConflict: 'church_id,template_type' }
    );
    setTemplates((t) => ({ ...t, [type]: templateDraft }));
    setEditingTemplate(null);
  }

  const thisWeekBirthdays = members.filter((m) => isWithinDays(m.date_of_birth, 7));
  const thisMonthBirthdays = members.filter((m) => isWithinDays(m.date_of_birth, 30));
  const thisMonthAnniversaries = members.filter((m) => isWithinDays(m.wedding_anniversary, 30));
  const thisMonthBornAgain = members.filter((m) => isWithinDays(m.born_again_date, 30));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Birthdays & Milestones</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}
        {notice && <div className="text-sm text-signal-deep bg-signal-50 rounded-lg p-3">{notice}</div>}

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-2">
          <p className="text-sm text-ink/60">
            Automatically sends birthday and anniversary WhatsApp messages for anyone whose milestone is today.
            Safe to click more than once — nobody gets a duplicate message.
          </p>
          <button onClick={sendTodaysMilestones} disabled={sending} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
            {sending ? 'Checking…' : "Check & Send Today's Milestones"}
          </button>
        </div>

        <Section title="Birthdays this week" people={thisWeekBirthdays} dateField="date_of_birth" />
        <Section title="Birthdays this month" people={thisMonthBirthdays} dateField="date_of_birth" />
        <Section title="Wedding anniversaries this month" people={thisMonthAnniversaries} dateField="wedding_anniversary" />
        <Section title="Born-again anniversaries this month" people={thisMonthBornAgain} dateField="born_again_date" />

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink/80">Message Templates</h2>
          {Object.entries(TEMPLATE_LABELS).map(([type, label]) => (
            <div key={type} className="border border-ink/10 rounded-lg p-3">
              <p className="text-xs font-medium text-ink/50 mb-1">{label}</p>
              {editingTemplate === type ? (
                <div className="space-y-2">
                  <textarea rows={2} value={templateDraft} onChange={(e) => setTemplateDraft(e.target.value)} className="w-full border border-ink/10 rounded-lg px-2.5 py-1.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
                  <div className="flex gap-2">
                    <button onClick={() => saveTemplate(type)} className="text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold transition-colors">Save</button>
                    <button onClick={() => setEditingTemplate(null)} className="text-xs text-ink/50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-ink/70">{templates[type]}</p>
                  <button onClick={() => { setEditingTemplate(type); setTemplateDraft(templates[type]); }} className="text-xs text-signal font-semibold shrink-0">Edit</button>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-ink/40">Use {'{{name}}'} and {'{{church_name}}'} — they'll be replaced automatically.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, people, dateField }) {
  return (
    <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
      <h2 className="text-sm font-semibold text-ink/80 mb-2">{title} ({people.length})</h2>
      {people.length === 0 ? (
        <p className="text-ink/40 text-xs">None coming up.</p>
      ) : (
        <div className="divide-y">
          {people.map((p) => (
            <div key={p.id} className="py-2 flex justify-between text-sm">
              <span>{p.full_name}</span>
              <span className="text-ink/40">{new Date(p[dateField]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
