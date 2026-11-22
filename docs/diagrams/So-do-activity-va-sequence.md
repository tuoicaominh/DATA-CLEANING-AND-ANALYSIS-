# Sơ đồ hoạt động và tuần tự của Data Cleaner

Các sơ đồ mô tả luồng hiện tại từ giao diện React đến FastAPI, PostgreSQL và kho tệp trên máy chủ. Mỗi mục có một sơ đồ **activity** dạng lưu đồ và một sơ đồ **sequence** mô tả thứ tự trao đổi. Mở tài liệu trong trình đọc Markdown hỗ trợ Mermaid để xem hình.

Các API yêu cầu đăng nhập kiểm tra Bearer JWT và tải tài khoản đang hoạt động. Khi xác thực thất bại, API trả HTTP 401. Các truy vấn tệp và job dùng ID người dùng để giới hạn dữ liệu theo chủ sở hữu.

## Cách dán mã vào draw.io

1. Mở draw.io và chọn **Arrange → Insert → Mermaid** hoặc **+ → Mermaid**.
2. Sao chép nội dung của **một** khối mã, từ dòng `flowchart TD` hoặc `sequenceDiagram` đến hết khối. Bỏ dòng dấu rào Markdown ở đầu và cuối.
3. Dán vào hộp Mermaid và bấm **Insert**. Dùng **Diagram** để chỉnh các hình trên canvas hoặc **Image** để chèn dưới dạng SVG. Lặp lại từng khối trên các trang riêng nếu cần.

Trong activity, hình thoi là điểm ra quyết định và nhãn mũi tên là điều kiện chuyển bước. Trong sequence, đọc tương tác từ trên xuống. Mũi tên liền chỉ yêu cầu hoặc thao tác, mũi tên nét đứt chỉ phản hồi. `alt` diễn tả các nhánh loại trừ nhau, `opt` là bước có điều kiện và `loop` là bước lặp.

