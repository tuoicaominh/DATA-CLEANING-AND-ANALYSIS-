# Data Cleaner

Data Cleaner là ứng dụng web để tải lên, làm sạch và kiểm tra chất lượng dữ liệu CSV, XLS, XLSX và JSON. Giao diện dùng React và Vite. Backend dùng FastAPI và PostgreSQL, với kho tệp riêng cho dữ liệu nguồn và kết quả.

## Tính năng hiện tại

| Chức năng | Cách sử dụng |
| --- | --- |
| Tài khoản | Đăng ký, đăng nhập, khôi phục phiên, đổi mật khẩu và đăng xuất. |
| Bộ dữ liệu | Chọn hoặc kéo thả tệp nguồn, xem danh sách và xóa tệp sau khi xác nhận. Giới hạn 50 MiB mỗi tệp. |
| Kiểm tra tệp trùng | Backend so sánh SHA-256 trong phạm vi tài khoản. Nội dung giống hệt bị báo **Tệp đã tồn tại**, kể cả khi đổi tên. Khi tải nhiều tệp, giao diện tiếp tục với các tệp còn lại nếu gặp lỗi trùng. |
| Làm sạch dữ liệu | Chọn tệp và một hoặc nhiều quy tắc để xử lý giá trị trống, loại dòng trùng hoặc chuẩn hóa khoảng trắng. Kết quả được lưu thành tệp riêng. Đầu vào XLS xuất kết quả dạng XLSX. |
| Tệp đã làm sạch | Xem tên tệp nguồn và thời điểm hoàn tất, tải xuống hoặc xóa riêng tệp kết quả. Xóa đầu ra giữ lại tệp nguồn và lịch sử xử lý. |
| Phân tích chất lượng | Chọn tệp trên trang **Phân tích** hoặc mở từ nút **Chất lượng dữ liệu**. Báo cáo tổng hợp dữ liệu thiếu, dòng trùng toàn bộ và khoảng trắng thừa theo số lượng và tỷ lệ. |
| Bản ghi đáng ngờ | Mở mục riêng dưới danh sách tệp kết quả. Xem vị trí trong tệp nguồn, loại vấn đề, lý do và giá trị gốc. Danh sách có phân trang và cho phép mở rộng giá trị dài. |

Báo cáo phân tích **tệp nguồn trước khi làm sạch**. `QUALITY_ISSUES` lưu tổng hợp và `SUSPICIOUS_RECORDS` lưu các phát hiện chi tiết về dòng trùng và khoảng trắng thừa. Với kết quả cũ, backend tạo báo cáo khi mở lần đầu nếu còn đọc được tệp nguồn.

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

API báo cáo hiện nằm trong nhóm **Data analysis** ở Swagger, tại `GET /api/analysis/cleaned-files/{job_id}/quality`. Các API quản lý tệp và job dùng Bearer JWT. Xem [tài liệu API](api-docs/README.md) để biết tham số, phản hồi và mã lỗi.

## Cấu trúc dự án

| Đường dẫn | Nội dung |
| --- | --- |
| [`frontend/`](frontend/) | React và Vite. Các trang làm sạch, tệp kết quả, phân tích và xác thực. |
| [`backend/`](backend/) | FastAPI, SQLAlchemy, các route HTTP, mô hình dữ liệu và quy tắc xử lý. |
| [`api-docs/`](api-docs/) | Hướng dẫn, danh mục endpoint và đặc tả API. |
| [`backend/tests/`](backend/tests/) | Kịch bản kiểm thử backend. |
| [`tests/`](tests/) | Hướng dẫn tổ chức kiểm thử toàn hệ thống. |
| [`docs/`](docs/) | Use case, sơ đồ và báo cáo dự án. |
| [`scripts/`](scripts/) | Script tạo báo cáo và hỗ trợ dự án. |

## Kiểm tra và tài liệu

Kiểm tra bản build frontend bằng `npm --prefix frontend run build`. Để kiểm tra luồng nghiệp vụ trên môi trường local, đăng nhập, tải cùng một tệp hai lần, chạy một job làm sạch rồi mở báo cáo từ trang kết quả.

- [Đặc tả use case](docs/diagrams/Use-case-Data-Cleaner.md)
- [Sơ đồ activity và sequence bằng Mermaid để chèn vào draw.io](docs/diagrams/So-do-activity-va-sequence.md)
- [Báo cáo tổng hợp cập nhật ngày 22/11/2026](docs/reports/Bao-cao-tong-hop-cap-nhat-Data-Cleaner-2026-11-22.docx)
