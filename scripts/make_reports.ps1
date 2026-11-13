$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function XmlEscape([string]$text) {
    return [System.Security.SecurityElement]::Escape($text)
}

function New-Paragraph([string]$Text, [string]$Style = 'Normal') {
    $safe = XmlEscape $Text
    return "<w:p><w:pPr><w:pStyle w:val=`"$Style`"/></w:pPr><w:r><w:t xml:space=`"preserve`">$safe</w:t></w:r></w:p>"
}

function New-Docx([string]$Path, [string]$Title, [array]$Sections) {
    $body = New-Object System.Collections.Generic.List[string]
    $body.Add((New-Paragraph $Title 'Title'))
    $body.Add((New-Paragraph 'Tài liệu giải thích mã nguồn hiện có trong workspace • 10/11/2026' 'Subtitle'))
    foreach ($section in $Sections) {
        if ($section.Kind -eq 'H1') { $body.Add((New-Paragraph $section.Text 'Heading1')) }
        elseif ($section.Kind -eq 'H2') { $body.Add((New-Paragraph $section.Text 'Heading2')) }
        elseif ($section.Kind -eq 'Bullet') { $body.Add((New-Paragraph ('• ' + $section.Text) 'Normal')) }
        else { $body.Add((New-Paragraph $section.Text 'Normal')) }
    }
    $document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ($body -join '') + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>'
    $styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Arial"/><w:sz w:val="21"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="130" w:line="280" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:color w:val="263247"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:color w:val="17345B"/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="300"/></w:pPr><w:rPr><w:color w:val="687588"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="3159B8"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="90"/></w:pPr><w:rPr><w:b/><w:color w:val="3C526F"/><w:sz w:val="23"/></w:rPr></w:style>
</w:styles>
'@
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
    [System.IO.Directory]::CreateDirectory($temp) | Out-Null
    [System.IO.Directory]::CreateDirectory((Join-Path $temp '_rels')) | Out-Null
    [System.IO.Directory]::CreateDirectory((Join-Path $temp 'word')) | Out-Null
    [System.IO.Directory]::CreateDirectory((Join-Path $temp 'word/_rels')) | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $temp '[Content_Types].xml'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>', [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $temp '_rels/.rels'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $temp 'word/document.xml'), $document, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $temp 'word/styles.xml'), $styles, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText((Join-Path $temp 'word/_rels/document.xml.rels'), '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>', [System.Text.Encoding]::UTF8)
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $Path)
    Remove-Item -LiteralPath $temp -Recurse -Force
}

