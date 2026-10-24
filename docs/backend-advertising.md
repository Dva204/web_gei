# Backend B8 — quảng cáo và affiliate

## Phạm vi đã triển khai

- Cấu hình vị trí, mạng quảng cáo, booking, sản phẩm affiliate và sổ doanh thu nhập tay được lưu trong snapshot PostgreSQL có revision.
- Cấu hình công khai được lược bỏ publisher ID, giá/ghi chú booking nội bộ, doanh thu và audit trước khi trả cho trang đọc.
- Admin lưu cấu hình qua quyền `ads.manage`; server validation toàn bộ snapshot, giới hạn số chiến dịch/sản phẩm/doanh thu, kích thước ảnh và ghi audit trong transaction.
- Revision chặn thiết bị ghi đè cấu hình đã được thay đổi ở nơi khác.
- Hiển thị/click lưu riêng trong `AdvertisingEvent`; có rate limit theo mã trình duyệt đã hash và giới hạn toàn cục. Đây là đo lường nội bộ, không phải số liệu của AdSense/Shopee/TikTok.
- Sản phẩm hỗ trợ link affiliate HTTPS. Server chỉ nhận các miền Shopee/TikTok đã cho phép; click được ghi trước khi mở tab gian hàng.
- `premiumDemo` vẫn là tùy chọn riêng trên trình duyệt, không được lưu thành trạng thái global cho mọi người đọc.

## API

- `GET /api/advertising/config`: cấu hình an toàn cho trang đọc.
- `POST /api/advertising/events`: ghi impression/click nội bộ.
- `GET|PUT /api/admin/advertising/config`: đọc/lưu snapshot đầy đủ cho admin.

## Migration và giới hạn

Migration `20261010000300_advertising` thêm `AdvertisingConfig` và `AdvertisingEvent`. Cấu hình mặc định được khởi tạo idempotent ở lần đọc đầu tiên; không tạo doanh thu hoặc sự kiện mẫu.

Chưa tích hợp script AdSense/native ads, API affiliate, đơn hàng, webhook, đối soát hay thanh toán. Sổ doanh thu vẫn do admin nhập tay và không được suy ra từ click. Trước production cần retention/aggregate sự kiện, consent/privacy, chống gian lận nâng cao, upload ảnh quảng cáo vào object storage và rà chính sách từng nền tảng.
