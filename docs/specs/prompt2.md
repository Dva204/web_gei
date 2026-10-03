# PROMPT: Xây dựng giao diện trang admin cho website đọc truyện ngôn tình

**Cách dùng:** dán toàn bộ nội dung từ mục 0 trở xuống vào AI (Claude Code, Cursor, v0, Lovable...). Prompt này **nối tiếp** prompt giao diện người đọc: nó dùng lại cùng dự án Next.js, hệ thống theme/token, bộ component nền và lớp dữ liệu giả. Nếu công cụ giới hạn độ dài, gửi mục 0-8 trước, rồi gửi các mục còn lại theo trình tự ở mục 17.

---

## 0. Vai trò và mục tiêu

Bạn là kỹ sư frontend senior kiêm UI designer, chuyên làm công cụ nội bộ. Hãy xây dựng **toàn bộ giao diện trang admin (chưa có backend)** cho website đọc truyện chữ **ngôn tình** tiếng Việt, đặt dưới đường dẫn `/admin`, **trong cùng dự án Next.js** của giao diện người đọc.

Toàn bộ dữ liệu ở giai đoạn này là **dữ liệu giả (mock)** và đăng nhập là **giả lập**, nhưng mọi truy cập dữ liệu phải đi qua các lớp `lib/admin/*` có chữ ký cố định để sau này thay bằng Supabase mà **không phải sửa component**. Phân quyền ở giao diện chỉ là **lớp trải nghiệm**; việc cưỡng chế quyền thật sẽ làm ở backend (RLS), nhưng giao diện phải được thiết kế sẵn theo đúng ma trận quyền ở mục 6.

Bốn nguyên tắc xuyên suốt:
1. **Nhanh cho người vận hành.** Hàng đợi cần xử lý (duyệt bình luận, báo lỗi, gỡ nội dung) phải làm được nhanh, kể cả trên điện thoại.
2. **An toàn theo mặc định.** Hành động nguy hiểm có xác nhận; mọi thao tác ghi đều ghi nhật ký; quyền tối thiểu.
3. **Nội dung có nguồn gốc rõ ràng.** Một truyện chưa khai báo quyền sử dụng thì **không được chuyển sang công khai**.
4. **Dùng lại, không viết lại.** Dùng token, theme, component nền của site người đọc; không có màu/font cứng ngoài `styles/themes`.

---

## 1. Bối cảnh

- Site: truyện chữ ngôn tình, do một nhóm nhỏ vận hành (admin, mod, biên tập, dịch giả/tác giả, beta) kiêm nhiều vai.
- Quy trình chương: **Bản nháp → Đang dịch → Đang edit → Đã beta → Sẵn sàng → Đã đăng** (cộng `Lên lịch`). Truyện do tác giả Việt tự viết có thể bỏ qua bước "Đang dịch".
- Site chạy quảng cáo, affiliate và hợp đồng quảng cáo trực tiếp, nên admin phải quản lý được các vị trí quảng cáo, chiến dịch, link affiliate và số liệu.
- Ngôn ngữ giao diện: **tiếng Việt**, mọi chuỗi đặt trong `lib/admin/copy.ts`.
- Người dùng admin chủ yếu dùng máy tính; riêng các **hàng đợi kiểm duyệt** phải dùng tốt trên điện thoại.

---

## 2. Phạm vi

### Làm trong giai đoạn này (toàn bộ giao diện admin, chạy trên dữ liệu giả)
Đăng nhập giả lập + 2FA giả lập, khung admin, phân quyền ở giao diện, và các module: Tổng quan, Truyện, Chương (+ trình soạn + quy trình trạng thái), Nhập hàng loạt, Thể loại/Tác giả/Nhãn, Bình luận, Báo lỗi chương, Yêu cầu gỡ nội dung, Chat (kiểm duyệt), Người dùng và vai trò, Quảng cáo và Affiliate, Thống kê, SEO, Nội dung trang, Cài đặt, Nhật ký hoạt động, Sao lưu/xuất dữ liệu.

### Không làm
Backend thật, xác thực thật, cưỡng chế quyền thật, gửi email, tích hợp mạng quảng cáo thật, đồng bộ dữ liệu thật với Shopee/TikTok Shop, xử lý thanh toán. Mọi nút "gửi/lưu" chỉ cập nhật dữ liệu giả trong bộ nhớ (và localStorage khi cần giữ giữa các lần tải lại).

---

## 3. Công nghệ và nguyên tắc kiến trúc

| Hạng mục | Yêu cầu |
|---|---|
| Nền | Cùng dự án: Next.js App Router, TypeScript `strict`, Tailwind + biến CSS (dùng lại theme) |
| Thư viện bổ sung được phép | `@tanstack/react-table` (bảng), `react-hook-form` + `zod` (biểu mẫu), `recharts` (biểu đồ), `date-fns` (ngày giờ), `lucide-react` (icon) |
| Không dùng | Thư viện UI nặng, trình soạn WYSIWYG nặng, Redux |

Quy tắc:
1. Mã admin nằm trong **route group riêng** `app/admin/...` với `layout.tsx` riêng. **Không import mã admin vào bundle của người đọc**; kiểm tra bằng phân tích bundle.
2. Admin dùng **cùng hệ thống theme** (8 biến thể) và có thêm thuộc tính mật độ `data-density="compact"` (khoảng cách nhỏ hơn) mặc định cho admin.
3. Mặc định Server Components; dùng Client Components cho bảng, biểu mẫu, trình soạn, hàng đợi.
4. Mọi dữ liệu qua `lib/admin/*` (mục 5-6). Không dữ liệu cứng trong component.
5. Bộ lọc, sắp xếp, trang hiện tại của mọi bảng **đồng bộ lên URL**.
6. Không mã màu `#xxxxxx` ngoài `styles/themes`; chạy lại `check-tokens` và `check-contrast` của dự án.
7. Toàn bộ `/admin/**`: `noindex`, `nofollow`, và thêm `Disallow: /admin` vào `robots`.

---

## 4. Sơ đồ route

