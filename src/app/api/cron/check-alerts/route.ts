import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getCurrentEndDate,
  calculateRemainingDays,
} from '@/lib/calculations';
import { sendPushNotificationToAll } from '@/lib/push-notification';
import { formatDateTimeVN, formatDateVN } from '@/lib/formatters';

export async function GET(req: NextRequest) {
  return handleCheckAlerts(req);
}

export async function POST(req: NextRequest) {
  return handleCheckAlerts(req);
}

async function handleCheckAlerts(req: NextRequest) {
  try {
    const now = new Date();
    const alertResults = {
      biddingAlertsSent: 0,
      contractAlertsSent: 0,
      pushResults: [] as any[],
      details: [] as string[],
    };

    // 1. Quét GÓI THẦU sắp đến giờ đóng thầu trong 6 giờ tới
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const pendingPackages = await prisma.biddingPackage.findMany({
      where: {
        status: { in: ['PUBLISHED', 'DRAFT'] },
        bidCloseTime: {
          gt: now,
          lte: sixHoursLater,
        },
      },
      include: { project: true },
    });

    for (const pkg of pendingPackages) {
      const diffMs = pkg.bidCloseTime.getTime() - now.getTime();
      const minutesRemaining = Math.max(0, Math.floor(diffMs / 60000));
      const hours = Math.floor(minutesRemaining / 60);
      const minutes = minutesRemaining % 60;
      const remainingText = `Còn ${hours} giờ ${minutes} phút`;

      // Phát thông báo đẩy đến toàn bộ điện thoại đã đăng ký
      const pushRes = await sendPushNotificationToAll({
        title: '⚠️ [CẢNH BÁO ĐẤU THẦU] Sắp đóng thầu',
        body: `Gói thầu "${pkg.packageName}" sắp đóng thầu lúc ${formatDateTimeVN(pkg.bidCloseTime)} (${remainingText})`,
        url: '/bidding',
        tag: `bid-${pkg.id}`,
      });

      alertResults.biddingAlertsSent++;
      alertResults.pushResults.push(pushRes);
      alertResults.details.push(`Gửi thông báo đẩy điện thoại gói thầu "${pkg.packageName}" (${remainingText})`);
    }

    // 2. Quét HỢP ĐỒNG sắp hết hạn trong vòng 15 ngày tới
    const activeContracts = await prisma.contract.findMany({
      where: {
        status: { not: 'LIQUIDATED' },
      },
      include: {
        project: true,
        package: true,
        addendums: {
          orderBy: { signingDate: 'desc' },
        },
      },
    });

    for (const contract of activeContracts) {
      const currentEndDate = getCurrentEndDate(contract.originalEndDate, contract.addendums);
      const remainingDays = calculateRemainingDays(currentEndDate, now);

      if (remainingDays <= 15) {
        const packageName = contract.package?.packageName || contract.packageName || 'Hợp đồng trực tiếp';

        // Phát thông báo đẩy đến toàn bộ điện thoại đã đăng ký
        const pushRes = await sendPushNotificationToAll({
          title: '⚠️ [CẢNH BÁO HỢP ĐỒNG] Hạn thực hiện',
          body: `Hợp đồng "${packageName}" còn ${remainingDays} ngày hết hạn (${formatDateVN(currentEndDate)}). Cần lập PLHĐ gia hạn.`,
          url: '/contracts',
          tag: `ctr-${contract.id}`,
        });

        alertResults.contractAlertsSent++;
        alertResults.pushResults.push(pushRes);
        alertResults.details.push(
          `Gửi thông báo đẩy điện thoại hợp đồng "${packageName}" (Còn ${remainingDays} ngày)`
        );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: alertResults,
      message: `Đã hoàn tất quét cảnh báo. Đã phát ${alertResults.biddingAlertsSent} cảnh báo đấu thầu và ${alertResults.contractAlertsSent} cảnh báo hợp đồng tới điện thoại di động.`,
    });
  } catch (error: any) {
    console.error('Lỗi khi quét và gửi cảnh báo điện thoại:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý cảnh báo' }, { status: 500 });
  }
}
