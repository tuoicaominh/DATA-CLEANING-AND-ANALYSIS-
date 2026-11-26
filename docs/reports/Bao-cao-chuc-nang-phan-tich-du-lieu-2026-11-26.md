# Báo cáo chức năng phân tích dữ liệu của Data Cleaner

Ngày 26/11/2026

## 1. Mục đích và bố cục

Trang **Phân tích** cho phép người dùng chọn một tệp đã làm sạch, chọn hai cột và quan sát mối liên hệ giữa chúng. Cột trái chứa phần chọn tệp và **Báo cáo chất lượng dữ liệu**. Cột phải chứa phần **Khám phá dữ liệu**, biểu đồ và khung **Chi tiết phần đã chọn**.

Báo cáo chất lượng mô tả các vấn đề được phát hiện trong tệp nguồn theo các quy tắc kiểm tra hiện tại. Biểu đồ sử dụng dữ liệu trong tệp đầu ra sau khi làm sạch. Hai phần giúp người dùng vừa xem tình trạng dữ liệu nguồn, vừa khám phá dữ liệu đầu ra.

## 2. Cách sử dụng

1. Mở trang **Phân tích** và chọn tệp ở mục **Tệp đã làm sạch**.
2. Chọn hai cột khác nhau. Ứng dụng chọn kiểu biểu đồ dựa trên dữ liệu và tên cột.
3. Nếu biểu đồ có trục thời gian theo giờ, chọn cách tính **Đếm số dòng** hoặc **Đếm giá trị khác nhau**. Khi đếm dòng, người dùng có thể xem toàn bộ dữ liệu hoặc lọc theo một giá trị phổ biến.
4. Bấm vào thanh, điểm hoặc cột giờ để xem số liệu và câu giải thích bên dưới biểu đồ.

## 3. Biểu đồ và cách đọc

| Hai cột được chọn | Biểu đồ hiển thị | Chi tiết khi bấm |
| --- | --- | --- |
| Hai cột số đo, chẳng hạn doanh thu và lợi nhuận | Biểu đồ phân tán. Mỗi điểm dùng hai giá trị lấy từ cùng một dòng. | Giá trị của hai cột và vị trí tương ứng trên hai trục. |
| Một cột số đo và một cột phân nhóm, chẳng hạn doanh thu và khu vực | Biểu đồ thanh so sánh giá trị trung bình giữa các nhóm. | Tên nhóm, giá trị trung bình và số dòng dùng để tính. |
| Hai cột phân nhóm, chẳng hạn sản phẩm và khu vực | Biểu đồ thanh đếm số dòng có cùng cặp giá trị. | Hai giá trị được chọn và số dòng có cặp đó. |
| Một cột mã được nhận diện, chẳng hạn `TransactionNo`, và một cột phân nhóm | Biểu đồ thanh đếm số mã khác nhau trong từng nhóm. | Tên nhóm, số mã khác nhau và số dòng của nhóm. |
| Một cột ngày giờ được nhận diện và một cột khác | Biểu đồ cột theo 24 khung giờ trong ngày. Có thể đếm dòng hoặc đếm giá trị khác nhau. | Khung giờ, bộ lọc đang áp dụng, số dòng và số giá trị khác nhau nếu chọn cách tính đó. |

Ứng dụng ghi rõ số dòng có đủ dữ liệu ở cả hai cột. Biểu đồ phân tán hiển thị tối đa 500 điểm mẫu. Các biểu đồ thanh xếp hạng hiển thị tối đa 10 nhóm hoặc cặp giá trị. Bộ lọc theo giờ cho phép xem riêng tối đa tám giá trị xuất hiện nhiều nhất. Khi chọn tất cả giá trị, số liệu theo giờ bao gồm toàn bộ các dòng đủ dữ liệu.

## 4. Ý nghĩa của số dòng qua ví dụ Bakery

Trong tệp `Bakery_cleaned.csv`, khi chọn `TransactionNo` và `DateTime`, biểu đồ gom các bản ghi vào từng khung giờ. Con số **341 dòng trong khung 17:00–18:00** trong giao diện mẫu nghĩa là có 341 bản ghi mặt hàng có thời điểm từ 17:00 đến trước 18:00, cộng dồn qua các ngày trong tệp.

Ví dụ, một giao dịch mua Coffee và Bread có thể được lưu thành hai dòng cùng mã giao dịch. Với **Đếm số dòng**, hai bản ghi này đóng góp **2 dòng**. Với **Đếm giá trị TransactionNo khác nhau**, chúng đóng góp **1 mã giao dịch** trong khung giờ đó. Ứng dụng đếm mã riêng trong từng khung giờ đang xem.

Nếu chọn `Items` và `TransactionNo`, biểu đồ đếm số giao dịch khác nhau theo từng mặt hàng. Khi bấm vào thanh Coffee, người dùng thấy cả số mã giao dịch có Coffee và số dòng ghi nhận Coffee. Hai con số có thể khác nhau nếu một mã xuất hiện trên nhiều dòng của cùng mặt hàng.

## 5. Xử lý dữ liệu và phạm vi lưu trữ

Backend kiểm tra quyền truy cập tệp thông qua tài khoản sở hữu và lần xử lý đã hoàn tất. API so sánh đọc hai cột từ tệp đã làm sạch, bỏ qua các dòng thiếu một trong hai giá trị và tính dữ liệu biểu đồ theo cặp cột. Khung chi tiết dùng kết quả đã tính để giải thích phép đếm hoặc phép tính trung bình.

Bảng PostgreSQL `analysis_results` lưu thống kê từng cột theo lần xử lý, gồm kiểu biểu đồ, số liệu thống kê và dữ liệu biểu đồ một cột. Dữ liệu so sánh hai cột được tính khi người dùng chọn cặp cột. Toàn bộ phép tính và nội dung giải thích được xử lý bằng logic của ứng dụng.

Việc phân loại mã dựa trên tên cột quen thuộc như `TransactionNo` hoặc `CustomerID`. Với tên cột đặc thù, kiểu biểu đồ có thể phụ thuộc vào cách ứng dụng nhận diện giá trị trong tệp.
