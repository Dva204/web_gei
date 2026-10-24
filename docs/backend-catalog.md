# B3 — Danh mục và quản lý truyện

Đã triển khai code và kiểm tra cơ bản ngày 05/10/2026. Chưa nghiệm thu chuyên sâu/production build theo yêu cầu ưu tiên tốc độ code.

## Sử dụng

1. Bật Docker và `docker compose up -d postgres`.
2. Chạy `npm run db:generate`, `npm run db:deploy`, sau đó `npm run dev`.
3. Đăng nhập `/admin/dang-nhap` bằng tài khoản admin đã tạo.
4. Tạo tác giả ở `/admin/tac-gia`, thể loại ở `/admin/the-loai`.
5. Tạo truyện ở `/admin/truyen/moi`: tên/slug, tác giả, thể loại, tóm tắt, quyền sử dụng và SEO. Không còn bản sao truyện mẫu.
6. Lưu bản nháp trước. Trạng thái công khai cần quyền còn hiệu lực; truyện chỉ vào danh mục user sau khi có ít nhất một chap đã xuất bản với snapshot ảnh. Workflow upload/publish đã nối backend B4; xem [backend-chapters.md](backend-chapters.md).

DB ứng dụng không bị reset hoặc nhập mẫu. Nếu trang chủ trống sau chuyển đổi, đó là do chưa có truyện/chap DB đủ điều kiện; không âm thầm fallback về FE mẫu.

## API

Response `{ data, requestId }` hoặc `{ error: { code, message }, requestId }`, cache `no-store`.

| API | Chức năng |
| --- | --- |
| `GET/POST /api/admin/stories` | Danh sách có quyền / tạo truyện |
| `GET/PUT/DELETE/PATCH /api/admin/stories/:id` | Đọc / sửa / xóa mềm / khôi phục về ẩn |
| `GET /api/admin/stories/assignees` | Author/beta đang hoạt động, tối đa 100 kết quả, không lộ email |
| `PUT /api/admin/stories/:id/assignments` | Thay phân công trong transaction, cần quyền stories.assign |
| `GET/POST /api/admin/catalog/authors` | Danh sách / tạo tác giả |
| `GET/POST /api/admin/catalog/genres` | Danh sách / tạo thể loại |
| `PUT/DELETE/PATCH /api/admin/catalog/:kind/:id` | Sửa / xóa mềm / khôi phục danh mục |
| `GET /api/catalog/stories` | Tìm kiếm/lọc/phân trang danh mục công khai |
| `GET /api/catalog/stories/:slug` | Chi tiết truyện đủ điều kiện công khai |
| `GET /api/catalog/stories/:slug/chapters` | Chap có snapshot đã xuất bản |
| `GET /api/catalog/stories/:slug/chapters/:number` | Ảnh snapshot và số chap trước/sau thực tế |
| `GET /api/catalog/genres` | Thể loại chưa xóa |

Pagination: `page`, `pageSize` tối đa 100. Admin stories: `search`, `status`, `visibility`, `genre`, `sort`, `rights=missing`, `deleted=true`. Public stories: `search`, `status`, `genre`, `ending`, `sort=updated/views/rating/new`, `minChapters`, `maxChapters`; số chap tính từ publication, không từ nháp.

Sửa/xóa/khôi phục/phân công cần `revision` nhận từ API. Revision cũ trả 409, không ghi đè. POST/PUT truyện chỉ nhận trường biên tập, không nhận metrics/id/assigneeIds. Phân công có payload `{ revision, assignments: [{ userId, kind: "author" | "beta" }] }`.

Editor/admin quản lý taxonomy và xuất bản metadata. Author tự được phân công khi tạo nháp, chỉ sửa nháp được giao, không tự công khai/xóa/phân công. Beta chỉ đọc truyện được phân công qua API, chưa có màn biên tập beta riêng. Danh mục đang dùng bởi truyện chưa xóa không thể xóa mềm. Slug của mục trong thùng rác vẫn được giữ.

`SITE_URL` là origin canonical cho metadata/sitemap; mặc định localhost. `.env` hiện có không bị ghi đè. Ngrok cần thêm đúng origin HTTPS vào `AUTH_TRUSTED_ORIGINS`, hostname vào `DEV_ALLOWED_ORIGINS`, restart dev. `NEXT_PUBLIC_MEDIA_BASE_URL` localhost được giữ tương đối để iPhone không tải ảnh từ localhost của điện thoại.

## Chưa triển khai / chưa nghiệm thu

- Upload ảnh bìa/chap, editor/import/publication đã nối backend B4 và kho local riêng tư. Object storage/cron tự chạy và nghiệm thu production còn chờ; dữ liệu browser cũ không tự chuyển vào DB.
- Cấp role tài khoản, thư viện/history đồng bộ, ratings/views tracking, thống kê thời gian, quảng cáo và nghiệp vụ khác: các mốc sau.
- Danh sách thư viện/history FE hiện chỉ nhận tối đa 100 truyện public, chưa thay thế query riêng của B5.
- Cần integration CRUD/auth/CSRF/rights/concurrency, test Safari, load reader, build production và rà dependencies trước triển khai thật. Dependency high đã ghi ở B2 chưa được xử lý tại B3.
