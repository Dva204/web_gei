# Backend B9 — vận hành cơ bản

Mốc này đưa các cấu hình vận hành chính ra khỏi mock/localStorage và lưu vào PostgreSQL. Đây là nền tảng quản trị, **không phải tuyên bố hệ thống đã sẵn sàng production**.

## Đã triển khai

- `SiteConfiguration`: snapshot cấu hình website có `revision`, khóa cập nhật đồng thời và audit. Công tắc quảng cáo đồng bộ sang snapshot quảng cáo máy chủ.
- `ContentEntry`: quản lý nội dung trang theo khóa ổn định, tiêu đề, nội dung, trạng thái và revision. Nội dung bật có thể đọc qua `GET /api/content/:key`.
- `SeoRedirect`: quản lý đường dẫn cũ/mới nội bộ, 301/302, trạng thái, revision và bộ đếm dành cho bước runtime sau.
- `PageView`: ghi tối đa một lượt cho cùng browser/path trong mỗi giờ; chỉ tăng `Story.views` khi truyện còn công khai. Mã browser được băm SHA-256, không lưu IP hoặc raw user-agent.
- Thống kê 7/30/90 ngày từ `PageView`, số browser riêng và top truyện; `avgReadMinutes` trả `0` thay vì bịa số khi chưa có telemetry thời lượng.
- Dashboard lấy lượt xem, hàng đợi kiểm duyệt, tiến độ truyện, quyền thiếu/hết hạn trực tiếp từ PostgreSQL; không còn mảng truyện và tỷ lệ cố định.
- `src/proxy.ts` áp redirect 301/302 trước khi render, giữ query string, cache rule 60 giây theo process và tăng hit count nền. Matcher bỏ qua API/admin/tài nguyên Next; lỗi DB cho request đi tiếp thay vì làm sập trang.
- Nhật ký quản trị đọc PostgreSQL có phân trang. Admin xem toàn bộ; mod chỉ xem thao tác của mình theo quyền hiện tại.
- Export JSON có quyền `backup.manage`, loại tài khoản, password, session, email người dùng, audit và media binary.
- Danh sách và hồ sơ người dùng đọc PostgreSQL, có tìm kiếm/lọc/phân trang. Admin đổi vai trò; admin/mod xử lý trạng thái theo phạm vi quyền. Khóa hoặc đổi vai trò thu hồi session, bảo vệ tài khoản đang thao tác và admin hoạt động cuối cùng, đồng thời ghi audit.
- CLI backup tạo cùng lúc PostgreSQL custom dump và bản sao kho media, kèm manifest SHA-256. CLI verify kiểm tra toàn bộ checksum và để `pg_restore` đọc thử archive.
- Restore chỉ cho phép diễn tập vào database có hậu tố `_restore` và thư mục `.data/restored-media`; không có đường lệnh ghi đè database/media đang chạy.
- Job runner chạy tuần tự lịch xuất bản chap và dọn auth, có file lock chống chồng lượt trên một máy chủ.

Migration: `20261010000400_operations`. Migration đã deploy vào DB local, tổng cộng 9 migration.

Kiểm tra ngày 17/10/2026: TypeScript, structure 268 module, ESLint và cú pháp các CLI vận hành pass. Backup thật đã tạo và verify thành công: PostgreSQL custom dump 94.021 byte, checksum hợp lệ, `pg_restore --list` đọc được; kho media hiện có 0 tệp. Restore rehearsal vào `vuon_ngon_tinh_codex_restore` có đủ 33 bảng/9 migration và số User/Story/Chapter khớp nguồn. Job runner chạy thành công; lượt kiểm tra có 0 chap đến hạn, dọn 1 session và 2 rate-limit hết hạn.

## API

- `POST /api/analytics/views`
- `GET|PUT /api/admin/operations/settings`
- `GET|POST|PUT /api/admin/operations/content`
- `GET|POST|PUT /api/admin/operations/redirects`
- `GET /api/admin/operations/stats?range=7d|30d|90d`
- `GET /api/admin/operations/audit`
- `GET /api/admin/operations/export`
- `GET /api/content/:key`
- `GET /api/admin/users` và `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status` và `PATCH /api/admin/users/:id/role`

Các API ghi kiểm tra same-origin, session/role, payload, revision và ghi audit trong transaction. Khi dùng ngrok phải thêm origin HTTPS chính xác vào `AUTH_TRUSTED_ORIGINS`.

## Backup, kiểm tra và restore rehearsal

Docker PostgreSQL phải đang chạy. Các lệnh không in `DATABASE_URL` hoặc mật khẩu:

```powershell
npm run ops:backup
npm run ops:backup:verify -- --from .data/backups/<backup-id>
npm run ops:restore:rehearsal -- --from .data/backups/<backup-id> --target-database vuon_ngon_tinh_restore
```

Nếu database rehearsal đã tồn tại, chỉ thêm `--replace` khi thực sự muốn tạo lại chính database `_restore` đó. Restore production không được tự động hóa ở đây: cần cửa sổ bảo trì, backup ngay trước thao tác, xác nhận đích, cấu hình object storage/volume và phương án rollback riêng.

Chạy các tác vụ định kỳ bằng scheduler một instance (ví dụ mỗi phút):

```powershell
npm run ops:jobs
```

Backup mặc định nằm trong `.data/backups` và đã bị Git bỏ qua. Production phải đặt `BACKUP_ROOT` trên volume bền vững ngoài máy ứng dụng, mã hóa và áp retention ở tầng hạ tầng. Không tự xóa backup trong code để tránh mất dữ liệu ngoài ý muốn.

## Giới hạn còn lại trước production

- Cache redirect hiện là best-effort theo từng process Node. Hạ tầng nhiều instance cần invalidation/cache chia sẻ nếu yêu cầu thay đổi có hiệu lực tức thời; hiện có độ trễ tối đa khoảng 60 giây.
- Export JSON là bản xuất nội dung phục vụ di chuyển/đối soát. Nó không thay thế CLI backup PostgreSQL + media, và CLI này vẫn cần volume ngoài máy, mã hóa, retention cùng diễn tập định kỳ.
- Job runner hiện dùng file lock, phù hợp scheduler singleton trên một host. Nhiều instance cần distributed lock/orchestrator. Chưa có health sâu, metrics/alert, log sink, CI/CD, retention analytics hoặc consent banner.
- Chưa đo thời gian đọc/drop-off; chưa thử tải, race, Safari/iPhone/ngrok hoặc full production build ở lượt ưu tiên tốc độ này.
- Chưa đo thời gian đọc/drop-off nên các trường này vẫn để trống hoặc `0`, không sinh số giả.
