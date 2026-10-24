# Chạy nền tảng backend

Tiến độ: [backend-plan.md](backend-plan.md). Hướng dẫn này dùng PostgreSQL local cho development. Auth đã dùng DB thật ([backend-auth.md](backend-auth.md)); các module nghiệp vụ FE vẫn dùng demo. Migration không tự nhập dữ liệu localStorage/IndexedDB vào DB.

## Database mới, trống

1. Mở Docker Desktop và chờ Linux engine sẵn sàng.
2. Tạo `.env` dựa trên `.env.example` nếu chưa có. Không ghi đè `.env` hiện tại. DATABASE_URL phải khớp user/password/database của PostgreSQL.
3. Chạy từng lệnh từ thư mục repo:

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:preflight
npm run db:deploy
npm run db:status
npm run db:check
```

`db:deploy` chỉ áp dụng migration có version, không reset DB. `db:migrate` dành cho tạo migration mới trên DB development, **không đồng ý reset nếu Prisma phát hiện drift**. Migration foundation dùng transaction để rollback toàn bộ khi constraint/khóa ngoại không hợp lệ.

Docker chỉ bind PostgreSQL vào `127.0.0.1:5432`. Mật khẩu trong ví dụ chỉ dành cho local dev. Nếu volume đã được khởi tạo, đổi POSTGRES_PASSWORD trong env **không tự đổi mật khẩu bên trong PostgreSQL**; phải đổi có kiểm soát, không xóa volume để sửa.

## Database đã có bảng/dữ liệu

Không chạy blind deploy hoặc resolve trên DB chưa kiểm tra.

- Backup trước; đối chiếu schema hiện tại với `prisma/migrations/20261004000100_baseline/migration.sql`.
- Chỉ khi schema thực sự tương đương baseline và chưa có lịch sử migration, đánh dấu migration đầu đã áp dụng bằng `prisma migrate resolve --applied 20261004000100_baseline`. Lệnh này **không** chứng minh schema đúng hoặc chạy SQL.
- Kiểm tra dữ liệu mồ côi trong Bookmark/ReadingHistory/AuditLog và giá trị vi phạm constraint. Nếu đang có userId cũ nhưng chưa có bảng User, cần migration chuyển đổi với mapping danh tính được xác nhận **trước khi áp dụng foundation**. Không tự tạo user admin hoặc xóa các hàng đó.
- Nếu schema lệch hoặc dữ liệu không đáp ứng constraint, dừng để viết migration chuyển đổi riêng. Không dùng reset, force-reset hoặc sửa migration đã áp dụng.
- Sau khi baseline và chuyển đổi được xác nhận mới chạy `db:deploy`, `db:status`, `db:check`.

## Seed mẫu (tùy chọn)

```powershell
$env:ALLOW_DEVELOPMENT_SEED = 'true'
npm run db:seed
$env:ALLOW_DEVELOPMENT_SEED = 'false'
```

Seed chỉ chạy ở dev trên host local, tạo 3 thể loại trong một transaction; chạy lại không thay tên đã sửa. Không tạo tài khoản, không cấp quyền admin, không tự đăng truyện. Nếu slug/name xung đột dữ liệu có sẵn, transaction bị hủy và dữ liệu cũ giữ nguyên.

## Integration test PostgreSQL

Tạo database **riêng** một lần (ví dụ khi dùng Docker bên trên):

```powershell
docker compose exec postgres psql -U vuon -d postgres -c "CREATE DATABASE vuon_ngon_tinh_test;"
```

Thiết lập TEST_DATABASE_URL trong env local hoặc phiên PowerShell; ví dụ mật khẩu dev:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://vuon:vuon_dev_password@localhost:5432/vuon_ngon_tinh_test?schema=public'
npm run db:generate
npm run test:db
```

Runner từ chối DB không kết thúc `_test` và DB trùng host/port/tên với ứng dụng. Mỗi lần tạo schema random riêng `backend_test_<24 hex>`, deploy toàn bộ migration có version, kiểm tra dữ liệu thật rồi dọn **đúng schema do lần chạy tạo** trong finally. Không drop/reset database hoặc schema public. Nếu bị kill cưỡng bức, schema test có thể còn lại; chỉ dọn thủ công sau khi xác định chính xác nó. Người chạy cần quyền tạo schema trong DB test.

Kiểm tra: deploy migration, seed chạy lại/giữ taxonomy đã sửa, defaults an toàn, unique/FK, số chap/dimensions/progress hợp lệ, transaction rollback, snapshot public không đổi khi sửa nháp, cascade dữ liệu riêng và giữ audit/publication. Tổng 16 kiểm tra B1 đã chạy lại thành công trên PostgreSQL sau B2. Auth có runner riêng `npm run test:auth` và `npm run test:auth:http`; CRUD/upload còn ở B3–B4.

## API hiện có

`GET /api/health/db` trả contract mới:

```json
{ "data": { "status": "ok", "database": "postgresql", "latencyMs": 5 }, "requestId": "..." }
```

Lỗi: `{ "error": { "code": "SERVICE_UNAVAILABLE", "message": "..." }, "requestId": "..." }` với status 503. Mọi response helper có `Cache-Control: no-store` và `X-Request-ID`. Lỗi bất ngờ trả 500 chung; không trả SQL, stack hoặc connection string ngay cả ở development/ngrok. Health chỉ kiểm tra kết nối, **không** đảm bảo migration/auth sẵn sàng; dùng CLI `db:check` và `db:status` cho việc đó.

## Ranh giới dữ liệu

- ChapterPage: ảnh đang chỉnh sửa; revision để chuẩn bị optimistic concurrency.
- ChapterVersion.pageManifest: snapshot lịch sử bản nháp.
- ChapterPublication: snapshot đã xuất bản, một bản hiện hành/chap; cập nhật chỉ qua nghiệp vụ xuất bản khi B4 hoàn tất.
- User/Session đã dùng cho đăng nhập thật; StoryAssignment cưỡng chế quyền author/beta theo truyện. AuthRateLimit lưu bộ đếm nguyên tử, dọn bản ghi hết hạn bằng `npm run auth:cleanup`. Xem hướng dẫn bootstrap/origin/test tại [backend-auth.md](backend-auth.md).
- CHECK constraint viết tay trong SQL không biểu diễn đầy đủ trong Prisma schema; khi tạo migration tiếp theo phải giữ chúng và chạy integration tests, không dùng db push thay lịch sử migration.
