# Vườn Ngôn Tình

Website đọc truyện tranh tiếng Việt, xây bằng Next.js App Router, TypeScript strict và Tailwind CSS. Auth, danh mục, chap/ảnh, thư viện, kiểm duyệt, chat, quảng cáo và vận hành lõi đã nối backend PostgreSQL + Prisma; media production hỗ trợ Cloudflare R2.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Kiểm tra chất lượng bằng:

```bash
npm run typecheck
npm run check:structure
npm run lint
npm test
npm run check:tokens
npm run check:contrast
npm run build
```

Đặt `NEXT_PUBLIC_ADS_ENABLED=false` để ẩn hoàn toàn khung quảng cáo.

### Backend — kế hoạch và nền tảng

Theo dõi từng mốc đã kiểm thử tại [docs/backend-plan.md](docs/backend-plan.md); cách chạy database/migration/seed/test tại [docs/backend-setup.md](docs/backend-setup.md).

Đã có nền tảng DB, auth user/admin, catalog/CRUD B3, chap/upload/import B4, tủ truyện/lịch sử/tài khoản B5, kiểm duyệt B6, chat B7, quảng cáo/affiliate B8 và lõi vận hành B9. Tài liệu từng phần nằm trong `docs/backend-*.md`, gồm [vận hành B9](docs/backend-operations.md). Không dùng `migrate reset` hay `db push` để thay lịch sử migration.

### Truyện tranh — backend B4

- Admin quản lý ảnh theo **số chap**, không cần tên riêng; hỗ trợ chọn nhiều ảnh, kéo thả, sắp xếp tự nhiên 1/2/10, đổi thứ tự bằng nút trên mobile, bỏ ảnh và xem trước dọc.
- Nhập hàng loạt dùng tên `chap-7_001.jpg`, `chap-7_002.jpg`, `chap-8_001.jpg`; ảnh không có tiền tố gom vào số bắt đầu. Preview lưu DB, có thể bỏ chọn chap; đổi số bằng tên file/số bắt đầu rồi phân tích lại. PNG/JPG/WebP, tối đa 10 MB/ảnh, 100 MB/lần, 600 ảnh/20 chap mỗi lần và 300 ảnh/chap. Không nhập đè số đã tồn tại, không tự xuất bản.
- Ảnh lưu trong `.data/media` riêng tư ở local hoặc bucket R2 private; nháp/version/snapshot trong PostgreSQL. Khi xuất bản, cover và trang chap được copy sang bucket public/CDN. Import có transaction/job idempotent. Sửa nháp không đổi bản đã đăng; xuất bản cần quyền editor/admin và quyền nội dung hợp lệ.
- Trang đọc nhận snapshot trên máy chủ, dùng được trên các thiết bị. Dữ liệu FE/IndexedDB cũ không tự nhập. Kho local phải backup cùng DB; R2 cần chính sách versioning/lifecycle/backup riêng ở hạ tầng.
- Reader có chọn nhanh chap, cài nền/độ rộng và tự ẩn công cụ. Khách lưu tủ/lịch sử trên browser; tài khoản đồng bộ PostgreSQL đa thiết bị. Dữ liệu khách chỉ nhập khi xác nhận tại Cài đặt. Báo lỗi chap vẫn là module demo chờ B6.
- Lịch đăng và đồng bộ CDN chạy một lượt bằng `npm run ops:jobs`; production vẫn cần scheduler singleton. Bình luận/chat, tủ truyện/lịch sử và cấu hình vận hành lõi đã có backend.

### iPhone/Safari truy cập qua ngrok

Next dev chặn nguồn ngoài cho các tài nguyên dev. Nếu trang tải được nhưng nút React không hoạt động, điền hostname ngrok hiện tại vào `.env.local`:

```dotenv
DEV_ALLOWED_ORIGINS="your-tunnel.ngrok-free.app"
AUTH_TRUSTED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000,https://your-tunnel.ngrok-free.app"
```

DEV_ALLOWED_ORIGINS dùng hostname; AUTH_TRUSTED_ORIGINS dùng origin đầy đủ để cho phép đăng nhập/đăng xuất. Thay tunnel thật, khởi động lại `npm run dev`, tải lại Safari. Không mở wildcard. Localhost và ngrok không chia sẻ cookie/IndexedDB/localStorage.

