import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { pushSupported, requestPushPermission, syncPushSubscription } from '../lib/push';

export default function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return undefined;
    if (Notification.permission === 'granted') {
      syncPushSubscription();
      return undefined;
    }
    if (Notification.permission === 'denied') return undefined;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  async function enable() {
    setBusy(true);
    await requestPushPermission();
    setBusy(false);
    setVisible(false);
  }

  return (
    <div
      className="fixed z-40 print:hidden"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'max(4.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="max-w-xs rounded-2xl border border-ink/10 bg-white p-3 shadow-lg">
        <p className="text-sm font-semibold text-ink">Phone alerts</p>
        <p className="text-xs text-ink/60 mt-1">
          Allow Gathrd to notify you when service starts, an announcement goes out, or a follow-up is assigned.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
          >
            <Bell size={12} /> {busy ? 'Turning on…' : 'Turn on'}
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-xs text-ink/50"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
