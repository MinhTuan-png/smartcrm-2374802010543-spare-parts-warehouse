# API documentation

REST API of the **spare-parts warehouse (flow L5)** of Smart CRM – Mekong Mobile. It lists **all 17 endpoints** that the running system exposes. Every example below was copied from a real call against the system started with `docker compose up -d --build` and the committed sample data (`data-mau/`), then trimmed only where the note says so. Business messages in responses are in Vietnamese because the users are Vietnamese; the `code` fields are the stable part to program against.

The shorter Vietnamese contract used during design is `docs/api-contract.md`; this folder is the English reference for handover.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `http://localhost:3000` (API container). The web container (`http://localhost:8080`) forwards `/api/*` and `/health` to the API |
| Format | JSON in and out (`Content-Type: application/json`); bodies larger than 100 KB are rejected with `413` |
| Authentication | `POST /api/v1/auth/login` returns a JWT (HS256, 8 hours) with `user_id`, `role` and `center_id`. Send `Authorization: Bearer <token>` on every call except `/health` and login |
| Roles | `TECHNICIAN` (reads, stock-out) and `MANAGER` (stock-in, thresholds, stock rows, catalog changes). See the role table below |
| Center scope (QT-14) | Stock endpoints carry `centerId` in the path; it must equal the token's `center_id`, otherwise `403`. Tickets are checked against the token's center |
| Check order | `401` (token) → `403` (role, center) → `400` (input) → `404`/`409`/`422` (business) |
| Error format | Always `{"error": {"code": "...", "message": "...", "details": ...}}`. `details` is a list of `{field, reason}` for `400`, an object with context for `409`/`422`, `{lookup_id}` for `500`/`503`, or `null` |
| Paging | 20 rows per page, `page` from 1 to 999999, response has `page`, `page_size`, `total_items`, `total_pages` |
| Dates and money | Dates `YYYY-MM-DD`; money as integer VND |
| CORS | Allowed browser origins come from `CORS_ORIGIN`; methods `GET, POST, PATCH, DELETE, OPTIONS` |
| Request id | Every response has an `X-Request-Id` header; the same id is in the log and, for `500`/`503`, in `details.lookup_id` |

### Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Input is malformed or out of range (also undecodable URL, broken JSON or gzip) |
| 401 | `UNAUTHORIZED` | Token missing, invalid, tampered or expired; wrong login |
| 403 | `FORBIDDEN` | Wrong role or wrong center |
| 404 | `NOT_FOUND` | The thing does not exist (or is retired) |
| 409 | `INSUFFICIENT_STOCK`, `ALREADY_EXISTS`, `STOCK_NOT_EMPTY` | Conflict with the current state |
| 413 | `PAYLOAD_TOO_LARGE` | Request body larger than 100 KB |
| 422 | `TICKET_STATE_INVALID` | The ticket status does not allow the action |
| 500 | `INTERNAL_ERROR` | Unexpected error; the answer holds only a lookup id, never a stack trace |
| 503 | `INTERNAL_ERROR` | The database cannot be reached; try again later |

### Who can call what

| Endpoint | Technician | Manager |
|---|---|---|
| 1 Health, 2 Login | everyone | everyone |
| 3, 5, 8 read stock; 11, 12 read tickets; 13, 14 read catalog | yes | yes |
| 6 Stock-out | **yes** | no (`403`) |
| 4 Add stock row, 7 Stock-in, 9 Threshold, 10 Retire row, 15–17 catalog changes | no (`403`) | **yes** |

## Endpoint index