| Route | Màn hình |
|---|---|
| `/admin/dang-nhap` | Đăng nhập giả lập + bước nhập mã 2FA giả lập (mã mẫu `123456`) |
| `/admin` | Tổng quan |
| `/admin/truyen` · `/admin/truyen/moi` · `/admin/truyen/[id]` | Danh sách / tạo / sửa truyện |
| `/admin/truyen/[id]/chuong` | Danh sách chương của truyện |
| `/admin/truyen/[id]/chuong/[n]` · `/chuong/moi` | Trình soạn chương |
| `/admin/nhap-hang-loat` | Nhập hàng loạt chương |
| `/admin/the-loai` · `/admin/tac-gia` | CRUD thể loại phụ, tác giả, nhãn |
| `/admin/binh-luan` | Duyệt bình luận |
| `/admin/bao-loi` | Báo lỗi chương |
| `/admin/yeu-cau-go` | Yêu cầu gỡ nội dung |
| `/admin/chat` | Kiểm duyệt chat và quản lý phòng |
| `/admin/nguoi-dung` · `/admin/nguoi-dung/[id]` | Người dùng, vai trò, xử phạt |
| `/admin/quang-cao` | Vị trí quảng cáo, chiến dịch trực tiếp |
| `/admin/affiliate` | Link affiliate và số click |
| `/admin/thong-ke` | Thống kê |
| `/admin/seo` | SEO, chuyển hướng 301, sitemap |
| `/admin/noi-dung-trang` | Đề cử, banner, thông báo toàn site, trang tĩnh |
| `/admin/cai-dat` | Cài đặt site |
| `/admin/nhat-ky` | Nhật ký hoạt động |
| `/admin/sao-luu` | Xuất dữ liệu, nhắc lịch sao lưu |
| `/admin/403`, `not-found` | Không đủ quyền, không tìm thấy |

---

## 5. Cấu trúc thư mục

```
src/
├─ app/admin/
│  ├─ layout.tsx                    # khung admin: sidebar, topbar, bảo vệ route giả lập
│  ├─ dang-nhap/page.tsx
│  ├─ (dashboard)/page.tsx
│  ├─ truyen/  nhap-hang-loat/  the-loai/  tac-gia/  binh-luan/  bao-loi/  yeu-cau-go/
│  ├─ chat/  nguoi-dung/  quang-cao/  affiliate/  thong-ke/  seo/  noi-dung-trang/
│  └─ cai-dat/  nhat-ky/  sao-luu/  403/
├─ components/admin/
│  ├─ shell/     AdminSidebar, AdminTopbar, Breadcrumb, RoleSwitcherDev, SessionBanner, CommandSearch
│  ├─ table/     DataTable, ColumnToggle, BulkActionBar, TableFilters, TablePagination
│  ├─ forms/     FormField, FormSection, RichTextLite, ImageCropUpload, TagInput, SlugInput, DateTimePicker
│  ├─ feedback/  ConfirmDialog, TypeToConfirmDialog, Toast, EmptyState, ErrorState, PageSkeleton
│  ├─ common/    PageHeader, StatusBadge, RoleBadge, StatCard, Timeline, KeyValueList
│  ├─ stories/   StoryForm, RightsPanel, CoverUploader, StoryRow
│  ├─ chapters/  ChapterTable, ChapterEditor, ChapterPreview, VersionHistory, WorkflowStepper, StatusSelect
│  ├─ import/    ImportDropzone, ImportPreviewTable, ImportWarnings
│  ├─ moderation/ CommentQueueItem, ChapterReportCard, ChatReportItem, TakedownCard
│  ├─ users/     UserTable, RoleSelect, SanctionDialog, UserTimeline
│  ├─ ads/       SlotConfigTable, CampaignForm, AffiliateLinkForm, ClickChart, ManualRevenueTable
│  └─ stats/     LineChartCard, BarChartCard, TopTable, DropOffTable
├─ lib/admin/
│  ├─ auth.ts          # đăng nhập giả lập, phiên, 2FA giả lập
│  ├─ permissions.ts   # can(role, action, resource)
│  ├─ stories.ts  chapters.ts  importer.ts  taxonomy.ts
│  ├─ comments.ts  reports.ts  takedowns.ts  chat.ts  users.ts
│  ├─ ads.ts  affiliate.ts  stats.ts  seo.ts  content.ts  settings.ts  audit.ts  backup.ts
│  ├─ mock/            # dữ liệu giả (mục 8)
│  └─ copy.ts
└─ types/admin.ts
```

---

## 6. Vai trò, quyền và quy trình trạng thái

### 6.1 Vai trò

`admin` · `mod` (điều hành viên) · `editor` (biên tập) · `author` (dịch giả/tác giả) · `beta`.

### 6.2 Ma trận quyền (dùng làm dữ liệu cho `can()`)

| Module | admin | mod | editor | author | beta |
|---|---|---|---|---|---|
| Truyện: tạo, sửa thông tin | ✓ | – | ✓ | Truyện được giao | – |
| Truyện: chuyển sang "công khai" | ✓ | – | ✓ (có quyền sử dụng) | – | – |
| Chương: soạn, sửa | ✓ | – | ✓ | Truyện được giao | Góp ý/sửa ở trạng thái "Đã edit" |
| Chương: đăng, gỡ, hẹn giờ | ✓ | – | ✓ | – | – |
| Nhập hàng loạt | ✓ | – | ✓ | Truyện được giao | – |
| Thể loại, tác giả, nhãn | ✓ | – | ✓ | – | – |
| Bình luận, báo lỗi | ✓ | ✓ | Chỉ báo lỗi | – | – |
| Yêu cầu gỡ nội dung | ✓ | Xem + gỡ tạm | – | – | – |
| Chat | ✓ | ✓ | – | – | – |
| Người dùng: cảnh báo, tắt tiếng, cấm | ✓ | ✓ | – | – | – |
| Người dùng: đổi vai trò | ✓ | – | – | – | – |
| Quảng cáo và affiliate | ✓ | – | – | – | – |
| Thống kê: lượt xem/truyện | ✓ | – | ✓ | Truyện được giao | – |
| Thống kê: doanh thu/tài chính | ✓ | – | – | – | – |
| SEO, nội dung trang | ✓ | – | ✓ | – | – |
| Cài đặt, sao lưu | ✓ | – | – | – | – |
| Nhật ký hoạt động | ✓ | Xem phần mình xử lý | – | – | – |

