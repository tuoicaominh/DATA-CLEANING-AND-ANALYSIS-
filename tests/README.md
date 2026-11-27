# Kiểm thử Data Cleaner

Các kịch bản tự động hiện có nằm trong [backend/tests/](../backend/tests/), dùng Python `unittest` để gọi API HTTP và kiểm tra PostgreSQL. Hai thư mục `tests/unit/` và `tests/integration/` ở cấp dự án hiện là chỗ dành cho kịch bản chung.

## Kiểm thử tích hợp backend

Từ thư mục gốc dự án, chuẩn bị `.env` theo [hướng dẫn khởi động](../README.md#chạy-trên-windows) và chạy trên môi trường phát triển.

```powershell
docker compose up --build -d
docker compose exec api python -m unittest -v tests.test_change_password
docker compose exec api python -m unittest -v tests.test_file_api
```

- [test_change_password.py](../backend/tests/test_change_password.py) kiểm tra đổi mật khẩu, đăng nhập lại và từ chối yêu cầu không hợp lệ.
- [test_file_api.py](../backend/tests/test_file_api.py) kiểm tra tải tệp, quyền sở hữu, gửi lại yêu cầu và xóa. Ca `test_persistence_isolation_retry_and_delete` vẫn kiểm tra bảng `uploaded_files` và giả định API trả UUID cho `id`. Luồng hiện tại lưu metadata trong `data_files` và trả ID số.

## Kiểm tra luồng trên giao diện

1. Đăng nhập, tải một CSV hợp lệ rồi tải lại cùng nội dung với tên khác. Giao diện báo tệp đã tồn tại.
2. Chạy làm sạch, mở **Tệp đã làm sạch** và tải tệp kết quả.
3. Mở **Phân tích**, kiểm tra báo cáo chất lượng, thống kê từng cột và chọn hai cột để tạo biểu đồ. Bấm một điểm hoặc thanh để xem chi tiết.
4. Mở **Bản ghi đáng ngờ**, kiểm tra phân trang và tải Excel nếu có phát hiện. Xóa tệp kết quả và kiểm tra tệp nguồn còn trong **Làm sạch tệp**.

Chạy `npm --prefix frontend run build` từ thư mục gốc sau khi cài phụ thuộc bằng `npm --prefix frontend ci`.
