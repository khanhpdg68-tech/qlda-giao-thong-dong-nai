# HỆ THỐNG QUẢN LÝ DỰ ÁN GIAO THÔNG (ĐẤU THẦU & QUẢN LÝ HỢP ĐỒNG)
### Dành cho Ban Quản lý Dự án Đầu tư Xây dựng Công trình Giao thông

---

## 1. GIỚI THIỆU TỔNG QUAN
Hệ thống Web Application chuyên sâu, chuẩn hóa toàn diện nghiệp vụ quản lý dự án đầu tư xây dựng công trình giao thông theo **Luật Đấu thầu số 22/2023/QH15** và các quy định hiện hành về Quản lý Hợp đồng Xây dựng.

Hệ thống hoạt động theo cấu trúc quan hệ dạng Cây phân cấp (Hierarchical Tree):
```
[DỰ ÁN] (1) ───< (N) [GÓI THẦU / ĐẤU THẦU] (1) ─── (1) [HỢP ĐỒNG] (1) ───< (N) [PHỤ LỤC GIA HẠN]
```

---

## 2. CÁC TÍNH NĂNG NGHIỆP VỤ NỔI BẬT

### 2.1. Quản lý Dự án Đầu tư (Projects)
- Quản lý mã dự án (Unique), tên dự án, số ngày QĐ phê duyệt dự án.
- Tích hợp 2 phương thức lưu hồ sơ: **Dán link Google Drive** và **Tải tệp PDF/Word trực tiếp lên máy chủ**.
- Xem trước tài liệu PDF trực tiếp trên giao diện (Inline PDF Viewer) không cần mở tab mới.

### 2.2. Quản lý Đấu thầu (Bidding Packages)
- Quản lý thông tin KHLCNT, HSMT, thời điểm đóng/mở thầu (ngày + giờ chính xác).
- **Cơ chế cảnh báo đóng thầu:**
  - Khi `(bid_close_time - now) <= 6 tiếng` và chưa đóng thầu: Hiển thị Huy hiệu ĐỎ rực nhấp nháy: `⚠️ SẮP ĐẾN HẠN ĐÓNG THẦU (Còn X giờ Y phút)`.
- Hỗ trợ các nghiệp vụ ngoại lệ:
  - **Gia hạn thời điểm đóng thầu:** Lưu vết thời điểm đóng thầu gốc và lý do gia hạn.
  - **Hủy thầu / Tổ chức đấu thầu lại:** Lưu biên bản và căn cứ pháp lý.
- **Workflow chuyển tiếp sang Hợp đồng:**
  - Khi có Quyết định KQLCNT: Hiển thị nút bấm nổi bật **"Chuyển sang Quản lý Hợp đồng"**.
  - Nhập thông tin nhà thầu trúng thầu, giá trúng thầu, loại hợp đồng, thời hạn bảo lãnh.
  - **Bảo toàn 100% dữ liệu gốc** tại phân hệ Đấu thầu (không bị xóa hay ẩn khỏi bảng đấu thầu).

### 2.3. Quản lý Hợp đồng & Phụ lục Gia Hạn (Contracts & Addendums)
- **Tự động tính Tỷ lệ tiết kiệm:**
  $$\text{Tỷ lệ tiết kiệm (\%)} = \frac{\text{Giá gói thầu} - \text{Giá trúng thầu}}{\text{Giá gói thầu}} \times 100$$
  - Tự động cảnh báo đỏ nếu Giá hợp đồng > Giá gói thầu (vượt dự toán).
- **Tính toán Thời hạn hiệu lực hợp đồng động:**
  - Nếu có Phụ lục: `Current_End_Date` = `new_end_date` của Phụ lục ký gần nhất.
  - Nếu không có: Lấy `original_end_date`.
- **Đếm lùi tiến độ và phân loại cảnh báo màu sắc:**
  - `> 30 ngày`: Xanh lá (Bình thường).
  - `16 - 30 ngày`: Vàng (Cần chú ý).
  - `0 - 15 ngày`: **Đỏ nhấp nháy khẩn cấp** `⚠️ CẦN LÀM THỦ TỤC GIA HẠN HỢP ĐỒNG (Còn X ngày)`.
  - `< 0 ngày`: Tím đậm `ĐÃ QUÁ HẠN HỢP ĐỒNG (Quá X ngày)`.
- **Giám sát Bảo lãnh thực hiện hợp đồng:** Cảnh báo trước 30 ngày trước khi thư bảo lãnh ngân hàng hết hiệu lực.
- **Thêm Phụ lục gia hạn:** Nhập số PLHĐ, ngày ký, số ngày gia hạn thêm, lý do, bản scan. Khi lưu, **tự động cập nhật ngay `Current_End_Date` và xóa trạng thái cảnh báo đỏ**.
- Xem toàn bộ Lịch sử kiểm toán các lần ban hành phụ lục.