$be = @(
@{Kind='H1';Text='1. Phạm vi và kiến trúc'},
@{Kind='Normal';Text='Tài liệu khảo sát mã hiện có trong backend/app. BE dùng FastAPI để nhận HTTP request; Pydantic kiểm tra dữ liệu; service xử lý quy tắc nghiệp vụ; repository đọc/ghi bằng SQLAlchemy; PostgreSQL lưu tài khoản. Mã trong working tree có trạng thái chưa commit tại thời điểm lập tài liệu.'},
@{Kind='H2';Text='Đường đi request'},
@{Kind='Normal';Text='HTTP request → router.py (đường dẫn và status code) → schemas.py (kiểm tra body) → service.py (quy tắc đăng ký/đăng nhập) → repository.py (truy vấn/commit) → PostgreSQL. Response model lọc và định hình dữ liệu trả về.'},
@{Kind='H2';Text='app/main.py'},
@{Kind='Bullet';Text='lifespan(app): async context manager chạy khi ứng dụng khởi động. Base.metadata.create_all(bind=engine) tạo các bảng model đã được import nếu chưa tồn tại; yield bàn giao cho FastAPI chạy ứng dụng. Đây là tạo bảng đơn giản, không thay thế công cụ migration schema.'},
@{Kind='Bullet';Text='app = FastAPI(...): tạo ứng dụng, đặt tên và phiên bản, gắn lifespan.'},
@{Kind='Bullet';Text='app.include_router(auth_router, prefix="/api"): gắn router auth dưới tiền tố /api. Router còn có prefix /auth, nên endpoint cuối là /api/auth/... .'},
@{Kind='Bullet';Text='health_check(): GET /api/health trả JSON {"status":"ok"} để kiểm tra API còn hoạt động.'},
@{Kind='H2';Text='auth/router.py: bắt và trả lời API'},
@{Kind='Bullet';Text='APIRouter(prefix="/auth", tags=["Authentication"]): gom các endpoint auth và nhóm hiển thị trên Swagger.'},
@{Kind='Bullet';Text='register(payload, db): POST /api/auth/register. FastAPI giải JSON vào RegisterRequest, kiểm tra trước khi gọi hàm. Depends(get_db) cấp SQLAlchemy Session. Hàm chuyển email đã xác nhận thành chuỗi, gọi service.register_user, bắt EmailAlreadyRegistered và đổi thành HTTP 409. Thành công trả UserResponse với status 201; mật khẩu băm không được trả ra.'},
@{Kind='Bullet';Text='sign_in(payload, db): POST /api/auth/sign-in. Gọi service.sign_in bằng email và mật khẩu. Nếu kết quả rỗng trả HTTP 401 cùng WWW-Authenticate: Bearer; thành công trả SignInResponse gồm JWT và thông tin user.'},
@{Kind='Bullet';Text='read_current_user(user): GET /api/auth/me. Depends(require_current_user) buộc xác thực Bearer token trước khi chạy hàm; trả thông tin công khai của user dưới dạng UserResponse.'},
@{Kind='H2';Text='auth/schemas.py: kiểm tra request và định dạng response'},
@{Kind='Bullet';Text='SignInRequest: EmailStr kiểm tra định dạng email; password có độ dài 1–128. Đây là kiểm tra hình thức, chưa xác thực mật khẩu.'},
@{Kind='Bullet';Text='RegisterRequest: email phải hợp lệ; full_name 2–120 ký tự; password và confirm_password 12–128 ký tự.'},
@{Kind='Bullet';Text='passwords_must_match(): validator sau khi Pydantic dựng object. Từ chối khi hai mật khẩu không khớp; trim tên; kiểm tra tên còn tối thiểu 2 ký tự sau trim. Lỗi validation FastAPI tự trả lỗi 422.'},
@{Kind='Bullet';Text='UserResponse: whitelist id, email, full_name để không làm lộ hashed_password hoặc trường nội bộ.'},
@{Kind='Bullet';Text='SignInResponse: access_token là JWT, token_type mặc định bearer, user là UserResponse.'},
@{Kind='H2';Text='auth/service.py: quy tắc nghiệp vụ'},
@{Kind='Bullet';Text='EmailAlreadyRegistered: ngoại lệ nghiệp vụ riêng, cho router phân biệt email trùng với lỗi server khác.'},
@{Kind='Bullet';Text='register_user(db, email, full_name, password): chuẩn hóa email bằng trim và lowercase; hỏi repository xem email đã có chưa; nếu có thì báo EmailAlreadyRegistered. Nếu chưa, trim tên, băm mật khẩu, rồi gọi repository.create_user. Bắt IntegrityError và rollback transaction. Nếu SQLSTATE là 23505 (vi phạm unique ở PostgreSQL), đổi thành EmailAlreadyRegistered để xử lý cả trường hợp hai request đồng thời; lỗi DB khác được ném tiếp.'},
@{Kind='Bullet';Text='sign_in(db, email, password): tra user theo email; từ chối khi không có user, user bị khóa (is_active=False), hoặc verify_password thất bại. Khi hợp lệ tạo JWT với subject là id dạng chuỗi; trả SignInResponse.'},
@{Kind='Bullet';Text='get_current_user(db, user_id): tìm user theo khóa chính; trả None nếu không tồn tại hoặc không active, ngược lại trả model User.'},
@{Kind='H2';Text='auth/repository.py: truy cập dữ liệu'},
@{Kind='Bullet';Text='get_user_by_email(db, email): tạo câu select(User) với email.lower(), rồi db.scalar trả một User hoặc None.'},
@{Kind='Bullet';Text='get_user_by_id(db, user_id): db.get(User, user_id) tra theo primary key.'},
@{Kind='Bullet';Text='create_user(...): dựng User, db.add đưa vào transaction, db.commit ghi dữ liệu, db.refresh đọc lại giá trị DB sinh như id/created_at rồi trả user.'},
@{Kind='H2';Text='auth/security.py: băm mật khẩu và JWT'},
@{Kind='Bullet';Text='PasswordHash.recommended(): chọn cấu hình băm do pwdlib khuyến nghị; requirements cài pwdlib[argon2].'},
@{Kind='Bullet';Text='hash_password(password): sinh chuỗi hash có salt để lưu; mật khẩu gốc không được lưu trong bảng.'},
@{Kind='Bullet';Text='verify_password(password, hashed_password): kiểm tra mật khẩu nhập vào có tương ứng hash đã lưu hay không.'},
@{Kind='Bullet';Text='create_access_token(subject): lấy thời điểm UTC, cộng số phút cấu hình để tạo exp, mã hóa sub và exp bằng PyJWT HS256 với JWT_SECRET_KEY. Token ký không phải dữ liệu mã hóa bí mật.'},
@{Kind='H2';Text='auth/dependencies.py: bảo vệ endpoint'},
@{Kind='Bullet';Text='HTTPBearer(auto_error=False): đọc Authorization: Bearer ...; tắt lỗi tự động để dependency tự trả thông báo tiếng Việt nhất quán.'},
@{Kind='Bullet';Text='require_current_user(...): nếu không có credentials thì 401. jwt.decode kiểm chữ ký, thời hạn và thuật toán HS256; đọc sub và ép thành int. Token lỗi, thiếu sub, sub sai kiểu đều thành 401. Sau đó gọi service.get_current_user; user không còn active/tồn tại cũng 401.'},
@{Kind='H2';Text='Cơ sở dữ liệu và cấu hình'},
@{Kind='Bullet';Text='db/base.py: Base(DeclarativeBase) là lớp nền để SQLAlchemy phát hiện model.'},
@{Kind='Bullet';Text='db/session.py: create_engine dùng DATABASE_URL và pool_pre_ping để phát hiện kết nối chết; SessionLocal tạo session không autoflush và không hết hiệu lực object ngay sau commit. get_db mở session cho request, yield cho route, finally đóng kể cả khi có lỗi.'},
@{Kind='Bullet';Text='core/config.py: Settings đọc database_url, jwt_secret_key và thời hạn token từ môi trường/.env; settings là instance dùng chung. jwt_secret_key không có mặc định nên cấu hình thiếu có thể làm app không khởi động.'},
@{Kind='Bullet';Text='auth/models.py: User ánh xạ bảng users. id là khóa chính; email unique/index; full_name; hashed_password; is_active mặc định true; created_at dùng thời gian do DB tạo.'},
@{Kind='H2';Text='Luồng đăng ký, đăng nhập và response'},
@{Kind='Normal';Text='Đăng ký: React gửi POST /api/auth/register → RegisterRequest xác thực email/tên/độ dài/khớp mật khẩu → service chuẩn hóa và băm Argon2 → repository ghi users → 201 với id/email/full_name. Trùng email trả 409; payload sai thường trả 422.'},
@{Kind='Normal';Text='Đăng nhập: React gửi POST /api/auth/sign-in → SignInRequest xác thực hình thức → service tra user, kiểm is_active và mật khẩu → ký JWT → 200 access_token/token_type/user. Sai thông tin trả 401. Router không phân biệt email không tồn tại và mật khẩu sai.'},
@{Kind='Normal';Text='Lấy phiên: client gửi GET /api/auth/me với Authorization: Bearer <token> → dependency xác minh chữ ký/hạn dùng/subject và trạng thái user → 200 thông tin user, nếu lỗi trả 401.'},
@{Kind='H2';Text='Lưu ý khi đọc mã'},
@{Kind='Bullet';Text='JWT có thời hạn mặc định 60 phút; frontend dùng sessionStorage. Endpoint /me kiểm tra lại trạng thái user tại DB.'},
@{Kind='Bullet';Text='Registration không tự phát hành token hoặc tự đăng nhập; FE chuyển người dùng sang form đăng nhập.'},
@{Kind='Bullet';Text='auth/cli.py là tiện ích tạo user tương tác cho quản trị/dev; main() tạo bảng, hỏi email/tên/mật khẩu qua getpass, validate bằng RegisterRequest và tái sử dụng register_user. __main__ chỉ gọi main khi chạy module trực tiếp.'},
@{Kind='Bullet';Text='requirements.txt liệt kê FastAPI/Uvicorn, SQLAlchemy/psycopg, pydantic-settings/email-validator, pwdlib Argon2 và PyJWT. Các __init__.py trống đánh dấu package; không chứa quy tắc auth.'}
)

