# Backend tủ truyện, lịch sử và tài khoản — B5

Cập nhật 10/10/2026. B5 đã nối luồng chính vào PostgreSQL; kiểm tra cơ bản theo yêu cầu ưu tiên tốc độ, chưa nghiệm thu production/browser đầy đủ.

## Tủ truyện và lịch sử đọc

- Khách chưa đăng nhập tiếp tục lưu tối đa 200 mục trong localStorage của đúng browser/origin.
- Người đã đăng nhập đọc/ghi Bookmark và ReadingHistory theo userId trong PostgreSQL. Không fallback âm thầm sang dữ liệu khách khi API tài khoản lỗi; giao diện báo lỗi và chờ thử lại.
- Nút Lưu vào tủ gọi API tài khoản. Tủ truyện và Lịch sử lấy đúng truyện công khai, không trả truyện nháp/ẩn/xóa/hết quyền.
- Reader khôi phục chap và tỷ lệ cuộn theo tài khoản. Tiến độ được giới hạn 0–1, chap phải đang có publication, đồng bộ tối đa khoảng mỗi 5 giây và khi ẩn/rời trang. Local vẫn được giữ trên thiết bị để người dùng có thể chủ động nhập.
- Xóa một mục hoặc Xóa tất cả chỉ tác động dữ liệu của tài khoản hiện tại (hoặc browser khi là khách), không xóa truyện.
- Tủ/lịch sử của user khác không thể đọc/xóa qua API vì userId luôn lấy từ session HttpOnly, không nhận từ payload.

## Nhập dữ liệu khách

Không tự nhập khi login. Tại /cai-dat, người dùng bấm **Nhập tủ truyện và lịch sử khách** rồi xác nhận.

- Tối đa 200 bookmark và 200 lịch sử; server kiểm tra ID, chap và trạng thái công khai.
- Bookmark được gộp idempotent.
- Lịch sử khách chỉ thay dữ liệu tài khoản nếu có số chap cao hơn, hoặc cùng chap nhưng tỷ lệ đọc cao hơn. Timestamp client không quyết định để tránh thời gian giả/đồng hồ sai.
- Truyện/chap không còn công khai bị bỏ qua.
- Chỉ sau khi server trả thành công, dữ liệu khách trên browser hiện tại mới được xóa. Nếu request lỗi thì dữ liệu local được giữ nguyên.
- Localhost và ngrok là hai origin khác nhau nên mỗi nơi có localStorage riêng; muốn nhập dữ liệu ngrok phải bấm nút khi đang mở đúng origin ngrok.

## Tài khoản

Tại /cai-dat:

- Đổi tên hiển thị 2–80 ký tự; email và role không sửa qua API hồ sơ.
- Đổi mật khẩu yêu cầu mật khẩu hiện tại và mật khẩu mới 12–128 ký tự. Scrypt/giới hạn tác vụ hash và rate limit được tái sử dụng từ B2.
- Mặc định thu hồi các phiên khác sau đổi mật khẩu; phiên hiện tại được giữ.
- Xem tối đa 10 phiên còn hạn, biết phiên hiện tại, ngày tạo/hết hạn và thu hồi từng phiên.
- Thu hồi phiên hiện tại xóa cookie; đăng xuất tất cả vẫn có sẵn.
- Chưa lưu user-agent/IP/tên thiết bị, chưa xác minh email, quên mật khẩu/MFA/OAuth. Giao diện nói rõ giới hạn này.

## API

| Route | Chức năng |
| --- | --- |
| GET/DELETE /api/library | Đọc tủ+lịch sử / xóa tất cả theo kind |
| PUT/DELETE /api/library/bookmarks/:storyId | Lưu/bỏ truyện |
| PUT/DELETE /api/library/history/:storyId | Ghi/xóa tiến độ |
| POST /api/library/import | Gộp dữ liệu khách đã xác nhận |
| PATCH /api/auth/profile | Đổi tên |
| POST /api/auth/password | Đổi mật khẩu, tùy chọn thu hồi phiên khác |
| GET /api/auth/sessions | Danh sách phiên của chính tài khoản |
| DELETE /api/auth/sessions/:id | Thu hồi một phiên thuộc chính tài khoản |

Tất cả thao tác ghi kiểm tra Origin, session/status hiện tại, giới hạn JSON và rate limit. Không nhận userId từ client. API trả no-store và lỗi công khai an toàn.

## Kiểm tra hiện tại

- Không cần migration B5: Bookmark, ReadingHistory và Session đã có constraint/FK/index từ migration nền tảng.
- TypeScript, ESLint phần B5, check:structure và diff check pass.
- Smoke PostgreSQL trong schema random pass: hai user tách biệt dữ liệu; chap chưa xuất bản bị chặn; import không ghi lùi tiến độ; xóa của user khác không ảnh hưởng; đổi tên/mật khẩu; nhận diện phiên hiện tại; không thu hồi session user khác; thu hồi các phiên khác sau đổi mật khẩu.
- Runner đã dọn schema test riêng, không thay DB/tài khoản thật.
- Chưa chạy full suite/build, HTTP server/browser, Safari/ngrok và kiểm thử cạnh tranh/tải dài. Chưa có thông tin thiết bị, reset email/MFA; các phần này cần hoàn thiện trước production.
