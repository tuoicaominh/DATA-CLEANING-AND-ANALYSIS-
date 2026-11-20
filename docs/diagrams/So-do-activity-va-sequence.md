# Sơ đồ hoạt động và tuần tự của Data Cleaner

Các sơ đồ mô tả luồng hiện tại từ giao diện React đến FastAPI, PostgreSQL và kho tệp trên máy chủ. Mỗi mục có một sơ đồ **activity** dạng lưu đồ và một sơ đồ **sequence** mô tả thứ tự trao đổi. Mở tài liệu trong trình đọc Markdown hỗ trợ Mermaid để xem hình.

Các API yêu cầu đăng nhập kiểm tra Bearer JWT và tải tài khoản đang hoạt động. Khi xác thực thất bại, API trả HTTP 401. Các truy vấn tệp và job dùng ID người dùng để giới hạn dữ liệu theo chủ sở hữu.

## 1. Đăng ký

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Nhập tên, email, mật khẩu và xác nhận"]
    B --> C{"Dữ liệu hợp lệ?"}
    C -- Không --> D["Hiện lỗi nhập liệu"]
    C -- Có --> E{"Email đã được sử dụng?"}
    E -- Có --> D
    E -- Không --> F["Băm mật khẩu và lưu tài khoản"]
    F --> G["Quay về đăng nhập và điền sẵn email"]
    D --> B
    G --> H([Kết thúc])
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as React
    participant API as FastAPI
    participant S as Auth service
    participant DB as PostgreSQL
    U->>UI: Gửi biểu mẫu đăng ký
    UI->>API: POST /api/auth/register
    alt Payload không hợp lệ
        API-->>UI: 422
        UI-->>U: Hiện lỗi
    else Payload hợp lệ
        API->>S: Đăng ký tài khoản
        S->>DB: Tìm email đã chuẩn hóa
        alt Email đã tồn tại hoặc có xung đột duy nhất
            S-->>API: EmailAlreadyRegistered
            API-->>UI: 409
            UI-->>U: Báo email đã được sử dụng
        else Email còn trống
            S->>S: Băm mật khẩu
            S->>DB: Lưu tài khoản
            S-->>API: Thông tin tài khoản
            API-->>UI: 201 và thông tin tài khoản
            UI-->>U: Mở màn hình đăng nhập
        end
    end
```

## 2. Đăng nhập, khôi phục phiên và đăng xuất

```mermaid
flowchart TD
    A([Mở ứng dụng]) --> B{"Có token trong sessionStorage?"}
    B -- Có --> C["Kiểm tra phiên qua GET /me"]
    C -- Phiên hợp lệ --> H["Mở Dashboard"]
    C -- Lỗi --> D["Xóa token"]
    D --> E["Hiện màn hình đăng nhập"]
    B -- Không --> E
    E --> F{"Email và mật khẩu hợp lệ?"}
    F -- Không --> G["Hiện lỗi"]
    G --> E
    F -- Có --> I["Lưu JWT vào sessionStorage"]
    I --> H
    H --> J["Người dùng bấm đăng xuất"]
    J --> K["Xóa token và trạng thái người dùng"]
    K --> E
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as React
    participant SS as sessionStorage
    participant API as FastAPI
    participant DB as PostgreSQL
    U->>UI: Mở ứng dụng
    UI->>SS: Đọc access_token
    opt Có token
        UI->>API: GET /api/auth/me với Bearer JWT
        API->>DB: Tải tài khoản nếu JWT hợp lệ
        alt Phiên hợp lệ
            API-->>UI: 200 và thông tin tài khoản
        else Phiên không hợp lệ hoặc request lỗi
            UI->>SS: Xóa access_token
        end
    end
    opt Chưa xác thực
        U->>UI: Nhập email và mật khẩu
        UI->>API: POST /api/auth/sign-in
        API->>DB: Tìm tài khoản theo email
        alt Tài khoản hoạt động và mật khẩu đúng
            API-->>UI: 200 với JWT và người dùng
            UI->>SS: Lưu access_token
        else Thông tin xác thực sai
            API-->>UI: 401
            UI-->>U: Hiện lỗi và cho thử lại
        end
    end
    opt Đã xác thực
        UI-->>U: Hiện Dashboard
        U->>UI: Bấm đăng xuất
        UI->>SS: Xóa access_token
        UI-->>U: Hiện màn hình đăng nhập
    end
