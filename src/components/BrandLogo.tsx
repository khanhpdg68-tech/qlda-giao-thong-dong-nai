import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function BrandLogo({
  className = '',
  size = 'md',
  showText = false,
}: BrandLogoProps) {
  // Kích thước chuẩn
  const sizeMap = {
    sm: { box: 'w-8 h-8', px: 32 },
    md: { box: 'w-10 h-10', px: 40 },
    lg: { box: 'w-12 h-12', px: 48 },
    xl: { box: 'w-16 h-16', px: 64 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Biểu tượng Logo Vector SVG */}
      <div
        className={`${currentSize.box} relative shrink-0 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-0.5 shadow-md shadow-indigo-900/30 ring-1 ring-white/20`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full rounded-[14px]"
        >
          {/* Nền gradient chiều sâu */}
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#3730a3" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="roadGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Vòng viền địa cầu & tọa độ xây dựng */}
          <circle cx="24" cy="24" r="21" stroke="#38bdf8" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="24" cy="24" r="18" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75" />

          {/* Trụ tháp cầu dây văng hiện đại (biểu tượng công trình giao thông) */}
          {/* Tháp cầu chính */}
          <path
            d="M24 6L21.5 30H26.5L24 6Z"
            fill="url(#goldGrad)"
          />
          {/* Đỉnh tháp thắp sáng */}
          <circle cx="24" cy="6" r="2" fill="#fbbf24" />

          {/* Dây văng trái & phải */}
          <line x1="24" y1="11" x2="12" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />
          <line x1="24" y1="16" x2="15" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />
          <line x1="24" y1="21" x2="18" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />

          <line x1="24" y1="11" x2="36" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />
          <line x1="24" y1="16" x2="33" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />
          <line x1="24" y1="21" x2="30" y2="30" stroke="#fde047" strokeWidth="1" strokeOpacity="0.85" />

          {/* Dầm cầu vòm ngang */}
          <path
            d="M8 30C16 28 32 28 40 30L42 32C32 30 16 30 6 32L8 30Z"
            fill="#ffffff"
          />

          {/* Tuyến cao tốc mở rộng vươn ra phía trước */}
          <path
            d="M17 31L10 44H38L31 31H17Z"
            fill="url(#roadGrad)"
            fillOpacity="0.9"
          />

          {/* Vạch kẻ đường cao tốc vàng kim */}
          <line x1="24" y1="32" x2="24" y2="35" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="24" y1="37" x2="24" y2="40" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="42" x2="24" y2="44" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />

          {/* Ngôi sao vàng phát triển phía trên */}
          <polygon
            points="24,2 24.8,3.8 26.8,3.9 25.2,5.2 25.7,7.1 24,6 22.3,7.1 22.8,5.2 21.2,3.9 23.2,3.8"
            fill="#f59e0b"
          />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-extrabold text-indigo-300 tracking-wider uppercase font-sans leading-tight">
            UBND THÀNH PHỐ ĐỒNG NAI
          </p>
          <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase font-sans mt-0.5 leading-snug truncate">
            BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
          </h1>
        </div>
      )}
    </div>
  );
}
