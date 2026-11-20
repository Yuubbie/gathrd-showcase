import { supabase } from './supabaseClient';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BIKr0m0c19YlfPcM2T0mSNmaQtt9kUdwLrWUxSKnxiuNHYSs5EX9mFjpP6yxEwLsbZBy4ppRJZVxAS8FxobH0Zc';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function vapidKey() {
  const bytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function parseRpc(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  let registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  } else {
    registration.update().catch(() => {});
  }
  await navigator.serviceWorker.ready;
  return registration;
}

export async function syncPushSubscription(force = false) {
  if (!pushSupported()) return { ok: false, error: 'unsupported' };
  if (Notification.permission !== 'granted') return { ok: false, error: 'permission' };
  const registration = await ensureServiceWorker();
  if (!registration) return { ok: false, error: 'no_service_worker' };

  const applicationServerKey = vapidKey();
  let subscription = await registration.pushManager.getSubscription();
  if (force && subscription) {
    await subscription.unsubscribe().catch(() => {});
    subscription = null;
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (err) {
      subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        return { ok: false, error: err?.message || 'subscribe_failed' };
      }
    }
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: 'bad_subscription' };
  }

  const { data, error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  });
  const parsed = parseRpc(data);
  if (error || !parsed?.ok) {
    return { ok: false, error: parsed?.error || error?.message || 'save_failed' };
  }
  return { ok: true };
}

export async function requestPushPermission() {
  if (!pushSupported()) return { permission: 'unsupported', ok: false };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, ok: false };
  const saved = await syncPushSubscription(false);
  return { permission, ok: saved.ok, error: saved.error };
}

export async function sendChurchPush(session, payload) {
  if (!session?.access_token) return { ok: false, error: 'no_session' };
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || `http_${res.status}`, ...data };
    return data;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function sendSelfTestPush(session) {
  return sendChurchPush(session, {
    self_test: true,
    title: 'Gathrd',
    body: 'Phone alerts are on. You will see church notices on the lock screen.',
    url: '/dashboard',
    tag: 'gathrd-test',
  });
}
