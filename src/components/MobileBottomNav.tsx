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
} from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Tổng quan',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Dự án',
      href: '/projects',
      icon: FolderGit2,
    },
    {
      name: 'Đấu thầu',
      href: '/bidding',
      icon: Scale,
    },
    {
      name: 'Hợp đồng',
      href: '/contracts',
      icon: FileCheck2,
    },
    {
      name: 'Lịch việc',
      href: '/schedule',
      icon: CalendarDays,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-1 py-1.5 safe-area-bottom">
      <div className="grid grid-cols-5 items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-full">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
