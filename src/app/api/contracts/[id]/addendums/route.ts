import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentEndDate, calculateRemainingDays } from '@/lib/calculations';
import { recalculateContract } from '@/lib/contract-service';
import { z } from 'zod';

const addendumSchema = z.object({
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const body = await req.json();
    const validated = addendumSchema.parse(body);

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    // Xác định ngày kết thúc hiện tại trước khi thêm phụ lục này
    const currentEnd = getCurrentEndDate(contract.originalEndDate, contract.addendums);

    let calculatedNewEndDate: Date | null = null;
    if (validated.newEndDate) {
      calculatedNewEndDate = new Date(validated.newEndDate);
    } else if (validated.extendedDays > 0) {
      calculatedNewEndDate = new Date(currentEnd.getTime() + validated.extendedDays * 86400000);
    }

    // Tạo bản ghi phụ lục hợp đồng
    const addendum = await prisma.contractAddendum.create({
      data: {
        contractId,
        addendumNumber: validated.addendumNumber,
        addendumType: validated.addendumType,
        signingDate: new Date(validated.signingDate),
        extendedDays: validated.extendedDays,
        newEndDate: calculatedNewEndDate,
        adjustedAmount: validated.adjustedAmount || null,
        reason: validated.reason,
        fileUrl: validated.fileUrl || null,
      },
    });

    // Nếu phụ lục là Thay đổi pháp nhân và có tên nhà thầu mới, cập nhật trên hợp đồng
    if (validated.newContractorName && validated.newContractorName.trim()) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { contractorName: validated.newContractorName.trim() },
      });
    }

    // Tự động tính toán lại toàn diện trạng thái và giá trị hợp đồng
    await recalculateContract(contractId);

    return NextResponse.json({
      success: true,
      data: addendum,
      message: 'Thêm phụ lục hợp đồng thành công',
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
