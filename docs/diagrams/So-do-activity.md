# Sơ đồ Activity của Data Cleaner

Cập nhật ngày 26/11/2026. Các sơ đồ mô tả các bước, điểm ra quyết định và nhánh xử lý từ trang khách đến quản lý tệp, làm sạch, phân tích và vận hành.

Các API yêu cầu đăng nhập kiểm tra Bearer JWT và giới hạn truy vấn tệp, job theo chủ sở hữu. Khi xác thực thất bại, API trả HTTP 401.

## Cách xem sơ đồ

Mở tài liệu trong trình đọc Markdown hỗ trợ Mermaid hoặc mở draw.io và chọn **Arrange → Insert → Mermaid**. Sao chép một khối, bắt đầu từ dòng `flowchart TD`, bỏ hai dòng dấu rào Markdown rồi bấm **Insert**.

Đọc theo chiều mũi tên. Hình thoi là điểm ra quyết định và nhãn trên mũi tên cho biết điều kiện chuyển bước.

Xem thêm [đặc tả Use Case](Use-case-Data-Cleaner.md) và [sơ đồ Sequence](So-do-sequence.md).

## Tổng quan luồng sử dụng

```mermaid
flowchart TD
    start([Mở Data Cleaner]) --> session{"Phiên hợp lệ?"}
    session -->|Chưa có| guest["Trang khách và đăng nhập"]
    guest --> dashboard["Dashboard"]
    session -->|Có| dashboard
    dashboard --> dataset["Chọn hoặc tải tệp nguồn"]
    dataset --> rules["Chọn quy tắc và cấu hình kiểu cột"]
    rules --> job{"Job làm sạch hoàn tất?"}
    job -->|Lỗi| retry["Xem lỗi và chỉnh cấu hình"]
    retry --> rules
    job -->|Có| files["Tệp đã làm sạch"]
    files --> download["Tải xuống hoặc xóa kết quả"]
    files --> analysis["Chọn tệp trong trang Phân tích"]
    analysis --> quality["Xem chất lượng tệp nguồn"]
    quality --> records["Xem bản ghi đáng ngờ hoặc xuất Excel"]
    analysis --> chart["Chọn hai cột của tệp đầu ra"]
    chart --> details["Bấm vào biểu đồ để xem chi tiết"]
```

## 0. Trang khách và yêu cầu đăng nhập

```mermaid
flowchart TD
    start([Mở trang khách]) --> action{"Người dùng chọn gì?"}
    action -->|Đăng nhập| login["Hiện biểu mẫu đăng nhập"]
    action -->|Bấm tải lên hoặc kéo thả tệp| prompt["Hiện yêu cầu đăng nhập"]
    prompt -->|Đóng| action
    prompt -->|Đăng nhập| login
```

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

## 2. Đăng nhập, khôi phục phiên và đăng xuất