Cài đặt:
```ts
type Role = 'admin' | 'mod' | 'editor' | 'author' | 'beta';
can(user: AdminUser, action: string, resource?: { type: string; assigneeIds?: string[] }): boolean
```
Giao diện: ẩn mục menu không đủ quyền; vào thẳng đường dẫn không đủ quyền → trang `403`; nút/hành động không đủ quyền thì **ẩn** (hoặc vô hiệu hóa kèm giải thích, nếu việc ẩn gây khó hiểu).

### 6.3 Quy trình trạng thái chương

`draft` Bản nháp → `translating` Đang dịch → `editing` Đang edit → `beta` Đã edit, chờ beta → `ready` Sẵn sàng → `published` Đã đăng; thêm `scheduled` (Lên lịch, có `publishAt`).

| Chuyển | Ai được làm |
|---|---|
| `draft → translating`, `translating → editing` (nộp bài) | author, editor, admin |
| `editing → beta` | editor, admin |
| `beta → ready` (xác nhận đã beta) | beta, editor, admin |
| `ready → published` hoặc `scheduled` | editor, admin |
| `published → ready` (gỡ chương) | editor, admin (cần xác nhận) |
| Lùi một bước (trả bài kèm ghi chú bắt buộc) | người ở bước sau, editor, admin |
| Bỏ qua `translating` (truyện tự sáng tác) | tùy chọn trong cấu hình truyện |

Mỗi lần đổi trạng thái: ghi lại ai đổi, lúc nào, ghi chú (bắt buộc khi trả bài), và tạo mục trong nhật ký.

### 6.4 Chốt chặn quyền sử dụng

Mỗi truyện có khai báo `rights`:
```ts
type RightsType = 'own' | 'agreement' | 'public_domain' | 'open_license' | 'other';
// own: nội dung do chính nhóm/tác giả của site sáng tác
// agreement: có thỏa thuận với tác giả/chủ sở hữu (cần ghi minh chứng)
```
Quy tắc ở giao diện: **nút "Công khai" bị khóa** cho đến khi điền `rightsType` và, với mọi loại trừ `own`, điền `rightsNote` (minh chứng: link thư đồng ý/giấy phép/nguồn) cùng `rightsExpiresAt` nếu có. Hiện cảnh báo khi thỏa thuận sắp hết hạn (≤ 30 ngày) trên trang tổng quan.

---

## 7. Kiểu dữ liệu và lớp truy cập dữ liệu

### 7.1 Kiểu dữ liệu (`types/admin.ts`)

```ts
type AdminUser = { id: string; name: string; email: string; avatar?: string; role: Role; status: 'active' | 'muted' | 'banned'; twoFactor: boolean; lastLoginAt?: string; createdAt: string };

type ChapterStatus = 'draft' | 'translating' | 'editing' | 'beta' | 'ready' | 'published' | 'scheduled';

type StoryAdmin = Story /* kiểu Story của site người đọc */ & {
  visibility: 'draft' | 'public' | 'hidden';
  featured: boolean; assigneeIds: string[];
  rightsType?: RightsType; rightsNote?: string; rightsExpiresAt?: string;
  skipTranslate?: boolean; seoTitle?: string; seoDescription?: string;
};

type ChapterAdmin = {
  storyId: string; number: number; title: string; content: string; wordCount: number;
  status: ChapterStatus; assigneeId?: string; publishAt?: string; publishedAt?: string; updatedAt: string; updatedBy: string;
};
type ChapterVersion = { id: string; storyId: string; number: number; content: string; savedAt: string; savedBy: string; note?: string };

type ModerationComment = { id: string; storyId: string; chapterNumber?: number; user: { id: string; name: string; role: Role | 'member' }; content: string; flags: ('new_account' | 'link' | 'keyword' | 'reported')[]; reportCount: number; status: 'pending' | 'visible' | 'hidden'; createdAt: string };

type ChapterReport = { id: string; storyId: string; chapterNumber: number; type: 'missing' | 'typo' | 'display' | 'takedown'; message: string; status: 'new' | 'in_progress' | 'fixed' | 'ignored'; assigneeId?: string; createdAt: string };

type TakedownRequest = { id: string; requesterName: string; requesterEmail: string; organization?: string; targetUrls: string[]; description: string; evidence?: string; status: 'new' | 'content_hidden' | 'investigating' | 'resolved_removed' | 'resolved_rejected'; dueAt: string; log: { at: string; by: string; action: string }[]; createdAt: string };

type ChatReport = { id: string; messageId: string; roomId: string; reason: string; reportedBy: string; message: { user: string; content: string; createdAt: string }; status: 'open' | 'resolved' };

type AdSlotConfig = { placement: string; enabled: boolean; width: number; height: number; code?: string /* mã HTML/JS bên thứ ba, chỉ hiển thị dạng văn bản trong admin */ };
type AdCampaign = { id: string; advertiser: string; creativeUrl?: string; targetUrl: string; placement: string; startAt: string; endAt: string; status: 'draft' | 'scheduled' | 'running' | 'ended' | 'paused'; price?: number; note?: string };
type AffiliateLink = { id: string; slug: string; name: string; program: string; targetUrl: string; active: boolean; note?: string; clicks30d: number };
type ManualRevenue = { id: string; date: string; source: string; amount: number; note?: string };

type AuditLog = { id: string; at: string; userId: string; action: string; objectType: string; objectId: string; summary: string };
type SiteSettings = { siteName: string; defaultTheme: string; chatEnabled: boolean; commentsEnabled: boolean; commentPremoderation: boolean; adsEnabled: boolean; contactEmail: string; backupReminderDays: number };
```

### 7.2 Chữ ký các hàm (BẮT BUỘC giữ khi thay backend)

Mọi hàm là `async`, giả lập độ trễ 80-250ms ở chế độ dev. Mọi hàm ghi (tạo/sửa/xóa/đổi trạng thái) **tự ghi một mục vào `audit`**.