## Quảng cáo / Affiliate

- `/admin/quang-cao`: cấu hình 7 vị trí, bật/tắt mobile & PC, nguồn dự phòng, banner/native, booking theo ngày và ưu tiên, xem trước theo ngày/thiết bị/độ dài chap, mạng ads mẫu và Premium demo.
- `/admin/affiliate`: thêm/sửa/ẩn/xóa thẻ sản phẩm Shopee và TikTok Shop; gán vị trí, giá minh họa, ảnh PNG/JPG/WebP tối đa 250 KB. Không có link thật.
- `/premium` (cũng có trong Cài đặt): người đọc thử bật/tắt trải nghiệm không quảng cáo, không có thanh toán. Admin chọn Premium có ẩn cả affiliate hay không.
- Booking đang kích hoạt, đúng ngày và thiết bị sẽ ưu tiên trước nguồn dự phòng. Không có creative phù hợp sẽ không chừa khung trống. Không cho booking trùng lịch/vị trí/thiết bị ở cùng mức ưu tiên.
- Quảng cáo giữa chap chỉ có một khối giữa các ảnh, mặc định yêu cầu ít nhất 8 ảnh. Không popup, sticky ads hoặc che thanh đọc. Danh sách/thể loại có một vị trí sau 8 truyện.
- Cấu hình, campaign, sản phẩm và sự kiện cơ bản đã lưu PostgreSQL qua API có session/quyền. Tích hợp mạng quảng cáo, đơn hàng và hoa hồng Shopee/TikTok thật vẫn chưa bật.
- Báo cáo FE đo khối hiện ít nhất 50% trong 1 giây và nút mẫu được nhấn; tối đa 3.000 sự kiện gần nhất. Mỗi sản phẩm affiliate trong khối có một sự kiện hiển thị. Xem trước admin không ghi sự kiện. CSV chỉ là thống kê FE; doanh thu được nhập tay, không suy ra từ click.
- Mã publisher chỉ lưu tham chiếu; không thực thi script, không gọi AdSense/Shopee/TikTok, không theo dõi đơn hàng, không thanh toán. Các mẫu không dẫn ra website ngoài. Các báo cáo/giá/booking không đại diện cho doanh thu thật.
- Để thử: đăng nhập admin thật sau bootstrap, thay banner FE và lưu, mở trang đọc cùng origin; thử tắt tổng, tắt mobile, lịch hết hạn, Premium và reload. Bật lại chế độ đọc thường sau khi thử Premium.

## Cấu trúc

- `src/app`: route, metadata, sitemap và robots.
- `src/features`: module truyện, đọc chap, quảng cáo, admin, chat, bình luận, tủ truyện và đăng nhập; component/dữ liệu/kiểu đặt cùng tính năng.
- `src/shared`: layout, UI, hook theme, tiện ích, SEO và kiểu dùng chung.
- `src/server`: hạ tầng chỉ chạy trên server; Prisma client tại `db/prisma.ts`.
- `src/styles/themes`: token màu cho giao diện Sáng/Tối và nền đọc.
- `prisma`: schema database; `public`: asset tĩnh; `scripts`: công cụ kiểm tra.
- `docs/specs`: `prompt.md` và `prompt2.md` được chuyển vào đây; `docs/screenshots`: ảnh tham khảo.

Xem cây thư mục, vị trí sửa từng tính năng và quy ước client/server tại [docs/architecture.md](docs/architecture.md).

## Tùy chỉnh giao diện

Website chỉ có hai giao diện `light` và `dark`. Màu sắc được định nghĩa tập trung trong `src/styles/themes/site.css`; danh sách lựa chọn nằm ở `src/shared/lib/theme/themes.ts`. Sau khi chỉnh token, chạy `npm run check:tokens` và `npm run check:contrast`, rồi xem cả hai chế độ tại `/styleguide` trong môi trường development.

## Danh mục truyện — B3

Truyện, tác giả, thể loại, tìm kiếm, metadata/sitemap và đọc snapshot chap đã chuyển sang PostgreSQL. Thêm/sửa dữ liệu tại `/admin/truyen`, `/admin/tac-gia`, `/admin/the-loai`; không sửa file mock để thay danh mục công khai nữa. Truyện chỉ xuất hiện ở user khi có quyền hợp lệ và ít nhất một chap với snapshot xuất bản. Upload/publish/import đã nối backend B4.

