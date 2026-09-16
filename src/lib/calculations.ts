/**
 * Tính toán Tỷ lệ tiết kiệm đấu thầu (%)
 * Tỷ lệ = ((Giá gói thầu - Giá hợp đồng) / Giá gói thầu) * 100
 */
export function calculateSavingsRate(packagePrice: number, contractPrice: number): number {
  if (!packagePrice || packagePrice <= 0) return 0;
  const savings = ((packagePrice - contractPrice) / packagePrice) * 100;
  return Math.round(savings * 100) / 100; // Làm tròn 2 chữ số thập phân
}

/**
 * Kiểm tra xem hợp đồng có vượt giá gói thầu không
 */
export function isBudgetOverrun(packagePrice: number, contractPrice: number): boolean {
  return contractPrice > packagePrice;
}

/**
 * Phân tích chuỗi ngày chuẩn xác theo giờ trưa (tránh lệch múi giờ / DST)
 */
function parseDateForCalculation(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0);
  }
  const dateOnly = String(dateInput).split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  }
  return new Date(dateInput);
}

/**
 * Tính Ngày kết thúc từ Ngày ký và Số ngày thực hiện (chuẩn hợp đồng tính cả ngày bắt đầu: + days - 1)
 * VD: Ký 04/09/2025, 484 ngày -> Kết thúc: 31/12/2026
 */
export function calculateEndDateFromDuration(startDateInput: string | Date, days: number): string {
  if (!startDateInput || !days || Number(days) <= 0) return '';
  const d = parseDateForCalculation(startDateInput);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (Number(days) - 1));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tính Số ngày thực hiện từ Ngày ký đến Ngày kết thúc (chuẩn hợp đồng tính cả ngày bắt đầu: diffDays + 1)
 * VD: Từ 04/09/2025 đến 31/12/2026 -> 484 ngày
 */
export function calculateDurationFromDates(startDateInput: string | Date, endDateInput: string | Date): number {
  if (!startDateInput || !endDateInput) return 0;
  const start = parseDateForCalculation(startDateInput);
  const end = parseDateForCalculation(endDateInput);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays + 1 : 0;
}

/**
 * Xác định Ngày kết thúc hiệu lực hiện tại của Hợp đồng
 * Lấy ngày kết thúc xa nhất (muộn nhất) trong số các phụ lục gia hạn và ngày gốc
 */
export function getCurrentEndDate(
  originalEndDate: string | Date,
  addendums?: Array<{
    signingDate?: string | Date;
    newEndDate?: string | Date | null;
    extendedDays?: number | null;
  }>
): Date {
  const orig = new Date(originalEndDate);
  if (!addendums || addendums.length === 0) {
    return orig;
  }

  // Lọc các phụ lục có newEndDate hợp lệ
  const validEndDates = addendums
    .map((a) => (a.newEndDate ? new Date(a.newEndDate) : null))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  if (validEndDates.length === 0) {
    return orig;
  }

  // Lấy ngày kết thúc xa nhất (muộn nhất) trong số các phụ lục gia hạn
  let maxDate = validEndDates[0];
  for (let i = 1; i < validEndDates.length; i++) {
    if (validEndDates[i].getTime() > maxDate.getTime()) {
      maxDate = validEndDates[i];
    }
  }

  // Nếu maxDate muộn hơn originalEndDate thì lấy maxDate, ngược lại lấy originalEndDate
  return maxDate.getTime() > orig.getTime() ? maxDate : orig;
}

/**
 * Tổng hợp toàn diện thời gian thực hiện hợp đồng:
 * - Thời gian gốc
 * - Tổng số ngày gia hạn qua TẤT CẢ các phụ lục
 * - Tổng thời gian thực tế của hợp đồng (Gốc + Tổng gia hạn)
 * - Hạn kết thúc cuối cùng
 */
export interface ContractTimeSummary {
  originalDurationDays: number;
  totalExtendedDays: number;
  totalDurationDays: number;
  currentEndDate: Date;
  extensionCount: number;
}

export function calculateContractTimeSummary(
  durationDays: number,
  originalEndDate: string | Date,
  addendums?: Array<{
    extendedDays?: number | null;
    newEndDate?: string | Date | null;
    signingDate?: string | Date;
  }>
): ContractTimeSummary {
  const origDays = Number(durationDays) || 0;
  let totalExtended = 0;
  let extensionCount = 0;

  if (addendums && addendums.length > 0) {
    for (const a of addendums) {
      const ext = Number(a.extendedDays) || 0;
      if (ext > 0) {
        totalExtended += ext;
        extensionCount += 1;
      }
    }
  }

  const currentEnd = getCurrentEndDate(originalEndDate, addendums);
  const totalDuration = origDays + totalExtended;

  return {
    originalDurationDays: origDays,
    totalExtendedDays: totalExtended,
    totalDurationDays: totalDuration,
    currentEndDate: currentEnd,
    extensionCount,
  };
}