```ts
// stories.ts
listStoriesAdmin(q: { search?: string; status?; visibility?; genre?; assigneeId?; sort?; page?; pageSize? }): Promise<Paginated<StoryAdmin>>
getStoryAdmin(id): Promise<StoryAdmin | null>
saveStory(input): Promise<StoryAdmin>                 // trả lỗi nếu chuyển 'public' khi thiếu quyền sử dụng
bulkUpdateStories(ids, patch): Promise<void>
// chapters.ts
listChaptersAdmin(storyId, q: { status?; assigneeId?; page?; pageSize? }): Promise<Paginated<ChapterAdmin>>
getChapterAdmin(storyId, n): Promise<ChapterAdmin | null>
saveChapter(input): Promise<ChapterAdmin>             // tạo phiên bản mới trong lịch sử
changeChapterStatus(storyId, n, to: ChapterStatus, note?: string, publishAt?: string): Promise<ChapterAdmin>
listVersions(storyId, n): Promise<ChapterVersion[]>;  restoreVersion(versionId): Promise<ChapterAdmin>
findReplaceInStory(storyId, find, replace, opts: { dryRun: boolean }): Promise<{ matches: number; chapters: number }>
renumberChapters(storyId, mapping): Promise<void>
// importer.ts
parseImport(file | text, opts: { pattern?: string }): Promise<ImportPreview>   // chỉ phân tích, chưa lưu
commitImport(previewId, opts: { targetStatus: 'draft' | 'ready' }): Promise<{ created: number }>
// comments.ts, reports.ts, takedowns.ts, chat.ts, users.ts
listModerationComments(q): Promise<Paginated<ModerationComment>>;  moderateComment(id, action: 'approve' | 'hide' | 'delete' | 'pin', note?): Promise<void>
listChapterReports(q): Promise<Paginated<ChapterReport>>;  updateChapterReport(id, patch): Promise<void>
listTakedowns(q): Promise<Paginated<TakedownRequest>>;  updateTakedown(id, patch & { logNote }): Promise<void>;  hideStoryTemporarily(storyId): Promise<void>
listChatReports(q): Promise<Paginated<ChatReport>>;  moderateChat(action: 'delete' | 'mute' | 'ban' | 'purge_user', target, opts?): Promise<void>;  setRoomConfig(roomId, patch): Promise<void>
listUsers(q): Promise<Paginated<AdminUser>>;  sanctionUser(id, action, opts?): Promise<void>;  changeRole(id, role): Promise<void>
// ads.ts, affiliate.ts, stats.ts, seo.ts, content.ts, settings.ts, audit.ts, backup.ts
listSlots(); saveSlot(); listCampaigns(); saveCampaign(); listAffiliateLinks(); saveAffiliateLink(); listManualRevenue(); saveManualRevenue()
getStats(range, scope?): Promise<StatsBundle>
listRedirects(); saveRedirect(); getSettings(); saveSettings(); listAudit(q): Promise<Paginated<AuditLog>>
exportStory(id, format: 'txt' | 'md' | 'json'): Promise<Blob>;  exportAll(): Promise<Blob>
```

---

## 8. Dữ liệu giả cho admin

Dùng lại 24 truyện hư cấu của site người đọc (`lib/mock`), rồi bổ sung:

| Dữ liệu | Số lượng và yêu cầu |
|---|---|
| Người dùng | 15 người: 1 admin, 2 mod, 2 editor, 3 author, 2 beta, 5 thành viên; có 1 người đang bị tắt tiếng, 1 người bị cấm |
| Phân công truyện | Mỗi truyện có 1-2 người phụ trách |
| Quyền sử dụng | Phủ đủ 5 loại; 3 truyện **chưa khai báo quyền** (để test chốt chặn); 2 truyện có thỏa thuận sắp hết hạn ≤ 30 ngày |
| Chương theo trạng thái | Khoảng 60 chương rải đủ 7 trạng thái, 3 chương `scheduled` sắp tới, vài chương có 3-5 phiên bản |
| Hàng đợi bình luận | 30 bình luận (chờ duyệt, bị báo cáo, có link, từ tài khoản mới, có spoiler), có cả bình luận rất dài |
| Báo lỗi chương | 12 báo lỗi đủ 4 loại và 4 trạng thái |
| Yêu cầu gỡ | 6 yêu cầu **hư cấu** (bên gửi, URL, mô tả đều hư cấu), đủ các trạng thái, 1 yêu cầu quá hạn |
| Chat bị báo cáo | 10 tin, 2 phòng (`chung`, `hoi-admin`) |
| Chiến dịch quảng cáo | 6 chiến dịch của **nhãn hàng hư cấu**, đủ các trạng thái, 1 chiến dịch sắp hết hạn |
| Link affiliate | 12 link với tên sản phẩm giả, URL đích dạng `https://example.com/...` |
| Doanh thu nhập tay | 20 dòng giả trong 3 tháng |
| Thống kê | Chuỗi 90 ngày sinh bằng **bộ sinh số ngẫu nhiên có hạt giống** (ổn định giữa các lần chạy): lượt xem, người đọc, nguồn truy cập, thiết bị, click quảng cáo/affiliate |
| Nhật ký | 120 mục ở nhiều loại hành động và người dùng |
| Mẫu nhập hàng loạt | 3 file/đoạn văn mẫu (tự viết) để test: sạch, có chương nhảy cóc, có chương rỗng và trùng số |

Mọi tên người, nhãn hàng, email, URL đều **hư cấu**. Nội dung bình luận lành mạnh (có thể dùng các mẫu "spam" kiểu quảng cáo chung chung để test kiểm duyệt, không dùng nội dung phản cảm hay tên thật).

---

## 9. Khung admin (shell)

- **Sidebar** có nhóm: *Tổng quan · Nội dung (Truyện, Nhập hàng loạt, Thể loại, Tác giả) · Kiểm duyệt (Bình luận, Báo lỗi, Gỡ nội dung, Chat) · Cộng đồng (Người dùng) · Kiếm tiền (Quảng cáo, Affiliate, Thống kê) · Site (SEO, Nội dung trang, Cài đặt) · Hệ thống (Nhật ký, Sao lưu)*. Mục không đủ quyền bị ẩn. Hiện **số đếm trên các mục có hàng đợi** (ví dụ Bình luận 12).
- **Topbar:** breadcrumb, ô tìm nhanh (`CommandSearch`, phím `Ctrl/Cmd+K`: nhảy tới truyện/người dùng/màn hình), chuyển theme/mode, chuông thông báo (các việc cần xử lý), menu tài khoản (đăng xuất).
- **`RoleSwitcherDev`:** chỉ hiện khi `NODE_ENV !== 'production'`, cho phép đổi nhanh giữa 5 vai trò để kiểm tra ma trận quyền.
- **`SessionBanner`:** mô phỏng hết phiên sau 30 phút không hoạt động (cảnh báo trước 2 phút, có nút "Giữ phiên").
- **Responsive:** ≥1024px sidebar cố định; <1024px sidebar thành ngăn kéo; các màn hình hàng đợi (bình luận, báo lỗi, chat, gỡ nội dung) **dùng tốt trên 360px** (thẻ xếp dọc, nút thao tác lớn).
- Mọi bảng: skeleton khi tải, trạng thái rỗng, trạng thái lỗi có nút thử lại.

