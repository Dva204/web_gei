# Kế hoạch backend

Cập nhật: 17/10/2026. Theo yêu cầu mới, ưu tiên tốc độ triển khai từ B3: kiểm tra biên dịch, migration và smoke cơ bản; test chuyên sâu để lại trước production. Checklist phân biệt code đã làm với nghiệm thu chưa chạy.

## Quyết định triển khai

- Tiếp tục Next.js Route Handlers + PostgreSQL + Prisma đã có; không mở thêm Express hoặc chuyển nhà cung cấp database.
- Truyện tranh đọc cuộn dọc, không bắt buộc tên chap. Storage lưu ảnh; DB lưu khóa ảnh và metadata, không lưu base64.
- Tách bản nháp và snapshot đã xuất bản: sửa nháp không thay đổi ảnh trên trang đọc công khai.
- Server kiểm tra session, quyền và truyện được phân công; không tin role/localStorage của FE.
- FE demo giữ nguyên trong lúc chuyển đổi. Nối từng service sau khi API tương ứng được kiểm thử; không fallback âm thầm về mock khi DB lỗi.
- Không xóa dữ liệu cũ, không chạy migrate reset/db push --force-reset. DB có bảng sẵn phải kiểm tra và baseline trước.
- Chọn checklist làm mốc bàn giao. Commit/push chỉ phần đã xác minh; không gom thay đổi FE chưa commit vào mốc backend.

## Các giai đoạn

- [x] B0 — Kiểm kê backend, đối chiếu yêu cầu và lập kế hoạch.
- [x] B1 — Nền tảng database và API.
  - [x] Schema user/session/phân công truyện, FK tủ truyện/lịch sử, snapshot ảnh public.
  - [x] Migration có version và constraint dữ liệu; seed taxonomy an toàn, chạy lại được.
  - [x] Chuẩn phản hồi/lỗi API, không lộ lỗi database qua ngrok.
  - [x] Unit test/typecheck/lint; integration PostgreSQL riêng và xác nhận migration chạy được.
- [x] B2 — Xác thực và phân quyền thật (phạm vi password + DB session).
  - [x] Đăng ký/đăng nhập/đăng xuất, cookie HttpOnly/Secure, thu hồi session, hash mật khẩu; không có password/OTP mặc định.
  - [x] RBAC member/admin/mod/editor/author/beta, phân công theo truyện và kiểm tra các API hiện có; guard riêng cho 24 trang admin.
  - [x] Chống CSRF, giới hạn request/brute-force, khóa tài khoản, bootstrap admin qua CLI; thay auth demo user/admin.
  - [x] Chọn Node crypto + opaque session Prisma/PostgreSQL; không thêm OAuth/framework auth ở mốc này. Reset password/email/MFA chưa cấu hình, không giả báo thành công.
  - [x] Nghiệm thu DB/HTTP: 401/403, không tăng quyền từ payload, session hết hạn/thu hồi, chặn request khác origin.
- [ ] B3 — Truyện, tác giả, thể loại và danh mục công khai.
  - [x] Code CRUD admin + nối UI: slug unique, bản quyền/hết hạn, phân công author/beta, ẩn/xóa mềm/khôi phục, tìm kiếm/lọc/phân trang.
  - [x] Code danh mục/reader DB: public chỉ trả truyện có quyền hợp lệ và ít nhất một chap với snapshot; DTO công khai không trả quyền/nhân sự nội bộ.
  - [x] Code catalog/metadata/sitemap DB, số chap thực tế; bỏ reader/danh sách chap fallback từ IndexedDB.
  - [x] Migration 4 đã deploy; TypeScript, ESLint phần B3, cấu trúc và smoke HTTP đọc API qua PostgreSQL.
  - [ ] Nghiệm thu chuyên sâu: CRUD HTTP có session, author/beta, truyện nháp/ẩn, rollback/xung đột/phân công, Safari và production build. Tạm hoãn theo yêu cầu ưu tiên code.
