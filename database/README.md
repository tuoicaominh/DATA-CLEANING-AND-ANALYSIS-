# Database

PostgreSQL đang được khởi chạy qua `docker-compose.yaml`; cấu hình kết nối nằm
trong `.env`. Backend hiện tạo bảng SQLAlchemy khi khởi động, chưa có công cụ
migration hoặc seed riêng. Đặt migration, seed và schema SQL vào các thư mục
tương ứng khi bắt đầu quản lý thay đổi database theo phiên bản.