---

## 10. Đăng nhập giả lập và bảo mật (ở mức giao diện)

- `/admin/dang-nhap`: email + mật khẩu (kiểm tra với tài khoản mẫu), sau đó bước **nhập mã 2FA** (mã mẫu `123456`). Chưa đăng nhập vào `/admin/**` thì chuyển về trang đăng nhập (kiểm tra ở client bằng phiên giả lập, ghi chú rõ trong README đây chỉ là giả lập).
- Giới hạn số lần nhập sai (giả lập, khóa 60 giây ở giao diện).
- Tài khoản có vai trò cao hơn `member` **bắt buộc** bật 2FA: nếu `twoFactor = false` thì hiện màn hình yêu cầu bật trước khi vào.
- **Hành động nguy hiểm** dùng `TypeToConfirmDialog` (gõ lại tên/slug để xác nhận): xóa truyện, xóa chương đã đăng, cấm hàng loạt, đổi vai trò, xóa chiến dịch.
- Mã quảng cáo (HTML/JS của bên thứ ba) **chỉ hiển thị dạng văn bản trong admin, không được chạy/render**.
- Ảnh tải lên: chỉ chấp nhận định dạng/dung lượng cho phép, hiển thị lỗi rõ ràng.
- README ghi rõ: khi có backend, **cưỡng chế quyền ở cơ sở dữ liệu (RLS)** chứ không chỉ ẩn nút; không bao giờ đưa khóa dịch vụ (service key) vào mã chạy ở trình duyệt.

---

## 11. Các màn hình nội dung

### 11.1 Tổng quan (`/admin`)
- **Hàng đợi cần xử lý** (nổi bật nhất, mỗi thẻ có số đếm và nút đi tới): bình luận chờ duyệt, báo lỗi mới, yêu cầu gỡ nội dung chưa xử lý (đánh dấu quá hạn), tin chat bị báo cáo.
- Chương lên lịch sắp đăng (7 ngày), thỏa thuận quyền sắp hết hạn, chiến dịch quảng cáo sắp hết hạn.
- Số liệu nhanh: lượt xem hôm nay/7 ngày, người đọc mới, số truyện/chương, chương đăng gần đây; biểu đồ đường nhỏ.
- Nội dung hiển thị **theo vai trò** (mod không thấy doanh thu; author chỉ thấy truyện của mình).

### 11.2 Truyện
- **Danh sách:** tìm kiếm, lọc (trạng thái, hiển thị, thể loại, người phụ trách, có/không có quyền sử dụng), sắp xếp, chọn cột, **thao tác hàng loạt** (ẩn/công khai, đổi trạng thái, gán người phụ trách, đề cử).
- **Biểu mẫu truyện** (`StoryForm`, chia mục): thông tin cơ bản (tên, slug tự sinh và sửa được, tác giả, tóm tắt), thể loại phụ/nhãn (`TagInput`), trạng thái, kiểu kết, **ảnh bìa** (tải lên, cắt đúng tỷ lệ 2:3, xem trước; hoặc dùng bìa tự sinh), hiển thị/đề cử, người phụ trách, SEO riêng (tiêu đề, mô tả, có bộ đếm ký tự và xem trước kết quả Google).
- **`RightsPanel`:** theo mục 6.4. Khi chưa đủ, hiện cảnh báo đỏ và khóa nút công khai, kèm lý do.
- Kiểm tra hợp lệ bằng `zod`, báo lỗi tiếng Việt theo từng trường, cảnh báo khi rời trang có thay đổi chưa lưu.

### 11.3 Chương
- **Danh sách chương của truyện:** cột (số chương, tên, số từ, trạng thái, người phụ trách, cập nhật), lọc theo trạng thái/người phụ trách, đổi trạng thái hàng loạt, chọn nhiều chương để hẹn giờ, nút mở xem trước ngoài site.
- **`WorkflowStepper`:** thanh hiển thị các bước, bước hiện tại nổi bật, bấm để chuyển theo quyền ở mục 6.3; chuyển lùi bắt buộc nhập ghi chú.
- **Trình soạn (`ChapterEditor`):** ô soạn văn bản thuần/markdown nhẹ (không WYSIWYG nặng) có đếm từ/ký tự, **tự lưu nháp** (localStorage, hiển thị "Đã lưu lúc ..."), xem trước chia đôi màn hình **đúng giao diện trang đọc** (dùng lại các biến `--reader-*` và font đọc), chế độ tập trung (ẩn mọi thứ ngoài ô soạn), phím tắt lưu (`Ctrl/Cmd+S`).
- **`VersionHistory`:** danh sách phiên bản, xem so sánh với bản hiện tại (hiển thị phần khác biệt), nút khôi phục.
- **Hẹn giờ đăng** (`DateTimePicker`, giờ Việt Nam), đánh số lại chương, gộp/tách chương (giao diện cơ bản), **Tìm và thay thế hàng loạt trong một truyện** (bắt buộc có chế độ xem trước số lượng khớp trước khi áp dụng, ví dụ để sửa tên nhân vật).
- **Beta:** vai trò beta chỉ thấy các chương ở trạng thái `beta`, có ô góp ý theo đoạn (mock) và nút "Xác nhận đã beta".

### 11.4 Nhập hàng loạt
- `ImportDropzone`: tải lên `.txt`/`.docx` (đọc ở phía client, với `.docx` chỉ cần trích văn bản) hoặc dán văn bản dài; ô mẫu tách chương có thể sửa (mặc định "Chương N: Tên").
- **Bước xem trước bắt buộc:** bảng các chương được tách (số, tên, số từ, đoạn đầu), **cảnh báo** (số chương nhảy cóc, trùng số, chương rỗng, chương quá ngắn < 200 từ hoặc quá dài > 6000 từ, ký tự lạ), cho phép sửa số/tên ngay trên bảng, bỏ chọn từng chương.
- Chọn trạng thái đích (`draft` hoặc `ready`, **không** cho đăng thẳng) rồi mới `commitImport`. Hiển thị kết quả (tạo được bao nhiêu chương).

