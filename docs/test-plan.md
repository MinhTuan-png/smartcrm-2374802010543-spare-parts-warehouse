# Test Plan rút gọn (Bài tập 3)

Hệ thống: kho linh kiện thay thế L5 của Smart CRM – Mekong Mobile (SE). Phiên bản kiểm thử: nhánh `main` sau các commit sửa lỗi BUG-004 đến BUG-008 (xem [`bug-log.md`](bug-log.md)). Kết quả chạy nằm ở [`test-report.md`](test-report.md).

## 1. Phạm vi kiểm thử và phần chủ ý KHÔNG kiểm

**Kiểm:**

| Nhóm | Nội dung | Vì sao kiểm |
|---|---|---|
| Quy tắc nghiệp vụ | QT-09 (không xuất quá tồn), QT-14 (mỗi người chỉ thao tác trên trung tâm của mình), QT-L5-01 (sổ giao dịch chỉ ghi thêm, trừ tồn và ghi sổ trong cùng một giao dịch), QT-L5-02 (chỉ xuất cho phiếu Đang xử lý hoặc Chờ linh kiện), QT-13 (xoá là ngừng dùng, không xoá vật lý) | Đây là bốn quy tắc nghiệp vụ cốt lõi cộng một quy tắc dữ liệu; sai là tồn kho sai hoặc lộ dữ liệu trung tâm khác |
| Yêu cầu phi chức năng | NFR3 (20 yêu cầu xuất đồng thời, tồn không âm), NFR5 (sai vai trò hoặc sai trung tâm luôn bị 403) | Là cam kết đã ghi trong SRS |
| Đầu vào bất thường | Số trang quá lớn, ký tự NUL, thân yêu cầu quá lớn, đường dẫn mã hoá hỏng, gzip hỏng | Bảo đảm hệ thống từ chối bằng 4xx có thông báo rõ, không sập và không trả 500 |
| Bảo mật mức nhận biết | A01 kiểm soát truy cập theo trung tâm, A02 cấu hình lộ thông tin, A04 mật khẩu băm, A05 chèn mã, A07 xác thực, A06 phụ thuộc có lỗ hổng (xem [`checklist-bao-mat.md`](checklist-bao-mat.md)) | Đề BT3 bắt buộc kiểm quyền truy cập theo chủ sở hữu |
| Đóng gói | Dựng từ thư mục trống bằng hai lệnh, mọi dịch vụ healthy, seed chạy lại không nhân đôi dữ liệu | Mục kiểm chứng cốt lõi C1 và C8 |

**Cố ý KHÔNG kiểm:**

| Không kiểm | Lý do |
|---|---|
| Giao diện React (chỉ có 4 test hợp đồng ở `src/frontend/src/api/stock.view.test.js`) | Giao diện không chứa quy tắc nghiệp vụ nào: mọi quy tắc nằm ở backend và đã được kiểm qua API. Hình ảnh ba màn hình và ba trạng thái đã chụp ở BT2 |
| Tạo và sửa phiếu sửa chữa | Thuộc luồng L2; L5 chỉ đọc phiếu qua `ticket.integration.js` nên chỉ kiểm phần đọc và phần phân quyền |
| UC5 (báo thiếu linh kiện) và UC8 (lịch sử giao dịch kho) | Chưa hiện thực, đã ghi "Chưa xong" trong báo cáo BT2; không kiểm thứ chưa có |
| Hiệu năng, chịu tải, kiểm thử xâm nhập, HTTPS | Thuộc Chuyên đề tốt nghiệp 2 theo đề BT3 |
| Cấu hình nginx của ảnh giao diện | Chỉ chuyển tiếp `/api`; được kiểm gián tiếp khi đăng nhập qua cổng 8080 ở phép thử máy trắng |

## 2. Loại test và số lượng mỗi tầng

Bộ kiểm thử tự động chạy bằng một lệnh, tổng **83 test** ở backend và **4 test** ở giao diện:

