# PROMPT: Xây dựng giao diện (frontend) website đọc truyện ngôn tình

**Cách dùng:** dán toàn bộ nội dung từ mục 0 trở xuống vào AI (Claude Code, Cursor, v0, Lovable...). Nếu công cụ giới hạn độ dài, gửi mục 0-8 trước, rồi gửi các mục còn lại theo trình tự ở mục 16.

---

## 0. Vai trò và mục tiêu

Bạn là kỹ sư frontend senior kiêm UI designer. Hãy xây dựng **toàn bộ giao diện (chưa có backend)** cho một website đọc truyện chữ tiếng Việt chuyên **một thể loại duy nhất: ngôn tình**. Toàn bộ dữ liệu, bình luận và chat ở giai đoạn này là **dữ liệu giả (mock)**, nhưng phải được đặt sau các lớp truy cập dữ liệu có giao diện cố định để sau này thay bằng Supabase mà **không phải sửa component**.

Mục tiêu kinh doanh của chủ site: chạy quảng cáo hiển thị, affiliate và hợp đồng quảng cáo trực tiếp. Vì vậy giao diện phải có sẵn vị trí quảng cáo/affiliate được thiết kế đúng (mục 14), tốc độ tải tốt và thân thiện SEO.

Ba nguyên tắc xuyên suốt:
1. **Trải nghiệm đọc là số một.** Khu đọc chương phải gần như "biến mất", chỉ còn chữ.
2. **Mọi thứ đi qua token và lớp dữ liệu.** Không viết cứng màu/font ngoài `styles/themes`, không viết cứng dữ liệu trong component.
3. **Nhiều giao diện cho người dùng tự chọn** (mục 8), nên mọi component phải đúng ở tất cả biến thể.

---

## 1. Bối cảnh sản phẩm

- Ngôn ngữ giao diện và nội dung: **tiếng Việt** (`<html lang="vi">`). Mọi chuỗi giao diện đặt tập trung trong `lib/copy.ts`.
- Thể loại duy nhất là **ngôn tình**. Menu "Thể loại" thực chất là **các thể loại phụ/nhãn của ngôn tình** (danh sách ở mục 7.1).
- Người đọc chủ yếu dùng điện thoại, thường đọc lâu và đọc ban đêm.
- Giao diện mặc định hướng tới độc giả ngôn tình: ấm, mềm, thanh lịch (xem mục 8.4).
- Nội dung test phải **phù hợp mọi lứa tuổi** (không có cảnh nhạy cảm tình dục hay bạo lực chi tiết), vì site sẽ chạy quảng cáo.

---

## 2. Phạm vi

### Làm trong giai đoạn này
- Toàn bộ trang của người đọc (mục 4), hệ thống theme (mục 8), trang đọc đầy đủ (mục 11).
- Giao diện bình luận + báo lỗi chương (mục 12) và phòng chat chung (mục 13) chạy trên dữ liệu giả.
- Khung quảng cáo/affiliate (mục 14), SEO, hiệu năng, truy cập được (mục 15).
- Bộ dữ liệu test ngôn tình (mục 7).

### Không làm
Backend thật, đăng nhập thật, lưu bình luận/đánh giá thật, đồng bộ đa thiết bị, trang quản trị, nhập chương hàng loạt, thống kê thật, thanh toán/VIP, audio, thông báo đẩy. Trang đăng nhập/đăng ký chỉ làm **giao diện**.

---

## 3. Công nghệ và nguyên tắc kiến trúc

| Hạng mục | Yêu cầu |
|---|---|
| Framework | Next.js bản ổn định mới nhất, **App Router**, TypeScript `strict` |
| Style | Tailwind CSS + biến CSS (CSS custom properties) |
| Font/ảnh | `next/font` (subset `vietnamese` + `latin`, `display: swap`), `next/image` |
| Icon | `lucide-react` |
| Tiện ích | `clsx` (hoặc tương đương). **Không** dùng thư viện UI nặng, không Redux |
| Chất lượng | ESLint + Prettier; Vitest cho các hàm tiện ích (không bắt buộc cho component) |

Quy tắc kiến trúc:
1. **Server Components mặc định.** Chỉ dùng Client Component khi cần tương tác: bảng cài đặt đọc, tủ truyện/lịch sử, bình luận, chat, theme picker, bộ lọc.
2. **KHÔNG đọc `cookies()`/`headers()` trong layout hoặc trang truyện/chương**, vì sẽ mất cache tĩnh/ISR. Lưu lựa chọn người dùng bằng **localStorage** + script chạy sớm (mục 8.3).
3. Trang truyện/chương/danh sách dùng **ISR hoặc static generation** (`generateStaticParams` cho một phần dữ liệu mock, `revalidate` hợp lý).
4. Chat, bình luận, theme picker, bảng cài đặt đọc **nạp lười** (`dynamic import`) để không làm nặng trang đọc.
5. Mobile-first, kiểm tra ở 360px, 768px, 1280px.
6. Không có mã màu dạng `#xxxxxx` hay tên font nằm ngoài `src/styles/themes/` và `src/app/fonts.ts`. Thêm một script `pnpm check:tokens` (hoặc tương đương) để quét và báo lỗi.

---

## 4. Sơ đồ route

| Route | Trang | Ghi chú |
|---|---|---|
| `/` | Trang chủ | |
| `/truyen/[slug]` | Chi tiết truyện | Danh sách chương phân trang bằng `?page=` |
| `/truyen/[slug]/[chuong]` | Trang đọc | Tham số dạng `chuong-12`; tự viết `parseChapterParam()` (App Router không hỗ trợ tiền tố trong segment) |
| `/the-loai/[slug]` | Danh sách theo thể loại phụ | |
| `/danh-sach/[loai]` | `truyen-moi`, `truyen-full`, `truyen-hot` | |
| `/tim-kiem` | Tìm kiếm + bộ lọc | `?q=`, đồng bộ bộ lọc lên URL, `noindex` |
| `/bang-xep-hang` | Xếp hạng ngày/tuần/tháng | |
| `/tu-truyen` | Tủ truyện | Đọc từ localStorage, `noindex` |
| `/lich-su` | Lịch sử đọc | Đọc từ localStorage, `noindex` |
| `/chat` | Phòng chat toàn màn hình | `noindex` |
| `/cai-dat` | Cài đặt giao diện + trang đọc | `noindex` |
| `/dang-nhap`, `/dang-ky` | Chỉ giao diện | `noindex` |
| `/go/[id]` | Chuyển hướng affiliate (khung) | Hiện tại chỉ chuyển tới URL mock, `noindex` |
| `/dieu-khoan`, `/chinh-sach-bao-mat`, `/quy-dinh-noi-dung`, `/lien-he` | Trang tĩnh pháp lý | Viết nội dung mẫu hợp lý |
| `/styleguide` | Ma trận giao diện nội bộ | Chỉ hiện khi `NODE_ENV !== 'production'` |
| `not-found` | 404 | Có gợi ý truyện và ô tìm kiếm |