| # | Method and path | Purpose |
|---|---|---|
| 1 | `GET /health` | Liveness and database check |
| 2 | `POST /api/v1/auth/login` | Get a token |
| 3 | `GET /api/v1/centers/{centerId}/stock` | Search stock (EP1) |
| 4 | `POST /api/v1/centers/{centerId}/stock` | Add a stock row |
| 5 | `GET /api/v1/centers/{centerId}/stock/low` | Low-stock list (EP4) |
| 6 | `POST /api/v1/centers/{centerId}/stock/exports` | Stock-out for a ticket (EP2) |
| 7 | `POST /api/v1/centers/{centerId}/stock/imports` | Stock-in (EP3) |
| 8 | `GET /api/v1/centers/{centerId}/stock/{partCode}` | One stock row |
| 9 | `PATCH /api/v1/centers/{centerId}/stock/{partCode}/threshold` | Set threshold (EP6) |
| 10 | `DELETE /api/v1/centers/{centerId}/stock/{partCode}` | Retire a stock row |
| 11 | `GET /api/v1/tickets/{ticketCode}` | Read a ticket |
| 12 | `GET /api/v1/tickets/{ticketCode}/used-parts` | Parts used on a ticket (EP8) |
| 13 | `GET /api/v1/parts` | List catalog |
| 14 | `GET /api/v1/parts/{partCode}` | One catalog part |
| 15 | `POST /api/v1/parts` | Create part |
| 16 | `PATCH /api/v1/parts/{partCode}` | Update part |
| 17 | `DELETE /api/v1/parts/{partCode}` | Retire part |

In the examples, `$TOKEN` is the `access_token` from endpoint 2 (technician `ktv2` or manager `quanly2`, center 2).

## Endpoints

### 1. Health check

1. **Method and path:** `GET /health`
2. **What it does:** Tells Docker and operators whether the API is alive and the database answers. Not a business endpoint.
3. **Authentication:** None.
4. **Parameters and request body:** None.
5. **Success response:** `200` with `{"status":"ok","db":"ok"}`.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 503 | `(body `{"status":"degraded","db":"unavailable"}`)` | The database does not answer. |

7. **Notes and limits:** Logged at `debug` level only (Docker calls it every 10 seconds). Used by the container health checks.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/health"
```

Response — `200`:

```json
{
  "status": "ok",
  "db": "ok"
}
```


### 2. Log in

1. **Method and path:** `POST /api/v1/auth/login`
2. **What it does:** Checks a username and password and returns a signed token (JWT, valid 8 hours) that carries the user id, role and center.
3. **Authentication:** None (this is how you get a token).
4. **Parameters and request body:** JSON body: `username` (string, 1–50 characters, no NUL character), `password` (string, 1–100 characters).
5. **Success response:** `200` with `access_token`, `full_name`, `role` (`TECHNICIAN` or `MANAGER`), `center_id`, `center_code`, `center_name`. Send the token as `Authorization: Bearer <access_token>` on every other call.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Missing or empty field, too long, or `username` contains a NUL character. `details` lists `{field, reason}` per field. |
| 401 | `UNAUTHORIZED` | Wrong username **or** wrong password. The answer is identical for both so that usernames cannot be guessed. |
| 413 | `PAYLOAD_TOO_LARGE` | Request body larger than 100 KB. |

7. **Notes and limits:** No rate limit or account lock yet (listed as a known limit in `docs/checklist-bao-mat.md`). Demo users are `ktv<center>` and `quanly<center>`.

**Example (real request and response):**

```bash
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "ktv2", "password": "matkhau-demo-2026"}'
```

Response — `200`:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik…",
  "full_name": "Kỹ thuật viên trung tâm 2",
  "role": "TECHNICIAN",
  "center_id": 2,
  "center_code": "TT02",
  "center_name": "TTBH Quận Tân Bình"
}
```

Wrong password:

```bash
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "ktv2", "password": "sai-mat-khau"}'
```

