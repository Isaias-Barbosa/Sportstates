// Local notifications only. Background push delivery is not enabled in this phase.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(typeof path === 'string' && path.startsWith('/partida/') ? path : '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async windows => {
    const existing = windows.find(client => client.url === url.href);
    if (existing) return existing.focus();
    return self.clients.openWindow(url.href);
  }));
});