$fe = @(
@{Kind='H1';Text='1. Tình hình thay đổi và cách đọc báo cáo'},
@{Kind='Normal';Text='Báo cáo mô tả trạng thái mã hiện tại trong workspace; không suy đoán tác giả của từng thay đổi.'},
@{Kind='H2';Text='Tóm tắt trước và sau'},
@{Kind='Normal';Text='Trước: App.jsx duy nhất chứa dashboard, dữ liệu mẫu và Icon; không có luồng auth thực. Sau: main.jsx mount app/App.jsx; App điều phối phiên, SignIn, Register, Dashboard; component, dữ liệu và CSS được tách theo chức năng. Dashboard vẫn dùng dữ liệu mẫu và thao tác upload chưa nối API xử lý.'},
@{Kind='H1';Text='2. Điểm vào và điều phối ứng dụng'},
@{Kind='H2';Text='src/main.jsx (được chỉnh)'},
@{Kind='Normal';Text='import createRoot lấy API mount React; import App từ app/App.jsx thay entry cũ; import global.css; createRoot(document.getElementById("root")).render(...) dựng cây component. React.StrictMode bật kiểm tra bổ sung trong môi trường phát triển.'},
@{Kind='H2';Text='src/App.jsx'},
@{Kind='Bullet';Text='user, checkingSession, authMode, registeredEmail là state điều phối: người dùng hiện tại, trạng thái đang xác minh token, màn hình auth cần hiện và email vừa đăng ký.'},
@{Kind='Bullet';Text='useEffect chạy khi mount: đọc access_token từ sessionStorage. Không có token thì dừng loading; có token thì GET /api/auth/me kèm Bearer. User hợp lệ đi vào dashboard; response không hợp lệ hoặc network error xóa token; finally kết thúc trạng thái loading.'},
@{Kind='Bullet';Text='signOut(): xóa token khỏi sessionStorage và xóa user trong React state.'},
@{Kind='Bullet';Text='Render theo state: spinner trong khi kiểm tra phiên; Register khi authMode=register; SignIn nếu chưa có user; Dashboard nếu user đã xác thực.'},
@{Kind='Bullet';Text='onRegistered lưu email rồi đổi về sign-in; SignIn nhận email điền sẵn và thông báo tạo tài khoản thành công. onSignedIn cập nhật user để hiển thị dashboard.'},
@{Kind='H1';Text='3. Module đăng ký và đăng nhập'},
@{Kind='H2';Text='src/modules/authentication/SignIn.jsx'},
@{Kind='Bullet';Text='Props: onSignedIn cập nhật user cha; onSwitchToRegister đổi màn; initialEmail điền email; successMessage hiện thông báo.'},
@{Kind='Bullet';Text='useState giữ email, password, showPassword, busy và error. handleSubmit chặn submit HTML mặc định, xóa lỗi cũ, bật busy và POST JSON email/password tới /api/auth/sign-in.'},
@{Kind='Bullet';Text='response.json().catch(() => ({})) tránh lỗi phụ khi response không có JSON. 401 đổi thành thông báo sai email/mật khẩu; lỗi khác ưu tiên detail từ BE. Thành công lưu access_token vào sessionStorage rồi gọi onSignedIn(data.user). Catch đổi lỗi mất kết nối thành câu hướng dẫn tiếng Việt; finally luôn tắt busy.'},
@{Kind='Bullet';Text='JSX gồm email, password, nút hiện/ẩn, gửi form, thông báo lỗi/thành công; disabled khi đang gửi để tránh submit lặp. Nút quên mật khẩu hiện chỉ đưa thông báo liên hệ quản trị viên, chưa gọi API reset.'},
@{Kind='H2';Text='src/modules/authentication/Register.jsx'},
@{Kind='Bullet';Text='State giữ fullName, email, password, confirmPassword, showPassword, busy và error.'},
@{Kind='Bullet';Text='handleSubmit kiểm tra mật khẩu khớp ngay ở FE; sau đó POST /api/auth/register với full_name, email, password và confirm_password. Các giới hạn HTML giúp người dùng nhập thuận tiện; BE vẫn là nguồn xác thực cuối.'},
@{Kind='Bullet';Text='HTTP 409 hiển thị email đã sử dụng; response detail dùng cho lỗi khác. Thành công gọi onRegistered(data.email), không lưu token vì BE chỉ tạo user; App chuyển sang sign-in.'},
@{Kind='Bullet';Text='Inputs có autocomplete, required, minLength/maxLength tương ứng schema; mật khẩu xác nhận dùng chung trạng thái hiện/ẩn.'},
@{Kind='H2';Text='src/modules/authentication/AuthLayout.jsx'},
@{Kind='Normal';Text='Component khung dùng chung hai form: nhận children, prompt, actionLabel, onAction. Bên trái là phần nhận diện/thông điệp sản phẩm; bên phải hiển thị nút chuyển màn, nội dung form và chân trang điều khoản. Import auth.css để nạp style riêng.'},
@{Kind='H1';Text='4. Dashboard và module dùng chung'},
@{Kind='H2';Text='src/pages/dashboard/Dashboard.jsx'},
@{Kind='Bullet';Text='Nhận user và onSignOut. Tên và chữ viết tắt avatar lấy từ user thực thay cho tên Minh Phúc cố định; nút tùy chọn hiện gọi đăng xuất.'},
@{Kind='Bullet';Text='fileInput ref mở hộp chọn file; addFiles lọc phần mở rộng csv/xls/xlsx/json, thông báo file sai định dạng, giới hạn danh sách ở 5 file. Query lọc tên trong recentFiles.'},
@{Kind='Bullet';Text='dragging, selectedFiles, query, notice là các state cho kéo-thả, danh sách file đang chọn, tìm kiếm và thông báo. Có thể bỏ file đã chọn; nút tiếp tục xử lý hiện chỉ thông báo API sẽ tích hợp sau, không upload dữ liệu.'},
@{Kind='Bullet';Text='Thống kê dashboard, recent files và ngày hiển thị hiện là dữ liệu minh họa tĩnh; không lấy từ API.'},
@{Kind='H2';Text='src/components/common/Icon.jsx'},
@{Kind='Normal';Text='Icon({name, size=20}) dùng map paths chọn SVG path theo tên, trả SVG trang trí aria-hidden. Tách icon để Dashboard tái sử dụng, tránh nhúng toàn bộ định nghĩa icon trong App.'},
@{Kind='H2';Text='src/modules/dashboard/data/recentFiles.js'},
@{Kind='Normal';Text='Export mảng recentFiles chứa ba bản ghi demo gồm name, type, rows, date, status; Dashboard import để render và lọc bảng dữ liệu gần đây.'},
@{Kind='H1';Text='5. CSS và cấu hình FE'},
@{Kind='H2';Text='src/modules/authentication/auth.css'},
@{Kind='Normal';Text='Style phạm vi màn auth: lưới hai cột desktop, panel showcase, form, trạng thái lỗi/thành công, spinner; media query 850px ẩn showcase và đưa form về một cột; media query chiều cao ngắn nén khoảng cách. Đây là stylesheet trình bày, không chứa xử lý API.'},
@{Kind='H2';Text='src/assets/styles/global.css'},
@{Kind='Normal';Text='Đặt font, màu nền, box-sizing, button/input và style dùng chung dashboard. Các media query điều chỉnh sidebar, thống kê và bảng theo kích thước màn hình. Style nền tảng được đặt trong assets/styles; phần auth-specific được giữ cùng authentication module.'},
@{Kind='H2';Text='vite.config.js'},
@{Kind='Normal';Text='defineConfig cấu hình Vite và React plugin. Dev server bind 127.0.0.1:5173; proxy đường dẫn /api tới FastAPI http://127.0.0.1:8000, nên FE dùng URL tương đối và không cần CORS riêng cho local.'},
@{Kind='H2';Text='package.json'},
@{Kind='Normal';Text='Scripts dev/build/preview chạy Vite. React/React DOM là runtime; Vite và plugin React là dev dependencies. File package hiện không thêm thư viện auth riêng.'},
@{Kind='H1';Text='6. Các lời gọi API từ FE'},
@{Kind='Bullet';Text='Đăng ký: Register.jsx → POST /api/auth/register → 201 user → điền email và chuyển sign-in; lỗi 409 email trùng; lỗi validation BE thường là 422.'},
@{Kind='Bullet';Text='Đăng nhập: SignIn.jsx → POST /api/auth/sign-in → lưu token và user → Dashboard.'},
@{Kind='Bullet';Text='Khôi phục phiên: App.jsx → GET /api/auth/me với Authorization Bearer khi tải lại trang. Token mất hiệu lực thì xóa và yêu cầu đăng nhập lại.'},
@{Kind='Bullet';Text='Đăng xuất: xóa token phía trình duyệt và trả giao diện về sign-in; không có endpoint logout phía BE vì JWT stateless.'},
@{Kind='H1';Text='7. Giới hạn chức năng hiện tại'},
@{Kind='Bullet';Text='Chưa có API upload, xử lý, phân tích hoặc lưu lịch sử dataset; dashboard dùng demo và các nút placeholder.'},
@{Kind='Bullet';Text='Quên mật khẩu, điều khoản và một số liên kết điều hướng chỉ là giao diện/anchor, chưa triển khai backend.'},
@{Kind='Bullet';Text='Token để trong sessionStorage: giữ qua reload tab nhưng không phải cookie HttpOnly. Thời hạn và chính sách bảo mật cần được xem cùng cấu hình triển khai thực tế.'},
@{Kind='Bullet';Text='Báo cáo dựa trên source hiện có; không khẳng định thay đổi đã được build hoặc chạy kiểm chứng.'}
)

$reportDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'docs/reports'
[System.IO.Directory]::CreateDirectory($reportDir) | Out-Null
New-Docx (Join-Path $reportDir 'Bao-cao-chi-tiet-BE-auth.docx') 'BÁO CÁO CHI TIẾT BE: ĐĂNG KÝ, ĐĂNG NHẬP VÀ XÁC THỰC' $be
New-Docx (Join-Path $reportDir 'Bao-cao-thay-doi-FE-auth-dashboard.docx') 'BÁO CÁO THAY ĐỔI FE: AUTH VÀ TỔ CHỨC GIAO DIỆN' $fe