Response — `401`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Tên đăng nhập hoặc mật khẩu không đúng.",
    "details": null
  }
}
```


### 3. Search stock of a center (EP1)

1. **Method and path:** `GET /api/v1/centers/{centerId}/stock`
2. **What it does:** Lists the active stock rows of one center, with a warning label when quantity is below the minimum threshold. Used by screen 1 (stock lookup).
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`). The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId` (positive integer). Query, all optional: `q` (text matched against part code or name, up to 50 characters), `low_only` (`true` or `false`), `page` (integer 1 to 999999, default 1; fixed 20 rows per page).
5. **Success response:** `200` with `center_id`, `query`, `low_only`, `page`, `page_size`, `total_items`, `total_pages`, `low_stock_count` (how many of the matching rows are below threshold) and `items[]` (`part_code`, `part_name`, `quantity`, `min_threshold`, `unit_price`, `low_stock_warning`, `warning_label` = `SẮP HẾT`, `HẾT HÀNG` or `null`).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | `centerId` differs from the token's center, even if that center does not exist (it never reveals which centers exist). |
| 400 | `VALIDATION_FAILED` | `centerId` is not a positive integer. |
| 400 | `VALIDATION_FAILED` | `q` longer than 50 characters or containing NUL; `low_only` not `true`/`false`; `page` not an integer from 1 to 999999. |

7. **Notes and limits:** No matching rows is a normal `200` with an empty `items`, not a 404. A page beyond `total_pages` also returns an empty `items`. Money values are integer VND. Sorted by part code; with `low_only=true`, by shortage (largest first).

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/centers/2/stock?q=pin" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "center_id": 2,
  "query": "pin",
  "low_only": false,
  "page": 1,
  "page_size": 20,
  "total_items": 14,
  "total_pages": 1,
  "low_stock_count": 3,
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
    }
  ]
}
```

The `items` array is shortened to two entries here.


### 4. Add a stock row to a center

1. **Method and path:** `POST /api/v1/centers/{centerId}/stock`
2. **What it does:** Makes a catalog part available in the center with quantity 0 and a minimum threshold. To add goods, record a stock-in afterwards (endpoint 7). A row that was retired earlier is reactivated.
3. **Authentication:** Bearer token; role `MANAGER` only. The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`. JSON body: `part_code` (required, `^[A-Z0-9-]{5,30}$`), `min_threshold` (required integer 0 to 2147483647).
5. **Success response:** `201` with the new stock item (same shape as an `items` entry of endpoint 3).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`, or `centerId` differs from the token's center. |
| 400 | `VALIDATION_FAILED` | Invalid body or `centerId`. |
| 404 | `NOT_FOUND` | The part is not in the (active) catalog. |
| 409 | `ALREADY_EXISTS` | The center already has an active row for that part. |

7. **Notes and limits:** The quantity always starts at 0, so every unit in the stock is explained by a ledger entry.

**Example (real request and response):**

```bash
curl -X POST "http://localhost:3000/api/v1/centers/2/stock" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"part_code": "MH-XM-03", "min_threshold": 4}'
```

Response — `201`:

```json
{
  "part_code": "MH-XM-03",
  "part_name": "Màn hình Xiaomi loại 3",
  "quantity": 0,
  "min_threshold": 4,
  "unit_price": 1450000,
  "low_stock_warning": true,
  "warning_label": "HẾT HÀNG"
}
```


### 5. List low-stock rows (EP4)

1. **Method and path:** `GET /api/v1/centers/{centerId}/stock/low`
2. **What it does:** Lists every row whose quantity is below its threshold, including quantity 0, most missing first. Used by the low-stock list on screen 1.
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`). The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`. Query: `page` (integer 1 to 999999, default 1).
5. **Success response:** `200` with paging fields, `out_of_stock_count` and `items[]` (`part_code`, `part_name`, `quantity`, `min_threshold`, `shortage`, `warning_label`).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | `centerId` differs from the token's center, even if that center does not exist (it never reveals which centers exist). |
| 400 | `VALIDATION_FAILED` | `centerId` is not a positive integer. |
| 400 | `VALIDATION_FAILED` | `page` is not an integer from 1 to 999999. |