```

## 3. Đổi mật khẩu

```mermaid
flowchart TD
    A([Dashboard]) --> B["Mở hộp thoại tài khoản và nhập mật khẩu"]
    B --> C{"Mật khẩu mới hợp lệ và xác nhận khớp?"}
    C -- Không --> E["Hiện lỗi"]
    C -- Có --> D{"Phiên hợp lệ và mật khẩu hiện tại đúng?"}
    D -- Không --> E
    D -- Có --> F["Băm mật khẩu mới và cập nhật tài khoản"]
    F --> G["Thông báo đổi mật khẩu thành công"]
    E --> H([Dừng lần gửi])
    G --> H
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as React
    participant API as FastAPI
    participant S as Auth service
    participant DB as PostgreSQL
    U->>UI: Gửi mật khẩu hiện tại, mới và xác nhận
    UI->>API: POST /api/auth/change-password với Bearer JWT
    alt Phiên hoặc payload không hợp lệ
        API-->>UI: 401 hoặc 422
        UI-->>U: Hiện lỗi
    else Đầu vào hợp lệ
        API->>S: Đổi mật khẩu
        S->>DB: Đọc và khóa bản ghi người dùng
        S->>S: Kiểm tra mật khẩu hiện tại
        alt Mật khẩu hiện tại sai
            S-->>API: IncorrectCurrentPassword
            API-->>UI: 400
            UI-->>U: Hiện lỗi mật khẩu hiện tại
        else Mật khẩu hiện tại đúng
            S->>DB: Lưu mật khẩu mới đã băm và commit
            API-->>UI: 200
            UI-->>U: Báo thành công
        end
    end
```

## 4. Mở Dashboard và chuyển tệp cũ

```mermaid
flowchart TD
    A([Mở Dashboard]) --> B["Đọc các tệp cũ theo tài khoản từ IndexedDB"]
    B --> C{"Đọc thành công?"}
    C -- Không --> I["Ghi nhận cảnh báo"]
    C -- Có --> D{"Còn tệp cần chuyển?"}
    D -- Có --> E["Gửi tệp lên máy chủ với ID cũ"]
    E --> F{"Lưu trên máy chủ thành công?"}
    F -- Có --> G["Xóa bản cũ trong IndexedDB"]
    G -- Thành công --> D
    G -- Lỗi --> I
    F -- Không --> I
    D -- Không --> J["Lấy danh sách tệp từ máy chủ"]
    I --> J
    J -- Thành công --> K["Hiện danh sách và cảnh báo chuyển tệp nếu có"]
    J -- Lỗi --> L["Hiện lỗi tải danh sách"]
    K --> M([Kết thúc])
    L --> M
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant IDB as IndexedDB
    participant API as FastAPI
    participant DB as PostgreSQL
    U->>UI: Mở Dashboard
    UI->>IDB: Đọc tệp cũ theo tài khoản
    alt Lỗi đọc
        IDB-->>UI: Lỗi
        UI->>UI: Ghi nhận cảnh báo
    else Đọc được danh sách
        IDB-->>UI: Tệp cũ
        loop Từng tệp cho đến khi hết hoặc gặp lỗi
            UI->>API: PUT /api/files/{client_id}?name=...
            alt Máy chủ xác nhận đã lưu
                API-->>UI: 200 và metadata
                UI->>IDB: Xóa bản cũ
            else Upload thất bại
                API-->>UI: Lỗi
            end
        end
        Note over UI,IDB: Dừng chuyển khi lỗi upload hoặc lỗi xóa bản cũ
    end
    UI->>API: GET /api/files
    API->>DB: Lấy danh sách tệp theo user_id
    DB-->>API: Danh sách metadata
    API-->>UI: 200 và danh sách
    UI-->>U: Hiện tệp và cảnh báo nếu có