### 11.5 Thể loại, tác giả, nhãn
Bảng CRUD có kéo thả thay đổi thứ tự hiển thị trong menu, gộp mục trùng (chọn nhiều → "Gộp vào..."), đếm số truyện đang dùng, chặn xóa khi còn truyện đang dùng (đề nghị gộp).

---

## 12. Các màn hình kiểm duyệt và cộng đồng

### 12.1 Bình luận (`/admin/binh-luan`)
- Các tab: Chờ duyệt · Bị báo cáo · Có liên kết · Tài khoản mới · Tất cả.
- `CommentQueueItem`: người viết (vai trò, tuổi tài khoản), nội dung (spoiler bị che, bấm để xem), truyện/chương liên quan (liên kết mở nhanh), cờ cảnh báo, số lần bị báo cáo.
- Thao tác một chạm: **Duyệt · Ẩn · Xóa · Ghim · Trả lời (với huy hiệu Admin) · Cảnh báo/Tắt tiếng/Cấm người dùng**. Phím tắt cho người xử lý nhiều (J/K lướt, A duyệt, H ẩn).
- Thao tác hàng loạt; bộ lọc từ khóa cấm và quy tắc chặn liên kết (danh sách chỉnh sửa được, bật/tắt "duyệt trước" cho tài khoản mới).

### 12.2 Báo lỗi chương
Danh sách theo trạng thái; `ChapterReportCard` có nội dung báo, nút **mở thẳng chương trong trình soạn**, gán người xử lý, đổi trạng thái (mới / đang xử lý / đã sửa / bỏ qua), gộp các báo lỗi trùng. Báo lỗi loại `takedown` chuyển được thành một yêu cầu gỡ nội dung.

### 12.3 Yêu cầu gỡ nội dung
- Danh sách theo trạng thái, **đánh dấu quá hạn** (`dueAt`), thẻ chi tiết (người gửi, URL bị yêu cầu, mô tả, bằng chứng, nhật ký xử lý).
- Nút **"Gỡ tạm thời ngay"** (ẩn truyện/chương liên quan) trước khi điều tra, kèm xác nhận; sau đó cập nhật trạng thái (đã gỡ tạm / đang xác minh / đã gỡ hẳn / từ chối) và bắt buộc ghi chú lý do.
- Mỗi hành động tự ghi vào nhật ký của yêu cầu và nhật ký hoạt động. Có mẫu thư trả lời (văn bản mẫu, chưa gửi email thật).

### 12.4 Chat (`/admin/chat`)
- Quản lý phòng: tạo/đóng phòng, phòng chỉ admin được đăng, **chế độ chậm** theo phòng, bật/tắt chat toàn site ("đóng chat khẩn cấp" có xác nhận), tin ghim và đăng thông báo.
- Hàng đợi tin bị báo cáo: xem ngữ cảnh (vài tin trước/sau), **xóa tin, tắt tiếng có thời hạn, cấm, xóa hàng loạt tin của một người**.
- Bộ lọc từ khóa và liên kết cho chat.

### 12.5 Người dùng và vai trò
- Danh sách, tìm kiếm, lọc theo vai trò/trạng thái; trang chi tiết có dòng thời gian hoạt động (bình luận, báo cáo, xử phạt).
- `SanctionDialog`: cảnh báo / tắt tiếng (chọn thời hạn) / cấm / khôi phục, **bắt buộc ghi lý do**.
- Đổi vai trò (chỉ admin, dùng `TypeToConfirmDialog`); hiển thị ma trận quyền của vai trò đang chọn để người đổi biết mình đang cấp gì.

---

## 13. Quảng cáo, affiliate, thống kê

### 13.1 Quảng cáo (`/admin/quang-cao`)
- **Vị trí (slot):** bảng các `placement` đã có ở site người đọc (`home-between`, `list-in-feed`, `story-sidebar`, `story-below-synopsis`, `chapter-mid`, `chapter-end`) với công tắc bật/tắt, kích thước giữ chỗ và ô dán mã (chỉ hiển thị dạng văn bản, kèm cảnh báo "chỉ dán mã từ nguồn tin cậy").
- **Công tắc tổng "Tắt toàn bộ quảng cáo"** (đồng bộ với `NEXT_PUBLIC_ADS_ENABLED` và cài đặt site).
- **Chiến dịch trực tiếp:** danh sách + biểu mẫu (nhãn hàng, banner, link đích, vị trí, ngày bắt đầu/kết thúc, giá chốt, ghi chú hợp đồng), trạng thái tự chuyển theo lịch, cảnh báo chiến dịch **trùng vị trí và trùng thời gian**, **xem trước vị trí hiển thị** bằng chính `AdSlot` của site.
- Nhãn "Quảng cáo/Liên kết tiếp thị" **không có tùy chọn tắt**.

### 13.2 Affiliate (`/admin/affiliate`)
- Danh sách link: tên, chương trình, link đích, slug ngắn (`/go/slug`, tự sinh và kiểm tra trùng), bật/tắt, ghi chú điều kiện chương trình, số click 30 ngày.
- Biểu đồ click theo ngày, theo vị trí hiển thị, theo trang nguồn.
- **`ManualRevenueTable`:** nhập tay doanh thu/hoa hồng theo ngày và nguồn (từ báo cáo của chương trình affiliate), hiển thị tổng theo tháng và **đối chiếu với số click** để tính tỷ lệ chuyển đổi; ghi chú rõ đây là số nhập tay.
- Chỉ **admin** thấy phần doanh thu.

