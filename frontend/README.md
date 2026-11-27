# Frontend Data Cleaner

Giao diện dùng React 19 và Vite 7. Phần xác thực, lưu tệp, làm sạch và phân tích gọi FastAPI qua đường dẫn `/api`.

## Chạy trên Windows

Dùng Node.js 20.19 trở lên trong nhánh 20 hoặc Node.js 22.12 trở lên. Khởi động API và PostgreSQL theo [hướng dẫn backend](../backend/README.md). Từ thư mục `frontend/`, chạy các lệnh sau.

```powershell
npm ci
npm run dev
```

Mở địa chỉ Vite in ra, mặc định là [http://127.0.0.1:5173](http://127.0.0.1:5173). Dev server chỉ lắng nghe trên loopback. [vite.config.js](vite.config.js) chuyển tiếp `/api` tới `http://127.0.0.1:8000`.

## Màn hình và dữ liệu

| Mã nguồn | Chức năng |
| --- | --- |
| [src/App.jsx](src/App.jsx) | Điều phối trang khách, xác thực và phiên đăng nhập. |
| [src/modules/authentication/](src/modules/authentication/) | Đăng ký, đăng nhập và đổi mật khẩu. |
| [src/pages/dashboard/](src/pages/dashboard/) | Tải tệp nguồn, chọn cột, cấu hình quy tắc và chạy làm sạch. |
| [src/pages/cleaned-files/](src/pages/cleaned-files/) | Danh sách tệp kết quả, tải xuống, xóa và mở bản ghi đáng ngờ. |
| [src/pages/analysis/](src/pages/analysis/) | Báo cáo chất lượng, thống kê từng cột và biểu đồ so sánh hai cột. |
| [src/modules/dashboard/data/](src/modules/dashboard/data/) | Gọi API lưu trữ và chuyển tệp cũ từ IndexedDB lên máy chủ. |

Phiên đăng nhập lưu access token trong `sessionStorage`. Khi tải lại trang, giao diện xác minh token qua `GET /api/auth/me`. Đăng xuất xóa token. Với tệp cũ trong IndexedDB, giao diện chỉ xóa bản cục bộ sau khi máy chủ xác nhận lưu.

Giao diện nhận CSV, XLS, XLSX và JSON tối đa 50 MiB mỗi tệp. Nếu tải nhiều tệp và máy chủ báo một tệp trùng nội dung, giao diện tiếp tục xử lý các tệp còn lại.

## Build và xem trước

```powershell
npm run build
npm run preview
```

Vite ghi bản build vào `dist/`. Lệnh `preview` phục vụ xem bản build cục bộ. Khi triển khai, cấu hình máy chủ phục vụ `dist/` và chuyển tiếp đường dẫn `/api` đến backend.

Xem [hướng dẫn kiểm thử](../tests/README.md) để kiểm tra luồng từ tải tệp đến phân tích.
