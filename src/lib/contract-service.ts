import { prisma } from '@/lib/prisma';
import {
  calculateRemainingDays,
  calculateContractTimeSummary,
  calculateContractPriceSummary,
} from '@/lib/calculations';

/**
 * Tự động tính toán lại toàn diện Hợp đồng sau khi Thêm / Sửa / Xóa Phụ lục
 */
export async function recalculateContract(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      addendums: {
        orderBy: { signingDate: 'asc' },
      },
    },
  });

  if (!contract) return null;

  // 1. Tính toán lại Thời gian thực hiện & Ngày kết thúc hiệu lực hiện tại
  const timeSummary = calculateContractTimeSummary(contract.durationDays, contract.originalEndDate, contract.addendums);
  const currentEnd = timeSummary.currentEndDate;
  const now = new Date();
  const remainingDays = calculateRemainingDays(currentEnd, now);

  // 2. Tính toán lại Trạng thái hợp đồng
  let newStatus = contract.status;
  if (!['LIQUIDATED', 'COMPLETED', 'SUSPENDED'].includes(contract.status)) {
    if (remainingDays <= 15) {
      newStatus = 'NEED_EXTENSION';
    } else if (contract.addendums.some((a) => (Number(a.extendedDays) || 0) > 0)) {
      newStatus = 'EXTENDED';
    } else {
      newStatus = 'ACTIVE';
    }
  }

  // 3. Tính toán lại Giá trị hợp đồng điều chỉnh
  const priceSummary = calculateContractPriceSummary(contract.contractPrice, contract.addendums);
  const newAdjustedPrice = priceSummary.hasPriceAdjustment ? priceSummary.finalContractPrice : null;

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: newStatus,
      adjustedContractPrice: newAdjustedPrice,
    },
  });

  return { currentEnd, newStatus, newAdjustedPrice, timeSummary, priceSummary };
}
