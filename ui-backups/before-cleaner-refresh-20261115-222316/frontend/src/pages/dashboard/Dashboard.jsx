import { useRef, useState } from 'react'
import { Icon } from '../../components/common/Icon.jsx'

export default function Dashboard({ user, onSignOut }) {
  const fileInput = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')

  function addFiles(fileList) {
    const accepted = Array.from(fileList).filter((file) => /\.(csv|xlsx?|json)$/i.test(file.name))
    if (accepted.length !== fileList.length) setNotice('Một số file không đúng định dạng. Chỉ nhận CSV, Excel hoặc JSON.')
    else setNotice('')
    setSelectedFiles((current) => [...current, ...accepted].slice(0, 5))
  }


  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Data Cleaner trang chủ">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>Data Cleaner</span>
        </a>
        <nav className="nav-list" aria-label="Điều hướng chính">
          <a className="nav-item active" href="#overview"><Icon name="grid"/><span>Làm sạch tệp</span></a>
          <a className="nav-item" href="#datasets"><Icon name="table"/><span>Bộ dữ liệu</span><span className="nav-count">12</span></a>
          <a className="nav-item" href="#analysis"><Icon name="chart"/><span>Phân tích</span></a>
          <a className="nav-item" href="#activity"><Icon name="clock"/><span>Hoạt động</span></a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item settings-link" href="#settings"><Icon name="settings"/><span>Cài đặt</span></a>
          <div className="profile-row"><div className="avatar">{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</div><div className="profile-copy"><strong>{user?.full_name || user?.email}</strong><span>Gói cá nhân</span></div><button className="more-button" onClick={onSignOut} aria-label="Đăng xuất">↗</button></div>
        </div>
      </aside>

      <main className="main-content cleaner-home" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><a href="#overview">Trang chủ</a> <Icon name="chevron" size={14}/><strong>Làm sạch tệp</strong></div>
          <div className="top-actions"><button className="icon-button" aria-label="Thông báo" onClick={() => setNotice('Bạn đã xem thông báo mới nhất.')}><Icon name="bell"/></button><div className="avatar small">{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</div></div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">KHÔNG GIAN LÀM VIỆC CỦA BẠN</div>
              <h1>Làm sạch dữ liệu dễ dàng</h1>
              <p className="subtitle">Làm sạch và chuẩn hóa dữ liệu từ các tệp Excel, JSON và CSV một cách nhanh chóng, tiện lợi.</p>
            </div>
          </section>

          <section className="upload-section" aria-label="Tải tệp để làm sạch">
            <div className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
              <div className="clean-file-art" aria-hidden="true">
                <span className="file-sheet sheet-back"/>
                <span className="file-sheet sheet-front"><Icon name="file" size={40}/><span>Clean</span></span>
                <span className="clean-badge">✓</span>
              </div>
              <button type="button" className="primary-button upload-file-button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={20}/>TẢI LÊN TỆP TIN CỦA BẠN</button>
              <p className="drop-hint">hoặc kéo thả tệp của bạn vào đây</p>
              <div className="file-rules">Hỗ trợ định dạng XLS, XLSX, JSON, CSV. Dung lượng tối đa 50 MB mỗi tệp.</div>
              <input ref={fileInput} className="hidden-input" type="file" accept=".csv,.xls,.xlsx,.json" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = '' }}/>
            </div>
            {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng thông báo"><Icon name="close" size={16}/></button></div>}
            {selectedFiles.length > 0 && <div className="selected-files"><div className="selected-heading">Tệp đã chọn <span>{selectedFiles.length}</span></div>{selectedFiles.map((file, index) => <div className="selected-file" key={`${file.name}-${index}`}><span className="mini-file"><Icon name="file" size={17}/></span><span className="selected-name">{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng tải lên</small></span><button onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Xóa ${file.name}`}><Icon name="close" size={17}/></button></div>)}<button className="primary-button process-button" onClick={() => setNotice('Kết nối API xử lý dữ liệu sẽ được tích hợp ở bước tiếp theo.')}>Tiếp tục xử lý <Icon name="arrow" size={16}/></button></div>}
          </section>

          <footer className="footer"><span>© 2026 Data Cleaner</span><span>Dữ liệu của bạn luôn được bảo mật <i className="lock-dot">◆</i></span><a href="#help">Trung tâm trợ giúp</a></footer>
        </div>
      </main>
    </div>
  )
}
