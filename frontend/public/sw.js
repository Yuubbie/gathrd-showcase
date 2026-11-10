self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Gathrd';
  const options = {
    body: data.body || 'Open Gathrd',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'gathrd',
    data: { url: data.url || '/dashboard' },
    renotify: true,
    vibrate: [200, 100, 200],
    silent: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && target) {
          try { await client.navigate(target); } catch { /* already open */ }
        }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
