import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const packageSchema = z.object({
  projectId: z.string().min(1, 'Vui lòng chọn Dự án'),
  packageName: z.string().min(1, 'Tên gói thầu không được để trống'),
  packagePrice: z.number().positive('Giá gói thầu phải lớn hơn 0'),
  procurementMethod: z.string().default('OPEN_BIDDING'),
  selectionMethod: z.string().default('ONE_STAGE_ONE_ENVELOPE'),
  khlcntDecision: z.string().min(1, 'Số QĐ KHLCNT không được để trống'),
  khlcntFileUrl: z.string().optional().nullable(),
  hsmtPublishDate: z.string().min(1, 'Ngày đăng tải HSMT không được để trống'),
  bidCloseTime: z.string().min(1, 'Thời điểm đóng thầu không được để trống'),
  kqlcntDecision: z.string().optional().nullable(),
  kqlcntFileUrl: z.string().optional().nullable(),
  status: z.string().default('DRAFT'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');

    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Quản lý đấu thầu chỉ quản lý các gói thầu đấu thầu trên mạng, không quản lý chỉ định thầu
    where.procurementMethod = { not: 'DIRECT_AWARD' };

    if (search) {
      where.OR = [
        { packageName: { contains: search } },
        { khlcntDecision: { contains: search } },
        { kqlcntDecision: { contains: search } },
        { project: { projectName: { contains: search } } },
      ];
    }

    const packages = await prisma.biddingPackage.findMany({
      where,
      include: {
        project: true,
        contract: true,
      },
      orderBy: { bidCloseTime: 'asc' },
    });

    return NextResponse.json({ success: true, data: packages });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách gói thầu:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = packageSchema.parse(body);

    const biddingPackage = await prisma.biddingPackage.create({
      data: {
        projectId: validated.projectId,
        packageName: validated.packageName,
        packagePrice: validated.packagePrice,
        procurementMethod: validated.procurementMethod,
        selectionMethod: validated.selectionMethod,
        khlcntDecision: validated.khlcntDecision,
        khlcntFileUrl: validated.khlcntFileUrl || null,
        hsmtPublishDate: new Date(validated.hsmtPublishDate),
        bidCloseTime: new Date(validated.bidCloseTime),
        kqlcntDecision: validated.kqlcntDecision || null,
        kqlcntFileUrl: validated.kqlcntFileUrl || null,
        status: validated.status,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json({ success: true, data: biddingPackage }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
