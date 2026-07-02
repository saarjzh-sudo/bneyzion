/* T08 app-push — Web Push handlers.
 *
 * This file is NOT a standalone service worker. It is pulled into the
 * Workbox-generated service worker via vite.config -> workbox.importScripts,
 * so it runs inside the same SW that already handles offline precaching.
 * Keep it side-effect-light: only push + notificationclick listeners here.
 *
 * Payload shape (sent by the broadcast-notification edge function):
 *   { title, body, link, icon, badge, tag }
 */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: event.data ? event.data.text() : "בני ציון" };
  }

  const title = payload.title || "בני ציון";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/lovable-uploads/logo-bney-zion.png",
    badge: payload.badge || "/favicon.png",
    dir: "rtl",
    lang: "he",
    tag: payload.tag || "bney-zion",
    renotify: true,
    data: { url: payload.link || payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open, then route it to the target.
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
