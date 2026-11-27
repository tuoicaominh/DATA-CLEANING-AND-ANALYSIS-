# Service dùng chung

Thư mục này dành cho logic dùng chung giữa nhiều module hoặc tích hợp dịch vụ bên ngoài. Các service nghiệp vụ hiện nằm cùng module tương ứng.

| Vị trí | Trách nhiệm |
| --- | --- |
| [modules/authentication/service.py](../modules/authentication/service.py) | Đăng ký, đăng nhập và đổi mật khẩu. |
| [modules/processing/service.py](../modules/processing/service.py) | Điều phối job làm sạch, lưu đầu ra và tạo báo cáo chất lượng. |
| [modules/processing/quality.py](../modules/processing/quality.py) | Tính số liệu chất lượng và lưu các phát hiện theo job. |
| [modules/processing/statistics.py](../modules/processing/statistics.py) | Tính thống kê từng cột và so sánh hai cột. |

Xem [README backend](../../README.md) để biết cấu trúc ứng dụng và cách chạy API.
