import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateSavingsRate,
  getCurrentEndDate,
  calculateRemainingDays,
  getContractUrgency,
  getGuaranteeUrgency,
  calculateContractTimeSummary,
  calculateContractPriceSummary,
} from '@/lib/calculations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        project: true,
        package: true,
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const now = new Date();
    const timeSummary = calculateContractTimeSummary(contract.durationDays, contract.originalEndDate, contract.addendums);
    const priceSummary = calculateContractPriceSummary(contract.contractPrice, contract.addendums);
    const currentEndDate = timeSummary.currentEndDate;
    const remainingDays = calculateRemainingDays(currentEndDate, now);
    const urgencyStatus = getContractUrgency(currentEndDate, contract.status === 'LIQUIDATED', now);
    
    const pkgInfo = contract.package || {
      id: '',
      packageName: contract.packageName || `Hợp đồng: ${contract.contractorName}`,
      packagePrice: contract.packagePrice || contract.contractPrice,
      procurementMethod: contract.procurementMethod || 'DIRECT_AWARD',
    };

    const effectivePackagePrice = contract.adjustedPackagePrice || pkgInfo.packagePrice;
    const savingsRate = calculateSavingsRate(effectivePackagePrice, priceSummary.finalContractPrice);
    const guaranteeStatus = getGuaranteeUrgency(contract.guaranteeEndDate, (contract as any).guaranteeType || 'BY_DATE', now);

    return NextResponse.json({
      success: true,
      data: {
        ...contract,
        package: pkgInfo,
        adjustedPackagePrice: contract.adjustedPackagePrice,
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
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const guaranteeType = body.guaranteeType || 'BY_DATE';
    let guaranteeEndDate = undefined;
    if (guaranteeType === 'UNTIL_ACCEPTANCE') {
      guaranteeEndDate = null;
    } else if (body.guaranteeEndDate !== undefined) {
      guaranteeEndDate = body.guaranteeEndDate ? new Date(body.guaranteeEndDate) : null;
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        packageName: body.packageName !== undefined ? body.packageName : undefined,
        packagePrice: body.packagePrice !== undefined ? (body.packagePrice ? Number(body.packagePrice) : null) : undefined,
        adjustedPackagePrice: body.adjustedPackagePrice !== undefined ? (body.adjustedPackagePrice ? Number(body.adjustedPackagePrice) : null) : undefined,
        contractorName: body.contractorName,
        contractType: body.contractType,
        contractPrice: body.contractPrice ? Number(body.contractPrice) : undefined,
        adjustedContractPrice: body.adjustedContractPrice !== undefined ? (body.adjustedContractPrice ? Number(body.adjustedContractPrice) : null) : undefined,
        contractSigningDate: body.contractSigningDate ? new Date(body.contractSigningDate) : undefined,
        durationDays: body.durationDays ? Number(body.durationDays) : undefined,
        originalEndDate: body.originalEndDate ? new Date(body.originalEndDate) : undefined,
        guaranteeAmount: body.guaranteeAmount !== undefined ? (body.guaranteeAmount ? Number(body.guaranteeAmount) : null) : undefined,
        guaranteeType: body.guaranteeType !== undefined ? body.guaranteeType : undefined,
        guaranteeEndDate,
        guaranteeBank: body.guaranteeBank,
        status: body.status,
      },
      include: {
        project: true,
        package: true,
        addendums: true,
      },
    });

    // Nếu có gói thầu đi kèm từ Đấu thầu và có thay đổi tên/giá gói thầu
    if (updated.packageId && (body.packageName || body.packagePrice)) {
      await prisma.biddingPackage.update({
        where: { id: updated.packageId },
        data: {
          packageName: body.packageName || undefined,
          packagePrice: body.packagePrice ? Number(body.packagePrice) : undefined,
        },
      });
    }

    const responseData = {
      ...updated,
      package: updated.package || {
        id: '',
        packageName: updated.packageName || `Hợp đồng: ${updated.contractorName}`,
        packagePrice: updated.packagePrice || updated.contractPrice,
        procurementMethod: updated.procurementMethod || 'DIRECT_AWARD',
      },
      adjustedPackagePrice: updated.adjustedPackagePrice,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    if (contract.packageId) {
      await prisma.$transaction([
        prisma.contract.delete({ where: { id } }),
        prisma.biddingPackage.update({
          where: { id: contract.packageId },
          data: { isTransferredToContract: false },
        }),
      ]);
    } else {
      await prisma.contract.delete({ where: { id } });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa hợp đồng thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa hợp đồng' }, { status: 500 });
  }
}
