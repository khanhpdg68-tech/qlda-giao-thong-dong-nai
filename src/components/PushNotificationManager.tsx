'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Smartphone, Check, Loader2, X } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);

      // Đăng ký Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
          } else {
            // Nếu chưa bật thông báo và chưa bấm tắt banner thì hiện gợi ý
            const dismissed = localStorage.getItem('push_banner_dismissed');
            if (!dismissed) {
              setShowBanner(true);
            }
          }
        })
        .catch((err) => {
          console.warn('Service Worker registration error:', err);
        });
    }
  }, []);

  const handleSubscribe = async () => {
    if (!isSupported) {
      alert('Trình duyệt hoặc thiết bị của Quý khách không hỗ trợ Web Push Notifications.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Xin quyền thông báo từ trình duyệt/điện thoại
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatusMsg('Quý khách đã từ chối cấp quyền thông báo. Vui lòng bật lại trong Cài đặt trình duyệt/điện thoại.');
        setLoading(false);
        return;
      }

      // 2. Lấy VAPID public key
      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error('Không tìm thấy VAPID key trên máy chủ');
      }

      // 3. Đăng ký push subscription qua Service Worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Gửi subscription lên máy chủ
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh')!)))),
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth')!)))),
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setShowBanner(false);
        setStatusMsg('✓ Đã bật cảnh báo đẩy về thiết bị thành công! Thiết bị sẽ nhận rung chuông khi có sự kiện.');
      } else {
        throw new Error('Lỗi lưu đăng ký trên máy chủ');
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg(e?.message || 'Có lỗi xảy ra khi bật thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('push_banner_dismissed', 'true');
  };

  if (!isSupported) return null;

  return (
    <>
      {/* Banner gợi ý bật thông báo ở đầu màn hình nếu chưa bật */}
      {showBanner && !isSubscribed && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white px-4 py-2.5 rounded-2xl shadow-md mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Smartphone className="w-4 h-4 text-white animate-bounce" />
            </span>
            <div>
              <p className="font-bold">Đồng bộ cảnh báo về điện thoại</p>
              <p className="text-indigo-100 text-[11px]">
                Nhận rung chuông và thông báo đẩy trực tiếp trên điện thoại khi gói thầu $\le 6$h hoặc hợp đồng $\le 15$ ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleSubscribe}
              className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
              <span>Bật Thông Báo Ngay</span>
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="p-1 text-white/70 hover:text-white rounded-lg transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nút bấm trạng thái nhỏ gọn có thể dùng trong header */}
      {statusMsg && (
        <div className="text-[11px] p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl mb-3 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
}
