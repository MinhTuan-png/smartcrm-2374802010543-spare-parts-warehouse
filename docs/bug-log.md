# Bug Log

Mỗi mục ghi một lỗi đã thực sự gỡ theo bốn bước: tái lập → khoanh vùng → sửa nguyên nhân → xác nhận bằng test.
Mức độ: **Critical** (cả hệ thống ngừng phục vụ, dữ liệu bị sai hoặc lỗ hổng bảo mật bị khai thác được) · **Major** (một chức năng chính không dùng được, hoặc API trả 500 cho đầu vào của người dùng) · **Minor** (có cách tránh, ảnh hưởng hẹp).

BUG-001 đến BUG-003 được gỡ ở BT2 (buổi 11). **BUG-004 đến BUG-008 được phát hiện ở BT3** bằng các test case TC-07, TC-08, TC-10 và TC-11 trong [`test-report.md`](test-report.md): ở lần chạy đầu các test case này FAIL, sau khi sửa thì PASS. Mỗi mục BT3 có commit thêm test hồi quy (FAIL trước khi sửa, `7237ce0`) và commit sửa riêng.

Repo: https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse

| Mã | Mức độ | Tóm tắt | Commit sửa |
|---|---|---|---|
| BUG-001 | Minor | Giao diện ở cổng 5174 bị trình duyệt chặn CORS | `8004127` |
| BUG-002 | Critical | CSDL khởi động lại làm tiến trình API sập hẳn | `b248d54` |
| BUG-003 | Major | CSDL không trả lời thì yêu cầu API treo mãi | `07a6b4c` |
| BUG-004 | Major | `page` rất lớn làm API trả 500 (tràn OFFSET ở PostgreSQL) | `8a40edf` |
| BUG-005 | Major | Ký tự NUL trong tên đăng nhập, từ khoá tìm kiếm, tên linh kiện làm API trả 500 | `f0eefc6` |
| BUG-006 | Major | Thân quá lớn, đường dẫn mã hoá hỏng, gzip hỏng bị báo thành lỗi hệ thống 500 | `7f45a9b` |
| BUG-007 | Major | Thư viện body-parser 2.3.0 có lỗ hổng mức High (npm audit) | `f157068` |
| BUG-008 | Minor | Phản hồi lộ tiêu đề `X-Powered-By: Express` | `033c7d0` |

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

---

# Các lỗi phát hiện ở Bài tập 3

Cách tìm: chạy các test case bảo mật và đầu vào bất thường của Test Report trên mã đang chạy, đọc phản hồi và log. Mọi lỗi dưới đây đã tái lập bằng `curl` trên API thật, rồi được viết thành test hồi quy trong `tests/robustness.api.test.js` (commit `7237ce0`, chạy trên mã chưa sửa: 8/10 test FAIL) trước khi sửa.

## BUG-004 · Major — `page` rất lớn làm API trả 500

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-004 · Major (tham số đúng định dạng làm API trả 500 và ghi một dòng log ERROR; không mất dữ liệu) |
| 2. Phát hiện bởi | TC-07 (đầu vào sai: số trang vượt giới hạn) |
| 3. Triệu chứng | `GET /api/v1/centers/2/stock?page=99999999999999999999` trả HTTP 500 `INTERNAL_ERROR`, câu "Hệ thống đang gặp sự cố... Mã tra cứu: 844E4C". Mong đợi: 400 nêu rõ trường `page` |
| 4. Cách tái lập | Đăng nhập `ktv2`, lấy token, rồi `curl "http://localhost:3000/api/v1/centers/2/stock?page=99999999999999999999" -H "Authorization: Bearer <token>"` |
| 5. Nguyên nhân | Schema `page` trong `validators/stock.schema.js` chỉ kiểm regex `/^[1-9]\d*$/` nên không có cận trên. `services/stock.service.js` tính `offset = (page - 1) * 20`, ra số lớn hơn giới hạn `bigint` của PostgreSQL (9,22e18); `repositories/stock.repository.js` truyền số đó vào `OFFSET $n` và PostgreSQL báo `bigint out of range` (đã xác nhận bằng `SELECT 1 OFFSET 1999999999999999999980` trong psql). `error-handler` không biết lỗi này nên coi là lỗi hệ thống |
| 6. Cách sửa | Đổi regex thành `/^[1-9]\d{0,5}$/` (tối đa 999999) ở `validators/stock.schema.js`, dùng chung cho EP1, EP4 và danh sách linh kiện; cập nhật `docs/api-contract.md`. Trang lớn nhưng hợp lệ (999999) vẫn trả 200 với `items` rỗng |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/8a40edf · Chạy lại TC-07: 400 `VALIDATION_FAILED`, `details: [{field: "page", reason: "Phải là số nguyên từ 1 đến 999999."}]` → PASS. Test kèm theo kiểm luồng đúng: `page=999999` vẫn trả 200 (bản sửa không làm hỏng trang hợp lệ) → PASS |

