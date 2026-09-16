import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayoutClient from '@/components/AppLayoutClient';

export const metadata: Metadata = {
  title: 'UBND TP ĐỒNG NAI - BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG | Quản Lý Đấu Thầu & Hợp Đồng',
  description:
    'Hệ thống Quản lý Đấu thầu, Giám sát Tiến độ và Phụ lục Hợp đồng Xây dựng - UBND Thành phố Đồng Nai - Ban QLDA ĐTXD Công trình Giao thông',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QLDA Giao Thông" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-100 selection:text-indigo-900">
        <AppLayoutClient>{children}</AppLayoutClient>
      </body>
    </html>
  );
}
