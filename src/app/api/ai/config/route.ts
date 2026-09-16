import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGeminiApiKey } from '@/lib/gemini';

export async function GET() {
  try {
    const key = await getGeminiApiKey();
    const hasKey = !!key;
    const maskedKey = key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '';
    return NextResponse.json({ hasKey, maskedKey });
  } catch (error: any) {
    return NextResponse.json({ hasKey: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    await prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        geminiApiKey: apiKey ? String(apiKey).trim() : null,
      },
      update: {
        geminiApiKey: apiKey ? String(apiKey).trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: apiKey ? 'Đã lưu khóa Google Gemini API thành công!' : 'Đã xóa khóa Google Gemini API',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi lưu cấu hình' }, { status: 500 });
  }
}
