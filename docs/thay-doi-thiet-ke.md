# Nhật ký thay đổi thiết kế

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

### TD-01 Tên file PDF sai mẫu
- Phản hồi của GV : Tên file là BT1_TranHuynhMinhTuan_2374802010543.pdf, phải là BT1_2374802010543_TranHuynhMinhTuan.pdf.
- Quyết định : SỬA
- Lý do : Đúng mẫu đặt tên của học phần (MSSV trước, họ tên sau).
- Ảnh hưởng : Không ảnh hưởng thiết kế. Đổi tên file ở thư mục gốc repo bằng git mv, không sửa nội dung.

### TD-02 Báo cáo quá dài, phần API contract là làm thừa ở BT1
- Phản hồi của GV : Bài dài 40 trang (gợi ý 6–9 trang); phần API contract khoảng 15 trang là thừa ở BT1.
- Quyết định : SỬA
- Lý do : BT1 chỉ cần SRS, use case, kiến trúc, ERD, wireframe. API contract thuộc giai đoạn cài đặt, nên viết sau khi có mã chạy.
- Ảnh hưởng : Không đổi thiết kế. Từ BT2, báo cáo giữ ngắn gọn; API contract tách ra docs/api-contract.md (xem TD-04), không đưa vào báo cáo.

### TD-03 Số hình chưa khớp số mục
- Phản hồi của GV : Mục 3 dùng Hình 4.1, Mục 4 dùng Hình 5.1.
- Quyết định : SỬA
- Lý do : Số hình phải khớp số mục để người đọc tra cứu được.
- Ảnh hưởng : Đánh lại số hình: Hình 3.1 (Mục 3), Hình 4.1 (Mục 4), Hình 5.1 (Mục 5). Bản .docx đã khớp; xuất lại PDF trong repo từ bản .docx này.

### TD-04 Repo chưa có docs/api-contract.md
- Phản hồi của GV : Repo chưa có docs/api-contract.md.
- Quyết định : SỬA
- Lý do : Hợp đồng API là tài liệu của giai đoạn cài đặt, nên bắt đầu viết khi endpoint đầu tiên chạy được.
- Ảnh hưởng : Tạo docs/api-contract.md ngắn, chỉ ghi các endpoint đã hiện thực ở buổi 8 (GET danh sách tồn, GET một dòng tồn, PATCH ngưỡng). Mở rộng dần ở BT2. Không đổi ERD hay kiến trúc.

### TD-05 Tên file khai báo AI không đúng mẫu
- Phản hồi của GV : File khai báo AI đặt tên ai-declaration.md thay vì ai-disclosure.md.
- Quyết định : SỬA
- Lý do : Thống nhất theo tên mẫu của học phần.
- Ảnh hưởng : Dùng đúng docs/ai-disclosure.md; sửa link trong README (đang trỏ tới ai-declaration.md).

### TD-06 Commit message chưa thống nhất
- Phản hồi của GV : Commit lẫn "Add use case diagram and SRS" và "Bổ sung nội dung bài tập 1".
- Quyết định : SỬA cho các commit từ nay; GIỮ NGUYÊN lịch sử commit cũ
- Lý do : Từ nay dùng Conventional Commits (docs, chore, feat, fix...), có scope khi cần, ví dụ docs(api), feat(stock). Không viết lại lịch sử (rebase/force-push) vì rủi ro mất dữ liệu và lịch sử cũ là minh chứng quá trình làm bài.
- Ảnh hưởng : Không ảnh hưởng thiết kế.

### TD-07 src/backend đã có mã dù BT1 chưa yêu cầu
- Phản hồi của GV : src/backend đã có mã dù BT1 chưa yêu cầu.
- Quyết định : GIỮ NGUYÊN mã hiện có, nhưng tổ chức lại theo lớp
- Lý do : Buổi 8 là lúc bắt đầu hiện thực. index.js chỉ còn vai trò khởi động ứng dụng; logic được đặt vào controllers → services → repositories đúng Hình 3.1.
- Ảnh hưởng : Cấu trúc src/backend ánh xạ một–một với các lớp 2, 3, 4 và khung "Tích hợp với L2" trong sơ đồ kiến trúc.

### TD-08 Kiểm thử cho NFR3 và NFR5
- Phản hồi của GV : Viết test tự động cho NFR3 (20 luồng xuất đồng thời) và NFR5 (403 sai vai trò/trung tâm) ngay khi cài đặt UC2.
- Quyết định : SỬA (thực hiện ở BT2, không làm ở buổi 8)
- Lý do : Hai NFR này gắn với UC2 (xuất kho) và phân quyền, chưa có trong module đầu tiên.
- Ảnh hưởng : Thư mục tests/ sẽ có hai nhóm test tương ứng, viết cùng lúc với UC2. Không đổi thiết kế.

