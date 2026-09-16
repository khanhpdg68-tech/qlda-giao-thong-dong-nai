import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const transferSchema = z.object({
  contractorName: z.string().min(1, 'Tên nhà thầu trúng thầu không được để trống'),
  contractType: z.string().default('LUMP_SUM'),
  contractPrice: z.number().positive('Giá hợp đồng phải lớn hơn 0'),
  contractSigningDate: z.string().min(1, 'Ngày ký hợp đồng không được để trống'),
  durationDays: z.number().positive('Thời gian thực hiện hợp đồng phải lớn hơn 0'),
  originalEndDate: z.string().min(1, 'Ngày kết thúc hợp đồng không được để trống'),
  guaranteeAmount: z.number().optional().nullable(),
  guaranteeType: z.string().default('BY_DATE'),
  guaranteeEndDate: z.string().optional().nullable(),
  guaranteeBank: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;
    const body = await req.json();
    const validated = transferSchema.parse(body);

    const pkg = await prisma.biddingPackage.findUnique({
      where: { id: packageId },
      include: { contract: true },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Không tìm thấy gói thầu tương ứng' }, { status: 404 });
    }

    if (pkg.contract) {
      return NextResponse.json({ error: 'Gói thầu này đã được chuyển sang Quản lý Hợp đồng' }, { status: 400 });
    }

    // Tạo bản ghi Hợp đồng mới và cập nhật cờ isTransferredToContract = true cho gói thầu
    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          packageId: pkg.id,
          projectId: pkg.projectId,
          packageName: pkg.packageName,
          packagePrice: pkg.packagePrice,
          procurementMethod: pkg.procurementMethod,
          contractorName: validated.contractorName,
          contractType: validated.contractType,
          contractPrice: validated.contractPrice,
          contractSigningDate: new Date(validated.contractSigningDate),
          durationDays: validated.durationDays,
          originalEndDate: new Date(validated.originalEndDate),
          guaranteeAmount: validated.guaranteeAmount || null,
          guaranteeType: validated.guaranteeType || 'BY_DATE',
          guaranteeEndDate: validated.guaranteeType === 'UNTIL_ACCEPTANCE' ? null : (validated.guaranteeEndDate ? new Date(validated.guaranteeEndDate) : null),
          guaranteeBank: validated.guaranteeBank || null,
          status: 'ACTIVE',
        },
      }),
      prisma.biddingPackage.update({
        where: { id: packageId },
        data: {
          isTransferredToContract: true,
          status: 'AWARDED',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Chuyển sang Quản lý Hợp đồng thành công',
      data: contract,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
