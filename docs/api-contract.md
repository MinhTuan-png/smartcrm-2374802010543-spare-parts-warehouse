# API CONTRACT

## 1.1 Quy ước chung

| Mục | Quy ước |
|---|---|
| **Base URL** | `/api/v1`; dữ liệu JSON UTF-8, header `Content-Type: application/json` với các yêu cầu có body. |
| **Xác thực** | Header `Authorization: Bearer <access_token>`. Token chứa user_id, vai trò (TECHNICIAN hoặc MANAGER) và center_id. Token do `POST /api/v1/auth/login` cấp (mục 1.12, TD-14); SSO và quản lý tài khoản vẫn là WON'T. |
| **Trung tâm** | center_id nằm trong đường dẫn và phải bằng center_id của token. Khác nhau thì trả 403 FORBIDDEN, kể cả khi trung tâm đó không tồn tại, để không lộ dữ liệu (QT-14, NFR5). Các endpoint theo mã phiếu (EP5, EP8) không có center_id trên đường dẫn: lớp nghiệp vụ so center_id của phiếu với center_id trong token và trả 403 nếu khác (QT-14). |
| **Kiểu dữ liệu** | Tên trường snake_case; số lượng là số nguyên JSON; tiền là số nguyên VND; ngày theo ISO 8601 YYYY-MM-DD; trạng thái phiếu giữ nguyên chữ có dấu: "Mới", "Đã phân công", "Đang xử lý", "Chờ linh kiện", "Hoàn tất", "Đã đóng", "Đã hủy". |
| **Ánh xạ tên API và CSDL** | Các trường trùng tên giữa API và CSDL (part_code, ticket_code, center_id, quantity của part_stock, min_threshold, unit_price). Chỉ ba trường của giao dịch kho đổi tên: type = loai, quantity = so_luong, transaction_date = ngay; CSDL giữ tên cột của part_transactions.csv để nạp bằng COPY. |
| **Phân trang** | page ≥ 1 (mặc định 1), cố định 20 dòng mỗi trang (FR1, FR7). Phản hồi có page, page_size, total_items, total_pages. |
| **Cảnh báo tồn** | low_stock_warning = (quantity < min_threshold). warning_label = "HẾT HÀNG" nếu có cảnh báo và quantity = 0; "SẮP HẾT" nếu có cảnh báo và quantity > 0; ngược lại null (QT-09, FR6). |
| **Định dạng lỗi** | Mọi lỗi 4xx/5xx trả `{"error": {"code": "...", "message": "...", "details": ...}}`. Mã error.code dùng chung: VALIDATION_FAILED, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INSUFFICIENT_STOCK, TICKET_STATE_INVALID, ALREADY_EXISTS, STOCK_NOT_EMPTY, INTERNAL_ERROR (hai mã 409 ALREADY_EXISTS, STOCK_NOT_EMPTY chỉ dùng cho CRUD danh mục ở mục 1.15). code dành cho máy đọc (giao diện rẽ nhánh theo code); message là câu tiếng Việt cho người dùng, không chứa SQL, tên bảng hay stack trace; details là `null`, danh sách `[{field, reason}]` với 400, hoặc đối tượng số liệu với 409/422. Lỗi 500 và 503 có `details.lookup_id` (6 ký tự) bằng mã tương quan `X-Request-Id` của yêu cầu, trùng với dòng ghi log ở máy chủ để tra cứu. 503 (cùng code `INTERNAL_ERROR`) nghĩa là tạm thời không kết nối được CSDL (CSDL tắt, đang khởi động lại, quá `DB_CONNECT_TIMEOUT_MS`); dữ liệu không đổi, thử lại sau là được (TD-19). Đường dẫn không tồn tại trả 404 NOT_FOUND cùng định dạng. |
| **Mã tương quan** | Mọi phản hồi có header `X-Request-Id`. Bên gọi có thể gửi sẵn header này (chữ, số, dấu gạch, tối đa 64 ký tự); không gửi hoặc sai dạng thì máy chủ tự sinh 6 ký tự hex. Mọi dòng log của yêu cầu ghi cùng `requestId` này (buổi 11). |
| **Thứ tự kiểm tra** | (1) 401 xác thực; (2) 403 sai vai trò hoặc sai trung tâm; (3) 400 dữ liệu sai; (4) 404 không tìm thấy; (5) 403 phiếu thuộc trung tâm khác; (6) 422 phiếu sai trạng thái; (7) 409 tồn không đủ. Lỗi đầu tiên gặp phải được trả về, dữ liệu không đổi. Thứ tự này áp dụng cho một lần gọi API; ở UC2, bước 2 (tải phiếu) là thao tác tra cứu phiếu trên giao diện, thực hiện trước khi gửi yêu cầu xuất. |

## 1.2 Danh sách endpoint của các story MUST

| Mã | Phương thức | Đường dẫn | Mục đích | Actor | User Story |
|---|---|---|---|---|---|
| EP1 | GET | `/api/v1/centers/{center_id}/stock` | Tra cứu tồn kho của trung tâm theo mã hoặc tên linh kiện, có lọc sắp hết, phân trang | Kỹ thuật viên, Quản lý | US1 |
| EP2 | POST | `/api/v1/centers/{center_id}/stock/exports` | Xuất linh kiện cho phiếu: trừ tồn, ghi giao dịch XUAT, trả cảnh báo tồn thấp | Kỹ thuật viên | US2, US4 |
| EP3 | POST | `/api/v1/centers/{center_id}/stock/imports` | Ghi nhập kho: cộng tồn, ghi giao dịch NHAP, trả cảnh báo tồn thấp | Quản lý | US3, US4 |
| EP4 | GET | `/api/v1/centers/{center_id}/stock/low` | Danh sách linh kiện sắp hết (tồn < ngưỡng), xếp theo mức thiếu giảm dần | Kỹ thuật viên, Quản lý | US4 |

