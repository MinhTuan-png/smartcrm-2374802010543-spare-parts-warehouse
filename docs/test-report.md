# Test Report (Bài tập 3)

12 test case đã **chạy thật** trên hệ thống L5 (kho linh kiện), mỗi test case có đủ tám cột. Mỗi test case có một mã `TC-xx` nằm trong tên test, nên chạy lại đúng một test case bằng `npm test -- TC-05` (hoặc xem mục "Cách chạy lại" cuối trang). Kế hoạch ở [`test-plan.md`](test-plan.md); lỗi phát hiện ở [`bug-log.md`](bug-log.md).

- **Lần chạy ghi ở đây:** 03/11/2026, Linux, Docker 29.9.2, Node 22.22, PostgreSQL 16 (ảnh `postgres:16-alpine`), CSDL test `smartcrm_test`. Sinh viên cần chạy lại trên máy của mình (Windows) trước khi nộp và chụp ảnh cho Mục 7 của báo cáo PDF.
- **Cách đọc cột cuối:** `PASS` là đạt ngay lần chạy đầu. `FAIL → PASS` là lần chạy đầu FAIL (lỗi thật, ghi trong Bug Log), sau khi sửa chạy lại PASS.
- **Truy vết:** cột Mã ghi rõ quy tắc hoặc yêu cầu mà test case kiểm.