---

## 5. Cấu trúc thư mục

```
src/
├─ app/
│  ├─ layout.tsx  fonts.ts  globals.css  sitemap.ts  robots.ts  not-found.tsx
│  ├─ page.tsx
│  ├─ truyen/[slug]/page.tsx
│  ├─ truyen/[slug]/[chuong]/page.tsx
│  ├─ the-loai/[slug]/page.tsx
│  ├─ danh-sach/[loai]/page.tsx
│  ├─ tim-kiem/  bang-xep-hang/  tu-truyen/  lich-su/  chat/  cai-dat/
│  ├─ dang-nhap/  dang-ky/  go/[id]/  styleguide/
│  └─ (static)/dieu-khoan  chinh-sach-bao-mat  quy-dinh-noi-dung  lien-he
├─ components/
│  ├─ layout/    Header, MegaMenu, Footer, MobileNav, SearchBox
│  ├─ story/     StoryCard, StoryGrid, StoryListItem, StoryMeta, StatusBadge, RatingStars, GeneratedCover
│  ├─ chapter/   ChapterList, ChapterPagination, ChapterNav, ChapterContent
│  ├─ reader/    ReaderToolbar, ReaderSettingsPanel, ChapterDrawer
│  ├─ comments/  CommentSection, CommentForm, CommentItem, CommentReplies, AdminBadge, ReportCommentDialog
│  ├─ chat/      ChatLauncher, ChatPanel, ChatHeader, RoomTabs, PinnedMessage, ChatRulesBanner,
│  │             MessageList, MessageItem, ReplyQuote, SystemMessage, ChatInput,
│  │             OnlineUsersDrawer, LoginPrompt, MessageActionsMenu, ReportMessageDialog
│  ├─ theme/     ThemePicker, ThemePreviewCard, ModeToggle
│  ├─ ads/       AdSlot, AffiliateBox, SponsoredLabel
│  ├─ shared/    Pagination, Breadcrumb, Skeleton, EmptyState, FilterBar, ErrorState
│  └─ ui/        Button, IconButton, Modal, Drawer, Tabs, Dropdown, Chip, Toast
├─ lib/
│  ├─ data/      stories.ts  chapters.ts  genres.ts  ranking.ts   # lớp truy cập dữ liệu (mục 6)
│  ├─ comments/  index.ts                                          # lớp bình luận
│  ├─ chat/      index.ts  mockClient.ts                           # lớp chat
│  ├─ mock/      stories.json  handwritten-chapters/  generators.ts  SOURCES.md
│  ├─ storage/   readerSettings.ts  history.ts  bookmarks.ts  theme.ts
│  ├─ theme/     themes.ts  noFlashScript.ts
│  ├─ seo/       metadata.ts  jsonld.ts
│  ├─ utils/     slug.ts  format.ts  parseChapterParam.ts  normalizeVi.ts
│  └─ copy.ts                                                      # mọi chuỗi giao diện
├─ hooks/        useTheme  useReaderSettings  useBookmarks  useReadingHistory  useChat
├─ types/        story.ts  chapter.ts  genre.ts  comment.ts  chat.ts
├─ styles/themes/  paper.css  minimal.css  guofeng.css  webnovel.css  reader-themes.css
└─ scripts/      check-tokens  check-contrast
```

---

## 6. Kiểu dữ liệu và lớp truy cập dữ liệu

### 6.1 Kiểu dữ liệu

```ts
type Status = 'ongoing' | 'full' | 'paused';

type Story = {
  id: string; slug: string; title: string;
  cover?: string;                 // không có thì dùng <GeneratedCover/>
  author: string;                 // bút danh hư cấu
  genres: string[];               // slug thể loại phụ, ví dụ ['hien-dai','sung']
  ending?: 'HE' | 'SE' | 'OE';
  status: Status; synopsis: string;
  rating: number;                 // 0-10
  ratingCount: number; views: number;
  totalChapters: number; latestChapter: number;
  updatedAt: string; createdAt: string;
};

type ChapterMeta = { storyId: string; number: number; title: string; updatedAt: string };
type Chapter = ChapterMeta & { content: string };   // content: các đoạn cách nhau bằng "\n\n"
type Genre = { slug: string; name: string; description?: string };
type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
```

### 6.2 Giao diện lớp `lib/data` (BẮT BUỘC giữ chữ ký này)

```ts
listStories(opts: {
  genre?: string; status?: Status;
  sort?: 'updated' | 'views' | 'rating' | 'new';
  page?: number; pageSize?: number;
  minChapters?: number; maxChapters?: number;
}): Promise<Paginated<Story>>
getStoryBySlug(slug: string): Promise<Story | null>
getChaptersPage(slug: string, page: number, pageSize?: number /* mặc định 50 */): Promise<Paginated<ChapterMeta>>
getChapter(slug: string, n: number): Promise<{ chapter: Chapter; prev: number | null; next: number | null } | null>
searchStories(q: string, page?: number): Promise<Paginated<Story>>   // KHÔNG phân biệt dấu: "tong tai" khớp "Tổng tài"
listGenres(): Promise<Genre[]>
getRanking(period: 'day' | 'week' | 'month'): Promise<Story[]>
getRelatedStories(slug: string): Promise<Story[]>
```

Mọi hàm là `async` (giả lập độ trễ 50-200ms ở chế độ dev để test skeleton). Đặt một cờ cấu hình `DATA_SOURCE = 'mock'` để sau này đổi sang `'supabase'`.

### 6.3 Bình luận (`lib/comments`)