- [ ] B4 — Chap, ảnh và nhập hàng loạt.
  - [x] Upload kiểm tra file thật/MIME/kích thước, chuẩn hóa WebP; kho local riêng tư, API media kiểm tra quyền.
  - [x] Nối editor: sắp xếp/bỏ ảnh, autosave server, revision, version, snapshot/publication và xóa mềm trong transaction; upload bìa.
  - [x] Import preview/job DB, trùng số/expiry/idempotency, transaction, không tự xuất bản; CLI worker snapshot cho lịch đăng.
  - [x] Migration 5 deploy; TypeScript/ESLint/cấu trúc và smoke Route Handler + PostgreSQL + Sharp cơ bản.
  - [x] Cloudflare R2 private/public, CDN cho cover + trang chap, reconcile/GC có grace và gỡ ngay khi ẩn/takedown.
  - [ ] Scheduler production, quota và backup/versioning/lifecycle độc lập cho R2.
  - [ ] Nghiệm thu chuyên sâu rollback/race/quyền, HTTP server/browser, Safari/ngrok, production build và tải ảnh lớn. Tạm hoãn theo yêu cầu ưu tiên code.
- [ ] B5 — Tủ truyện, lịch sử và tài khoản.
  - [x] Bookmark, tiến độ, tiếp tục đọc và đồng bộ PostgreSQL đa thiết bị; khách vẫn dùng localStorage.
  - [x] Nhập dữ liệu khách qua xác nhận: gộp idempotent, không ghi lùi tiến độ, chỉ xóa local sau thành công.
  - [x] Hồ sơ, đổi mật khẩu và quản lý/thu hồi session; không cho truy cập dữ liệu hoặc phiên người khác.
  - [x] TypeScript/ESLint/cấu trúc và smoke PostgreSQL cơ bản trên schema riêng.
  - [ ] Nghiệm thu HTTP/browser/Safari/ngrok, race/load/full build; tên thiết bị/session metadata, reset email/MFA/OAuth. Tạm hoãn theo yêu cầu ưu tiên code.
- [ ] B6 — Bình luận và kiểm duyệt.
  - [x] Bình luận chờ duyệt, like/báo cáo, báo lỗi chap và yêu cầu gỡ lưu PostgreSQL; phân trang và rate limit cơ bản.
  - [x] Hàng đợi admin/mod cho bình luận, báo lỗi và yêu cầu gỡ; lý do bắt buộc, transaction, quyền server và audit log.
  - [x] Migration 6 deploy; TypeScript, ESLint phần B6, cấu trúc và db:status pass.
  - [ ] Phản hồi lồng nhau trên UI, khóa user trực tiếp từ hàng đợi, email/SLA pháp lý và nghiệm thu sâu quyền/race/browser/Safari. Tạm hoãn theo yêu cầu ưu tiên code.
- [ ] B7 — Chat.
  - [x] Phòng, tin nhắn và báo cáo lưu PostgreSQL; phân trang/polling, slow mode transaction và không còn tự sinh dữ liệu RAM.
  - [x] Hàng đợi admin/mod, gỡ mềm/ghim/xử lý có lý do và audit.
  - [x] Migration 7 deploy; TypeScript, ESLint phần B7, cấu trúc và smoke chỉ-đọc DB pass.
  - [ ] SSE/WebSocket, presence heartbeat, cấu hình phòng UI, lọc link/từ khóa, retention và nghiệm thu tải/race/browser/Safari. Tạm hoãn theo yêu cầu ưu tiên code.
- [ ] B8 — Quảng cáo và affiliate.
  - [x] Snapshot có revision cho vị trí/campaign/lịch chạy/sản phẩm/doanh thu nhập tay; cấu hình public được lược dữ liệu nội bộ.
  - [x] Link HTTPS đúng miền Shopee/TikTok, impression/click riêng có rate limit và admin audit.
  - [x] Migration 8 deploy; TypeScript, ESLint phần B8, cấu trúc và smoke HTTP/DB cơ bản pass.
  - [ ] Ad network/API đơn hàng/hoa hồng/webhook, upload asset, chống gian lận sâu, retention/aggregate, consent/privacy và nghiệm thu browser/Safari. Premium/payment thật làm riêng khi có nhà cung cấp.
