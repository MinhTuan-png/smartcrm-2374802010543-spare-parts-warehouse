# Kiến trúc đã hiện thực (Bài tập 2)

Sơ đồ dưới đây vẽ các thành phần đang CÓ trong mã nguồn (cập nhật buổi 11), không phải sơ đồ dự kiến của BT1 (`docs/export/architecture.png`). Khác biệt so với BT1 ghi ở `docs/thay-doi-thiet-ke.md`.

## 1. Thành phần trong mã nguồn

```mermaid
flowchart TB
  subgraph FE["Giao diện – src/frontend (React + Vite)"]
    P["pages/<br/>Login · Stock (Màn hình 1) · Export (Màn hình 2) · Import (Màn hình 3)"]
    C["components/<br/>DataState (3 trạng thái) · ErrorBox · ErrorLine · WarningBadge · PartPicker"]
    H["hooks/useApi.js<br/>đang tải / lỗi / dữ liệu"]
    A["api/<br/>client.js (HTTP, token, 401, thời gian chờ 20 giây) · session.js<br/>stock.api.js · stock.view.js (ranh giới API → giao diện)"]
    P --> C
    P --> H
    H --> A
    P --> A
  end

  subgraph BE["Backend – src/backend (Node.js + Express)"]
    MW["Middleware chung<br/>controllers/request-id.js (X-Request-Id) · CORS · express.json"]
    L2["Lớp 2 – API<br/>controllers/ (auth.js, auth.controller.js, stock.controller.js, ticket.controller.js, health.controller.js)<br/>validators/stock.schema.js · controllers/error-handler.js (lỗi → mã HTTP, ghi log một lần)"]
    L3["Lớp 3 – Nghiệp vụ<br/>services/ (stock.service.js, ticket.service.js, stock.contract.js, auth.service.js, password.js)"]
    L4["Lớp 4 – Truy cập dữ liệu<br/>repositories/ (stock.repository.js, user.repository.js)"]
    I["Tích hợp với L2<br/>integrations/ticket.integration.js (chỉ đọc phiếu)"]
    L5["Lớp 5 – CSDL<br/>db/connection.js (pool, thời gian chờ, bắt lỗi kết nối rảnh)<br/>wait-for-db.js · migrate.js · migrations/ 001–003 · seed/"]
    LOG["Dùng chung<br/>logger.js (log JSON ra stdout, che dữ liệu nhạy cảm) · errors.js (AppError)"]
    MW --> L2
    L2 --> L3
    L3 --> L4
    L3 --> I
    L4 --> L5
    I --> L5
  end

  DB[("PostgreSQL 16<br/>service_center · part · part_stock · part_transaction<br/>ticket · ticket_status_log (của L2) · app_user")]

  A -- "HTTP JSON + Bearer token<br/>VITE_API_BASE_URL (Docker: /api cùng nguồn)" --> MW
  L5 --> DB
```

`logger.js` được error-handler, request-id, connection, wait-for-db, migrate và seed dùng; không vẽ mũi tên để sơ đồ dễ đọc.

## 2. Triển khai bằng Docker (buổi 11)

```mermaid
flowchart LR
  U["Trình duyệt<br/>http://localhost:8080"] --> WEB
  subgraph NET["Mạng riêng của docker compose (gọi nhau bằng TÊN dịch vụ)"]
    WEB["web<br/>nginx-unprivileged 1.27, cổng 8080<br/>phục vụ giao diện đã dựng; /api, /health → api:3000"]
    API["api<br/>node:22-alpine, người dùng node<br/>chờ CSDL → migrate → seed → server; HEALTHCHECK /health"]
    DBS["db<br/>postgres:16-alpine<br/>HEALTHCHECK pg_isready"]
    WEB -- "depends_on: api healthy" --> API
    API -- "DB_HOST=db · depends_on: db healthy" --> DBS
  end
  VOL[("volume db_data")] --- DBS
  CSV["data-mau/ (hoặc data/)<br/>gắn chỉ đọc vào /data"] --- API
```

Thứ tự khởi động: `db` healthy → `api` healthy → `web`. Cấu hình lấy từ `.env` (mẫu ở `.env.example`). Chạy bằng hai lệnh: `cp .env.example .env` và `docker compose up -d --build` (README mục 3.1).

## 3. Lớp nằm ở đâu

| Lớp | Thư mục | Được gọi bởi | Không được làm |
|---|---|---|---|
| Giao diện | `src/frontend/src/pages`, `components`, `hooks` | Người dùng | Gọi `fetch` trực tiếp (mọi lệnh gọi qua `src/api/`); đọc tên trường snake_case của API (qua `stock.view.js`) |
| Lớp 2 – API | `src/backend/controllers`, `validators` | Giao diện | Chứa quy tắc nghiệp vụ; gọi repository |
| Lớp 3 – Nghiệp vụ | `src/backend/services` | Lớp 2 | Dùng `req`, `res`, mã HTTP; viết SQL; tự ghi log rồi ném lại lỗi |
| Tích hợp L2 | `src/backend/integrations` | Lớp 3 | Sửa phiếu của L2 |
| Lớp 4 – Dữ liệu | `src/backend/repositories` | Lớp 3 | Chứa quy tắc nghiệp vụ; nuốt lỗi CSDL |
| Lớp 5 – CSDL | `src/backend/db` | Lớp 4, tích hợp | — |

## 4. Luồng chính đã ghép (UC2 – xuất linh kiện)

Giao diện `ExportPage` → `stockApi.exportPart` → `POST /api/v1/centers/{id}/stock/exports` → `request-id.js` (gắn requestId) → `auth.js` (401/403) → `stock.schema.js` (400) → `stock.service.exportPart` → `ticket.integration.findTicket` (404/403/422) → `stock.repository.lockStock` (khoá dòng tồn, 404/409) → `changeQuantity` + `insertTransaction` trong một giao dịch CSDL → `stock.contract.toMovementResult` → 201 → `stock.view.toMovementView` → thông báo kết quả kèm nhãn cảnh báo. Kết thúc yêu cầu, `request-id.js` ghi một dòng log JSON (đường dẫn, mã trạng thái, thời gian).

## 5. Lỗi đi qua các lớp thế nào (buổi 11)

| Tình huống | Lớp sinh lỗi | Error-handler trả | Log | Giao diện hiện |
|---|---|---|---|---|
| Vi phạm quy tắc (tồn không đủ, phiếu sai trạng thái) | Lớp 3 ném `AppError` có mã | 409 / 422 theo `error.code` | INFO, có requestId | Câu báo lỗi kèm bước tiếp theo |
| Dữ liệu sai, chưa đăng nhập, sai quyền | Lớp 2 (`stock.schema.js`, `auth.js`) | 400 / 401 / 403 | INFO | Lỗi theo trường; 401 thì về trang đăng nhập |
| Mất CSDL (tắt, khởi động lại, quá `DB_CONNECT_TIMEOUT_MS`) | `pg` ở Lớp 5, không lớp nào bắt | 503 `INTERNAL_ERROR` + mã tra cứu | ERROR, có requestId | Lỗi có mã tra cứu và nút Thử lại |
| Lỗi không lường trước | Bất kỳ | 500 `INTERNAL_ERROR` + mã tra cứu | ERROR kèm stack | Như trên |
| CSDL cắt kết nối đang rảnh | Pool `pg` | Không có yêu cầu nào bị ảnh hưởng | WARN | Không thấy gì; API không sập (BUG-002) |
