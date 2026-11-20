import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  pushSupported,
  requestPushPermission,
  sendSelfTestPush,
  syncPushSubscription,
} from '../lib/push';

export default function PushPrompt() {
  const { session } = useAuth();
  const [mode, setMode] = useState('hidden');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!pushSupported()) {
      if (!sessionStorage.getItem('gathrd_push_later')) setMode('unsupported');
      return undefined;
    }
    if (Notification.permission === 'denied') {
      if (!sessionStorage.getItem('gathrd_push_hide_denied')) setMode('denied');
      return undefined;
    }
    if (Notification.permission === 'granted') {
      syncPushSubscription(false).catch(() => {});
      if (!sessionStorage.getItem('gathrd_push_hide_on')) setMode('on');
      return undefined;
    }
    if (sessionStorage.getItem('gathrd_push_later')) return undefined;
    const timer = setTimeout(() => setMode('prompt'), 800);
    return () => clearTimeout(timer);
  }, []);

  if (mode === 'hidden') return null;

  async function enable() {
    setBusy(true);
    setNote('');
    try {
      const result = await requestPushPermission();
      if (result.permission === 'denied') {
        setMode('denied');
        return;
      }
      if (result.ok) {
        setMode('on');
        setNote('Saved. Tap Test alert, then lock this phone.');
        return;
      }
      setMode('on');
      setNote(`Could not save this phone${result.error ? ` (${result.error})` : ''}. Tap Turn on again.`);
    } catch (err) {
      setNote(err?.message || 'Could not save this phone. Tap Turn on again.');
    } finally {
      setBusy(false);
    }
  }

  async function testAlert() {
    setBusy(true);
    setNote('');
    try {
      const saved = await syncPushSubscription(false);
      if (!saved.ok) {
        setNote(`Could not save this phone${saved.error ? ` (${saved.error})` : ''}. Tap Turn on, then Test.`);
      }
      const result = await sendSelfTestPush(session);
      if (result?.sent > 0) {
        setNote('Sent. Lock the phone — you should see Gathrd in a few seconds.');
        return;
      }
      if (result?.reason === 'no_subscriptions' || !saved.ok) {
        setNote(`This phone is not saved yet${saved.error ? ` (${saved.error})` : ''}. Tap Turn on, then Test.`);
        return;
      }
      const code = result?.error || (result?.last_status ? `push service status ${result.last_status}` : '');
      setNote(`Could not send${code ? ` (${code})` : ''}. Tap Turn on, then Test.`);
    } catch (err) {
      setNote(err?.message || 'Could not send. Tap Turn on, then Test.');
    } finally {
      setBusy(false);
    }
  }

  function later() {
    if (mode === 'denied') sessionStorage.setItem('gathrd_push_hide_denied', '1');
    else if (mode === 'on') sessionStorage.setItem('gathrd_push_hide_on', '1');
    else sessionStorage.setItem('gathrd_push_later', '1');
    setMode('hidden');
  }

  const isiOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  let body = 'Allow Gathrd to notify you when service starts, an announcement goes out, or a follow-up is assigned.';
  if (mode === 'unsupported') {
    body = isiOS
      ? 'On iPhone: Add to Home Screen, then open Gathrd from the home screen and allow alerts.'
      : 'Use Chrome or Edge on Android, or install Gathrd, to get lock-screen alerts.';
  } else if (mode === 'denied') {
    body = 'Alerts are blocked. In phone settings, allow notifications for Gathrd (or Chrome), then open the app again.';
  } else if (mode === 'on') {
    body = 'Tap Turn on if needed, then Test alert, then lock the screen.';
  }

  const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
  const showTurnOn = mode === 'prompt' || mode === 'on';
  const showTest = mode === 'on' && granted;

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
        <p className="text-xs text-ink/60 mt-1">{body}</p>
        {note && <p className="text-xs text-signal mt-1.5">{note}</p>}
        <div className="flex items-center gap-2 mt-3">
          {showTurnOn && (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              <Bell size={12} /> {busy ? 'Saving…' : 'Turn on'}
            </button>
          )}
          {showTest && (
            <button
              type="button"
              onClick={testAlert}
              disabled={busy || !session}
              className="flex items-center gap-1.5 text-xs border border-signal text-signal rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Test alert'}
            </button>
          )}
          <button type="button" onClick={later} className="text-xs text-ink/50">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