7. **Notes and limits:** A row whose quantity equals its threshold is **not** low. Sorted by shortage (threshold − quantity) descending, then by part code.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/centers/2/stock/low" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

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
    }
  ]
}
```

The `items` array is shortened to two entries here.


### 6. Stock-out for a repair ticket (EP2)

1. **Method and path:** `POST /api/v1/centers/{centerId}/stock/exports`
2. **What it does:** Takes parts out of the center's stock for a repair ticket: subtracts the quantity and writes one `XUAT` ledger entry in the **same** database transaction. Either both happen or neither.
3. **Authentication:** Bearer token; role `TECHNICIAN` only. The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`. JSON body: `ticket_code` (`BH-000002/2025` format), `part_code`, `quantity` (integer 1 to 9999; `2.5`, `"2"`, `0` and negatives are rejected).
5. **Success response:** `201` with `transaction` (`transaction_id`, `type` = `XUAT`, `quantity`, `transaction_date`, `ticket_code`, `part_code`), `stock` (new quantity) and `low_stock_warning`/`warning_label`.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `TECHNICIAN`; `centerId` differs from the token; or the ticket belongs to another center (the message does not say which). |
| 400 | `VALIDATION_FAILED` | Invalid body. `details` names each wrong field, for example `quantity`. |
| 404 | `NOT_FOUND` | The ticket does not exist, or the center has no active stock row for the part. |
| 422 | `TICKET_STATE_INVALID` | The ticket is not `Đang xử lý` or `Chờ linh kiện`. `details` has `current_status` and `allowed_statuses`. |
| 409 | `INSUFFICIENT_STOCK` | `quantity` is larger than the stock. `details` has `requested_quantity` and `available_quantity`; nothing is changed. |

7. **Notes and limits:** Business rules: QT-09 (never below zero), QT-14 (center scope), QT-L5-01 (ledger is append-only), QT-L5-02 (ticket status). Concurrent requests queue on a row lock: 20 simultaneous requests of 1 on a stock of 10 give exactly 10 successes and 10 `409`. Order of checks: 401, 403 (role, center), 400, then 404, 403 (ticket), 422, 409.

**Example (real request and response):**

```bash
curl -X POST "http://localhost:3000/api/v1/centers/2/stock/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03", "quantity": 2}'
```

Response — `201`:

```json
{
  "transaction": {
    "transaction_id": 4952,
    "type": "XUAT",
    "quantity": 2,
    "transaction_date": "2026-11-03",
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

More than the stock holds:

```bash
curl -X POST "http://localhost:3000/api/v1/centers/2/stock/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03", "quantity": 9999}'
```

Response — `409`:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Tồn kho không đủ để xuất.",
    "details": {
      "part_code": "PIN-OP-03",
      "requested_quantity": 9999,
      "available_quantity": 8,
      "ticket_status": "Đang xử lý"
    }
  }
}
```

Invalid quantity:

```bash
curl -X POST "http://localhost:3000/api/v1/centers/2/stock/exports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticket_code": "BH-000002/2025", "part_code": "PIN-OP-03", "quantity": 0}'
```

Response — `400`:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu không hợp lệ.",
    "details": [
      {
        "field": "quantity",
        "reason": "Phải là số nguyên từ 1 đến 9999."
      }
    ]
  }
}
```


### 7. Stock-in (EP3)

1. **Method and path:** `POST /api/v1/centers/{centerId}/stock/imports`
2. **What it does:** Adds received parts to the center's stock and writes one `NHAP` ledger entry (no ticket) in the same transaction.
3. **Authentication:** Bearer token; role `MANAGER` only. The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`. JSON body: `part_code`, `quantity` (integer 1 to 9999).
5. **Success response:** `201` with `transaction` (`type` = `NHAP`, `ticket_code` = `null`), `stock` and `low_stock_warning`/`warning_label`.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`, or `centerId` differs from the token's center. |
| 400 | `VALIDATION_FAILED` | Invalid body. |
| 404 | `NOT_FOUND` | The center has no active stock row for that part (create it first with endpoint 4). |

7. **Notes and limits:** Two simultaneous stock-ins both succeed and the final quantity is their sum (row lock).

**Example (real request and response):**

```bash
curl -X POST "http://localhost:3000/api/v1/centers/2/stock/imports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"part_code": "PIN-OP-02", "quantity": 20}'
```

Response — `201`:

```json
{
  "transaction": {
    "transaction_id": 4951,
    "type": "NHAP",
    "quantity": 20,
    "transaction_date": "2026-11-03",
    "ticket_code": null,
    "part_code": "PIN-OP-02"
  },
  "stock": {
    "part_code": "PIN-OP-02",
    "part_name": "Pin OPPO loại 2",
    "quantity": 27,
    "min_threshold": 8
  },
  "low_stock_warning": false,
  "warning_label": null
}
```


### 8. Read one stock row

1. **Method and path:** `GET /api/v1/centers/{centerId}/stock/{partCode}`
2. **What it does:** Returns the current quantity, threshold and warning of one part in the center. Used before a stock-out or stock-in to show the present quantity.
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`). The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`, `partCode` (`^[A-Z0-9-]{5,30}$`).
5. **Success response:** `200` with one stock item (same shape as an `items` entry of endpoint 3).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | `centerId` differs from the token's center, even if that center does not exist (it never reveals which centers exist). |
| 400 | `VALIDATION_FAILED` | `centerId` or `partCode` has the wrong format. |
| 404 | `NOT_FOUND` | No active stock row for that part in the center. |

7. **Notes and limits:** The words `low` and `exports` are routes of their own, not part codes.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/centers/2/stock/PIN-OP-03" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "part_code": "PIN-OP-03",
  "part_name": "Pin OPPO loại 3",
  "quantity": 10,
  "min_threshold": 3,
  "unit_price": 650000,
  "low_stock_warning": false,
  "warning_label": null
}
```