- [ ] B9 — Vận hành và production.
  - [x] Cài đặt website, nội dung trang, kho redirect SEO, page-view/statistics và audit lưu PostgreSQL có revision/quyền.
  - [x] Export danh mục an toàn có quyền, không chứa password/session/PII; ghi rõ không thay thế backup DB/media.
  - [x] Áp redirect runtime 301/302 với matcher an toàn, cache 60 giây, chống vòng lặp và hit count nền; dashboard đã bỏ số liệu mẫu.
  - [x] Backup/verify/restore rehearsal PostgreSQL + local media và job runner singleton.
  - [ ] Scheduler production, backup R2 độc lập, log/metrics/health sâu và CI/deploy.
  - Tắt demo, rà dependency/security, test Safari/ngrok/tải reader, khôi phục backup và bảo vệ secrets.

## Nhật ký

### B0 — Hoàn tất

- Đọc tài liệu Next.js cài trong repo: Route Handlers, cookies, authentication.
- Backend cũ chỉ có schema Prisma + health; chưa có migration/auth/CRUD thật.
- DATABASE_URL đã cấu hình tới local; kiểm tra chỉ in trạng thái, không in credentials.
- Docker chưa có engine hoạt động; kết nối PostgreSQL chưa xác nhận được. Tiếp tục phần B1 không phụ thuộc engine.
- Giữ nguyên các thay đổi FE chưa commit; không tự gộp vào mốc backend hoặc sửa lịch sử Git.

### B1 — Hoàn tất (04/10/2026)

- Schema bổ sung User/Session/StoryAssignment, FK Bookmark/ReadingHistory/AuditLog, revision chap và ChapterPublication/ChapterVersion.pageManifest; tên chap có default rỗng.
- Hai migration: baseline schema cũ và foundation dạng transaction, CHECK cho số chap, thứ tự/kích thước ảnh, progress, metrics, email/token/session và manifest ảnh.
- Docker engine sẵn sàng trong phiên làm việc; tạo container PostgreSQL của repo chỉ bind localhost. Preflight xác nhận database ứng dụng hoàn toàn trống trước deploy; cả hai migration thành công, db:status up-to-date, db:check sẵn sàng.
- Có CLI preflight/check/seed và test:db. Seed chỉ được bật rõ ở local dev, không tạo tài khoản/admin, không ghi đè taxonomy chỉnh sửa.
- API health dùng contract data/error + requestId, no-store; lỗi/SQL/credentials không trả về client hoặc log raw cả ở development. Chuẩn HTTP đã có unit test; auth/rate limit của các API nghiệp vụ còn thuộc B2.
- **71 unit tests / 13 files pass**, TypeScript, ESLint, check:structure pass; production build 58 trang pass. Build chạy ngoài sandbox do giới hạn native worker Windows đã gặp ở lượt FE.
- **16 integration checks pass trên PostgreSQL thật**, gồm deploy cả hai migration, seed chạy lại/giữ sửa đổi, defaults, unique/FK/CHECK, rollback, snapshot độc lập và cascade/giữ audit.
- Smoke test HTTP bản production trên localhost:3100 trả **200**, data.status=ok, Cache-Control=no-store và requestId khớp header/body với PostgreSQL thật; đã dừng server kiểm thử sau đó. PostgreSQL local vẫn chạy để phát triển tiếp.
- Integration dùng DB riêng vuon_ngon_tinh_test và schema random; schema của lần chạy được dọn thành công. Chỉ kiểm thử seed trong DB test; DB ứng dụng chưa nhập dữ liệu mẫu hoặc dữ liệu FE.
- Không đổi auth demo thành auth thật, không nối catalog/reader/admin vào DB, chưa cấu hình object storage. Hai schema/migration không đồng nghĩa các chức năng đó đã có backend.
- Đã đánh dấu checklist; chưa commit/push, giữ tách biệt các thay đổi FE chưa commit.

### B2 — Hoàn tất phạm vi cốt lõi (04/10/2026)

