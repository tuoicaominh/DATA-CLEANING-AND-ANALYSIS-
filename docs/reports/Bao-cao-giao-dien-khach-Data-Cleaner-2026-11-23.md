# Báo cáo cập nhật giao diện Data Cleaner cho khách chưa đăng nhập

**Ngày 23/11/2026**

Trước đợt cập nhật, ứng dụng mở form đăng nhập ngay khi người dùng chưa có phiên hợp lệ. Bản cập nhật bổ sung trang chủ công khai để khách xem các tính năng làm sạch dữ liệu, biết định dạng và dung lượng được hỗ trợ, rồi đăng nhập khi cần tải tệp.

## 1. Giao diện sau cập nhật

- Trang chủ dùng tông xanh biển, với logo bốn ô xanh bo góc và chữ **Data Cleaner** màu xanh đậm theo hình 1. Phần giới thiệu có tiêu đề **Làm sạch dữ liệu dễ dàng** và mô tả ngắn về Excel, JSON và CSV.
- Thanh điều hướng dùng tên **Làm sạch file** theo yêu cầu thay cho **Chuyển đổi file** trong ảnh tham chiếu. Menu xổ xuống hiển thị **Xử lý giá trị trống**, **Xử lý trùng dữ liệu**, **Kiểm tra kiểu dữ liệu theo cột** và **Chuẩn hóa khoảng trắng**. Đây là danh sách để khách xem trước khi đăng nhập.
- **Liên hệ với chúng tôi** được trình bày dưới dạng văn bản. Nút **Đăng nhập** trên thanh điều hướng mở form xác thực trực tiếp.
- Khu vực tải lên gồm hình minh họa tệp, nút **Tải lên tập tin của bạn**, hướng dẫn kéo thả và dòng thông tin hỗ trợ XLSX, JSON, CSV với dung lượng tối đa **50 MB**.
- **Trình chỉnh sửa file** được loại khỏi bố cục tham chiếu. Mục **Biểu mẫu** và ba tệp đơn hàng mẫu XLSX, CSV, JSON từng được triển khai, sau đó được gỡ theo yêu cầu.

## 2. Tệp tạo mới

### [GuestHome.jsx](../../frontend/src/pages/guest-home/GuestHome.jsx)

| Hàm hoặc thành phần | Vai trò và cách thực hiện |
| --- | --- |
| `GuestHome({ onSignIn })` | Tạo trang chủ khách, gồm thanh điều hướng, phần giới thiệu, khu vực tải lên và hộp thoại đăng nhập. Nhận callback `onSignIn` từ `App` để chuyển màn hình. |
| `requireSignIn()` | Dùng `signInDialog` từ `useRef(null)` để truy cập phần tử `<dialog>`. Nếu hộp thoại đang đóng, gọi `showModal()`. Nút tải tệp và thao tác thả tệp cùng dùng hàm này. |
| `handleDrop(event)` | Gọi `event.preventDefault()` để chặn hành vi mặc định của trình duyệt trong vùng tải. Kiểm tra `event.dataTransfer.files.length` và mở hộp thoại nếu có tệp được thả. |
| Callback `onDragOver` | Gọi `event.preventDefault()` để vùng tải nhận được sự kiện thả. |
| `CLEANING_OPTIONS.map(...)` | Đọc danh sách có sẵn từ `useDashboard.js`. Mỗi mục dùng `id` làm khóa React, `icon` để hiển thị biểu tượng và `label` làm tên tính năng. Menu dùng `<details>` và `<summary>`. |

Hộp thoại được gắn nhãn bằng `aria-labelledby` và `aria-describedby`. Nút **Đóng** dùng `<form method="dialog">`. Nút **Đăng nhập** gọi cùng callback với nút đăng nhập ở đầu trang. Trang khách chỉ kiểm tra thao tác có thả tệp để mở thông báo. Việc chọn tệp, kiểm tra dung lượng và tải lên thuộc luồng dashboard sau khi đăng nhập.

### [guest-home.css](../../frontend/src/pages/guest-home/guest-home.css)

