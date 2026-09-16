// Service Worker: Xử lý thông báo đẩy (Push Notifications) và PWA cho Ban QLDA Giao Thông

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện thông báo đẩy từ máy chủ
self.addEventListener('push', (event) => {
  let data = {
    title: 'Ban QLDA Giao Thông',
    body: 'Có thông báo mới từ hệ thống quản lý',
    icon: '/favicon.ico',
    url: '/schedule',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200], // Rung điện thoại
    data: {
      url: data.url || '/schedule',
    },
    actions: [
      { action: 'open', title: 'Xem chi tiết' },
      { action: 'close', title: 'Đóng' }
    ],
    tag: data.tag || 'qlda-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Xử lý khi người dùng bấm vào thông báo trên điện thoại
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đã có tab web app đang mở thì chuyển tới tab đó
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Nếu chưa có thì mở cửa sổ mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
