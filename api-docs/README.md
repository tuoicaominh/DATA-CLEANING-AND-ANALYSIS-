# Tài liệu API

API hiện được triển khai bằng FastAPI. Khi Compose đang chạy, mở:

- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI JSON do ứng dụng sinh: <http://127.0.0.1:8000/openapi.json>
- Health check: <http://127.0.0.1:8000/api/health>

## Chạy API bằng Docker Compose

Từ thư mục gốc, tạo `.env` từ `.env.example` nếu chưa có, sau đó chạy:

```powershell
docker compose up --build
```

Chờ log `data-cleaning-api` báo Uvicorn đang lắng nghe cổng 8000 rồi mở
Swagger UI. Những lần tiếp theo, nếu image đã được dựng và source không đổi,
có thể chạy `docker compose up`. Dừng các container bằng `Ctrl+C`; chạy nền
bằng `docker compose up -d` và dừng bằng `docker compose down`.

Compose chờ PostgreSQL healthy trước khi khởi động API. Trong container, API
kết nối database qua hostname `db`; từ máy phát triển, PostgreSQL vẫn được
publish tại cổng 5433.

## Endpoint hiện có

| Method | Path | Mục đích | Xác thực |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Kiểm tra API hoạt động | Không |
| `POST` | `/api/auth/register` | Tạo tài khoản | Không |
| `POST` | `/api/auth/sign-in` | Đăng nhập và nhận JWT | Không |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản đang đăng nhập | Bearer JWT |
| `GET` | `/api/files` | Liệt kê file và profile cơ bản | Bearer JWT |
| `PUT` | `/api/files/{client_uuid}?name={filename}` | Lưu file và profile cột (tối đa 50 MB) | Bearer JWT |
| `GET` | `/api/files/{file_id}/columns` | Xem profile cột | Bearer JWT |
| `GET` | `/api/files/{file_id}/content` | Tải nội dung file gốc | Bearer JWT |
| `DELETE` | `/api/files/{file_id}` | Xóa file, job và output liên quan | Bearer JWT |
| `POST` | `/api/files/{file_id}/processing-jobs` | Chạy job với nhiều action làm sạch | Bearer JWT |
| `GET` | `/api/files/{file_id}/processing-jobs` | Xem lịch sử xử lý file | Bearer JWT |
| `GET` | `/api/processing-jobs/{job_id}` | Xem trạng thái/kết quả job | Bearer JWT |
| `GET` | `/api/processing-jobs/{job_id}/output` | Tải file kết quả | Bearer JWT |

Các request và response schema cùng mã lỗi được mô tả trong
[`specifications/openapi.yaml`](specifications/openapi.yaml). Swagger UI trực
tiếp từ ứng dụng là nguồn phản ánh runtime hiện tại.

## Luồng xác thực

Đăng nhập thành công trả access token dạng JWT với `token_type: "bearer"`.
Trong Swagger, mở **Authorize** và nhập token (hoặc `Bearer <token>` nếu giao
diện yêu cầu scheme đầy đủ), sau đó gọi `GET /api/auth/me`.

Mật khẩu đăng ký yêu cầu từ 12 đến 128 ký tự; email phải hợp lệ; `full_name`
yêu cầu từ 2 đến 120 ký tự; mật khẩu xác nhận phải trùng mật khẩu. Upload gửi
raw request body với tên file ở query `name`; metadata nằm trong `data_files`,
profile cột trong `file_columns`, còn bytes được lưu trên volume API. Job lưu
trạng thái trong `processing_jobs`, action trong `cleaning_actions`, output
trong `output_files`. XLS đọc sheet đầu tiên; đầu ra từ XLS được xuất dạng XLSX.
