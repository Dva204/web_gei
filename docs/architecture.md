# Cấu trúc dự án

Dự án dùng Next.js App Router và tổ chức theo tính năng (feature-based). Không đổi URL, luồng đọc truyện, giao diện hay khóa localStorage khi chuyển thư mục.

```text
src/
├── app/                       # Route, layout, metadata và API entry point
│   ├── admin/                 # URL quản trị hiện có
│   ├── api/                   # Route Handler, ví dụ health/db
│   ├── truyen/[slug]/[chap]/   # Trang truyện và đọc chap
│   └── ...                    # Các trang public khác; giữ nguyên URL
├── features/                  # Mã thuộc từng nghiệp vụ
│   ├── admin/                 # components, services, mocks, lib, actions, types.ts
│   ├── advertising/           # components, hooks, lib, types.ts
│   ├── auth/                  # Form đăng nhập/đăng ký phía người đọc
│   ├── catalog/               # components, services, mocks, types
│   ├── chat/                  # components, services, mocks, types.ts
│   ├── comments/              # components, services, actions, types.ts
│   ├── library/               # Tủ truyện, bookmark và lịch sử local
│   └── reader/                # components và actions báo lỗi chap
├── shared/                    # Mã dùng chung
│   ├── components/            # Layout, theme, UI, Pagination, ScrollToTop
│   ├── hooks/                 # useTheme
│   ├── lib/                   # Tiện ích, theme, SEO, copy, URL media
│   └── types/                 # Paginated và các kiểu chung
├── server/                    # Hạ tầng chỉ chạy trên server
│   ├── db/prisma.ts           # Prisma client singleton, có server-only guard
│   ├── http/                  # Contract API, lỗi an toàn và request ID
│   ├── auth/                  # Password, session, CSRF, rate limit và DAL quyền
│   ├── catalog/               # Truyện, taxonomy, phân công và danh mục công khai
│   ├── chapters/              # Nháp, snapshot, version và import job
│   ├── library/               # Bookmark, tiến độ, import dữ liệu khách
│   ├── moderation/            # Bình luận, báo lỗi, yêu cầu gỡ và hàng đợi
│   ├── chat/                  # Phòng, tin nhắn, báo cáo và kiểm duyệt chat
│   ├── advertising/           # Snapshot quảng cáo, affiliate và tracking nội bộ
│   └── media/                 # Kiểm tra/chuẩn hóa ảnh, kho local và đọc ảnh có quyền
└── styles/                    # CSS dùng chung và token sáng/tối

prisma/schema.prisma           # Schema database
prisma/migrations/             # Baseline + migration có version, CHECK constraints
public/                        # Asset tĩnh, đường dẫn public không thay đổi
scripts/                       # Kiểm tra cấu trúc, token và tương phản
scripts/db/                    # Check/seed và integration PostgreSQL riêng
scripts/auth/                  # Bootstrap, cleanup và DB/HTTP auth test riêng
scripts/chapters/              # Worker publish-due và smoke B4 trên DB/kho riêng
.data/media/                   # Ảnh riêng tư, ignored bởi Git; cần backup cùng DB
tests/backend/                 # Unit tests hạ tầng backend
docs/
├── architecture.md            # Tài liệu này
├── backend-plan.md            # Checklist từng mốc backend
├── backend-setup.md           # Chạy DB/migration/seed/integration an toàn
├── backend-auth.md            # Tạo admin, cấu hình ngrok, auth và quyền thật
├── backend-catalog.md         # CRUD và danh mục B3
├── backend-chapters.md        # Upload, chap, import và lịch đăng B4
├── backend-library.md         # Tủ truyện, lịch sử, hồ sơ và session B5
├── backend-moderation.md      # Bình luận và kiểm duyệt B6
├── backend-chat.md            # Chat và kiểm duyệt B7
├── backend-advertising.md     # Quảng cáo và affiliate B8
├── backend-operations.md      # Cấu hình, nội dung, analytics và export B9
├── specs/prompt.md             # Yêu cầu frontend ban đầu
├── specs/prompt2.md            # Yêu cầu admin ban đầu
└── screenshots/               # Ảnh tham khảo
```

## Quy ước phát triển

