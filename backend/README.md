# Backend Data Cleaner

FastAPI cung cấp API xác thực, lưu tệp nguồn, làm sạch và phân tích dữ liệu. SQLAlchemy lưu metadata và kết quả phân tích trong PostgreSQL. Nội dung tệp nằm trong kho lưu trữ của API.

## Chạy API và cơ sở dữ liệu

Từ thư mục gốc, mở Docker Desktop và tạo `.env` nếu cần.

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Đặt `JWT_SECRET_KEY` riêng trong `.env`. Docker Compose dùng `POSTGRES_DB`, `POSTGRES_USER` và `POSTGRES_PASSWORD` để tạo URL kết nối qua `db:5432`. Cổng PostgreSQL trên máy phát triển mặc định là `5433`.

```powershell
docker compose up --build -d
docker compose ps
```

Compose chờ PostgreSQL sẵn sàng rồi khởi động API. Dùng [Swagger UI](http://127.0.0.1:8000/docs), [OpenAPI JSON](http://127.0.0.1:8000/openapi.json) và [health check](http://127.0.0.1:8000/api/health) để kiểm tra dịch vụ. Nếu đổi mật khẩu sau khi volume đã khởi tạo, cập nhật cả mật khẩu của role PostgreSQL.

## Chạy FastAPI trực tiếp trên Windows

Chạy `docker compose up -d db` từ thư mục gốc. Sửa `DATABASE_URL` trong `.env` để user, mật khẩu, cổng và tên cơ sở dữ liệu khớp với `POSTGRES_*`. Khi vừa sao chép `.env.example`, cần đồng bộ mật khẩu trong hai mục vì giá trị mẫu đang khác nhau.

Mở PowerShell tại `backend/` và dùng Python 3.12.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API mặc định lắng nghe tại `127.0.0.1:8000`. Backend đọc `../.env` từ thư mục làm việc `backend/`, và kho tệp mặc định là `backend/storage/`. Frontend dùng Vite để chuyển tiếp `/api` đến cổng `8000`.

## Cấu trúc

| Mã nguồn | Trách nhiệm |
| --- | --- |
| [app/api/](app/api/) | Route HTTP, controller xác thực và kiểm tra Bearer JWT. |
| [app/modules/authentication/](app/modules/authentication/) | Nghiệp vụ tài khoản và CLI tạo tài khoản. |
| [app/modules/processing/](app/modules/processing/) | Đọc dữ liệu, chạy job, đánh giá chất lượng và phân tích cột. |
| [app/repositories/](app/repositories/), [app/models/](app/models/) | Truy vấn và mô hình SQLAlchemy. |
| [app/validators/](app/validators/) | Schema Pydantic của API. |
| [app/db/](app/db/), [app/core/](app/core/) | Kết nối, chuyển dữ liệu cũ và cấu hình ứng dụng. |

Khi khởi động, API tạo bảng còn thiếu và chuyển các bản ghi tệp cũ từ `uploaded_files` sang `data_files`. Với Docker Compose, volume `postgres_data` lưu cơ sở dữ liệu và `uploaded_data` lưu nội dung tệp nguồn và tệp kết quả. Dừng các dịch vụ bằng `docker compose down` để giữ lại hai volume.

## Tạo tài khoản từ terminal

Khi API và PostgreSQL đã chạy, dùng `docker compose exec api python -m app.modules.authentication.cli` từ thư mục gốc. Nếu chạy backend trực tiếp, dùng `.\.venv\Scripts\python.exe -m app.modules.authentication.cli` trong `backend/`. CLI hỏi email, tên hiển thị và mật khẩu ít nhất 12 ký tự.

## Luồng xử lý tệp

- API nhận CSV, XLS, XLSX và JSON tối đa 50 MiB. Excel đọc sheet đầu tiên. Có thể gửi lại yêu cầu với cùng UUID, tên và nội dung tệp. Upload cùng nội dung với UUID khác bị từ chối trong phạm vi tài khoản.
- Job nhận 1–10 thao tác. `missing_values` xử lý ô trống, `remove_duplicates` xử lý dòng trùng, `normalize_format` chuẩn hóa khoảng trắng và `validate_types` kiểm tra kiểu theo quy tắc cột. API trả trạng thái cuối `COMPLETED` hoặc `FAILED` khi tạo job.
- Kết quả lưu riêng với tệp nguồn. Báo cáo chất lượng dựa trên dữ liệu nguồn. Thống kê từng cột và so sánh hai cột dùng dữ liệu đã làm sạch.

Danh mục endpoint, mã phản hồi và tham số nằm trong [tài liệu API](../api-docs/README.md). Hướng dẫn chạy các ca tích hợp nằm trong [README kiểm thử](../tests/README.md).
