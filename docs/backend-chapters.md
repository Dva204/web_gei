# Backend chap, ảnh và nhập hàng loạt — B4

Cập nhật 07/10/2026. Code đã nối DB và kho ảnh local; chỉ kiểm tra cơ bản theo yêu cầu ưu tiên tốc độ, chưa nghiệm thu production.

## Chạy và sử dụng

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:deploy
npm run dev
```

Giữ PostgreSQL trên cổng 5432. Nếu cổng do dự án khác sử dụng, dừng PostgreSQL của dự án đó trước; không xóa volume hoặc reset DB.

1. Đăng nhập admin đã bootstrap. Tạo truyện tại /admin/truyen; lưu lần đầu để có ID.
2. Trong Thông tin truyện, upload ảnh bìa nếu cần rồi bấm **Lưu truyện** để áp dụng. Khai báo quyền sử dụng; editor/admin có thể chuyển truyện thành Công khai.
3. Mở nút **Chap → Thêm chap**. Không bắt buộc tên chap. Chọn nhiều ảnh; thứ tự tên file là 1, 2, 10. Kéo thả hoặc dùng mũi tên trên mobile để đổi thứ tự.
4. Upload lưu đối tượng ảnh; **Lưu nháp** mới gắn chúng vào chap. Editor tự lưu khoảng 1,8 giây sau thay đổi. Lưu chap đầu tiên chuyển sang URL chap đã tạo. Xung đột revision yêu cầu tải lại, không ghi đè im lặng.
5. Admin/editor chọn **Xuất bản / cập nhật** để tạo snapshot. Truyện phải công khai, quyền còn hiệu lực, chap có ít nhất một ảnh. Sửa nháp hoặc khôi phục phiên bản không tự thay đổi snapshot đã đăng.
6. Gỡ bản công khai chặn truy cập của khách. Xóa mềm giữ ảnh/phiên bản trong DB nhưng chap không còn trên trang đọc. Chưa có UI/API khôi phục chap đã xóa mềm; các số chap đó vẫn được giữ, không nhập đè.
7. Danh sách Các phiên bản hiển thị tối đa 50 bản gần nhất; khôi phục chỉ khôi phục danh sách/thứ tự ảnh thành nháp. Không bắt buộc tên và không phục hồi tên chap.

Dữ liệu FE/IndexedDB cũ không tự nhập. Truyện chưa có snapshot xuất bản chưa xuất hiện ở user; trang đọc chỉ nhận snapshot từ DB.

## Nhập ảnh hàng loạt

- Mở /admin/nhap-hang-loat, chọn truyện từ DB.
- Đặt tên file như chap-7_001.jpg, chap-7_002.jpg, chap-8_001.jpg. File không có tiền tố gom vào số chap bắt đầu được chọn.
- Tối đa 20 chap / 600 ảnh / 100 MB mỗi lần chọn, tối đa 300 ảnh mỗi chap. Mỗi ảnh tối đa 10 MB.
- Upload → bản xem trước máy chủ → kiểm tra cảnh báo → bỏ chọn chap không muốn nhập → tạo Nháp hoặc Sẵn sàng.
- Số chap trong preview không sửa trực tiếp; đổi tên file/số bắt đầu và phân tích lại nếu cần.
- ImportJob lưu DB, hết hạn sau 2 giờ. Commit chỉ chủ job được phép, kiểm tra lại quyền/phân công và số trùng trong transaction. Retry job đã commit trả kết quả cũ, không tạo chap lần hai.
- Không tự xuất bản, không ghi đè chap đang có hoặc đã xóa mềm.

## Lịch đăng

Lên lịch lưu snapshot và người tạo lịch trong DB. Worker kiểm tra lại role/status, quyền nội dung, thời hạn và ảnh trước khi đăng:

```powershell
npm run chapters:publish-due
```

Lệnh chạy **một lần**, tối đa 50 chap đến hạn; hiện chưa cài cron/Windows Task Scheduler. Khi vận hành cần cấu hình bộ lập lịch gọi định kỳ. Sửa/lưu lại nháp hủy lịch cũ. Lịch không còn quyền hợp lệ bị hủy về nháp và ghi audit; không tự cấp quyền hoặc chuyển truyện thành công khai.

## Storage và giới hạn

- JPG/PNG/WebP kiểm tra chữ ký file, MIME và khả năng giải mã; không nhận SVG, ảnh động hay dữ liệu giả ảnh.
- Giới hạn đầu vào 10 MB, 40 megapixel, rộng 16.000/cao 30.000 px; chuyển WebP, chuẩn hóa hướng ảnh, bỏ metadata và giới hạn rộng 2.400 px không phóng lớn.
- Mỗi request upload tối đa 2 ảnh (bìa: 1), 24 MB; tối đa 2 tác vụ xử lý ảnh đồng thời mỗi process và 360 request upload/15 phút/user.
- UUID bất biến, không ghi đè. Ảnh ở **.data/media** ngoài public, DB chỉ lưu khóa/kích thước/metadata. API /api/media kiểm tra snapshot công khai hoặc staff được phân công; ảnh nháp/chưa gắn không đọc được bởi khách.
- Media trả private/no-store để request sau chịu tác động khi gỡ/ẩn truyện. Người dùng đã tải ảnh về trước đó không thể bị thu hồi bản tải.
- .data nằm trong .gitignore. Backup DB **và** .data/media; khôi phục DB riêng không khôi phục ảnh.
- MEDIA_STORAGE_DRIVER=local. Production chỉ cho upload khi đã gắn volume bền vững và MEDIA_LOCAL_PERSISTENT=true. Không đặt true trên filesystem tạm/serverless.
- Object storage/CDN chưa triển khai. Driver khác trả lỗi, không giả báo upload thành công. Nhiều replica cần kho chia sẻ trước khi triển khai.
- Bỏ ảnh khỏi nháp không xóa file; upload thất bại sau một phần có thể để lại đối tượng riêng tư chưa gắn. Chưa có GC/quota tổng/sao lưu ảnh tự động ở B9.
- Chưa có migration nhập ảnh FE cũ, resumable upload hoặc ZIP import.

## API

Các route admin yêu cầu cookie session thật; thao tác ghi kiểm tra Origin, quyền/phân công và rate limit. JSON giới hạn 32 KiB; revision phải khớp bản máy chủ.

| Route | Chức năng |
| --- | --- |
| GET/POST /api/admin/stories/:id/chapters | Danh sách / tạo nháp |
| GET/PUT/DELETE /api/admin/stories/:id/chapters/:number | Đọc / lưu nháp / xóa mềm |
| POST .../chapters/:number/publication | publish, unpublish, schedule, cancel |
| GET/POST .../chapters/:number/versions | Danh sách / khôi phục ảnh thành nháp |
| POST /api/admin/stories/:id/media | Multipart files và kind=comic hoặc covers |
| POST /api/admin/stories/:id/imports/preview | Preview và tạo job |
| POST /api/admin/stories/:id/imports/commit | Commit các số chap đã chọn |
| GET /api/media/:kind/:uuid.webp | Ảnh có kiểm tra quyền |

Author chỉ quản lý chap/import thuộc truyện được phân công. Beta chỉ đọc API theo phân công, chưa có editor beta riêng. Xuất bản/gỡ/lên lịch/xóa mềm cần editor/admin. Mỗi thao tác ghi có audit; quyền FE chỉ là gợi ý giao diện.

## Kiểm tra hiện tại

- Migration thứ 5, 20261007000100_chapter_media, đã deploy vào DB local, không reset/seed hoặc thay đổi tài khoản thật.
- TypeScript, kiểm tra cấu trúc và ESLint phần thay đổi B4.
- Smoke Route Handler với Request/Response thật + PostgreSQL + Sharp: upload, ảnh nháp 404 với khách, xuất bản WebP, sửa nháp giữ snapshot cũ, ảnh mới vẫn riêng tư, revision cũ 409, import retry không tạo trùng và worker đăng snapshot đến hạn.
- Smoke không mở HTTP server hay trình duyệt. Chạy riêng bằng npm run test:chapters:smoke khi TEST_DATABASE_URL trỏ DB riêng có tên kết thúc _test. Runner deploy vào schema random và kho ảnh test riêng, dọn đúng fixture sau chạy; không dùng dữ liệu ứng dụng.
- Chưa chạy full suite/production build, Safari/ngrok, rollback/race/đồng thời, tải lớn và ma trận quyền đầy đủ. Các mục đó còn trong checklist trước production.
