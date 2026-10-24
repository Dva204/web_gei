# Backend B7 — chat

## Phạm vi đã triển khai

- Phòng chat, tin nhắn và báo cáo lưu PostgreSQL; migration tạo hai phòng `Trò chuyện chung` và `Hỏi Admin`, không tạo tin nhắn/user mẫu.
- Khách được đọc phòng công khai. Chỉ tài khoản đang hoạt động mới gửi hoặc báo cáo tin nhắn.
- Tin nhắn tối đa 300 ký tự, hỗ trợ reply ở data layer, ghim và xóa mềm. Tin đã gỡ vẫn giữ vị trí nhưng không trả nội dung cũ.
- Slow mode được kiểm tra trong transaction có khóa theo user để hạn chế gửi đồng thời vượt giới hạn.
- Giao diện cập nhật qua HTTP polling 3 giây, không còn tự sinh tin nhắn/online giả. Số online hiện là số tài khoản đã gửi tin trong 5 phút gần nhất, không phải kết nối realtime chính xác.
- `/admin/chat` đọc hàng đợi báo cáo thật. Mod/admin phải nhập lý do, có thể xác nhận, gỡ hoặc ghim tin; thay đổi và audit cùng transaction.

## API

- `GET /api/chat/rooms`
- `GET|POST /api/chat/rooms/:roomId/messages`
- `POST /api/chat/messages/:id/report`
- `GET /api/admin/chat/reports`
- `PATCH /api/admin/chat/reports/:id`

Các API ghi kiểm tra origin, session, JSON giới hạn, rate limit và quyền server. Không tin role/userId từ client.

## Migration và giới hạn

Migration `20261010000200_chat` thêm `ChatRoom`, `ChatMessage`, `ChatReport`, FK/index/CHECK và hai phòng mặc định. Chạy bằng `npm run db:deploy`; không reset database.

Polling phù hợp giai đoạn hiện tại và chạy qua ngrok mà không cần dịch vụ mới. Trước production cần cân nhắc SSE/WebSocket hoặc dịch vụ realtime, presence/session heartbeat, chống flood đa tài khoản/IP, từ khóa/link moderation, quản trị cấu hình phòng, retention và smoke tải đồng thời.
