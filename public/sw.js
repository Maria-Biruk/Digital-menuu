// public/sw.js — Service Worker for Skill Coffee Push Notifications
// Registered by lib/push.ts on the client.
// Handles push events and notification clicks.
'use strict';

const ICON  = '/skill-coffee-icon.png';
const BADGE = '/skill-coffee-icon.png';

// ---------------------------------------------------------------------------
// Push: show notification
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Skill Coffee', body: event.data.text() };
  }

  const title = payload.title ?? 'Skill Coffee';
  const options = {
    body:             payload.body ?? '',
    icon:             ICON,
    badge:            BADGE,
    tag:              payload.tag  ?? 'skill-coffee-notification',
    data:             { url: payload.url ?? '/' },
    requireInteraction: false,
    vibrate:          [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Notification click: focus existing tab or open new one
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If a tab with this path is already open, focus it
        for (const client of windowClients) {
          try {
            const clientPath = new URL(client.url).pathname;
            const targetPath = new URL(targetUrl, self.location.origin).pathname;
            if (clientPath === targetPath) {
              return client.focus();
            }
          } catch {
            // ignore URL parse errors
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});

// ---------------------------------------------------------------------------
// Lifecycle: activate immediately so push events work right away
// ---------------------------------------------------------------------------
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