```ts
type Comment = {
  id: string; storyId: string; chapterNumber?: number; parentId?: string;
  user: { id: string; name: string; avatar?: string; role: 'member' | 'mod' | 'admin' };
  content: string; isSpoiler: boolean; likes: number;
  status: 'visible' | 'pending' | 'hidden'; createdAt: string;
};
listComments(storyId, opts: { chapterNumber?, sort: 'new' | 'top', cursor? }): Promise<{ items: Comment[]; nextCursor?: string }>
postComment(input): Promise<Comment>          // mock: trả về status 'pending' với tài khoản mới
likeComment(id): Promise<void>;  reportComment(id, reason): Promise<void>
reportChapterError(storyId, chapterNumber, message): Promise<void>
```

### 6.4 Chat (`lib/chat`)

```ts
type ChatMessage = {
  id: string; roomId: string;
  user: { id: string; name: string; avatar?: string; role: 'member' | 'mod' | 'admin' };
  content: string; replyToId?: string; isPinned?: boolean;
  status: 'visible' | 'deleted'; createdAt: string;
};
type ChatRoom = { id: string; slug: string; name: string; adminOnly?: boolean; slowModeSec?: number };

interface ChatClient {
  subscribe(roomId: string, onMessage: (m: ChatMessage) => void): () => void;   // trả về hàm hủy đăng ký
  send(roomId: string, content: string, replyToId?: string): Promise<{ ok: true } | { ok: false; reason: 'slow_mode' | 'muted' | 'banned' | 'too_long' | 'offline' }>;
  loadOlder(roomId: string, beforeId: string, limit: number): Promise<ChatMessage[]>;
  onPresence(roomId: string, cb: (count: number) => void): () => void;
  getRooms(): Promise<ChatRoom[]>;
  getPinned(roomId: string): Promise<ChatMessage | null>;
}
```

`mockClient.ts` tự sinh tin nhắn mỗi 3-8 giây (chỉ ở dev) để thử giao diện, mô phỏng cả trạng thái mất kết nối, bị mute, chế độ chậm.

### 6.5 Dữ liệu lưu cục bộ (localStorage, có `try/catch` và phiên bản schema)

- `reader-settings` (cài đặt đọc), `history` (lịch sử: storyId, chapter, scrollRatio, updatedAt, tối đa 200 mục), `bookmarks` (tủ truyện), `theme`, `mode`, `chat-prefs` (bật/tắt âm báo, ẩn chat).
- Đồng bộ giữa các tab bằng sự kiện `storage`.

---

## 7. Dữ liệu test (chuyên ngôn tình)

### 7.1 Thể loại phụ (menu "Thể loại")

Hiện đại · Cổ đại · Xuyên không · Trọng sinh · Cung đấu · Hào môn · Học đường · Showbiz · Điền văn · Sủng · Ngược · Chữa lành · Đoản văn · Hài hước.

### 7.2 Danh sách truyện

Tạo **24 truyện** với dữ liệu **hoàn toàn hư cấu**:
- Tên truyện và bút danh tác giả do bạn nghĩ ra, **văn phong kiểu ngôn tình**. **Không trùng tên truyện hay tác giả có thật** (kiểm tra nhanh bằng tìm kiếm trên web; nếu nghi ngờ trùng thì đổi tên).
- Phân bố: khoảng 8 truyện `full`, 14 `ongoing`, 2 `paused`; mỗi truyện 1-3 thể loại phụ; có `ending` (HE/SE/OE) ở các truyện full.
- Tóm tắt 80-150 từ, **viết mới**, phù hợp mọi lứa tuổi.
- `rating`, `views`, `ratingCount`, ngày cập nhật: sinh bằng **bộ sinh số giả ngẫu nhiên có hạt giống (seeded)** để kết quả ổn định giữa các lần chạy.
- Ảnh bìa: **không dùng ảnh có bản quyền**. Dùng component `GeneratedCover` (nền gradient theo token màu của giao diện hiện tại + tên truyện + họa tiết SVG nhỏ). Khoảng 4 truyện cố tình để trống `cover` để test fallback.

### 7.3 Số chương (để test phân trang và hiệu năng)

| Nhóm | Số truyện | Số chương |
|---|---|---|
| Rất dài | 1 | `totalChapters = 3000` (chương sinh động bằng hàm, không lưu 3000 file) |
| Dài | 3 | 150-400 |
| Vừa | 5 | 30-80 |
| Ngắn | 11 | 5-25 |
| Đoản văn | 4 | 1-5 (trong đó 1 truyện đúng 1 chương) |

### 7.4 Nội dung chương

- **Viết tay (thật) tối thiểu 3 chương đầu cho 6 truyện** (mỗi chương 800-1500 từ), **văn xuôi gốc do bạn viết**, đặt trong `lib/mock/handwritten-chapters/`. Văn phong đúng thể loại ngôn tình (đối thoại gạch đầu dòng "—", nội tâm, đoạn dài ngắn xen kẽ). Mục đích: thử trải nghiệm đọc bằng văn bản đủ thật.
- **Các chương còn lại sinh động bằng `generators.ts`**: ghép từ một kho đoạn văn gốc (khoảng 40-60 đoạn bạn tự viết) bằng hạt giống `storySlug + chapterNumber`, mỗi chương 800-2000 từ, để mỗi chương khác nhau nhưng ổn định giữa các lần tải.
- **Các ca đặc biệt cần có** (test giao diện):
  - tên truyện rất dài (≥ 80 ký tự) và tên chương rất dài;
  - chương có nhiều đoạn đối thoại ngắn, có dấu "…", ngoặc kép, chữ Việt nhiều dấu chồng;
  - một chương rất dài (≥ 4000 từ);
  - truyện 1 chương, truyện `paused`, truyện không có bìa, truyện chưa có đánh giá (`ratingCount = 0`).

### 7.5 Nếu muốn có văn bản thật dài hơn để thử nghiệm

Bạn **được phép** tìm thêm tối đa 3-5 tác phẩm lãng mạn **thuộc phạm vi công cộng** (tác giả đã mất từ 50 năm trở lên; **bản dịch cũng phải hết hạn bản quyền**), với điều kiện:
- Kiểm chứng tình trạng bản quyền; ghi **tên tác phẩm, tác giả, năm mất, nguồn lấy văn bản** vào `src/lib/mock/SOURCES.md`.
- Nếu **không kiểm chứng chắc chắn được**, thì **không dùng** và quay lại văn bản gốc do bạn viết ở mục 7.4.
- **Tuyệt đối không** cào/sao chép nội dung từ các website truyện, và không chép truyện ngôn tình đang còn bản quyền (kể cả "chỉ để test").

