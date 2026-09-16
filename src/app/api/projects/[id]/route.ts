import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        biddingPackages: true,
        contracts: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: project });
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

    const updated = await prisma.project.update({
      where: { id },
      data: {
        projectCode: body.projectCode,
        projectName: body.projectName,
        approvalDecision: body.approvalDecision,
        legalDriveUrl: body.legalDriveUrl || null,
        legalFileUrl: body.legalFileUrl || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật dự án' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.project.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Đã xóa dự án thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa dự án' }, { status: 500 });
  }
}
