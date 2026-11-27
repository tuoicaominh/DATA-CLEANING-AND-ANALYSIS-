# Swagger UI

FastAPI phục vụ [Swagger UI](http://127.0.0.1:8000/docs) và [OpenAPI JSON](http://127.0.0.1:8000/openapi.json) từ backend đang chạy. Thư mục này chứa hướng dẫn truy cập.

1. Khởi động backend theo [hướng dẫn Docker Compose](../../backend/README.md#chạy-api-và-cơ-sở-dữ-liệu).
2. Gọi `POST /api/auth/sign-in` trong Swagger để lấy `access_token`. Nếu chưa có tài khoản, dùng `POST /api/auth/register` trước.
3. Chọn **Authorize** và nhập access token. Với công cụ HTTP khác, gửi header `Authorization: Bearer <access_token>`.
4. Mở nhóm **Data analysis** để thử các endpoint chất lượng, thống kê và so sánh. Dùng ID job của tệp đã làm sạch.

Nếu Swagger thiếu route vừa cập nhật, chạy `docker compose up --build -d api` từ thư mục gốc rồi tải lại trang. Xem [danh mục và hợp đồng API](../README.md) để biết thêm tham số và mã phản hồi.
