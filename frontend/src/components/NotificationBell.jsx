import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  isIOSDevice,
  pushState,
  requestPushPermission,
  sendSelfTestPush,
  syncPushSubscription,
} from '../lib/push';

const READ_KEY = 'gathrd_announcement_reads';
const RECENT_DAYS = 14;

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearLegacyReadIds() {
  try {
    localStorage.removeItem(READ_KEY);
  } catch {
    // ignore
  }
}

// Phone alerts status and the Test alert button live here, not in a floating card.
function PhoneAlertsRow() {
  const { session } = useAuth();
  const [state, setState] = useState(pushState);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function turnOn() {
    setBusy(true);
    setNote('');
    const result = await requestPushPermission().catch(() => ({ ok: false }));
    setState(pushState());
    if (!result.ok && result.permission !== 'denied') {
      setNote(`Could not turn on${result.error ? ` (${result.error})` : ''}. Try again.`);
    }
    setBusy(false);
  }

  async function sendTest() {
    setBusy(true);
    setNote('');
    try {
      const saved = await syncPushSubscription(false);
      if (!saved.ok) {
        setNote(`This phone could not be registered${saved.error ? ` (${saved.error})` : ''}.`);
        return;
      }
      const result = await sendSelfTestPush(session);
      if (result?.sent > 0) {
        setNote('Sent. Lock your phone and look for it.');
      } else {
        const code = result?.error || (result?.last_status ? `status ${result.last_status}` : '');
        setNote(`Could not send${code ? ` (${code})` : ''}.`);
      }
    } catch (err) {
      setNote(err?.message || 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  let status;
  let action = null;
  if (state === 'granted') {
    status = 'Phone alerts: On';
    action = (
      <button type="button" onClick={sendTest} disabled={busy || !session} className="text-xs font-semibold text-gold hover:text-gold-light disabled:opacity-50">
        {busy ? 'Sending…' : 'Send test'}
      </button>
    );
  } else if (state === 'default') {
    status = 'Phone alerts: Off';
    action = (
      <button type="button" onClick={turnOn} disabled={busy} className="text-xs font-semibold text-gold hover:text-gold-light disabled:opacity-50">
        {busy ? 'Turning on…' : 'Turn on'}
      </button>
    );
  } else if (state === 'denied') {
    status = 'Phone alerts: Blocked';
  } else {
    status = 'Phone alerts: Not available here';
  }

  const hint =
    state === 'denied'
      ? 'Allow notifications for Gathrd (or your browser) in your phone settings, then reopen the app.'
      : state === 'unsupported'
      ? isIOSDevice()
        ? 'On iPhone: tap Share, choose Add to Home Screen, then open Gathrd from your home screen.'
        : 'Use Chrome or Edge on Android, or install Gathrd, to get lock-screen alerts.'
      : '';

  return (
    <div className="sticky bottom-0 border-t border-void/10 bg-parchment px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-void/60">{status}</span>
        {action}
      </div>
      {(note || hint) && <p className="text-[11px] text-void/50 mt-1">{note || hint}</p>}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    const since = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString();
    const [annRes, annReads, memRes, churchRes, churchReads] = await Promise.all([
      supabase
        .from('announcements')
        .select('id, title, body, sent_at, is_emergency')
        .not('sent_at', 'is', null)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false })
        .limit(20),
      supabase.from('announcement_reads').select('announcement_id'),
      // Duty and event reminders created for this member by the database jobs.
      supabase
        .from('notifications')
        .select('id, title, body, is_read, created_at')
        .neq('source_type', 'announcement')
        .is('deleted_at', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20),
      // Church-wide alerts (service reminders, birthday celebrants).
      supabase
        .from('church_notifications')
        .select('id, title, body, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('church_notification_reads').select('notification_id'),
    ]);

    // A source that fails to load is skipped; the others still show.
    const readAnn = new Set((annReads.data || []).map((r) => r.announcement_id));
    // One-time import of read marks that older versions kept in this browser.
    const legacy = loadReadIds();
    if (legacy.length) {
      const toImport = legacy.filter((id) => !readAnn.has(id));
      if (toImport.length) {
        await supabase.rpc('mark_announcements_read', { p_ids: toImport });
        toImport.forEach((id) => readAnn.add(id));
      }
      clearLegacyReadIds();
    }
    const readChurch = new Set((churchReads.data || []).map((r) => r.notification_id));

    const items = [
      ...(annRes.data || []).map((a) => ({
        key: `announcement:${a.id}`,
        source: 'announcement',
        id: a.id,
        title: a.is_emergency ? `Urgent: ${a.title}` : a.title,
        body: a.body,
        created_at: a.sent_at,
        is_read: readAnn.has(a.id),
      })),
      ...(memRes.data || []).map((n) => ({
        key: `member:${n.id}`,
        source: 'member',
        id: n.id,
        title: n.title,
        body: n.body,
        created_at: n.created_at,
        is_read: n.is_read,
      })),
      ...(churchRes.data || []).map((n) => ({
        key: `church:${n.id}`,
        source: 'church',
        id: n.id,
        title: n.title,
        body: n.body,
        created_at: n.created_at,
        is_read: readChurch.has(n.id),
      })),
    ]
      .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
      .slice(0, 30);

    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 120000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const margin = 12;
      let left = rect.left;
      if (left + panelWidth + margin > window.innerWidth) {
        left = window.innerWidth - panelWidth - margin;
      }
      if (left < margin) left = margin;
      setPanelPos({ top: rect.bottom + 8, left });
    }
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const margin = 12;
      let left = rect.left;
      if (left + panelWidth + margin > window.innerWidth) {
        left = window.innerWidth - panelWidth - margin;
      }
      if (left < margin) left = margin;
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen((v) => !v);
  }

  function persistRead(items) {
    const ids = (source) => items.filter((n) => n.source === source).map((n) => n.id);
    const done = () => {};
    if (ids('announcement').length) {
      supabase.rpc('mark_announcements_read', { p_ids: ids('announcement') }).then(done, done);
    }
    if (ids('church').length) {
      supabase.rpc('mark_church_notifications_read', { p_ids: ids('church') }).then(done, done);
    }
    if (ids('member').length) {
      supabase.from('notifications').update({ is_read: true }).in('id', ids('member')).then(done, done);
    }
  }

  function markAsRead(key) {
    const target = notifications.find((n) => n.key === key);
    if (!target || target.is_read) return;
    setNotifications((prev) => prev.map((n) => (n.key === key ? { ...n, is_read: true } : n)));
    persistRead([target]);
  }

  function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    persistRead(unread);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        className={`relative flex items-center justify-center h-9 w-9 rounded-lg transition-colors text-white/80 hover:text-white ${
          open ? 'bg-white/10' : ''
        }`}
      >
        <Bell size={19} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-gold text-void text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
            className="w-80 max-w-[calc(100vw-24px)] max-h-96 overflow-y-auto bg-parchment border border-void/10 rounded-xl shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-void/10">
              <span className="font-display font-semibold text-void text-base">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-gold hover:text-gold-light">
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="px-6 py-8 text-center text-sm text-void/50">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-void/50">
                Nothing here yet. Announcements, reminders and church alerts will show up here.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.key}
                  onClick={() => markAsRead(n.key)}
                  className={`block w-full text-left px-4 py-3 border-b border-void/5 ${n.is_read ? '' : 'bg-gold/10'}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-void mb-0.5">{n.title}</p>
                      <p className="text-xs text-void/70 mb-1 line-clamp-2">{n.body}</p>
                      <span className="text-[11px] text-void/40">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
            <PhoneAlertsRow />
          </div>,
          document.body
        )}
    </div>
  );
}