/**
 * Tổng hợp toàn diện tài chính hợp đồng khi điều chỉnh giá nhiều lần:
 * - Giá ký kết HĐ ban đầu (gốc)
 * - Tổng giá trị điều chỉnh (+/-) qua TẤT CẢ các phụ lục
 * - Giá trị cuối cùng của hợp đồng (Final Contract Price)
 */
export interface ContractPriceSummary {
  originalContractPrice: number;
  totalPriceAdjustment: number;
  finalContractPrice: number;
  priceAdjustmentCount: number;
  hasPriceAdjustment: boolean;
}

export function calculateContractPriceSummary(
  contractPrice: number,
  addendums?: Array<{
    adjustedAmount?: number | null;
  }>
): ContractPriceSummary {
  const origPrice = Number(contractPrice) || 0;
  let totalAdj = 0;
  let priceAdjCount = 0;

  if (addendums && addendums.length > 0) {
    for (const a of addendums) {
      if (a.adjustedAmount !== null && a.adjustedAmount !== undefined && !isNaN(Number(a.adjustedAmount))) {
        totalAdj += Number(a.adjustedAmount);
        priceAdjCount += 1;
      }
    }
  }

  const hasAdj = priceAdjCount > 0;
  const finalPrice = origPrice + totalAdj;

  return {
    originalContractPrice: origPrice,
    totalPriceAdjustment: totalAdj,
    finalContractPrice: finalPrice,
    priceAdjustmentCount: priceAdjCount,
    hasPriceAdjustment: hasAdj,
  };
}

/**
 * Tính số ngày còn lại đến hạn: TargetDate - CurrentDate (ngày)
 */
