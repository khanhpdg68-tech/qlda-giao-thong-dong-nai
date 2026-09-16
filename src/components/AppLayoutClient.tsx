'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileBottomNav from '@/components/MobileBottomNav';
import AiChatFloatingWidget from '@/components/AiChatFloatingWidget';
import PushNotificationManager from '@/components/PushNotificationManager';

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-slate-50 text-slate-800 relative">
      {/* Sidebar: Cố định trên Desktop (lg >= 1024px), Ngăn kéo trượt trên Mobile */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Vùng hiển thị nội dung: Chiếm 100% chiều rộng trên Mobile */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Thêm pb-24 trên mobile để không bị thanh Bottom Nav che khuất nội dung */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 w-full max-w-7xl mx-auto min-w-0">
          <PushNotificationManager />
          {children}
        </main>
      </div>

      {/* Nút Trợ lý AI nổi ở góc dưới */}
      <AiChatFloatingWidget />

      {/* Thanh điều hướng đáy dành riêng cho Điện thoại */}
      <MobileBottomNav />
    </div>
  );
}
