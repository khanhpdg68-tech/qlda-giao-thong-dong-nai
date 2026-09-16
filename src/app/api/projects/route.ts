import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const projectSchema = z.object({
  projectCode: z.string().min(1, 'Mã dự án không được để trống'),
  projectName: z.string().min(1, 'Tên dự án không được để trống'),
  approvalDecision: z.string().min(1, 'Số QĐ phê duyệt không được để trống'),
  legalDriveUrl: z.string().optional().nullable(),
  legalFileUrl: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        biddingPackages: {
          include: {
            contract: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        contracts: {
          include: {
            addendums: {
              orderBy: { signingDate: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách dự án:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = projectSchema.parse(body);

    const existing = await prisma.project.findUnique({
      where: { projectCode: validated.projectCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Mã dự án "${validated.projectCode}" đã tồn tại trên hệ thống` }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        projectCode: validated.projectCode,
        projectName: validated.projectName,
        approvalDecision: validated.approvalDecision,
        legalDriveUrl: validated.legalDriveUrl || null,
        legalFileUrl: validated.legalFileUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