### 7.6 Dữ liệu bình luận và chat giả

- **Bình luận:** khoảng 40 bình luận rải trên 8 truyện, có trả lời một cấp, có phản hồi của admin (huy hiệu), có bình luận `isSpoiler`, có bình luận `pending`, có bình luận rất dài và bình luận có emoji.
- **Chat:** kho 60-80 tin nhắn mẫu cho 2 phòng (`chung`, `hoi-admin`), có tin ghim của admin, tin trả lời, tin nhắc `@admin`, tin hệ thống ("X đã tham gia"). Ở dev, `mockClient` phát tin mới liên tục.
- Tên người dùng, nội dung: hoàn toàn hư cấu, lành mạnh.

---

## 8. Hệ thống giao diện (theme) cho người dùng tự chọn

### 8.1 Mô hình ba lớp độc lập

| Lớp | Người dùng chọn | Ảnh hưởng |
|---|---|---|
| **Giao diện (style)** | `paper` Giấy ấm · `minimal` Tối giản · `guofeng` Cổ phong · `webnovel` Webnovel | Màu, font, bo góc, đổ bóng, họa tiết, mật độ |
| **Chế độ (mode)** | Sáng / Tối / Tự động theo thiết bị | Bản sáng hoặc bản tối của giao diện đã chọn |
| **Theme trang đọc** | "Theo giao diện site" hoặc một trong 7 theme đọc | Chỉ khu vực đọc chữ |

Tổng cộng **4 giao diện × 2 chế độ = 8 bộ token**.

### 8.2 Token cần định nghĩa cho mỗi bộ

| Nhóm | Token |
|---|---|
| Màu | `--bg --surface --surface-2 --text --text-muted --border --accent --accent-contrast --accent-soft --success --warning --danger --overlay --role-admin --role-mod` |
| Chữ | `--font-ui --font-heading --font-read` |
| Hình dạng | `--radius-sm --radius-md --radius-lg --border-w --shadow-card` |
| Hiệu ứng | `--bg-pattern` (mặc định `none`), `--motion-fast` |
| Mật độ | `--space-unit` |

Cấu trúc chọn: `[data-theme="paper"][data-mode="light"] { ... }`. **Không dùng tiền tố `dark:` của Tailwind** rải trong component; ánh xạ màu Tailwind sang biến (`bg: 'var(--bg)'`, `text: 'var(--text)'`, `accent: 'var(--accent)'`...).

### 8.3 Áp dụng và chống nháy giao diện

Lưu bằng localStorage, áp dụng bằng script đặt trong `<head>`, chạy trước khi vẽ trang. `<html>` thêm `suppressHydrationWarning`.

```js
(function(){try{
  var t = localStorage.getItem('theme') || 'paper';
  var m = localStorage.getItem('mode') || 'auto';
  if (m === 'auto') m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var d = document.documentElement; d.dataset.theme = t; d.dataset.mode = m;
}catch(e){}})();
```

Danh sách đăng ký (thêm giao diện mới chỉ cần thêm một dòng và một khối CSS):

```ts
export const THEMES = [
  { id: 'paper',    name: 'Giấy ấm',  desc: 'Ấm áp như trang sách',        modes: ['light', 'dark'] },
  { id: 'minimal',  name: 'Tối giản', desc: 'Sạch sẽ, tập trung',          modes: ['light', 'dark'] },
  { id: 'guofeng',  name: 'Cổ phong', desc: 'Mực, son và vàng đồng',       modes: ['light', 'dark'] },
  { id: 'webnovel', name: 'Webnovel', desc: 'Hiện đại, điểm nhấn tím',     modes: ['light', 'dark'] },
] as const;
```

### 8.4 Giá trị khởi đầu của 8 bộ token

Đây là **giá trị khởi đầu**. Bạn phải chạy `scripts/check-contrast` và **tinh chỉnh để đạt tương phản tối thiểu 4,5:1** (WCAG AA) cho các cặp: chữ/nền, chữ phụ/nền, chữ/bề mặt, chữ trên nút nhấn, màu nhấn/nền (dùng làm liên kết), mà vẫn giữ tinh thần màu của giao diện.

| Giao diện | Chế độ | bg | surface | text | text-muted | border | accent |
|---|---|---|---|---|---|---|---|
| **paper** (mặc định) | sáng | `#FAF6EE` | `#FFFDF8` | `#2B2420` | `#6B5E55` | `#E7DCCB` | `#8C3B2E` |
| paper | tối | `#1C1815` | `#26211D` | `#E8DFD3` | `#A89B8C` | `#3A322B` | `#D98B78` |
| **minimal** | sáng | `#F8F9FB` | `#FFFFFF` | `#1B1F27` | `#5B6472` | `#E2E6EC` | `#2563EB` |
| minimal | tối | `#121418` | `#1B1E24` | `#E6E8EB` | `#9AA1AC` | `#2A2F37` | `#6EA0FF` |
| **guofeng** | sáng ("giấy dó") | `#F3ECDD` | `#FBF6EA` | `#231D17` | `#6A5E50` | `#D9CBB0` | `#A82E22` (+ vàng đồng `#9A7A2E`) |
| guofeng | tối | `#14110F` | `#1E1A17` | `#EAE2D6` | `#A89E90` | `#3A322A` | `#C0392B` (+ vàng đồng `#C9A24B`) |
| **webnovel** | sáng | `#F6F6FB` | `#FFFFFF` | `#1A1B26` | `#5C6070` | `#E3E4EE` | `#5B3FE0` |
| webnovel | tối | `#0F1115` | `#171A21` | `#E7E9F0` | `#9BA1B0` | `#262B36` | `#7C5CFF` |

Đặc trưng hình dạng/phông của từng giao diện:

| Giao diện | Bo góc | Đổ bóng | Phông tiêu đề | Điểm riêng |
|---|---|---|---|---|
| paper | 10px | mềm, ấm | serif (Noto Serif / Lora / Literata) | Nền kem, cảm giác trang sách |
| minimal | 8px | không bóng, chỉ viền mảnh | sans (Be Vietnam Pro) | Gọn, nhiều khoảng trắng |
| guofeng | 4px | không bóng, viền kép mảnh màu vàng đồng | serif (Playfair Display hoặc Noto Serif) | Họa tiết nền rất nhẹ bằng CSS/SVG inline nhỏ |
| webnovel | 12px | hơi phát sáng ở nút chính | sans (Be Vietnam Pro) | Nhấn tím, hiện đại |

