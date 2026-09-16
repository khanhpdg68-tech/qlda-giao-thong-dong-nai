import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang xóa dữ liệu cũ để khởi tạo dữ liệu mẫu chuẩn ---');
  await prisma.notificationLog.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.contractAddendum.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.biddingPackage.deleteMany();
  await prisma.project.deleteMany();

  // 0. Cấu hình hệ thống mặc định
  await prisma.systemConfig.create({
    data: {
      id: 'default',
      alertEmail: 'khanhpdg68@gmail.com',
      biddingAlertHours: 6,
      contractAlertDays: 15,
      guaranteeAlertDays: 30,
    },
  });

  console.log('--- Đang tạo Dự án Giao thông ---');
  const project1 = await prisma.project.create({
    data: {
      projectCode: 'DA-GT-2026-01',
      projectName: 'Dự án Xây dựng Tuyến Đường Vành đai 4 - Vùng Thủ đô (Đoạn Km12+000 đến Km36+500)',
      approvalDecision: '358/QĐ-TTg ngày 16/03/2024 của Thủ tướng Chính phủ',
      legalDriveUrl: 'https://drive.google.com/drive/folders/sample-vanh-dai-4',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      projectCode: 'DA-GT-2026-02',
      projectName: 'Dự án Xây dựng Cầu Vượt Sông Hồng và Tuyến Đường Hai Đầu Cầu',
      approvalDecision: '1826/QĐ-UBND ngày 20/07/2025 của UBND Tỉnh',
      legalDriveUrl: 'https://drive.google.com/drive/folders/sample-cau-song-hong',
    },
  });

  const project3 = await prisma.project.create({
    data: {
      projectCode: 'DA-GT-2026-03',
      projectName: 'Dự án Cải tạo, Nâng cấp Quốc lộ 1A (Đoạn Km15+000 - Km45+500)',
      approvalDecision: '925/QĐ-BGTVT ngày 10/11/2024 của Bộ Giao thông Vận tải',
      legalDriveUrl: 'https://drive.google.com/drive/folders/sample-ql1a',
    },
  });

  const project4 = await prisma.project.create({
    data: {
      projectCode: 'DA-GT-2026-04',
      projectName: 'Dự án Xây dựng Tuyến Tránh Đô thị kết nối Đường tỉnh 389',
      approvalDecision: '640/QĐ-UBND ngày 05/01/2026 của UBND Tỉnh',
      legalDriveUrl: 'https://drive.google.com/drive/folders/sample-tuyen-tranh',
    },
  });

  console.log('--- Đang tạo Gói thầu Đấu thầu ---');
  const now = new Date();

  // Gói 1: Đã trao thầu & Đã chuyển HĐ
  const pkg1 = await prisma.biddingPackage.create({
    data: {
      projectId: project1.id,
      packageName: 'Gói thầu số 08: Thi công xây dựng nền, mặt đường, công trình thoát nước và an toàn giao thông từ Km10 - Km25',
      packagePrice: 154200000000, // 154,2 tỷ
      procurementMethod: 'OPEN_BIDDING', // Đấu thầu rộng rãi qua mạng
      selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
      khlcntDecision: '450/QĐ-BQL ngày 12/04/2025',
      khlcntFileUrl: 'https://drive.google.com/file/d/sample-khlcnt-08',
      hsmtPublishDate: new Date('2025-05-10'),
      bidCloseTime: new Date('2025-06-05T09:00:00Z'),
      kqlcntDecision: '789/QĐ-BQL ngày 28/06/2025',
      kqlcntFileUrl: 'https://drive.google.com/file/d/sample-kqlcnt-08',
      status: 'AWARDED',
      isTransferredToContract: true,
    },
  });

  // Gói 2: Đang mời thầu - CÒN 4 TIẾNG NỮA LÀ ĐÓNG THẦU (Kích hoạt cảnh báo ĐỎ nhấp nháy <= 6h)
  const urgentBidCloseTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 tiếng nữa
  const pkg2 = await prisma.biddingPackage.create({
    data: {
      projectId: project2.id,
      packageName: 'Gói thầu số 04: Cung cấp và lắp đặt hệ thống chiếu sáng mỹ thuật cầu và đường dẫn hai đầu cầu',
      packagePrice: 18600000000, // 18,6 tỷ
      procurementMethod: 'OPEN_BIDDING',
      selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
      khlcntDecision: '512/QĐ-BQL ngày 02/08/2025',
      khlcntFileUrl: 'https://drive.google.com/file/d/sample-khlcnt-04',
      hsmtPublishDate: new Date(now.getTime() - 20 * 86400000),
      bidCloseTime: urgentBidCloseTime,
      status: 'PUBLISHED',
      isTransferredToContract: false,
    },
  });

  // Gói 3: Đã có QĐ KQLCNT nhưng CHƯA chuyển sang HĐ -> Nút "Chuyển sang Quản lý Hợp đồng" nổi bật
  const pkg3 = await prisma.biddingPackage.create({
    data: {
      projectId: project3.id,
      packageName: 'Gói thầu số 06: Thi công hệ thống rãnh dọc kiên cố và cống thoát nước ngang đường Km30 - Km45',
      packagePrice: 32000000000, // 32 tỷ
      procurementMethod: 'OPEN_BIDDING',
      selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
      khlcntDecision: '620/QĐ-BQL ngày 15/09/2025',
      khlcntFileUrl: 'https://drive.google.com/file/d/sample-khlcnt-06',
      hsmtPublishDate: new Date(now.getTime() - 40 * 86400000),
      bidCloseTime: new Date(now.getTime() - 10 * 86400000),
      kqlcntDecision: '1042/QĐ-BQL ngày 10/01/2026',
      kqlcntFileUrl: 'https://drive.google.com/file/d/sample-kqlcnt-06',
      status: 'AWARDED',
      isTransferredToContract: false, // Chưa chuyển!
    },
  });

  // Gói 4: Hợp đồng của Dự án 3 - CÒN 10 NGÀY HẾT HẠN (Kích hoạt cảnh báo ĐỎ khẩn cấp <= 15 ngày)
  const pkg4 = await prisma.biddingPackage.create({
    data: {
      projectId: project3.id,
      packageName: 'Gói thầu số 05: Thi công cải tạo nền mặt đường và tăng cường thảm bê tông nhựa Km15 - Km30',
      packagePrice: 86500000000, // 86,5 tỷ
      procurementMethod: 'OPEN_BIDDING',
      selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
      khlcntDecision: '310/QĐ-BQL ngày 10/01/2025',
      hsmtPublishDate: new Date('2025-02-01'),
      bidCloseTime: new Date('2025-02-25T09:00:00Z'),
      kqlcntDecision: '415/QĐ-BQL ngày 20/03/2025',
      status: 'AWARDED',
      isTransferredToContract: true,
    },
  });

  // Gói 5: Gói thầu số 03 Cầu Vượt Sông Hồng
  const pkg5 = await prisma.biddingPackage.create({
    data: {
      projectId: project2.id,
      packageName: 'Gói thầu số 03: Thi công xây dựng kết cấu nhịp chính cầu đúc hẫng cân bằng vượt sông và trụ tháp',
      packagePrice: 380000000000, // 380 tỷ
      procurementMethod: 'OPEN_BIDDING',
      selectionMethod: 'ONE_STAGE_TWO_ENVELOPES', // 1 GĐ 2 túi HS
      khlcntDecision: '210/QĐ-BQL ngày 05/03/2025',
      hsmtPublishDate: new Date('2025-04-01'),
      bidCloseTime: new Date('2025-05-15T09:00:00Z'),
      kqlcntDecision: '590/QĐ-BQL ngày 25/06/2025',
      status: 'AWARDED',
      isTransferredToContract: true,
    },
  });

  // Gói 6: Hủy thầu (CANCELED)
  await prisma.biddingPackage.create({
    data: {
      projectId: project4.id,
      packageName: 'Gói thầu số 01: Khảo sát địa hình, địa chất và lập Báo cáo nghiên cứu khả thi',
      packagePrice: 1850000000, // 1,85 tỷ
      procurementMethod: 'OPEN_BIDDING',
      selectionMethod: 'ONE_STAGE_ONE_ENVELOPE',
      khlcntDecision: '105/QĐ-BQL ngày 05/01/2026',
      hsmtPublishDate: new Date(now.getTime() - 60 * 86400000),
      bidCloseTime: new Date(now.getTime() - 35 * 86400000),
      status: 'CANCELED',
      extensionReason: 'Hủy thầu theo Quyết định số 120/QĐ-BQL do tất cả hồ sơ dự thầu không đáp ứng yêu cầu HSMT',
      isTransferredToContract: false,
    },
  });

  console.log('--- Đang tạo Hợp đồng & Phụ lục gia hạn ---');

  // Hợp đồng 1: Gói 08 Dự án 1 (Đã có 1 Phụ lục gia hạn thêm 60 ngày)
  const signingDate1 = new Date('2025-07-10');
  const originalEnd1 = new Date(signingDate1.getTime() + 360 * 86400000);
  const contract1 = await prisma.contract.create({
    data: {
      packageId: pkg1.id,
      projectId: project1.id,
      contractorName: 'Liên danh Tổng Công ty Xây dựng Công trình Giao thông 1 (CIENCO 1) - Công ty CP Đầu tư Hạ tầng Đèo Cả',
      contractType: 'UNIT_PRICE_ADJUSTABLE', // Đơn giá điều chỉnh
      contractPrice: 147250000000, // 147,25 tỷ (Tiết kiệm 4.51%)
      contractSigningDate: signingDate1,
      durationDays: 360,
      originalEndDate: originalEnd1,
      guaranteeAmount: 7362500000, // 5% giá HĐ
      guaranteeEndDate: new Date(originalEnd1.getTime() + 90 * 86400000),
      guaranteeBank: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV) - Chi nhánh Hà Nội',
      status: 'EXTENDED',
    },
  });

  // Phụ lục cho Hợp đồng 1
  const plNewEnd1 = new Date(originalEnd1.getTime() + 60 * 86400000);
  await prisma.contractAddendum.create({
    data: {
      contractId: contract1.id,
      addendumNumber: 'PLHĐ 01/2025',
      addendumType: 'TIME_EXTENSION',
      signingDate: new Date('2025-11-20'),
      extendedDays: 60,
      newEndDate: plNewEnd1,
      reason: 'Gia hạn thời gian thực hiện 60 ngày do bàn giao mặt bằng chậm tại nút giao Km18 và thời tiết mưa bão kéo dài',
      fileUrl: 'https://drive.google.com/file/d/sample-plhd-01',
    },
  });

  // Hợp đồng 2: Cầu Vượt Sông Hồng
  const signingDate2 = new Date('2025-07-15');
  const originalEnd2 = new Date(signingDate2.getTime() + 720 * 86400000);
  // Bảo lãnh HĐ còn 20 ngày nữa là hết hạn -> Kích hoạt cảnh báo Bảo lãnh <= 30 ngày
  const guaranteeEnd2 = new Date(now.getTime() + 20 * 86400000);
  await prisma.contract.create({
    data: {
      packageId: pkg5.id,
      projectId: project2.id,
      contractorName: 'Tổng Công ty Xây dựng Thăng Long - CTCP',
      contractType: 'UNIT_PRICE_FIXED', // Đơn giá cố định
      contractPrice: 368500000000, // 368,5 tỷ (Tiết kiệm 3.03%)
      contractSigningDate: signingDate2,
      durationDays: 720,
      originalEndDate: originalEnd2,
      guaranteeAmount: 18425000000,
      guaranteeEndDate: guaranteeEnd2,
      guaranteeBank: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank) - Chi nhánh Ba Đình',
      status: 'ACTIVE',
    },
  });

  // Hợp đồng 3: CÒN 10 NGÀY LÀ HẾT HẠN HỢP ĐỒNG GỐC (CẦN GIA HẠN KHẨN CẤP <= 15 NGÀY)
  const urgentContractEndDate = new Date(now.getTime() + 10 * 86400000); // Còn 10 ngày
  const signingDate3 = new Date(urgentContractEndDate.getTime() - 300 * 86400000);
  await prisma.contract.create({
    data: {
      packageId: pkg4.id,
      projectId: project3.id,
      contractorName: 'Công ty Cổ phần Tập đoàn CIENCO 4',
      contractType: 'LUMP_SUM', // Trọn gói
      contractPrice: 83900000000, // 83,9 tỷ (Tiết kiệm 3.01%)
      contractSigningDate: signingDate3,
      durationDays: 300,
      originalEndDate: urgentContractEndDate,
      guaranteeAmount: 4195000000,
      guaranteeEndDate: new Date(urgentContractEndDate.getTime() + 60 * 86400000),
      guaranteeBank: 'Ngân hàng Nông nghiệp & PTNT Việt Nam (Agribank)',
      status: 'NEED_EXTENSION',
    },
  });

  console.log('--- Đang tạo Nhật ký Email mẫu ---');
  await prisma.notificationLog.create({
    data: {
      type: 'BIDDING_CLOSE',
      recipient: 'khanhpdg68@gmail.com',
      title: '[CẢNH BÁO ĐẤU THẦU] Gói thầu số 04: Chiếu sáng mỹ thuật sắp đến giờ đóng thầu (Còn 4 tiếng)',
      content: 'Hệ thống đã tự động gửi thông báo kiểm tra HSDT và chuẩn bị mở thầu cho gói thầu số 04 thuộc Dự án Cầu Vượt Sông Hồng.',
      status: 'SUCCESS',
      error: null,
    },
  });

  await prisma.notificationLog.create({
    data: {
      type: 'CONTRACT_EXTENSION',
      recipient: 'khanhpdg68@gmail.com',
      title: '[CẢNH BÁO TIẾN ĐỘ] Hợp đồng Gói thầu số 05 (QL1A) còn 10 ngày hết hạn - Cần gia hạn',
      content: 'Cảnh báo tự động gửi tới email khanhpdg68@gmail.com đề nghị lập phụ lục gia hạn thời gian thực hiện.',
      status: 'SUCCESS',
      error: null,
    },
  });

  console.log('--- Nạp dữ liệu mẫu hoàn tất thành công! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
