# SmartCRM – Hệ thống quản lý kho phụ tùng

## 1. Giới thiệu dự án

SmartCRM là dự án phục vụ việc quản lý kho phụ tùng thay thế cho trung tâm bảo hành. Phạm vi nghiệp vụ được mô tả trong tài liệu tập trung vào việc tra cứu tồn kho, nhập kho, xuất kho và cập nhật số lượng tồn.

Tài liệu phân tích và thiết kế của dự án nằm trong thư mục `docs/`, bao gồm đặc tả yêu cầu, sơ đồ Use Case, sơ đồ kiến trúc, sơ đồ ERD và wireframe.

## 2. Cấu trúc thư mục

```text
smartcrm-2374802010543-spare-parts-warehouse/
├── docs/
│   ├── export/
│   │   ├── architecture.png
│   │   ├── erd.png
│   │   ├── usecase.png
│   │   └── wireframes.png
│   ├── ai-declaration.md
│   ├── architecture.drawio
│   ├── erd.drawio
│   ├── srs.md
│   ├── use-case.drawio
│   └── wireframe.drawio
├── src/
│   ├── backend/
│   │   ├── .gitkeep
│   │   ├── index.js
│   │   ├── package-lock.json
│   │   └── package.json
│   └── frontend/
│       └── .gitkeep
├── tests/
│   └── .gitkeep
├── .env                         # Cấu hình môi trường cục bộ; không chia sẻ công khai
├── .env.example                 # Mẫu cấu hình môi trường
├── .gitignore
├── BT1_TranHuynhMinhTuan_2374802010543.pdf
└── README.md
```

### Ý nghĩa các thư mục và tệp chính

- `docs/`: lưu tài liệu phân tích, thiết kế và khai báo sử dụng AI.
- `docs/export/`: lưu các hình ảnh xuất ra từ sơ đồ để chèn vào tài liệu hoặc xem nhanh.
- `*.drawio`: các tệp sơ đồ có thể mở và chỉnh sửa bằng draw.io / diagrams.net.
- `docs/srs.md`: tài liệu đặc tả yêu cầu phần mềm (SRS).
- `src/backend/`: mã nguồn backend viết bằng Node.js; `index.js` là tệp đầu vào hiện có.
- `src/frontend/`: thư mục dành cho frontend. Hiện tại cấu trúc được cung cấp mới có `.gitkeep`.
- `tests/`: thư mục dành cho mã kiểm thử; hiện tại cấu trúc được cung cấp mới có `.gitkeep`.
- `.env.example`: mẫu các biến môi trường cần cấu hình.
- `.env`: cấu hình riêng trên máy cá nhân; không commit các giá trị bí mật lên GitHub.
- `BT1_...pdf`: bản PDF bài tập được lưu tại thư mục gốc.

> Lưu ý: `node_modules/` được tạo khi cài thư viện bằng npm. Thông thường không cần đưa thư mục này lên GitHub; nên bảo đảm `.gitignore` có quy tắc `node_modules/`.

## 3. Yêu cầu trước khi chạy