- Auth người đọc/admin đã nối PostgreSQL; bỏ login demo/mật khẩu bất kỳ/OTP mẫu và đổi role trên localStorage. API đăng ký chỉ tạo member, session đọc role/status DB hiện tại; logout một/tất cả phiên, TTL 7 ngày và cap 10 phiên có khóa đồng thời.
- Scrypt bằng Node crypto, cookie HttpOnly/Secure/SameSite + __Host ở production, CSRF allowlist origin, JSON giới hạn 4 KiB, rate limit PostgreSQL nguyên tử và giới hạn tác vụ hash. RBAC dùng chung user/admin; assignment author/beta kiểm tra DB. 24 trang quản trị có guard trước đọc dữ liệu, không chỉ dựa vào layout.
- API trạng thái tài khoản có quyền mod/admin, không tự khóa, thu hồi phiên và audit trong transaction. Bootstrap CLI chỉ tạo admin đầu tiên với credentials do người vận hành nhập; không nâng quyền member đã tồn tại. CLI cleanup chỉ dọn session/bộ đếm hết hạn.
- Migration thứ ba AuthRateLimit đã deploy trên DB local; db:status up-to-date. Không tạo admin/user mẫu hoặc nhập dữ liệu FE vào DB ứng dụng.
- **82 unit tests pass** (18 DB tests được skip ở lệnh unit), **18 auth integration tests pass trên PostgreSQL thật**, **16 kiểm tra DB B1 chạy lại pass**, **17 production HTTP checks pass**. HTTP xác minh cookie production, đăng ký, khách/member bị chặn, admin render được, CSRF và cookie bị thu hồi.
- TypeScript, ESLint không warning, check:structure và production build pass. Runner tạo/dọn schema test random riêng; server HTTP kiểm thử đã dừng. Chưa kiểm thử Safari/iPhone thật.
- Hướng dẫn tạo admin, hai cấu hình ngrok khác nhau, API, giới hạn và test tại [backend-auth.md](backend-auth.md). Không ghi đè .env đang có; cần cấu hình AUTH_TRUSTED_ORIGINS cho tunnel HTTPS thật trước khi đăng nhập ngrok.
- B3–B8 vẫn dùng mock/kho browser, kể cả màn hình user moderation; API status chưa nối màn hình đó. OAuth/email reset/xác minh email/MFA, cấp role/phân công UI và đồng bộ thư viện chưa làm, không giả báo thành công.
- Audit dependency còn **4 mục high** trong cây Prisma config (deepmerge-ts/effect); không tự downgrade Prisma bằng audit fix --force. Rà dependency và các cổng an toàn production còn ở B9; hoàn tất B2 không nghĩa production-ready.
- Đã đánh dấu checklist; chưa commit/push để không gom các thay đổi FE chưa commit.

### B3 — Đã triển khai code, kiểm tra cơ bản (05/10/2026)

- Migration `20261005000100_catalog`: revision, deletedAt và trường tìm kiếm không dấu; deploy thành công vào DB hiện có, không reset/seed tài khoản hoặc truyện mẫu.
- API/FE quản lý truyện/tác giả/thể loại đã lưu PostgreSQL. Có phân trang máy chủ, thùng rác/khôi phục, gán thể loại/tác giả, SEO, quyền và thời hạn, API + UI phân công author/beta. Author chỉ sửa nháp được giao; editor/admin quản lý công khai. Cấp role tài khoản chưa làm.
- Các thao tác ghi có session, CSRF origin, giới hạn JSON 32 KiB, rate limit, validation, transaction, audit và revision. Không cho payload sửa số lượt xem/rating/role/phân công ngoài API chuyên biệt.
- Danh mục/chi tiết/tìm kiếm/thể loại/reader/sitemap đã đọc DB, không trả nháp/ẩn/xóa/hết hạn. Truyện chưa có snapshot xuất bản chưa xuất hiện ở user. Reader chỉ dùng ảnh snapshot đã xuất bản, không nhận ghi đè từ browser draft; điều hướng theo số chap thực tế, không bắt buộc tên chap.
- Sửa luồng login/logout admin về một lần điều hướng đầy đủ để nhận cookie mới, bỏ redirect trùng trong AdminShell. Chưa nghiệm thu đăng nhập lại trên Safari.
- TypeScript và kiểm tra cấu trúc pass; ESLint các file backend/API/UI B3 pass, không warning. Smoke GET local: stories/genres/sitemap 200, truyện thiếu 404, admin stories không session 401. DB hiện chưa nhập truyện/chap mẫu.
- Không chạy lại toàn bộ unit/integration/production build theo yêu cầu tối ưu tốc độ. Test adapter cũ đã chuyển từ kỳ vọng mock sang forwarding DB; nghiệp vụ DB cần bộ integration riêng trước production.
- B4 ảnh/chap/import, B5 thư viện và B6–B9 vẫn chờ backend. Thống kê ngày/tuần/tháng chưa có; ranking hiện chỉ dùng tổng lượt xem. UI phân công hiển thị tối đa 100 author/beta; thư viện/history còn dữ liệu browser. Xem [backend-catalog.md](backend-catalog.md).
- Giữ nguyên tài khoản admin và các thay đổi FE chưa commit; không commit/push. PostgreSQL tiếp tục chạy, server kiểm tra cổng 3100 được dừng sau smoke.