- `app` là nơi ghép trang và khai báo các convention của Next.js. Logic có thể dùng lại thuộc `features`, không để lẫn với route.
- Mỗi tính năng chứa component, kiểu dữ liệu và lớp truy cập dữ liệu của nó. Dùng `components`, `services`, `hooks`, `lib`, `mocks`, `actions` khi thật sự cần; không tạo thư mục rỗng cho đủ mẫu.
- Component dùng PascalCase (`StoryCard.tsx`), hook bắt đầu bằng `use`, tiện ích/service dùng camelCase. Các file `page.tsx`, `layout.tsx`, `route.ts` giữ tên chuẩn của Next.js.
- Import qua tính năng khác dùng alias rõ ràng, ví dụ `@/features/catalog/services`. Import trong cùng module có thể dùng đường dẫn tương đối. Không tạo barrel export trộn module server và client.
- `shared` dành cho phần dùng lại: tiện ích, UI và shell giao diện; không chuyển toàn bộ logic nghiệp vụ vào một `utils.ts` lớn.
- `server` dành cho database, bí mật và hạ tầng server. File trong đó phải `import 'server-only'`; Client Component không được import trực tiếp hoặc gián tiếp chúng.
- Server Actions nằm tại `features/<feature>/actions`, có `'use server'`. Route Handler nằm trong `app/api`. Chỉ directive `'use server'` không tự cung cấp xác thực/phân quyền.
- Service auth/catalog/chap/upload/import/library/moderation/chat/advertising gọi backend thật; module vận hành còn chuyển đổi. Quyền FE chỉ là gợi ý giao diện; server kiểm tra session/permission/phân công tại từng page/API/DAL.
- Kiểu truyện, thể loại và chap nằm tại `features/catalog/types`; phân trang dùng `shared/types/pagination.ts`. Các kiểu cũ `Paginated` vẫn được re-export từ kiểu truyện/admin để giữ chữ ký sử dụng.
- Test đặt cạnh mã được kiểm thử (`rules.test.ts`, `normalizeVi.test.ts`). Token màu chỉ nằm trong `styles/themes`; stylesheet giữ tập trung để không thay thứ tự CSS hoặc ảnh hưởng responsive.
- `.env` không được chia sẻ/commit; dùng `.env.example`. Không di chuyển hoặc xóa `node_modules`, cache đang được dev server sử dụng, schema Prisma hay dữ liệu người dùng trong lần sắp xếp này.

## Vị trí thường cần sửa

| Công việc                                  | Vị trí                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Danh sách/bìa truyện, danh sách chap       | `features/catalog/components`                                           |
| Dữ liệu truyện, thể loại và chap           | `features/catalog/services`                                             |
| Upload ảnh, kho riêng tư và API media | `server/media`, `.data/media`, `app/api/media` |
| Nháp/snapshot/phiên bản/import/lịch đăng | `server/chapters`, `scripts/chapters`, schema Prisma |
| Tủ truyện và tiến độ đọc theo trình duyệt  | `features/library/lib/storage.ts` và `hooks/useLibrary.ts`              |
| Mock truyện và ghi chú nguồn               | `features/catalog/mocks`                                                |
| Thanh đọc, ảnh chap, báo lỗi               | `features/reader`                                                       |
| Quảng cáo, affiliate, Premium demo         | `features/advertising`                                                  |
| Form/cấu hình/luồng quản trị               | `features/admin`                                                        |
| Header, footer, menu mobile, theme         | `shared/components` và `shared/hooks`                                   |
| Kết nối PostgreSQL                         | `server/db/prisma.ts`                                                   |
| Token màu sáng/tối                         | `styles/themes/site.css`                                                |

## Kiểm tra sau khi thêm hoặc di chuyển file

```bash
npm run check:structure
npm run typecheck
npm run lint
npm test
npm run check:tokens
npm run check:contrast
npm run build
```

`check:structure` kiểm tra import nội bộ còn tồn tại, chặn thư mục/import cũ và kiểm tra client không kéo mã `server` vào bundle qua import tĩnh hoặc dynamic import chuỗi. TypeScript và Next build vẫn là kiểm tra bắt buộc; script không thay thế bộ biên dịch hay kiểm thử runtime.

## Ranh giới hiện tại

Nền tảng backend có schema User/Session/StoryAssignment, FK tủ truyện/lịch sử, snapshot ChapterPublication và migration SQL có constraint. `/api/health/db` kiểm tra kết nối bằng contract `{ data, requestId }` hoặc `{ error, requestId }`, không lộ raw error. Hướng dẫn baseline/seed/integration tại `backend-setup.md`; migration viết ra chưa đồng nghĩa đã áp dụng lên DB local.

Auth user/admin dùng session PostgreSQL thật; role/status đọc DB, không dùng localStorage. Permission policy chung nằm ở shared/lib/auth, DAL chỉ server tại server/auth/authorization.ts; API ghi có CSRF/rate limit. 24 trang admin có guard riêng trước dữ liệu; layout không thay thế guard. CLI admin đầu tiên và test riêng được mô tả trong backend-auth.md.

Truyện/taxonomy/phân công/chap/ảnh/import, thư viện/tài khoản, kiểm duyệt, chat và quảng cáo/affiliate đã nối backend. Snapshot đã đăng độc lập với workflow bản nháp; reader chỉ đọc publication từ DB. Kho ảnh local ngoài public, mỗi lần đọc kiểm tra quyền qua API. Khách vẫn dùng localStorage và chỉ nhập theo xác nhận. Module vận hành còn dùng kho browser/mock tùy phần. Test server-only shim chỉ dùng trong Vitest Node; Next build và check:structure vẫn cưỡng chế ranh giới server/client thực tế.
