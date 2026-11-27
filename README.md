# Data Cleaner

Data Cleaner là ứng dụng web để tải lên, làm sạch và phân tích dữ liệu CSV, XLS, XLSX và JSON. Giao diện dùng React và Vite. Backend dùng FastAPI và PostgreSQL, với kho tệp riêng cho dữ liệu nguồn và kết quả.

## Tính năng hiện tại

| Chức năng | Cách sử dụng |
| --- | --- |
| Tài khoản | Đăng ký, đăng nhập, khôi phục phiên, đổi mật khẩu và đăng xuất. |
| Bộ dữ liệu | Chọn hoặc kéo thả tệp nguồn, xem danh sách và xóa tệp sau khi xác nhận. Giới hạn 50 MiB mỗi tệp. |
| Kiểm tra tệp trùng | Backend so sánh SHA-256 trong phạm vi tài khoản. Nội dung giống hệt bị báo **Tệp đã tồn tại**, kể cả khi đổi tên. Khi tải nhiều tệp, giao diện tiếp tục với các tệp còn lại nếu gặp lỗi trùng. |
| Làm sạch dữ liệu | Chọn tệp và quy tắc xử lý giá trị thiếu, loại dòng trùng, chuẩn hóa khoảng trắng hoặc kiểm tra kiểu theo cột. Kết quả được lưu thành tệp riêng. Đầu vào XLS xuất kết quả dạng XLSX. |
| Tệp đã làm sạch | Xem tên tệp nguồn và thời điểm hoàn tất, tải xuống hoặc xóa riêng tệp kết quả. Xóa đầu ra giữ lại tệp nguồn và lịch sử xử lý. |
| Báo cáo chất lượng | Ở trang **Phân tích**, báo cáo nằm dưới bộ chọn tệp. Báo cáo tổng hợp giá trị thiếu, dòng trùng, khoảng trắng thừa và lỗi kiểu theo quy tắc đã áp dụng. |
| Bản ghi đáng ngờ | Mở từ danh sách tệp kết quả để xem vị trí trong tệp nguồn, loại vấn đề, lý do và giá trị gốc. Có thể chuyển trang và tải danh sách phát hiện ra Excel. |
| Thống kê từng cột | Xem số giá trị hợp lệ, giá trị thiếu và thống kê theo kiểu dữ liệu của tệp đã làm sạch. |
| Khám phá hai cột | Chọn hai cột của tệp đã làm sạch. Ứng dụng vẽ biểu đồ phân tán, trung bình theo nhóm, số dòng theo cặp, số mã khác nhau theo nhóm hoặc phân bố theo giờ tùy dữ liệu. |
| Chi tiết biểu đồ | Bấm vào một thanh, cột giờ hoặc chấm để xem giá trị cùng lời giải thích cách tính. Biểu đồ theo giờ cho phép chọn đếm dòng hoặc đếm giá trị khác nhau. |

Báo cáo chất lượng sử dụng **tệp nguồn trước khi làm sạch**. PostgreSQL lưu số liệu tổng hợp trong `quality_issues` và các phát hiện chi tiết trong `suspicious_records`. Với kết quả cũ, backend tạo báo cáo khi mở lần đầu nếu còn đọc được tệp nguồn.

Biểu đồ hai cột dùng **tệp đã làm sạch** và chỉ tính các dòng có đủ hai giá trị. Bảng `analysis_results` lưu thống kê từng cột theo lần xử lý. Dữ liệu biểu đồ hai cột được tính khi nhận yêu cầu so sánh.

## Chạy trên Windows

Cần Docker Desktop với Docker Compose, Node.js và npm tương thích với Vite. Chạy các lệnh sau từ thư mục gốc dự án.

### Khởi động backend và cơ sở dữ liệu

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Đặt `JWT_SECRET_KEY` riêng trong `.env`, sau đó chạy:

```powershell
docker compose up --build -d
docker compose ps
```

Docker Compose chờ PostgreSQL sẵn sàng trước khi chạy API. PostgreSQL được công bố ở cổng `5433` theo mặc định. API trong container kết nối qua service `db`.

### Khởi động frontend

```powershell
npm --prefix frontend ci
npm --prefix frontend run dev
```

