# B10 — Cloudflare R2 media storage

## Phạm vi đã triển khai

- `MEDIA_STORAGE_DRIVER=local|r2` chọn adapter ở server; local vẫn là mặc định cho development/test.
- R2 dùng AWS SDK v3 qua endpoint S3-compatible, region `auto`, tối đa ba lần thử.
- Ảnh upload được re-encode WebP như trước rồi ghi vào bucket private bằng `If-None-Match: *`; object là create-once, không ghi đè khóa cũ.
- API `/api/media/...` vẫn kiểm tra quyền/publication trước khi đọc object private. Secret và endpoint S3 không gửi xuống browser.
- Nếu upload nhiều ảnh hoặc transaction PostgreSQL thất bại, các object vừa ghi được rollback best-effort để hạn chế file rác.
- `npm run media:r2:check` kiểm tra quyền hai bucket, ghi/đọc/xóa probe private, đồng thời ghi probe public và đọc qua `NEXT_PUBLIC_MEDIA_BASE_URL`. Probe được xóa trong `finally`.
- Xuất bản ngay và worker lịch đăng copy tối đa sáu object song song từ private sang public trước khi ghi snapshot xuất bản. Copy đặt `Content-Type: image/webp` và cache bất biến một năm vì khóa UUID không bị ghi đè.
- Public reader tạo URL trang truyện từ `NEXT_PUBLIC_MEDIA_BASE_URL`; giao diện admin và ảnh nháp vẫn đọc `/api/media/...` qua kiểm tra quyền.
- Ảnh bìa truyện công khai và toàn bộ trang của chap đã xuất bản được phân phối qua CDN. Giao diện admin, bản nháp và ảnh chưa công khai vẫn đọc từ bucket private qua API có kiểm tra quyền.
- Khi truyện bị chuyển sang riêng tư, bỏ vào thùng rác hoặc bị takedown, object public được xóa ngay theo best-effort. Nếu cấu hình Cloudflare cache purge, URL tương ứng cũng được purge ngay sau khi xóa object.
- `npm run media:public:sync` lấy tập tham chiếu gồm ảnh bìa và snapshot chap của truyện đang công khai/còn quyền, bù object CDN còn thiếu và xóa object mồ côi quá thời gian grace. Job này chạy trong `ops:jobs` sau worker lịch đăng.

## Biến môi trường

```env
MEDIA_STORAGE_DRIVER="r2"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_PRIVATE_BUCKET="vuon-ngon-tinh-private"
R2_PUBLIC_BUCKET="vuon-ngon-tinh-public"
NEXT_PUBLIC_MEDIA_BASE_URL="https://media.example.com"
PUBLIC_MEDIA_ORPHAN_GRACE_HOURS="24"

# Không bắt buộc, nhưng nên cấu hình để gỡ nội dung khỏi cache ngay khi takedown
CLOUDFLARE_ZONE_ID="..."
CLOUDFLARE_CACHE_PURGE_TOKEN="..."
```

Chỉ `NEXT_PUBLIC_MEDIA_BASE_URL` được phép xuất hiện ở client. Không commit `.env`, không đưa Access Key/Secret vào biến `NEXT_PUBLIC_*` và không log cấu hình R2.

## Vận hành

Luồng promote đã hoạt động cho cả ảnh bìa và trang truyện. Nếu transaction DB thất bại sau khi R2 copy thành công, object không tham chiếu sẽ được job đồng bộ xóa sau grace mặc định 24 giờ. Unpublish/ẩn truyện/thùng rác/takedown đều gỡ object public; purge cache là tùy chọn vì cần API token do chủ tài khoản Cloudflare cấp.

Token purge chỉ cần quyền `Cache Purge` cho đúng zone chứa custom domain media. Không dùng Global API Key. Nếu chưa cấu hình token, website vẫn gỡ object khỏi R2; nội dung đã được Cloudflare cache có thể tồn tại đến khi TTL hết.

Backup CLI hiện backup PostgreSQL và local media. Khi dùng R2, durability/versioning/lifecycle và backup độc lập của hai bucket phải được cấu hình ở Cloudflare hoặc quy trình hạ tầng; không được coi thư mục `.data/media` rỗng là backup R2.

Kiểm tra ngày 17/10/2026: TypeScript, ESLint, structure 271 module, 82 test và production build 69 trang pass. Probe thật trước đó đã xác nhận `CopyObject` private → public, đọc object qua public base URL và xóa probe. Reconcile thật trước đó chạy với 0 snapshot/0 object cần bù hoặc xóa; `ops:jobs` hoàn tất cả publish-due, CDN sync và auth cleanup.
