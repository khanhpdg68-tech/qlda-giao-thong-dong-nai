import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateContract } from '@/lib/contract-service';
import { z } from 'zod';

const updateAddendumSchema = z.object({
  addendumNumber: z.string().min(1, 'Số hiệu phụ lục không được để trống'),
  addendumType: z.string().default('TIME_EXTENSION'),
  signingDate: z.string().min(1, 'Ngày ký phụ lục không được để trống'),
  extendedDays: z.number().int().default(0),
  newEndDate: z.string().optional().nullable(),
  adjustedAmount: z.number().optional().nullable(),
  reason: z.string().min(1, 'Lý do ban hành phụ lục không được để trống'),
  fileUrl: z.string().optional().nullable(),
  newContractorName: z.string().optional().nullable(),
});

// 1. CHỈNH SỬA PHỤ LỤC HỢP ĐỒNG
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addendumId: string }> }
) {
  try {
    const { id: contractId, addendumId } = await params;
    const body = await req.json();
    const validated = updateAddendumSchema.parse(body);

    const existing = await prisma.contractAddendum.findFirst({
      where: { id: addendumId, contractId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy phụ lục hợp đồng' }, { status: 404 });
    }

    const calculatedNewEndDate = validated.newEndDate ? new Date(validated.newEndDate) : null;

    const updatedAddendum = await prisma.contractAddendum.update({
      where: { id: addendumId },
      data: {
        addendumNumber: validated.addendumNumber,
        addendumType: validated.addendumType,
        signingDate: new Date(validated.signingDate),
        extendedDays: validated.extendedDays,
        newEndDate: calculatedNewEndDate,
        adjustedAmount: validated.adjustedAmount !== undefined ? validated.adjustedAmount : null,
        reason: validated.reason,
        fileUrl: validated.fileUrl !== undefined ? validated.fileUrl : null,
      },
    });

    if (validated.newContractorName && validated.newContractorName.trim()) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { contractorName: validated.newContractorName.trim() },
      });
    }

    await recalculateContract(contractId);

    return NextResponse.json({
      success: true,
      data: updatedAddendum,
      message: 'Cập nhật phụ lục hợp đồng thành công',
    });
  } catch (error: any) {
    console.error('Lỗi khi cập nhật phụ lục:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý yêu cầu' },
      { status: 400 }
    );
  }
}

// 2. XÓA PHỤ LỤC HỢP ĐỒNG
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; addendumId: string }> }
) {
  try {
    const { id: contractId, addendumId } = await params;

    const existing = await prisma.contractAddendum.findFirst({
      where: { id: addendumId, contractId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy phụ lục hợp đồng để xóa' }, { status: 404 });
    }

    await prisma.contractAddendum.delete({
      where: { id: addendumId },
    });

    await recalculateContract(contractId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa phụ lục hợp đồng thành công',
    });
  } catch (error: any) {
    console.error('Lỗi khi xóa phụ lục:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi xóa phụ lục hợp đồng' },
      { status: 500 }
    );
  }
}