### 13.3 Thống kê (`/admin/thong-ke`)
- Bộ chọn khoảng thời gian (7/30/90 ngày, tùy chọn), so sánh với kỳ trước.
- Biểu đồ: lượt xem, người đọc, thời gian đọc trung bình; **nguồn truy cập** (Google/Facebook/trực tiếp/khác), thiết bị.
- Bảng: truyện/chương xem nhiều; **`DropOffTable`: chương người đọc bỏ đi nhiều nhất** (tỷ lệ rời theo số chương, để biết truyện nào đang mất người đọc).
- Phần cộng đồng: tăng trưởng người dùng, hoạt động bình luận/chat.
- Phần quảng cáo/affiliate (chỉ admin): click, tỷ lệ click, doanh thu nhập tay.
- **Xuất CSV theo tháng** (phục vụ lập media kit chào nhãn hàng).
- Vai trò author chỉ thấy số liệu của truyện mình phụ trách.

---

## 14. Các màn hình còn lại

- **SEO (`/admin/seo`):** bảng ghi đè tiêu đề/mô tả theo truyện/chương, quản lý **chuyển hướng 301** (từ → đến, kiểm tra vòng lặp), danh sách trang `noindex`, trạng thái sitemap (số URL, lần tạo gần nhất, mô phỏng).
- **Nội dung trang (`/admin/noi-dung-trang`):** chọn truyện đề cử trang chủ (kéo thả sắp xếp), sắp xếp các khối trang chủ, banner, **thanh thông báo toàn site** (bật/tắt, nội dung, hạn), sửa các trang tĩnh (điều khoản, chính sách bảo mật, quy định nội dung, liên hệ) bằng trình soạn đơn giản có xem trước.
- **Cài đặt (`/admin/cai-dat`):** tên site, logo, giao diện mặc định cho khách mới, bật/tắt chat, bật/tắt bình luận, **duyệt trước bình luận**, bật/tắt quảng cáo, email liên hệ, tích hợp (ô cấu hình analytics, link Zalo/fanpage), nhắc lịch sao lưu.
- **Nhật ký (`/admin/nhat-ky`):** bảng chỉ đọc (không sửa/xóa), lọc theo người/hành động/đối tượng/ngày, bấm một mục để mở đối tượng liên quan, xuất CSV.
- **Sao lưu (`/admin/sao-luu`):** xuất một truyện hoặc toàn site ra `txt`/`md`/`json` (tạo file ở client từ dữ liệu giả), hiển thị "lần sao lưu gần nhất" và nút nhắc; ghi chú nguyên tắc 3-2-1 (ba bản, hai loại lưu trữ, một bản ở nơi khác).

### Trang công khai đi kèm (thêm vào site người đọc)
`/gui-yeu-cau-go-noi-dung`: biểu mẫu để chủ bản quyền gửi yêu cầu (họ tên, email, tổ chức, URL bị yêu cầu, mô tả, bằng chứng), hiện thông báo đã nhận kèm thời hạn xử lý; gửi vào `takedowns` giả lập, và liên kết từ chân trang.

---

## 15. Thành phần dùng chung

- **`DataTable`:** dựa trên `@tanstack/react-table`; tìm kiếm, lọc, sắp xếp, phân trang, chọn dòng, ẩn/hiện cột, thanh thao tác hàng loạt, **đồng bộ trạng thái lên URL**, hàng skeleton, trạng thái rỗng/lỗi; trên điện thoại chuyển thành dạng thẻ.
- **`ConfirmDialog` / `TypeToConfirmDialog`:** mô tả hậu quả rõ ràng, quản lý focus, đóng bằng Esc.
- **`StatusBadge`, `RoleBadge`:** màu theo token (`--success`, `--warning`, `--danger`, `--role-admin`, `--role-mod`), không chỉ dựa vào màu mà còn có chữ.
- **Biểu mẫu:** `react-hook-form` + `zod`, lỗi theo trường, trạng thái đang lưu, cảnh báo thay đổi chưa lưu.
- **Toast:** thông báo thành công/lỗi, có nút "Hoàn tác" cho các thao tác an toàn (ví dụ ẩn bình luận).
- Truy cập được: điều hướng bàn phím đầy đủ, `focus-visible`, `aria` cho bảng/dialog/menu, tương phản AA ở **cả 8 biến thể theme**.

---

## 16. Hiệu năng và chất lượng

- Tách mã theo route (`dynamic import`) cho các phần nặng: biểu đồ (`recharts`), trình soạn chương, nhập hàng loạt.
- Danh sách dài (chương, bình luận, nhật ký) dùng phân trang hoặc cuộn ảo, không render hàng nghìn dòng.
- Trình soạn chương mượt với chương dài 6000+ từ (không giật khi gõ).
- `scripts/check-tokens` và `scripts/check-contrast` chạy qua ở cả khung admin; kiểm tra bundle người đọc **không chứa** mã admin.

---

## 17. Trình tự thực hiện

Làm lần lượt, mỗi bước chạy được và kiểm tra được trước khi sang bước sau.

| Bước | Việc | Kết quả kiểm tra được |
|---|---|---|
| 1 | Khung admin: layout, sidebar, topbar, đăng nhập + 2FA giả lập, `permissions.ts` + `can()`, `RoleSwitcherDev`, trang 403 | Đổi vai trò thì menu và quyền đổi đúng ma trận |
| 2 | Thành phần dùng chung: `DataTable`, bộ lọc, `ConfirmDialog`, `TypeToConfirmDialog`, `FormField`, `Toast`, `PageHeader`, `StatusBadge` | Trang `/styleguide` (mở rộng) hiển thị đủ ở các theme |
| 3 | Kiểu dữ liệu, dữ liệu giả (mục 8), các lớp `lib/admin/*`, `audit` tự ghi | Gọi hàm trả đúng dữ liệu, thao tác ghi sinh mục nhật ký |
| 4 | **Truyện:** danh sách, biểu mẫu, `RightsPanel` + chốt chặn công khai, tải bìa | Truyện thiếu quyền không công khai được |
| 5 | **Chương:** danh sách, quy trình trạng thái, hẹn giờ, trình soạn + xem trước đúng giao diện đọc, lịch sử phiên bản, tìm và thay thế | Đi hết quy trình từ nháp tới đã đăng đúng theo quyền |
| 6 | **Nhập hàng loạt** với bước xem trước và cảnh báo | 3 mẫu thử cho kết quả và cảnh báo đúng |
| 7 | Thể loại, tác giả, nhãn | Gộp/xóa đúng ràng buộc |
| 8 | **Bình luận** + **Báo lỗi chương** | Xử lý hàng đợi bằng bàn phím và trên 360px |
| 9 | **Yêu cầu gỡ nội dung** + trang công khai gửi yêu cầu | Gỡ tạm thời, ghi nhật ký, cảnh báo quá hạn |
| 10 | **Người dùng và vai trò**, xử phạt | Xử phạt bắt buộc lý do, đổi vai trò cần xác nhận |
| 11 | **Chat** (phòng, chế độ chậm, hàng đợi báo cáo) | Xử lý tin báo cáo, đóng chat khẩn cấp |
| 12 | **Nhật ký hoạt động** | Lọc, mở đối tượng liên quan, xuất CSV |
| 13 | **Tổng quan** (hàng đợi, cảnh báo, số liệu theo vai trò) | Mỗi vai trò thấy đúng phần của mình |
| 14 | **Quảng cáo + Affiliate** (slot, chiến dịch, link, doanh thu nhập tay) | Cảnh báo trùng vị trí/thời gian, `/go/slug` khớp với site người đọc |
| 15 | **Thống kê** + xuất CSV | Biểu đồ đúng, author chỉ thấy truyện của mình |
| 16 | SEO, Nội dung trang, Cài đặt, Sao lưu/xuất | Xuất file tải về đúng định dạng |
| 17 | Rà soát: tương phản 8 biến thể, bàn phím, 360px cho hàng đợi, hiệu năng trình soạn, bundle người đọc không chứa mã admin | Đạt các tiêu chí ở mục 18 |