**Màu trạng thái (giữ nguyên ý nghĩa ở mọi giao diện):** Full = xanh lá; Đang ra = xanh dương hoặc cam; Hot/Mới = đỏ; sao đánh giá = vàng; huy hiệu Admin/Mod dùng token riêng `--role-admin`, `--role-mod` (không trùng `--accent` ở bất kỳ giao diện nào).

### 8.5 Font

Tổng cộng **tối đa 3 họ font**:
1. **Be Vietnam Pro**: giao diện (menu, nút, nhãn), subset `vietnamese`.
2. Một **serif** có hỗ trợ tiếng Việt đầy đủ (Noto Serif hoặc Literata): tiêu đề của paper/guofeng và chữ đọc mặc định.
3. **Playfair Display** (tùy chọn, chỉ cho tiêu đề lớn của guofeng).

Các font dành riêng cho người đọc tự chọn trong bảng cài đặt (ngoài 3 họ trên) **chỉ tải khi người dùng chọn**. Kiểm tra mọi font hiển thị đúng dấu tiếng Việt (ví dụ "ữ", "ợ", "ề", "ẫ").

### 8.6 Theme của trang đọc

7 theme đọc, đặt dưới dạng biến `--reader-bg`, `--reader-text`:

| Theme | Nền | Chữ |
|---|---|---|
| Theo giao diện site (mặc định) | `var(--bg)` | `var(--text)` |
| Sáng | `#FFFFFF` | `#222222` |
| Giấy | `#FAF6EE` | `#2B2420` |
| Sepia | `#F1E7D0` | `#3B3022` |
| Xám | `#E8E8E8` | `#222222` |
| Xanh nhạt | `#E6F0EA` | `#1F2A24` |
| Tối | `#1A1A1A` | `#D6D6D6` |
| Đen (OLED) | `#000000` | `#BDBDBD` |

Không dùng `#000` trên `#FFF`; không dùng trắng tinh trên nền đen (giữ chữ khoảng `#D0D0D0`).

### 8.7 Giao diện chọn style

- Header có nút bảng màu mở `ThemePicker` và nút đổi sáng/tối nhanh.
- `ThemePicker`: lưới 4 `ThemePreviewCard`. **Thẻ xem trước dựng bằng chính token thật** của giao diện đó (bìa mẫu, nút, tiêu đề) chứ không dùng ảnh. Có chọn Sáng/Tối/Tự động và tùy chọn "Trang đọc: theo giao diện site / chọn riêng".
- Áp dụng tức thì khi bấm, không cần nút "Lưu". Có nút "Khôi phục mặc định".
- Trang `/cai-dat` lặp lại các lựa chọn này cùng toàn bộ cài đặt trang đọc.
- Lựa chọn giữ nguyên sau khi tải lại và đồng bộ giữa các tab.

### 8.8 Trang `/styleguide` (ma trận)

Hiển thị cạnh nhau toàn bộ component (màu, chữ, nút, chip, `StoryCard`, huy hiệu, ô bình luận, bong bóng chat, khung quảng cáo, form) ở **cả 8 biến thể**. Đây là nơi kiểm tra chính; dựng nó ngay sau hệ thống theme (bước 1b).

---

## 9. Layout chung

- **Header:** logo (SVG dùng `currentColor`/token, đúng ở mọi giao diện), menu "Danh sách" (Truyện mới cập nhật, Truyện hot, Truyện full, Xếp hạng), mega-menu "Thể loại" (14 thể loại phụ, nhiều cột), ô tìm kiếm (có gợi ý khi gõ), nút theme/mode, nút đăng nhập (UI), nút mở chat.
- **Mobile:** menu dạng ngăn kéo, ô tìm kiếm thu gọn, thanh điều hướng dưới (tùy chọn: Trang chủ, Thể loại, Tủ truyện, Lịch sử, Cài đặt).
- **Footer:** liên kết pháp lý, liên hệ, dòng nêu cách gửi yêu cầu gỡ nội dung vi phạm.
- **Chiều rộng:** khu duyệt tối đa ~1200px; khu đọc tối đa ~720px.
- Lưới khoảng cách theo bội số của 8px.

---

## 10. Từng trang (ngoài trang đọc)

### 10.1 Trang chủ
Các khối theo thứ tự: truyện đề cử (carousel nhẹ hoặc lưới, **không tự chạy**) → mới cập nhật (danh sách có chương mới nhất và thời gian) → truyện hot → **Sủng ngọt** → **Ngược tâm** → **Cổ đại** → **Hiện đại** → truyện full → bảng xếp hạng rút gọn (tab ngày/tuần/tháng). Có vị trí `AdSlot` giữa các khối (mục 14).

### 10.2 Danh sách / thể loại / tìm kiếm
- `StoryCard` (lưới) và `StoryListItem` (danh sách) cho phép đổi cách xem.
- `FilterBar`: thể loại phụ, trạng thái, khoảng số chương, kết thúc (HE/SE/OE), sắp xếp (mới cập nhật / xem nhiều / điểm cao / mới đăng).
- **Bộ lọc đồng bộ lên URL** (query string); phân trang; skeleton khi tải; trạng thái rỗng ("Không tìm thấy truyện", gợi ý bỏ bớt bộ lọc); trạng thái lỗi.
- Tìm kiếm **không phân biệt dấu** (dùng `normalizeVi()`), gợi ý khi gõ.

### 10.3 Trang chi tiết truyện
- Khối đầu: bìa (tỷ lệ 2:3), tên, tác giả, thể loại (chip bấm được), trạng thái, kết thúc, điểm, lượt xem, số chương, cập nhật lúc nào.
- Nút: **Đọc từ đầu**, **Đọc chương mới nhất**, **Đọc tiếp** (chỉ hiện khi có lịch sử), **Lưu vào tủ truyện** (đổi trạng thái ngay).
- Tóm tắt có "Xem thêm / Thu gọn".
- **Danh sách chương** 50 chương/trang, có phân trang, ô nhảy tới số chương, nút đảo thứ tự (cũ → mới / mới → cũ); đánh dấu chương đang đọc dở.
- Bình luận (mục 12); truyện cùng thể loại; khối quảng cáo/affiliate (mục 14).