## BUG-005 · Major — Ký tự NUL làm API trả 500

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-005 · Major (đường dẫn đăng nhập không cần token cũng bị: ai cũng gây được 500 và dòng log ERROR bằng một yêu cầu) |
| 2. Phát hiện bởi | TC-08 (đầu vào sai: chuỗi chứa ký tự NUL) |
| 3. Triệu chứng | `POST /api/v1/auth/login` với `{"username":"a\u0000b","password":"x"}` trả HTTP 500, mã tra cứu `6269A2`. Tương tự `GET /api/v1/centers/2/stock?q=%00` trả 500 (mã `E3CE7C`). Mong đợi: 400 nêu rõ trường sai |
| 4. Cách tái lập | `curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"a\u0000b","password":"x"}'` |
| 5. Nguyên nhân | Schema `loginBody`, `stockQuery`, `partsQuery`, `partName` chỉ kiểm độ dài chuỗi. Chuỗi JavaScript chứa được `\u0000`, driver `pg` gửi nguyên xuống CSDL, mà PostgreSQL không lưu được byte 0x00 trong kiểu text nên báo lỗi 22021 `invalid byte sequence for encoding "UTF8": 0x00` (thấy trong log ERROR). Lỗi nằm ở chỗ kiểm tra đầu vào ở lớp 2 thiếu một quy tắc, không phải ở SQL |
| 6. Cách sửa | Thêm `refine(noNul)` vào `q` (hai schema), `username` và `part_name` trong `validators/stock.schema.js`; CSDL không còn bị chạm tới với chuỗi này. Mã linh kiện và mã phiếu đã bị regex chặn từ trước |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/f0eefc6 · Chạy lại TC-08: 400 `VALIDATION_FAILED` với `field: "username"` và `field: "q"`; tạo linh kiện tên chứa NUL trả 400 và bảng `part` không thêm dòng → PASS. Luồng đúng: đăng nhập `ktv2` bình thường vẫn trả 200 (test `auth.api.test.js`) → PASS |

## BUG-006 · Major — Yêu cầu HTTP hỏng bị báo thành lỗi hệ thống 500

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-006 · Major (ba kiểu đầu vào của người gọi bị báo là "sự cố hệ thống": gây báo động giả và làm người vận hành tìm lỗi không có thật) |
| 2. Phát hiện bởi | TC-10 (bảo mật A02: yêu cầu hỏng không được thành 500) |
| 3. Triệu chứng | (a) Thân JSON 200 KB trả 500, mã `663C28`. (b) `GET /api/v1/tickets/%E0%A4%A` (mã hoá phần trăm hỏng) trả 500, mã `397BED`. (c) Thân gzip có byte thừa trả 500, mã `DBC2BD`. Mong đợi: (a) 413, (b) và (c) 400 |
| 4. Cách tái lập | (a) `curl -X POST .../api/v1/auth/login -H "Content-Type: application/json" --data-binary @tep-200kb.json` · (b) `curl ".../api/v1/tickets/%E0%A4%A" -H "Authorization: Bearer <token>"` · (c) tạo tệp gzip của `{"username":"ktv2","password":"x"}` rồi nối thêm vài byte, gửi với `Content-Encoding: gzip` |
| 5. Nguyên nhân | `controllers/error-handler.js` chỉ nhận ra `AppError` và `entity.parse.failed`; mọi lỗi khác rơi vào nhánh "lỗi không lường trước" trả 500. Nhưng `express.json()` (body-parser) và bộ giải mã tham số của Express ném lỗi `http-errors` có `err.status` 4xx (413 `entity.too.large`, 400 `Failed to decode param`, 400 lỗi giải nén), và error-handler không đọc `err.status` |
| 6. Cách sửa | Trong `controllers/error-handler.js`, lỗi có `err.status` hoặc `err.statusCode` từ 400 đến 499 được trả đúng nhóm 4xx: 413 thành mã mới `PAYLOAD_TOO_LARGE`, còn lại thành 400 `VALIDATION_FAILED`, ghi log INFO, câu thông báo cố định (không chuyển `err.message` của thư viện ra ngoài). Mọi nhánh khác giữ nguyên |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/7f45a9b · Chạy lại TC-10: (a) 413 `PAYLOAD_TOO_LARGE`, (b) 400, (c) 400, phản hồi không chứa vết ngăn xếp hay đường dẫn tệp → PASS. Luồng đúng kiểm lại: JSON hỏng cú pháp vẫn trả 400 như trước (test sẵn có), lỗi CSDL vẫn trả 503 (`db-timeout.test.js`) → PASS |

