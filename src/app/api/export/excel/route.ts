import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import {
  calculateSavingsRate,
  getCurrentEndDate,
  calculateRemainingDays,
  getContractUrgency,
  calculateContractTimeSummary,
  calculateContractPriceSummary,
} from '@/lib/calculations';
import { formatDateVN } from '@/lib/formatters';

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        project: true,
        package: true,
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
      orderBy: [
        { projectId: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const now = new Date();

    const projectMap = new Map<string, number>();
    const projectCounters = new Map<string, number>();
    let projectIndex = 0;

    // Chuẩn bị dữ liệu dòng cho bảng Excel theo đúng yêu cầu
    const rows = contracts.map((c) => {
      if (!projectMap.has(c.projectId)) {
        projectIndex++;
        projectMap.set(c.projectId, projectIndex);
        projectCounters.set(c.projectId, 0);
      }
      const pIdx = projectMap.get(c.projectId)!;
      const count = (projectCounters.get(c.projectId) || 0) + 1;
      projectCounters.set(c.projectId, count);
      const sttPhanCap = `${pIdx}.${count}`;

      const pkgName = c.package?.packageName || c.packageName || 'Hợp đồng trực tiếp';
      const pkgPrice = c.package?.packagePrice || c.packagePrice || c.contractPrice;
      const effectiveBudget = c.adjustedPackagePrice || pkgPrice;
      const procurementMethod = c.package?.procurementMethod || c.procurementMethod || 'DIRECT_AWARD';

      const timeSum = calculateContractTimeSummary(c.durationDays, c.originalEndDate, c.addendums);
      const priceSum = calculateContractPriceSummary(c.contractPrice, c.addendums);
      const currentEnd = timeSum.currentEndDate;
      const remainingDays = calculateRemainingDays(currentEnd, now);
      const savingsRate = calculateSavingsRate(effectiveBudget, priceSum.finalContractPrice);
      const urgency = getContractUrgency(currentEnd, c.status === 'LIQUIDATED', now);

      let procurementMethodLabel = 'Đấu thầu rộng rãi qua mạng';
      if (procurementMethod === 'DIRECT_AWARD') procurementMethodLabel = 'Chỉ định thầu / Ký trực tiếp';
      else if (procurementMethod === 'COMPETITIVE_OFFER' || procurementMethod === 'COMPETITIVE_OFFERING') procurementMethodLabel = 'Chào hàng cạnh tranh';
      else if (procurementMethod === 'SHOPPING') procurementMethodLabel = 'Mua sắm trực tiếp';
      else if (procurementMethod === 'SELF_IMPLEMENTATION') procurementMethodLabel = 'Tự thực hiện';

      let contractTypeLabel = 'Trọn gói';
      if (c.contractType === 'UNIT_PRICE_FIXED' || c.contractType === 'UNIT_PRICE') contractTypeLabel = 'Đơn giá cố định';
      else if (c.contractType === 'UNIT_PRICE_ADJUSTABLE' || c.contractType === 'ADJUSTABLE_UNIT_PRICE') contractTypeLabel = 'Đơn giá điều chỉnh';
      else if (c.contractType === 'TIME_BASED') contractTypeLabel = 'Theo thời gian';
      else if (c.contractType === 'COMBINED') contractTypeLabel = 'Hợp đồng kết hợp';

      return {
        'STT': sttPhanCap,
        'Dự án số': `DỰ ÁN ${pIdx}`,
        'Mã Dự án': c.project.projectCode,
        'Tên Dự án': c.project.projectName,
        'Tên Gói thầu': pkgName,
        'Hình thức LCNT': procurementMethodLabel,
        'Thời gian đăng tải HSMT': c.package?.hsmtPublishDate ? formatDateVN(c.package.hsmtPublishDate) : 'N/A',
        'Nhà thầu trúng thầu': c.contractorName,
        'Loại Hợp đồng': contractTypeLabel,
        'Giá dự toán gói thầu được duyệt (VNĐ)': pkgPrice,
        'Giá dự toán duyệt điều chỉnh (VNĐ)': c.adjustedPackagePrice || '',
        'Giá hợp đồng gốc (VNĐ)': priceSum.originalContractPrice,
        'Tổng giá trị điều chỉnh qua PLHĐ (VNĐ)': priceSum.totalPriceAdjustment,
        'Giá trị cuối cùng của HĐ (VNĐ)': priceSum.finalContractPrice,
        'Tỷ lệ tiết kiệm (%)': `${savingsRate.toFixed(2)}%`,
        'Ngày ký hợp đồng': formatDateVN(c.contractSigningDate),
        'Thời gian thực hiện gốc (ngày)': timeSum.originalDurationDays,
        'Số ngày gia hạn (ngày)': timeSum.totalExtendedDays,
        'Tổng thời gian thực tế (ngày)': timeSum.totalDurationDays,
        'Số lần gia hạn': timeSum.extensionCount,
        'Hạn hợp đồng gốc': formatDateVN(c.originalEndDate),
        'Hạn thực hiện hiện tại': formatDateVN(currentEnd),
        'Số ngày còn lại': remainingDays,
        'Hạn bảo lãnh thực hiện HĐ': formatDateVN(c.guaranteeEndDate),
        'Tình trạng tiến độ': urgency.label,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Cấu hình độ rộng các cột tự động
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 16 }, // Mã DA
      { wch: 40 }, // Tên DA
      { wch: 45 }, // Tên gói
      { wch: 25 }, // Hình thức
      { wch: 35 }, // Nhà thầu
      { wch: 18 }, // Loại HĐ
      { wch: 20 }, // Giá dự toán
      { wch: 20 }, // Giá dự toán điều chỉnh
      { wch: 20 }, // Giá trúng
      { wch: 20 }, // Giá điều chỉnh
      { wch: 15 }, // % Tiết kiệm
      { wch: 15 }, // Ngày ký
      { wch: 16 }, // Hạn gốc
      { wch: 18 }, // Hạn hiện tại
      { wch: 14 }, // Số ngày còn lại
      { wch: 18 }, // Hạn bảo lãnh
      { wch: 30 }, // Tình trạng
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ban_QLDA_DTXD_TP_Dong_Nai');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Bao_Cao_Ban_QLDA_DTXD_TP_Dong_Nai_${todayStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Lỗi xuất Excel:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xuất Excel' }, { status: 500 });
  }
}
