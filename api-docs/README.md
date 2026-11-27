# Tài liệu API Data Cleaner

FastAPI khai báo phiên bản `0.1.0` và công bố 20 thao tác dưới tiền tố `/api` trong OpenAPI runtime.

## Khởi động và tra cứu

Chuẩn bị `.env` theo [hướng dẫn backend](../backend/README.md). Từ thư mục gốc, chạy lệnh sau.

```powershell
docker compose up --build -d
```

- [Swagger UI](http://127.0.0.1:8000/docs) để gọi thử các API của backend đang chạy.
- [OpenAPI JSON trực tiếp](http://127.0.0.1:8000/openapi.json) để kiểm tra phiên bản đang phục vụ và danh sách route thực tế.
- [Health check](http://127.0.0.1:8000/api/health) trả về `{"status":"ok"}`.
- [Bản đặc tả YAML trong kho](specifications/openapi.yaml) là bản tham khảo của các API trước đây. Dùng OpenAPI JSON trực tiếp để tra cứu đầy đủ các route hiện tại.

Trong Swagger, dùng **Authorize** với access token từ `POST /api/auth/sign-in`. Khi gọi trực tiếp, gửi header `Authorization: Bearer <access_token>`. API được bảo vệ trả `401` nếu phiên thiếu, sai hoặc hết hạn.

## Danh mục API

### Sức khỏe và xác thực

| Method | Endpoint | Thành công | Xác thực | Chức năng |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | `200` | Công khai | Trả về trạng thái `ok` của API. |
| `POST` | `/api/auth/register` | `201` | Công khai | Tạo tài khoản từ email, họ tên, mật khẩu và mật khẩu xác nhận. |
| `POST` | `/api/auth/sign-in` | `200` | Công khai | Trả về `access_token`, `token_type` và `user`. |
| `GET` | `/api/auth/me` | `200` | JWT | Lấy ID, email và họ tên của tài khoản hiện tại. |
| `POST` | `/api/auth/change-password` | `200` | JWT | Đổi mật khẩu bằng `current_password`, `new_password` và `confirm_password`. |

### Tệp nguồn

| Method | Endpoint | Thành công | Xác thực | Chức năng |
| --- | --- | --- | --- | --- |
| `GET` | `/api/files` | `200` | JWT | Liệt kê tệp thuộc tài khoản hiện tại. |
| `PUT` | `/api/files/{client_id}` | `200` | JWT | Tải lên nội dung tệp dạng raw body. Truyền tên tệp qua query `name`. |
| `GET` | `/api/files/{file_id}/columns` | `200` | JWT | Lấy hồ sơ cột, gồm kiểu suy luận, số giá trị thiếu và số giá trị phân biệt. |
| `GET` | `/api/files/{file_id}/content` | `200` | JWT | Tải nội dung tệp gốc. |
| `DELETE` | `/api/files/{file_id}` | `204` | JWT | Xóa tệp nguồn và các job, kết quả liên quan. |

### Job làm sạch

| Method | Endpoint | Thành công | Xác thực | Chức năng |
| --- | --- | --- | --- | --- |
| `POST` | `/api/files/{file_id}/processing-jobs` | `201` | JWT | Chạy job với danh sách thao tác và trả về trạng thái cuối. |
| `GET` | `/api/files/{file_id}/processing-jobs` | `200` | JWT | Liệt kê lịch sử xử lý của một tệp nguồn. |
| `GET` | `/api/processing-jobs/{job_id}` | `200` | JWT | Lấy trạng thái, mốc thời gian, thao tác đã chạy và thông tin tệp kết quả. |
| `GET` | `/api/processing-jobs/{job_id}/output` | `200` | JWT | Tải tệp kết quả từ kho lưu trữ. |
| `DELETE` | `/api/processing-jobs/{job_id}` | `204` | JWT | Xóa job đã hoàn tất hoặc thất bại, cùng kết quả liên quan nếu có. |

### Tệp đã làm sạch và chất lượng dữ liệu

| Method | Endpoint | Thành công | Xác thực | Chức năng |
| --- | --- | --- | --- | --- |
| `GET` | `/api/cleaned-files` | `200` | JWT | Liệt kê tệp kết quả của các job đã hoàn tất. |
| `DELETE` | `/api/cleaned-files/{job_id}` | `204` | JWT | Xóa tệp kết quả. Tệp nguồn và lịch sử job được giữ lại. |

### Phân tích dữ liệu

| Method | Endpoint | Thành công | Xác thực | Chức năng |
| --- | --- | --- | --- | --- |
| `GET` | `/api/analysis/cleaned-files/{job_id}/quality` | `200` | JWT | Đọc báo cáo chất lượng hoặc xuất toàn bộ bản ghi đáng ngờ ra XLSX. |
| `GET` | `/api/analysis/cleaned-files/{job_id}/statistics` | `200` | JWT | Lấy thống kê và dữ liệu biểu đồ theo từng cột của tệp kết quả. |
| `GET` | `/api/analysis/cleaned-files/{job_id}/comparison` | `200` | JWT | So sánh hai ID cột khác nhau qua query `x` và `y`. |

## Luồng làm sạch và xem báo cáo

1. Gửi `PUT /api/files/{client_id}?name=Bakery.csv` với mã UUID do máy khách tạo và nội dung tệp trong raw body. Các định dạng hỗ trợ là CSV, XLS, XLSX và JSON, tối đa 50 MiB. API dùng `id` trả về làm `file_id` cho các bước tiếp theo.
2. Gửi `POST /api/files/{file_id}/processing-jobs` với 1–10 thao tác. Các loại được hỗ trợ gồm `missing_values`, `remove_duplicates`, `normalize_format` và `validate_types`. Ví dụ yêu cầu JSON sau loại bỏ dòng trùng.

   ```json
   {"actions":[{"type":"remove_duplicates","parameters":{}}]}
   ```

3. Đọc `status` của job. HTTP `201` xác nhận job đã được tạo, còn `status` cho biết kết quả `COMPLETED` hoặc `FAILED`. Khi hoàn tất, dùng `output_file.download_url` để tải tệp. Đầu vào XLS được xuất ra XLSX.
4. Dùng `job_id` từ `GET /api/cleaned-files` để xem báo cáo hoặc xóa riêng tệp kết quả.

### Hợp đồng API báo cáo

Trong giao diện, mở **Phân tích** và chọn tệp đã làm sạch. Swagger liệt kê API báo cáo trong nhóm **Data analysis**. Đường dẫn cũ `/api/cleaned-files/{job_id}/quality` vẫn hoạt động cho các tích hợp trước đây.

Ví dụ `GET /api/analysis/cleaned-files/42/quality?offset=0&limit=25`. `offset` mặc định 0 và phải không âm. `limit` mặc định 25, nhận từ 1 đến 100. Phân trang áp dụng cho `suspicious_records` trong phản hồi JSON. Dùng `format=xlsx` để tải toàn bộ các phát hiện hiển thị.

| Trường | Nội dung |
| --- | --- |
| `quality_issues` | Các vấn đề có số lượng lớn hơn 0. Mỗi mục có `id`, `column_name`, `issue_type`, `expected_type`, `issue_count` và `issue_rate` trong khoảng 0–1. |
| `suspicious_records` | Trang phát hiện chi tiết. Mỗi mục có `id`, `source_row_number`, `column_name`, `original_value`, `issue_type`, `expected_type` và `reason`. |
| `suspicious_total` | Tổng số phát hiện chi tiết trước phân trang. Một bản ghi nguồn có thể sinh nhiều phát hiện. |

Báo cáo phân tích dữ liệu nguồn trước khi làm sạch. Bảng `quality_issues` lưu số liệu về giá trị thiếu, dòng trùng, khoảng trắng thừa và lỗi kiểu khi có quy tắc kiểm tra kiểu. API ẩn phát hiện khoảng trắng thừa khỏi danh sách chi tiết và bản xuất Excel. Số thứ tự bản ghi bắt đầu từ 1 và bỏ qua tiêu đề. Kết quả cũ được tạo báo cáo lúc mở lần đầu nếu tệp nguồn còn đọc được.

### Thống kê và so sánh

- `statistics` trả về `columns`. Mỗi cột có `column_id`, `column_name`, `statistics`, `chart_type` và `chart_data`.
- `comparison?x=12&y=15` dùng hai `column_id` dương và khác nhau. Phép so sánh chỉ tính các dòng có đủ giá trị ở cả hai cột của tệp đã làm sạch.

### Tra cứu lỗi

- `400` có thể do tệp tải lên sai định dạng, nội dung rỗng hoặc mật khẩu hiện tại sai.
- `404` khi báo cáo không tìm thấy tệp kết quả của tài khoản. Nếu phản hồi chỉ có `{"detail":"Not Found"}`, kiểm tra API báo cáo trong `/openapi.json` của backend đang chạy để xác định route đã được nạp chưa.
- `409` có thể do tệp trùng nội dung trong cùng tài khoản, mã tải lên đã dùng cho nội dung khác, job chưa ở trạng thái cho phép hoặc tệp nguồn của kết quả cũ không đọc được để tạo báo cáo.
- `413` khi tệp tải lên vượt 50 MiB. `422` khi dữ liệu yêu cầu không qua kiểm tra.
- `204` khi xóa thành công hoặc khi tài nguyên cần xóa đã vắng mặt trong phạm vi tài khoản. Phản hồi không có body.

## Báo cáo Word

[Báo cáo API Data Cleaner ngày 22/11/2026](specifications/Bao-cao-API-Data-Cleaner-2026-11-22.docx)
