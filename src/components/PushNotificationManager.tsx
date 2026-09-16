'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, Smartphone, Check, Loader2, X, Download, Share, HelpCircle } from 'lucide-react';

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
  const [testingPush, setTestingPush] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Trạng thái PWA cài đặt
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Phát hiện iOS và chế độ standalone (đã cài ra màn hình chính)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    setIsIOS(isIosDevice);
    setIsStandalone(standaloneMode);

    // Lắng nghe sự kiện cài đặt PWA trên Android/Chrome
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Kiểm tra hỗ trợ Web Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);

      // Đăng ký Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
          } else {
            const dismissed = localStorage.getItem('push_banner_dismissed');
            if (!dismissed) {
              setShowBanner(true);
            }
          }
        })
        .catch((err) => {
          console.warn('Service Worker registration warning:', err);
        });
    } else {
      // Nếu là iOS mà chưa cài ra màn hình chính thì hiển thị hướng dẫn
      if (isIosDevice && !standaloneMode) {
        const dismissedIos = localStorage.getItem('ios_guide_dismissed');
        if (!dismissedIos) {
          setShowIOSGuide(true);
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsStandalone(true);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleSubscribe = async () => {
    if (!isSupported) {
      if (isIOS && !isStandalone) {
        setShowIOSGuide(true);
        return;
      }
      alert('Trình duyệt hoặc thiết bị của Quý khách không hỗ trợ Web Push Notifications.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Xin quyền thông báo từ trình duyệt/điện thoại
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatusMsg({
          text: 'Quý khách đã từ chối quyền thông báo. Vui lòng vào Cài đặt trình duyệt/điện thoại để cấp quyền.',
          success: false,
        });
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
        setStatusMsg({
          text: '✓ Đã kích hoạt cảnh báo đẩy thành công! Thiết bị sẽ nhận rung chuông trực tuyến 24/7.',
          success: true,
        });
      } else {
        throw new Error('Lỗi lưu đăng ký thiết bị trên máy chủ');
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg({
        text: e?.message || 'Có lỗi xảy ra khi kích hoạt thông báo',
        success: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          text: `✓ ${data.message || 'Đã phát cảnh báo thử nghiệm thành công! Vui lòng kiểm tra màn hình điện thoại.'}`,
          success: true,
        });
      } else {
        setStatusMsg({
          text: data.message || 'Chưa gửi được cảnh báo. Hãy chắc chắn rằng Quý khách đã bấm Bật Thông Báo.',
          success: false,
        });
      }
    } catch {
      setStatusMsg({
        text: 'Không thể kết nối máy chủ gửi thông báo kiểm tra',
        success: false,
      });
    } finally {
      setTestingPush(false);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('push_banner_dismissed', 'true');
  };

  const handleDismissIOSGuide = () => {
    setShowIOSGuide(false);
    localStorage.setItem('ios_guide_dismissed', 'true');
  };

  return (
    <>
      {/* 1. HƯỚNG DẪN DÀNH CHO IPHONE (iOS) KHI CHƯA THÊM RA MÀN HÌNH CHÍNH */}
      {showIOSGuide && (
        <div className="bg-gradient-to-r from-sky-700 via-indigo-700 to-indigo-800 text-white px-4 py-3 rounded-2xl shadow-lg mb-4 border border-sky-400/30 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-xl mt-0.5 shrink-0">
                <Share className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm flex items-center gap-1.5">
                  <span>Cài đặt ứng dụng lên iPhone để chạy 24/7</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                    Apple iOS
                  </span>
                </p>
                <p className="text-sky-100 leading-relaxed text-[12px]">
                  Để ứng dụng chạy ổn định mọi lúc không cần mở trình duyệt và nhận rung chuông cảnh báo:
                </p>
                <ol className="list-decimal list-inside text-white/95 space-y-0.5 text-[11px] font-medium bg-black/15 p-2 rounded-xl">
                  <li>
                    Nhấn nút <strong>Chia sẻ (Share)</strong> <span className="text-amber-300 font-bold">[⎋]</span> ở thanh dưới cùng Safari.
                  </li>
                  <li>
                    Cuộn xuống và chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                  </li>
                  <li>Mở ứng dụng từ Màn hình chính và nhấn <strong>Bật Thông Báo</strong> để nhận rung chuông.</li>
                </ol>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissIOSGuide}
              className="p-1 text-white/70 hover:text-white rounded-lg transition-colors shrink-0"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. NÚT CÀI ĐẶT NHANH TRÊN ANDROID HOẶC CHROME */}
      {installPrompt && !isStandalone && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-2xl shadow-md mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Download className="w-4 h-4 text-white animate-bounce" />
            </span>
            <div>
              <p className="font-bold">Cài đặt Ứng dụng Quản trị lên Điện thoại</p>
              <p className="text-emerald-100 text-[11px]">
                Truy cập ngay lập tức từ màn hình chính, nhận cảnh báo 24/7 mà không phụ thuộc vào trình duyệt.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài Đặt Ngay</span>
            </button>
            <button
              type="button"
              onClick={() => setInstallPrompt(null)}
              className="p-1 text-white/70 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. BANNER GỢI Ý BẬT THÔNG BÁO ĐẨY NẾU CHƯA BẬT */}
      {showBanner && !isSubscribed && isSupported && (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white px-4 py-2.5 rounded-2xl shadow-md mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Smartphone className="w-4 h-4 text-white animate-bounce" />
            </span>
            <div>
              <p className="font-bold">Đồng bộ cảnh báo về điện thoại di động 24/7</p>
              <p className="text-indigo-100 text-[11px]">
                Nhận rung chuông và thông báo đẩy trực tiếp khi Gói thầu ≤ 6h hoặc Hợp đồng ≤ 15 ngày.
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
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. THANH TRẠNG THÁI / PHẢN HỒI */}
      {statusMsg && (
        <div
          className={`text-xs p-2.5 rounded-xl mb-3 flex items-center justify-between border ${
            statusMsg.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {statusMsg.success && isSubscribed && (
              <button
                type="button"
                disabled={testingPush}
                onClick={handleTestPush}
                className="text-[11px] font-bold px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1"
              >
                {testingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
                <span>Rung thử máy</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