Ghi chú dữ liệu mẫu. Mã phiếu, mã linh kiện và số tồn ban đầu trong các ví dụ là bản ghi có thật của trung tâm 2 trong dataset: BH-000002/2025 (Đang xử lý), BH-000009/2026 (Đã phân công), PIN-OP-03 (tồn 10), MH-AP-03 (tồn 1, ngưỡng 8), CS-AP-02 (tồn 6, ngưỡng 5), LOA-AP-01 (tồn 1, ngưỡng 8). Số tồn sau khi xuất hoặc nhập là kết quả tính theo kịch bản của tiêu chí chấp nhận (Given–When–Then).

## 1.3 EP1 – GET /api/v1/centers/{center_id}/stock (US1)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Tra cứu tồn linh kiện của trung tâm mình theo mã hoặc tên (khớp một phần, không phân biệt hoa thường), kèm bộ lọc "chỉ sắp hết/hết hàng". |
| **Tham số** | Path: center_id. Query (tùy chọn): q, low_only, page. |
| **Quyền** | Kỹ thuật viên và Quản lý của đúng trung tâm center_id (QT-14). |
| **Truy vết** | US1 → FR1 (và FR6 cho nhãn cảnh báo) → UC1; NFR1: trang đầu ≤ 1 giây (p95). |

### Request mẫu (kỹ thuật viên trung tâm 2 tìm "pin")

```http
GET /api/v1/centers/2/stock?q=pin&low_only=false&page=1 HTTP/1.1
Authorization: Bearer <access_token_ky_thuat_vien_tt2>
```

### Response mẫu – 200 OK

```json
{
  "center_id": 2,
  "query": "pin",
  "low_only": false,
  "page": 1,
  "page_size": 20,
  "total_items": 14,
  "total_pages": 1,
  "items": [
    {
      "part_code": "PIN-AP-03",
      "part_name": "Pin Apple loại 3",
      "quantity": 26,
      "min_threshold": 3,
      "unit_price": 150000,
      "low_stock_warning": false,
      "warning_label": null
    },
    {
      "part_code": "PIN-OP-02",
      "part_name": "Pin OPPO loại 2",
      "quantity": 7,
      "min_threshold": 8,
      "unit_price": 280000,
      "low_stock_warning": true,
      "warning_label": "SẮP HẾT"
    },
    {
      "part_code": "PIN-OP-03",
      "part_name": "Pin OPPO loại 3",
      "quantity": 10,
      "min_threshold": 3,
      "unit_price": 650000,
      "low_stock_warning": false,
      "warning_label": null
    }
  ]
}
```

Ví dụ trên rút gọn còn 3 trong 14 dòng của mảng items; total_items giữ giá trị thật là 14 (khớp tiêu chí chấp nhận của US1).

Từ BT2 phản hồi có thêm `low_stock_count` (số nguyên ≥ 0): trong total_items dòng khớp bộ lọc, bao nhiêu dòng có tồn < ngưỡng. Đây là trường THÊM MỚI nên bên gọi cũ bỏ qua được (thay đổi tương thích, TD-15); giao diện dùng nó làm mốc so sánh cạnh tổng số dòng.

### Mã trạng thái HTTP

| Mã | Khi nào | error.code |
|---|---|---|
| 200 | Thành công, kể cả khi không có dòng nào khớp (items là mảng rỗng, total_items = 0) hoặc page vượt quá total_pages. | — |
| 400 | q dài hơn 50 ký tự; low_only không phải true/false; page < 1 hoặc không phải số nguyên; center_id không phải số nguyên. | VALIDATION_FAILED |
| 401 | Thiếu hoặc sai token. | UNAUTHORIZED |
| 403 | center_id khác trung tâm của người dùng (ví dụ kỹ thuật viên trung tâm 2 xem trung tâm 3). | FORBIDDEN |
| 404 | Không áp dụng: tra cứu không có kết quả là 200 với danh sách rỗng, không phải lỗi. | — |
| 409 | Không áp dụng: endpoint chỉ đọc, không có xung đột trạng thái. | — |

### Ví dụ lỗi 403 (US1, tiêu chí 2)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền truy cập dữ liệu của trung tâm này.",
    "details": null
  }
}
```

## 1.4 EP2 – POST /api/v1/centers/{center_id}/stock/exports (US2, US4)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Xuất một số lượng nguyên dương của một linh kiện cho phiếu bảo hành. Trừ tồn và ghi 1 giao dịch XUAT trong cùng một giao dịch CSDL; phản hồi kèm cảnh báo tồn thấp. |
| **Tham số** | Path: center_id. Body JSON: ticket_code, part_code, quantity (tất cả bắt buộc). |
| **Quyền** | Chỉ Kỹ thuật viên của trung tâm center_id; Quản lý bị 403. Phiếu phải thuộc cùng trung tâm và đang ở "Đang xử lý" hoặc "Chờ linh kiện" (QT-14, QT-L5-02). |
| **Truy vết** | US2 (và US4 cho low_stock_warning) → FR2, FR3, FR6 → UC2, UC3, UC4; NFR3: 20 yêu cầu đồng thời trên tồn 10 thì đúng 10 thành công, 10 bị 409; ≤ 2 giây (p95). |

### Request mẫu (tồn PIN-OP-03 = 10, xuất 2 cho phiếu đang xử lý)

```http
POST /api/v1/centers/2/stock/exports HTTP/1.1
Authorization: Bearer <access_token_ky_thuat_vien_tt2>
Content-Type: application/json

