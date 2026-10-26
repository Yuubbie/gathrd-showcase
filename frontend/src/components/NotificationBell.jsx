import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const READ_KEY = 'gathrd_announcement_reads';

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

function saveReadIds(ids) {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
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
    setLoading(true);
    const readIds = loadReadIds();
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, sent_at, is_emergency')
      .not('sent_at', 'is', null)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(20);
    if (!error && data) {
      setNotifications(
        data.map((a) => ({
          id: a.id,
          title: a.is_emergency ? `Urgent: ${a.title}` : a.title,
          body: a.body,
          created_at: a.sent_at,
          is_read: readIds.includes(a.id),
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
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

  function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    const next = Array.from(new Set([...loadReadIds(), id]));
    saveReadIds(next);
  }

  function markAllRead() {
    const ids = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    saveReadIds(Array.from(new Set([...loadReadIds(), ...ids])));
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
                Nothing here yet. When your church sends an announcement, it will show up here.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
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
          </div>,
          document.body
        )}
    </div>
  );
}