### 10.4 Tủ truyện, lịch sử
Lưới truyện đã lưu/đã đọc, hiện chương đang đọc dở và nút "Đọc tiếp", nút xóa từng mục và xóa tất cả (có xác nhận), trạng thái rỗng thân thiện.

### 10.5 Bảng xếp hạng
Tab ngày/tuần/tháng, danh sách có số thứ tự, huy hiệu top 3.

### 10.6 Trang đăng nhập/đăng ký (chỉ UI)
Form email + mật khẩu, nút "Tiếp tục với Google" (giả), kiểm tra hợp lệ ở mức giao diện, chưa gọi API.

---

## 11. Trang đọc chương (phần quan trọng nhất)

### 11.1 Bố cục và nội dung
- Tên truyện (liên kết về trang truyện), số chương, tên chương, thân chương.
- Cột chữ **tối đa ~720px**, ~65-75 ký tự/dòng, căn trái (không căn đều hai bên), khoảng cách đoạn ~1em.
- Mặc định: cỡ chữ 18px (17px trên điện thoại), giãn dòng 1,8, font đọc là serif.
- Các đoạn đối thoại bắt đầu bằng "—" hiển thị gọn, thụt lề hợp lý.

### 11.2 Điều hướng
- Nút **Chương trước / Chương sau** ở đầu và cuối chương (vô hiệu hóa đúng ở chương đầu/cuối).
- **Mục lục nhanh** (`ChapterDrawer`) có ô nhảy tới số chương, phân trang trong ngăn kéo.
- **Phím tắt:** ← → chuyển chương; không bắt phím khi đang gõ vào ô nhập.
- **Prefetch** chương kế tiếp.
- Chuyển chương **không tải lại layout** và **cuộn về đầu chương mới**.

### 11.3 Thanh công cụ
Về trang truyện · mục lục · cài đặt đọc · đánh dấu truyện · báo lỗi chương. Thanh **tự ẩn khi cuộn xuống, hiện khi cuộn lên hoặc chạm màn hình**. Có thanh tiến độ mỏng ở mép trang.

### 11.4 Bảng cài đặt đọc (`ReaderSettingsPanel`)

| Cài đặt | Giá trị | Ghi chú |
|---|---|---|
| Theme đọc | 8 lựa chọn ở mục 8.6 | Áp dụng bằng biến `--reader-bg`, `--reader-text` |
| Font | 5-8 font dễ đọc, hỗ trợ tiếng Việt (gồm chữ có chân và không chân) | Tải khi chọn |
| Cỡ chữ | 16-40, bước 1 | |
| Giãn dòng | 1.0-2.5, bước 0.1 | |
| Độ rộng cột | Hẹp / Vừa / Rộng | |
| Căn lề | Trái / Căn đều | Mặc định trái |
| Thanh công cụ tự ẩn | Bật/tắt | |

Mọi giá trị **lưu localStorage và áp dụng tức thì** (chỉ đổi biến CSS `--reader-*`, không render lại cây component). Có nút khôi phục mặc định và đoạn xem thử.

### 11.5 Ghi nhớ vị trí đọc
Tự lưu `storyId`, chương, tỷ lệ cuộn (`scrollRatio`) vào lịch sử (throttle ~1 giây). Lần sau vào trang truyện hiện "Đọc tiếp chương N", và vào lại chương thì cuộn đúng vị trí.

### 11.6 Cuối chương
Điều hướng chương, khung quảng cáo cuối chương (mục 14), `CommentSection` (nạp lười, chỉ bật bình luận theo chương khi cấu hình cho phép), liên kết truyện cùng thể loại.

---

## 12. Bình luận và báo lỗi

**Component:** `CommentSection`, `CommentForm`, `CommentItem`, `CommentReplies`, `AdminBadge`, `ReportCommentDialog`.

- Đặt ở trang chi tiết truyện (và cuối trang đọc nếu bật bình luận theo chương).
- Gửi bình luận; trả lời **một cấp** (không lồng nhiều tầng).
- Huy hiệu **Admin/Mod** (dùng token `--role-admin`/`--role-mod`); bình luận của admin có thể được ghim.
- Sắp xếp: mới nhất / nổi bật; nút "Xem thêm" (không tải hết một lần).
- Thích bình luận; báo cáo bình luận (chọn lý do).
- **Spoiler:** người viết có thể đánh dấu; nội dung bị che cho đến khi bấm.
- Trạng thái: đang tải (skeleton), rỗng ("Chưa có bình luận, hãy là người đầu tiên"), lỗi, bình luận `pending` ("Đang chờ duyệt").
- Chưa đăng nhập: xem được; bấm gửi thì hiện lời nhắc đăng nhập (`LoginPrompt`).
- **Báo lỗi chương:** nút ở thanh công cụ trang đọc mở hộp thoại (loại lỗi: thiếu nội dung / sai chính tả / lỗi hiển thị / yêu cầu gỡ nội dung vi phạm + ô mô tả). Gửi qua `reportChapterError()`, hiện thông báo xác nhận.
- Nạp bình luận ở **phía client sau khi trang đã hiện** để không làm chậm trang.

---

## 13. Phòng chat chung toàn site

### 13.1 Hình thức
- **Cửa sổ nổi** (`ChatLauncher`: nút tròn góc dưới phải, chấm báo tin mới, số người online) mở `ChatPanel`; trên điện thoại mở thành **bottom sheet** gần toàn màn hình.
- **Trang riêng `/chat`**: toàn màn hình, có danh sách phòng.
- **Trên trang đọc chương:** chỉ có một nút nhỏ, **không** mở khung chat tự động, tránh gây xao nhãng và làm nặng trang.
- Chat **nạp lười**: chỉ tải mã chat khi người dùng bấm mở.

### 13.2 Phòng và vai trò
- Phòng ban đầu: `chung` (trò chuyện) và `hoi-admin` (hỏi đáp, báo lỗi, đề xuất truyện). Cấu trúc hỗ trợ thêm phòng, và phòng `adminOnly` (thông báo).
- Vai trò: khách (chỉ xem), thành viên, điều hành viên, admin. Cần đăng nhập mới gửi được tin (hiện `LoginPrompt`).