{ "ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03", "quantity": 2 }
```

### Response mẫu – 201 Created (tồn 10 → 8, có 1 giao dịch XUAT)

```json
{
  "transaction": {
    "transaction_id": 4955,
    "type": "XUAT",
    "quantity": 2,
    "transaction_date": "2026-10-02",
    "ticket_code": "BH-000002/2025",
    "part_code": "PIN-OP-03"
  },
  "stock": {
    "part_code": "PIN-OP-03",
    "part_name": "Pin OPPO loại 3",
    "quantity": 8,
    "min_threshold": 3
  },
  "low_stock_warning": false,
  "warning_label": null
}
```

### Biến thể có cảnh báo (US4, tiêu chí 1: ngưỡng 5, tồn 6, xuất 2 còn 4) – chỉ trích phần thay đổi; linh kiện CS-AP-02, Cổng sạc Apple loại 2

```json
{
  "stock": { "part_code": "CS-AP-02", "quantity": 4, "min_threshold": 5 },
  "low_stock_warning": true,
  "warning_label": "SẮP HẾT"
}
```

### Mã trạng thái HTTP

| Mã | Khi nào | error.code |
|---|---|---|
| 201 | Xuất thành công: tồn giảm đúng số lượng, tạo 1 giao dịch XUAT gắn ticket_code. | — |
| 400 | Thiếu hoặc sai ticket_code, part_code; quantity ≤ 0, không phải số nguyên, là chuỗi, null hoặc > 9999 (UC2 bước 5a). | VALIDATION_FAILED |
| 401 | Thiếu hoặc sai token. | UNAUTHORIZED |
| 403 | Người dùng là Quản lý; center_id khác trung tâm của token; hoặc phiếu thuộc trung tâm khác (UC2 bước 2b, không lộ thông tin phiếu). | FORBIDDEN |
| 404 | ticket_code không tồn tại (UC2 bước 2a); hoặc linh kiện không có dòng tồn tại trung tâm (UC2 bước 5b). | NOT_FOUND |
| 409 | quantity lớn hơn tồn hiện có; tồn và giao dịch không đổi (QT-09). Cũng là kết quả của yêu cầu thua trong tình huống hai yêu cầu đồng thời (UC2 bước 6b). | INSUFFICIENT_STOCK |
| 422 | Phiếu không ở "Đang xử lý" hoặc "Chờ linh kiện" (QT-L5-02); tồn không đổi. | TICKET_STATE_INVALID |
| 500 | Lỗi khi lưu: hoàn tác toàn bộ giao dịch CSDL, tồn không đổi (UC2 bước 7a). | INTERNAL_ERROR |

### Ví dụ lỗi 409 (US2, tiêu chí 2: tồn = 1, xuất 2; request giống trên với part_code = MH-AP-03)

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Tồn kho không đủ để xuất.",
    "details": {
      "part_code": "MH-AP-03",
      "requested_quantity": 2,
      "available_quantity": 1,
      "ticket_status": "Đang xử lý"
    }
  }
}
```

### Ví dụ lỗi 422 (US2, tiêu chí 3: phiếu ở trạng thái "Đã phân công")

```json
{
  "error": {
    "code": "TICKET_STATE_INVALID",
    "message": "Phiếu không ở trạng thái cho phép xuất linh kiện.",
    "details": {
      "ticket_code": "BH-000009/2026",
      "current_status": "Đã phân công",
      "allowed_statuses": ["Đang xử lý", "Chờ linh kiện"]
    }
  }
}
```

### Ví dụ lỗi 400 (quantity = 0)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      { "field": "quantity", "reason": "Phải là số nguyên từ 1 đến 9999." }
    ]
  }
}
```

## 1.5 EP3 – POST /api/v1/centers/{center_id}/stock/imports (US3, US4)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Ghi nhận hàng về: cộng tồn của trung tâm và ghi 1 giao dịch NHAP (không có mã phiếu) trong cùng một giao dịch CSDL. |
| **Tham số** | Path: center_id. Body JSON: part_code, quantity (cả hai bắt buộc). |
| **Quyền** | Chỉ Quản lý của trung tâm center_id; Kỹ thuật viên bị 403 (NFR5). Linh kiện phải đã có dòng tồn tại trung tâm; L5 không tạo dòng tồn mới. |
| **Truy vết** | US3 (và US4 cho cảnh báo sau nhập) → FR5, FR6 → UC6, UC4. |

### Request mẫu (tồn LOA-AP-01 = 1, nhập 20)

```http
POST /api/v1/centers/2/stock/imports HTTP/1.1
Authorization: Bearer <access_token_quan_ly_tt2>
Content-Type: application/json

{ "part_code": "LOA-AP-01", "quantity": 20 }
```

### Response mẫu – 201 Created (tồn 1 → 21, có 1 giao dịch NHAP)

```json
{
  "transaction": {
    "transaction_id": 4956,
    "type": "NHAP",
    "quantity": 20,
    "transaction_date": "2026-10-02",
    "ticket_code": null,
    "part_code": "LOA-AP-01"
  },
  "stock": {
    "part_code": "LOA-AP-01",
    "part_name": "Loa ngoài Apple loại 1",
    "quantity": 21,
    "min_threshold": 8
  },
  "low_stock_warning": false,
  "warning_label": null
}
```

### Mã trạng thái HTTP

| Mã | Khi nào | error.code |
|---|---|---|
| 201 | Nhập kho thành công: tồn tăng đúng số lượng, tạo 1 giao dịch NHAP với ticket_code = null. | — |
| 400 | Thiếu hoặc sai part_code; quantity = 0, âm, thập phân, chuỗi, null hoặc > 9999 (UC6 bước 3a); tồn không đổi. | VALIDATION_FAILED |
| 401 | Thiếu hoặc sai token. | UNAUTHORIZED |
| 403 | Người dùng là Kỹ thuật viên (UC6 bước 1a); hoặc center_id khác trung tâm của token (UC6 bước 4a). | FORBIDDEN |
| 404 | Linh kiện không có dòng tồn tại trung tâm (UC6 bước 4b). | NOT_FOUND |
| 409 | Không áp dụng: hai lần nhập đồng thời được xếp hàng nhờ khóa dòng tồn, cả hai đều thành công và tồn cuối bằng tổng (UC6 bước 5a). | — |
| 500 | Lỗi khi lưu: hoàn tác toàn bộ giao dịch CSDL, tồn không đổi (UC6 bước 5b). | INTERNAL_ERROR |

### Ví dụ lỗi 400 (US3, tiêu chí 2: số lượng = 0)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      { "field": "quantity", "reason": "Phải là số nguyên từ 1 đến 9999." }
    ]
  }
}
```

