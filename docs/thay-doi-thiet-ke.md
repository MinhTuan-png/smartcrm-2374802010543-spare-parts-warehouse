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