```mermaid
flowchart TD
    A([Mở ứng dụng]) --> B{"Có token trong sessionStorage?"}
    B -- Có --> C["Kiểm tra phiên qua GET /me"]
    C -- Phiên hợp lệ --> H["Mở Dashboard"]
    C -- Lỗi --> D["Xóa token"]
    D --> L["Hiện trang khách"]
    B -- Không --> L
    L --> E["Người dùng mở màn hình đăng nhập"]
    E --> F{"Email và mật khẩu hợp lệ?"}
    F -- Không --> G["Hiện lỗi"]
    G --> E
    F -- Có --> I["Lưu JWT vào sessionStorage"]
    I --> H
    H --> J["Người dùng bấm đăng xuất"]
    J --> K["Xóa token và trạng thái người dùng"]
    K --> L
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

## 11. Xem chất lượng dữ liệu và tải bản ghi đáng ngờ

Trang Phân tích hiển thị báo cáo tổng hợp ngay dưới bộ chọn tệp ở cột trái. Mục Bản ghi đáng ngờ hiển thị các phát hiện chi tiết theo trang. Tệp Excel chứa toàn bộ phát hiện chi tiết của job. Danh sách, tổng số và tệp Excel đều bỏ các mục chỉ liên quan đến khoảng trắng. Báo cáo dùng dữ liệu nguồn trước khi làm sạch.

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

## 13. Khám phá hai cột và xem chi tiết biểu đồ

Biểu đồ sử dụng tệp đã làm sạch. Mỗi lượt so sánh xét các dòng có đủ giá trị ở cả hai cột. Khi xem theo giờ, một bản ghi trong khung 17:00–18:00 được đếm theo giờ ghi trong tệp, cộng dồn qua các ngày. Chế độ đếm mã khác nhau tính mỗi giá trị một lần trong từng khung giờ.

```mermaid
flowchart TD
    start([Mở trang Phân tích]) --> choose["Chọn tệp đã làm sạch"]
    choose --> cols["Tải thống kê và danh sách cột"]
    cols --> enough{"Có ít nhất hai cột?"}
    enough -->|Không| empty["Hiện thông báo và chờ chọn tệp khác"]
    empty --> choose
    enough -->|Có| select["Chọn hai cột khác nhau"]
    select --> load["Yêu cầu so sánh hai cột"]
    load --> outcome{"Kết quả yêu cầu"}
    outcome -->|Lỗi| retry["Hiện lỗi và cho thử lại"]
    retry --> load
    outcome -->|Không có cặp giá trị đầy đủ| noData["Hiện thông báo thiếu dữ liệu"]
    noData --> select
    outcome -->|Có dữ liệu| type{"Chọn dạng biểu đồ"}
    type -->|Ngày giờ| hourly["Vẽ biểu đồ theo giờ"]
    type -->|Mã nhận diện| unique["Đếm mã khác nhau theo nhóm"]
    type -->|Hai cột số đo| scatter["Vẽ biểu đồ phân tán"]
    type -->|Số đo và nhóm| average["Vẽ trung bình theo nhóm"]
    type -->|Các cặp còn lại| pairs["Đếm dòng theo cặp giá trị"]
    hourly -->|Đổi cách tính hoặc bộ lọc| hourly
    hourly --> click["Bấm thanh, cột giờ hoặc điểm"]
    unique --> click
    scatter --> click
    average --> click
    pairs --> click
    click --> detail["Hiện số liệu và câu giải thích ở khung chi tiết"]
    detail -->|Đổi cặp cột| select
```

## 14. Khởi động backend và chuyển dữ liệu lưu trữ cũ

FastAPI chạy bước chuẩn bị kho tệp và cơ sở dữ liệu khi khởi động. Bước chuyển sang kho tệp áp dụng cho bảng PostgreSQL `uploaded_files` cũ. Mục 4 mô tả luồng chuyển tệp đã lưu trong trình duyệt.

```mermaid
flowchart TD
    boot([Khởi động FastAPI]) --> folders["Chuẩn bị thư mục uploads và outputs"]
    folders --> schema["Tạo bảng ORM còn thiếu"]
    schema --> legacy{"Có bảng cũ và đủ cột bắt buộc?"}
    legacy -->|Không| ready([Phục vụ API])
    legacy -->|Có| row{"Còn bản ghi cũ?"}
    row -->|Không| ready
    row -->|Có| exists{"Đã có data_files tương ứng?"}
    exists -->|Có| row
    exists -->|Chưa| write["Sao chép nội dung sang kho tệp nếu cần"]
    write --> profile{"Đọc được dữ liệu?"}
    profile -->|Có| save["Lưu metadata và hồ sơ cột"]
    profile -->|Không| error["Lưu metadata với trạng thái PROFILE_ERROR"]
    save --> row
    error --> row
```

## Mã nguồn đối chiếu

- [React App và phiên đăng nhập](../../frontend/src/App.jsx)
- [Giao diện tài khoản](../../frontend/src/modules/authentication)
- [Dashboard](../../frontend/src/pages/dashboard/Dashboard.jsx)
- [Frontend client cho tệp và job](../../frontend/src/modules/dashboard/data/serverFileStorage.js)
- [API xác thực](../../backend/app/api/routes/auth.py), [middleware](../../backend/app/api/middlewares/authentication.py), [dịch vụ xác thực](../../backend/app/modules/authentication/service.py)
- [API tệp](../../backend/app/api/routes/files.py), [API job](../../backend/app/api/routes/processing.py), [dịch vụ xử lý](../../backend/app/modules/processing/service.py)
- [API phân tích](../../backend/app/api/routes/analysis.py), [quy tắc báo cáo](../../backend/app/modules/processing/quality.py)
- [Trang khách](../../frontend/src/pages/guest-home/GuestHome.jsx), [trang Phân tích](../../frontend/src/pages/analysis/Analysis.jsx), [biểu đồ hai cột](../../frontend/src/pages/analysis/ColumnStatistics.jsx)
- [Tính thống kê và so sánh](../../backend/app/modules/processing/statistics.py), [model thống kê](../../backend/app/models/analysis_result.py)
- [Vòng đời FastAPI](../../backend/app/main.py), [chuyển dữ liệu cũ](../../backend/app/db/migrations.py)
