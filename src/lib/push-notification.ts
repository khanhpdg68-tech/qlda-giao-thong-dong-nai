import webPush from 'web-push';
import { prisma } from './prisma';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:khanhpdg68@gmail.com';

if (publicKey && privateKey) {
  webPush.setVapidDetails(subject, publicKey, privateKey);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export async function sendPushNotificationToAll(payload: PushPayload) {
  if (!publicKey || !privateKey) {
    console.warn('VAPID keys chưa được cấu hình. Bỏ qua gửi Push Notification.');
    return { sentCount: 0, failedCount: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  let sentCount = 0;
  let failedCount = 0;

  const notificationData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/schedule',
    icon: payload.icon || '/favicon.ico',
    tag: payload.tag || 'qlda-alert',
  });

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webPush.sendNotification(pushSubscription, notificationData);
      sentCount++;
    } catch (err: any) {
      failedCount++;
      // Nếu thiết bị đã hủy quyền hoặc hết hạn (410 Gone / 404 Not Found), tự động dọn dẹp
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return { sentCount, failedCount, total: subscriptions.length };
}