### 13.3 Tính năng giao diện
- Gửi tin, **trả lời một tin cụ thể** (`ReplyQuote`), nhắc tên bằng `@` (đặc biệt `@admin` được làm nổi bật).
- Danh sách tin: tự cuộn xuống khi có tin mới, **trừ khi người dùng đang cuộn lên đọc lại** (khi đó hiện nút "Có tin mới ↓"); tải thêm tin cũ khi cuộn lên đầu.
- Tin của admin/mod có màu và huy hiệu riêng; `PinnedMessage` cho tin ghim; `SystemMessage` ("X đã tham gia", "Đang bật chế độ chậm 10s").
- `ChatInput`: giới hạn 300 ký tự có đếm, **đồng hồ chờ** giữa các tin khi bật chế độ chậm, emoji cơ bản, Enter gửi / Shift+Enter xuống dòng.
- Liên kết trong tin **không tự biến thành link bấm được** (chống spam); chỉ tin của admin được hiển thị link.
- `MessageActionsMenu`: trả lời, báo cáo; (admin/mod, mô phỏng giao diện) xóa, ghim, tắt tiếng.
- `OnlineUsersDrawer`: danh sách người đang online.
- `ChatRulesBanner`: luật chat hiện lần đầu, có nút "Đã hiểu".
- Cài đặt riêng của người dùng: bật/tắt âm báo, ẩn nút chat (lưu localStorage).
- **Các trạng thái phải có:** đang kết nối, mất kết nối/đang kết nối lại, bị tắt tiếng, bị cấm, chế độ chậm, chat đang tạm đóng, phòng trống.

---

## 14. Quảng cáo và affiliate (khung giao diện)

Chủ site sẽ chạy mạng quảng cáo, affiliate và hợp đồng trực tiếp. Hãy làm **khung** (chưa gắn mã quảng cáo thật):

| `placement` | Vị trí | Kích thước giữ chỗ |
|---|---|---|
| `home-between` | Giữa các khối trang chủ | Rộng 100%, cao tối thiểu 90px (máy tính) / 120px (điện thoại) |
| `list-in-feed` | Chen giữa các hàng trong danh sách | Giống một hàng `StoryCard` |
| `story-sidebar` | Cột phải trang truyện (máy tính) | 300×250 |
| `story-below-synopsis` | Dưới phần tóm tắt (điện thoại) | 300×250 hoặc 336×280 |
| `chapter-mid` | Giữa chương (sau khoảng 50% số đoạn) | 336×280 / 300×250 |
| `chapter-end` | Cuối chương | 336×280 / 300×250 |

Quy tắc:
- `AdSlot` nhận `placement`, hiển thị **khung giữ chỗ có kích thước cố định** để **không gây nhảy layout** (CLS).
- Khung có **nhãn nhỏ "Quảng cáo"** (`SponsoredLabel`) ở **mọi giao diện**, nền/viền trung tính để phân biệt rõ với nội dung và thích hợp với quảng cáo bên thứ ba có nền sáng ở giao diện tối. **Không** thiết kế quảng cáo giả dạng `StoryCard`.
- **Không** có quảng cáo dính theo màn hình (sticky), pop-up, toàn màn hình, hoặc quảng cáo ở màn hình đầu của trang đọc.
- `AffiliateBox`: ảnh, tên sản phẩm, nút mua, kèm nhãn "Liên kết tiếp thị". Mọi liên kết affiliate dùng đường dẫn trung gian `/go/[id]`, `rel="sponsored noopener"`, mở tab mới.
- Có cờ cấu hình `NEXT_PUBLIC_ADS_ENABLED` để bật/tắt toàn bộ quảng cáo khi kiểm tra giao diện; khi tắt, khung biến mất hoàn toàn (không để khoảng trống).
- Gợi ý nội dung affiliate mẫu phù hợp độc giả ngôn tình: sách, máy đọc sách, đèn đọc, giá đỡ điện thoại, ứng dụng nghe truyện (chỉ dữ liệu giả).

---

## 15. SEO, hiệu năng, truy cập được

### SEO
- `generateMetadata` cho trang truyện và trang chương (title, description, Open Graph, canonical); trang tìm kiếm, tủ truyện, lịch sử, chat, cài đặt: `noindex`.
- JSON-LD (breadcrumb cho mọi trang; thông tin sách/truyện cho trang truyện) trong `lib/seo/jsonld.ts`.
- `sitemap.ts` (hỗ trợ chia nhỏ khi số URL lớn) và `robots.ts`.
- Phân trang có liên kết `prev/next` hợp lý; slug thân thiện không dấu (`generateSlug()` có xử lý "đ").

### Hiệu năng (mục tiêu tham khảo trên mô phỏng điện thoại)
- LCP < 2,5s; CLS < 0,1; JS ban đầu của trang đọc nhỏ gọn.
- `next/image` cho bìa (có `sizes` đúng, `priority` chỉ cho ảnh đầu trang), `next/font` cho font.
- Nạp lười chat, bình luận, `ThemePicker`, `ReaderSettingsPanel`.
- Họa tiết nền chỉ bằng CSS hoặc SVG inline nhỏ, **không dùng ảnh nền lớn**.

### Truy cập được (accessibility)
- HTML ngữ nghĩa, `lang="vi"`, thứ tự tiêu đề đúng, `focus-visible` rõ ràng, điều hướng được bằng bàn phím.
- Modal/Drawer có quản lý focus, đóng bằng Esc, thuộc tính `aria` đầy đủ.
- Vùng chạm tối thiểu 44×44px trên điện thoại.
- Tôn trọng `prefers-reduced-motion` (chuyển động 150-200ms, chỉ cho hover, mở panel, đổi theme).
- Tương phản đạt WCAG AA ở **cả 8 biến thể** (kiểm tra bằng `scripts/check-contrast`).

---

## 16. Trình tự thực hiện

Làm **lần lượt**, mỗi bước chạy được và kiểm tra được trước khi sang bước sau.