### TD-09 Mã quy tắc trong Hình 3.1 không khớp SRS (tự rà soát)
- Phản hồi của GV : Không có (tự phát hiện khi đối chiếu Hình 3.1 với SRS).
- Quyết định : SỬA
- Lý do : Hình 3.1 ghi QT-LS-01, QT-LS-02 trong khi SRS dùng QT-L5-01, QT-L5-02. Cần nhất quán (tiêu chí 3).
- Ảnh hưởng : Sửa trong architecture.drawio và xuất lại docs/export/architecture.png.

## Buổi 9 – Hợp đồng giữa các thành phần và trình bày kết quả (ngày 20/10/2026)

### TD-10 Phản hồi của EP1 và EP6 lệch hợp đồng API (tự rà soát)
- Phản hồi của GV : Không có (tự phát hiện khi viết hợp đồng ở ranh giới theo buổi 9).
- Quyết định : SỬA mã cho khớp `docs/api-contract.md` (ĐỔI HỢP ĐỒNG của mã buổi 8)
- Lý do : Mã buổi 8 trả `data` thay vì `items`, thiếu `total_pages`, `center_id`, `query`, `low_only`; nhãn là `warning: "SAP_HET"` thay vì `low_stock_warning` + `warning_label: "SẮP HẾT"`; lỗi dùng `field` thay vì `details`. Đây là phụ thuộc ngầm: hợp đồng viết một đằng, mã chạy một nẻo. Đây là thay đổi phá vỡ, nhưng chưa có bên gọi nào (giao diện chưa có) nên đổi trực tiếp thay vì mở rộng → chuyển → thu hẹp.
- Ảnh hưởng : Thêm `services/stock.contract.js` là chỗ duy nhất đổi dòng CSDL sang JSON của API, kèm test hợp đồng. Ảnh chụp buổi 8 trong `docs/screenshots/` là định dạng cũ, sẽ chụp lại khi chạy trên dataset thật.

### TD-11 Định dạng lỗi: giữ định dạng của api-contract
- Phản hồi của GV : Bài giảng buổi 9 minh hoạ định dạng `{ error, message, fields }`.
- Quyết định : GIỮ NGUYÊN `{ "error": { "code", "message", "details" } }` đã chốt trong api-contract, bổ sung quy tắc
- Lý do : Cùng ba phần (mã máy đọc, câu người đọc, lỗi theo trường); đổi bây giờ là thay đổi phá vỡ không mang lại gì. Bổ sung: 400 trả `details = [{field, reason}]`; 500 có mã tra cứu `lookup_id`, chi tiết kỹ thuật chỉ ghi log.
- Ảnh hưởng : Cập nhật dòng "Định dạng lỗi" ở mục 1.1 của api-contract.

### TD-12 Xác thực: L5 chỉ đọc token, thêm stub đăng nhập để chạy thử (đã thay bằng TD-14)
- Phản hồi của GV : Không có (thực hiện kế hoạch TD-08 và yêu cầu xác thực của buổi 9).
- Quyết định : SỬA
- Lý do : Hợp đồng yêu cầu 401/403 nhưng việc cấp token là WON'T của L5. Để chạy được end-to-end, thêm stub `POST /api/v1/dev/login` (chỉ bật khi `DEV_LOGIN=true`) và `npm run token`. Giao diện lưu token trong localStorage: chấp nhận ở mức prototype vì không hiển thị HTML do người dùng nhập; hạn chế là nếu trang có lỗ hổng XSS thì token bị đọc. Bản chạy thật nên dùng cookie HttpOnly.
- Ảnh hưởng : Thêm `controllers/auth.js`, biến `SECRET_KEY`, `CORS_ORIGIN`, `DEV_LOGIN` trong `.env.example`. Ghi stub ở mục 1.12 của api-contract.

### TD-13 Giao diện: phạm vi ba màn hình ở buổi 9
- Phản hồi của GV : Không có.
- Quyết định : SỬA một phần, ghi rõ phần chưa làm
- Lý do : Làm đủ các story MUST trước. Danh sách sắp hết (UC7) tách thành trang riêng trong nhóm Màn hình 1 để có tiêu đề kết luận và nút "Ghi nhập" đi thẳng sang Màn hình 3.
- Ảnh hưởng : Màn hình 2 chưa có tra cứu phiếu (EP-L2 thuộc L2) và bảng linh kiện đã dùng (EP8, COULD); Màn hình 3 chưa có lịch sử giao dịch (EP7, COULD). Lỗi 404, 422 của phiếu vẫn hiển thị đầy đủ khi bấm Xuất.