### 9. Set the minimum threshold (EP6)

1. **Method and path:** `PATCH /api/v1/centers/{centerId}/stock/{partCode}/threshold`
2. **What it does:** Changes the quantity below which the part is flagged as low.
3. **Authentication:** Bearer token; role `MANAGER` only. The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`, `partCode`. JSON body: `min_threshold` (integer 0 to 2147483647).
5. **Success response:** `200` with the updated stock item.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`, or wrong center. |
| 400 | `VALIDATION_FAILED` | `min_threshold` missing, negative, decimal or text. |
| 404 | `NOT_FOUND` | No active stock row for that part. |

7. **Notes and limits:** Does not change the quantity and writes no ledger entry.

**Example (real request and response):**

```bash
curl -X PATCH "http://localhost:3000/api/v1/centers/2/stock/MH-XM-03/threshold" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"min_threshold": 6}'
```

Response — `200`:

```json
{
  "part_code": "MH-XM-03",
  "part_name": "Màn hình Xiaomi loại 3",
  "quantity": 0,
  "min_threshold": 6,
  "unit_price": 1450000,
  "low_stock_warning": true,
  "warning_label": "HẾT HÀNG"
}
```


### 10. Retire a stock row

1. **Method and path:** `DELETE /api/v1/centers/{centerId}/stock/{partCode}`
2. **What it does:** Retires (soft-deletes) the row. Allowed only when the quantity is 0, so no goods disappear from lookups.
3. **Authentication:** Bearer token; role `MANAGER` only. The `centerId` in the path must equal the `center_id` inside the token.
4. **Parameters and request body:** Path: `centerId`, `partCode`. No body.
5. **Success response:** `204` with an empty body.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`, or wrong center. |
| 400 | `VALIDATION_FAILED` | Wrong path format. |
| 404 | `NOT_FOUND` | No active stock row. |
| 409 | `STOCK_NOT_EMPTY` | The row still holds goods; `details.quantity` says how many. |

7. **Notes and limits:** Rule QT-13: no physical delete. The row stays in the database with `is_active = false` and old ledger entries still refer to it. Adding the part again (endpoint 4) reuses the row.

**Example (real request and response):**

```bash
curl -X DELETE "http://localhost:3000/api/v1/centers/2/stock/PIN-OP-03" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `409`:

```json
{
  "error": {
    "code": "STOCK_NOT_EMPTY",
    "message": "Linh kiện PIN-OP-03 còn 8 cái nên chưa ngừng dùng được. Xuất hết trước rồi thử lại.",
    "details": {
      "part_code": "PIN-OP-03",
      "quantity": 8
    }
  }
}
```

When the quantity is 0:

```bash
curl -X DELETE "http://localhost:3000/api/v1/centers/2/stock/MH-XM-03" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `204` with an empty body.


### 11. Read a ticket

1. **Method and path:** `GET /api/v1/tickets/{ticketCode}`
2. **What it does:** Looks up a repair ticket (read-only copy of flow L2) and says whether parts can be taken out for it. Used by the "Look up" button on screen 2.
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`). The ticket must belong to the token's center.
4. **Parameters and request body:** Path: `ticketCode` in the form `BH-000002/2025`. The `/` must be URL-encoded as `%2F`.
5. **Success response:** `200` with `ticket_code`, `status` (Vietnamese label such as `Đang xử lý`), `center_id`, `issue_desc`, `exportable` (`true` for `Đang xử lý` and `Chờ linh kiện`).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 400 | `VALIDATION_FAILED` | Wrong code format (`details[0].field` is `ticket_code`), or an undecodable path such as `%E0%A4%A`. |
| 404 | `NOT_FOUND` | No such ticket. |
| 403 | `FORBIDDEN` | The ticket belongs to another center (the message does not say which). |

