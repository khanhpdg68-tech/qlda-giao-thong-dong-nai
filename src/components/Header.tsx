'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatDateTimeVN } from '@/lib/formatters';
import BrandLogo from '@/components/BrandLogo';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(formatDateTimeVN(now));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualScan = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/cron/check-alerts', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanMessage(data.message || 'Đã quét xong cảnh báo!');
      } else {
        setScanMessage('Lỗi quét cảnh báo');
      }
    } catch {
      setScanMessage('Không thể kết nối máy chủ quét cảnh báo');
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 6000);
    }
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-subtle">
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Unit Info & Mobile Menu Trigger */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-1.5 -ml-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl lg:hidden transition-colors shrink-0"
            title="Mở toàn bộ danh mục menu"
            aria-label="Mở Menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="sm" className="hidden sm:flex shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-extrabold text-amber-600 tracking-wider uppercase font-sans truncate leading-tight">
                UBND THÀNH PHỐ ĐỒNG NAI
              </p>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase truncate mt-0.5 leading-snug">
                BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
              </h2>
            </div>
          </div>
        </div>

        {/* Action Controls & Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Realtime clock (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 text-slate-700 rounded-xl text-xs font-mono font-medium border border-slate-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{time || '--/--/---- --:--'}</span>
          </div>

          {/* Quick Manual Scan Alerts */}
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all shadow-2xs disabled:opacity-50 active:scale-98"
            title="Quét gói thầu ≤6h và hợp đồng ≤15 ngày"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden xs:inline sm:inline">{isScanning ? 'Đang quét...' : 'Quét Cảnh Báo'}</span>
          </button>

          {/* Excel Export Button */}
          <a
            href="/api/export/excel"
            download
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-2xs active:scale-98"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </a>
        </div>
      </div>

      {/* Toast Alert Message if triggered */}
      {scanMessage && (
        <div className="bg-indigo-50 border-t border-indigo-100 px-4 sm:px-6 py-2 text-xs text-indigo-900 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-medium">{scanMessage}</span>
        </div>
      )}
    </header>
  );
}
