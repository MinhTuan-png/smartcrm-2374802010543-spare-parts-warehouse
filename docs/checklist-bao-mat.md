# Checklist bảo mật 7 mục (Bài tập 3)

Mỗi mục được điền bằng cách **chạy thử**, không bằng cách nhớ lại. Giá trị: ĐÃ LÀM / CHƯA LÀM / KHÔNG ÁP DỤNG, kèm một dòng minh chứng. Các lệnh đã chạy trên mã sau khi sửa BUG-004 đến BUG-008 (xem [`bug-log.md`](bug-log.md)); test case tương ứng ở [`test-report.md`](test-report.md).

| # | Mục | Giá trị | Một dòng minh chứng |
|---|---|---|---|
| 1 | Không có secret nào trong repo | ĐÃ LÀM | `git log --all --oneline -- .env` không ra dòng nào (`.env` chưa từng được commit); `.gitignore` chặn `.env`; `.env.example` chỉ có giá trị mẫu (`SECRET_KEY=doi-chuoi-nay-...`, `DB_PASSWORD=doi_mat_khau_nay`); quét lịch sử bằng `git log --all -p -G'(PASSWORD\|SECRET_KEY)=.{8,}'` chỉ thấy các giá trị mẫu này và `DEMO_PASSWORD=matkhau-demo-2026` (mật khẩu của tài khoản demo công khai, không phải secret thật); `docker-compose.yml` chỉ dùng `${BIEN}` |
| 2 | Dữ liệu vào được kiểm ở tầng ứng dụng | ĐÃ LÀM | Mọi route gọi `validate(schema, …)` (zod) ở `controllers/*.js` trước khi vào service (`validators/stock.schema.js`); SQL luôn dùng tham số `$1…` (`repositories/*.js`); TC-07 (`page` quá lớn → 400), TC-08 (ký tự NUL → 400); `GET …/stock?q=' OR 1=1 --` trả `total_items=0` (không lộ cả bảng) |
| 3 | Kiểm soát truy cập theo chủ sở hữu (trung tâm) | ĐÃ LÀM | TC-09: token trung tâm 2 gọi `/api/v1/centers/3/stock` → 403; gọi phiếu `BH-000057/2024` của trung tâm 3 → 403; kỹ thuật viên gọi thao tác của quản lý → 403; CSDL không đổi (`controllers/auth.js` hàm `sameCenter`, `services/ticket.service.js`, `services/stock.service.js`). Giới hạn đã biết: danh mục linh kiện `/api/v1/parts` dùng chung, quản lý của **bất kỳ** trung tâm nào cũng sửa được (quyết định thiết kế TD-21) |
| 4 | Mật khẩu và dữ liệu nhạy cảm được băm hoặc mã hoá | ĐÃ LÀM | `SELECT username, left(password_hash,40) FROM app_user` ra `scrypt$60ab84e6c864eacb74fd3dc2f2bc9ba8$…`: scrypt với muối ngẫu nhiên mỗi tài khoản (`services/password.js`), so sánh bằng `timingSafeEqual`; sai tên và sai mật khẩu trả cùng một lỗi 401 (test `auth.api.test.js`) |
| 5 | Thông báo lỗi không lộ cấu trúc bên trong | ĐÃ LÀM (sau khi sửa BUG-006, BUG-008) | TC-10: yêu cầu hỏng trả 400/413 với câu cố định, phản hồi không chứa `node_modules`, `.js:số`, `part_stock`; lỗi 500 chỉ có câu chung và mã tra cứu (`controllers/error-handler.js`); tiêu đề `X-Powered-By` đã tắt. Trước khi sửa, ba kiểu yêu cầu hỏng bị báo là lỗi hệ thống 500 |
| 6 | Nhật ký không ghi secret hay dữ liệu cá nhân không cần thiết | ĐÃ LÀM | `logger.js` che các trường `password`, `token`, `authorization`, `secret`, `phone`… thành `***` (test `logger.test.js`, 7 test); log chỉ ghi đường dẫn, không ghi query string. Sau khi đăng nhập và gọi API trên hệ thống Docker: `docker compose logs api \| grep -c "matkhau-demo-2026"` ra 0, `grep -c "eyJhbGci"` (đầu của token) ra 0, trên 63 dòng log |
| 7 | Phụ thuộc được ghim phiên bản và đã kiểm cảnh báo lỗ hổng cơ bản | ĐÃ LÀM (có giới hạn) | Có `package-lock.json` ở cả `src/backend` và `src/frontend`, Dockerfile dùng `npm ci`; `npm audit --omit=dev` ở backend và `npm audit` ở frontend đều `found 0 vulnerabilities` (TC-11, sau khi nâng `body-parser`, `qs`, `vite` ở BUG-007). Giới hạn: ảnh nền ghim theo thẻ (`node:22-alpine`, `postgres:16-alpine`, `nginxinc/nginx-unprivileged:1.27-alpine`), chưa ghim theo digest; chưa có bước `npm audit` tự động trong CI |

## Rủi ro và giới hạn của sản phẩm (nêu rõ, chưa xử lý)

| Rủi ro | Mức | Vì sao chưa xử lý | Hướng xử lý |
|---|---|---|---|
| Đăng nhập không giới hạn số lần thử, không khoá tài khoản (A07) | Trung bình | Ngoài phạm vi prototype; scrypt làm mỗi lần thử tốn thời gian nhưng chưa phải biện pháp chống dò mật khẩu | Thêm giới hạn tốc độ theo địa chỉ IP và tên đăng nhập, khoá tạm sau N lần sai |
| 12 tài khoản mẫu dùng chung một mật khẩu `DEMO_PASSWORD` và mật khẩu mẫu in trong `.env.example` | Thấp với bản demo, cao nếu đưa lên mạng | Cần để người chấm đăng nhập được ngay | Đổi `DEMO_PASSWORD` trước khi triển khai thật; không nạp tài khoản mẫu ở môi trường thật |
| Token lưu trong `localStorage`, hiệu lực 8 giờ, không thu hồi được | Trung bình | Chấp nhận ở mức prototype vì giao diện không hiển thị HTML do người dùng nhập (đã ghi ở README) | Chuyển sang cookie `HttpOnly`, thêm danh sách thu hồi |
| Chạy HTTP, không có TLS; cổng CSDL 5433 mở ra máy | Trung bình | Chạy thử trên máy cá nhân | Đặt sau proxy có TLS; không công bố cổng CSDL ở môi trường thật |
| `scryptSync` chặn vòng lặp sự kiện khi đăng nhập | Thấp | Đủ cho prototype | Đổi sang `crypto.scrypt` bất đồng bộ |
| Danh mục linh kiện dùng chung, quản lý trung tâm nào cũng sửa được | Thấp | Quyết định thiết kế TD-21 | Thêm vai trò quản trị danh mục riêng |
