# Smart CRM – Quản lý kho linh kiện thay thế cho trung tâm bảo hành

**Sinh viên:** Trần Huỳnh Minh Tuấn – MSSV: 2374802010543
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán

Luồng nghiệp vụ **L5 – Kho linh kiện thay thế**: Kỹ thuật viên và quản lý trung tâm tra cứu, xuất và nhập linh kiện thay thế theo từng trung tâm bảo hành.

- **Bắt đầu:** Kỹ thuật viên/Quản lý trung tâm tra cứu tồn kho hoặc tìm kiếm linh kiện cần xuất/nhập.
- **Xử lý:** Xuất linh kiện cho phiếu bảo hành đang xử lý (kiểm tra đủ tồn kho) hoặc nhập kho khi linh kiện về; hệ thống tự động cập nhật số lượng tồn và phát cảnh báo khi tồn xuống dưới ngưỡng.
- **Kết thúc:** Giao dịch nhập/xuất được ghi nhận thành công và số lượng tồn (`quantity`) trong `part_stock` được cập nhật chính xác.

## 2. Phạm vi

**Làm:**
- Xem tồn kho linh kiện theo trung tâm (UC01)
- Tìm kiếm linh kiện theo mã hoặc tên (UC02)
- Xuất linh kiện cho phiếu bảo hành, kiểm tra ràng buộc không xuất vượt tồn (UC03)
- Nhập kho linh kiện (UC04)
- Cảnh báo linh kiện tồn dưới ngưỡng (UC05)
- Xem lịch sử giao dịch nhập/xuất của một linh kiện (UC06)

**Không làm:**
- Không quản lý nhà cung cấp, đơn đặt hàng (purchase order) hay quy trình mua linh kiện – chỉ ghi nhận nhập kho đã xảy ra.
- Không tự động sinh gợi ý đặt hàng bổ sung; chỉ dừng ở mức cảnh báo (UC05).
- Không quản lý vòng đời phiếu bảo hành (tiếp nhận, phân công, đổi trạng thái) – thuộc luồng L2/L4; L5 chỉ đọc `ticket_code` đã tồn tại.
- Không quản lý điều chuyển linh kiện giữa hai trung tâm (transfer) trong giai đoạn hiện tại.
- Không quản lý danh mục linh kiện mới (thêm/sửa/xóa `part`) ở mức đầy đủ – dữ liệu `part` dùng dữ liệu mẫu có sẵn, chỉ thao tác đọc.

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Design | Figma (UI), dbdiagram.io (ERD) |
| Frontend | ReactJS + Vite + TailwindCSS |
| Backend | Node.js (Express hoặc NestJS) + Prisma ORM |
| Database | PostgreSQL |
| Testing | Vitest + Supertest |
| API Docs | Swagger / OpenAPI |
| Containerization | Docker + docker-compose |
| Quản lý mã nguồn | Git + GitHub (Conventional Commits, nhánh main/dev/feature) |
| Công cụ hỗ trợ | Postman, VS Code, pgAdmin/DBeaver |

## 4. Cấu trúc thư mục

```
project-root/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed/              # seed từ parts.csv, part_stock.csv, part_transactions.csv...
│   ├── src/
│   │   ├── modules/
│   │   │   └── part/          # controller, service, dto cho UC01-UC06
│   │   ├── common/
│   │   └── main.ts
│   ├── test/                  # test case Vitest cho QT-09
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/              # màn hình tồn kho, xuất/nhập kho
│   │   ├── components/
│   │   └── services/           # gọi API backend
│   └── package.json
├── docs/
│   ├── use-cases.md
│   └── erd.png
├── docker-compose.yml
└── README.md
```

## 5. Hướng dẫn cài đặt & chạy

**Yêu cầu:** Node.js ≥ 18, PostgreSQL ≥ 14 (hoặc Docker), npm/pnpm.

```bash
# 1. Clone dự án
git clone <repo-url>
cd project-root

# 2. Cấu hình biến môi trường
cp backend/.env.example backend/.env
# chỉnh DATABASE_URL trỏ tới PostgreSQL của bạn

# 3. (Tuỳ chọn) Chạy PostgreSQL bằng Docker
docker-compose up -d db

# 4. Cài đặt & migrate backend
cd backend
npm install
npx prisma migrate dev
npx prisma db seed        # nạp dữ liệu mẫu (parts.csv, part_stock.csv...)
npm run start:dev

# 5. Cài đặt & chạy frontend (mở terminal khác)
cd frontend
npm install
npm run dev

# 6. Chạy test
cd backend
npm run test
```

- Backend mặc định chạy tại `http://localhost:3000`
- Frontend mặc định chạy tại `http://localhost:5173`
- Swagger API docs: `http://localhost:3000/api-docs`

## 6. Khai báo sử dụng công cụ AI

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude / ChatGPT | Hỗ trợ soạn thảo tài liệu đặc tả (mô tả luồng, user story, use case) từ ý tưởng ban đầu | Đối chiếu lại từng use case với case study gốc và dữ liệu mẫu (CSV) để đảm bảo đúng phạm vi, không bịa quy tắc nghiệp vụ |
| Claude / ChatGPT | Gợi ý cấu trúc bảng dữ liệu (`part`, `part_stock`, `part_transaction`) và ràng buộc khóa chính/khóa ngoại | Tự kiểm tra lại schema bằng cách chạy migration thực tế và test insert/update dữ liệu mẫu |
| Claude / ChatGPT | Hỗ trợ viết bộ khung test case cho QT-09 (xuất đủ tồn, xuất vượt tồn, tồn chạm ngưỡng) | Chạy thử `npm run test`, xem log kết quả và đọc lại từng assertion trước khi commit |

*(Ghi chú: cập nhật lại bảng này theo đúng công cụ và mức độ sử dụng thực tế của bạn trong quá trình làm bài.)*