import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { cleanPhone, telHref, waHref } from '../lib/phone';
import { PeopleTabs } from '../components/SectionTabs';
import {
  MessageSquare, Phone, Send, AlertTriangle,
  Settings, CheckCircle2, RefreshCw, HeartHandshake
} from 'lucide-react';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Not seen yet';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const DEFAULT_TEMPLATES = {
  day1: "Good day {name}, Pastor and the entire church family at {church} want to sincerely thank you for worshiping with us this Sunday! We were honored by your presence. Please let us know if there is any prayer request we can join faith with you on this week.",
  day3: "Hello {name}! Join us tomorrow Wednesday by 6:00 PM for our Midweek Word & Fellowship Service at {church}. It will strengthen you for the rest of the week. We would be overjoyed to see you again!",
  day7: "Peace and grace {name}! Tomorrow is Sunday and we are eagerly looking forward to worshiping with you again at {church} by 8:00 AM. Bring your loved ones—God has a word in store for you!",
  day30: "Happy new month {name}! It has been one month since you first blessed us with your visit at {church}. We celebrate your life and walk with God. Our Believers' Foundation Class is available to help you grow—you are always family here!"
};

export default function FollowUpDashboard() {
  const { church } = useAuth();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [absentees, setAbsentees] = useState([]);
  const [sessionsCount, setSessionsCount] = useState(3);
  const [visitors, setVisitors] = useState([]);
  
  // Seasonal template customization
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('gathrd_followup_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [savedNotice, setSavedNotice] = useState(false);

  // Sent tracker
  const [sentLog, setSentLog] = useState(() => {
    const saved = localStorage.getItem('gathrd_followup_sent_log');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    fetchAllData();
  }, [church?.id]);

  async function fetchAllData() {
    try {
      setLoading(true);

      // 1. Fetch Absentees via existing RPC
      const { data: absData, error: absError } = await supabase.rpc('get_missed_services', { p_last: 3 });
      if (absError) {
        console.error('Error fetching absentees:', absError);
      } else if (absData && Array.isArray(absData.members)) {
        setAbsentees(absData.members);
        setSessionsCount(absData.sessions || 3);
      }

      // 2. Fetch Visitors
      let query = supabase.from('visitors').select('*').order('created_at', { ascending: false });
      if (church?.id) {
        query = query.eq('church_id', church.id);
      }
      const { data: visData, error: visError } = await query;
      if (visError) {
        console.error('Error fetching visitors:', visError);
      } else {
        setVisitors(visData || []);
      }
    } catch (err) {
      console.error('Exception fetching follow up data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveTemplates(e) {
    e.preventDefault();
    localStorage.setItem('gathrd_followup_templates', JSON.stringify(templates));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  }

  function toggleMarkSent(guestId, stageKey) {
    const key = `${guestId}_${stageKey}`;
    const updated = { ...sentLog, [key]: !sentLog[key] };
    setSentLog(updated);
    localStorage.setItem('gathrd_followup_sent_log', JSON.stringify(updated));
  }

  function prepareMessage(templateStr, guestName) {
    const churchName = church?.name || 'our church';
    return templateStr
      .replace(/{name}/g, guestName || 'Beloved')
      .replace(/{church}/g, churchName);
  }

  function getMilestone(createdAt) {
    if (!createdAt) return { key: 'day1', label: 'Day 1: Sunday Welcome', badge: 'Day 1' };
    const diffDays = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return { key: 'day1', label: 'Day 1: Welcome & Appreciation', badge: 'Day 1' };
    if (diffDays <= 4) return { key: 'day3', label: 'Day 3: Midweek Fellowship Invite', badge: 'Day 3' };
    if (diffDays <= 14) return { key: 'day7', label: 'Day 7: Sunday Service Warm-Up', badge: 'Day 7' };
    return { key: 'day30', label: "Day 30: Believers' Foundation Class", badge: 'Day 30' };
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8 text-ink">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <PeopleTabs />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-ink/5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal"></span>
              <p className="text-xs uppercase font-bold text-signal tracking-wider">Church Care & Retention Engine</p>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mt-0.5">Follow-Up & Care Dashboard</h1>
            <p className="text-ink/60 text-xs mt-1">
              Automated 30-day first-timer pipeline, seasonal touchpoints, and absentee retention.
            </p>
          </div>

          <button
            onClick={fetchAllData}
            className="text-xs bg-signal/10 text-signal hover:bg-signal/20 px-3.5 py-2 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Records
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-ink/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-signal text-white shadow-sm'
                : 'bg-white hover:bg-ink/5 text-ink/70 border border-ink/5'
            }`}
          >
            <HeartHandshake size={15} /> 30-Day First-Timer Pipeline ({visitors.length})
          </button>

          <button
            onClick={() => setActiveTab('absentees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'absentees'
                ? 'bg-signal text-white shadow-sm'
                : 'bg-white hover:bg-ink/5 text-ink/70 border border-ink/5'
            }`}
          >
            <AlertTriangle size={15} /> Absentee Watch ({absentees.length})
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-colors ${
              activeTab === 'templates'
                ? 'bg-signal text-white shadow-sm'
                : 'bg-white hover:bg-ink/5 text-ink/70 border border-ink/5'
            }`}
          >
            <Settings size={15} /> Edit Seasonal Message Templates
          </button>
        </div>

        {/* TAB 1: 30-Day First Timer Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-ink text-base">First-Timer Love-Bombing Dispatch Queue</h2>
                  <p className="text-xs text-ink/60">
                    Tap WhatsApp or SMS to send pre-filled messages directly from your device with zero API charges.
                  </p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md">
                  Zero SMS Gateway Bills
                </span>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-ink/5 p-12 text-center text-ink/40 text-sm">
                Loading visitor pipeline records…
              </div>
            ) : visitors.length > 0 ? (
              <div className="space-y-3">
                {visitors.map((v) => {
                  const milestone = getMilestone(v.created_at || v.visit_date);
                  const isSent = !!sentLog[`${v.id}_${milestone.key}`];
                  const messageText = prepareMessage(templates[milestone.key] || DEFAULT_TEMPLATES[milestone.key], v.full_name);
                  const phoneNum = cleanPhone(v.phone);
                  const waUrl = waHref(v.phone, messageText);
                  const smsUrl = phoneNum ? `sms:+${phoneNum}?body=${encodeURIComponent(messageText)}` : null;

                  return (
                    <div
                      key={v.id}
                      className={`bg-white rounded-2xl border p-4 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSent ? 'border-emerald-200 bg-emerald-50/20' : 'border-ink/10'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-ink">{v.full_name}</h3>
                          <span className="text-[10px] bg-signal/10 text-signal font-bold px-2 py-0.5 rounded-full">
                            {milestone.badge}
                          </span>
                          {isSent && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={11} /> Sent
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-ink/60">
                          {milestone.label} • Phone: <strong className="font-mono text-ink/80">{v.phone || 'No phone'}</strong>
                          {v.how_heard && <span> • Invited by: {v.how_heard}</span>}
                        </p>

                        <div className="bg-parchment/70 p-2.5 rounded-xl border border-ink/5 text-xs text-ink/75 italic line-clamp-2">
                          "{messageText}"
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        ) : (
                          <button disabled className="bg-ink/10 text-ink/30 text-xs font-semibold px-3 py-2 rounded-xl">
                            No WhatsApp
                          </button>
                        )}

                        {smsUrl && (
                          <a
                            href={smsUrl}
                            className="bg-signal hover:bg-signal-deep text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Send size={13} /> SMS
                          </a>
                        )}

                        {telHref(v.phone) && (
                          <a
                            href={telHref(v.phone)}
                            className="bg-parchment hover:bg-ink/5 border border-ink/15 text-ink text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <Phone size={13} /> Call
                          </a>
                        )}

                        <button
                          onClick={() => toggleMarkSent(v.id, milestone.key)}
                          className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                            isSent
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-white text-ink/60 border-ink/20 hover:border-ink/40'
                          }`}
                        >
                          {isSent ? '✓ Sent' : 'Mark Sent'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-ink/5 p-12 text-center space-y-2">
                <HeartHandshake size={32} className="mx-auto text-ink/30" />
                <p className="font-bold text-ink text-sm">No First-Time Visitors Logged Yet</p>
                <p className="text-xs text-ink/50 max-w-sm mx-auto">
                  When ushers log first-timers in the Visitor Log on Sunday, they will automatically appear here with pre-calculated 1-click message touchpoints.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Absentee Care Watch */}
        {activeTab === 'absentees' && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-6 space-y-4">
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
                {absentees.map((m) => {
                  const churchName = church?.name || 'our church';
                  const careMsg = `Good day ${m.full_name}, Pastor and the church family at ${churchName} missed you in service today! Praying you are doing well. Please let us know if there is anything we can uphold you in prayer for.`;
                  const waUrl = waHref(m.phone, careMsg);

                  return (
                    <div key={m.member_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink">{m.full_name}</p>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                            Missed {sessionsCount} Sundays
                          </span>
                        </div>
                        <p className="text-xs text-ink/40 mt-0.5">
                          {m.last_seen ? `Last seen ${formatShortDate(m.last_seen)}` : 'Not seen yet'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        )}

                        {telHref(m.phone) ? (
                          <a
                            href={telHref(m.phone)}
                            className="bg-white border border-ink/15 text-ink text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Phone size={13} /> Call
                          </a>
                        ) : (
                          <span className="text-xs text-ink/30 italic">No phone</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-ink/50 text-sm">Everyone came to at least one of the last {sessionsCount} Sundays. 🎉</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Edit Seasonal Message Templates */}
        {activeTab === 'templates' && (
          <form onSubmit={handleSaveTemplates} className="bg-white rounded-2xl border border-ink/5 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ink text-base">Seasonal Follow-Up Templates</h2>
                <p className="text-xs text-ink/60">
                  Customize the messages according to your church's monthly theme, conventions, or special seasons.
                  Use <code className="bg-ink/5 text-signal px-1 py-0.5 rounded font-mono font-bold">&#123;name&#125;</code> for guest name and <code className="bg-ink/5 text-signal px-1 py-0.5 rounded font-mono font-bold">&#123;church&#125;</code> for church name.
                </p>
              </div>

              {savedNotice && (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-lg animate-fade-in flex items-center gap-1">
                  <CheckCircle2 size={13} /> Saved!
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Day 1 — Sunday Welcome (Honor & Appreciation)</span>
                  <span className="text-[11px] text-ink/40 font-normal">Dispatched 2:00 PM Sunday</span>
                </label>
                <textarea
                  rows={3}
                  value={templates.day1}
                  onChange={(e) => setTemplates({ ...templates, day1: e.target.value })}
                  className="w-full text-xs p-3 border border-ink/20 rounded-xl focus:outline-none focus:border-signal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Day 3 — Tuesday Fellowship Invite</span>
                  <span className="text-[11px] text-ink/40 font-normal">Dispatched Tuesday Morning</span>
                </label>
                <textarea
                  rows={3}
                  value={templates.day3}
                  onChange={(e) => setTemplates({ ...templates, day3: e.target.value })}
                  className="w-full text-xs p-3 border border-ink/20 rounded-xl focus:outline-none focus:border-signal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Day 7 — Saturday Service Warm-Up (Theme / Sermon Reminder)</span>
                  <span className="text-[11px] text-ink/40 font-normal">Dispatched Saturday Afternoon</span>
                </label>
                <textarea
                  rows={3}
                  value={templates.day7}
                  onChange={(e) => setTemplates({ ...templates, day7: e.target.value })}
                  className="w-full text-xs p-3 border border-ink/20 rounded-xl focus:outline-none focus:border-signal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Day 30 — Monthly Believers' Class & Membership</span>
                  <span className="text-[11px] text-ink/40 font-normal">Dispatched at 1 Month Mark</span>
                </label>
                <textarea
                  rows={3}
                  value={templates.day30}
                  onChange={(e) => setTemplates({ ...templates, day30: e.target.value })}
                  className="w-full text-xs p-3 border border-ink/20 rounded-xl focus:outline-none focus:border-signal"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTemplates(DEFAULT_TEMPLATES)}
                className="text-xs text-ink/50 hover:text-ink font-semibold underline"
              >
                Reset to Defaults
              </button>

              <button
                type="submit"
                className="bg-signal hover:bg-signal-deep text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Save Seasonal Templates
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}