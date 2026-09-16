import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processGeminiAiMessage } from '@/lib/gemini';
import { z } from 'zod';

const chatSchema = z.object({
  message: z.string().min(1, 'Tin nhắn không được để trống'),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = chatSchema.parse(body);

    // Lưu tin nhắn của người dùng vào lịch sử
    await prisma.chatMessage.create({
      data: {
        role: 'user',
        content: message,
      },
    }).catch(() => {});

    // Xử lý bằng Gemini AI hoặc bộ phân tích thông minh
    const { reply, action } = await processGeminiAiMessage(message, history);

    // Lưu phản hồi của AI vào lịch sử
    await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: reply,
        action: action?.actionType || null,
        metadata: action?.data ? JSON.stringify(action.data) : null,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      reply,
      action,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Lỗi API AI chat:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý AI' }, { status: 500 });
  }
}