```

## 5. Tải tệp nguồn lên

```mermaid
flowchart TD
    A([Chọn hoặc kéo thả tệp]) --> B["Lọc CSV, XLS, XLSX, JSON có dữ liệu và tối đa 50 MB"]
    B --> C{"Có tệp hợp lệ?"}
    C -- Không --> D["Hiện lý do từ chối"]
    C -- Có --> E["Tạo UUID và gửi từng tệp"]
    E --> F["Kiểm tra đầu vào, ghi tệp tạm và tính SHA-256"]
    F -- Lỗi --> L["Hiện lỗi và thử tải lại danh sách"]
    F --> G{"Đã có client_id của tài khoản?"}
    G -- Có --> H{"Tên và SHA-256 khớp?"}
    H -- Không --> L
    H -- Có --> J["Trả metadata tệp sẵn có"]
    G -- Không --> I["Đọc dữ liệu, thống kê cột và lưu tệp cùng metadata READY"]
    I -- Thành công --> J
    I -- Lỗi --> L
    J --> K{"Còn tệp?"}
    K -- Có --> E
    K -- Không --> M["Cập nhật danh sách và báo kết quả"]
    D --> N([Kết thúc])
    L --> N
    M --> N
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant API as FastAPI
    participant FS as Kho tệp
    participant DB as PostgreSQL
    U->>UI: Chọn hoặc kéo thả tệp
    UI->>UI: Lọc định dạng và kích thước, tạo UUID
    loop Từng tệp được chấp nhận cho đến khi hết hoặc gặp lỗi
        UI->>API: PUT /api/files/{client_id}?name=... kèm dữ liệu nhị phân
        API->>FS: Ghi tệp tạm và tính SHA-256 khi đọc luồng
        API->>DB: Tìm theo user_id và client_id
        alt ID mới và cấu trúc tệp hợp lệ
            API->>FS: Đọc dữ liệu và chuyển vào kho uploads
            API->>DB: Lưu DataFile READY và FileColumn
            API-->>UI: 200 và metadata
        else ID cũ với tên và checksum trùng
            API-->>UI: 200 và metadata hiện có
        else ID cũ với nội dung khác hoặc tệp bị từ chối
            API-->>UI: 409, 400 hoặc 413 tùy lỗi
        end
    end
    alt Không có tệp hợp lệ
        UI-->>U: Hiện lý do từ chối
    else Có tệp hợp lệ và tất cả request thành công
        UI-->>U: Cập nhật danh sách và báo số tệp đã lưu
    else Có request thất bại
        UI-->>U: Hiện lỗi
        UI->>API: GET /api/files để đồng bộ lại
    end