| Bước | Việc | Kết quả kiểm tra được |
|---|---|---|
| 1 | Khởi tạo dự án, TS/Tailwind/ESLint/Prettier, cấu trúc thư mục, bộ component nền (`ui/`) | Dự án chạy, trang mẫu hiển thị |
| **1b** | **Hệ thống theme:** token cho 8 bộ, `themes.ts`, script chống nháy, `useTheme`, `ModeToggle`, `check-tokens`, `check-contrast`, trang `/styleguide` ma trận | Đổi giao diện/chế độ không nháy, tải lại giữ nguyên, script kiểm tra tương phản chạy qua |
| 2 | Kiểu dữ liệu, dữ liệu test (mục 7), `lib/data`, `lib/comments`, `lib/chat` (mock) | Gọi hàm trả đúng dữ liệu, tìm kiếm không phân biệt dấu |
| 3 | Layout: Header, MegaMenu, Footer, bản mobile | Điều hướng được toàn site |
| 4 | `StoryCard`, `GeneratedCover`, `StoryGrid`, trang chủ | Trang chủ hoàn chỉnh |
| 5 | Danh sách, thể loại, bộ lọc đồng bộ URL, phân trang | Lọc và đổi trang cập nhật URL |
| 6 | Trang chi tiết truyện + danh sách chương phân trang (truyện 3000 chương vẫn mượt) | Vào được từ danh sách |
| **7** | **Trang đọc:** nội dung, điều hướng, phím tắt, thanh công cụ tự ẩn, bảng cài đặt, theme đọc | Cài đặt giữ nguyên sau khi tải lại, chuyển chương không nháy |
| 8 | Lịch sử đọc, tủ truyện, "Đọc tiếp" và khôi phục vị trí cuộn | Lưu và khôi phục đúng vị trí |
| 8b | Giao diện bình luận + báo lỗi chương | Gửi/trả lời/báo cáo trên dữ liệu giả |
| 8c | Chat nổi (`ChatLauncher`, `ChatPanel`, danh sách tin, ô nhập, các trạng thái) | Nhận/gửi tin giả, cuộn, trả lời, tin ghim |
| 8d | Trang `/chat`, `RoomTabs`, `OnlineUsersDrawer`, menu thao tác | Chuyển phòng, xem người online |
| 9 | Tìm kiếm và gợi ý khi gõ | Tìm theo tên/tác giả, không phân biệt dấu |
| 10 | Trang tĩnh pháp lý, 404, trạng thái rỗng/lỗi/skeleton, trang đăng nhập (UI), bảng xếp hạng | Không còn đường dẫn chết |
| **10b** | `ThemePicker`, `ThemePreviewCard`, trang `/cai-dat` | Chọn xong giữ nguyên, đồng bộ giữa các tab |
| 11 | `AdSlot`, `AffiliateBox`, `/go/[id]`, cờ `NEXT_PUBLIC_ADS_ENABLED` | Khung đúng vị trí, không nhảy layout, tắt được hoàn toàn |
| 12 | SEO: metadata, JSON-LD, sitemap, robots | Metadata riêng cho từng trang |
| **12b** | Rà soát: tương phản 8 biến thể, hiệu năng, responsive, truy cập bàn phím, kiểm tra tất cả ca đặc biệt ở mục 7.4 | Đạt các tiêu chí ở mục 17 |

**Nếu cần ưu tiên tiến độ**, hoàn thiện **paper** và **minimal** (4 bộ token) trước, rồi thêm **guofeng** và **webnovel**. Hệ thống phải được xây để thêm giao diện chỉ cần thêm một khối CSS và một dòng đăng ký.

---

## 17. Tiêu chí nghiệm thu

1. Đọc trọn một truyện nhiều chương, từ trang chủ đến chương cuối, trên điện thoại và máy tính mà không lỗi.
2. Cài đặt đọc, lịch sử, tủ truyện, giao diện/chế độ **giữ nguyên sau khi tải lại**, và đồng bộ giữa các tab.
3. Đổi giao diện/chế độ **không gây tải lại trang hay nháy**; mọi component hiển thị đúng ở cả 8 biến thể (xác nhận qua `/styleguide`).
4. `check-tokens` không báo màu/font viết cứng; `check-contrast` đạt AA cho mọi cặp ở cả 8 biến thể.
5. Không có dữ liệu cứng trong component; mọi truy cập dữ liệu đi qua `lib/data`, `lib/comments`, `lib/chat`.
6. Truyện 3000 chương: danh sách chương phân trang và nhảy chương mượt, trang đọc chương bất kỳ tải nhanh.
7. Tìm kiếm không phân biệt dấu hoạt động; bộ lọc nằm trên URL và chia sẻ link được.
8. Chat/bình luận **không làm chậm trang đọc** (nạp lười), không có chat tự mở trên trang đọc.
9. Khung quảng cáo không gây nhảy layout, có nhãn "Quảng cáo" ở mọi giao diện, tắt được bằng cờ cấu hình.
10. Mỗi trang có metadata riêng; trang `noindex` đúng danh sách; sitemap và robots hoạt động.
11. Không có đường dẫn chết, có đầy đủ trạng thái rỗng, lỗi, đang tải.
12. `src/lib/mock/SOURCES.md` ghi rõ nguồn mọi văn bản không phải do bạn viết (nếu có); **không có nội dung sao chép từ website truyện hay truyện còn bản quyền**.

---

## 18. Cách làm việc yêu cầu ở bạn (AI)

1. **Trước khi viết code**, trả lời bằng một bản kế hoạch ngắn: cấu trúc thư mục bạn sẽ dùng, các giả định, và những điểm mơ hồ trong yêu cầu (chỉ hỏi lại những điều **thật sự chặn** công việc; còn lại tự đưa ra giả định hợp lý và ghi lại).
2. Làm **theo trình tự mục 16**, mỗi bước chạy `lint`, `type-check`, `check-tokens` (và `check-contrast` từ bước 1b) trước khi báo hoàn thành bước đó.
3. **Không** tự thêm tính năng ngoài phạm vi mục 2. Nếu thấy cần, ghi vào danh sách "Đề xuất" ở cuối báo cáo thay vì tự làm.
4. Giữ **chữ ký** của `lib/data`, `lib/comments`, `lib/chat` đúng như mục 6 để thay backend sau này.
5. Mọi chuỗi giao diện bằng tiếng Việt, tự nhiên, nhất quán, đặt trong `lib/copy.ts`.
6. Khi kết thúc, viết `README.md` gồm: cách chạy, cấu trúc thư mục, cách thêm một giao diện mới, cách thêm/sửa dữ liệu test, cách thay mock bằng Supabase (nêu rõ từng hàm cần viết lại), danh sách các việc chưa làm.
7. Với nội dung test: **tự viết nội dung gốc**; chỉ dùng văn bản có sẵn khi đáp ứng đủ điều kiện ở mục 7.5.
