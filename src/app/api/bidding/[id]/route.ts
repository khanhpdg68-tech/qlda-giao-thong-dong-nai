import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pkg = await prisma.biddingPackage.findUnique({
      where: { id },
      include: {
        project: true,
        contract: {
          include: {
            addendums: {
              orderBy: { signingDate: 'desc' },
            },
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Không tìm thấy gói thầu' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: pkg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.biddingPackage.update({
      where: { id },
      data: {
        packageName: body.packageName,
        packagePrice: body.packagePrice ? Number(body.packagePrice) : undefined,
        procurementMethod: body.procurementMethod,
        selectionMethod: body.selectionMethod,
        khlcntDecision: body.khlcntDecision,
        khlcntFileUrl: body.khlcntFileUrl,
        hsmtPublishDate: body.hsmtPublishDate ? new Date(body.hsmtPublishDate) : undefined,
        bidCloseTime: body.bidCloseTime ? new Date(body.bidCloseTime) : undefined,
        kqlcntDecision: body.kqlcntDecision,
        kqlcntFileUrl: body.kqlcntFileUrl,
        status: body.status,
      },
      include: { project: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// Thao tác đặc biệt: Gia hạn đóng thầu, Hủy thầu, Đấu thầu lại
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const currentPkg = await prisma.biddingPackage.findUnique({ where: { id } });
    if (!currentPkg) {
      return NextResponse.json({ error: 'Không tìm thấy gói thầu' }, { status: 404 });
    }

    let updated;

    if (action === 'EXTEND_BID_CLOSE_TIME') {
      const { newBidCloseTime, extensionReason } = body;
      if (!newBidCloseTime) {
        return NextResponse.json({ error: 'Thời điểm đóng thầu mới không được để trống' }, { status: 400 });
      }

      updated = await prisma.biddingPackage.update({
        where: { id },
        data: {
          originalBidCloseTime: currentPkg.originalBidCloseTime || currentPkg.bidCloseTime,
          bidCloseTime: new Date(newBidCloseTime),
          extensionReason: extensionReason || 'Gia hạn thời điểm đóng thầu theo quy định',
        },
      });
    } else if (action === 'CANCEL') {
      const { reason } = body;
      updated = await prisma.biddingPackage.update({
        where: { id },
        data: {
          status: 'CANCELED',
          extensionReason: reason || 'Hủy thầu',
        },
      });
    } else if (action === 'RE_BID') {
      const { reason } = body;
      updated = await prisma.biddingPackage.update({
        where: { id },
        data: {
          status: 'RE_BIDDING',
          extensionReason: reason || 'Tổ chức đấu thầu lại',
        },
      });
    } else {
      return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.biddingPackage.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Đã xóa gói thầu thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa gói thầu' }, { status: 500 });
  }
}
