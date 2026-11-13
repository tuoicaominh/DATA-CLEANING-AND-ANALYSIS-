# Data Cleaning and Analysis

Ứng dụng web tải lên, làm sạch, phân tích và đánh giá chất lượng dữ liệu Excel,
CSV và JSON.

## Cấu trúc repository

```text
frontend/      # React + Vite: pages, modules, reusable components
backend/       # Python + FastAPI application and feature modules
database/      # Migrations, seeds, schema notes (đang được thiết lập)
api-docs/      # Đặc tả và tài liệu API
infrastructure/# Cấu hình Docker và triển khai
tests/         # Kiểm thử tích hợp toàn hệ thống
docs/          # Kiến trúc, yêu cầu, hướng dẫn và báo cáo dự án
scripts/       # Script tự động hóa và tạo báo cáo
.env.example   # Mẫu cấu hình môi trường
docker-compose.yaml  # PostgreSQL và FastAPI cho phát triển local
```

Trong frontend, mã nguồn hiện được chia theo `components/`, `pages/` và
`modules/`. Trong backend, package `app/` được giữ làm application package của
FastAPI; các module nghiệp vụ hiện nằm trong `app/modules/`.

## Chạy local trên Windows

### 1. Chạy PostgreSQL và API bằng Docker

Từ thư mục gốc, sao chép `.env.example` thành `.env` nếu chưa có. Sau đó chạy:

```powershell
docker compose up --build
```

Compose khởi động database và API; API chờ database healthy trước khi chạy.
Mở Swagger UI tại `http://127.0.0.1:8000/docs`. Đặc tả API và các endpoint
hiện có được mô tả trong [`api-docs/README.md`](api-docs/README.md).
Những lần sau có thể chạy `docker compose up`; thêm `--build` khi muốn dựng
lại image sau khi sửa backend hoặc dependencies.

### 2. Chạy FE

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định `http://127.0.0.1:5173`;
Vite proxy các request `/api` tới API trong Docker ở cổng 8000.

Dừng các dịch vụ bằng `Ctrl+C` hoặc chạy `docker compose down`. Không commit
`.env`, mật khẩu, file tải lên hoặc dữ liệu đã xử lý.