### Ví dụ lỗi 403 (US3, tiêu chí 3: kỹ thuật viên gọi nhập kho)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ quản lý trung tâm mới được ghi nhập kho.",
    "details": null
  }
}
```

## 1.6 EP4 – GET /api/v1/centers/{center_id}/stock/low (US4)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Liệt kê mọi linh kiện có tồn < ngưỡng (kể cả tồn = 0), xếp theo mức thiếu (shortage = ngưỡng − tồn) giảm dần; cùng mức thiếu thì xếp theo part_code tăng dần. |
| **Tham số** | Path: center_id. Query (tùy chọn): page. |
| **Quyền** | Kỹ thuật viên và Quản lý của đúng trung tâm center_id (UC7; QT-14). |
| **Truy vết** | US4 → FR6 → UC7 (UC3 sinh cảnh báo ở EP2, EP3). |

### Request mẫu (quản lý trung tâm 2)

```http
GET /api/v1/centers/2/stock/low?page=1 HTTP/1.1
Authorization: Bearer <access_token_quan_ly_tt2>
```

### Response mẫu – 200 OK

```json
{
  "center_id": 2,
  "page": 1,
  "page_size": 20,
  "total_items": 29,
  "total_pages": 2,
  "out_of_stock_count": 17,
  "items": [
    {
      "part_code": "CAM-AP-01",
      "part_name": "Camera sau Apple loại 1",
      "quantity": 0,
      "min_threshold": 8,
      "shortage": 8,
      "warning_label": "HẾT HÀNG"
    },
    {
      "part_code": "CAM-RM-03",
      "part_name": "Camera sau realme loại 3",
      "quantity": 0,
      "min_threshold": 8,
      "shortage": 8,
      "warning_label": "HẾT HÀNG"
    },
    {
      "part_code": "MH-AP-03",
      "part_name": "Màn hình Apple loại 3",
      "quantity": 1,
      "min_threshold": 8,
      "shortage": 7,
      "warning_label": "SẮP HẾT"
    },
    {
      "part_code": "PIN-OP-02",
      "part_name": "Pin OPPO loại 2",
      "quantity": 7,
      "min_threshold": 8,
      "shortage": 1,
      "warning_label": "SẮP HẾT"
    }
  ]
}
```

Ví dụ rút gọn còn 4 trong 20 dòng của trang 1 (4 dòng thật của trung tâm 2, đúng thứ tự sắp xếp); total_items = 29 và out_of_stock_count = 17 là số thật của trung tâm 2 (US4, tiêu chí 2). Linh kiện có tồn = ngưỡng (ví dụ 5/5) không xuất hiện (US4, tiêu chí 3).

### Mã trạng thái HTTP

| Mã | Khi nào | error.code |
|---|---|---|
| 200 | Thành công, kể cả khi không có linh kiện nào dưới ngưỡng (items rỗng, total_items = 0) hoặc page vượt quá total_pages. | — |
| 400 | page < 1 hoặc không phải số nguyên; center_id không phải số nguyên. | VALIDATION_FAILED |
| 401 | Thiếu hoặc sai token. | UNAUTHORIZED |
| 403 | center_id khác trung tâm của người dùng (QT-14). | FORBIDDEN |
| 404 | Không áp dụng: không có linh kiện sắp hết là 200 với danh sách rỗng. | — |
| 409 | Không áp dụng: endpoint chỉ đọc. | — |

## 1.7 Bảng quy tắc validation theo từng trường

| EP | Trường | Vị trí | Bắt buộc | Kiểu | Độ dài / dải giá trị | Khi sai |
|---|---|---|---|---|---|---|
| EP1–4, EP6 | Authorization | header | Có | string | Bearer + token hợp lệ, chưa hết hạn | 401 |
| EP1–4, EP6 | center_id | path | Có | integer | ≥ 1; phải bằng center_id trong token | 400 nếu không phải số nguyên; 403 nếu khác token |
| EP1 | q | query | Không | string | 1–50 ký tự sau khi cắt khoảng trắng hai đầu; bỏ trống = không lọc; khớp một phần theo part_code hoặc part_name, không phân biệt hoa thường | 400 nếu > 50 ký tự |
| EP1 | low_only | query | Không | boolean | true hoặc false; mặc định false | 400 |
| EP1, EP4 | page | query | Không | integer | ≥ 1; mặc định 1; 20 dòng mỗi trang; vượt total_pages thì trả items rỗng | 400 nếu < 1 hoặc không phải số nguyên |
| EP2 | ticket_code | body | Có | string | Dạng BH- + 6 chữ số + "/" + 4 chữ số năm (14 ký tự, ví dụ BH-000002/2025) | 400 sai định dạng; 404 không tồn tại; 403 khác trung tâm; 422 sai trạng thái |
| EP2, EP3 (body); EP6 (path) | part_code | body hoặc path | Có | string | Mã theo parts.csv: chữ hoa, số và dấu gạch ngang, 5–30 ký tự (ví dụ MH-AP-03, PIN-OP-03); phải có dòng tồn tại trung tâm | 400 sai định dạng; 404 không có dòng tồn |
| EP2 | quantity | body | Có | integer | 1 đến 9999; không nhận chuỗi, số thập phân, null | 400; 409 nếu lớn hơn tồn hiện có |
| EP3 | quantity | body | Có | integer | 1 đến 9999; không nhận chuỗi, số thập phân, null | 400 |
| EP6 | min_threshold | body | Có | integer | Số nguyên ≥ 0; không nhận chuỗi, số thập phân, null | 400 |

Vai trò không phải là trường nhập mà lấy từ token: EP1 và EP4 nhận cả hai vai trò, EP2 chỉ nhận TECHNICIAN, EP3 và EP6 chỉ nhận MANAGER; sai vai trò trả 403.

## 1.8 Tự kiểm: truy vết endpoint về User Story

**Bảng A – Endpoint → User Story → FR → Use case** (khớp bảng truy vết yêu cầu ở mục 1.6 của `docs/srs.md`):

| Endpoint | User Story | FR | Use case | MoSCoW |
|---|---|---|---|---|
| EP1 – GET .../stock | US1 | FR1 (FR6 cho nhãn cảnh báo) | UC1 | MUST |
| EP2 – POST .../stock/exports | US2, US4 | FR2, FR3, FR6 | UC2, UC3, UC4 | MUST |
| EP3 – POST .../stock/imports | US3, US4 | FR5, FR6 | UC6, UC4 | MUST |
| EP4 – GET .../stock/low | US4 | FR6 | UC7 | MUST |

**Bảng B – Tiêu chí chấp nhận của US MUST → endpoint → mã HTTP:**

| US | Tiêu chí chấp nhận (Given–When–Then) | Endpoint | Mã HTTP |
|---|---|---|---|
| US1 | Tìm "pin" ở trung tâm 2: 14 linh kiện, ≤ 1 giây | EP1 | 200 |
| US1 | Kỹ thuật viên trung tâm 2 xem tồn trung tâm 3 | EP1 | 403 |
| US2 | Tồn 10, xuất 2: tồn còn 8, có 1 giao dịch XUAT gắn mã phiếu | EP2 | 201 |
| US2 | Tồn 1, xuất 2: INSUFFICIENT_STOCK kèm tồn hiện có, tồn vẫn 1 | EP2 | 409 |
| US2 | Phiếu ở trạng thái "Đã phân công": tồn không đổi | EP2 | 422 |
| US3 | Tồn 1, nhập 20: tồn 21, có 1 giao dịch NHAP không có mã phiếu | EP3 | 201 |
| US3 | Số lượng 0 hoặc âm: tồn không đổi | EP3 | 400 |
| US3 | Kỹ thuật viên gọi nhập kho | EP3 | 403 |
| US4 | Ngưỡng 5, tồn 6, xuất 2 (còn 4): low_stock_warning = true và có trong danh sách sắp hết | EP2 rồi EP4 | 201; 200 |
| US4 | Trung tâm 2: 29 dòng sắp hết, trong đó 17 dòng HẾT HÀNG | EP4 | 200 |
| US4 | Ngưỡng 5, tồn 5: không xuất hiện, không cảnh báo | EP4 (và EP2, EP3) | 200 (low_stock_warning = false) |

**Kết quả tự kiểm:** 4/4 endpoint truy vết được về ít nhất một User Story MUST; 4/4 User Story MUST (US1–US4) có ít nhất một endpoint phục vụ; 11/11 tiêu chí chấp nhận MUST của US1–US4 (không tính tiêu chí 4 của US4 về đặt ngưỡng, do EP6 ở mục 1.9 phục vụ) có kịch bản request/response và mã HTTP tương ứng; không có endpoint nào phục vụ các mục WON'T ở mục 1 của `docs/srs.md`, trừ CRUD danh mục ở mục 1.15 được thêm ở mức tối thiểu cho tiêu chí S1 của BT2 (TD-21).

## 1.9 EP6 – PATCH /api/v1/centers/{center_id}/stock/{part_code}/threshold (US4, FR8)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Đặt ngưỡng cảnh báo (số nguyên ≥ 0) cho một dòng tồn có sẵn của trung tâm. L5 không tạo dòng tồn mới và không đổi danh mục linh kiện. |
| **Tham số** | Path: center_id, part_code. Body JSON: min_threshold (bắt buộc). |
| **Quyền** | Chỉ Quản lý của trung tâm center_id; Kỹ thuật viên bị 403 (NFR5). |
| **Truy vết** | US4 (tiêu chí đặt ngưỡng, SHOULD) → FR8 → UC9. |

### Request mẫu (quản lý trung tâm 2; LOA-SS-01 có tồn 8, ngưỡng đang là 3)

```http
PATCH /api/v1/centers/2/stock/LOA-SS-01/threshold HTTP/1.1
Authorization: Bearer <access_token_quan_ly_tt2>
Content-Type: application/json