| Tầng | Số lượng | Tệp | Cần CSDL |
|---|---|---|---|
| Unit và hợp đồng (service dùng repository giả, schema zod, hàm chuyển đổi, xác thực, logger, CORS, hết giờ CSDL) | 37 | `stock.service.test.js` (8), `stock.schema.test.js` (7), `stock.contract.test.js` (6), `auth.test.js` (5), `logger.test.js` (7), `cors.test.js` (2), `db-timeout.test.js` (2) | Không |
| Integration và API qua HTTP với PostgreSQL thật | 46 | `stock.api.test.js` (15), `robustness.api.test.js` (10), `ticket.api.test.js` (6), `part.api.test.js` (6), `stock-crud.api.test.js` (4), `auth.api.test.js` (3), `health.test.js` (1), `db-restart.test.js` (1) | Có |
| Giao diện (vitest) | 4 | `src/frontend/src/api/stock.view.test.js` | Không |

**12 test case trong Test Report** là phần được chọn từ bộ trên (mỗi test case có mã `TC-xx` trong tên test để chạy lại bằng `npm test -- TC-01`): 4 luồng đúng cho 4 quy tắc (cộng một quy tắc dữ liệu), 2 giá trị biên, 2 dữ liệu sai, 2 bảo mật, 1 phụ thuộc, 1 tái lập. Số còn lại trong bộ 83 test là kiểm thử bổ sung đã có từ BT2.

## 3. Tiêu chí thành công đo được

1. Cả 12 test case trong Test Report ở trạng thái PASS khi chạy lần cuối; test case FAIL ở lần chạy đầu phải có mục Bug Log và link commit sửa.
2. Mỗi quy tắc nghiệp vụ đã hiện thực (QT-09, QT-14, QT-L5-01, QT-L5-02, QT-13) có ít nhất một test luồng đúng; QT-09 có thêm hai test ở hai bên ranh giới (tồn 5 xuất 5 và xuất 6).
3. Không còn bug mức Critical nào đang mở trong Bug Log.
4. `npm test` cho kết quả `# fail 0` và `# skipped 0` (không có test nào bị bỏ qua vì thiếu CSDL).
5. `npm audit --omit=dev` ở `src/backend` báo `found 0 vulnerabilities`.
6. Phép thử máy trắng: clone về thư mục trống, hai lệnh, `docker compose ps` báo `db`, `api`, `web` đều `healthy`, và chạy lại seed lần hai không đổi số dòng (717 dòng tồn, 360 phiếu, 12 tài khoản).

## 4. Môi trường và dữ liệu thử

| Mục | Nội dung |
|---|---|
| Chạy ở đâu | Cách chính: trong container của `docker-compose.yml`, lệnh `docker compose --profile test run --rm test` (dịch vụ `test`, ảnh dựng từ `Dockerfile.test`, chờ `db` healthy). Cách phụ: `npm test` trong `src/backend` trên máy có Node 22 và PostgreSQL 16 |
| CSDL | Một CSDL riêng tên `smartcrm_test` (bắt buộc kết thúc bằng `_test`, `tests/helpers/test-db.js` từ chối chạy nếu tên khác để không xoá nhầm dữ liệu thật). `scripts/create-test-db.js` tạo CSDL này nếu chưa có |
| Dữ liệu thử | Do mã dựng, không phụ thuộc dữ liệu trên máy: mỗi test gọi `reset()` trong `tests/helpers/test-db.js` để chạy migration, `TRUNCATE` mọi bảng rồi nạp 8 dòng tồn, 4 phiếu, 2 trung tâm, 2 tài khoản cố định. (Dự án dùng hàm `reset()` thay cho tệp `seeds/test_fixtures.sql`.) Dữ liệu mẫu của hệ thống đang chạy là `data-mau/` (717 dòng tồn, 360 phiếu, 12 tài khoản) |
| Dọn dẹp | Mỗi test tự xoá sạch và nạp lại trước khi chạy; các test chạy tuần tự (`--test-concurrency=1`) nên không tranh nhau CSDL |
| Chạy lại một test case | `npm test -- TC-05` (hoặc trong Docker: `docker compose --profile test run --rm test sh -c "node scripts/create-test-db.js && npm test -- TC-05"`) |
