.# **API CONTRACT** 

## **1.1 Quy ước chung** 

|**Mục**|**Quy ước**|
|---|---|
|**Base URL**|/api/v1; dữ liệu JSON UTF-8, header Content-Type: application/json với<br>các yêu cầu có body.|
|**Xác thực**|Header Authorization: Bearer <access_token>. Token chứa user_id, vai<br>trò (TECHNICIAN hoặc MANAGER) và center_id. Việc cấp token nằm<br>ngoài phạm vi L5 (WON'T: SSO, quản lý tài khoản); L5 chỉ đọc token.|
|**Trung tâm**|center_id nằm trong đường dẫn và phải bằng center_id của token. Khác<br>nhau thì trả 403 FORBIDDEN, kể cả khi trung tâm đó không tồn tại, để<br>không lộ dữ liệu (QT-14, NFR5). Các endpoint theo mã phiếu (EP5,<br>EP8) không có center_id trên đường dẫn: lớp nghiệp vụ so center_id của<br>phiếu với center_id trong token và trả 403 nếu khác (QT-14).|
|**Kiểu dữ liệu**|Tên trường snake_case; số lượng là số nguyên JSON; tiền là số nguyên<br>VND; ngày theo ISO 8601 YYYY-MM-DD; trạng thái phiếu giữ<br>nguyên chữ có dấu: "Mới", "Đã phân công", "Đang xử lý", "Chờ linh<br>kiện", "Hoàn tất", "Đã đóng", "Đã hủy".|
|**Ánh xạ tên API**<br>**và CSDL**|Các trường trùng tên giữa API và CSDL (part_code, ticket_code,<br>center_id, quantity của part_stock, min_threshold, unit_price). Chỉ ba<br>trường của giao dịch kho đổi tên: type = loai, quantity = so_luong,<br>transaction_date = ngay; CSDL giữ tên cột của part_transactions.csv để<br>nạp bằng COPY.|
|**Phân trang**|page ≥ 1 (mặc định 1), cố định 20 dòng mỗi trang (FR1, FR7). Phản hồi<br>có page, page_size, total_items, total_pages.|
|**Cảnh báo tồn**|low_stock_warning = (quantity < min_threshold). warning_label =<br>"HẾT HÀNG" nếu có cảnh báo và quantity = 0; "SẮP HẾT" nếu có<br>cảnh báo và quantity > 0; ngược lại null (QT-09, FR6).|
|**Định dạng lỗi**|Mọi lỗi 4xx/5xx trả {"error": {"code": "...", "message": "...", "details":<br>...}}. Mã error.code dùng chung: VALIDATION_FAILED,<br>UNAUTHORIZED, FORBIDDEN, NOT_FOUND,<br>INSUFFICIENT_STOCK, TICKET_STATE_INVALID,<br>INTERNAL_ERROR.|
|**Mục**|**Quy ước**|



1 

|**Thứ tự kiểm**|(1) 401 xác thực; (2) 403 sai vai trò hoặc sai trung tâm; (3) 400 dữ liệu<br>|
|---|---|
|**tra**|sai; (4) 404 không tìm thấy; (5) 403 phiếu thuộc trung tâm khác; (6) 422<br>phiếu sai trạng thái; (7) 409 tồn không đủ. Lỗi đầu tiên gặp phải được trả<br>|
||về, dữ liệu không đổi. Thứ tự này áp dụng cho một lần gọi API; ở UC2,<br>|
||bước 2 (tải phiếu) là thao tác tra cứu phiếu trên giao diện, thực hiện<br>trước khi gửi yêu cầu xuất.|



## **1.2 Danh sách endpoint của các story MUST** 

|**Mã**|**Phương**<br>**thức**|**Đường dẫn**|**Mục đích**|**Actor**|**User**<br>**Story**|
|---|---|---|---|---|---|
|EP1|GET|/api/v1/centers/{center_<br>id}/stock|Tra cứu tồn kho của trung<br>tâm theo mã hoặc tên linh<br>kiện, có lọc sắp hết, phân<br>trang|Kỹ thuật<br>viên, Quản<br>lý|US1|
|EP2|POST|/api/v1/centers/{center_<br>id}/stock/exports|Xuất linh kiện cho phiếu:<br>trừ tồn, ghi giao dịch<br>XUAT, trả cảnh báo tồn<br>thấp|Kỹ thuật<br>viên|US2,<br>US4|
|EP3|POST|/api/v1/centers/{center_<br>id}/stock/imports|Ghi nhập kho: cộng tồn,<br>ghi giao dịch NHAP, trả<br>cảnh báo tồn thấp|Quản lý|US3,<br>US4|
|EP4|GET|/api/v1/centers/{center_<br>id}/stock/low|Danh sách linh kiện sắp<br>hết (tồn < ngưỡng), xếp<br>theo mức thiếu giảm dần|Kỹ thuật<br>viên, Quản<br>lý|US4|



Ghi chú dữ liệu mẫu. Mã phiếu, mã linh kiện và số tồn ban đầu trong các ví dụ là bản ghi có thật của trung tâm 2 trong dataset: BH-000002/2025 (Đang xử lý), BH-000009/2026 (Đã phân công), PIN-OP-03 (tồn 10), MH-AP-03 (tồn 1, ngưỡng 8), CS-AP-02 (tồn 6, ngưỡng 5), LOA-AP-01 (tồn 1, ngưỡng 8). Số tồn sau khi xuất hoặc nhập là kết quả tính theo kịch bản của tiêu chí chấp nhận (Given–When–Then). 

## **1.3 EP1 – GET /api/v1/centers/{center_id}/stock (US1)** 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Mục đích**|Tra cứu tồn linh kiện của trung tâm mình theo mã hoặc tên (khớp một<br>phần, không phân biệt hoa thường), kèm bộ lọc "chỉ sắp hết/hết hàng".|
|**Tham số**|Path: center_id. Query (tùy chọn): q, low_only, page.|
|**Quyền**|Kỹ thuật viên và Quản lý của đúng trung tâm center_id (QT-14).|



2 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Truy vết**|US1 → FR1 (và FR6 cho nhãn cảnh báo) → UC1; NFR1: trang đầu ≤ 1|
||giây (p95).|



### **Request mẫu (kỹ thuật viên trung tâm 2 tìm "pin")** 

GET /api/v1/centers/2/stock?q=pin&low_only=false&page=1 HTTP/1.1 Authorization: Bearer <access_token_ky_thuat_vien_tt2> 

3 

### **Response mẫu – 200 OK** 

{ "center_id": 2, "query": "pin", "low_only": false, "page": 1, "page_size": 20, "total_items": 14, "total_pages": 1, "items": [ { "part_code": "PIN-AP-03", "part_name": "Pin Apple loại 3", "quantity": 26, "min_threshold": 3, "unit_price": 150000, "low_stock_warning": false, "warning_label": null }, { "part_code": "PIN-OP-02", "part_name": "Pin OPPO loại 2", "quantity": 7, "min_threshold": 8, "unit_price": 280000, "low_stock_warning": true, "warning_label": "SẮP HẾT" }, { "part_code": "PIN-OP-03", "part_name": "Pin OPPO loại 3", "quantity": 10, "min_threshold": 3, "unit_price": 650000, "low_stock_warning": false, "warning_label": null } ] } 

Ví dụ trên rút gọn còn 3 trong 14 dòng của mảng items; total_items giữ giá trị thật là 14 (khớp tiêu chí chấp nhận của US1). 

4 

### **Mã trạng thái HTTP** 

|**Mã**|**Khi nào**|**error.code**|
|---|---|---|
|200|Thành công, kể cả khi không có dòng nào khớp (items<br>là mảng rỗng, total_items = 0) hoặc page vượt quá<br>total_pages.|—|
|400|q dài hơn 50 ký tự; low_only không phải true/false;<br>page < 1 hoặc không phải số nguyên; center_id không<br>phải số nguyên.|VALIDATION_FAILE<br>D|
|401|Thiếu hoặc sai token.|UNAUTHORIZED|
|403|center_id khác trung tâm của người dùng (ví dụ kỹ thuật<br>viên trung tâm 2 xem trung tâm 3).|FORBIDDEN|
|404|Không áp dụng: tra cứu không có kết quả là 200 với<br>danh sách rỗng, không phải lỗi.|—|
|409|Không áp dụng: endpoint chỉ đọc, không có xung đột<br>trạng thái.|—|



### **Ví dụ lỗi 403 (US1, tiêu chí 2)** 

{ 

"error": { 

"code": "FORBIDDEN", 

"message": "Bạn không có quyền truy cập dữ liệu của trung tâm này.", 

"details": null } 

} 

## **1.4 EP2 – POST /api/v1/centers/{center_id}/stock/exports (US2, US4)** 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Mục đích**|Xuất một số lượng nguyên dương của một linh kiện cho phiếu bảo hành.<br>Trừ tồn và ghi 1 giao dịch XUAT trong cùng một giao dịch CSDL; phản<br>hồi kèm cảnh báo tồn thấp.|
|**Tham số**|Path: center_id. Body JSON: ticket_code, part_code, quantity (tất cả bắt<br>buộc).|
|**Quyền**|Chỉ Kỹ thuật viên của trung tâm center_id; Quản lý bị 403. Phiếu phải<br>thuộc cùng trung tâm và đang ở "Đang xử lý" hoặc "Chờ linh kiện"<br>(QT-14, QT-L5-02).|



5 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Truy vết**|US2 (và US4 cho low_stock_warning) → FR2, FR3, FR6 → UC2, UC3,<br>UC4; NFR3: 20 yêu cầu đồng thời trên tồn 10 thì đúng 10 thành công,<br>10 bị 409; ≤ 2 giây (p95).|



### **Request mẫu (tồn PIN-OP-03 = 10, xuất 2 cho phiếu đang xử lý)** 

POST /api/v1/centers/2/stock/exports HTTP/1.1 Authorization: Bearer <access_token_ky_thuat_vien_tt2> Content-Type: application/json { "ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03", "quantity": 2 } 

### **Response mẫu – 201 Created (tồn 10 → 8, có 1 giao dịch XUAT)** 

{ "transaction": { "transaction_id": 4955, "type": "XUAT", "quantity": 2, "transaction_date": "2026-10-02", "ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03" }, "stock": { "part_code": "PIN-OP-03", "part_name": "Pin OPPO loại 3", "quantity": 8, "min_threshold": 3 }, "low_stock_warning": false, "warning_label": null 

} 

6 

### **Biến thể có cảnh báo (US4, tiêu chí 1: ngưỡng 5, tồn 6, xuất 2 còn 4) – chỉ trích phần thay đổi; linh kiện CS-AP-02, Cổng sạc Apple loại 2** 

{ "stock": { "part_code": "CS-AP-02", "quantity": 4, "min_threshold": 5 }, "low_stock_warning": true, "warning_label": "SẮP HẾT" } 

### **Mã trạng thái HTTP** 

|**Mã**|**Khi nào**|**error.code**|
|---|---|---|
|201|Xuất thành công: tồn giảm đúng số lượng, tạo 1 giao<br>dịch XUAT gắn ticket_code.|—|
|400|Thiếu hoặc sai ticket_code, part_code; quantity ≤ 0,<br>không phải số nguyên, là chuỗi, null hoặc > 9999 (UC2<br>bước 5a).|VALIDATION_FAILE<br>D|
|401|Thiếu hoặc sai token.|UNAUTHORIZED|
|403|Người dùng là Quản lý; center_id khác trung tâm của<br>token; hoặc phiếu thuộc trung tâm khác (UC2 bước 2b,<br>không lộ thông tin phiếu).|FORBIDDEN|
|404|ticket_code không tồn tại (UC2 bước 2a); hoặc linh kiện<br>không có dòng tồn tại trung tâm (UC2 bước 5b).|NOT_FOUND|
|409|quantity lớn hơn tồn hiện có; tồn và giao dịch không đổi<br>(QT-09). Cũng là kết quả của yêu cầu thua trong tình<br>huống hai yêu cầu đồng thời (UC2 bước 6b).|INSUFFICIENT_STOC<br>K|
|422|Phiếu không ở "Đang xử lý" hoặc "Chờ linh kiện" (QT-<br>L5-02); tồn không đổi.|TICKET_STATE_INVA<br>LID|
|500|Lỗi khi lưu: hoàn tác toàn bộ giao dịch CSDL, tồn<br>không đổi (UC2 bước 7a).|INTERNAL_ERROR|



7 

### **Ví dụ lỗi 409 (US2, tiêu chí 2: tồn = 1, xuất 2; request giống trên với part_code = MH-AP-03)** 

{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Tồn kho không đủ để xuất.", "details": { "part_code": "MH-AP-03", "requested_quantity": 2, "available_quantity": 1, "ticket_status": "Đang xử lý" } } } 

### **Ví dụ lỗi 422 (US2, tiêu chí 3: phiếu ở trạng thái "Đã phân công")** 

{ 

"error": { "code": "TICKET_STATE_INVALID", "message": "Phiếu không ở trạng thái cho phép xuất linh kiện.", "details": { "ticket_code": "BH-000009/2026", "current_status": "Đã phân công", "allowed_statuses": ["Đang xử lý", "Chờ linh kiện"] } } } 

### **Ví dụ lỗi 400 (quantity = 0)** 

{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu không hợp lệ.", "details": [ { "field": "quantity", "reason": "Phải là số nguyên từ 1 đến 9999." } ] } } 

8 

## **1.5 EP3 – POST /api/v1/centers/{center_id}/stock/imports (US3, US4)** 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Mục đích**|Ghi nhận hàng về: cộng tồn của trung tâm và ghi 1 giao dịch NHAP<br>(không có mã phiếu) trong cùng một giao dịch CSDL.|
|**Tham số**|Path: center_id. Body JSON: part_code, quantity (cả hai bắt buộc).|
|**Quyền**|Chỉ Quản lý của trung tâm center_id; Kỹ thuật viên bị 403 (NFR5). Linh<br>kiện phải đã có dòng tồn tại trung tâm; L5 không tạo dòng tồn mới.|
|**Truy vết**|US3 (và US4 cho cảnh báo sau nhập) → FR5, FR6 → UC6, UC4.|



### **Request mẫu (tồn LOA-AP-01 = 1, nhập 20)** 

POST /api/v1/centers/2/stock/imports HTTP/1.1 Authorization: Bearer <access_token_quan_ly_tt2> Content-Type: application/json 

{ "part_code": "LOA-AP-01", "quantity": 20 } 

### **Response mẫu – 201 Created (tồn 1 → 21, có 1 giao dịch NHAP)** 

{ "transaction": { "transaction_id": 4956, "type": "NHAP", "quantity": 20, "transaction_date": "2026-10-02", "ticket_code": null, "part_code": "LOA-AP-01" }, "stock": { "part_code": "LOA-AP-01", "part_name": "Loa ngoài Apple loại 1", "quantity": 21, "min_threshold": 8 }, "low_stock_warning": false, "warning_label": null 

} 

9 

### **Mã trạng thái HTTP** 

|**Mã**|**Khi nào**|**error.code**|
|---|---|---|
|201|Nhập kho thành công: tồn tăng đúng số lượng, tạo 1<br>giao dịch NHAP với ticket_code = null.|—|
|400|Thiếu hoặc sai part_code; quantity = 0, âm, thập phân,<br>chuỗi, null hoặc > 9999 (UC6 bước 3a); tồn không đổi.|VALIDATION_FAILE<br>D|
|401|Thiếu hoặc sai token.|UNAUTHORIZED|
|403|Người dùng là Kỹ thuật viên (UC6 bước 1a); hoặc<br>center_id khác trung tâm của token (UC6 bước 4a).|FORBIDDEN|
|404|Linh kiện không có dòng tồn tại trung tâm (UC6 bước<br>4b).|NOT_FOUND|
|409|Không áp dụng: hai lần nhập đồng thời được xếp hàng<br>nhờ khóa dòng tồn, cả hai đều thành công và tồn cuối<br>bằng tổng (UC6 bước 5a).|—|
|500|Lỗi khi lưu: hoàn tác toàn bộ giao dịch CSDL, tồn<br>không đổi (UC6 bước 5b).|INTERNAL_ERROR|



### **Ví dụ lỗi 400 (US3, tiêu chí 2: số lượng = 0)** 

{ "error": { "code": "VALIDATION_FAILED", "message": "Dữ liệu không hợp lệ.", "details": [ { "field": "quantity", "reason": "Phải là số nguyên từ 1 đến 9999." } ] } } 

### **Ví dụ lỗi 403 (US3, tiêu chí 3: kỹ thuật viên gọi nhập kho)** 

{ "error": { "code": "FORBIDDEN", "message": "Chỉ quản lý trung tâm mới được ghi nhập kho.", "details": null } } 

10 

## **1.6 EP4 – GET /api/v1/centers/{center_id}/stock/low (US4)** 

|**Thuộc tính**|**Nội dung**|
|---|---|
|**Mục đích**|Liệt kê mọi linh kiện có tồn < ngưỡng (kể cả tồn = 0), xếp theo mức<br>thiếu (shortage = ngưỡng − tồn) giảm dần; cùng mức thiếu thì xếp theo<br>part_code tăng dần.|
|**Tham số**|Path: center_id. Query (tùy chọn): page.|
|**Quyền**|Kỹ thuật viên và Quản lý của đúng trung tâm center_id (UC7; QT-14).|
|**Truy vết**|US4 → FR6 → UC7 (UC3 sinh cảnh báo ở EP2, EP3).|



### **Request mẫu (quản lý trung tâm 2)** 

GET /api/v1/centers/2/stock/low?page=1 HTTP/1.1 Authorization: Bearer <access_token_quan_ly_tt2> 

11 

### **Response mẫu – 200 OK** 

{ "center_id": 2, "page": 1, "page_size": 20, "total_items": 29, "total_pages": 2, "out_of_stock_count": 17, "items": [ { "part_code": "CAM-AP-01", "part_name": "Camera sau Apple loại 1", "quantity": 0, "min_threshold": 8, "shortage": 8, "warning_label": "HẾT HÀNG" }, { "part_code": "CAM-RM-03", "part_name": "Camera sau realme loại 3", "quantity": 0, "min_threshold": 8, "shortage": 8, "warning_label": "HẾT HÀNG" }, { "part_code": "MH-AP-03", "part_name": "Màn hình Apple loại 3", "quantity": 1, "min_threshold": 8, "shortage": 7, "warning_label": "SẮP HẾT" }, { "part_code": "PIN-OP-02", "part_name": "Pin OPPO loại 2", "quantity": 7, "min_threshold": 8, "shortage": 1, "warning_label": "SẮP HẾT" } ] } 

12 

Ví dụ rút gọn còn 4 trong 20 dòng của trang 1 (4 dòng thật của trung tâm 2, đúng thứ tự sắp xếp); total_items = 29 và out_of_stock_count = 17 là số thật của trung tâm 2 (US4, tiêu chí 2). Linh kiện có tồn = ngưỡng (ví dụ 5/5) không xuất hiện (US4, tiêu chí 3). 

### **Mã trạng thái HTTP** 

|**Mã**|**Khi nào**|**error.code**|
|---|---|---|
|200|Thành công, kể cả khi không có linh kiện nào dưới<br>ngưỡng (items rỗng, total_items = 0) hoặc page vượt<br>quá total_pages.|—|
|400|page < 1 hoặc không phải số nguyên; center_id không<br>phải số nguyên.|VALIDATION_FAILE<br>D|
|401|Thiếu hoặc sai token.|UNAUTHORIZED|
|403|center_id khác trung tâm của người dùng (QT-14).|FORBIDDEN|
|404|Không áp dụng: không có linh kiện sắp hết là 200 với<br>danh sách rỗng.|—|
|409|Không áp dụng: endpoint chỉ đọc.|—|



## **1.7 Bảng quy tắc validation theo từng trường** 

|**EP**|**Trường**|**Vị**<br>**trí**|**Bắt**<br>**buộc**|**Kiểu**|**Độ dài / dải giá trị**|**Khi sai**|
|---|---|---|---|---|---|---|
|EP1–<br>4|Authorization|head<br>er|Có|string|Bearer + token hợp lệ,<br>chưa hết hạn|401|
|EP1–<br>4|center_id|path|Có|intege<br>r|≥ 1; phải bằng center_id<br>trong token|400 nếu không<br>phải số nguyên;<br>403 nếu khác<br>token|
|EP1|q|quer<br>y|Khôn<br>g|string|1–50 ký tự sau khi cắt<br>khoảng trắng hai đầu; bỏ<br>trống = không lọc; khớp<br>một phần theo part_code<br>hoặc part_name, không<br>phân biệt hoa thường|<br>400 nếu > 50 ký<br>tự|
|EP1|low_only|quer<br>y|Khôn<br>g|boolea<br>n|true hoặc false; mặc<br>định false|400|
|EP1,<br>EP4|page|quer<br>y|Khôn<br>g|intege<br>r|≥ 1; mặc định 1; 20<br>dòng mỗi trang; vượt<br>total_pages thì trả items<br>rỗng|400 nếu < 1 hoặc<br>không phải số<br>nguyên|



13 

|**EP**|**Trường**|**Vị**<br>**trí**|**Bắt**<br>**buộc**|**Kiểu**|**Độ dài / dải giá trị**|**Khi sai**|
|---|---|---|---|---|---|---|
|EP2|ticket_code|body|Có|string|Dạng BH- + 6 chữ số +<br>"/" + 4 chữ số năm (14<br>ký tự, ví dụ<br>BH-000002/2025)|400 sai định dạng;<br>404 không tồn tại;<br>403 khác trung<br>tâm; 422 sai trạng<br>thái|
|EP2,<br>EP3|part_code|body|Có|string|Mã theo parts.csv: chữ<br>hoa, số và dấu gạch<br>ngang, 5–30 ký tự (ví dụ<br>MH-AP-03, PIN-OP-<br>03); phải có dòng tồn tại<br>trung tâm|400 sai định dạng;<br>404 không có<br>dòng tồn|
|EP2|quantity|body|Có|intege<br>r|1 đến 9999; không nhận<br>chuỗi, số thập phân, null|400; 409 nếu lớn<br>hơn tồn hiện có|
|EP3|quantity|body|Có|intege<br>r|1 đến 9999; không nhận<br>chuỗi, số thập phân, null|400|



Vai trò không phải là trường nhập mà lấy từ token: EP1 và EP4 nhận cả hai vai trò, EP2 chỉ nhận TECHNICIAN, EP3 chỉ nhận MANAGER; sai vai trò trả 403. 

## **1.8 Tự kiểm: truy vết endpoint về User Story** 

**Bảng A – Endpoint → User Story → FR → Use case** (khớp bảng truy vết ở Mục 1, phần 6): 

|**Endpoint**|**User**<br>**Story**|**FR**|**Use case**|**MoSCoW**|
|---|---|---|---|---|
|EP1 – GET .../stock|US1|FR1 (FR6 cho nhãn<br>cảnh báo)|UC1|MUST|
|EP2 – POST<br>.../stock/exports|US2, US4|FR2, FR3, FR6|UC2, UC3, UC4|MUST|
|EP3 – POST<br>.../stock/imports|US3, US4|FR5, FR6|UC6, UC4|MUST|
|EP4 – GET .../stock/low|US4|FR6|UC7|MUST|



**Bảng B – Tiêu chí chấp nhận của US MUST → endpoint → mã HTTP:** 

|**US**|**Tiêu chí chấp nhận (Given–When–Then)**|**Endpoint**|**Mã HTTP**|
|---|---|---|---|
|US1|Tìm "pin" ở trung tâm 2: 14 linh kiện, ≤ 1 giây|EP1|200|
|US1|Kỹ thuật viên trung tâm 2 xem tồn trung tâm 3|EP1|403|
|US2|Tồn 10, xuất 2: tồn còn 8, có 1 giao dịch XUAT<br>gắn mã phiếu|EP2|201|



14 

|**US**|**Tiêu chí chấp nhận (Given–When–Then)**|**Endpoint**|**Mã HTTP**|
|---|---|---|---|
|US2|Tồn 1, xuất 2: INSUFFICIENT_STOCK kèm<br>tồn hiện có, tồn vẫn 1|EP2|409|
|US2|Phiếu ở trạng thái "Đã phân công": tồn không<br>đổi|EP2|422|
|US3|Tồn 1, nhập 20: tồn 21, có 1 giao dịch NHAP<br>không có mã phiếu|EP3|201|
|US3|Số lượng 0 hoặc âm: tồn không đổi|EP3|400|
|US3|Kỹ thuật viên gọi nhập kho|EP3|403|
|US4|Ngưỡng 5, tồn 6, xuất 2 (còn 4):<br>low_stock_warning = true và có trong danh sách<br>sắp hết|EP2 rồi EP4|201; 200|
|US4|Trung tâm 2: 29 dòng sắp hết, trong đó 17 dòng<br>HẾT HÀNG|EP4|200|
|US4|Ngưỡng 5, tồn 5: không xuất hiện, không cảnh<br>báo|EP4 (và EP2,<br>EP3)|200<br>(low_stock_wa<br>rning = false)|



**Kết quả tự kiểm:** 4/4 endpoint truy vết được về ít nhất một User Story MUST; 4/4 User Story MUST (US1–US4) có ít nhất một endpoint phục vụ; 11/11 tiêu chí chấp nhận MUST của US1–US4 (không tính tiêu chí 4 của US4 về đặt ngưỡng, do EP6 ở mục 3.9 phục vụ) có kịch bản request/response và mã HTTP tương ứng; không có endpoint nào phục vụ các mục WON'T ở mục 1. 

## **1.9 Endpoint ngoài nhóm MUST** 

Để hợp đồng nhất quán với Mục 1, các endpoint sau thuộc story SHOULD/COULD được liệt kê tên; đặc tả JSON chi tiết nằm ngoài yêu cầu của bài tập này (chỉ MUST). 

|**Mã**|**Phương thức và đường**<br>**dẫn**|**Mục đích**|**US / FR / UC **|**MoSCo**<br>**W**|
|---|---|---|---|---|
|EP5|POST<br>/api/v1/tickets/{ticket_code<br>}/shortage-reports|Báo thiếu linh kiện: phiếu<br>Đang xử lý → Chờ linh<br>kiện, ghi ticket_status_log|US5 / FR4 /<br>UC5|SHOULD|
|EP6|PATCH<br>/api/v1/centers/{center_id}/<br>stock/{part_code}/threshold|Đặt ngưỡng cảnh báo (số<br>nguyên ≥ 0) cho dòng tồn có<br>sẵn|US4 / FR8 /<br>UC9|SHOULD|
|EP7|GET<br>/api/v1/centers/{center_id}/<br>stock/transactions|Lịch sử giao dịch kho, lọc<br>theo linh kiện và loại, mới<br>nhất trước|US6 / FR7 /<br>UC8|COULD|
|**Mã**|**Phương thức và đường**<br>**dẫn**|**Mục đích**|**US / FR / UC **|**MoSCo**<br>**W**|



15 

|EP8|GET<br>/api/v1/tickets/{ticket_code<br>}/used-parts|Linh kiện đã dùng của phiếu<br>kèm thành tiền và tổng cộng|US7 / FR9 /<br>UC10|COULD|
|---|---|---|---|---|
|EP-<br>L2|GET<br>/api/v1/tickets/{ticket_code<br>}|Tra cứu phiếu cho nút [Tra<br>cứu] ở Màn hình 2: trả<br>ticket_code, status,<br>center_id, issue_desc.<br>Thuộc L2, L5 chỉ gọi và<br>không đặc tả lại.|US2 / FR2 /<br>UC2 (bước 2)|Ngoài L5.



16 