{ "min_threshold": 10 }
```

### Response mẫu – 200 OK (ngưỡng 3 → 10, tồn 8 < 10 nên có cảnh báo; US4, tiêu chí 4)

```json
{
  "part_code": "LOA-SS-01",
  "part_name": "Loa ngoài Samsung loại 1",
  "quantity": 8,
  "min_threshold": 10,
  "unit_price": 650000,
  "low_stock_warning": true,
  "warning_label": "SẮP HẾT"
}
```

### Mã trạng thái HTTP

| Mã | Khi nào | error.code |
|---|---|---|
| 200 | Cập nhật thành công; phản hồi là dòng tồn sau khi sửa. | — |
| 400 | min_threshold không phải số nguyên ≥ 0 (ví dụ −1, chuỗi, thập phân, null); part_code sai định dạng; center_id không phải số nguyên. | VALIDATION_FAILED |
| 401 | Thiếu hoặc sai token. | UNAUTHORIZED |
| 403 | Người dùng là Kỹ thuật viên; hoặc center_id khác trung tâm của token. | FORBIDDEN |
| 404 | Linh kiện không có dòng tồn tại trung tâm. | NOT_FOUND |
| 409 | Không áp dụng: đặt ngưỡng là ghi đè giá trị, không có xung đột trạng thái. | — |

### Ví dụ lỗi 400 (US4, tiêu chí 4: ngưỡng = −1; ngưỡng không đổi)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      { "field": "min_threshold", "reason": "Phải là số nguyên ≥ 0." }
    ]
  }
}
```

