'use client';

import React from 'react';
import { formatCurrencyVN } from '@/lib/formatters';

interface ProjectComparisonItem {
  projectCode: string;
  projectName: string;
  totalPackagePrice: number;
  totalContractPrice: number;
  totalSavings: number;
  savingsRate: number;
}

interface PriceComparisonChartProps {
  data: ProjectComparisonItem[];
}

export default function PriceComparisonChart({ data }: PriceComparisonChartProps) {
  // Tìm giá trị lớn nhất để làm tỷ lệ 100%
  const maxPrice = Math.max(
    ...data.map((d) => Math.max(d.totalPackagePrice, d.totalContractPrice)),
    1000000
  );

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
              So Sánh Giá Gói Thầu & Giá Trúng Thầu Theo Dự Án
            </h4>
            <p className="text-xs text-slate-500">
              Đánh giá hiệu quả tiết kiệm ngân sách nhà nước qua công tác đấu thầu
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-300"></span>
              <span className="text-slate-600">Giá gói thầu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600"></span>
              <span className="text-slate-600">Giá hợp đồng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-600">Tiết kiệm</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 my-2">
          {data.map((item) => {
            const pkgPct = (item.totalPackagePrice / maxPrice) * 100;
            const contractPct = (item.totalContractPrice / maxPrice) * 100;

            return (
              <div key={item.projectCode} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-800 truncate max-w-sm">
                    <span className="text-indigo-600 font-mono mr-1.5">[{item.projectCode}]</span>
                    {item.projectName}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      Tiết kiệm: {formatCurrencyVN(item.totalSavings)} ({item.savingsRate.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {/* Thanh Giá gói thầu */}
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-[10px] text-slate-500 font-medium shrink-0">Giá gói:</span>
                    <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pkgPct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-700 w-28 text-right shrink-0">
                      {formatCurrencyVN(item.totalPackagePrice)}
                    </span>
                  </div>

                  {/* Thanh Giá Hợp đồng */}
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-[10px] text-indigo-700 font-semibold shrink-0">Giá HĐ:</span>
                    <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(contractPct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-indigo-900 w-28 text-right shrink-0">
                      {formatCurrencyVN(item.totalContractPrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
