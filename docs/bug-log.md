# Bug Log

Mỗi mục ghi một lỗi đã thực sự gỡ theo bốn bước: tái lập → khoanh vùng → sửa nguyên nhân → xác nhận bằng test.
Mức độ: **Critical** (cả hệ thống ngừng phục vụ) · **Major** (một chức năng chính không dùng được) · **Minor** (có cách tránh, ảnh hưởng hẹp).

Repo: https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse

| Mã | Mức độ | Tóm tắt | Commit sửa |
|---|---|---|---|
| BUG-001 | Minor | Giao diện ở cổng 5174 bị trình duyệt chặn CORS | `8004127` |
| BUG-002 | Critical | CSDL khởi động lại làm tiến trình API sập hẳn | `b248d54` |
| BUG-003 | Major | CSDL không trả lời thì yêu cầu API treo mãi | `07a6b4c` |

---

## BUG-001 · Minor — Giao diện ở cổng 5174 bị chặn CORS

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-001 · Minor (chỉ xảy ra khi cổng 5173 bận; giải phóng cổng 5173 là dùng lại được) |
| 2. Phát hiện bởi | Chạy thử toàn luồng ở buổi 10: cổng 5173 đang bị tiến trình khác chiếm nên giao diện chạy ở `http://localhost:5174` |
| 3. Triệu chứng | Trang đăng nhập báo "Không kết nối được tới máy chủ kho"; tab Console của trình duyệt báo bị chặn CORS. Backend vẫn chạy, curl gọi API bình thường |
| 4. Cách tái lập | `curl.exe -i -X OPTIONS http://localhost:3000/api/v1/auth/login -H "Origin: http://localhost:5174" -H "Access-Control-Request-Method: POST"`: phản hồi không có header `Access-Control-Allow-Origin` |
| 5. Nguyên nhân | `app.js` so sánh `req.headers.origin === process.env.CORS_ORIGIN`, tức chỉ chấp nhận ĐÚNG MỘT nguồn. `CORS_ORIGIN` không khai báo được nguồn thứ hai (5174) nên mọi yêu cầu từ 5174 bị từ chối ở bước preflight |
| 6. Cách sửa | `CORS_ORIGIN` nhận danh sách nhiều nguồn cách nhau bằng dấu phẩy; `app.js` tách danh sách và kiểm `allowedOrigins.includes(origin)`. Nguồn không khai báo vẫn bị từ chối. `.env.example` khai báo sẵn 5173 và 5174 |
| 7. Commit và xác nhận | Sửa: https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/8004127 · Test hồi quy `tests/cors.test.js` (commit https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/e4f679b): chạy với `app.js` trước commit sửa thì FAIL ("cả hai nguồn khai báo đều được phép"), sau commit sửa thì PASS 2/2 |

## BUG-002 · Critical — CSDL khởi động lại làm API sập hẳn

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-002 · Critical (cả API ngừng, mọi người dùng mất mọi chức năng cho tới khi có người chạy lại server bằng tay) |
| 2. Phát hiện bởi | Phép thử suy giảm có kiểm soát của buổi 11: đang chạy API thì tắt PostgreSQL (`docker stop` container CSDL) |
| 3. Triệu chứng | Tiến trình `node index.js` thoát ngay, terminal in `error: terminating connection due to administrator command` (mã `57P01`). Bật lại CSDL thì API vẫn chết; giao diện báo "Không kết nối được tới máy chủ kho" |
| 4. Cách tái lập | Chạy API, gọi một lần `GET /api/v1/centers/2/stock` (để pool giữ một kết nối rảnh), rồi tắt CSDL hoặc chạy `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'smartcrm' AND pid <> pg_backend_pid();` → API thoát. Chạy test hồi quy 3 lần trên mã trước khi sửa: 3/3 lần sập |
| 5. Nguyên nhân | Khi CSDL cắt một kết nối ĐANG RẢNH trong pool, thư viện `pg` phát sự kiện `'error'` trên đối tượng `Pool`. `db/connection.js` không đăng ký hàm nghe sự kiện này, và theo quy tắc của Node, sự kiện `'error'` không ai nghe là lỗi không bắt (uncaughtException) nên cả tiến trình bị tắt. Lỗi không nằm ở yêu cầu nào nên error-handler không bao giờ thấy nó |
| 6. Cách sửa | `db/connection.js` thêm `pool.on('error', ...)` ghi log WARN. Pool tự bỏ kết nối hỏng và mở kết nối mới ở truy vấn sau, nên không cần làm gì thêm. Kiểm lại bằng Docker: `docker compose stop db` → API trả 503 có mã tra cứu, container api vẫn "healthy" không khởi động lại; `docker compose start db` → API phục vụ lại ngay |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/b248d54 · Test hồi quy `tests/db-restart.test.js` "CSDL cắt kết nối đang rảnh: API không sập, truy vấn sau đó vẫn chạy": FAIL trước khi sửa (`failureType: 'uncaughtException'`, `terminating connection due to administrator command`), PASS sau khi sửa |

## BUG-003 · Major — CSDL không trả lời thì yêu cầu API treo mãi

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-003 · Major (mọi màn hình quay "Đang tải..." không dừng, người dùng không biết chuyện gì xảy ra và không có nút Thử lại) |
| 2. Phát hiện bởi | Phép thử suy giảm có kiểm soát của buổi 11: tạm dừng container CSDL (`docker pause`) khi API đang chạy |
| 3. Triệu chứng | `GET /api/v1/centers/2/stock` không có phản hồi; curl chờ hết 12 giây vẫn chưa nhận được gì (`[000 12.0s]`). Log không có dòng nào vì yêu cầu chưa kết thúc |
| 4. Cách tái lập | Mở một máy chủ TCP nhận kết nối nhưng không trả lời, trỏ `DB_HOST`/`DB_PORT` vào đó, gọi bất kỳ endpoint nào có truy vấn CSDL → yêu cầu treo. Test `tests/db-timeout.test.js` tự làm đúng các bước này |
| 5. Nguyên nhân | `db/connection.js` tạo `Pool` không có `connectionTimeoutMillis`; mặc định của `pg` là 0, nghĩa là chờ kết nối VÔ HẠN. CSDL nhận TCP mà không trả lời thì truy vấn không bao giờ kết thúc, lỗi không bao giờ đi tới error-handler. Phía giao diện, `fetch` trong `api/client.js` cũng không có thời gian chờ nên chờ theo |
| 6. Cách sửa | `connectionTimeoutMillis` = `DB_CONNECT_TIMEOUT_MS` (mặc định 5000 ms). Error-handler nhận ra lỗi "không kết nối được CSDL" (hết giờ, `ECONNREFUSED`, `ENOTFOUND`, `57P01`...) và trả **503** `INTERNAL_ERROR` kèm mã tra cứu thay vì 500. Giao diện thêm thời gian chờ 20 giây cho `fetch`, hết giờ thì hiện lỗi có nút Thử lại |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/07a6b4c · Test hồi quy "CSDL không trả lời: API trả 503 trong vài giây, không treo": FAIL trước khi sửa (hết 4 giây chưa có phản hồi), PASS sau khi sửa (503 sau khoảng 0,5 giây với `DB_CONNECT_TIMEOUT_MS=500`). Thêm test đơn vị: `ECONNREFUSED`, `57P01` → 503 |
