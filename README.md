# CineHub

Website đặt vé xem phim viết bằng **HTML/CSS/JavaScript thuần**, tập trung vào trải nghiệm đặt vé nhanh, quản lý suất chiếu và quản trị nội dung ngay trên trình duyệt bằng `localStorage`.

## Mục tiêu dự án

- Mô phỏng quy trình đặt vé rạp phim thực tế.
- Cung cấp luồng người dùng đầy đủ: đăng ký/đăng nhập, chọn phim, chọn suất, chọn ghế, thanh toán QR giả lập, xem/hủy vé.
- Hỗ trợ vai trò **admin** để quản lý phim, lịch chiếu và yêu cầu hỗ trợ khách hàng.

## Tính năng chính

### 1) Người dùng

- Đăng ký/đăng nhập tài khoản.
- Xem danh sách phim, lọc theo thể loại, tìm kiếm theo tên.
- Xem chi tiết phim (poster, banner, trailer, mô tả, suất chiếu gần nhất).
- Chọn suất chiếu theo ngày.
- Chọn ghế theo sơ đồ rạp, khóa ghế đã đặt.
- Đặt vé + chọn combo tại bước thanh toán.
- Thanh toán QR giả lập (VietQR URL), lưu trạng thái thanh toán.
- Quản lý vé đã đặt:
  - Xem danh sách vé.
  - Xem mã QR vé/đơn combo.
  - Hủy vé (tự động giải phóng ghế).
- Đặt combo riêng (không kèm vé) và nhận mã đơn combo.
- Quản lý hồ sơ cá nhân, đổi mật khẩu.
- Gửi yêu cầu hỗ trợ và theo dõi trạng thái xử lý.
- Chuyển đổi giao diện sáng/tối.

### 2) Quản trị (Admin)

- Đăng nhập admin để vào trang quản trị.
- Quản lý phim:
  - Thêm/sửa/xóa phim.
  - Upload poster/banner bằng kéo-thả hoặc chọn file.
- Quản lý lịch chiếu:
  - Thêm/sửa/xóa suất chiếu.
- Xem toàn bộ vé đã đặt.
- Quản lý yêu cầu hỗ trợ:
  - Xem chi tiết.
  - Đánh dấu “Đã xử lý” hoặc “Đã hủy bỏ”.

## Tài khoản admin demo

- Email: `admin@cinehub.local`
- Mật khẩu: `admin123`

> Tài khoản này được đảm bảo tồn tại khi hệ thống khởi tạo dữ liệu.

## Công nghệ sử dụng

- HTML5
- CSS3
- JavaScript (ES6+, không dùng framework)
- Bootstrap 5 + Bootstrap Icons
- Google Fonts
- `localStorage` (lưu dữ liệu phiên và dữ liệu vận hành)
- JSON tĩnh làm dữ liệu gốc (`Data/*.json`)

## Cấu trúc thư mục

```text
CineHub/
├── index.html                # Redirect vào trang Home
├── Html/                     # Các trang giao diện
│   ├── Home.html
│   ├── Movies.html
│   ├── MovieDetail.html
│   ├── Showtime.html
│   ├── SeatSelection.html
│   ├── Booking.html
│   ├── Combos.html
│   ├── Tickets.html
│   ├── Support.html
│   ├── Profile.html
│   ├── Auth.html
│   └── Admin.html
├── Js/
│   ├── Storage.js            # Dữ liệu, auth, localStorage, helper nghiệp vụ
│   ├── Main.js               # Header/footer, theme, trang chủ, helper UI chung
│   ├── Auth.js
│   ├── Movies.js
│   ├── MovieDetail.js
│   ├── Showtime.js
│   ├── SeatSelection.js
│   ├── Booking.js
│   ├── Combos.js
│   ├── Tickets.js
│   ├── Support.js
│   ├── Profile.js
│   └── Admin.js
├── Css/
│   ├── Style.css
│   └── Admin.css
├── Data/
│   ├── Movies.json
│   ├── Showtimes.json
│   └── Combos.json
└── Assets/                   # Hình ảnh, logo, banner, poster...
```

## Cách chạy dự án

> **Quan trọng:** cần chạy bằng local server (không mở trực tiếp file HTML bằng `file://`) vì dự án dùng `fetch()` để đọc JSON.

### Cách 1: Dùng VS Code Live Server

1. Mở thư mục dự án bằng VS Code.
2. Cài extension **Live Server** (nếu chưa có).
3. Chuột phải `index.html` → **Open with Live Server**.

### Cách 2: Dùng Python

```bash
cd /path/to/CineHub
python -m http.server 5500
```

Sau đó truy cập: `http://localhost:5500`

## Luồng sử dụng nhanh

1. Vào **Trang chủ** → chọn phim.
2. Xem **Chi tiết phim** hoặc vào **Lịch chiếu**.
3. Chọn suất chiếu → chọn ghế.
4. Sang bước **Thanh toán**:
   - nhập thông tin khách hàng,
   - thêm combo (nếu muốn),
   - xác nhận đã thanh toán QR.
5. Hoàn tất và xem vé tại **Vé đã đặt**.

## Dữ liệu và lưu trữ

- Lần chạy đầu: dữ liệu phim/lịch chiếu/combo được nạp từ `Data/*.json`.
- Sau đó dữ liệu vận hành được lưu trong `localStorage` với các key chính:
  - `cinehub_movies`
  - `cinehub_showtimes`
  - `cinehub_combos`
  - `cinehub_bookings`
  - `cinehub_combo_orders`
  - `cinehub_support_requests`
  - `cinehub_booked_seats`
  - `cinehub_users`
  - `cinehub_current_user`
  - `cinehub_theme`

## Lưu ý khi phát triển

- Đây là dự án frontend mô phỏng, **không có backend thực**.
- Dữ liệu auth/password đang lưu client-side, chỉ phù hợp mục đích học tập/demo.
- Nếu muốn reset hệ thống về trạng thái ban đầu: xóa dữ liệu `localStorage` của trình duyệt.

## Hướng mở rộng

- Tách API backend + cơ sở dữ liệu thực.
- JWT/session server-side cho xác thực an toàn hơn.
- Tích hợp cổng thanh toán thật.
- Bổ sung phân quyền chi tiết và nhật ký thao tác admin.
- Viết test tự động (unit/e2e) cho các luồng chính.

