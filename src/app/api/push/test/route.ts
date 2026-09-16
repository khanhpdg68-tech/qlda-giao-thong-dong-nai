import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToAll } from '@/lib/push-notification';

export async function POST(req: NextRequest) {
  try {
    const result = await sendPushNotificationToAll({
      title: '🔔 [CẢNH BÁO THỬ NGHIỆM] Ban QLDA Giao Thông',
      body: 'Kết nối thông báo đẩy về thiết bị di động của Quý khách đã hoạt động thành công!',
      url: '/schedule',
      tag: 'test-push',
    });

    if (result.total === 0) {
      return NextResponse.json({
        success: false,
        message: 'Chưa có thiết bị nào kích hoạt tính năng thông báo đẩy. Quý khách vui lòng bấm nút "Bật Thông Báo Trên Thiết Bị" trước.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã phát lệnh gửi thông báo tới ${result.sentCount}/${result.total} thiết bị đã đăng ký`,
      result,
    });
  } catch (error: any) {
    console.error('Lỗi gửi push test:', error);
    return NextResponse.json({ error: error.message || 'Lỗi gửi thông báo' }, { status: 500 });
  }
}
