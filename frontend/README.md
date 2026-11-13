# Frontend

Giao diện dùng React và Vite, chạy trực tiếp trên máy phát triển. Docker không
cần thiết cho FE trong luồng hiện tại.

## Cấu trúc mã nguồn

```text
src/
├── assets/styles/         # Style nền tảng
├── components/common/     # Thành phần dùng lại như Icon
├── modules/               # Nghiệp vụ theo module
│   ├── authentication/    # Đăng nhập, đăng ký và style auth
│   └── dashboard/data/    # Dữ liệu dashboard hiện còn là demo
├── pages/dashboard/       # Trang dashboard
├── App.jsx                # Điều phối phiên và các màn hình
└── main.jsx               # Entry point React/Vite
```

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ và npm
- Repository đã được tải về máy
- FastAPI và PostgreSQL đang chạy để đăng nhập vào hệ thống

Các phiên bản Node.js tương thích được nêu trong [hướng dẫn Vite](https://vite.dev/guide/).

## Cài đặt và chạy local

Mở PowerShell tại thư mục `frontend`:

```powershell
npm install
npm run dev
```

Mở địa chỉ hiển thị trong terminal, mặc định là `http://127.0.0.1:5173`.
Vite dev server hiện chỉ bind vào loopback nên trang chỉ truy cập từ máy đang
chạy FE.

Trong terminal khác, khởi động PostgreSQL và FastAPI theo hướng dẫn ở
[`../backend/README.md`](../backend/README.md). Vite chuyển tiếp đường dẫn `/api`
tới `http://127.0.0.1:8000`, vì vậy không cần cấu hình CORS cho môi trường local.

## Đăng nhập

Màn hình đăng ký gửi `POST /api/auth/register` với họ tên, email, mật khẩu và
xác nhận mật khẩu. API kiểm tra schema, băm mật khẩu rồi ghi user vào bảng
`users` trong PostgreSQL. Sau khi tạo xong, FE đưa email về form đăng nhập.

Đăng nhập gửi `POST /api/auth/sign-in`; API trả JWT. FE lưu token trong
`sessionStorage`, sau đó xác minh phiên bằng `GET /api/auth/me` khi tải lại
trang. Nút đăng xuất xóa token và đưa người dùng về màn hình đăng nhập.

Tài khoản quản trị ban đầu cũng có thể được tạo bằng lệnh
`python -m app.modules.authentication.cli` trong `backend` sau khi PostgreSQL đã sẵn sàng.

## Build giao diện

Tạo bản build production để kiểm tra hoặc chuyển cho máy chủ static:

```powershell
npm run build
npm run preview
```

Build được ghi vào `dist/`. `npm run preview` chỉ phục vụ xem trước trên máy,
không phải máy chủ production. Để triển khai public, hãy phục vụ `dist/` qua
web server/hosting phù hợp và đổi cấu hình proxy/API cho môi trường đó.

## Lỗi thường gặp

- **`npm` không nhận diện:** cài Node.js LTS, mở terminal mới và kiểm tra
  `node --version` cùng `npm --version`.
- **Không đăng nhập được / không kết nối máy chủ:** xác nhận PostgreSQL đang
  healthy, FastAPI đang chạy ở cổng 8000 và đã tạo user trong PostgreSQL.
- **Cổng 5173 đang được dùng:** Vite sẽ báo cổng bận; đóng tiến trình đang giữ
  cổng hoặc đổi `server.port` trong `vite.config.js`.
- **Thư viện cài lỗi:** xóa `node_modules` rồi chạy lại `npm install`; giữ
  `package-lock.json` để mọi máy cài cùng dependency tree.
