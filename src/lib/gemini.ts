import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma';

// Lấy API Key từ SystemConfig hoặc .env
export async function getGeminiApiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    const config = await prisma.systemConfig.findFirst({ where: { id: 'default' } });
    if (config?.geminiApiKey && config.geminiApiKey.trim() !== '') {
      return config.geminiApiKey.trim();
    }
  } catch {}
  return null;
}

export interface AiActionResult {
  actionType: 'CREATE_SCHEDULE' | 'CREATE_PACKAGE' | 'QUERY' | 'NONE';
  data?: any;
  message: string;
}

// Bộ phân tích quy tắc NLP nội bộ (hoạt động ngay cả khi chưa có Gemini API Key)
export async function fallbackNlpProcessor(userMessage: string): Promise<{ reply: string; action?: AiActionResult }> {
  const text = userMessage.toLowerCase().trim();
  const now = new Date();

  // 1. Ý định hỏi về cảnh báo mốc / gói thầu sắp đóng / hợp đồng
  if (
    text.includes('sắp đóng') ||
    text.includes('đóng thầu') ||
    text.includes('hết hạn') ||
    text.includes('cảnh báo') ||
    text.includes('gia hạn')
  ) {
    const [packages, contracts] = await Promise.all([
      prisma.biddingPackage.findMany({
        where: { status: 'PUBLISHED' },
        include: { project: true },
      }),
      prisma.contract.findMany({
        where: { status: { not: 'LIQUIDATED' } },
        include: { project: true, package: true, addendums: true },
      }),
    ]);

    const urgentBids = packages.filter((p) => {
      if (!p.bidCloseTime) return false;
      const diffHours = (new Date(p.bidCloseTime).getTime() - now.getTime()) / (1000 * 3600);
      return diffHours > 0 && diffHours <= 24;
    });

    const urgentCtrs = contracts.filter((c) => {
      const end = c.originalEndDate; // hoặc lấy mốc addendums
      const diffDays = (new Date(end).getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 15;
    });

    let reply = `📊 **Báo cáo tình hình hệ thống tức thì:**\n`;
    reply += `• **Gói thầu đang mời thầu:** ${packages.length} gói.\n`;
    if (urgentBids.length > 0) {
      reply += `⚠️ Có **${urgentBids.length} gói thầu** sắp đến hạn đóng thầu trong 24 giờ tới:\n`;
      urgentBids.forEach((b, i) => {
        reply += `  ${i + 1}. *${b.packageName}* (Đóng thầu: ${new Date(b.bidCloseTime).toLocaleString('vi-VN')})\n`;
      });
    } else {
      reply += `✓ Hiện không có gói thầu nào sắp đóng thầu khẩn cấp.\n`;
    }

    if (urgentCtrs.length > 0) {
      reply += `⚠️ Có **${urgentCtrs.length} hợp đồng** cần lưu ý thời hạn/gia hạn trong 15 ngày tới.\n`;
    } else {
      reply += `✓ Các hợp đồng hiện tại đều trong ngưỡng tiến độ an toàn.\n`;
    }

    return {
      reply,
      action: { actionType: 'QUERY', message: 'Truy vấn cảnh báo hệ thống' },
    };
  }

  // 2. Ý định hỏi lịch làm việc hôm nay / tuần này
  if (text.includes('lịch') && (text.includes('hôm nay') || text.includes('có gì') || text.includes('ngày mai'))) {
    const isTomorrow = text.includes('ngày mai');
    const targetDate = new Date(now);
    if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
    const targetDateStr = targetDate.toISOString().slice(0, 10);

    const plans = await prisma.workPlan.findMany({
      where: {
        date: {
          gte: new Date(targetDateStr + 'T00:00:00Z'),
          lte: new Date(targetDateStr + 'T23:59:59Z'),
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    const dayName = isTomorrow ? 'ngày mai' : 'hôm nay';
    if (plans.length === 0) {
      return {
        reply: `📅 Trong ${dayName} (${targetDate.toLocaleDateString('vi-VN')}), Quý khách chưa có lịch làm việc nào được ghi chép. Quý khách có muốn thêm lịch họp hay kiểm tra hiện trường nào không ạ?`,
        action: { actionType: 'QUERY', message: `Truy vấn lịch ${dayName}` },
      };
    }

    let reply = `📅 **Lịch làm việc của Quý khách trong ${dayName} (${targetDate.toLocaleDateString('vi-VN')}) gồm ${plans.length} công việc:**\n`;
    plans.forEach((p, i) => {
      const timeStr = p.isAllDay ? 'Cả ngày' : `${p.startTime || ''} ${p.endTime ? `- ${p.endTime}` : ''}`;
      const statusStr = p.isCompleted ? '✓ [Đã xong]' : '⏳ [Chưa xong]';
      reply += `${i + 1}. **${p.title}** (${timeStr}) ${statusStr}\n`;
      if (p.location) reply += `   📍 Địa điểm: ${p.location}\n`;
    });

    return {
      reply,
      action: { actionType: 'QUERY', message: `Truy vấn lịch ${dayName}` },
    };
  }

  // 3. Ý định ghi lại lịch làm việc cá nhân (Họp, Kiểm tra, Ghi lại, Lên lịch...)
  if (
    text.includes('họp') ||
    text.includes('kiểm tra') ||
    text.includes('ghi lại') ||
    text.includes('lên lịch') ||
    text.includes('nhắc') ||
    text.includes('đi công tác')
  ) {
    // Tự động phân tích ngày
    let targetDate = new Date(now);
    if (text.includes('ngày mai') || text.includes('sáng mai') || text.includes('chiều mai') || text.includes('tối mai')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (text.includes('ngày kia') || text.includes('hôm kia')) {
      targetDate.setDate(targetDate.getDate() + 2);
    }

    // Tự động phân tích giờ (VD: 8h, 8h30, 9:00, 14h, 15h30...)
    let startTime = '08:30';
    let endTime = '11:00';
    let isAllDay = false;

    const timeMatch = text.match(/(\d{1,2})h(\d{2})?|(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1] || timeMatch[3], 10);
      const m = timeMatch[2] || timeMatch[4] || '00';
      startTime = `${String(h).padStart(2, '0')}:${m}`;
      endTime = `${String(Math.min(23, h + 2)).padStart(2, '0')}:${m}`;
    } else if (text.includes('cả ngày')) {
      isAllDay = true;
    }

    // Phân loại category
    let category = 'MEETING';
    if (text.includes('kiểm tra') || text.includes('hiện trường') || text.includes('công trường')) {
      category = 'INSPECTION';
    } else if (text.includes('công tác') || text.includes('chuyến đi')) {
      category = 'BUSINESS_TRIP';
    } else if (text.includes('khẩn') || text.includes('gấp')) {
      category = 'URGENT';
    } else if (text.includes('nhắc')) {
      category = 'REMINDER';
    }

    // Lọc tiêu đề sạch
    let title = userMessage.trim();
    // Bỏ các từ đệm
    title = title.replace(/^(hãy |ghi lại giúp anh |nhắc anh |lên lịch giúp anh |anh có lịch |có lịch )/i, '');
    if (title.length > 80) title = title.slice(0, 80) + '...';

    // Tạo bản ghi WorkPlan thật trong cơ sở dữ liệu
    const newPlan = await prisma.workPlan.create({
      data: {
        title: title || 'Lịch làm việc mới',
        date: targetDate,
        startTime: isAllDay ? null : startTime,
        endTime: isAllDay ? null : endTime,
        isAllDay,
        category,
        priority: category === 'URGENT' ? 'URGENT' : 'NORMAL',
        notes: `Tự động tạo bởi Trợ lý AI từ câu nói: "${userMessage}"`,
      },
    });

    const timeDisplay = isAllDay ? 'Cả ngày' : `${startTime} - ${endTime}`;
    const dateDisplay = targetDate.toLocaleDateString('vi-VN');

    return {
      reply: `✅ **Tôi đã ghi lại lịch làm việc cá nhân cho Quý khách thành công!**\n\n• **Nội dung:** ${newPlan.title}\n• **Thời gian:** ${timeDisplay}, ngày ${dateDisplay}\n• **Phân loại:** ${category === 'MEETING' ? 'Họp / Giao ban' : category === 'INSPECTION' ? 'Kiểm tra hiện trường' : 'Công tác'}\n\nQuý khách có thể xem và chỉnh sửa chi tiết tại trang **Kế Hoạch Làm Việc** (/schedule).`,
      action: {
        actionType: 'CREATE_SCHEDULE',
        data: newPlan,
        message: `Đã tạo lịch: ${newPlan.title}`,
      },
    };
  }

  // 4. Mặc định phản hồi chung
  return {
    reply: `Chào Quý khách! Tôi là **Trợ lý AI UBND Thành phố Đồng Nai - Ban QLDA ĐTXD Công trình Giao thông**. Tôi có thể hỗ trợ Quý khách:\n\n1. **Ghi lịch làm việc cá nhân**: Nói hoặc gõ *"Sáng mai 9h anh họp giao ban UBND Thành phố"* hoặc *"Thứ 5 đi kiểm tra hiện trường gói 06"*.\n2. **Tra cứu tiến độ & cảnh báo**: Hỏi *"Có gói thầu nào sắp đóng không?"*, *"Hôm nay anh có lịch gì?"*.\n3. **Nhập liệu nhanh bằng giọng nói**: Bấm vào nút Micro để nói tiếng Việt trực tiếp.\n\nQuý khách cần tôi hỗ trợ việc gì ngay bây giờ ạ?`,
  };
}

// Xử lý bằng Google Gemini API khi đã có Key
export async function processGeminiAiMessage(
  userMessage: string,
  history: Array<{ role: string; content: string }>
): Promise<{ reply: string; action?: AiActionResult }> {
  const apiKey = await getGeminiApiKey();

  // Nếu chưa có Gemini API Key, tự động chuyển sang Fallback NLP thông minh
  if (!apiKey) {
    return fallbackNlpProcessor(userMessage);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Bạn là Trợ lý AI Chuyên viên Điều hành của UBND Thành phố Đồng Nai - Ban Quản lý Dự án Đầu tư Xây dựng Công trình Giao thông tại Việt Nam.
Thời điểm hiện tại: ${new Date().toLocaleString('vi-VN')}.
Nhiệm vụ của bạn:
1. Giao tiếp lịch sự, kính trọng, chuyên nghiệp bằng tiếng Việt ("Em/Tôi xin chào Quý khách...", "Dạ báo cáo Quý khách...").
2. Hỗ trợ Quý khách ghi lại lịch làm việc cá nhân (lịch họp, kiểm tra hiện trường, công tác), tra cứu thông tin gói thầu, hợp đồng, dự án.
3. Khi người dùng muốn lên lịch, hãy trả về kết quả rõ ràng về thời gian, địa điểm, nội dung.`,
    });

    // Trước tiên xử lý các thao tác tạo lịch hoặc truy vấn dữ liệu
    const nlpCheck = await fallbackNlpProcessor(userMessage);
    if (nlpCheck.action && nlpCheck.action.actionType !== 'NONE') {
      return nlpCheck;
    }

    // Nếu là câu hỏi đàm thoại, gửi tới Gemini
    const chat = model.startChat({
      history: history.slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const responseText = result.response.text();

    return {
      reply: responseText,
    };
  } catch (err: any) {
    console.error('Lỗi gọi Gemini API, chuyển sang chế độ tự động nội bộ:', err);
    return fallbackNlpProcessor(userMessage);
  }
}