## 1.10 Endpoint ngoài nhóm MUST

Để hợp đồng nhất quán với `docs/srs.md`, các endpoint sau thuộc story SHOULD/COULD được liệt kê tên; EP6 đã có đặc tả ở mục 1.9, các endpoint còn lại chưa đặc tả JSON chi tiết (chỉ nhóm MUST).

| Mã | Phương thức và đường dẫn | Mục đích | US / FR / UC | MoSCoW |
|---|---|---|---|---|
| EP5 | POST `/api/v1/tickets/{ticket_code}/shortage-reports` | Báo thiếu linh kiện: phiếu Đang xử lý → Chờ linh kiện, ghi ticket_status_log | US5 / FR4 / UC5 | SHOULD |
| EP6 | PATCH `/api/v1/centers/{center_id}/stock/{part_code}/threshold` | Đặt ngưỡng cảnh báo (số nguyên ≥ 0) cho dòng tồn có sẵn (đặc tả ở mục 1.9) | US4 / FR8 / UC9 | SHOULD |
| EP7 | GET `/api/v1/centers/{center_id}/stock/transactions` | Lịch sử giao dịch kho, lọc theo linh kiện và loại, mới nhất trước | US6 / FR7 / UC8 | COULD |
| EP8 | GET `/api/v1/tickets/{ticket_code}/used-parts` | Linh kiện đã dùng của phiếu kèm thành tiền và tổng cộng (đã làm ở buổi 10, đặc tả ở mục 1.13) | US7 / FR9 / UC10 | COULD |
| EP-L2 | GET `/api/v1/tickets/{ticket_code}` | Tra cứu phiếu cho nút [Tra cứu] ở Màn hình 2: trả ticket_code, status, center_id, issue_desc. Thuộc L2; vì chưa có dịch vụ L2 để gọi, L5 làm một bản CHỈ ĐỌC cùng đường dẫn (mục 1.13, TD-17). | US2 / FR2 / UC2 (bước 2) | Ngoài L5 |

## 1.11 Hợp đồng trong mã nguồn (buổi 9)

Bảng dưới chỉ ra nơi mỗi phần của hợp đồng này được viết bằng mã và được test giữ. Đổi một trường thì sửa đúng một chỗ ở cột "Viết ở", cập nhật tài liệu này trong cùng commit và chạy `npm test`.

| Ranh giới | Viết ở | Thi hành bằng | Test giữ hợp đồng |
|---|---|---|---|
| Client → API (đầu vào) | `src/backend/validators/stock.schema.js` | zod, kiểm tra một lần ở controller; sai trả 400 kèm `details` theo trường (cả schema CRUD ở mục 1.15) | `tests/stock.schema.test.js` |
| Đăng nhập | `src/backend/services/auth.service.js`, `services/password.js` | Băm scrypt, so sánh thời gian hằng; sai tên hay sai mật khẩu cùng một lỗi 401 | `tests/auth.api.test.js` |
| Token → API | `src/backend/controllers/auth.js` | Kiểm tra chữ ký JWT, vai trò, center_id; thứ tự 401 → 403 → 400 | `tests/auth.test.js`, NFR5 trong `tests/stock.api.test.js` |
| Service → API (đầu ra) | `src/backend/services/stock.contract.js` | Hàm chuyển đổi `toStockItem`, `toLowStockItem`, `toMovementResult`, `toPage`, `toPartItem` (mục 1.15); là chỗ duy nhất biết cả tên cột CSDL và tên trường API | `tests/stock.contract.test.js` |
| L2 → L5 (phiếu) | `src/backend/integrations/ticket.integration.js` | Đổi mã trạng thái CSDL (DANG_XU_LY) sang tên có dấu ("Đang xử lý") | `tests/stock.api.test.js` (422) |
| API → giao diện | `src/frontend/src/api/stock.view.js` | Đổi snake_case sang tên dùng trong giao diện, định dạng tiền VND; trang không đọc tên trường API | `src/frontend/src/api/stock.view.test.js` |

## 1.12 Đăng nhập – POST /api/v1/auth/login

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Đổi tên đăng nhập và mật khẩu lấy token dùng cho mọi endpoint ở trên (TD-12, TD-14). |
| **Tham số** | Body JSON: username (chuỗi 1–50 ký tự), password (chuỗi 1–100 ký tự), cả hai bắt buộc. |
| **Quyền** | Không cần token. |

```http
POST /api/v1/auth/login HTTP/1.1
Content-Type: application/json

{ "username": "ktv2", "password": "<mật khẩu>" }
```

Phản hồi 200:

```json
{ "access_token": "<JWT 8 giờ>", "full_name": "Kỹ thuật viên trung tâm 2", "role": "TECHNICIAN", "center_id": 2,
  "center_code": "TT02", "center_name": "TTBH Quận Tân Bình" }
```

Token có payload `user_id`, `role`, `center_id`, ký bằng `SECRET_KEY`. Mật khẩu lưu dạng băm scrypt có muối trong bảng `app_user`, không lưu bản gốc.