7. **Notes and limits:** This system never changes a ticket; creating and updating tickets belongs to flow L2.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/BH-000002%2F2025" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "ticket_code": "BH-000002/2025",
  "status": "Đang xử lý",
  "center_id": 2,
  "issue_desc": "cảm ứng chỗ được chỗ không đã thử khởi động lại không được",
  "exportable": true
}
```

A ticket of another center (`BH-000057/2024` belongs to center 3):

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/BH-000057%2F2024" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `403`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền xem phiếu này.",
    "details": null
  }
}
```


### 12. Parts used on a ticket (EP8)

1. **Method and path:** `GET /api/v1/tickets/{ticketCode}/used-parts`
2. **What it does:** Lists the parts taken out for a ticket with line totals and the grand total.
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`). The ticket must belong to the token's center.
4. **Parameters and request body:** Path: `ticketCode` (`%2F` for `/`).
5. **Success response:** `200` with `ticket_code`, `items[]` (`transaction_id`, `transaction_date`, `part_code`, `part_name`, `quantity`, `unit_price`, `line_total`) and `total_amount`.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 400 | `VALIDATION_FAILED` | Wrong code format. |
| 404 | `NOT_FOUND` | No such ticket. |
| 403 | `FORBIDDEN` | The ticket belongs to another center. |

7. **Notes and limits:** A ticket with no parts returns `items: []` and `total_amount: 0`. `line_total = quantity × unit_price`, where `unit_price` is the **current** catalog price, in VND. Oldest entry first.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/tickets/BH-000002%2F2025/used-parts" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "ticket_code": "BH-000002/2025",
  "items": [
    {
      "transaction_id": 4952,
      "transaction_date": "2026-11-03",
      "part_code": "PIN-OP-03",
      "part_name": "Pin OPPO loại 3",
      "quantity": 2,
      "unit_price": 650000,
      "line_total": 1300000
    }
  ],
  "total_amount": 1300000
}
```


### 13. List catalog parts

1. **Method and path:** `GET /api/v1/parts`
2. **What it does:** Lists the parts of the shared catalog (active parts only).
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`).
4. **Parameters and request body:** Query, all optional: `q` (part code or name, up to 50 characters), `page` (integer 1 to 999999, default 1; 20 rows per page).
5. **Success response:** `200` with `query`, paging fields and `items[]` (`part_code`, `part_name`, `unit_price`).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 400 | `VALIDATION_FAILED` | Invalid `q` or `page`. |

7. **Notes and limits:** The catalog is shared by all centers; it holds no quantities.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/parts?q=pin" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "query": "pin",
  "page": 1,
  "page_size": 20,
  "total_items": 18,
  "total_pages": 1,
  "items": [
    {
      "part_code": "PIN-AP-01",
      "part_name": "Pin Apple loại 1",
      "unit_price": 650000
    },
    {
      "part_code": "PIN-AP-02",
      "part_name": "Pin Apple loại 2",
      "unit_price": 420000
    }
  ]
}
```

The `items` array is shortened to two entries here.


### 14. Read one catalog part

1. **Method and path:** `GET /api/v1/parts/{partCode}`
2. **What it does:** Returns one active catalog part.
3. **Authentication:** Bearer token; any role (`TECHNICIAN` or `MANAGER`).
4. **Parameters and request body:** Path: `partCode`.
5. **Success response:** `200` with `part_code`, `part_name`, `unit_price`.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 400 | `VALIDATION_FAILED` | Wrong code format. |
| 404 | `NOT_FOUND` | No active part with that code. |

7. **Notes and limits:** A retired part answers `404`.

**Example (real request and response):**

