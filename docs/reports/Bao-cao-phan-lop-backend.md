# Báo cáo chỉnh sửa cấu trúc Backend

## 1. Mục tiêu

Tổ chức lại backend FastAPI để phân biệt rõ phần tiếp nhận API, xử lý HTTP,
nghiệp vụ, truy vấn dữ liệu và mô hình dữ liệu. Cấu trúc mới giúp mỗi thành phần
có một trách nhiệm cụ thể, dễ tìm và dễ mở rộng khi bổ sung nghiệp vụ.

## 2. Cấu trúc trước khi chỉnh sửa

Phần lớn mã xác thực được đặt chung trong `backend/app/modules/auth/`:

- `router.py` khai báo endpoint và đồng thời xử lý lỗi HTTP.
- `service.py` xử lý đăng ký, đăng nhập và lấy người dùng hiện tại.
- `repository.py` truy vấn và ghi dữ liệu.
- `models.py` định nghĩa model SQLAlchemy.
- `schemas.py` định nghĩa dữ liệu request/response.
- `dependencies.py` xác thực Bearer token.
- `security.py` xử lý mật khẩu và JWT.

Cách đặt này khiến route và controller chưa được tách, đồng thời các lớp truy
cập dữ liệu, model và schema khó nhận biết qua vị trí thư mục.

## 3. Cấu trúc sau khi chỉnh sửa

```text
backend/app/
├── api/
│   ├── routes/
│   │   ├── auth.py
│   │   ├── health.py
│   │   └── __init__.py
│   ├── controllers/
│   │   └── auth_controller.py
│   └── middlewares/
│       └── authentication.py
├── modules/
│   └── authentication/
│       ├── service.py
│       └── cli.py
├── services/                 # Dành cho dịch vụ dùng chung giữa modules
├── repositories/
│   └── user_repository.py
├── models/
│   └── user.py
├── validators/
│   └── auth.py
├── utils/
│   └── security.py
├── core/
├── db/
└── main.py
```

## 4. Trách nhiệm của từng lớp

| Thành phần | Trách nhiệm |
| --- | --- |
| `api/routes/` | Khai báo URL, HTTP method, dependency và schema trả về. |
| `api/controllers/` | Điều phối request, gọi nghiệp vụ và chuyển lỗi nghiệp vụ thành mã lỗi HTTP. |
| `api/middlewares/` | Kiểm tra Bearer token và tải người dùng hiện tại. |
| `modules/authentication/service.py` | Quy tắc đăng ký, đăng nhập, chuẩn hóa email và kiểm tra trạng thái tài khoản. |
| `repositories/` | Truy vấn và ghi dữ liệu bằng SQLAlchemy. |
| `models/` | Định nghĩa entity SQLAlchemy ánh xạ bảng dữ liệu. |
| `validators/` | Kiểm tra dữ liệu đầu vào và định dạng response bằng Pydantic. |
| `utils/security.py` | Băm/xác minh mật khẩu và tạo access token. |
| `services/` | Vị trí dành cho dịch vụ dùng chung hoặc tích hợp ngoài khi có nhu cầu. |

Nghiệp vụ đặc thù được giữ trong module `authentication`; thư mục `services/`
dành cho phần thực sự dùng chung, tránh tạo thêm lớp trung gian không cần thiết.

## 5. Luồng xử lý API

### Đăng ký

`POST /api/auth/register` → route → controller → authentication service →
user repository → PostgreSQL.

Route nhận `RegisterRequest`. Service chuẩn hóa email, kiểm tra email trùng,
băm mật khẩu rồi gọi repository tạo user. Controller chuyển trường hợp email
đã tồn tại thành HTTP `409`; thành công trả user với HTTP `201`.

### Đăng nhập

`POST /api/auth/sign-in` → route → controller → authentication service →
user repository.

Service kiểm tra người dùng, trạng thái tài khoản và mật khẩu. Nếu hợp lệ,
service tạo access token; controller trả dữ liệu đăng nhập. Thông tin đăng
nhập không hợp lệ được trả về HTTP `401`.

### Xác thực phiên

`GET /api/auth/me` → route → authentication middleware → authentication
service → user repository.

Middleware giải mã Bearer token, lấy người dùng còn hoạt động và chuyển user
cho route để trả response.

### Kiểm tra tình trạng API

`GET /api/health` được khai báo riêng tại `api/routes/health.py` và được mount
cùng các route còn lại qua `api/routes/__init__.py`.

## 6. Thay đổi đường dẫn và tài liệu

- Chuyển router auth sang `app/api/routes/auth.py`; thêm route health riêng.
- Thêm `app/api/controllers/auth_controller.py` và chuyển phần ánh xạ lỗi HTTP
  khỏi router.
- Chuyển dependency xác thực sang `app/api/middlewares/authentication.py`.
- Chuyển service nghiệp vụ sang `app/modules/authentication/service.py`.
- Chuyển repository, model, schema và tiện ích bảo mật sang các thư mục riêng.
- Chuyển CLI tạo tài khoản sang `app/modules/authentication/cli.py`.
- Cập nhật `app/main.py` để mount router tổng hợp và nạp model SQLAlchemy.
- Cập nhật hướng dẫn backend và frontend theo đường dẫn CLI mới.

Các URL API hiện tại vẫn giữ nguyên: `/api/health`, `/api/auth/register`,
`/api/auth/sign-in` và `/api/auth/me`.

## 7. Phạm vi xác minh

Đã rà soát các tham chiếu mã nguồn để loại bỏ import từ package `app.modules.auth`
cũ. Chưa chạy build, khởi động API hoặc kiểm thử tích hợp trong lần chỉnh sửa
này.

## 8. Hướng mở rộng

- Bổ sung module nghiệp vụ mới trong `app/modules/`.
- Chỉ tạo service trong `app/services/` khi chức năng được dùng chung giữa các
  module hoặc cần tích hợp một dịch vụ ngoài.
- Bổ sung migration database để quản lý thay đổi schema thay cho việc chỉ tạo
  bảng tự động lúc khởi động.
- Bổ sung kiểm thử cho controller, service và repository trong `backend/tests/`.