| Mã | Khi nào | error.code |
|---|---|---|
| 200 | Đúng tên đăng nhập và mật khẩu. | — |
| 400 | Thiếu username hoặc password, hoặc dài quá giới hạn. | VALIDATION_FAILED |
| 401 | Sai tên đăng nhập HOẶC sai mật khẩu. Hai trường hợp trả cùng một câu "Tên đăng nhập hoặc mật khẩu không đúng." để không lộ tên đăng nhập nào có thật. | UNAUTHORIZED |

Gọi API bằng curl không qua giao diện: `npm run token -- MANAGER 2` in ra một token hợp lệ (ký bằng cùng `SECRET_KEY`), tiện cho việc thử nhanh.

`center_code`, `center_name` thêm ở buổi 10 (TD-17) để giao diện ghi "TT02 - TTBH Quận Tân Bình" như wireframe; chỉ để hiển thị, phân quyền vẫn dùng `center_id` trong token.

## 1.13 Màn hình 2: tra cứu phiếu (EP-L2) và linh kiện đã dùng (EP8) – buổi 10

Cả hai nhận Kỹ thuật viên và Quản lý. Mã phiếu có dấu "/" nên được mã hoá trên đường dẫn: `/api/v1/tickets/BH-000002%2F2025`. Thứ tự lỗi: 401 → 400 (sai định dạng mã phiếu, `field = ticket_code`) → 404 (không có phiếu) → 403 (phiếu của trung tâm khác, không nói phiếu thuộc trung tâm nào; QT-14).

**EP-L2 – GET /api/v1/tickets/{ticket_code}**, 200 OK:

```json
{ "ticket_code": "BH-000002/2025", "status": "Đang xử lý", "center_id": 2,
  "issue_desc": "Cảm ứng chập chờn được chẩn đoán hư hỏng dây kết nối", "exportable": true }
```

`exportable` = phiếu đang ở trạng thái được xuất linh kiện (QT-L5-02), để giao diện báo trước khi bấm Xuất.

**EP8 – GET /api/v1/tickets/{ticket_code}/used-parts** (US7), 200 OK:

```json
{
  "ticket_code": "BH-000002/2025",
  "items": [
    { "transaction_id": 1001, "transaction_date": "2026-10-20", "part_code": "MH-AP-03",
      "part_name": "Màn hình Apple loại 3", "quantity": 2, "unit_price": 980000, "line_total": 1960000 },
    { "transaction_id": 1002, "transaction_date": "2026-10-20", "part_code": "PIN-AP-03",
      "part_name": "Pin Apple loại 3", "quantity": 1, "unit_price": 150000, "line_total": 150000 }
  ],
  "total_amount": 2110000
}
```

Chỉ gồm giao dịch XUAT của phiếu, cũ trước mới sau. `unit_price` là đơn giá hiện hành trong danh mục (CSDL không lưu giá lúc xuất). Phiếu chưa xuất linh kiện nào trả `items: []` và `total_amount: 0` (US7 tiêu chí 2), không phải 404.

## 1.14 Kiểm tra sống – GET /health (buổi 11)

| Thuộc tính | Nội dung |
|---|---|
| **Mục đích** | Cho Docker (HEALTHCHECK của ảnh backend, `depends_on: condition: service_healthy` của `web`) và người vận hành biết API đã thật sự phục vụ được (TD-19). |
| **Đường dẫn** | `GET /health`, nằm ngoài `/api/v1`. Khi chạy bằng Docker, gọi qua giao diện tại `http://localhost:8080/health` cũng được (nginx chuyển tiếp). |
| **Quyền** | Không cần token. Không trả dữ liệu nghiệp vụ. |

| Mã | Khi nào | Body |
|---|---|---|
| 200 | API chạy và CSDL trả lời `SELECT 1`. | `{"status": "ok", "db": "ok"}` |
| 503 | API chạy nhưng không kết nối được CSDL. | `{"status": "degraded", "db": "unavailable"}` |

## 1.15 CRUD danh mục linh kiện và dòng tồn (BT2, TD-21)

Đề BT2 (track SE, tiêu chí S1) yêu cầu ít nhất 2 thực thể có đủ tạo, đọc, sửa, xoá. Hai thực thể là **linh kiện** (`part`, danh mục dùng chung) và **dòng tồn** (`part_stock`, tồn của một linh kiện tại một trung tâm). "Xoá" là **ngừng dùng** (đặt `is_active = false`), không xoá vật lý (QT-13): dòng vẫn còn trong CSDL để sổ giao dịch và linh kiện đã dùng của phiếu (EP8) tra lại được. Thứ ngừng dùng coi như không có: mọi lệnh đọc, sửa, nhập, xuất trả 404. Tạo lại cùng mã thì dùng lại dòng cũ.