### B4 — Đã triển khai code, kiểm tra cơ bản (07/10/2026)

- Migration `20261007000100_chapter_media` thêm MediaAsset, ImportJob, xóa mềm chap và snapshot lịch đăng. Deploy vào DB hiện có; giữ nguyên tài khoản admin/dữ liệu, không reset/seed. PostgreSQL của repo chạy cổng 5432 sau khi người dùng tự dừng PostgreSQL clinic; không can thiệp dữ liệu/container clinic.
- Upload thật vào `.data/media` ngoài public: JPG/PNG/WebP, chữ ký/MIME/decode/dimensions, chuyển WebP bỏ metadata. API ảnh kiểm tra snapshot hoặc quyền truyện; không đưa ảnh nháp vào thư mục public. Local production fail closed nếu chưa cấu hình volume bền vững; object storage chưa làm.
- Editor ảnh, upload bìa, danh sách chap và import đã nối API. Autosave, revision 409, version/khôi phục nháp, xuất bản/gỡ/xóa mềm, số chap thực tế; không bắt buộc tên. Sửa nháp vẫn đọc snapshot cũ trên public, không lọc mất publication chỉ vì workflow nháp đã thay đổi.
- Nhập tối đa 20 chap/600 ảnh qua job preview có TTL, chọn chap và trạng thái nháp/sẵn sàng; commit nguyên tử/idempotent, không nhập đè. Lịch đăng lưu snapshot cố định; `npm run chapters:publish-due` kiểm tra lại quyền rồi xuất bản tối đa 50 chap/lần. Chưa cài cron tự chạy.
- TypeScript, ESLint phần B4, check:structure pass. Smoke ngắn Route Handler với Request/Response + PostgreSQL + Sharp pass: upload/private/public, sửa nháp không đổi snapshot, revision cũ 409, import retry và worker đến hạn. Runner đã dọn schema/kho ảnh test riêng, không mở server test hoặc ghi fixture vào DB ứng dụng.
- Không chạy full suite/build/browser theo yêu cầu tốc độ. B4 vẫn chưa đánh dấu hoàn toàn vì object storage/cron, test sâu và vận hành còn thiếu. Tài liệu [backend-chapters.md](backend-chapters.md); B5 tủ truyện/lịch sử/tài khoản là phần tiếp theo. Chưa commit/push các thay đổi đang có.

### B5 — Đã triển khai code, kiểm tra cơ bản (10/10/2026)

- Bookmark, lịch sử và tiến độ đọc đã nối PostgreSQL theo session user; reader đồng bộ khoảng mỗi 5 giây và khôi phục chap/tỷ lệ cuộn trên thiết bị khác. API chỉ trả truyện/chap còn công khai; dữ liệu user khác không lấy từ payload và không thể đọc/xóa chéo.
- Khách vẫn dùng localStorage. Không tự nhập khi login; tại Cài đặt người dùng phải xác nhận. Server gộp bookmark idempotent, chỉ nhận chap đã đăng và không ghi lùi tiến độ; local chỉ bị xóa sau response thành công.
- Cài đặt tài khoản có sửa tên, đổi mật khẩu với kiểm tra mật khẩu hiện tại, tùy chọn thu hồi phiên khác, danh sách/thu hồi từng session và đăng xuất tất cả. Chưa lưu tên thiết bị/IP và chưa có reset email/MFA/OAuth.
- Không cần migration mới vì Bookmark, ReadingHistory và Session đã có FK/unique/index/constraint từ nền tảng. Smoke PostgreSQL trong schema random pass: cách ly hai user, validation publication, merge tiến độ, đổi profile/password và ownership session. Schema test đã dọn; DB/tài khoản ứng dụng không đổi.
- TypeScript, ESLint phần B5, check:structure và diff check pass. Chưa chạy full suite/build/HTTP/browser/Safari theo yêu cầu tốc độ; B5 còn để mở đến khi nghiệm thu production. Xem [backend-library.md](backend-library.md).

