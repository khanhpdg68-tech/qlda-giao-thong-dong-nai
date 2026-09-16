import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
      take: 40,
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, messages: [] });
  }
}

export async function DELETE() {
  try {
    await prisma.chatMessage.deleteMany();
    return NextResponse.json({ success: true, message: 'Đã xóa lịch sử trò chuyện' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa' }, { status: 500 });
  }
}