| Thực thể | Thao tác | Phương thức và đường dẫn | Quyền | Thành công | Lỗi riêng |
|---|---|---|---|---|---|
| Linh kiện | Đọc danh sách | GET `/api/v1/parts?q=&page=` | Mọi người đã đăng nhập | 200, phân trang 20, chỉ linh kiện đang dùng, sắp theo mã | 400 |
| Linh kiện | Đọc một | GET `/api/v1/parts/{part_code}` | Mọi người đã đăng nhập | 200 | 404 |
| Linh kiện | Tạo | POST `/api/v1/parts` | Quản lý | 201 | 400; 409 `ALREADY_EXISTS` (mã đang dùng) |
| Linh kiện | Sửa | PATCH `/api/v1/parts/{part_code}` | Quản lý | 200 | 400 (gửi `part_code`, hoặc không gửi trường nào); 404 |
| Linh kiện | Xoá (ngừng dùng) | DELETE `/api/v1/parts/{part_code}` | Quản lý | 204, ngừng dùng luôn mọi dòng tồn của linh kiện | 404; 409 `STOCK_NOT_EMPTY` (còn tồn > 0 ở ít nhất một trung tâm) |
| Dòng tồn | Đọc | GET `.../centers/{center_id}/stock` (EP1), GET `.../stock/{part_code}` | Như EP1 | 200 | Như EP1; 404 |
| Dòng tồn | Tạo | POST `/api/v1/centers/{center_id}/stock` | Quản lý, đúng trung tâm (QT-14) | 201, tồn = 0 | 400; 404 (linh kiện không có trong danh mục); 409 `ALREADY_EXISTS` |
| Dòng tồn | Sửa | PATCH `.../stock/{part_code}/threshold` (EP6, mục 1.9) | Quản lý | 200 | Như EP6 |
| Dòng tồn | Xoá (ngừng dùng) | DELETE `/api/v1/centers/{center_id}/stock/{part_code}` | Quản lý, đúng trung tâm | 204 | 404; 409 `STOCK_NOT_EMPTY` (tồn > 0) |

Quy tắc giữ nguyên: số lượng tồn chỉ đổi qua nhập/xuất kho (EP2, EP3) để sổ giao dịch giải thích được từng cái (QT-L5-01), nên dòng tồn mới luôn bắt đầu bằng 0 và không có trường `quantity` khi tạo hay sửa. Mã linh kiện không sửa được vì đã nằm trên sổ giao dịch; muốn đổi thì tạo mã mới. Chỉ ngừng dùng được khi tồn bằng 0, để hàng còn trong kho không "biến mất" khỏi màn hình tra cứu. Đổi đơn giá thì thành tiền ở EP8 đổi theo, vì EP8 dùng giá hiện hành (mục 1.13).

Thứ tự kiểm tra như mục 1.1: 401 → 403 (vai trò, trung tâm) → 400 → 404 → 409.

### Validation

| Trường | Ở | Bắt buộc | Quy tắc | Sai trả |
|---|---|---|---|---|
| part_code | body (tạo linh kiện, tạo dòng tồn), đường dẫn | Có | Như EP2: chữ hoa, số, dấu gạch ngang, 5–30 ký tự | 400 |
| part_name | body | Có khi tạo; tuỳ chọn khi sửa | Chuỗi, cắt khoảng trắng hai đầu, 1–120 ký tự | 400 |
| unit_price | body | Có khi tạo; tuỳ chọn khi sửa | Số nguyên VND, 0 đến 999.999.999.999; không nhận chuỗi, số thập phân | 400 |
| min_threshold | body (tạo dòng tồn) | Có | Như EP6: số nguyên ≥ 0 | 400 |
| (body sửa linh kiện) | body | — | Phải có ít nhất một trong `part_name`, `unit_price`; gửi `part_code` thì bị từ chối | 400 |

### Ví dụ (PowerShell, trong `src/backend`, server đang chạy)

```powershell
$QL = npm run -s token -- MANAGER 2
# Linh kiện: tạo → đọc → sửa → xoá
curl.exe -X POST "http://localhost:3000/api/v1/parts" -H "Authorization: Bearer $QL" -H "Content-Type: application/json" -d "{\"part_code\":\"PIN-NK-01\",\"part_name\":\"Pin Nokia loại 1\",\"unit_price\":350000}"
curl.exe "http://localhost:3000/api/v1/parts/PIN-NK-01" -H "Authorization: Bearer $QL"
curl.exe -X PATCH "http://localhost:3000/api/v1/parts/PIN-NK-01" -H "Authorization: Bearer $QL" -H "Content-Type: application/json" -d "{\"unit_price\":390000}"
# Dòng tồn: tạo → đọc → sửa ngưỡng → xoá
curl.exe -X POST "http://localhost:3000/api/v1/centers/2/stock" -H "Authorization: Bearer $QL" -H "Content-Type: application/json" -d "{\"part_code\":\"PIN-NK-01\",\"min_threshold\":2}"
curl.exe "http://localhost:3000/api/v1/centers/2/stock/PIN-NK-01" -H "Authorization: Bearer $QL"
curl.exe -X PATCH "http://localhost:3000/api/v1/centers/2/stock/PIN-NK-01/threshold" -H "Authorization: Bearer $QL" -H "Content-Type: application/json" -d "{\"min_threshold\":5}"
curl.exe -i -X DELETE "http://localhost:3000/api/v1/centers/2/stock/PIN-NK-01" -H "Authorization: Bearer $QL"
curl.exe -i -X DELETE "http://localhost:3000/api/v1/parts/PIN-NK-01" -H "Authorization: Bearer $QL"
```

Phản hồi 201 khi tạo linh kiện: `{"part_code": "PIN-NK-01", "part_name": "Pin Nokia loại 1", "unit_price": 350000}`. Phản hồi 201 khi tạo dòng tồn có cùng hình dạng như một dòng của EP1 (`quantity: 0`, `warning_label: "HẾT HÀNG"` nếu ngưỡng > 0). Xoá thành công trả 204, không có nội dung.

Ví dụ lỗi 409 khi ngừng dùng linh kiện còn tồn:

```json
{
  "error": {
    "code": "STOCK_NOT_EMPTY",
    "message": "Linh kiện PIN-OP-03 còn tồn ở 2 trung tâm nên chưa ngừng dùng được.",
    "details": { "part_code": "PIN-OP-03", "centers_with_stock": 2 }
  }
}
```

Test giữ hợp đồng: `tests/part.api.test.js` (linh kiện, 6 test), `tests/stock-crud.api.test.js` (dòng tồn, 4 test), `tests/stock.schema.test.js` (validation).