### B6 — Đã triển khai code, kiểm tra cơ bản (10/10/2026)

- Migration `20261010000100_moderation` thêm bình luận/like/báo cáo, báo lỗi chap, yêu cầu gỡ và lịch sử xử lý; deploy vào DB hiện có, không reset và giữ nguyên admin/dữ liệu.
- Bình luận công khai đã bỏ mảng RAM: cần đăng nhập để gửi, mặc định chờ duyệt, người gửi vẫn thấy mục của mình. Like/báo cáo có rate limit và unique theo user; 3 báo cáo đưa bình luận về hàng chờ.
- Báo lỗi chỉ nhận chap đang xuất bản. Form gỡ công khai lưu tối đa 5 URL, hạn 7 ngày và liên kết story theo slug khi có thể.
- Ba màn admin bình luận/báo lỗi/yêu cầu gỡ đọc API thật. Admin/mod phải nhập lý do; backend kiểm tra quyền mới từ DB, ghi thay đổi + audit/event trong transaction. Ẩn theo yêu cầu chỉ đổi visibility, không xóa nội dung.
- TypeScript, ESLint phần B6, check:structure và trạng thái migration pass. Chưa chạy full suite/build/HTTP/browser/Safari hay test race theo yêu cầu tốc độ; phản hồi lồng nhau UI, khóa user trong hàng đợi và email/SLA còn chờ. Xem [backend-moderation.md](backend-moderation.md).

### B7 — Đã triển khai code, kiểm tra cơ bản (10/10/2026)

- Migration `20261010000200_chat` thêm phòng/tin nhắn/báo cáo và hai phòng mặc định; deploy vào DB hiện có, không tạo tin nhắn hoặc user mẫu.
- Chat user đã bỏ mảng RAM và timer sinh tin giả. Khách đọc phòng công khai; tài khoản đang hoạt động mới gửi/báo cáo. HTTP polling 3 giây, phân trang 100 mục, reply ở data layer, xóa mềm và ghim.
- Slow mode được cưỡng chế trong transaction có khóa theo user. Presence hiện chỉ là số người đã gửi trong 5 phút, không tuyên bố là kết nối realtime chính xác.
- `/admin/chat` dùng hàng đợi PostgreSQL; mod/admin nhập lý do để đóng báo cáo, gỡ hoặc ghim tin. Thao tác kiểm tra quyền server và ghi audit trong transaction.
- TypeScript, ESLint phần B7, check:structure, migration status và smoke chỉ-đọc bảng/phòng pass. Chưa chạy full build/browser/load theo yêu cầu tốc độ; SSE/WebSocket, heartbeat, cấu hình phòng và lọc nội dung còn chờ. Xem [backend-chat.md](backend-chat.md).

### B8 — Đã triển khai code, kiểm tra cơ bản (10/10/2026)

- Migration `20261010000300_advertising` thêm snapshot cấu hình có revision và bảng sự kiện; deploy vào DB hiện có. GET công khai đầu tiên đã khởi tạo cấu hình mặc định revision 1, không tạo sự kiện/doanh thu mẫu.
- Trang đọc lấy cấu hình máy chủ; admin quảng cáo/affiliate đồng bộ PostgreSQL thay vì phụ thuộc localStorage từng thiết bị. `premiumDemo` vẫn cục bộ để không vô tình tắt quảng cáo cho mọi người.
- Snapshot được validate server, giới hạn kích thước/số bản ghi và khóa revision. Public DTO bỏ publisher ID, booking nội bộ, doanh thu và audit. Thao tác admin kiểm tra quyền, transaction và audit.
- Sản phẩm có link affiliate HTTPS, whitelist miền Shopee/TikTok. Impression/click nội bộ lưu bảng riêng, rate limit theo mã browser hash + toàn cục; không coi click là đơn/hoa hồng.
- TypeScript, ESLint phần B8, check:structure, migration và smoke GET HTTP 200/DB pass; server test cổng 3100 đã dừng. Chưa chạy full build/browser/Safari theo yêu cầu tốc độ; tích hợp nền tảng thật, retention và privacy còn chờ. Xem [backend-advertising.md](backend-advertising.md).

