import { useRef, useState } from 'react'

const recentFiles = [
  { name: 'customer_data_q3.xlsx', type: 'Excel', rows: '2,450', date: 'Hôm nay, 09:42', status: 'Hoàn tất' },
  { name: 'sales_region_north.csv', type: 'CSV', rows: '8,120', date: 'Hôm qua, 16:18', status: 'Hoàn tất' },
  { name: 'survey_responses.json', type: 'JSON', rows: '864', date: '05 Thg 11, 14:06', status: 'Đã lưu' },
]

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2A1.7 1.7 0 0 0 7.8 17l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a1.7 1.7 0 1 1 3.4 0v.2A1.7 1.7 0 0 0 17 5.8l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.3.5Z" transform="translate(-1 -1) scale(1.08)"/></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const fileInput = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  function addFiles(fileList) {
    const accepted = Array.from(fileList).filter((file) => /\.(csv|xlsx?|json)$/i.test(file.name))
    if (accepted.length !== fileList.length) setNotice('Một số file không đúng định dạng. Chỉ nhận CSV, Excel hoặc JSON.')
    else setNotice('')
    setSelectedFiles((current) => [...current, ...accepted].slice(0, 5))
  }

  const visibleFiles = recentFiles.filter((file) => file.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="DataCare trang chủ">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>datacare<span className="brand-dot">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Điều hướng chính">
          <a className="nav-item active" href="#overview"><Icon name="grid"/><span>Tổng quan</span></a>
          <a className="nav-item" href="#datasets"><Icon name="table"/><span>Bộ dữ liệu</span><span className="nav-count">12</span></a>
          <a className="nav-item" href="#analysis"><Icon name="chart"/><span>Phân tích</span></a>
          <a className="nav-item" href="#activity"><Icon name="clock"/><span>Hoạt động</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon">✦</div>
            <strong>Không gian miễn phí</strong>
            <p>Bạn đang dùng 3 trong 10 lượt xử lý tháng này.</p>
            <div className="progress-track"><span /></div>
            <button className="upgrade-button" onClick={() => setNotice('Tính năng nâng cấp sẽ được bổ sung sau.')}>Tìm hiểu thêm <Icon name="arrow" size={15}/></button>
          </div>
          <a className="nav-item settings-link" href="#settings"><Icon name="settings"/><span>Cài đặt</span></a>
          <div className="profile-row"><div className="avatar">MP</div><div className="profile-copy"><strong>Minh Phúc</strong><span>Gói cá nhân</span></div><button className="more-button" aria-label="Tùy chọn tài khoản">•••</button></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <Icon name="chevron" size={14}/><strong>Tổng quan</strong></div>
          <div className="top-actions"><span className="today-label">Thứ Sáu, 07 Tháng 11, 2026</span><button className="icon-button" aria-label="Thông báo" onClick={() => setNotice('Bạn đã xem thông báo mới nhất.')}><Icon name="bell"/></button><div className="avatar small">MP</div></div>
        </header>

        <div className="page-wrap">
          <section className="welcome-row">
            <div><div className="eyebrow">KHÔNG GIAN LÀM VIỆC CỦA BẠN</div><h1>Chào buổi sáng, Phúc <span className="wave">✳</span></h1><p className="subtitle">Dữ liệu sạch hơn, quyết định tốt hơn. Bắt đầu nhé.</p></div>
            <button className="primary-button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18}/> Tải dữ liệu lên</button>
          </section>

          <section className="stats-grid" aria-label="Thống kê tổng quan">
            <article className="stat-card"><div className="stat-top"><span className="stat-icon blue"><Icon name="table"/></span><span className="stat-trend">↗ 12.5%</span></div><div className="stat-label">Tổng bộ dữ liệu</div><div className="stat-number">12 <span>bộ dữ liệu</span></div><div className="stat-foot">So với tháng trước</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon violet"><Icon name="chart"/></span><span className="stat-trend">↗ 8.2%</span></div><div className="stat-label">Bản ghi đã xử lý</div><div className="stat-number">24,580 <span>bản ghi</span></div><div className="stat-foot">Trong 30 ngày qua</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon green">✓</span><span className="quality-pill">Tốt</span></div><div className="stat-label">Chất lượng dữ liệu TB</div><div className="stat-number">94.8<span className="percent">%</span></div><div className="quality-line"><span/></div></article>
          </section>

          <section className="upload-section">
            <div className="section-heading"><div><h2>Bắt đầu với dữ liệu mới</h2><p>Tải lên tệp để kiểm tra, làm sạch và phân tích dữ liệu của bạn.</p></div><span className="step-label"><i/> SẴN SÀNG</span></div>
            <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => {event.preventDefault(); setDragging(true)}} onDragLeave={() => setDragging(false)} onDrop={(event) => {event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files)}} onClick={() => fileInput.current?.click()} onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click()}} role="button" tabIndex={0}>
              <div className="upload-illustration"><div className="upload-cloud"><Icon name="upload" size={24}/></div><span className="file-chip chip-csv">CSV</span><span className="file-chip chip-xls">XLS</span><span className="sparkle">✦</span></div>
              <h3>Kéo thả tệp của bạn vào đây</h3><p>hoặc <span>chọn tệp từ máy tính</span></p><div className="file-rules"><span><b>✓</b> CSV, XLS, XLSX, JSON</span><span className="rule-divider"/><span>Tối đa 50MB mỗi tệp</span></div>
              <input ref={fileInput} className="hidden-input" type="file" accept=".csv,.xls,.xlsx,.json" multiple onChange={(event) => addFiles(event.target.files)}/>
            </div>
            {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng thông báo"><Icon name="close" size={16}/></button></div>}
            {selectedFiles.length > 0 && <div className="selected-files"><div className="selected-heading">Tệp đã chọn <span>{selectedFiles.length}</span></div>{selectedFiles.map((file, index) => <div className="selected-file" key={`${file.name}-${index}`}><span className="mini-file"><Icon name="file" size={17}/></span><span className="selected-name">{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng tải lên</small></span><button onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Xóa ${file.name}`}><Icon name="close" size={17}/></button></div>)}<button className="primary-button process-button" onClick={() => setNotice('Kết nối API xử lý dữ liệu sẽ được tích hợp ở bước tiếp theo.')}>Tiếp tục xử lý <Icon name="arrow" size={16}/></button></div>}
          </section>

          <section className="recent-section" id="datasets">
            <div className="recent-heading"><div><h2>Dữ liệu gần đây</h2><p>Các tệp bạn đã làm việc gần đây.</p></div><div className="recent-tools"><label className="search-box"><Icon name="search" size={17}/><input aria-label="Tìm dữ liệu" placeholder="Tìm dữ liệu..." value={query} onChange={(event) => setQuery(event.target.value)}/></label><button className="text-button" onClick={() => setNotice('Đang hiển thị các bộ dữ liệu gần đây.')}>Xem tất cả <Icon name="chevron" size={15}/></button></div></div>
            <div className="table-wrap"><table><thead><tr><th>TÊN TỆP</th><th>SỐ BẢN GHI</th><th>NGÀY TẢI LÊN</th><th>TRẠNG THÁI</th><th/></tr></thead><tbody>{visibleFiles.map((file) => <tr key={file.name}><td><span className={`file-type ${file.type.toLowerCase()}`}>{file.type === 'Excel' ? 'X' : file.type === 'CSV' ? 'C' : '{ }'}</span><span className="filename">{file.name}<small>{file.type} · Tệp dữ liệu</small></span></td><td className="row-count">{file.rows}</td><td className="date-cell">{file.date}</td><td><span className={`status ${file.status === 'Hoàn tất' ? 'done' : 'saved'}`}><i/>{file.status}</span></td><td><button className="row-menu" aria-label={`Tùy chọn ${file.name}`}>•••</button></td></tr>)}{visibleFiles.length === 0 && <tr><td className="empty-state" colSpan="5">Không tìm thấy tệp phù hợp.</td></tr>}</tbody></table></div>
          </section>
          <footer className="footer"><span>© 2026 DataCare</span><span>Dữ liệu của bạn luôn được bảo mật <i className="lock-dot">◆</i></span><a href="#help">Trung tâm trợ giúp</a></footer>
        </div>
      </main>
    </div>
  )
}

export default App
