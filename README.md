# Smart CRM – Quản lý kho linh kiện thay thế cho trung tâm bảo hành

**Sinh viên:** Trần Huỳnh Minh Tuấn – MSSV: 2374802010543
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán

Luồng nghiệp vụ **L5 – Kho linh kiện thay thế**: Kỹ thuật viên và quản lý trung tâm tra cứu, xuất và nhập linh kiện thay thế theo từng trung tâm bảo hành.

- **Bắt đầu:** Kỹ thuật viên/Quản lý trung tâm tra cứu tồn kho hoặc tìm kiếm linh kiện cần xuất/nhập.
- **Xử lý:** Xuất linh kiện cho phiếu bảo hành đang xử lý (kiểm tra đủ tồn kho) hoặc nhập kho khi linh kiện về; hệ thống tự động cập nhật số lượng tồn và phát cảnh báo khi tồn xuống dưới ngưỡng.
- **Kết thúc:** Giao dịch nhập/xuất được ghi nhận thành công và số lượng tồn (`quantity`) trong `part_stock` được cập nhật chính xác.

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

## 6. Khai báo sử dụng công cụ AI

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude / ChatGPT | Hỗ trợ soạn thảo tài liệu đặc tả (mô tả luồng, user story, use case) từ ý tưởng ban đầu | Đối chiếu lại từng use case với case study gốc và dữ liệu mẫu (CSV) để đảm bảo đúng phạm vi, không bịa quy tắc nghiệp vụ |
| Claude / ChatGPT | Gợi ý cấu trúc bảng dữ liệu (`part`, `part_stock`, `part_transaction`) và ràng buộc khóa chính/khóa ngoại | Tự kiểm tra lại schema bằng cách chạy migration thực tế và test insert/update dữ liệu mẫu |
| Claude / ChatGPT | Hỗ trợ viết bộ khung test case cho QT-09 (xuất đủ tồn, xuất vượt tồn, tồn chạm ngưỡng) | Chạy thử `npm run test`, xem log kết quả và đọc lại từng assertion trước khi commit |
<<<<<<< HEAD
=======


