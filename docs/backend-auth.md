# B2 — Đăng nhập và phân quyền

Auth người đọc và admin đã dùng PostgreSQL thật. Các module truyện/chap/ảnh/quảng cáo/bình luận vẫn là FE mẫu, chuyển riêng ở B3–B8. Không dùng tài khoản mẫu, OTP `123456`, Google giả lập hoặc role trong localStorage để đăng nhập.

## Chạy lần đầu

Làm theo [backend-setup.md](backend-setup.md), chạy `npm run db:generate` và `npm run db:deploy` (hiện có 3 migration). Không reset DB.

Người đọc đăng ký ở `/dang-ky`: chỉ tạo `member`, không nhận role/status từ client. Đăng nhập ở `/dang-nhap`; tài khoản và đăng xuất một/tất cả thiết bị nằm ở `/cai-dat`.

### Tạo admin đầu tiên

CLI chỉ tạo admin khi DB **chưa có admin nào** và email chưa thuộc tài khoản khác. Không nâng quyền tài khoản member có sẵn. Không tự tạo tài khoản khi seed hoặc chạy server. Chọn email riêng và mật khẩu từ 12–128 ký tự; không nhập mật khẩu trực tiếp vào lệnh/history hoặc commit vào env.

PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = Read-Host 'Email admin mới'
$env:BOOTSTRAP_ADMIN_NAME = Read-Host 'Tên hiển thị'
$bootstrapSecret = Read-Host 'Mật khẩu riêng (ít nhất 12 ký tự)' -AsSecureString
try {
  $env:BOOTSTRAP_ADMIN_PASSWORD = ([System.Net.NetworkCredential]::new('', $bootstrapSecret)).Password
  npm run auth:bootstrap
} finally {
  Remove-Item Env:\BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:\BOOTSTRAP_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:\BOOTSTRAP_ADMIN_NAME -ErrorAction SilentlyContinue
  $bootstrapSecret = $null
}
```

Sau đó mở `/admin/dang-nhap`. Biến môi trường chỉ dùng lúc bootstrap; CLI không in credentials. Mật khẩu vẫn tạm nằm trong bộ nhớ/environment của tiến trình nên chỉ chạy trên máy tin cậy. Chưa có giao diện cấp role/phân công thật; sẽ bổ sung cùng nghiệp vụ. Không sửa role trên browser để thử quyền.

## Safari/ngrok: hai cấu hình khác nhau

Trong `.env.local`, thay bằng **tunnel thật** của bạn:

```dotenv
DEV_ALLOWED_ORIGINS="your-tunnel.ngrok-free.app"
AUTH_TRUSTED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,https://your-tunnel.ngrok-free.app"
```

- `DEV_ALLOWED_ORIGINS`: hostname, cho phép tài nguyên Next dev/hydration; ảnh hưởng các nút React.
- `AUTH_TRUSTED_ORIGINS`: origin đầy đủ, gồm `https://`, không có dấu `/` cuối; cho phép các request ghi auth. Không wildcard, không tin Host/X-Forwarded-Host từ request.
- Khởi động lại `npm run dev` sau thay đổi; khi đổi tunnel cũng cập nhật origin. Production phải khai báo origin, không cấu hình sẽ từ chối request ghi.
- Ngrok public phải dùng HTTPS. Cookie host-only nên đăng nhập localhost không đăng nhập ngrok và ngược lại; cookie không được JavaScript đọc.
- Chưa kiểm thử trực tiếp trên iPhone/Safari thật trong mốc này; HTTP production đã kiểm tra cookie, CSRF và session.

## Thiết kế bảo mật

Chọn triển khai giới hạn bằng **Node.js `crypto` + session opaque lưu Prisma/PostgreSQL**, chưa thêm framework auth/OAuth. Phù hợp schema tokenHash/thu hồi phiên đã có; không JWT tự chứa role. Cần rà soát production ở B9, không xem đây là auth đa nhà cung cấp hoàn chỉnh.

