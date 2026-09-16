import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmailNotification } from '@/lib/email';
import { formatDateTimeVN } from '@/lib/formatters';

export async function POST(req: NextRequest) {
  try {
    const config = await prisma.systemConfig.findFirst({ where: { id: 'default' } });
    const targetEmail = config?.alertEmail || process.env.ALERT_RECEIVER_EMAIL || 'khanhpdg68@gmail.com';
    const now = new Date();

    const testSubject = `[KIỂM TRA HỆ THỐNG] Kiểm tra kết nối Cảnh báo Email - Ban QLDA Giao thông`;
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">HỆ THỐNG QUẢN LÝ DỰ ÁN GIAO THÔNG</h2>
          <p style="margin: 6px 0 0 0; opacity: 0.9;">Ban Quản lý Dự án Đầu tư Xây dựng Công trình Giao thông</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
          <p>Xin chào <strong>${targetEmail}</strong>,</p>
          <p>Đây là bức thư thử nghiệm được kích hoạt từ Hệ thống Quản trị Web App.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Thời điểm gửi:</strong> ${formatDateTimeVN(now)}</p>
            <p style="margin: 4px 0 0 0;"><strong>Trạng thái kết nối:</strong> Máy chủ đã thiết lập bộ máy cảnh báo tự động sẵn sàng.</p>
          </div>
          <p>Hệ thống tự động thực hiện các quy tắc sau:</p>
          <ul>
            <li><strong>Cảnh báo Đấu thầu:</strong> Tự động quét và gửi mail khi gói thầu còn &le; 6 tiếng đóng thầu.</li>
            <li><strong>Cảnh báo Hợp đồng:</strong> Tự động thông báo khi hợp đồng còn &le; 15 ngày để kịp thời phê duyệt Phụ lục gia hạn.</li>
            <li><strong>Cảnh báo Bảo lãnh:</strong> Tự động cảnh báo trước 30 ngày khi thư bảo lãnh ngân hàng sắp hết hạn.</li>
          </ul>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
          Email kiểm thử tự động từ Hệ thống Quản trị Dự án Giao thông.
        </div>
      </div>
    `;

    const result = await sendEmailNotification({
      recipient: targetEmail,
      subject: testSubject,
      htmlContent: testHtml,
      type: 'TEST_EMAIL',
    });

    return NextResponse.json({
      success: result.success,
      recipient: targetEmail,
      note: result.note,
      message: result.success
        ? `Đã gửi thành công email kiểm thử tới ${targetEmail}`
        : `Yêu cầu gửi đã được ghi nhận vào nhật ký hệ thống (${result.note})`,
    });
  } catch (error: any) {
    console.error('Lỗi khi gửi email kiểm thử:', error);
    return NextResponse.json({ error: error.message || 'Lỗi gửi email kiểm thử' }, { status: 500 });
  }
}
