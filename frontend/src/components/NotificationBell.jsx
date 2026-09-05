// src/components/NotificationBell.jsx
//
// Bell icon + unread badge, with a dropdown panel listing recent
// in-app notifications. Uses the same Tailwind tokens as the rest
// of Gathrd (gold, gold-light, parchment, void) to match AppShell.jsx.

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, is_read, created_at, source_type')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setNotifications(data);
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

  // Recompute panel position on resize/orientation change while open,
  // so rotating a phone or resizing a window doesn't leave it stranded.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320; // matches w-80
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
      const panelWidth = 320; // matches w-80
      const margin = 12;
      let left = rect.left;
      // Clamp so the panel never runs off the right edge on narrow/mobile screens
      if (left + panelWidth + margin > window.innerWidth) {
        left = window.innerWidth - panelWidth - margin;
      }
      if (left < margin) left = margin;
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen((v) => !v);
  }

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
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
                Nothing here yet. Announcements and updates from your church will show up here.
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