- Mật khẩu dùng scrypt N=32768, r=8, p=3, salt ngẫu nhiên 16 byte, kết quả 64 byte; so sánh `timingSafeEqual`, không trim mật khẩu. Đây là một cấu hình được liệt kê trong [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); API dùng [Node crypto](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Hai tác vụ hash tối đa mỗi process; khi bận trả 503.
- Token ngẫu nhiên 32 byte; DB chỉ giữ SHA-256 digest. Phiên tối đa 7 ngày, không tự gia hạn; tối đa 10 phiên/user, tuần tự bằng khóa row khi cấp/thu hồi tất cả. Đăng nhập xoay token và thu hồi cookie cũ.
- Cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, không Domain; HTTPS dev bật Secure, production luôn Secure và tên `__Host-vuon-session`. Không dùng cookie production qua HTTP public.
- Mỗi request đọc lại role/status hiện tại từ DB; phiên hết hạn/thu hồi hoặc user bị khóa không còn hiệu lực. 24 trang admin kiểm tra quyền trước đọc dữ liệu; layout/ẩn nút chỉ phục vụ giao diện.
- Quyền `member/admin/mod/editor/author/beta` tập trung tại `shared/lib/auth/permissions.ts`. Author/beta cần StoryAssignment thật cho tài nguyên truyện; beta không sửa/xuất bản. Danh sách nghiệp vụ về sau phải lọc phân công tại repository, không chỉ cho phép vào trang.
- API ghi yêu cầu Origin trong allowlist và từ chối Sec-Fetch-Site=cross-site. JSON tối đa 4 KiB kể cả stream; đăng ký/login từ chối trường thừa, không nhận role/status.
- Bộ đếm PostgreSQL nguyên tử, cửa sổ 15 phút: đăng nhập 5/email và 200 tổng; đăng ký 3/email và 30 tổng; xử lý trạng thái 40/actor. Tính cả lần thành công, trả 429 + Retry-After=900 khi vượt. Không suy IP từ header proxy tùy ý. Giới hạn tổng có thể làm người dùng hợp lệ phải chờ; production cần rate limit tầng edge/IP tin cậy và theo dõi tải tại B9.
- Mod chỉ đình chỉ/kích hoạt member, không vô hiệu hóa vĩnh viễn hoặc xử lý staff. Admin có thể xử lý staff; không tự khóa và không khóa admin hoạt động cuối. Khóa user thu hồi phiên và ghi audit trong cùng transaction.

## API hiện có

Tất cả dùng `{ data, requestId }` hoặc `{ error: { code, message }, requestId }`, no-store; không trả passwordHash/tokenHash/raw error. Token mới chỉ gửi bằng Set-Cookie.

| Endpoint | Chức năng |
| --- | --- |
| POST `/api/auth/register` | Tạo member + session; name/email/password |
| POST `/api/auth/login` | Email/password; audience=admin chỉ là ý định đăng nhập, không cấp quyền |
| GET `/api/auth/me` | User DTO hoặc null |
| POST `/api/auth/logout` | Thu hồi cookie hiện tại, idempotent |
| POST `/api/auth/logout-all` | Thu hồi phiên của chính user đã đăng nhập |
| GET `/api/admin/session` | Yêu cầu session và quyền dashboard.view; 401/403 |
| PATCH `/api/admin/users/[id]/status` | status và reason 8–500 ký tự; quyền users.sanction |

Trang quản lý người dùng vẫn là mock, **chưa nối** API trạng thái ở B2; không gửi id mock tới DB. Google, email xác minh/reset mật khẩu, MFA và cấp role/phân công chưa hoạt động; UI không báo thành công giả.

## Dọn dữ liệu và kiểm thử

`npm run auth:cleanup` chỉ xóa Session/AuthRateLimit đã hết hạn trong DB cấu hình; giữ tài khoản/audit và phiên còn hạn. Chưa tạo cron tự động; lên lịch ở B9 sau khi chọn hạ tầng. Phiên hết hạn đã bị từ chối dù chưa cleanup.

Thiết lập TEST_DATABASE_URL riêng theo hướng dẫn DB, rồi chạy:

```powershell
npm test
npm run test:db
npm run test:auth
npm run build
npm run test:auth:http
```

Hai runner auth chỉ dùng DB kết thúc `_test`, khác DB ứng dụng; mỗi lần tạo/dọn đúng schema random. HTTP smoke chạy bản build trên cổng tạm localhost, dừng process do nó tạo. Unit test bình thường bỏ qua DB integration; không tính những test bị skip là đã chạy.

## Chưa đủ điều kiện production

Ngoài các chức năng backend còn lại, cần kiểm thử Safari thật, dịch vụ email/MFA, rate limit edge và rà bảo mật tại B9. `npm audit --omit=dev` ngày 04/10/2026 còn 4 mục high trong cây Prisma config (hai advisory gốc deepmerge-ts/effect và hai mục phụ thuộc). Chưa áp dụng `audit fix --force` vì đề xuất downgrade Prisma. Cần xử lý/đánh giá dependency trước deploy production; build/test pass không loại bỏ các cảnh báo này.
