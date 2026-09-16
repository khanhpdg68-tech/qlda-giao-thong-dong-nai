import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint không hợp lệ'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = subscriptionSchema.parse(body);

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: validated.endpoint },
      create: {
        endpoint: validated.endpoint,
        p256dh: validated.keys.p256dh,
        auth: validated.keys.auth,
        userAgent: validated.userAgent || req.headers.get('user-agent') || null,
      },
      update: {
        p256dh: validated.keys.p256dh,
        auth: validated.keys.auth,
        userAgent: validated.userAgent || req.headers.get('user-agent') || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đăng ký nhận thông báo đẩy trên thiết bị thành công',
      data: subscription,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Lỗi lưu push subscription:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;
    if (endpoint) {
      await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => {});
    }
    return NextResponse.json({ success: true, message: 'Đã hủy đăng ký nhận thông báo' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xử lý' }, { status: 500 });
  }
}
