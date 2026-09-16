'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderGit2,
  Scale,
  FileCheck2,
  CalendarDays,
  Sparkles,
  Download,
  ShieldCheck,
  X,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

interface SidebarProps {
  urgentContractsCount?: number;
  urgentBiddingCount?: number;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  urgentContractsCount = 0,
  urgentBiddingCount = 0,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Tổng Quan Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Danh Mục Dự Án',
      href: '/projects',
      icon: FolderGit2,
    },
    {
      name: 'Quản Lý Đấu Thầu',
      href: '/bidding',
      icon: Scale,
      badge: urgentBiddingCount > 0 ? `${urgentBiddingCount} gói ≤6h` : undefined,
      badgeColor: 'bg-rose-600 text-white animate-pulse',
    },
    {
      name: 'Quản Lý Hợp Đồng',
      href: '/contracts',
      icon: FileCheck2,
      badge: urgentContractsCount > 0 ? `${urgentContractsCount} HĐ ≤15d` : undefined,
      badgeColor: 'bg-red-600 text-white animate-pulse',
    },
    {
      name: 'Kế Hoạch Làm Việc',
      href: '/schedule',
      icon: CalendarDays,
    },
    {
      name: 'Trợ Lý AI',
      href: '/ai-assistant',
      icon: Sparkles,
      badge: 'AI Chat',
      badgeColor: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm',
    },
  ];

  // Khối nội dung menu dùng chung cho cả Desktop & Mobile Drawer
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand / Logo Ban QLDA */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold text-amber-400 tracking-wider uppercase font-sans leading-tight truncate">
              UBND THÀNH PHỐ ĐỒNG NAI
            </p>
            <h1 className="font-extrabold text-[11px] text-white tracking-tight uppercase font-sans mt-0.5 leading-snug">
              BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
            </h1>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
            title="Đóng Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Danh sách liên kết điều hướng */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobile && onClose) onClose();
              }}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Nút Xuất Báo Cáo Nhanh Excel */}
      <div className="p-3.5 m-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 space-y-2">
        <div className="font-semibold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Xuất Báo Cáo Nhanh</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Tải biểu mẫu Excel tổng hợp tiến độ gói thầu & hợp đồng mới nhất.
        </p>
        <a
          href="/api/export/excel"
          download
          className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-xs transition-colors text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải File Excel (.xlsx)</span>
        </a>
      </div>

      {/* Thông tin kết nối cảnh báo hệ thống */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Hệ Thống Trực Tuyến
          </span>
          <span className="text-[10px] text-slate-500 font-mono">24/7</span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono truncate">
          Cảnh báo: <span className="text-indigo-300">khanhpdg68@gmail.com</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR: Chỉ hiển thị trên màn hình rộng (lg >= 1024px) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-100 flex-col shrink-0 min-h-screen border-r border-slate-800 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. MOBILE DRAWER: Menu trượt cảm ứng trên điện thoại (< 1024px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Màn hình mờ bóng tối khi trượt mở */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Ngăn kéo menu trượt từ trái sang */}
          <div className="relative z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
