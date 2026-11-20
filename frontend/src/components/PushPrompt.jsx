import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  pushPromptSnoozed,
  pushState,
  requestPushPermission,
  snoozePushPrompt,
  syncPushSubscription,
} from '../lib/push';

// Asks once, politely, then stays out of the way:
//  - alerts already on  -> nothing shown (the phone is kept registered quietly)
//  - blocked / unsupported -> nothing shown (help lives in the bell panel)
//  - "Not now" -> not asked again for 14 days
export default function PushPrompt() {
  const [mode, setMode] = useState('hidden'); // hidden | prompt | done
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const state = pushState();
    if (state === 'granted') {
      syncPushSubscription(false).catch(() => {});
      return undefined;
    }
    if (state !== 'default' || pushPromptSnoozed()) return undefined;
    const timer = setTimeout(() => setMode('prompt'), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mode !== 'done') return undefined;
    const timer = setTimeout(() => setMode('hidden'), 3000);
    return () => clearTimeout(timer);
  }, [mode]);

  async function enable() {
    setBusy(true);
    setNote('');
    try {
      const result = await requestPushPermission();
      if (result.permission === 'denied') {
        snoozePushPrompt(365);
        setMode('hidden');
        return;
      }
      if (result.ok) {
        setMode('done');
        return;
      }
      setNote(`Could not turn on alerts${result.error ? ` (${result.error})` : ''}. Please try again.`);
    } catch (err) {
      setNote(err?.message || 'Could not turn on alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function notNow() {
    snoozePushPrompt(14);
    setMode('hidden');
  }

  if (mode === 'hidden') return null;

  return (
    <div
      className="fixed z-40 print:hidden left-3 right-3 md:left-auto md:right-4 md:w-80"
      style={{ bottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 4.5rem))' }}
      role="status"
    >
      {mode === 'done' ? (
        <div className="rounded-xl bg-ink text-white px-4 py-3 shadow-lg text-sm font-semibold flex items-center gap-2">
          <Bell size={15} className="text-gold" /> Alerts are on
        </div>
      ) : (
        <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal/10 text-signal">
              <Bell size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Get church alerts on your phone</p>
              <p className="text-xs text-ink/60 mt-0.5">Service reminders and announcements, even when the app is closed.</p>
              {note && <p className="text-xs text-rose mt-1.5">{note}</p>}
              <div className="flex items-center gap-3 mt-2.5">
                <button
                  type="button"
                  onClick={enable}
                  disabled={busy}
                  className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
                >
                  {busy ? 'Turning on…' : 'Turn on'}
                </button>
                <button type="button" onClick={notNow} disabled={busy} className="text-sm text-ink/60 px-1 py-2">
                  Not now
                </button>
              </div>
            </div>
            <button type="button" onClick={notNow} aria-label="Dismiss" className="p-1 -mr-1 -mt-1 text-ink/30 hover:text-ink/60">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