### 2.4. Động cơ Cảnh báo Email & Lập Lịch (Notification Engine)
- Người nhận email cấu hình mặc định: **`khanhpdg68@gmail.com`**.
- Tự động gửi email với template HTML trang trọng của Ban QLDA:
  - **Cảnh báo Đấu thầu:** Gói thầu còn $\le 6$ tiếng đóng thầu.
  - **Cảnh báo Tiến độ:** Hợp đồng còn $\le 15$ ngày hết hạn hiệu lực.
- **Giao diện Kiểm thử Cảnh báo (Alerts Center):** Có nút **"Gửi Thử Nghiệm Email"** và **"Quét Toàn Diện Ngay"** trên giao diện kèm bảng lịch sử lưu vết (Audit Logs).

### 2.5. Xuất Báo Cáo Excel (Export Engine)
- Nút **"Xuất Báo Cáo Excel"** tải về file `.xlsx` chuẩn cột biểu báo cáo hành chính:
  - STT, Mã Dự án, Tên Dự án, Tên Gói thầu, Hình thức LCNT, Nhà thầu trúng thầu, Loại HĐ, Giá gói thầu (VNĐ), Giá hợp đồng (VNĐ), Giá trị sau điều chỉnh (VNĐ), % Tiết kiệm, Ngày ký HĐ, Hạn HĐ gốc, Hạn thực hiện hiện tại, Số ngày còn lại, Hạn bảo lãnh HĐ, Tình trạng tiến độ.

---

## 3. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### 3.1. Cấu hình Biến Môi Trường (`.env`)
Tạo file `.env` (hoặc sao chép từ `.env.example`):
```env
# Cơ sở dữ liệu SQLite cục bộ (Sẵn sàng đổi sang PostgreSQL: postgresql://...)
DATABASE_URL="file:./dev.db"

# Hòm thư nhận cảnh báo chính
ALERT_RECEIVER_EMAIL="khanhpdg68@gmail.com"

# Cấu hình SMTP gửi mail qua Gmail hoặc máy chủ Ban QLDA
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM_NAME="Ban QLDA Đầu tư Xây dựng Công trình Giao thông"

# Cổng khởi chạy
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Lưu ý về SMTP Gmail:** Để gửi email thật qua Gmail, bạn bật **2-Step Verification** trong tài khoản Google, vào mục **App Passwords (Mật khẩu ứng dụng)** để tạo mật khẩu 16 chữ số và dán vào `SMTP_PASS`. Nếu để trống, hệ thống sẽ chạy ở chế độ **Mô phỏng kiểm thử (Simulated Dispatch)** và vẫn ghi đầy đủ nhật ký trong bảng `NotificationLog`.

### 3.2. Cài đặt và Chạy ứng dụng
```bash
# 1. Cài đặt thư viện phụ thuộc
npm install

# 2. Khởi tạo cơ sở dữ liệu và nạp dữ liệu mẫu
npx prisma db push
npx tsx prisma/seed.ts

# 3. Chạy ở môi trường phát triển (Development)
npm run dev

# 4. Hoặc biên dịch & chạy Production
npm run build
npm run start
```
Truy cập trình duyệt: **`http://localhost:3000`**

---

## 4. DANH SÁCH API ENDPOINTS
- `GET /api/projects` - Lấy danh mục dự án & cây gói thầu
- `POST /api/projects` - Tạo dự án mới
- `GET /api/bidding` - Danh sách gói thầu kèm bộ lọc
- `POST /api/bidding` - Tạo gói thầu mới
- `PATCH /api/bidding/:id` - Gia hạn đóng thầu / Hủy thầu / Đấu thầu lại
- `POST /api/bidding/:id/transfer` - Chuyển sang Quản lý Hợp đồng
- `GET /api/contracts` - Danh sách hợp đồng kèm tính toán hạn hiện tại & cảnh báo
- `POST /api/contracts/:id/addendums` - Thêm Phụ lục HĐ gia hạn / điều chỉnh giá
- `POST /api/upload` - Tải tệp PDF, Word, Excel lên máy chủ
- `GET /api/export/excel` - Tải file Excel báo cáo tiến độ chuẩn hành chính
- `POST /api/cron/check-alerts` - Trigger quét cảnh báo 6h đóng thầu & 15 ngày hợp đồng
- `POST /api/cron/test-email` - Gửi email thử nghiệm ngay đến `khanhpdg68@gmail.com`
- `GET /api/cron/logs` - Lấy lịch sử gửi thông báo