### B9 — Đã triển khai lõi vận hành, chưa production-ready (10/10/2026)

- Migration `20261010000400_operations` thêm cấu hình website, nội dung trang, redirect SEO và page view; deploy vào DB hiện có, tổng 9 migration, không reset/seed tài khoản.
- Admin cài đặt/nội dung/SEO/thống kê/audit/export đã đọc ghi API PostgreSQL. Cấu hình dùng revision; thao tác ghi kiểm tra quyền, transaction và audit.
- Quản trị người dùng đã bỏ mock: danh sách/hồ sơ, khóa–mở, đổi vai trò, thu hồi session và bảo vệ admin cuối cùng đều kiểm tra quyền server + audit.
- Trang chi tiết truyện ghi một lượt/browser/path/giờ bằng browser ID đã băm; tăng tổng lượt truyện chỉ khi insert mới. Không lưu IP/user-agent. Thống kê không bịa thời lượng/drop-off khi chưa có telemetry.
- Export chỉ chứa cấu hình và danh mục nội dung, loại user/password/session/PII/media; không gọi là backup toàn hệ thống. Redirect runtime dùng proxy + cache 60 giây, chặn vùng hệ thống/vòng lặp và fail-open khi DB lỗi.
- Dashboard không còn dùng `adminStories`/phần trăm cố định; số liệu, hàng đợi và cảnh báo quyền đều lấy PostgreSQL theo quyền người xem.
- Đã thêm backup PostgreSQL + media có checksum, verify archive, restore rehearsal bắt buộc database `_restore`, và job runner tuần tự cho lịch chap/dọn auth. Không có lệnh restore đè dữ liệu đang chạy.
- TypeScript, structure 268 module, ESLint và cú pháp CLI pass. Backup thật đã verify checksum/archive; restore rehearsal có 33 bảng, đủ 9 migration và số bản ghi lõi khớp nguồn. Job runner cũng chạy thành công trên PostgreSQL local.
- TypeScript và check:structure pass; migration deploy thành công. Chưa chạy full suite/build/browser/Safari theo yêu cầu tốc độ. Xem [backend-operations.md](backend-operations.md).

## Điều kiện nghiệm thu đầy đủ (trước production)

1. Code/migration/tài liệu chạy đi cùng nhau.
2. Test liên quan, lint, typecheck, cấu trúc; build khi nối app.
3. API ghi dữ liệu có test auth/quyền/validation/transaction trên DB test.
4. Ghi kết quả thực tế và giới hạn; chỉ đánh dấu toàn mốc khi đủ điều kiện.

### B10 — Hoàn tất code Cloudflare R2 (17/10/2026)

- [x] Cấu hình hai bucket private/public và credentials server-only.
- [x] Adapter local/R2 cho upload và đọc ảnh private; rollback object mới khi DB thất bại.
- [x] Probe thật đọc/ghi/xóa bucket private và kiểm tra public URL.
- [x] Promote snapshot sang bucket public khi publish/lịch đăng; public reader dùng URL CDN.
- [x] Reconcile job bù object thiếu và dọn cover/trang chap mồ côi với grace 24 giờ.
- [x] Ẩn/thùng rác/takedown xóa public object ngay; purge cache Cloudflare khi có token zone-scoped.
- [x] Public reader và cover công khai dùng CDN; admin/nháp tiếp tục qua API private.
- [x] TypeScript, lint, structure 271 module, 82 test và production build 69 trang pass.
- [ ] Backup/versioning/lifecycle R2 và diễn tập khôi phục object.