Đối chiếu [đặc tả use case](Use-case-Data-Cleaner.md) và [hướng dẫn Mermaid của draw.io](https://www.drawio.com/docs/manual/mermaid/).

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
    H -- Không --> Q
    H -- Có --> J["Trả metadata tệp sẵn có"]
    G -- Không --> P{"SHA-256 đã có trong tài khoản?"}
    P -- Có --> Q["Từ chối tệp trùng với HTTP 409"]
    Q --> K
    P -- Không --> I["Đọc dữ liệu, thống kê cột và lưu tệp cùng metadata READY"]
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
    loop Từng tệp hợp lệ cho đến khi hết hoặc gặp lỗi ngoài 409
        UI->>API: PUT /api/files/{client_id}?name=... kèm dữ liệu nhị phân
        API->>FS: Ghi tệp tạm và tính SHA-256 khi đọc luồng
        API->>DB: Khóa theo tài khoản và kiểm tra client_id, SHA-256
        alt ID mới, checksum chưa có và cấu trúc hợp lệ
            API->>FS: Đọc dữ liệu và chuyển vào kho uploads
            API->>DB: Lưu DataFile READY và FileColumn
            API-->>UI: 200 và metadata
        else ID cũ với tên và checksum trùng
            API-->>UI: 200 và metadata hiện có
        else Trùng nội dung hoặc xung đột mã tệp
            API-->>UI: 409 và lý do
            UI->>UI: Ghi nhận tệp bị từ chối và tiếp tục
        else Tệp sai định dạng, không đọc được hoặc quá lớn
            API-->>UI: 400 hoặc 413
        end
    end
    alt Không có tệp hợp lệ
        UI-->>U: Hiện lý do từ chối
    else Các request trả 200 hoặc 409
        UI-->>U: Báo số tệp đã lưu nếu có và tên tệp bị từ chối
    else Có lỗi khác
        UI-->>U: Hiện lỗi
        UI->>API: GET /api/files để đồng bộ lại
    end
```

## 6. Cấu hình và chạy làm sạch dữ liệu

Kiểm tra kiểu đọc dữ liệu nguồn để giữ số dòng gốc. Các thao tác biến đổi dữ liệu chạy theo thứ tự gửi lên. Job xử lý đồng bộ trong request. Giao diện chờ tối thiểu 15 giây nếu người dùng tiếp tục chờ.

```mermaid
flowchart TD
    start([Bắt đầu]) --> pick["Chọn tệp nguồn và quy tắc"]
    pick --> checkTypes{"Bật kiểm tra kiểu theo cột?"}
    checkTypes -->|Có| profile["Tải kiểu gợi ý theo tệp"]
    profile --> loaded{"Tải thành công?"}
    loaded -->|Không| retry["Hiện lỗi và cho thử lại"]
    retry --> profile
    loaded -->|Có| edit["Xem, đổi kiểu hoặc bỏ qua từng cột"]
    edit --> configured{"Có ít nhất một cột được kiểm tra?"}
    configured -->|Không| edit
    configured -->|Có| submit["Bấm Bắt đầu làm sạch"]
    checkTypes -->|Không| submit
    submit --> accepted{"Tệp và yêu cầu hợp lệ?"}
    accepted -->|Không| rejected["Hiện lỗi yêu cầu"]
    accepted -->|Có| running["Tạo job và đọc tệp nguồn"]
    running --> transform["Chạy các thao tác biến đổi đã chọn"]
    transform --> store["Ghi tệp kết quả"]
    store --> report["Tạo báo cáo từ tệp nguồn, kiểm tra kiểu nếu được chọn"]
    report --> completed["Lưu COMPLETED và hiển thị kết quả"]
    running -->|Lỗi| failed["Lưu FAILED và dọn đầu ra nếu có"]
    transform -->|Lỗi| failed
    store -->|Lỗi| failed
    report -->|Lỗi| failed
    rejected --> done([Kết thúc])
    completed --> done
    failed --> done
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Dashboard
    participant API as FastAPI
    participant S as Dịch vụ xử lý
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Chọn tệp và quy tắc
    opt Bật kiểm tra kiểu theo cột
        UI->>API: GET /api/files/{file_id}/columns?suggest_types=true
        API->>DB: Kiểm tra chủ sở hữu và đọc hồ sơ cột
        API->>FS: Đọc dữ liệu nguồn để gợi ý kiểu
        API-->>UI: Danh sách cột và kiểu gợi ý
        U->>UI: Giữ, đổi kiểu hoặc bỏ qua từng cột
    end
    U->>UI: Bấm Bắt đầu làm sạch
    UI->>API: POST /api/files/{file_id}/processing-jobs
    API->>DB: Kiểm tra chủ sở hữu và trạng thái READY
    alt Yêu cầu bị từ chối
        API-->>UI: 404, 409 hoặc 422
        UI-->>U: Hiện lỗi
    else Yêu cầu được tiếp nhận
        API->>S: Chạy job với các quy tắc và cấu hình kiểu đã gửi
        S->>DB: Tạo job QUEUED rồi lưu RUNNING
        S->>FS: Đọc tệp nguồn
        S->>S: Kiểm tra cấu hình kiểu và chạy các thao tác biến đổi
        alt Xử lý thành công
            S->>FS: Ghi tệp kết quả
            S->>S: Kiểm tra ô trong tệp nguồn theo kiểu đã chọn
            S->>DB: Lưu đầu ra, báo cáo và trạng thái COMPLETED
        else Lỗi khi chạy
            S->>FS: Dọn tệp đầu ra nếu đã tạo
            S->>DB: Lưu FAILED và lý do lỗi
        end
        S-->>API: Kết quả job
        API-->>UI: 201 với trạng thái COMPLETED hoặc FAILED
        alt Người dùng tiếp tục chờ
            UI-->>U: Hiện kết quả hoặc lỗi
        else Người dùng đã bấm Hủy
            UI->>API: DELETE /api/processing-jobs/{job_id}
            API-->>UI: 204 nếu dọn job và đầu ra thành công
        end
    end
```

Bấm Hủy đưa người dùng về trang làm sạch ngay. Request có thể tiếp tục chạy. Giao diện thử dọn job sau khi nhận được phản hồi có ID.

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

## 10. Xem danh sách và xóa riêng tệp kết quả

Activity mô tả ba lựa chọn sau khi đã mở danh sách, gồm tải xuống, mở báo cáo và xóa. Sequence tập trung vào tải danh sách và xác nhận xóa. Nếu đầu ra đã vắng mặt trong phạm vi tài khoản, lệnh xóa vẫn trả `204`. Tệp nguồn và job tiếp tục tồn tại.

```mermaid
flowchart TD
    A([Mở Tệp đã làm sạch]) --> B["Tải đầu ra của job hoàn tất"]
    B --> C{"Tải danh sách thành công?"}
    C -- Không --> D["Hiện lỗi và nút Thử lại"]
    D --> B
    C -- Có --> E{"Có tệp kết quả?"}
    E -- Không --> F["Hiện danh sách rỗng"]
    E -- Có --> G{"Chọn thao tác"}
    G -- Tải xuống --> H["Tải đầu ra theo job ID"]
    G -- Báo cáo --> I["Mở Phân tích hoặc Bản ghi đáng ngờ"]
    G -- Xóa --> J{"Xác nhận xóa?"}
    J -- Không --> G
    J -- Có --> K["Gửi yêu cầu xóa đầu ra"]
    K -- Thành công --> N["Bỏ tệp khỏi danh sách và hiện thông báo tự ẩn"]
    N --> M
    K -- Lỗi --> L["Giữ danh sách và hiện lỗi"]
    L --> G
    F --> M([Kết thúc])
    H --> M
    I --> M
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Tệp đã làm sạch
    participant API as FastAPI
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Mở danh sách
    UI->>API: GET /api/cleaned-files
    API->>DB: Lấy đầu ra từ job COMPLETED của tài khoản
    DB-->>API: Tệp kết quả và tên tệp nguồn
    API-->>UI: 200 và danh sách
    opt Người dùng xác nhận xóa
        U->>UI: Xóa tệp kết quả
        UI->>API: DELETE /api/cleaned-files/{job_id}
        API->>DB: Khóa job thuộc tài khoản và tìm đầu ra
        opt Có đầu ra hợp lệ
            API->>FS: Xóa nội dung tệp kết quả
            API->>DB: Xóa OutputFile và commit
        end
        API-->>UI: 204 nếu hoàn tất hoặc đầu ra đã vắng mặt
        UI-->>U: Cập nhật danh sách và hiện thông báo tự ẩn sau 2 giây
    end
```

## 11. Xem chất lượng dữ liệu và tải bản ghi đáng ngờ

Trang Phân tích hiển thị tổng hợp. Mục Bản ghi đáng ngờ hiển thị các phát hiện chi tiết theo trang. Tệp Excel chứa toàn bộ phát hiện chi tiết của job. Danh sách, tổng số và tệp Excel đều bỏ các mục chỉ liên quan đến khoảng trắng. Báo cáo dùng dữ liệu nguồn trước khi làm sạch.

```mermaid
flowchart TD
    start([Chọn tệp kết quả]) --> openReport["Mở Chất lượng dữ liệu hoặc Bản ghi đáng ngờ"]
    openReport --> loadPage["Tải báo cáo JSON"]
    loadPage --> success{"Có phản hồi hợp lệ?"}
    success -->|Không| retry["Hiện lỗi và cho thử lại"]
    retry --> loadPage
    success -->|Có| mode{"Đang xem mục nào?"}
    mode -->|Chất lượng dữ liệu| summary["Hiện tổng hợp theo vấn đề và cột"]
    mode -->|Bản ghi đáng ngờ| findings{"Có phát hiện chi tiết?"}
    findings -->|Không| empty["Hiện trạng thái rỗng"]
    findings -->|Có| detail["Hiện dòng nguồn, cột, kiểu yêu cầu, lý do và giá trị gốc"]
    detail -->|Chuyển trang| loadPage
    detail -->|Tải Excel| download["Yêu cầu xuất toàn bộ phát hiện"]
    download --> valid{"Phản hồi có định dạng XLSX hợp lệ?"}
    valid -->|Có| save["Lưu tệp Excel"]
    valid -->|Không| error["Hiện lỗi tải tệp"]
    error --> detail
    summary --> done([Kết thúc])
    empty --> done
    save --> done
```

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as Giao diện React
    participant API as API phân tích
    participant DB as PostgreSQL
    participant FS as Kho tệp
    U->>UI: Mở báo cáo, chuyển trang hoặc bấm tải Excel
    UI->>API: GET /api/analysis/cleaned-files/{job_id}/quality
    API->>DB: Kiểm tra đầu ra theo chủ sở hữu và khóa job
    alt Không tìm thấy đầu ra
        API-->>UI: 404
        UI-->>U: Hiện lỗi
    else Có đầu ra
        API->>DB: Đọc báo cáo đã lưu
        opt Job cũ chưa có báo cáo
            API->>FS: Đọc tệp nguồn
            alt Đọc được tệp
                API->>DB: Tạo báo cáo chất lượng
            else Không đọc được tệp
                API-->>UI: 409
                UI-->>U: Hiện lỗi
            end
        end
        opt Có báo cáo để trả
            alt Xem JSON với offset và limit
                API->>DB: Đếm phát hiện và đọc trang, bỏ lỗi khoảng trắng
                API-->>UI: Tổng hợp, trang chi tiết và tổng số
                UI-->>U: Hiện báo cáo
            else Tải Excel với format=xlsx
                API->>DB: Đọc toàn bộ phát hiện, bỏ lỗi khoảng trắng
                API->>API: Tạo workbook XLSX
                API-->>UI: Tệp Excel và tên tải xuống
                UI->>UI: Kiểm tra Content-Type và chữ ký tệp
                UI-->>U: Lưu tệp hoặc hiện lỗi định dạng
            end
        end
    end
```

## 12. Kiểm tra trạng thái API

Health check xác nhận FastAPI phản hồi. Kết quả này kiểm tra endpoint sức khỏe của ứng dụng.

```mermaid
flowchart TD
    A([Kiểm tra API]) --> B["Gửi GET /api/health"]
    B --> C{"Nhận HTTP 200 và status ok?"}
    C -- Có --> D["Xác nhận API đang phản hồi"]
    C -- Không --> E["Ghi nhận lỗi kết nối hoặc phản hồi"]
    D --> F([Kết thúc])
    E --> F
```

```mermaid
sequenceDiagram
    participant Client as Công cụ kiểm tra
    participant API as FastAPI
    Client->>API: GET /api/health
    API-->>Client: 200 với status ok
```

## Mã nguồn đối chiếu

- [React App và phiên đăng nhập](../../frontend/src/App.jsx)
- [Giao diện tài khoản](../../frontend/src/modules/authentication)
- [Dashboard](../../frontend/src/pages/dashboard/Dashboard.jsx)
- [Frontend client cho tệp và job](../../frontend/src/modules/dashboard/data/serverFileStorage.js)
- [API xác thực](../../backend/app/api/routes/auth.py), [middleware](../../backend/app/api/middlewares/authentication.py), [dịch vụ xác thực](../../backend/app/modules/authentication/service.py)
- [API tệp](../../backend/app/api/routes/files.py), [API job](../../backend/app/api/routes/processing.py), [dịch vụ xử lý](../../backend/app/modules/processing/service.py)
- [API phân tích](../../backend/app/api/routes/analysis.py), [quy tắc báo cáo](../../backend/app/modules/processing/quality.py)