**Nếu cần ưu tiên tiến độ:** hoàn thiện theo thứ tự **A** (bước 1-9, 12: để đăng và quản lý nội dung, xử lý khiếu nại) → **B** (bước 10-11, 13: để vận hành cộng đồng) → **C** (bước 14-16: để kiếm tiền). Các bước ở nhóm sau chỉ có ý nghĩa khi đã có lượng truy cập.

---

## 18. Tiêu chí nghiệm thu

1. Đăng nhập giả lập (có 2FA) hoạt động; chưa đăng nhập thì không vào được `/admin/**`; tài khoản vai trò cao mà chưa bật 2FA bị chặn.
2. Đổi giữa 5 vai trò bằng `RoleSwitcherDev` cho kết quả đúng với **ma trận quyền ở mục 6.2**: menu, nút, màn hình, số liệu đều theo quyền.
3. Truyện chưa khai báo quyền sử dụng **không thể chuyển sang công khai**; thỏa thuận sắp hết hạn có cảnh báo trên Tổng quan.
4. Một chương đi hết quy trình `draft → ... → published` đúng quyền từng bước; chuyển lùi bắt buộc ghi chú; mỗi lần đổi đều có mục trong nhật ký.
5. Trình soạn chương: tự lưu nháp, xem trước đúng giao diện đọc, lịch sử phiên bản khôi phục được; chương dài 6000+ từ gõ không giật.
6. Nhập hàng loạt luôn qua bước xem trước và **không cho đăng thẳng**; 3 mẫu thử cho đúng cảnh báo.
7. Hàng đợi bình luận/báo lỗi/gỡ nội dung/chat **xử lý được hoàn toàn trên màn hình 360px**; bình luận có phím tắt trên máy tính.
8. Yêu cầu gỡ nội dung: "gỡ tạm thời ngay" hoạt động, hạn xử lý quá hạn được đánh dấu, mọi bước ghi vào nhật ký.
9. Hành động nguy hiểm đều dùng `TypeToConfirmDialog`; mọi thao tác ghi sinh mục nhật ký; nhật ký không có chức năng sửa/xóa.
10. Quảng cáo: bật/tắt từng vị trí và tắt toàn bộ hoạt động; cảnh báo chiến dịch trùng vị trí và thời gian; mã quảng cáo **không bao giờ được chạy** trong admin; không có tùy chọn tắt nhãn "Quảng cáo".
11. Affiliate: slug `/go/slug` tự sinh, kiểm tra trùng; doanh thu nhập tay đối chiếu được với click; chỉ admin thấy doanh thu.
12. Thống kê có `DropOffTable` và xuất CSV theo tháng; author chỉ thấy truyện của mình.
13. Xuất truyện/toàn site ra `txt`/`md`/`json` tải về được.
14. `check-tokens`, `check-contrast` đạt; admin đúng ở cả 8 biến thể theme; điều hướng bàn phím đầy đủ; bundle người đọc không chứa mã admin.
15. Không có dữ liệu cứng trong component; mọi truy cập dữ liệu qua `lib/admin/*` với đúng chữ ký ở mục 7.2.

---

## 19. Cách làm việc yêu cầu ở bạn (AI)

1. **Trước khi viết code**, trả lời bằng một bản kế hoạch ngắn: cấu trúc bạn sẽ dùng, các giả định, và các điểm mơ hồ (chỉ hỏi lại những điều **thật sự chặn**; còn lại tự đưa giả định hợp lý và ghi lại).
2. Làm **theo trình tự mục 17**, mỗi bước chạy `lint`, `type-check`, `check-tokens`, `check-contrast` trước khi báo hoàn thành bước đó.
3. **Không** tự thêm tính năng ngoài mục 2. Điều gì cần thêm, ghi vào danh sách "Đề xuất" ở cuối báo cáo.
4. Giữ **chữ ký** của các hàm trong mục 7.2 và **ma trận quyền** ở mục 6.2 đúng như yêu cầu.
5. Mọi chuỗi giao diện bằng tiếng Việt tự nhiên và nhất quán, đặt trong `lib/admin/copy.ts`.
6. Tất cả dữ liệu giả phải **hư cấu và lành mạnh**; không dùng tên người, nhãn hàng, email, URL có thật.
7. Khi kết thúc, cập nhật `README.md` với phần admin: cách chạy, tài khoản và mã 2FA mẫu cho từng vai trò, cấu trúc thư mục, cách thêm một module/quyền mới, cách thay dữ liệu giả bằng Supabase (liệt kê từng hàm trong `lib/admin/*` cần viết lại và bảng dữ liệu tương ứng: `profiles.role`, `chapter_versions`, `stories.rights_*`, `takedown_requests`, `ad_slots`, `ad_campaigns`, `affiliate_links`, `link_clicks`, `site_settings`, `audit_logs`, `moderation_rules`), danh sách những việc chưa làm, và nhắc rõ việc phân quyền thật phải cưỡng chế ở backend (RLS).
