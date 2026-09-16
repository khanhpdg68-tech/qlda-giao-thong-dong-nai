import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lấy nhật ký' }, { status: 500 });
  }
}