## BUG-007 · Major — Thư viện body-parser có lỗ hổng mức High

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-007 · Major (npm audit xếp mức High; **chưa tái hiện được tấn công** trên cấu hình này, xem dòng 3 nên không xếp Critical) |
| 2. Phát hiện bởi | TC-11 (bảo mật A06: phụ thuộc có lỗ hổng đã công bố) |
| 3. Triệu chứng | `npm audit --omit=dev` ở `src/backend` báo `2 vulnerabilities (1 moderate, 1 high)`: `body-parser 2.0.0 - 2.3.0` (GHSA-27r3-jxmh-p828, từ chối dịch vụ khi thân nén có byte thừa) và `qs 6.7.0 - 6.16.0` (GHSA-6pq8-jhm2-2vcw, moderate). Thử gửi thân gzip có byte thừa tới bản cũ chỉ nhận 500 (chính là BUG-006), không thấy treo hay sập, nên không khẳng định khai thác được |
| 4. Cách tái lập | `cd src/backend` rồi `npm ci` và `npm audit --omit=dev` trên mã trước commit sửa |
| 5. Nguyên nhân | `package-lock.json` ghim `body-parser@2.3.0` và `qs@6.16.0`, hai bản đã bị công bố lỗ hổng sau khi lock được tạo. Quy trình của dự án không có bước chạy `npm audit` nên không ai biết. `package.json` cho phép `express@^5.3.0` nhận bản vá nên chỉ lock cũ giữ bản lỗi |
| 6. Cách sửa | `npm audit fix` trong `src/backend`: nâng `body-parser` 2.3.0 → 2.4.0 và `qs` 6.16.0 → 6.17.1, chỉ đổi `package-lock.json`. Thêm lệnh kiểm vào Deployment Guide và checklist bảo mật. Cùng đợt, `npm audit fix` ở `src/frontend` nâng `vite` (Moderate, chỉ ảnh hưởng máy chủ dev) ở commit https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/dd36ba9 |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/f157068 · Chạy lại TC-11: `found 0 vulnerabilities` ở cả `src/backend` và `src/frontend` → PASS. Kiểm lại không vỡ luồng đúng: `npm test` 82/82 PASS sau khi nâng (nay 83/83), `npm run build` của giao diện thành công |

## BUG-008 · Minor — Lộ tiêu đề `X-Powered-By: Express`

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-008 · Minor (chỉ giúp kẻ tấn công đoán công nghệ; không phải lỗ hổng bằng chính nó) |
| 2. Phát hiện bởi | TC-10 (bảo mật A02: cấu hình lộ thông tin) |
| 3. Triệu chứng | `curl -sI http://localhost:3000/health` có dòng `X-Powered-By: Express` |
| 4. Cách tái lập | `curl -sI http://localhost:3000/health` và tìm `X-Powered-By` |
| 5. Nguyên nhân | Express tự thêm tiêu đề này mặc định; `app.js` không gọi `app.disable('x-powered-by')` |
| 6. Cách sửa | Thêm `app.disable('x-powered-by')` trong `app.js` ngay sau khi tạo `app` |
| 7. Commit và xác nhận | https://github.com/MinhTuan-png/smartcrm-2374802010543-spare-parts-warehouse/commit/033c7d0 · Chạy lại TC-10 bước kiểm tiêu đề: không còn dòng `X-Powered-By` (lọc kết quả `curl -sI` bằng `grep -ci x-powered-by` ra 0) → PASS. Kiểm luồng đúng bằng tay: `curl -sI` vẫn trả `X-Request-Id` và `/health` vẫn trả 200 `{"status":"ok","db":"ok"}` → PASS |