```

## 6. Làm sạch dữ liệu

Dashboard gửi thao tác theo thứ tự chọn, với `parameters: {}`. Mặc định hệ thống bỏ dòng có giá trị trống, khử trùng theo toàn bộ cột và chuẩn hóa khoảng trắng trong chuỗi. Tổng số dòng trên thông báo là tổng `affected_rows` qua các thao tác, nên một dòng có thể được tính ở nhiều bước.

```mermaid
flowchart TD
    A([Chọn tệp và thao tác]) --> B["Bấm nút làm sạch"]
    B --> C{"Tệp thuộc tài khoản, READY và thao tác hợp lệ?"}
    C -- Không --> D["Trả lỗi API"]
    C -- Có --> E["Tạo job QUEUED rồi cập nhật RUNNING"]
    E --> F["Đọc tệp nguồn và tạo bản ghi thao tác"]
    F --> G["Áp dụng thao tác tiếp theo và lưu affected_rows"]
    G --> H{"Còn thao tác?"}
    H -- Có --> G
    H -- Không --> I["Ghi tệp đầu ra và tạo OutputFile"]
    I --> J["Cập nhật COMPLETED"]
    F -- Lỗi --> K["Rollback giao dịch đang mở, dọn tệp đầu ra nếu có"]
    G -- Lỗi --> K
    I -- Lỗi --> K
    K --> L["Lưu FAILED và thông báo lỗi"]
    J --> M["Dashboard hiện kết quả và nút tải"]
    L --> N["Dashboard hiện lỗi xử lý"]
    D --> N
    M --> O([Kết thúc])
    N --> O
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant API as FastAPI
    participant S as Processing service
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Chọn tệp và các thao tác rồi chạy
    UI->>API: POST /api/files/{file_id}/processing-jobs
    API->>DB: Kiểm tra chủ sở hữu và trạng thái READY
    alt File hoặc thao tác không hợp lệ
        API-->>UI: 404, 409 hoặc 422
        UI-->>U: Hiện lỗi
    else Yêu cầu hợp lệ
        API->>S: create_and_run_job
        S->>DB: Lưu QUEUED rồi lưu RUNNING
        S->>FS: Đọc tệp nguồn
        S->>DB: Đọc metadata cột và lưu CleaningAction
        loop Từng thao tác theo thứ tự yêu cầu khi chưa gặp lỗi
            S->>S: Áp dụng thao tác lên tập dòng hiện tại
            S->>DB: Cập nhật affected_rows và commit
        end
        alt Xử lý thành công
            S->>FS: Ghi tệp đầu ra, chuyển XLS thành XLSX nếu cần
            S->>DB: Lưu OutputFile và trạng thái COMPLETED
        else Lỗi đọc, xử lý hoặc ghi
            S->>DB: Rollback giao dịch đang mở
            S->>FS: Xóa tệp đầu ra nếu đã tạo
            S->>DB: Lưu trạng thái FAILED và thông báo lỗi
        end
        S-->>API: Kết quả job
        API-->>UI: 201 với trạng thái COMPLETED hoặc FAILED
        UI-->>U: Hiện kết quả hoặc lỗi xử lý
    end
```

Job được xử lý đồng bộ trong request. `QUEUED` và `RUNNING` là trạng thái được ghi vào cơ sở dữ liệu trong cùng luồng xử lý.

## 7. Tải tệp kết quả

```mermaid
flowchart TD
    A([Job COMPLETED]) --> B["Bấm Tải file kết quả"]
    B --> C{"Có OutputFile của job thuộc tài khoản?"}
    C -- Không --> F["Hiện lỗi tải tệp"]
    C -- Có --> D{"Tệp còn trong kho?"}
    D -- Không --> F
    D -- Có --> E["Nhận dữ liệu và lưu theo tên tệp tải xuống"]
    E --> G([Kết thúc])
    F --> G
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant API as FastAPI
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Bấm Tải file kết quả
    UI->>API: GET /api/processing-jobs/{job_id}/output
    API->>DB: Tìm OutputFile của job theo user_id
    opt Tìm thấy metadata đầu ra
        API->>FS: Kiểm tra tệp đầu ra
    end
    alt Có metadata và nội dung
        API-->>UI: 200 với nội dung tệp và Content-Disposition
        UI->>UI: Tạo URL từ Blob và kích hoạt tải xuống
        UI-->>U: Tải tệp
    else Thiếu metadata hoặc nội dung
        API-->>UI: 404
        UI-->>U: Hiện lỗi
    end
