import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateSavingsRate,
  getCurrentEndDate,
  calculateRemainingDays,
  getContractUrgency,
  getGuaranteeUrgency,
  isBudgetOverrun,
  calculateContractTimeSummary,
  calculateContractPriceSummary,
} from '@/lib/calculations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      where.OR = [
        { contractorName: { contains: search } },
        { packageName: { contains: search } },
        { package: { packageName: { contains: search } } },
        { project: { projectName: { contains: search } } },
      ];
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        project: true,
        package: true,
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // Tính toán thêm các chỉ số nghiệp vụ động
    const formattedContracts = contracts.map((c) => {
      const timeSummary = calculateContractTimeSummary(c.durationDays, c.originalEndDate, c.addendums);
      const priceSummary = calculateContractPriceSummary(c.contractPrice, c.addendums);
      const currentEndDate = timeSummary.currentEndDate;
      const remainingDays = calculateRemainingDays(currentEndDate, now);
      const urgencyStatus = getContractUrgency(currentEndDate, c.status === 'LIQUIDATED', now);
      
      const effectivePackagePrice = c.adjustedPackagePrice || c.package?.packagePrice || c.packagePrice || c.contractPrice;
      const savingsRate = calculateSavingsRate(effectivePackagePrice, priceSummary.finalContractPrice);
      const guaranteeStatus = getGuaranteeUrgency(c.guaranteeEndDate, (c as any).guaranteeType || 'BY_DATE', now);

      const pkgInfo = c.package || {
        id: '',
        packageName: c.packageName || `Hợp đồng: ${c.contractorName}`,
        packagePrice: c.packagePrice || c.contractPrice,
        procurementMethod: c.procurementMethod || 'DIRECT_AWARD',
      };

      return {
        ...c,
        package: pkgInfo,
        adjustedPackagePrice: c.adjustedPackagePrice,
        currentEndDate,
        remainingDays,
        urgencyStatus,
        savingsRate,
        guaranteeStatus,
        timeSummary,
        priceSummary,
        totalExtendedDays: timeSummary.totalExtendedDays,
        totalDurationDays: timeSummary.totalDurationDays,
        finalContractPrice: priceSummary.finalContractPrice,
        totalPriceAdjustment: priceSummary.totalPriceAdjustment,
      };
    });

    // Lọc theo mức độ khẩn cấp nếu có yêu cầu
    let result = formattedContracts;
    if (urgency === 'URGENT') {
      result = formattedContracts.filter((c) => c.remainingDays <= 15 && c.status !== 'LIQUIDATED');
    } else if (urgency === 'ATTENTION') {
      result = formattedContracts.filter((c) => c.remainingDays > 15 && c.remainingDays <= 30 && c.status !== 'LIQUIDATED');
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách hợp đồng:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId,
      packageId,
      packageName,
      packagePrice,
      adjustedPackagePrice,
      procurementMethod = 'DIRECT_AWARD',
      contractorName,
      contractType = 'LUMP_SUM',
      contractPrice,
      contractSigningDate,
      durationDays,
      originalEndDate,
      guaranteeAmount,
      guaranteeType = 'BY_DATE',
      guaranteeEndDate,
      guaranteeBank,
      status = 'ACTIVE',
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Vui lòng chọn Dự án' }, { status: 400 });
    }
    if (!contractorName) {
      return NextResponse.json({ error: 'Tên nhà thầu không được để trống' }, { status: 400 });
    }
    if (!contractPrice || Number(contractPrice) <= 0) {
      return NextResponse.json({ error: 'Giá hợp đồng phải lớn hơn 0' }, { status: 400 });
    }
    if (!contractSigningDate) {
      return NextResponse.json({ error: 'Ngày ký hợp đồng không được để trống' }, { status: 400 });
    }
    if (!durationDays || Number(durationDays) <= 0) {
      return NextResponse.json({ error: 'Thời gian thực hiện hợp đồng phải lớn hơn 0' }, { status: 400 });
    }
    if (!originalEndDate) {
      return NextResponse.json({ error: 'Ngày kết thúc hợp đồng không được để trống' }, { status: 400 });
    }

    const targetPackageId = packageId || null;

    if (targetPackageId) {
      // Đánh dấu gói thầu từ Đấu thầu đã chuyển HĐ (luồng 1 chiều)
      await prisma.biddingPackage.update({
        where: { id: targetPackageId },
        data: { isTransferredToContract: true, status: 'AWARDED' },
      });
    }

    // Tạo hợp đồng: nếu tạo trực tiếp (không qua đấu thầu), tuyệt đối KHÔNG tạo BiddingPackage
    const contract = await prisma.contract.create({
      data: {
        packageId: targetPackageId,
        projectId,
        packageName: packageName || `Hợp đồng: ${contractorName}`,
        packagePrice: packagePrice ? Number(packagePrice) : Number(contractPrice),
        adjustedPackagePrice: adjustedPackagePrice ? Number(adjustedPackagePrice) : null,
        procurementMethod: procurementMethod || 'DIRECT_AWARD',
        contractorName,
        contractType,
        contractPrice: Number(contractPrice),
        contractSigningDate: new Date(contractSigningDate),
        durationDays: Number(durationDays),
        originalEndDate: new Date(originalEndDate),
        guaranteeAmount: guaranteeAmount ? Number(guaranteeAmount) : null,
        guaranteeType: guaranteeType || 'BY_DATE',
        guaranteeEndDate: guaranteeType === 'UNTIL_ACCEPTANCE' ? null : (guaranteeEndDate ? new Date(guaranteeEndDate) : null),
        guaranteeBank: guaranteeBank || null,
        status,
      },
      include: {
        project: true,
        package: true,
      },
    });

    const responseData = {
      ...contract,
      package: contract.package || {
        id: '',
        packageName: contract.packageName || `Hợp đồng: ${contract.contractorName}`,
        packagePrice: contract.packagePrice || contract.contractPrice,
        procurementMethod: contract.procurementMethod || 'DIRECT_AWARD',
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Tạo hợp đồng mới thành công',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Lỗi tạo hợp đồng:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