| Mã · truy vết | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | P/F |
|---|---|---|---|---|---|---|---|
| **TC-01** · luồng đúng · QT-09, QT-14, QT-L5-01 | CSDL `smartcrm_test` được `reset()` dựng sẵn: trung tâm 2 có `PIN-OP-03` tồn 10, ngưỡng 3; phiếu `BH-000002/2025` thuộc trung tâm 2, trạng thái Đang xử lý; token của kỹ thuật viên trung tâm 2 | 1. `POST /api/v1/centers/2/stock/exports` <br>2. Đọc lại tồn trong CSDL <br>3. Đếm giao dịch `XUAT` | `ticket_code=BH-000002/2025`, `part_code=PIN-OP-03`, `quantity=2` | 201; `stock.quantity=8`; có đúng 1 giao dịch `XUAT` gắn mã phiếu; tồn trong CSDL bằng 8 | Cao | 201; `stock.quantity=8`; `transaction.type=XUAT`, `ticket_code=BH-000002/2025`; CSDL tồn 8; số giao dịch `XUAT` = 1. Lặp lại trên hệ thống đang chạy với dữ liệu mẫu: tồn 10 → 8, giao dịch số 4952 | PASS |
| **TC-02** · luồng đúng · QT-L5-02 | Như TC-01; thêm phiếu `BH-000003/2025` thuộc trung tâm 2, trạng thái **Chờ linh kiện** | 1. `POST .../stock/exports` cho phiếu đang Chờ linh kiện <br>2. Đọc lại tồn | `ticket_code=BH-000003/2025`, `part_code=PIN-OP-03`, `quantity=1` | 201; tồn 9; giao dịch gắn đúng mã phiếu `BH-000003/2025` | Cao | 201; `stock.quantity=9`; `transaction.ticket_code=BH-000003/2025`; CSDL tồn 9 | PASS |
| **TC-03** · luồng đúng · QT-L5-01 (sổ chỉ ghi thêm) | Trung tâm 2 có `LOA-AP-01` tồn 1; token quản lý trung tâm 2 | 1. `POST .../stock/imports` <br>2. Đọc tồn <br>3. Đọc dòng giao dịch vừa ghi | `part_code=LOA-AP-01`, `quantity=20` | 201; tồn 21; giao dịch `NHAP`, `ticket_code=null` | Cao | 201; `stock.quantity=21`; `transaction.type=NHAP`, `ticket_code=null`; trên hệ thống đang chạy: `PIN-OP-02` tồn 7 → 27, giao dịch số 4951 | PASS |
| **TC-04** · luồng đúng · QT-13 (xoá là ngừng dùng) | Danh mục chưa có mã `PIN-NK-01`; token quản lý trung tâm 2; kỹ thuật viên đọc được danh mục | 1. Tạo linh kiện <br>2. Sửa đơn giá <br>3. `DELETE` linh kiện <br>4. Đọc lại bằng API <br>5. Đếm dòng trong bảng `part` | `part_code=PIN-NK-01`, tên `Pin Nokia loại 1`, đơn giá 350000 sửa thành 390000 | 201, 200, 204; đọc lại 404; dòng **vẫn còn** trong bảng `part` với `is_active=false` | Cao | 201 → 200 (giá 390000) → 204 → 404; bảng `part` vẫn có dòng `PIN-NK-01` với `is_active=false`. Cùng thao tác trên hệ thống đang chạy với mã `TEST-DOC-01`: 201 → 200 → 204. Linh kiện còn tồn thì `DELETE` trả 409 `STOCK_NOT_EMPTY` (kiểm trong cùng file test) | PASS |
| **TC-05** · giá trị biên (bên được phép) · QT-09 | Dòng tồn giả trong bộ nhớ (repository giả): tồn 5, ngưỡng 3; phiếu Đang xử lý cùng trung tâm | 1. Gọi `exportPart` xuất đúng bằng tồn | `quantity=5` (tồn 5) | Thành công; tồn về 0; nhãn `HẾT HÀNG` | Cao | Thành công; tồn 0; `warning_label=HẾT HÀNG` | PASS |
| **TC-06** · giá trị biên (bên bị từ chối) · QT-09 | Như TC-05 (tồn 5) | 1. Gọi `exportPart` xuất nhiều hơn tồn 1 đơn vị <br>2. Kiểm tồn không đổi | `quantity=6` (tồn 5) | Lỗi `INSUFFICIENT_STOCK` (HTTP 409); tồn vẫn 5; không ghi giao dịch nào | Cao | Ném `AppError` mã `INSUFFICIENT_STOCK`; tồn vẫn 5; sổ giao dịch trống. Ở API thật với tồn 8, xuất 9999: 409 kèm `details.available_quantity=8` | PASS |
| **TC-07** · dữ liệu sai · yêu cầu 400 nêu rõ trường | Đăng nhập `ktv2` (trung tâm 2) | 1. `GET /api/v1/centers/2/stock?page=99999999999999999999` <br>2. Ghi mã trạng thái và thân phản hồi <br>3. Gọi thêm `page=999999` (hợp lệ) | `page=99999999999999999999`; `page=999999` | Bước 1: 400 `VALIDATION_FAILED`, `details` nêu trường `page`. Bước 3: 200 với `items` rỗng | Cao | **Lần 1:** HTTP 500 `INTERNAL_ERROR`, mã tra cứu `844E4C` (PostgreSQL: `bigint out of range`). **Sau sửa BUG-004:** 400, `details=[{field:"page", reason:"Phải là số nguyên từ 1 đến 999999."}]`; `page=999999` trả 200 `items=[]` | FAIL → PASS (BUG-004) |
| **TC-08** · dữ liệu sai · ký tự NUL | Hệ thống chạy; không cần đăng nhập cho bước 1 | 1. `POST /api/v1/auth/login` với tên chứa NUL <br>2. `GET .../stock?q=%00` <br>3. `POST /api/v1/parts` với `part_name` chứa NUL, rồi đếm dòng bảng `part` | `username="a\u0000b"`; `q=%00`; `part_name="Pin\u0000lạ"` | Cả ba: 400 `VALIDATION_FAILED` nêu đúng trường (`username`, `q`, `part_name`); bảng `part` không thêm dòng | Cao | **Lần 1:** bước 1 và 2 trả HTTP 500 (mã `6269A2`, `E3CE7C`; log: `invalid byte sequence for encoding "UTF8": 0x00`, mã 22021); bước 3 cũng 500. **Sau sửa BUG-005:** cả ba 400 đúng trường, bảng `part` không đổi | FAIL → PASS (BUG-005) |
| **TC-09** · bảo mật A01 · QT-14, NFR5 | Trung tâm 2 và 3 đều có dữ liệu; token kỹ thuật viên và quản lý của trung tâm 2; phiếu của trung tâm 3 | 1. Lấy token trung tâm 2, gọi tồn kho trung tâm 3 <br>2. Gọi `GET /api/v1/tickets/<mã phiếu trung tâm 3>` (test: `BH-000100/2026`; dữ liệu mẫu: `BH-000057/2024`) <br>3. Gọi các thao tác sai vai trò <br>4. Đọc lại CSDL | `centerId=3` trên đường dẫn; mã phiếu của trung tâm khác; vai trò sai | Mọi yêu cầu sai trung tâm hoặc sai vai trò đều 403; dữ liệu trong CSDL không đổi | Cao | 403 `FORBIDDEN` cho tồn trung tâm 3, 403 cho phiếu của trung tâm 3 (kể cả `BH-000057/2024` trên dữ liệu mẫu; thông báo không nói phiếu thuộc trung tâm nào), 403 cho mọi thao tác sai vai trò; CSDL không đổi | PASS |
| **TC-10** · bảo mật A02 · yêu cầu hỏng không thành 500, không lộ thông tin | Hệ thống chạy; token hợp lệ cho bước 2 | 1. `POST /auth/login` thân JSON 200 KB <br>2. `GET /api/v1/tickets/%E0%A4%A` <br>3. `POST /auth/login` thân gzip có byte thừa <br>4. Đọc phản hồi tìm vết ngăn xếp, tên bảng <br>5. `curl -sI /health` tìm `X-Powered-By` | Thân 200 KB; đường dẫn `%E0%A4%A`; gzip + `BYTE-THUA` | Bước 1: 413 `PAYLOAD_TOO_LARGE`; bước 2 và 3: 400; bước 4: không có `node_modules`, `.js:số`, `part_stock`; bước 5: không có tiêu đề `X-Powered-By` | Cao | **Lần 1:** bước 1, 2, 3 đều HTTP 500 (mã `663C28`, `397BED`, `DBC2BD`); bước 4 sạch; bước 5 có `X-Powered-By: Express`. **Sau sửa BUG-006 và BUG-008:** 413, 400, 400; bước 4 sạch; bước 5 không còn tiêu đề | FAIL → PASS (BUG-006, BUG-008) |
| **TC-11** · bảo mật A06 · phụ thuộc có lỗ hổng | Đã `npm ci` ở `src/backend` và `src/frontend` | 1. `cd src/backend && npm audit --omit=dev` <br>2. `cd src/frontend && npm audit` | Không (đọc `package-lock.json`) | Cả hai báo `found 0 vulnerabilities` | Cao | **Lần 1 (backend):** `2 vulnerabilities (1 moderate, 1 high)`: `body-parser 2.3.0` (GHSA-27r3-jxmh-p828) và `qs 6.16.0` (GHSA-6pq8-jhm2-2vcw); frontend: 1 moderate (`vite`). **Sau sửa BUG-007:** `found 0 vulnerabilities` ở cả hai | FAIL → PASS (BUG-007) |
| **TC-12** · tái lập (bắt buộc) · C3, C8 | Hệ thống dựng từ thư mục trống bằng `docker compose up -d --build`; ba dịch vụ healthy | 1. Chạy `docker compose --profile test run --rm test`, ghi kết quả <br>2. Chạy lại lần hai <br>3. Chạy lại migrate và seed lần hai trong container `api`, đếm dòng | Bộ 83 test; dữ liệu mẫu `data-mau/` | Hai lần chạy cho cùng kết quả (`# pass 83`, `# fail 0`, `# skipped 0`); số dòng sau seed lần hai không đổi: `part_stock=717`, `ticket=360`, `app_user=12`, `part_transaction=174` | Cao | Lần 1: `# tests 83`, `# pass 83`, `# fail 0`, `# skipped 0`. Lần 2: giống hệt. Seed lần hai: `part_stock=717`, `ticket=360`, `app_user=12`, `part_transaction=174` (không đổi) | PASS |

