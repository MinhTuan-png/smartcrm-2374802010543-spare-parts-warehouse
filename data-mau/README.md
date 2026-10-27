# Dữ liệu mẫu nhỏ (data-mau/)

Bản rút gọn của dataset môn học `CDTN1_Mekong Mobile_Dataset Smart CRM.zip`, đi kèm repo để người chấm
clone về là chạy được ngay (`docker compose up` tự nạp thư mục này), không phải tải dataset riêng.

| Tệp | Số dòng | Lấy thế nào |
|---|---|---|
| `service_centers.csv` | 6 | Đủ, giữ nguyên |
| `parts.csv` | 180 | Đủ, giữ nguyên |
| `part_stock.csv` | 717 | Đủ, giữ nguyên (tồn hiện tại) |
| `tickets_history.csv` | 360 | Mỗi trung tâm 60 phiếu: 25 Đang xử lý, 15 Chờ linh kiện, 10 Đã đóng, 5 Đã phân công, 5 Hoàn tất; luôn có `BH-000002/2025` (ví dụ trong README) |
| `part_transactions.csv` | 174 | Giao dịch XUAT của các phiếu trên và 20 giao dịch NHAP đầu tiên mỗi trung tâm |

`tickets_history.csv` chỉ giữ 4 cột seed cần (`ticket_code`, `center_id`, `status`, `issue_desc`):
bỏ mã khách hàng, số serial, kỹ thuật viên để không đưa thông tin không cần thiết vào repo công khai.

Dùng dataset đầy đủ: chép 5 tệp CSV vào `data/` (không commit) rồi
- chạy bằng Docker: đặt `LOCAL_DATA_DIR=./data` trong `.env`, chạy `docker compose down -v` rồi `docker compose up -d --build`;
- chạy trực tiếp bằng Node: `npm run seed` trong `src/backend` đọc `data/` theo mặc định (đổi bằng biến `DATA_DIR`).
