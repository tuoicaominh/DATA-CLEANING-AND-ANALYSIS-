# Đặc tả yêu cầu hệ thống Data Cleaner

Ngày 26/11/2026

## 1. Mục tiêu và phạm vi

Data Cleaner là ứng dụng web giúp người dùng quản lý tệp dữ liệu, áp dụng quy tắc làm sạch, xem vấn đề chất lượng của tệp nguồn và khám phá dữ liệu trong tệp đã làm sạch. Người dùng có thể tải kết quả và xuất danh sách bản ghi đáng ngờ sang Excel.

| Tác nhân | Phạm vi sử dụng |
| --- | --- |
| Khách | Xem trang giới thiệu, mở biểu mẫu đăng nhập và đăng ký. Khi chọn tải tệp, hệ thống yêu cầu đăng nhập. |
| Người dùng đã đăng nhập | Quản lý tài khoản, tệp nguồn, lần xử lý, tệp kết quả và báo cáo của mình. |
| Ứng dụng gọi API | Sử dụng các API được công bố và gửi Bearer JWT khi truy cập tài nguyên được bảo vệ. |
| Người vận hành | Khởi động các dịch vụ, cấu hình cơ sở dữ liệu và kho tệp, kiểm tra phản hồi của API. |

## 2. Yêu cầu chức năng

### Tài khoản và phiên

| Mã | Yêu cầu |
| --- | --- |
| FR-01 | Hệ thống phải cho phép đăng ký bằng họ tên, email, mật khẩu và xác nhận mật khẩu. Email đã được đăng ký phải được báo để người dùng xử lý. |
| FR-02 | Hệ thống phải xác thực email và mật khẩu, cấp JWT cho tài khoản hợp lệ và mở Dashboard. Khi tải lại trang, giao diện phải kiểm tra token hiện có để khôi phục phiên. |
| FR-03 | Hệ thống phải cho phép xem thông tin tài khoản, đổi mật khẩu sau khi xác minh mật khẩu hiện tại và đăng xuất. Khi đăng xuất, giao diện phải xóa token của phiên và trở về trang khách. |

### Quản lý tệp nguồn

| Mã | Yêu cầu |
| --- | --- |
| FR-04 | Người dùng phải có thể chọn hoặc kéo thả tệp CSV, XLS, XLSX và JSON. Hệ thống phải kiểm tra định dạng, khả năng đọc và giới hạn 50 MiB mỗi tệp. |
| FR-05 | Hệ thống phải phát hiện tệp có nội dung trùng trong cùng tài khoản bằng SHA-256, kể cả khi tên tệp khác nhau. Khi tải nhiều tệp, lỗi trùng của một tệp phải được báo riêng và các tệp còn lại tiếp tục được gửi. |
| FR-06 | Hệ thống phải hiển thị danh sách tệp nguồn của người dùng. Sau khi đọc tệp, hệ thống phải lưu tên cột, kiểu suy luận, số giá trị thiếu và số giá trị phân biệt. API phải hỗ trợ tra cứu hồ sơ cột và tải nội dung nguồn theo quyền sở hữu. |
| FR-07 | Hệ thống phải yêu cầu xác nhận khi xóa tệp nguồn. Việc xóa phải bao gồm metadata, các lần xử lý và các kết quả gắn với tệp nguồn đó. |

### Làm sạch và quản lý tệp đầu ra

| Mã | Yêu cầu |
| --- | --- |
| FR-08 | Người dùng phải có thể chọn tệp nguồn và ít nhất một quy tắc. Các quy tắc gồm xử lý giá trị thiếu, loại dòng trùng, chuẩn hóa định dạng chuỗi và kiểm tra kiểu dữ liệu. |
| FR-09 | Khi bật kiểm tra kiểu, hệ thống phải gợi ý kiểu theo cột và cho phép sửa hoặc bỏ qua từng cột. Các kiểu cấu hình gồm VARCHAR, INTEGER, DECIMAL, DATE và BOOLEAN. Phát hiện sai kiểu phải chứa lý do để người dùng tra cứu. |
| FR-10 | Hệ thống phải tạo job cho mỗi lần làm sạch, ghi trạng thái, thao tác, số dòng bị tác động và lỗi nếu có. Khi hoàn tất, hệ thống phải lưu một tệp đầu ra riêng. Đầu vào XLS được xuất thành XLSX. |
| FR-11 | Người dùng phải có thể hủy chờ trên giao diện. Nếu backend đã nhận yêu cầu, job có thể tiếp tục xử lý. Khi nhận được kết quả, giao diện thử xóa job đã hủy và báo lỗi nếu không dọn được. |
| FR-12 | Hệ thống phải cho phép xem danh sách tệp đã làm sạch, tải đầu ra hoặc xóa riêng đầu ra sau khi xác nhận. Xóa đầu ra phải giữ tệp nguồn và lịch sử job. API phải hỗ trợ tra cứu lịch sử theo tệp và chi tiết theo job. |

