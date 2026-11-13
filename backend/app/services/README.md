# Shared services

Nghiệp vụ thuộc riêng một module được đặt trong `app/modules/<module>/service.py`
(hiện tại là `authentication/service.py`). Chỉ đặt service ở đây khi nó dùng
chung giữa nhiều module hoặc tích hợp một dịch vụ bên ngoài.