**Tổng kết lần chạy:** 12 test case, 8 PASS ngay lần đầu, 4 FAIL ở lần đầu (TC-07, TC-08, TC-10, TC-11) do 5 lỗi thật BUG-004 đến BUG-008, cả 4 đều PASS sau khi sửa. Không còn bug mở. Bộ tự động đầy đủ: 83/83 PASS ở backend, 4/4 PASS ở giao diện.

**Phủ quy tắc nghiệp vụ (truy vết):**

| Quy tắc / yêu cầu | Test case | Ngoài 12 test case, còn kiểm bởi |
|---|---|---|
| QT-09 không xuất quá tồn | TC-01, TC-05, TC-06 | `stock.api.test.js` (409 kèm tồn hiện có), `stock.service.test.js` |
| QT-14 phạm vi trung tâm | TC-01, TC-09 | `auth.test.js`, `ticket.api.test.js`, `stock-crud.api.test.js` |
| QT-L5-01 sổ giao dịch chỉ ghi thêm | TC-01, TC-03 | `stock.api.test.js` (số giao dịch trước và sau lần lỗi không đổi) |
| QT-L5-02 trạng thái phiếu được phép | TC-02 | `stock.api.test.js` (422 với phiếu Đã phân công), `stock.service.test.js` (422 với phiếu Đã hoàn tất) |
| QT-13 xoá là ngừng dùng | TC-04 | `part.api.test.js`, `stock-crud.api.test.js` |
| NFR3 đồng thời | Không nằm trong 12 test case | `stock.api.test.js`: 20 yêu cầu xuất 1 trên tồn 10 → đúng 10 thành công, 10 bị 409, tồn cuối 0 |
| NFR5 phân quyền | TC-09 | `stock.api.test.js` |

## Cách chạy lại

Cần máy có Docker (không cần Node hay PostgreSQL). Tại thư mục gốc repo đã `docker compose up -d --build`:

```bash
# Toàn bộ 83 test
docker compose --profile test run --rm test

# Đúng một test case (ví dụ TC-05)
docker compose --profile test run --rm test sh -c "node scripts/create-test-db.js && npm test -- TC-05"
```

Trên máy có Node 22 và PostgreSQL 16, trong `src/backend`: `npm test` hoặc `npm test -- TC-05`. TC-11 chạy bằng tay: `npm audit --omit=dev` trong `src/backend` và `npm audit` trong `src/frontend`. TC-09 bước 2 và TC-04 phần "dòng vẫn còn trong CSDL" cũng nằm trong bộ test tự động; các bước gọi bằng `curl` có trong [`docs/api-docs/`](api-docs/README.md).
