self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);

function notificationUrl(path) {
  if (
    typeof path !== "string" ||
    !/^\/partida\/[a-z-]+\/[a-z0-9._-]+\/\d{1,15}$/i.test(path)
  )
    return new URL("/", self.location.origin);
  return new URL(path, self.location.origin);
}

self.addEventListener("push", (event) => {
  let alert;
  try {
    alert = event.data?.json();
  } catch {
    return;
  }
  if (
    !alert ||
    typeof alert.title !== "string" ||
    typeof alert.body !== "string"
  )
    return;
  event.waitUntil(
    (async () => {
      const test =
        typeof alert.id === "string" &&
        alert.id.startsWith("sportstates-test:");
      let shown = false;
      try {
        await self.registration.showNotification(alert.title, {
          body: alert.body,
          icon: "/brand/push-192.png",
          badge: "/brand/push-badge.png",
          tag: typeof alert.id === "string" ? alert.id : undefined,
          silent: alert.silent === true,
          data: { url: notificationUrl(alert.url).pathname },
        });
        shown = true;
      } finally {
        if (test) {
          const windows = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });
          for (const client of windows)
            client.postMessage({ type: "sportstates-push-test", shown });
        }
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = notificationUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const existing = windows.find((client) => client.url === url.href);
        if (existing) return existing.focus();
        return self.clients.openWindow(url.href);
      }),
  );
});