### Báo cáo chất lượng và phân tích

| Mã | Yêu cầu |
| --- | --- |
| FR-13 | Hệ thống phải hiển thị báo cáo chất lượng của tệp nguồn trước khi làm sạch, gồm loại vấn đề, số lượng và tỷ lệ theo dữ liệu kiểm tra được. Khi chọn tệp trong trang Phân tích, báo cáo phải nằm dưới bộ chọn tệp. |
| FR-14 | Hệ thống phải cho phép xem bản ghi đáng ngờ theo trang và xuất toàn bộ phát hiện chi tiết của tệp kết quả ra Excel. Chi tiết phải nêu vị trí dòng nguồn, cột hoặc phạm vi dòng, giá trị gốc và lý do. Danh sách chi tiết và Excel loại các mục chỉ liên quan đến khoảng trắng. |
| FR-15 | Hệ thống phải cho phép chọn hai cột khác nhau của tệp đã làm sạch và thông báo số dòng có đủ giá trị ở cả hai cột. Khi không đủ cột hoặc không có dòng phù hợp, giao diện phải hiển thị trạng thái tương ứng. |
| FR-16 | Hệ thống phải chọn cách biểu diễn theo cặp cột. Hai cột số đo dùng biểu đồ phân tán. Một cột số đo và một cột nhóm dùng trung bình theo nhóm. Cột mã được nhận diện có thể dùng số mã khác nhau theo nhóm. Hai cột phân nhóm dùng số dòng theo cặp giá trị. |
| FR-17 | Khi nhận diện được một cột ngày giờ phù hợp, hệ thống phải gom dữ liệu theo giờ trong ngày và cho phép đổi giữa **Đếm số dòng** và **Đếm giá trị khác nhau**. Số dòng theo giờ có thể lọc theo một trong các giá trị phổ biến. |
| FR-18 | Khi bấm vào thanh, chấm hoặc cột giờ, giao diện phải hiển thị **Chi tiết phần đã chọn** và giải thích số liệu theo phép tính đang dùng. Khi đổi cặp cột, chi tiết của biểu đồ trước phải được đặt lại. |
| FR-19 | Hệ thống phải lưu thống kê từng cột theo job trong bảng `analysis_results`. Biểu đồ so sánh hai cột phải được tính từ nội dung tệp đầu ra khi nhận yêu cầu. |

## 3. Quy tắc và giới hạn

- Mật khẩu khi đăng ký hoặc đổi phải dài từ 12 đến 128 ký tự. Xác nhận phải khớp. Mật khẩu mới phải khác mật khẩu hiện tại.
- Quy tắc xử lý giá trị thiếu mặc định bỏ dòng có ô thiếu. Quy tắc loại trùng mặc định so toàn bộ cột và giữ lần xuất hiện đầu tiên. Quy tắc chuẩn hóa mặc định xử lý khoảng trắng. API có tùy chọn điền giá trị thiếu, chọn cột so trùng và chuyển kiểu chữ.
- Một giao dịch có thể có nhiều dòng mặt hàng dùng chung mã. Ví dụ, Coffee và Bread nằm trên hai dòng cùng mã thì được tính **2 dòng** hoặc **1 mã giao dịch**. Khi xem theo giờ, phép đếm gộp các ngày theo giờ ghi trong tệp.
- Báo cáo JSON mặc định trả 25 bản ghi đáng ngờ mỗi trang và cho phép tối đa 100. Excel xuất toàn bộ phát hiện chi tiết tương ứng với job.
- Biểu đồ phân tán hiển thị tối đa 500 điểm mẫu. Biểu đồ thanh xếp hạng hiển thị tối đa 10 nhóm hoặc cặp giá trị. Bộ lọc theo giờ cho phép xem riêng tối đa tám giá trị xuất hiện nhiều nhất.