export function calculateRemainingDays(targetDate: string | Date, referenceDate: Date = new Date()): number {
  const target = new Date(targetDate);
  const diffTime = target.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Trạng thái & phân loại màu sắc của Hợp đồng theo số ngày còn lại
 */
export interface ContractUrgencyStatus {
  code: 'NORMAL' | 'ATTENTION' | 'URGENT_EXTENSION' | 'OVERDUE' | 'LIQUIDATED';
  label: string;
  badgeClass: string;
  rowHighlightClass: string;
  remainingDays: number;
}

export function getContractUrgency(
  currentEndDate: Date,
  isLiquidated: boolean = false,
  now: Date = new Date()
): ContractUrgencyStatus {
  if (isLiquidated) {
    return {
      code: 'LIQUIDATED',
      label: 'Đã thanh lý',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
      rowHighlightClass: '',
      remainingDays: 0,
    };
  }

  const remainingDays = calculateRemainingDays(currentEndDate, now);

  if (remainingDays < 0) {
    return {
      code: 'OVERDUE',
      label: `🚨 ĐÃ QUÁ HẠN HỢP ĐỒNG (${Math.abs(remainingDays)} ngày)`,
      badgeClass: 'bg-purple-900 text-white border border-purple-700 font-black shadow-md ring-2 ring-purple-400',
      rowHighlightClass: 'bg-purple-50/70 border-l-4 border-purple-700',
      remainingDays,
    };
  }

  if (remainingDays <= 15) {
    return {
      code: 'URGENT_EXTENSION',
      label: `🔥 ⚠️ CẦN GIA HẠN GẤP (Còn ${remainingDays} ngày)`,
      badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-md ring-2 ring-rose-400',
      rowHighlightClass: 'bg-red-50 border-l-4 border-red-600',
      remainingDays,
    };
  }

  if (remainingDays <= 30) {
    return {
      code: 'ATTENTION',
      label: `⏳ Chú ý tiến độ (Còn ${remainingDays} ngày)`,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      rowHighlightClass: 'bg-amber-50/50',
      remainingDays,
    };
  }

  return {
    code: 'NORMAL',
    label: `✅ Tiến độ an toàn (Còn ${remainingDays} ngày)`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold',
    rowHighlightClass: '',
    remainingDays,
  };
}

/**
 * Kiểm tra thời gian đóng thầu và trả về cảnh báo trực quan
 */
export interface BiddingUrgencyStatus {
  isUrgent: boolean;
  isClosed: boolean;
  label: string;
  badgeClass: string;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
}

export function getBiddingUrgency(bidCloseTime: string | Date, status: string, now: Date = new Date()): BiddingUrgencyStatus {
  if (['BIDDING_CLOSED', 'EVALUATING', 'AWARDED', 'CANCELED'].includes(status)) {
    let label = '🔔 Đã đóng thầu (Đang mở thầu)';
    let badgeClass = 'bg-purple-50 text-purple-800 border border-purple-200 font-bold';

    if (status === 'AWARDED') {
      label = '✅ Đã có KQLCNT (Đã mở thầu)';
      badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold';
    } else if (status === 'EVALUATING') {
      label = '🔍 Đang chấm thầu (Đã mở thầu)';
      badgeClass = 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold';
    } else if (status === 'CANCELED') {
      label = '⛔ Đã hủy thầu';
      badgeClass = 'bg-slate-200 text-slate-700 font-semibold';
    }

    return {
      isUrgent: false,
      isClosed: true,
      label,
      badgeClass,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
    };
  }

  const closeTime = new Date(bidCloseTime);
  const diffMs = closeTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isUrgent: true,
      isClosed: true,
      label: '🚨 ĐÃ ĐẾN HẠN MỞ THẦU',
      badgeClass: 'bg-rose-700 text-white font-black animate-pulse shadow-md',
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingDays = Math.floor(totalHours / 24);
  const hoursRemainder = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  // Cảnh báo <= 6 tiếng: ĐỎ RỰC NHẤP NHÁY NỔI BẬT
  if (totalHours < 6) {
    return {
      isUrgent: true,
      isClosed: false,
      label: `🔥 ⚠️ SẮP ĐÓNG THẦU: Còn ${totalHours}h ${remainingMinutes}p nữa mở thầu!`,
      badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-md ring-2 ring-rose-400',
      remainingDays: 0,
      remainingHours: totalHours,
      remainingMinutes,
    };
  }

  // Cảnh báo <= 24 tiếng: CAM NỔI BẬT
  if (remainingDays === 0) {
    return {
      isUrgent: true,
      isClosed: false,
      label: `⏰ GẤP: Còn ${totalHours} giờ ${remainingMinutes}p nữa mở thầu`,
      badgeClass: 'bg-amber-500 text-white font-bold shadow-sm',
      remainingDays: 0,
      remainingHours: totalHours,
      remainingMinutes,
    };
  }

  // Cảnh báo <= 3 ngày: VÀNG ĐẬM
  if (remainingDays <= 3) {
    return {
      isUrgent: false,
      isClosed: false,
      label: `⏳ Còn ${remainingDays} ngày ${hoursRemainder > 0 ? `${hoursRemainder}h ` : ''}nữa mở thầu`,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      remainingDays,
      remainingHours: totalHours,
      remainingMinutes,
    };
  }

  // Trên 3 ngày: XANH DƯƠNG RÕ RÀNG
  return {
    isUrgent: false,
    isClosed: false,
    label: `📅 Còn ${remainingDays} ngày ${hoursRemainder > 0 ? `${hoursRemainder}h ` : ''}nữa mở thầu`,
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold',
    remainingDays,
    remainingHours: totalHours,
    remainingMinutes,
  };
}

/**
 * Kiểm tra tình trạng Bảo lãnh thực hiện hợp đồng
 */
export function getGuaranteeUrgency(
  guaranteeEndDate?: string | Date | null,
  guaranteeTypeOrNow?: string | Date | null,
  nowDate: Date = new Date()
) {
  let gType = 'BY_DATE';
  let now = nowDate;

  if (guaranteeTypeOrNow instanceof Date) {
    now = guaranteeTypeOrNow;
    gType = 'BY_DATE';
  } else if (typeof guaranteeTypeOrNow === 'string') {
    gType = guaranteeTypeOrNow;
  }

  if (gType === 'UNTIL_ACCEPTANCE') {
    return {
      isOverdue: false,
      isWarning: false,
      isUntilAcceptance: true,
      label: 'Đến khi nghiệm thu đưa vào sử dụng',
      badgeClass: 'bg-teal-50 text-teal-800 border border-teal-300 font-semibold',
    };
  }

  if (!guaranteeEndDate) return null;
  const remainingDays = calculateRemainingDays(guaranteeEndDate, now);

  if (remainingDays < 0) {
    return {
      isOverdue: true,
      isWarning: true,
      isUntilAcceptance: false,
      label: `Bảo lãnh HẾT HẠN (Quá ${Math.abs(remainingDays)} ngày)`,
      badgeClass: 'bg-rose-800 text-white font-semibold',
    };
  }
  if (remainingDays <= 30) {
    return {
      isOverdue: false,
      isWarning: true,
      isUntilAcceptance: false,
      label: `⚠️ Bảo lãnh sắp hết hạn (Còn ${remainingDays} ngày)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-medium',
    };
  }
  return {
    isOverdue: false,
    isWarning: false,
    isUntilAcceptance: false,
    label: `Bảo lãnh hợp lệ (Còn ${remainingDays} ngày)`,
    badgeClass: 'bg-slate-100 text-slate-700',
  };
}