Hướng dẫn và giới hạn tại [docs/backend-catalog.md](docs/backend-catalog.md), tiến độ tại [docs/backend-plan.md](docs/backend-plan.md). B3 mới kiểm tra cơ bản; chưa nghiệm thu chuyên sâu/production build.

## Dữ liệu mock còn giữ để tham khảo

Danh sách truyện cũ ở `src/features/catalog/mocks/stories.ts`, thể loại cũ ở `src/features/catalog/services/genres.ts`, nội dung chap ở `src/features/catalog/mocks/handwritten-chapters` và `src/features/catalog/mocks/generators.ts`. Các module nghiệp vụ chưa chuyển backend vẫn có thể dùng dữ liệu FE; danh mục/reader công khai không dùng các nguồn này. Nội dung ngoài dự án, nếu có, phải được khai báo trong `src/features/catalog/mocks/SOURCES.md`.

## Thay mock bằng backend

Giữ nguyên kiểu và chữ ký public của `listStories`, `getStoryBySlug`, `getChaptersPage`, `getChapter`, `searchStories`, `listGenres`, `getRanking`, `getRelatedStories` tại `features/catalog/services`. Các service server dùng repository Prisma chỉ chạy server; service client gọi API có kiểm tra quyền. Sau đó nối comments/chat. Chuyển nguồn dữ liệu rõ ràng theo từng mốc, không fallback về mock khi DB lỗi.

## Chưa làm

- Scheduler tự chạy, quota, backup/versioning/lifecycle R2 và nghiệm thu chuyên sâu B3/B4 trước production.
- Phần production còn lại: cache chia sẻ khi chạy nhiều instance, observability, CI/deploy, hardening và diễn tập khôi phục R2.
- Realtime chuyên dụng cho chat; B6/B7 mới ở mức kiểm tra cơ bản.
- Mã ad network/API đơn hàng affiliate thật, thanh toán, VIP, audio và thông báo đẩy.
- Kiểm thử component trình duyệt và đo Core Web Vitals trên hạ tầng production.

## Trang quản trị

Mở `/admin/dang-nhap` sau khi tạo admin đầu tiên bằng `npm run auth:bootstrap`; xem [hướng dẫn auth](docs/backend-auth.md). Không có mật khẩu/OTP mặc định. Phiên cookie được server kiểm tra cùng role/status DB; đã bỏ bộ chuyển vai trò demo. Admin dùng cùng hai giao diện Sáng/Tối Neon của trang đọc và mặc định compact. Trên mobile, mở sidebar bằng nút menu góc trái; nút đổi sáng/tối nằm trên topbar.

Route admin nằm tại `src/app/admin`; component, service, mock, quyền và kiểu dữ liệu được gom trong `src/features/admin`. Khi thêm module mới, tạo route dưới `src/app/admin`, thêm mục điều hướng trong `components/shell/AdminShell.tsx`, khai báo quyền ở `lib/permissions.ts`, rồi chỉ gọi dữ liệu qua một hàm async trong `services`. Mọi hàm ghi phải gọi `writeAudit`.

Khi nối backend PostgreSQL/Prisma, giữ chữ ký public và thay các lớp `stories`, `chapters`, `importer`, `moderation`, `operations` theo kế hoạch. Phân quyền thật phải được cưỡng chế tại API/data-access layer bằng session server, role và phân công truyện; ghi dữ liệu/audit trong transaction. Ẩn menu/nút hoặc role trong localStorage không phải bảo mật.

Thông tin truyện, taxonomy, chap/ảnh, tủ truyện, lịch sử, hồ sơ, kiểm duyệt, quản trị người dùng, quảng cáo, dashboard và cấu hình vận hành cơ bản đã lưu backend. Đã có CLI backup/verify/restore rehearsal cho PostgreSQL + local media; chưa có reset email/MFA, gửi email, backup R2 tự động hoặc observability production.

Chưa bật OAuth/email reset/MFA. Còn cảnh báo dependency Prisma config và các hạng mục vận hành B9; chưa coi dự án đủ điều kiện production chỉ vì auth/build đã pass.
