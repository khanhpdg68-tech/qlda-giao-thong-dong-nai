/**
 * Định dạng tiền tệ Việt Nam (VNĐ)
 * Ví dụ: 15420000000 -> "15.420.000.000 đ"
 */
export function formatCurrencyVN(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 đ';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' đ';
}

/**
 * Định dạng số phần trăm
 * Ví dụ: 4.52 -> "4.52%"
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  return value.toFixed(2) + '%';
}

/**
 * Định dạng ngày chuẩn Việt Nam: dd/MM/yyyy
 */
export function formatDateVN(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày giờ chuẩn Việt Nam: dd/MM/yyyy HH:mm
 */
export function formatDateTimeVN(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Định dạng cho input type="datetime-local" (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocalInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Định dạng cho input type="date" (YYYY-MM-DD)
 */
export function toDateInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Định dạng số nhập liệu có dấu chấm ngăn cách hàng nghìn (cho input hiển thị VNĐ lẻ từng đồng)
 * Ví dụ: 180365295321 -> "180.365.295.321"
 */
export function formatNumberWithDots(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/[^\d]/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN').format(Number(digits));
}

/**
 * Phân tích chuỗi số có dấu chấm/phẩy thành số nguyên
 * Ví dụ: "180.365.295.321" -> 180365295321
 */
export function parseCurrencyInput(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const digits = val.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
