import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  FolderGit2,
  Scale,
  FileCheck2,
  AlertTriangle,
  TrendingDown,
  Clock,
  ArrowRight,
  ShieldAlert,
  Coins,
  CalendarDays,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  calculateSavingsRate,
  getCurrentEndDate,
  calculateRemainingDays,
  getContractUrgency,
  getBiddingUrgency,
  getGuaranteeUrgency,
} from '@/lib/calculations';
import { formatCurrencyVN, formatDateVN } from '@/lib/formatters';
import StatusPieChart from '@/components/charts/StatusPieChart';
import PriceComparisonChart from '@/components/charts/PriceComparisonChart';
import BrandLogo from '@/components/BrandLogo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const now = new Date();

  // 1. Tải danh sách dự án, gói thầu, hợp đồng và kế hoạch làm việc cá nhân
  const [projects, packages, contracts, workPlans] = await Promise.all([
    prisma.project.findMany({
      include: {
        biddingPackages: true,
        contracts: true,
      },
    }),
    prisma.biddingPackage.findMany({
      include: {
        project: true,
        contract: true,
      },
    }),
    prisma.contract.findMany({
      include: {
        project: true,
        package: true,
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
    }),
    prisma.workPlan.findMany({
      where: {
        isCompleted: false,
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
      take: 5,
    }),
  ]);

  // 2. Thống kê KPI
  const totalProjects = projects.length;
  const totalPackages = packages.length;
  const totalContracts = contracts.length;

  // Tổng giá trị gói thầu & hợp đồng
  let totalPackagePrice = 0;
  let totalContractPrice = 0;

  contracts.forEach((c) => {
    const pkgPrice = c.adjustedPackagePrice || c.package?.packagePrice || c.packagePrice || c.contractPrice;
    totalPackagePrice += pkgPrice;
    totalContractPrice += c.adjustedContractPrice || c.contractPrice;
  });

  const totalSavings = Math.max(0, totalPackagePrice - totalContractPrice);
  const overallSavingsRate = totalPackagePrice > 0 ? (totalSavings / totalPackagePrice) * 100 : 0;

  // 3. Phân tích gói thầu sắp đóng thầu (<= 6 tiếng)
  const urgentPackages = packages
    .map((pkg) => {
      const urgency = getBiddingUrgency(pkg.bidCloseTime, pkg.status, now);
      return { ...pkg, urgency };
    })
    .filter((pkg) => pkg.urgency.isUrgent);

  // 4. Phân tích hợp đồng cần gia hạn (<= 15 ngày) hoặc quá hạn
  const evaluatedContracts = contracts.map((c) => {
    const currentEndDate = getCurrentEndDate(c.originalEndDate, c.addendums);
    const remainingDays = calculateRemainingDays(currentEndDate, now);
    const urgency = getContractUrgency(currentEndDate, c.status === 'LIQUIDATED', now);
    const guarantee = getGuaranteeUrgency(c.guaranteeEndDate, (c as any).guaranteeType || 'BY_DATE', now);
    const effectivePackagePrice = c.adjustedPackagePrice || c.package?.packagePrice || c.packagePrice || c.contractPrice;
    const savingsRate = calculateSavingsRate(effectivePackagePrice, c.adjustedContractPrice || c.contractPrice);

    return {
      ...c,
      currentEndDate,
      remainingDays,
      urgency,
      guarantee,
      savingsRate,
    };
  });

  const urgentContracts = evaluatedContracts.filter(
    (c) => c.status !== 'LIQUIDATED' && (c.remainingDays <= 15 || c.remainingDays < 0)
  );

  const urgentGuarantees = evaluatedContracts.filter(
    (c) => c.status !== 'LIQUIDATED' && c.guarantee?.isWarning
  );

  // 5. Dữ liệu cho biểu đồ Donut Trạng thái Gói thầu
  const statusCounts = {
    DRAFT: packages.filter((p) => p.status === 'DRAFT').length,
    PUBLISHED: packages.filter((p) => p.status === 'PUBLISHED').length,
    EVALUATING: packages.filter((p) => p.status === 'EVALUATING').length,
    AWARDED: packages.filter((p) => p.status === 'AWARDED').length,
    CANCELED: packages.filter((p) => p.status === 'CANCELED' || p.status === 'RE_BIDDING').length,
  };

  const statusPieData = [
    { label: 'Đang mời thầu', count: statusCounts.PUBLISHED, color: '#3b82f6', code: 'PUBLISHED' },
    { label: 'Đang chấm thầu', count: statusCounts.EVALUATING, color: '#f59e0b', code: 'EVALUATING' },
    { label: 'Đã trao thầu', count: statusCounts.AWARDED, color: '#10b981', code: 'AWARDED' },
    { label: 'Chuẩn bị HSMT', count: statusCounts.DRAFT, color: '#6366f1', code: 'DRAFT' },
    { label: 'Hủy/Đấu thầu lại', count: statusCounts.CANCELED, color: '#94a3b8', code: 'CANCELED' },
  ];

  // 6. Dữ liệu cho biểu đồ So sánh Giá gói vs Giá HĐ theo từng Dự án
  const projectComparisonData = projects.map((proj) => {
    let pkgPrice = 0;
    let ctrPrice = 0;

    proj.contracts.forEach((c) => {
      const pkg = packages.find((p) => p.id === c.packageId);
      const pkgPriceVal = c.adjustedPackagePrice || pkg?.packagePrice || c.packagePrice || c.contractPrice;
      pkgPrice += pkgPriceVal;
      ctrPrice += c.adjustedContractPrice || c.contractPrice;
    });

    const savings = Math.max(0, pkgPrice - ctrPrice);
    const rate = pkgPrice > 0 ? (savings / pkgPrice) * 100 : 0;

    return {
      projectCode: proj.projectCode,
      projectName: proj.projectName,
      totalPackagePrice: pkgPrice,
      totalContractPrice: ctrPrice,
      totalSavings: savings,
      savingsRate: rate,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Tiêu Đề Điều Hành */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          <BrandLogo size="lg" className="hidden sm:flex shrink-0" />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-lg tracking-wider uppercase font-sans">
                🏛️ UBND THÀNH PHỐ ĐỒNG NAI
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Hệ Thống Trực Tuyến 24/7
              </span>
            </div>

            <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase">
              BAN QLDA ĐTXD CÔNG TRÌNH GIAO THÔNG
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Trung tâm Điều hành & Giám sát Tiến độ Đấu thầu, Hiệu lực Hợp đồng và Kế hoạch Công tác
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <Link
            href="/bidding"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs active:scale-98"
          >
            <Scale className="w-4 h-4" />
            <span>Quản Lý Đấu Thầu</span>
          </Link>
          <Link
            href="/contracts"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs active:scale-98"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Quản Lý Hợp Đồng</span>
          </Link>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all border border-slate-200 active:scale-98"
          >
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span>Lịch Công Tác</span>
          </Link>
        </div>
      </div>

      {/* 4 Bento KPI Cards Tối Giản Hiện Đại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng Dự án */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card transition-all duration-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dự án công trình</p>
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{totalProjects}</h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">Dự án ĐTXD trọng điểm</p>
          </div>
        </div>

        {/* Card 2: Gói thầu & Cảnh báo 6h */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card transition-all duration-200 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            urgentPackages.length > 0
              ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
              : 'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            <Scale className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gói thầu quản lý</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{totalPackages}</h3>
              {urgentPackages.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  {urgentPackages.length} ≤6h
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {packages.filter((p) => p.status === 'PUBLISHED').length} gói đang mời thầu
            </p>
          </div>
        </div>

        {/* Card 3: Hợp đồng & Cảnh báo 15 ngày */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card transition-all duration-200 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            urgentContracts.length > 0
              ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hợp đồng thi công</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{totalContracts}</h3>
              {urgentContracts.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  {urgentContracts.length} ≤15d
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {urgentGuarantees.length > 0 ? `${urgentGuarantees.length} bảo lãnh cần gia hạn` : 'Tiến độ đang đảm bảo'}
            </p>
          </div>
        </div>

        {/* Card 4: Tỷ lệ tiết kiệm đấu thầu */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-card transition-all duration-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiết kiệm ngân sách</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 font-mono tracking-tight">
              {overallSavingsRate.toFixed(2)}%
            </h3>
            <p className="text-[11px] font-semibold text-emerald-700 truncate mt-0.5">
              Giảm: {formatCurrencyVN(totalSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO ĐỎ CẦN XỬ LÝ GẤP (CHỈ HIỂN THỊ KHI CÓ HẠNG MỤC CẦN XỬ LÝ) */}
      {(urgentPackages.length > 0 || urgentContracts.length > 0) && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
            <span>Mục Cần Xử Lý Khẩn Cấp ({urgentPackages.length + urgentContracts.length} sự kiện)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Gói thầu sắp đóng */}
            {urgentPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 text-white rounded-md">
                      {pkg.urgency.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{pkg.project.projectCode}</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2">
                    {pkg.packageName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Thời điểm đóng thầu: <strong className="text-rose-700 font-mono">{formatDateVN(pkg.bidCloseTime)}</strong>
                  </p>
                </div>
                <Link
                  href="/bidding"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 py-1.5 px-3 rounded-lg transition-colors self-end"
                >
                  <span>Mở gói thầu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}

            {/* Hợp đồng cần gia hạn */}
            {urgentContracts.map((c) => (
              <div
                key={c.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-2xs flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${c.urgency.badgeClass}`}>
                      {c.urgency.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{c.project.projectCode}</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2">
                    {c.package?.packageName || c.packageName || 'Hợp đồng'}
                  </h4>
                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                    <p>Nhà thầu: <strong className="text-slate-800">{c.contractorName}</strong></p>
                    <p>
                      Hạn hiện tại: <strong className="text-rose-700 font-mono">{formatDateVN(c.currentEndDate)}</strong>
                    </p>
                  </div>
                </div>
                <Link
                  href="/contracts"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 py-1.5 px-3 rounded-lg transition-colors self-end"
                >
                  <span>Ký phụ lục gia hạn</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KHỐI 2 CỘT: DANH MỤC HỢP ĐỒNG TRỌNG ĐIỂM & LỊCH CÔNG TÁC CÁ NHÂN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột Trái (7 cols): Hợp đồng Trọng Điểm */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                <span>Hợp Đồng Thi Công Trọng Điểm</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các hợp đồng xây dựng giao thông lớn đang triển khai thực tế
              </p>
            </div>
            <Link
              href="/contracts"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Gói Thầu & Nhà Thầu</th>
                  <th className="py-2.5 px-3 text-right">Giá Trị HĐ</th>
                  <th className="py-2.5 px-3 text-center">Hạn Mốc</th>
                  <th className="py-2.5 px-3 text-center">Tiến Độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {evaluatedContracts.slice(0, 5).map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${c.urgency.rowHighlightClass}`}>
                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="font-bold text-slate-900 truncate">
                        {c.package?.packageName || c.packageName || 'Hợp đồng'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                        {c.contractorName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrencyVN(c.adjustedContractPrice || c.contractPrice)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatDateVN(c.currentEndDate)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${c.urgency.badgeClass}`}>
                        {c.urgency.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột Phải (5 cols): Kế Hoạch & Lịch Làm Việc Cá Nhân */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span>Lịch Công Tác Cá Nhân</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lịch họp, kiểm tra hiện trường & công tác của Lãnh đạo Ban
                </p>
              </div>
              <Link
                href="/schedule"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                <span>Xem lịch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Danh sách lịch công tác */}
            <div className="mt-3.5 space-y-2.5">
              {workPlans.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs">
                  Chưa có lịch làm việc sắp tới. Quý khách có thể thêm lịch mới hoặc nhắn trợ lý AI để tự động tạo lịch!
                </div>
              ) : (
                workPlans.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50/80 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 transition-all flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0 text-slate-700 shadow-2xs font-mono">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase">
                        {new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-extrabold leading-none">
                        {new Date(item.date).getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-slate-800 truncate">
                          {item.title}
                        </h4>
                        {item.priority === 'URGENT' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-600 text-white rounded shrink-0">
                            Khẩn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        {item.startTime && (
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-indigo-700">
                            <Clock className="w-3 h-3" />
                            {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-0.5 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/schedule"
            className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200/60 text-center transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>Thêm Lịch Công Tác Mới</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* BIỂU ĐỒ TRỰC QUAN (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <StatusPieChart data={statusPieData} />
        </div>
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-subtle">
          <PriceComparisonChart data={projectComparisonData} />
        </div>
      </div>
    </div>
  );
}
