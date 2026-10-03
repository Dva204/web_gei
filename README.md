# Vườn Ngôn Tình

Frontend website đọc truyện ngôn tình tiếng Việt, xây bằng Next.js App Router, TypeScript strict và Tailwind CSS. Dữ liệu hiện là mock và được đặt sau các lớp truy cập ổn định để có thể thay bằng Supabase.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Kiểm tra chất lượng bằng:

```bash
npm run typecheck
npm run lint
npm test
npm run check:tokens
npm run check:contrast
npm run build
```

Đặt `NEXT_PUBLIC_ADS_ENABLED=false` để ẩn hoàn toàn khung quảng cáo.

## Quảng cáo / Affiliate — sandbox frontend

- `/admin/quang-cao`: cấu hình 7 vị trí, bật/tắt mobile & PC, nguồn dự phòng, banner/native, booking theo ngày và ưu tiên, xem trước theo ngày/thiết bị/độ dài chap, mạng ads mẫu và Premium demo.
- `/admin/affiliate`: thêm/sửa/ẩn/xóa thẻ sản phẩm Shopee và TikTok Shop; gán vị trí, giá minh họa, ảnh PNG/JPG/WebP tối đa 250 KB. Không có link thật.
- `/premium` (cũng có trong Cài đặt): người đọc thử bật/tắt trải nghiệm không quảng cáo, không có thanh toán. Admin chọn Premium có ẩn cả affiliate hay không.
- Booking đang kích hoạt, đúng ngày và thiết bị sẽ ưu tiên trước nguồn dự phòng. Không có creative phù hợp sẽ không chừa khung trống. Không cho booking trùng lịch/vị trí/thiết bị ở cùng mức ưu tiên.
- Quảng cáo giữa chap chỉ có một khối giữa các ảnh, mặc định yêu cầu ít nhất 8 ảnh. Không popup, sticky ads hoặc che thanh đọc. Danh sách/thể loại có một vị trí sau 8 truyện.
- Dữ liệu dùng `localStorage` khóa `vuon-advertising-v1`, tổng tối đa 2 MB; đồng bộ tab cùng origin. **Localhost, ngrok và mỗi trình duyệt/thiết bị có kho dữ liệu riêng**. Đây không phải backend hoặc xác thực thật; giới hạn quyền ở FE chỉ phục vụ demo.
- Báo cáo FE đo khối hiện ít nhất 50% trong 1 giây và nút mẫu được nhấn; tối đa 3.000 sự kiện gần nhất. Mỗi sản phẩm affiliate trong khối có một sự kiện hiển thị. Xem trước admin không ghi sự kiện. CSV chỉ là thống kê FE; doanh thu được nhập tay, không suy ra từ click.
- Mã publisher chỉ lưu tham chiếu; không thực thi script, không gọi AdSense/Shopee/TikTok, không theo dõi đơn hàng, không thanh toán. Các mẫu không dẫn ra website ngoài. Các báo cáo/giá/booking không đại diện cho doanh thu thật.
- Để thử: đăng nhập admin demo, thay banner và lưu, mở trang đọc cùng origin; thử tắt tổng, tắt mobile, lịch hết hạn, Premium và reload. Bật lại chế độ đọc thường sau khi thử Premium.

## Cấu trúc

- `src/app`: route, metadata, sitemap và robots.
- `src/components`: layout, truyện, chương, reader, chat, theme, ads và UI dùng lại.
- `src/lib/data`: giao diện truy cập truyện/chương/xếp hạng.
- `src/lib/comments`, `src/lib/chat`: giao diện dữ liệu bình luận và chat mock.
- `src/lib/mock`: 24 truyện hư cấu, nội dung chương sinh theo seed và ghi chú nguồn.
- `src/lib/storage`: schema dữ liệu localStorage.
- `src/styles/themes`: token màu cho giao diện Sáng/Tối và nền đọc.

## Tùy chỉnh giao diện

Website chỉ có hai giao diện `light` và `dark`. Màu sắc được định nghĩa tập trung trong `src/styles/themes/site.css`; danh sách lựa chọn nằm ở `src/lib/theme/themes.ts`. Sau khi chỉnh token, chạy `npm run check:tokens` và `npm run check:contrast`, rồi xem cả hai chế độ tại `/styleguide` trong môi trường development.

## Sửa dữ liệu mock

Danh sách truyện nằm ở `src/lib/mock/stories.ts`; thể loại ở `src/lib/data/genres.ts`; nội dung chương viết tay ở `src/lib/mock/handwritten-chapters`; kho sinh chương ở `src/lib/mock/generators.ts`. Nội dung ngoài dự án, nếu có, phải được khai báo trong `src/lib/mock/SOURCES.md`.

## Thay mock bằng Supabase

Giữ nguyên kiểu và chữ ký public. Đổi `DATA_SOURCE` và viết lại phần triển khai của `listStories`, `getStoryBySlug`, `getChaptersPage`, `getChapter`, `searchStories`, `listGenres`, `getRanking`, `getRelatedStories`; sau đó thay triển khai các hàm trong `lib/comments` và cung cấp một `ChatClient` mới. Component không cần thay đổi nếu kết quả trả về giữ đúng kiểu.

## Chưa làm

- Backend, xác thực và đồng bộ đa thiết bị thật.
- Gửi bình luận, báo cáo và quản trị chat lên máy chủ thật.
- Mã quảng cáo/affiliate thật, thanh toán, VIP, audio và thông báo đẩy.
- Kiểm thử component trình duyệt và đo Core Web Vitals trên hạ tầng production.

## Trang quản trị

Mở `/admin/dang-nhap`, dùng một trong các email mẫu dưới đây, mật khẩu bất kỳ và mã 2FA `123456`:

- `admin@vuon.local` — quản trị viên
- `mod1@vuon.local` — điều hành viên
- `editor1@vuon.local` — biên tập viên
- `author1@vuon.local` — tác giả/dịch giả
- `beta1@vuon.local` — beta

Phiên đăng nhập và vai trò xem thử được giữ trong `localStorage`; đây chỉ là lớp trải nghiệm frontend, không phải bảo mật thật. Admin dùng cùng hai giao diện Sáng/Tối Neon của trang đọc và mặc định có mật độ compact. Trên mobile, mở sidebar bằng nút menu ở góc trái; nút đổi sáng/tối luôn nằm trên topbar.

Mã admin được tách tại `src/app/admin`, `src/components/admin`, `src/lib/admin` và `src/types/admin.ts`. Khi thêm module mới, tạo route dưới `src/app/admin`, thêm mục điều hướng trong `AdminShell`, khai báo quyền ở `permissions.ts`, rồi chỉ gọi dữ liệu qua một hàm async trong `lib/admin`. Mọi hàm ghi phải gọi `writeAudit`.

Khi thay mock bằng Supabase, giữ nguyên chữ ký public và viết lại các lớp `stories`, `chapters`, `importer`, `moderation` và `operations`. Ánh xạ dữ liệu tới `profiles.role`, `chapter_versions`, `stories.rights_*`, `takedown_requests`, `ad_slots`, `ad_campaigns`, `affiliate_links`, `link_clicks`, `site_settings`, `audit_logs` và `moderation_rules`. Phân quyền thật bắt buộc phải được cưỡng chế ở backend bằng RLS; việc ẩn menu/nút ở frontend không phải biện pháp bảo mật.

Admin hiện dùng mock trong bộ nhớ nên dữ liệu thao tác sẽ trở về ban đầu sau khi tải lại trang. Chưa có upload tệp lên máy chủ, gửi email, mạng quảng cáo thật, analytics thật hay sao lưu từ cơ sở dữ liệu.