## 4. Yêu cầu phi chức năng

| Mã | Yêu cầu |
| --- | --- |
| NFR-01 | **Bảo mật tài khoản.** Mật khẩu phải được băm trước khi lưu. API được bảo vệ phải kiểm tra JWT và tài khoản hoạt động. JWT có thời hạn mặc định 60 phút và có thể cấu hình. |
| NFR-02 | **Cách ly dữ liệu.** Các truy vấn và thao tác đối với tệp, job, đầu ra và báo cáo phải giới hạn theo tài khoản sở hữu. |
| NFR-03 | **Lưu trữ.** PostgreSQL lưu tài khoản, metadata, job, báo cáo và thống kê. Kho tệp lưu nội dung nguồn và nội dung đầu ra. Khi triển khai Docker Compose, dữ liệu phải được giữ trong các volume cấu hình cho PostgreSQL và kho tệp. |
| NFR-04 | **Khả năng sử dụng.** Giao diện phải hiển thị trạng thái tải, dữ liệu rỗng và lỗi ở những luồng tương ứng. Hành động xóa phải có xác nhận. Số liệu phân tích phải đi kèm nhãn hoặc lời giải thích đủ để hiểu đơn vị và cách tính. |
| NFR-05 | **Vận hành.** Hệ thống phải có endpoint `GET /api/health` để kiểm tra API phản hồi. Cấu hình kết nối cơ sở dữ liệu, khóa ký JWT và kho tệp phải có thể đặt theo môi trường triển khai. |

## 5. Môi trường triển khai

Frontend dùng React và Vite, chạy với Node.js và npm tương thích. Backend dùng FastAPI trên Python 3.12, SQLAlchemy, PostgreSQL 16 và kho tệp trên máy chủ. Cấu hình phát triển trên Windows dùng Docker Desktop và Docker Compose cho API và cơ sở dữ liệu. Theo cấu hình mặc định, Vite phục vụ giao diện ở cổng 5173, API ở cổng 8000 và PostgreSQL được ánh xạ ra cổng 5433. Xem [hướng dẫn chạy dự án](../../README.md).

## 6. Kịch bản nghiệm thu

| Kịch bản | Kết quả mong đợi |
| --- | --- |
| Đăng ký, đăng nhập, tải lại trang rồi đăng xuất | Tài khoản được tạo, Dashboard mở với phiên hợp lệ và đăng xuất đưa người dùng về trang khách. |
| Tải một tệp hợp lệ rồi tải lại cùng nội dung với tên khác | Tệp đầu tiên xuất hiện trong danh sách và lần tải thứ hai báo trùng. |
| Làm sạch một tệp có dòng thiếu hoặc trùng | Job hoàn tất, ghi số dòng bị tác động và cho phép tải tệp kết quả. |
| Mở báo cáo chất lượng, xem chi tiết và tải Excel | Báo cáo hiển thị số liệu của tệp nguồn. Có thể xem chi tiết theo trang và tải Excel khi có phát hiện. |
| Chọn ngày giờ và mã giao dịch có hai dòng cùng mã trong một giờ | Chế độ đếm dòng tính hai dòng. Chế độ đếm giá trị khác nhau tính một mã. Khi bấm cột giờ, khung chi tiết giải thích kết quả. |
| Dùng một tài khoản khác để truy cập tệp hoặc job đã tạo | API từ chối việc truy cập tài nguyên ngoài quyền sở hữu. |
| Xóa riêng một tệp đã làm sạch | Tệp đầu ra biến mất khỏi danh sách. Tệp nguồn và lịch sử job vẫn tra cứu được. |

## Tài liệu liên quan

- [Đặc tả Use Case](../diagrams/Use-case-Data-Cleaner.md)
- [Sơ đồ Activity](../diagrams/So-do-activity.md) và [sơ đồ Sequence](../diagrams/So-do-sequence.md)
- [Báo cáo chức năng phân tích](../reports/Bao-cao-chuc-nang-phan-tich-du-lieu-2026-11-26.md)
- [Tài liệu API](../../api-docs/README.md)