## Đối chiếu với đề Bài tập 2 (ngày 20/10/2026)

### TD-14 Thêm bảng tài khoản app_user, bỏ stub đăng nhập
- Thay đổi gì : Thêm bảng `app_user` (migration 003: username, mật khẩu băm scrypt, vai trò, center_id) và `POST /api/v1/auth/login`; xoá stub `POST /api/v1/dev/login` và biến `DEV_LOGIN`. Seed tạo tài khoản mẫu ktv<mã trung tâm>, quanly<mã trung tâm> với mật khẩu lấy từ `DEMO_PASSWORD`.
- Vì sao : Đề BT2 yêu cầu "xác thực đăng nhập ở mức cơ bản" và tài liệu tự học buổi 9 ghi "bài nộp BT2 không được còn stub ở luồng chính". BT1 coi cấp token là WON'T nên ERD chưa có bảng tài khoản.
- Ảnh hưởng : ERD thêm 1 bảng (không đổi 6 bảng cũ); lớp 2 thêm `controllers/auth.controller.js`, lớp 3 thêm `services/auth.service.js`, lớp 4 thêm `repositories/user.repository.js`; trang Đăng nhập nhập tên và mật khẩu; api-contract mục 1.12.

### TD-15 EP1 trả thêm low_stock_count
- Thay đổi gì : Phản hồi EP1 có thêm trường `low_stock_count`.
- Vì sao : Đề BT2 yêu cầu mỗi con số trên màn hình có mốc so sánh; "14 linh kiện" thành "14 linh kiện, trong đó 3 dưới ngưỡng". Là thay đổi tương thích (chỉ thêm trường).
- Ảnh hưởng : `repositories/stock.repository.js` (findPage), `services/stock.service.js`, `src/frontend/src/api/stock.view.js`, trang Tồn kho; api-contract mục 1.3.

### TD-16 Tên thư mục lớp API là controllers/ thay vì routes/
- Thay đổi gì : Đề BT2 gợi ý `routes/ services/ repositories/ validators/`; repo dùng `controllers/` cho lớp 2.
- Vì sao : Đặt từ buổi 8 theo Hình 3.1 (lớp "API / REST controller"); đề cho phép đặt tên theo quy ước của stack. Mỗi tệp trong `controllers/*.controller.js` là một Express Router, đúng vai trò routes.
- Ảnh hưởng : Không đổi mã; ghi chú trong README mục 4.

### TD-17 Giao diện làm lại theo đúng wireframe ba màn hình (buổi 10)
- Thay đổi gì : Bỏ trang "Sắp hết" riêng (TD-13); danh sách sắp hết trở lại là ô "Chỉ hiện sắp hết / hết hàng" của Màn hình 1. Màn hình 1 có ô Trung tâm, cột Thao tác [Sửa ngưỡng] và khung Sửa ngưỡng bên dưới bảng. Màn hình 2 có [Tra cứu] phiếu (trạng thái, mô tả lỗi) và bảng Linh kiện đã dùng (EP8, UC10). Màn hình 3 dùng ô chọn linh kiện kèm tồn hiện tại và ngưỡng. Dòng lỗi ghi "Mã lỗi <HTTP> <code>" như wireframe.
- Vì sao : Giao diện buổi 9 lệch bố cục so với wireframe BT1 mục 5.1. Màn hình 2 cần dữ liệu phiếu nhưng chưa có dịch vụ L2, nên L5 làm bản chỉ đọc của EP-L2 (cùng đường dẫn, không sửa phiếu).
- Ảnh hưởng : Thêm `controllers/ticket.controller.js`, `services/ticket.service.js`, `repositories/stock.repository.js` (findUsedParts), `tests/ticket.api.test.js`; đăng nhập trả thêm `center_code`, `center_name`; api-contract mục 1.10, 1.12, 1.13.
- Chưa làm (để sau) : nút "Báo thiếu linh kiện" (UC5, EP5) đang khoá; phần "Lịch sử giao dịch kho" của Màn hình 3 (UC8, EP7) chưa có.

### TD-08 (cập nhật) Kiểm thử cho NFR3 và NFR5
- Đã thực hiện ở buổi 9: `tests/stock.api.test.js` có test 20 yêu cầu xuất đồng thời (đúng 10 thành công, 10 bị 409, tồn cuối 0) và test 403 cho mọi tổ hợp sai trung tâm, sai vai trò.
