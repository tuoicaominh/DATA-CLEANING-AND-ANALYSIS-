# Infrastructure

Docker Compose ở thư mục gốc khởi chạy PostgreSQL và API FastAPI cho phát triển
local. API được dựng từ `backend/Dockerfile`, chờ database healthy và publish
cổng 8000. Dùng `docker compose up --build` lần đầu hoặc sau khi sửa backend;
các lần tiếp theo dùng `docker compose up`.

Các cấu hình triển khai ngoài môi trường local có thể được đặt trong
`deployment/`.