- [Giao diện Data Cleaner](http://127.0.0.1:5173) hoặc địa chỉ Vite in ra nếu cổng mặc định đang được dùng.
- [Swagger UI](http://127.0.0.1:8000/docs) để gọi thử các endpoint.
- [OpenAPI JSON](http://127.0.0.1:8000/openapi.json) để xem route của backend đang chạy.
- [Health check](http://127.0.0.1:8000/api/health) để xác nhận API phản hồi.

Vite chuyển tiếp yêu cầu `/api` đến cổng `8000`. Khi Swagger vẫn hiện route cũ sau khi cập nhật mã nguồn, dựng lại API bằng `docker compose up --build -d api`. Nếu yêu cầu báo cáo trả `404 Not Found`, đối chiếu route báo cáo trong OpenAPI của backend đang chạy.

Dừng Vite bằng `Ctrl+C` và dừng container bằng `docker compose down`. Hai volume `postgres_data` và `uploaded_data` lưu cơ sở dữ liệu và nội dung tệp. Giữ `.env`, thông tin đăng nhập và dữ liệu người dùng ngoài Git.

## Luồng sử dụng

1. Đăng nhập, vào **Làm sạch tệp** và tải lên tệp nguồn.
2. Bấm **Làm sạch** cạnh tệp cần xử lý, chọn quy tắc rồi bấm **Bắt đầu làm sạch**.
3. Mở **Tệp đã làm sạch** để tải xuống, xem **Bản ghi đáng ngờ** hoặc mở **Chất lượng dữ liệu** trong **Phân tích**.
4. Trong **Phân tích**, chọn hai cột ở mục **Khám phá dữ liệu**. Bấm vào biểu đồ để xem chi tiết phần đã chọn.

Ví dụ, nếu Coffee và Bread được ghi trên hai dòng cùng mã giao dịch, chế độ **Đếm số dòng** tính hai dòng. Chế độ **Đếm giá trị TransactionNo khác nhau** tính một mã trong cùng khung giờ.

Nhóm **Data analysis** trong Swagger có ba endpoint dưới `/api/analysis/cleaned-files/{job_id}`.

- `GET /quality` trả báo cáo nguồn, bản ghi đáng ngờ phân trang hoặc tệp Excel khi dùng `format=xlsx`.
- `GET /statistics` trả danh sách cột và thống kê từng cột.
- `GET /comparison?x=...&y=...` trả dữ liệu biểu đồ cho hai ID cột đã chọn.

Các endpoint này dùng Bearer JWT và kiểm tra quyền sở hữu tệp. Xem [tài liệu API](api-docs/README.md).

## Cấu trúc dự án

| Đường dẫn | Nội dung |
| --- | --- |
| [`frontend/`](frontend/) | React và Vite. Các trang làm sạch, tệp kết quả, phân tích và xác thực. |
| [`backend/`](backend/) | FastAPI, SQLAlchemy, các route HTTP, mô hình dữ liệu và quy tắc xử lý. |
| [`api-docs/`](api-docs/) | Hướng dẫn, danh mục endpoint và đặc tả API. |
| [`backend/tests/`](backend/tests/) | Kịch bản kiểm thử backend. |
| [`tests/`](tests/README.md) | Lệnh kiểm thử tích hợp và các bước kiểm tra giao diện. |
| [`docs/`](docs/) | Đặc tả yêu cầu, Use Case, sơ đồ và báo cáo dự án. |
| [`scripts/`](scripts/) | Script tạo báo cáo và hỗ trợ dự án. |

## Kiểm tra và tài liệu

Chạy `npm --prefix frontend run build` sau khi cài phụ thuộc. Xem [hướng dẫn kiểm thử](tests/README.md) để chạy kiểm thử tích hợp backend và kiểm tra luồng từ tải tệp đến phân tích.

- [Hướng dẫn backend](backend/README.md)
- [Hướng dẫn frontend](frontend/README.md)
- [Mục lục tài liệu dự án](docs/README.md)

- [Đặc tả yêu cầu hệ thống](docs/requirements/Yeu-cau-he-thong-Data-Cleaner.md)
- [Đặc tả use case](docs/diagrams/Use-case-Data-Cleaner.md)
- [Sơ đồ Activity bằng Mermaid](docs/diagrams/So-do-activity.md)
- [Sơ đồ Sequence bằng Mermaid](docs/diagrams/So-do-sequence.md)
- [Báo cáo chức năng phân tích dữ liệu](docs/reports/Bao-cao-chuc-nang-phan-tich-du-lieu-2026-11-26.md)
- [Báo cáo tổng hợp cập nhật ngày 22/11/2026](docs/reports/Bao-cao-tong-hop-cap-nhat-Data-Cleaner-2026-11-22.docx)