- Đã cài đặt [Node.js](https://nodejs.org/) (đi kèm npm).
- Đã tải hoặc clone repository về máy.
- Đã cấu hình các biến môi trường cần thiết dựa trên `.env.example` nếu backend có sử dụng chúng.

## 4. Hướng dẫn cài đặt và chạy backend

Mở Terminal tại thư mục gốc của dự án, sau đó thực hiện:

### Bước 1: Cài đặt thư viện

```powershell
cd src/backend
npm install
```

### Bước 2: Cấu hình môi trường

Quay lại thư mục gốc nếu cần và tạo tệp `.env` từ `.env.example`. Điền các giá trị phù hợp với môi trường chạy thực tế. Không đăng tải mật khẩu, token hoặc thông tin kết nối riêng tư lên GitHub.

Trên PowerShell, có thể sao chép tệp mẫu bằng lệnh sau tại thư mục gốc:

```powershell
Copy-Item .env.example .env
```

Nếu `.env` đã tồn tại, không cần ghi đè; hãy chỉnh sửa tệp hiện tại.

### Bước 3: Khởi chạy backend

Trong thư mục `src/backend`, kiểm tra các lệnh được khai báo trong phần `scripts` của `package.json`. Nếu đã có script `start`, chạy:

```powershell
npm start
```

Nếu chưa có script `start`, hãy dùng lệnh chạy được định nghĩa trong `package.json` hoặc kiểm tra nội dung `index.js` để xác định cách khởi chạy phù hợp. Không thể xác nhận lệnh khởi chạy chính xác nếu chưa kiểm tra cấu hình hiện tại.

## 5. Frontend và kiểm thử

- **Frontend:** `src/frontend/` hiện có tệp `.gitkeep` để giữ thư mục trong Git. Chỉ có thể hướng dẫn chạy frontend sau khi mã nguồn và cấu hình frontend được bổ sung.
- **Kiểm thử:** `tests/` hiện có tệp `.gitkeep`. Đặt các tệp kiểm thử tại đây khi triển khai kiểm thử. Lệnh chạy test phụ thuộc vào cấu hình thực tế trong `package.json`.

## 6. Tài liệu liên quan

| Nội dung | Tệp |
|---|---|
| Đặc tả yêu cầu phần mềm | [`docs/srs.md`](docs/srs.md) |
| Sơ đồ kiến trúc | [`docs/architecture.drawio`](docs/architecture.drawio) |
| Sơ đồ ERD | [`docs/erd.drawio`](docs/erd.drawio) |
| Sơ đồ Use Case | [`docs/use-case.drawio`](docs/use-case.drawio) |
| Wireframe | [`docs/wireframe.drawio`](docs/wireframe.drawio) |
| Khai báo sử dụng công cụ AI | [`docs/ai-declaration.md`](docs/ai-declaration.md) |
| Hình ảnh sơ đồ đã xuất | [`docs/export/`](docs/export/) |

## 7. Phụ lục – Khai báo sử dụng công cụ AI

### 7.1. Công cụ AI được sử dụng

| Công cụ AI | Dùng cho phần nào | Áp dụng ở phần nào | Em đã kiểm chứng / chỉnh sửa gì |
|---|---|---|---|
| Claude | Mục 1: Gợi ý bảng thuật ngữ, yêu cầu chức năng, yêu cầu phi chức năng, các bên liên quan, bảng quy tắc nghiệp vụ và kiểm tra mức độ đầy đủ của bảng truy vết yêu cầu. | Mục 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 | Tôi đã đối chiếu bảng thuật ngữ với file gốc, tài liệu tự học buổi 3 và lý thuyết buổi 3. Tôi kiểm tra các yêu cầu chức năng và phi chức năng có phù hợp với đề bài hay không, sau đó sửa các phần chưa đúng yêu cầu. |
| Claude | Mục 2: Tham khảo gợi ý sơ đồ Use Case và cách trình bày bảng đặc tả UC2, UC6. | Mục 2.1, 2.2 | Tôi đã đối chiếu với file gốc, tài liệu tự học buổi 4 và lý thuyết buổi 4; sửa các phần chưa đúng yêu cầu. |
| Claude | Mục 3: Gợi ý thiết kế kiến trúc và lập luận kiến trúc. | Mục 3 | Tôi đã đối chiếu với file gốc, tài liệu lý thuyết buổi 5 và tài liệu tự học buổi 5; sửa các phần chưa đúng yêu cầu. |
| Claude | Mục 4: Gợi ý sơ đồ ERD và trình bày phần SQL DDL. | Mục 4.1, 4.2 | Tôi đã đối chiếu với file gốc, tài liệu lý thuyết buổi 5 và tài liệu tự học buổi 5; sửa các phần chưa đúng yêu cầu. |
| Claude | Mục 5: Gợi ý wireframe 3 màn hình và đối chiếu các trường trên wireframe. | Mục 5.1 | Tôi đã đối chiếu với file gốc, tài liệu lý thuyết buổi 5 và tài liệu tự học buổi 5; sửa các phần chưa đúng yêu cầu. |

### 7.2. Các phần tự thực hiện, không sử dụng AI

| Công cụ AI | Công việc | Áp dụng ở phần nào | Kiểm chứng / chỉnh sửa |
|---|---|---|---|
| Không dùng | Tự đánh giá MoSCoW cho các Use Case. | Mục 1.2 – Các bên liên quan | Không áp dụng. |
| Không dùng | Tự vẽ sơ đồ Use Case. | Mục 2 | Không áp dụng. |
| Không dùng | Tự vẽ kiến trúc phân lớp của luồng L5. | Mục 3 | Không áp dụng. |
| Không dùng | Tự vẽ wireframe. | Mục 5 | Không áp dụng. |
| Không dùng | Tự vẽ sơ đồ ERD. | Mục 4.1 | Không áp dụng. |

