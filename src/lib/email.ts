import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface SendAlertOptions {
  recipient?: string;
  subject: string;
  htmlContent: string;
  type: 'BIDDING_CLOSE' | 'CONTRACT_EXTENSION' | 'GUARANTEE_EXPIRATION' | 'TEST_EMAIL';
}

export async function sendEmailNotification({
  recipient = process.env.ALERT_RECEIVER_EMAIL || 'khanhpdg68@gmail.com',
  subject,
  htmlContent,
  type,
}: SendAlertOptions) {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'Ban QLDA Đầu tư Xây dựng Thành phố - UBND TP Đồng Nai';

  let sendStatus = 'SUCCESS';
  let sendError: string | null = null;

  // Kiểm tra xem có thông tin cấu hình tài khoản gửi hay không
  if (smtpUser && smtpPass && smtpUser.trim() !== '' && smtpPass.trim() !== '') {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        to: recipient,
        subject: subject,
        html: htmlContent,
      });
    } catch (err: any) {
      console.error('Lỗi khi gửi email qua SMTP:', err);
      sendStatus = 'FAILED';
      sendError = err?.message || 'Không thể kết nối máy chủ SMTP';
    }
  } else {
    // Chế độ mô phỏng kiểm thử (Dry-run log):
    // Giúp người dùng kiểm tra chức năng ngay lập tức trên UI trước khi điền thông tin SMTP bí mật
    console.log(`[SIMULATED EMAIL DISPATCH] Type: ${type} -> To: ${recipient}`);
    console.log(`Subject: ${subject}`);
    sendError = 'Chế độ mô phỏng hệ thống (Cần điền SMTP_USER và SMTP_PASS trong file .env để gửi trực tiếp qua internet)';
  }

  // Lưu vết kiểm toán vào NotificationLog trong CSDL
  try {
    const log = await prisma.notificationLog.create({
      data: {
        type,
        recipient,
        title: subject,
        content: htmlContent.replace(/<[^>]*>?/gm, ' ').slice(0, 500),
        status: sendStatus,
        error: sendError,
      },
    });
    return { success: sendStatus === 'SUCCESS', log, note: sendError };
  } catch (dbErr: any) {
    console.error('Lỗi lưu nhật ký NotificationLog:', dbErr);
    return { success: sendStatus === 'SUCCESS', note: sendError };
  }
}

/**
 * Mẫu HTML Email thông báo Đóng thầu
 */
export function buildBiddingAlertEmailHtml(params: {
  projectName: string;
  packageName: string;
  bidCloseTime: string;
  remainingText: string;
  appUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #b91c1c; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">⚠️ CẢNH BÁO KHẨN CẤP: SẮP ĐẾN HẠN ĐÓNG THẦU</h2>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Ban Quản lý Dự án Đầu tư Xây dựng Thành phố (UBND TP. Đồng Nai)</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <p>Kính gửi Cán bộ phụ trách và Lãnh đạo Ban,</p>
        <p>Hệ thống tự động phát hiện gói thầu sau sắp đến thời điểm đóng/mở thầu theo quy định:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 10px; font-weight: bold; width: 35%; border-bottom: 1px solid #e2e8f0;">Dự án:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${params.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Gói thầu:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #b91c1c; font-weight: bold;">${params.packageName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Thời điểm đóng thầu:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>${params.bidCloseTime}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Thời gian còn lại:</td>
            <td style="padding: 10px; color: #b91c1c; font-weight: bold;">${params.remainingText}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          Đề nghị đồng chí phụ trách kiểm tra việc nộp HSDT trên Hệ thống mạng đấu thầu quốc gia và chuẩn bị công tác mở thầu theo đúng quy định.
        </p>
        <div style="text-align: center; margin-top: 25px;">
          <a href="${params.appUrl}/bidding" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Xem chi tiết Gói thầu trên Hệ thống
          </a>
        </div>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        Email được tạo tự động từ Hệ thống Quản lý Dự án ĐTXD Thành phố - UBND TP. Đồng Nai.
      </div>
    </div>
  `;
}

/**
 * Mẫu HTML Email thông báo Hết hạn Hợp đồng cần làm Phụ lục gia hạn
 */
export function buildContractAlertEmailHtml(params: {
  projectName: string;
  packageName: string;
  contractorName: string;
  currentEndDate: string;
  remainingDays: number;
  appUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ea580c; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">⚠️ CẢNH BÁO TIẾN ĐỘ: HỢP ĐỒNG SẮP HẾT HẠN</h2>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Ban Quản lý Dự án Đầu tư Xây dựng Thành phố (UBND TP. Đồng Nai)</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <p>Kính gửi Cán bộ Quản lý Hợp đồng và Lãnh đạo Ban,</p>
        <p>Hệ thống cảnh báo hợp đồng sau đây <strong>còn ${params.remainingDays} ngày</strong> sẽ hết hạn thời gian thực hiện theo thỏa thuận:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff7ed; border: 1px solid #fed7aa;">
          <tr>
            <td style="padding: 10px; font-weight: bold; width: 35%; border-bottom: 1px solid #fed7aa;">Dự án:</td>
            <td style="padding: 10px; border-bottom: 1px solid #fed7aa;">${params.projectName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #fed7aa;">Gói thầu:</td>
            <td style="padding: 10px; border-bottom: 1px solid #fed7aa; font-weight: bold;">${params.packageName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #fed7aa;">Nhà thầu thực hiện:</td>
            <td style="padding: 10px; border-bottom: 1px solid #fed7aa;">${params.contractorName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #fed7aa;">Ngày kết thúc hiện tại:</td>
            <td style="padding: 10px; border-bottom: 1px solid #fed7aa; color: #c2410c; font-weight: bold;">${params.currentEndDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Số ngày còn lại:</td>
            <td style="padding: 10px; color: #dc2626; font-weight: bold; font-size: 16px;">${params.remainingDays} ngày</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">
          <strong>Đề nghị:</strong> Đơn vị tư vấn giám sát và nhà thầu khẩn trương rà soát tiến độ thi công thực tế tại hiện trường. Nếu cần gia hạn thời gian do nguyên nhân khách quan (GPMB, thời tiết, thiết kế), khẩn trương lập hồ sơ trình phê duyệt <strong>Phụ lục hợp đồng gia hạn</strong> trước khi hết hạn hiệu lực.
        </p>
        <div style="text-align: center; margin-top: 25px;">
          <a href="${params.appUrl}/contracts" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Vào Quản lý Hợp đồng & Thêm Phụ Lục
          </a>
        </div>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        Email được tạo tự động từ Hệ thống Quản lý Dự án ĐTXD Thành phố - UBND TP. Đồng Nai.
      </div>
    </div>
  `;
}