| Nhóm CSS | Vai trò |
| --- | --- |
| `.guest-home`, `.guest-header`, `.guest-nav` | Định nghĩa bảng màu xanh biển, bố cục đầu trang và cho các nhóm điều hướng xuống dòng khi khung nhìn hẹp. |
| `.guest-dropdown` | Bố trí menu dưới nút mở, định dạng danh sách và xoay biểu tượng theo trạng thái đóng hoặc mở. |
| `.guest-hero`, `.guest-brand` | Căn giữa logo và nội dung giới thiệu. Biểu tượng bốn ô dùng lại lớp `.brand-mark` từ CSS toàn cục. |
| `.guest-upload`, nhóm `.guest-file-*` | Tạo vùng tải màu trắng với viền nét đứt và minh họa tệp xếp lớp. Định dạng nút tải, hướng dẫn kéo thả và dòng giới hạn dung lượng. |
| `.guest-dialog`, `.guest-dialog::backdrop`, `:focus-visible` | Định dạng hộp thoại, nền phủ và viền báo vị trí lấy nét khi điều hướng bằng bàn phím. |
| `@media (max-width: 520px)` | Giảm khoảng trống ở phần giới thiệu và khu vực tải lên trên màn hình nhỏ. |

## 3. Tệp chỉnh sửa

| Tệp | Hàm hoặc phần chỉnh sửa | Thay đổi |
| --- | --- | --- |
| [App.jsx](../../frontend/src/App.jsx) | `App()` | Import `GuestHome` và đặt giá trị ban đầu của `authMode` thành `'home'`. Sau khi kiểm tra phiên, người dùng chưa đăng nhập ở chế độ `home` sẽ thấy `GuestHome`. Callback `onSignIn` chuyển sang `'sign-in'`, còn `onBack` truyền cho `SignIn` chuyển về `'home'`. |
| [App.jsx](../../frontend/src/App.jsx) | `signOut()` | Xóa `access_token` trong `sessionStorage`, đặt `authMode` về `'home'` và xóa trạng thái `user`. |
| [SignIn.jsx](../../frontend/src/modules/authentication/SignIn.jsx) | `SignIn(...)` | Thêm prop `onBack` và chuyển prop này xuống `AuthLayout`. Hàm `handleSubmit(event)` tiếp tục dùng luồng xác thực hiện có, gọi `POST /api/auth/sign-in` và chuyển thông tin người dùng về `App` qua `onSignedIn` khi thành công. |
| [AuthLayout.jsx](../../frontend/src/modules/authentication/AuthLayout.jsx) | `AuthLayout(...)` | Thêm prop tùy chọn `onBack`. Khi có callback, layout hiển thị nút **Về trang chủ** phía trên form. Nút dùng `type="button"` và gọi callback khi bấm. |

Danh sách tính năng và hằng `MAX_FILE_SIZE = 50 * 1024 * 1024` có sẵn trong [useDashboard.js](../../frontend/src/pages/dashboard/useDashboard.js). Dòng **50 MB** trên trang khách cung cấp thông tin trước khi đăng nhập. Hàm `addFiles(fileList)` trên dashboard tiếp tục kiểm tra dung lượng khi người dùng thực sự chọn hoặc kéo thả tệp vào luồng tải.

## 4. Luồng sử dụng

1. Khi mở ứng dụng, `App()` đọc token trong `sessionStorage`. Nếu có token, ứng dụng dùng `GET /api/auth/me` để kiểm tra phiên. Phiên hợp lệ mở dashboard. Trường hợp thiếu token hoặc phiên không hợp lệ sẽ mở trang khách.
2. Khách có thể mở menu **Làm sạch file** để đọc danh sách tính năng. Bấm nút tải hoặc thả tệp vào vùng tải sẽ mở hộp thoại **Yêu cầu đăng nhập**.
3. Khách chọn **Đóng** để tiếp tục xem trang hoặc chọn **Đăng nhập** để mở form xác thực. Từ form, nút **Về trang chủ** đưa khách trở lại trang công khai.
4. Đăng nhập thành công sẽ mở dashboard. Khi đăng xuất, ứng dụng quay về trang khách.

## 5. Kiểm tra

- `npm.cmd --prefix frontend run build` đã chạy thành công sau khi xóa mục Biểu mẫu. Thư mục build không còn ba tệp `mau-don-hang.*`.
- `git diff --check` đã chạy thành công sau lần chỉnh giao diện cuối.
- Các thao tác mở menu, kéo thả, chuyển màn hình và hiển thị trên thiết bị nhỏ chưa được xác nhận bằng kiểm thử trực tiếp trên trình duyệt.
