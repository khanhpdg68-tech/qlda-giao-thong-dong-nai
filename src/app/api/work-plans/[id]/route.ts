import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateWorkPlanSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').optional(),
  date: z.string().optional(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  isAllDay: z.boolean().optional(),
  category: z.string().optional(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workPlan = await prisma.workPlan.findUnique({ where: { id } });
    if (!workPlan) {
      return NextResponse.json({ error: 'Không tìm thấy lịch làm việc' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: workPlan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateWorkPlanSchema.parse(body);

    const updateData: any = { ...validated };
    if (validated.date) {
      updateData.date = new Date(validated.date);
    }

    const updated = await prisma.workPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Cập nhật lịch làm việc thành công',
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.workPlan.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Đã xóa lịch làm việc thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa' }, { status: 500 });
  }
}