```

## 8. Xóa tệp

```mermaid
flowchart TD
    A([Chọn Xóa trên một tệp]) --> B{"Xác nhận xóa?"}
    B -- Hủy --> H([Kết thúc])
    B -- Xác nhận --> C{"Tìm thấy tệp thuộc tài khoản?"}
    C -- Có --> D["Lấy đường dẫn kết quả, xóa metadata và commit"]
    D --> E["Xóa tệp nguồn và các tệp kết quả khỏi kho"]
    C -- Không --> F["Trả HTTP 204"]
    E --> F
    F --> G["Bỏ tệp khỏi danh sách và bỏ chọn nếu đang làm sạch"]
    D -- Lỗi --> I["Hiện lỗi xóa"]
    E -- Lỗi --> I
    G --> H
    I --> H
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant API as FastAPI
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Bấm Xóa
    UI-->>U: Mở hộp thoại xác nhận
    alt Người dùng hủy
        UI->>UI: Đóng hộp thoại
    else Người dùng xác nhận
        UI->>API: DELETE /api/files/{file_id}
        API->>DB: Tìm DataFile theo file_id và user_id
        opt Tìm thấy tệp thuộc tài khoản
            API->>DB: Lấy đường dẫn đầu ra, xóa bản ghi và commit
            Note over DB: FK CASCADE xóa metadata cột, job, thao tác và đầu ra
            API->>FS: Xóa tệp nguồn và các tệp đầu ra
        end
        alt Request thành công
            API-->>UI: 204 kể cả khi tệp không tồn tại trong tài khoản
            UI-->>U: Cập nhật danh sách và báo đã xóa
        else Request lỗi
            API-->>UI: Lỗi
            UI-->>U: Hiện thông báo lỗi
        end
    end
```

## 9. Tra cứu tệp và lịch sử xử lý qua API

Các endpoint này có trong backend. Dashboard hiện tại dùng danh sách tệp, tạo job và tải kết quả trực tiếp từ job vừa chạy. Các truy vấn dưới đây mô tả thêm những thao tác có thể thực hiện qua API.

| Truy vấn | Endpoint |
| --- | --- |
| Metadata cột theo thứ tự | `GET /api/files/{file_id}/columns` |
| Nội dung tệp nguồn | `GET /api/files/{file_id}/content` |
| Lịch sử job của tệp, mới nhất trước | `GET /api/files/{file_id}/processing-jobs` |
| Chi tiết job, các thao tác và đầu ra nếu có | `GET /api/processing-jobs/{job_id}` |

```mermaid
flowchart TD
    A([Gửi yêu cầu tra cứu]) --> B{"Phiên hợp lệ?"}
    B -- Không --> C["Trả 401"]
    B -- Có --> D{"Tệp hoặc job thuộc tài khoản?"}
    D -- Không --> E["Trả 404"]
    D -- Có --> F{"Đang đọc nội dung tệp nguồn?"}
    F -- Không --> G["Trả metadata dạng JSON"]
    F -- Có --> H{"Có tệp thực trên kho?"}
    H -- Có --> I["Trả nội dung tệp"]
    H -- Không --> E
    C --> J([Kết thúc])
    E --> J
    G --> J
    I --> J
```

```mermaid
sequenceDiagram
    participant Client as Client API
    participant API as FastAPI
    participant DB as PostgreSQL
    participant FS as Kho tệp
    Client->>API: GET endpoint tra cứu với Bearer JWT
    alt Xác thực thất bại
        API-->>Client: 401
    else Xác thực thành công
        API->>DB: Tìm tệp hoặc job theo ID và user_id
        alt Không tìm thấy bản ghi thuộc tài khoản
            API-->>Client: 404
        else Tìm thấy bản ghi
            alt Yêu cầu nội dung tệp nguồn
                API->>FS: Kiểm tra tệp
                API-->>Client: 200 với nội dung tệp hoặc 404
            else Yêu cầu metadata
                API->>DB: Đọc metadata cột hoặc dữ liệu job liên quan
                API-->>Client: 200 với JSON
            end
        end
    end
```

## Mã nguồn đối chiếu

- [React App và phiên đăng nhập](../frontend/src/App.jsx)
- [Giao diện tài khoản](../frontend/src/modules/authentication)
- [Dashboard](../frontend/src/pages/dashboard/Dashboard.jsx)
- [Frontend client cho tệp và job](../frontend/src/modules/dashboard/data/serverFileStorage.js)
- [API và dịch vụ xác thực](../backend/app/api/routes/auth.py), [middleware](../backend/app/api/middlewares/authentication.py), [dịch vụ](../backend/app/modules/authentication/service.py)
- [API tệp](../backend/app/api/routes/files.py), [API job](../backend/app/api/routes/processing.py), [dịch vụ xử lý](../backend/app/modules/processing/service.py)
