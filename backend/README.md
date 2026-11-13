# API FastAPI

Ứng dụng FastAPI nằm trong `backend`. Docker Compose ở thư mục gốc chạy cả API
(Python 3.12) và PostgreSQL. FE React nằm tại `frontend` và gọi API qua Vite
proxy.

## Cấu trúc

```text
backend/
├── app/
│   ├── api/                  # HTTP routes, controllers và auth middleware
│   ├── modules/              # Xử lý nghiệp vụ theo module
│   │   └── authentication/   # Đăng ký, đăng nhập, quản lý phiên
│   ├── services/             # Tác vụ dùng chung giữa các module khi cần
│   ├── repositories/         # Truy vấn và ghi dữ liệu
│   ├── models/               # SQLAlchemy entities
│   ├── validators/           # Pydantic request/response schemas
│   ├── utils/                # JWT và xử lý mật khẩu
│   ├── core/                 # Cấu hình
│   ├── db/                   # SQLAlchemy Base, engine, session
│   └── main.py               # Khởi tạo FastAPI và mount route
├── requirements.txt
└── Dockerfile
```

Luồng request là `api/routes` → `api/controllers` →
`modules/authentication/service.py` → `repositories` → `models`/PostgreSQL.
Routes khai báo endpoint; controllers chuyển đổi dữ liệu HTTP và mã lỗi;
service xử lý quy tắc nghiệp vụ; repository truy vấn dữ liệu. Pydantic schemas
nằm trong `validators/`, còn middleware xác thực Bearer token nằm trong
`api/middlewares/`. Khi khởi động, API tạo bảng SQLAlchemy nếu chưa có.

## Yêu cầu và cấu hình

- Python 3.12
- Docker Desktop đang chạy
- File `.env` ở thư mục gốc, tạo từ `.env.example`

Trong `.env`, đồng bộ database, user và mật khẩu giữa `DATABASE_URL` với các
biến `POSTGRES_*`; đặt `JWT_SECRET_KEY` thành secret riêng. Khi chạy API trong
Docker Compose, cấu hình Compose tự ghi đè host database thành `db`. Không
commit `.env`.

## Chạy API và database bằng Docker Compose

Từ thư mục gốc, tạo `.env` từ `.env.example` nếu chưa có, sau đó chạy:

```powershell
docker compose up --build
```

Compose chờ service `db` hiển thị healthy rồi khởi động API. Mở Swagger UI tại
`http://127.0.0.1:8000/docs` hoặc OpenAPI JSON tại
`http://127.0.0.1:8000/openapi.json`. Những lần sau chạy `docker compose up`;
dùng `--build` khi cần dựng lại image. Có thể thêm `-d` để chạy nền.

## Chạy API trực tiếp (tùy chọn)

Nếu muốn phát triển backend ngoài Docker, trước hết khởi động PostgreSQL bằng
`docker compose up -d db`. Sau đó mở PowerShell tại `backend`:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API chạy tại `http://127.0.0.1:8000`. Swagger UI mở ở
`http://127.0.0.1:8000/docs`, OpenAPI JSON ở
`http://127.0.0.1:8000/openapi.json`.

## Kiểm tra đăng ký trên Swagger

1. Trong `/docs`, mở `POST /api/auth/register` và chọn **Try it out**.
2. Gửi body mẫu, dùng email riêng:

```json
{
  "email": "user@example.com",
  "full_name": "Nguyen Van A",
  "password": "a-long-local-password",
  "confirm_password": "a-long-local-password"
}
```

3. Đăng ký thành công trả `201`; email đã dùng trả `409`. Dùng email và mật
   khẩu đó với `POST /api/auth/sign-in` để nhận JWT.

Các route hiện có:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/sign-in`
- `GET /api/auth/me` — cần Bearer token

Tài khoản ban đầu có thể tạo bằng `python -m app.modules.authentication.cli`
trong thư mục `backend` sau khi PostgreSQL sẵn sàng. Mật khẩu yêu cầu tối
thiểu 12 ký tự.

## Kết nối FE

Vite cấu hình ở `frontend/vite.config.js` chuyển tiếp `/api` tới
`http://127.0.0.1:8000`. Chạy FE bằng `npm run dev` trong `frontend`; không cần
CORS riêng trong môi trường local.

## Dừng dịch vụ và lỗi thường gặp

Dừng các container bằng `Ctrl+C` hoặc `docker compose down` từ thư mục gốc.
Lệnh này giữ dữ liệu volume. Tránh `docker compose down -v` nếu không muốn
xóa database.

- Nếu API không khởi động, kiểm tra PostgreSQL healthy và `.env`.
- Nếu cổng `8000` bận, dùng `uvicorn app.main:app --reload --port 8001` và
  cập nhật proxy trong `frontend/vite.config.js`.
- Nếu đổi password sau khi volume đã khởi tạo, cần cập nhật password của role
  PostgreSQL; chỉ sửa `.env` không tự đổi password trong DB.
