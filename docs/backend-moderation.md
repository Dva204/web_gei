# Backend B6 — bình luận và kiểm duyệt

## Phạm vi đã nối PostgreSQL

- Bình luận cần đăng nhập, mặc định `pending`; người gửi vẫn thấy bình luận của mình trong lúc chờ duyệt.
- Like và báo cáo bình luận cần đăng nhập. Mỗi tài khoản chỉ báo cáo một bình luận một lần; từ 3 báo cáo, bình luận tự quay lại hàng chờ.
- Báo lỗi chap chỉ nhận truyện/chap đang xuất bản.
- Form yêu cầu gỡ công khai lưu hạn xử lý 7 ngày, tối đa 5 URL và tự liên kết truyện khi nhận diện được slug.
- Admin/mod xử lý ba hàng đợi tại `/admin/binh-luan`, `/admin/bao-loi`, `/admin/yeu-cau-go`. Mọi thay đổi cần lý do, kiểm tra quyền trên server, chạy transaction và ghi `AuditLog`.
- Xóa bình luận là xóa mềm bằng trạng thái `deleted`. Gỡ tạm theo yêu cầu đổi truyện sang `hidden`, không xóa truyện/chap/ảnh.

## API

- `GET|POST /api/comments`
- `POST /api/comments/:id/like`
- `POST /api/comments/:id/report`
- `POST /api/reports/chapters`
- `POST /api/takedowns`
- `GET /api/admin/moderation/:kind`
- `PATCH /api/admin/moderation/:kind/:id`

Các API ghi từ trình duyệt kiểm tra origin, session khi cần, JSON giới hạn và rate limit PostgreSQL. API quản trị không nhận role/userId từ payload.

## Migration và vận hành

Migration `20261010000100_moderation` thêm `Comment`, `CommentLike`, `CommentReport`, `ChapterReport`, `TakedownRequest`, `TakedownEvent` cùng FK/index/CHECK. Chạy bằng `npm run db:deploy`; không dùng `migrate reset` hoặc `db push`.

Mốc này mới kiểm tra TypeScript, ESLint phần thay đổi, cấu trúc và trạng thái migration. Trước production cần smoke/integration riêng cho quyền mod/editor, transaction, cạnh tranh like/report; browser/Safari/ngrok; email thông báo và chính sách SLA/yêu cầu pháp lý thực tế.
