'use client';

import React from 'react';

interface StatusItem {
  label: string;
  count: number;
  color: string;
  code: string;
}

interface StatusPieChartProps {
  data: StatusItem[];
  title?: string;
}

export default function StatusPieChart({
  data,
  title = 'Phân bổ Trạng thái Gói thầu',
}: StatusPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Tính toán góc SVG donut chart
  let cumulativeAngle = 0;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const slices = data
    .filter((d) => d.count > 0)
    .map((item) => {
      const percentage = total > 0 ? (item.count / total) * 100 : 0;
      const strokeDashoffset = circumference - (percentage / 100) * circumference;
      const angle = (cumulativeAngle / 100) * 360;
      cumulativeAngle += percentage;

      return {
        ...item,
        percentage,
        strokeDashoffset,
        angle,
      };
    });

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <h4 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-500">Tổng: {total} gói</span>
      </h4>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="text-slate-100"
              strokeWidth="22"
              stroke="currentColor"
              fill="transparent"
            />
            {total === 0 ? (
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-200"
                strokeWidth="22"
                stroke="currentColor"
                fill="transparent"
              />
            ) : (
              slices.map((slice) => (
                <circle
                  key={slice.code}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={slice.color}
                  strokeWidth="22"
                  strokeDasharray={circumference}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    transformOrigin: 'center',
                    transform: `rotate(${slice.angle}deg)`,
                    transition: 'all 0.5s ease-out',
                  }}
                />
              ))
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-800">{total}</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">Gói thầu</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {data.map((item) => {
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
            return (
              <div key={item.code} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 pl-2">
                  <span className="font-bold text-slate-800">{item.count}</span>
                  <span className="text-[11px] text-slate-400 w-8 text-right">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
