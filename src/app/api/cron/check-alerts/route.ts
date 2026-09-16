import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getCurrentEndDate,
  calculateRemainingDays,
} from '@/lib/calculations';
import {
  sendEmailNotification,
  buildBiddingAlertEmailHtml,
  buildContractAlertEmailHtml,
} from '@/lib/email';
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
    const config = await prisma.systemConfig.findFirst({ where: { id: 'default' } });
    const targetEmail = config?.alertEmail || process.env.ALERT_RECEIVER_EMAIL || 'khanhpdg68@gmail.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const now = new Date();
    const alertResults = {
      biddingAlertsSent: 0,
      contractAlertsSent: 0,
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

      const emailHtml = buildBiddingAlertEmailHtml({
        projectName: pkg.project.projectName,
        packageName: pkg.packageName,
        bidCloseTime: formatDateTimeVN(pkg.bidCloseTime),
        remainingText,
        appUrl,
      });

      await sendEmailNotification({
        recipient: targetEmail,
        subject: `[CẢNH BÁO ĐẤU THẦU] Gói thầu ${pkg.packageName.slice(0, 40)}... sắp đến giờ đóng thầu (${remainingText})`,
        htmlContent: emailHtml,
        type: 'BIDDING_CLOSE',
      });

      sendPushNotificationToAll({
        title: '⚠️ [CẢNH BÁO ĐẤU THẦU] Sắp đóng thầu',
        body: `Gói thầu "${pkg.packageName}" sắp đóng thầu (${remainingText})`,
        url: '/bidding',
        tag: `bid-${pkg.id}`,
      }).catch(() => {});

      alertResults.biddingAlertsSent++;
      alertResults.details.push(`Gửi cảnh báo đấu thầu gói "${pkg.packageName}" (${remainingText})`);
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
        const emailHtml = buildContractAlertEmailHtml({
          projectName: contract.project.projectName,
          packageName,
          contractorName: contract.contractorName,
          currentEndDate: formatDateVN(currentEndDate),
          remainingDays,
          appUrl,
        });

        await sendEmailNotification({
          recipient: targetEmail,
          subject: `[CẢNH BÁO TIẾN ĐỘ] Hợp đồng ${packageName.slice(0, 35)}... còn ${remainingDays} ngày hết hạn`,
          htmlContent: emailHtml,
          type: 'CONTRACT_EXTENSION',
        });

        sendPushNotificationToAll({
          title: '⚠️ [CẢNH BÁO HỢP ĐỒNG] Hạn thực hiện',
          body: `Hợp đồng "${packageName}" còn ${remainingDays} ngày hết hạn`,
          url: '/contracts',
          tag: `ctr-${contract.id}`,
        }).catch(() => {});

        alertResults.contractAlertsSent++;
        alertResults.details.push(
          `Gửi cảnh báo hợp đồng "${packageName}" (Còn ${remainingDays} ngày)`
        );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      recipient: targetEmail,
      summary: alertResults,
      message: `Đã hoàn tất quét cảnh báo. Đã gửi ${alertResults.biddingAlertsSent} cảnh báo đấu thầu và ${alertResults.contractAlertsSent} cảnh báo hợp đồng tới ${targetEmail}.`,
    });
  } catch (error: any) {
    console.error('Lỗi khi quét và gửi cảnh báo email:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý cảnh báo' }, { status: 500 });
  }
}
