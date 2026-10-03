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
│   └── db/prisma.ts           # Prisma client singleton, có server-only guard
└── styles/                    # CSS dùng chung và token sáng/tối

prisma/schema.prisma           # Schema database
public/                        # Asset tĩnh, đường dẫn public không thay đổi
scripts/                       # Kiểm tra cấu trúc, token và tương phản
docs/
├── architecture.md            # Tài liệu này
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
- Các service admin hiện vẫn là mock phục vụ frontend; chúng **không phải backend** chỉ vì có tên `services`. Quyền FE và đăng nhập demo không thay thế phân quyền server.
- Kiểu truyện, thể loại và chap nằm tại `features/catalog/types`; phân trang dùng `shared/types/pagination.ts`. Các kiểu cũ `Paginated` vẫn được re-export từ kiểu truyện/admin để giữ chữ ký sử dụng.
- Test đặt cạnh mã được kiểm thử (`rules.test.ts`, `normalizeVi.test.ts`). Token màu chỉ nằm trong `styles/themes`; stylesheet giữ tập trung để không thay thứ tự CSS hoặc ảnh hưởng responsive.
- `.env` không được chia sẻ/commit; dùng `.env.example`. Không di chuyển hoặc xóa `node_modules`, cache đang được dev server sử dụng, schema Prisma hay dữ liệu người dùng trong lần sắp xếp này.

## Vị trí thường cần sửa

| Công việc | Vị trí |
| --- | --- |
| Danh sách/bìa truyện, danh sách chap | `features/catalog/components` |
| Dữ liệu truyện, thể loại và chap | `features/catalog/services` |
| Mock truyện và ghi chú nguồn | `features/catalog/mocks` |
| Thanh đọc, ảnh chap, báo lỗi | `features/reader` |
| Quảng cáo, affiliate, Premium demo | `features/advertising` |
| Form/cấu hình/luồng quản trị | `features/admin` |
| Header, footer, menu mobile, theme | `shared/components` và `shared/hooks` |
| Kết nối PostgreSQL | `server/db/prisma.ts` |
| Token màu sáng/tối | `styles/themes/site.css` |

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

Backend chưa được xây thêm trong lần tổ chức này. Schema Prisma và API `/api/health/db` hiện có được giữ nguyên chức năng. Trang user và admin vẫn dùng mock/localStorage theo từng module; dữ liệu đó chưa đồng bộ với database. Bình luận/báo lỗi/yêu cầu gỡ có sử dụng chung mock admin như trước; khi làm backend cần thay cả hai đầu bằng lớp dữ liệu server có xác thực và kiểm tra đầu vào.