```bash
curl -X GET "http://localhost:3000/api/v1/parts/PIN-OP-03" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200`:

```json
{
  "part_code": "PIN-OP-03",
  "part_name": "Pin OPPO loại 3",
  "unit_price": 650000
}
```


### 15. Create a catalog part

1. **Method and path:** `POST /api/v1/parts`
2. **What it does:** Adds a part to the catalog. If the code was retired earlier, the same row is reused (name and price are replaced).
3. **Authentication:** Bearer token; role `MANAGER` only.
4. **Parameters and request body:** JSON body: `part_code` (`^[A-Z0-9-]{5,30}$`), `part_name` (1–120 characters after trimming, no NUL), `unit_price` (integer VND 0 to 999999999999).
5. **Success response:** `201` with the part (`part_code`, `part_name`, `unit_price`).
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`. |
| 400 | `VALIDATION_FAILED` | Invalid body. |
| 409 | `ALREADY_EXISTS` | The code is already in use by an active part. |

7. **Notes and limits:** The catalog is shared, so any manager of any center can change it (design decision TD-21, listed as a known limit).

**Example (real request and response):**

```bash
curl -X POST "http://localhost:3000/api/v1/parts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"part_code": "TEST-DOC-01", "part_name": "Linh kiện thử tài liệu", "unit_price": 150000}'
```

Response — `201`:

```json
{
  "part_code": "TEST-DOC-01",
  "part_name": "Linh kiện thử tài liệu",
  "unit_price": 150000
}
```

A technician cannot create parts:

```bash
curl -X POST "http://localhost:3000/api/v1/parts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"part_code": "TEST-DOC-02", "part_name": "x", "unit_price": 1}'
```

Response — `403`:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ quản lý trung tâm mới được sửa danh mục linh kiện.",
    "details": null
  }
}
```


### 16. Update a catalog part

1. **Method and path:** `PATCH /api/v1/parts/{partCode}`
2. **What it does:** Changes the name and/or the unit price of a part. The new price applies to the line totals of endpoint 12 from now on.
3. **Authentication:** Bearer token; role `MANAGER` only.
4. **Parameters and request body:** Path: `partCode`. JSON body with at least one of `part_name`, `unit_price`. `part_code` in the body is rejected: the code cannot change.
5. **Success response:** `200` with the updated part.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`. |
| 400 | `VALIDATION_FAILED` | Empty body, invalid value, or `part_code` present. |
| 404 | `NOT_FOUND` | No active part with that code. |

7. **Notes and limits:** Past ledger entries are not rewritten.

**Example (real request and response):**

```bash
curl -X PATCH "http://localhost:3000/api/v1/parts/TEST-DOC-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"unit_price": 175000}'
```

Response — `200`:

```json
{
  "part_code": "TEST-DOC-01",
  "part_name": "Linh kiện thử tài liệu",
  "unit_price": 175000
}
```


### 17. Retire a catalog part

1. **Method and path:** `DELETE /api/v1/parts/{partCode}`
2. **What it does:** Retires (soft-deletes) a part and all its stock rows. Allowed only when no center holds any quantity.
3. **Authentication:** Bearer token; role `MANAGER` only.
4. **Parameters and request body:** Path: `partCode`. No body.
5. **Success response:** `204` with an empty body.
6. **Errors:**

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing, malformed, expired or tampered token. |
| 403 | `FORBIDDEN` | Role is not `MANAGER`. |
| 400 | `VALIDATION_FAILED` | Wrong code format. |
| 404 | `NOT_FOUND` | No active part with that code. |
| 409 | `STOCK_NOT_EMPTY` | At least one center still holds quantity; `details.centers_with_stock` counts them. |

7. **Notes and limits:** Rule QT-13: the row stays with `is_active = false`, history is kept, and creating the same code again reuses it.

**Example (real request and response):**

```bash
curl -X DELETE "http://localhost:3000/api/v1/parts/TEST-DOC-01" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `204` with an empty body.


## Not implemented (not documented as endpoints)

Reporting a part shortage that moves a ticket to "Chờ linh kiện" (UC5, EP5) and the stock history list (UC8, EP7) are not built; see the BT2 report, section "Chưa xong".
