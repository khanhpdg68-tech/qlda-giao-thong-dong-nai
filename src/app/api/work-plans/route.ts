import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createWorkPlanSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề công việc'),
  date: z.string().min(1, 'Vui lòng chọn ngày làm việc'),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  isAllDay: z.boolean().default(false),
  category: z.string().default('MEETING'),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.string().default('NORMAL'),
  isCompleted: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');   // e.g. 2026
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const isCompleted = searchParams.get('isCompleted');

    const where: any = {};

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (isCompleted !== null && isCompleted !== undefined && isCompleted !== '') {
      where.isCompleted = isCompleted === 'true';
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { location: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const workPlans = await prisma.workPlan.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: workPlans });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách kế hoạch làm việc:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createWorkPlanSchema.parse(body);

    // Chuẩn hóa ngày (đưa về UTC 00:00:00 của ngày được chọn)
    const dateObj = new Date(validated.date);

    const workPlan = await prisma.workPlan.create({
      data: {
        title: validated.title,
        date: dateObj,
        startTime: validated.startTime || null,
        endTime: validated.endTime || null,
        isAllDay: validated.isAllDay,
        category: validated.category,
        location: validated.location || null,
        notes: validated.notes || null,
        priority: validated.priority,
        isCompleted: validated.isCompleted,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm lịch làm việc mới thành công',
      data: workPlan,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Lỗi thêm lịch làm việc:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý yêu cầu' }, { status: 500 });
  }
}
