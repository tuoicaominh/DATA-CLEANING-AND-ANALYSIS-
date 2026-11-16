import { useEffect, useRef, useState } from 'react'
import AccountDialog from '../../modules/authentication/AccountDialog.jsx'
import { Icon } from '../../components/common/Icon.jsx'
import { listFiles, saveFiles, deleteFile, migrateLocalFiles } from '../../modules/dashboard/data/serverFileStorage.js'

export default function Dashboard({ user, onSignOut }) {
  const fileInput = useRef(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const deleteDialog = useRef(null)
  const owner = String(user?.id ?? user?.email ?? '')
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [savingFiles, setSavingFiles] = useState(false)
  const savingLock = useRef(false)
  const mounted = useRef(true)
  const deleteTrigger = useRef(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    if (pendingDelete) deleteDialog.current?.showModal()
  }, [pendingDelete])
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const [uploadNotice, setUploadNotice] = useState(null)
  useEffect(() => {
    if (!uploadNotice) return
    const timer = window.setTimeout(() => setUploadNotice(null), 2000)
    return () => window.clearTimeout(timer)
  }, [uploadNotice])
  useEffect(() => {
    if (notice) setUploadNotice(null)
  }, [notice])
  const [cleaningOption, setCleaningOption] = useState(null)
  useEffect(() => {
    let active = true
    setLoadingFiles(true)
    migrateLocalFiles(owner).then(async (warning) => {
      const files = await listFiles()
      if (active) {
        setSelectedFiles(files)
        if (warning) setNotice(warning)
      }
    }).catch((error) => {
      if (active) setNotice(error.message || 'Không thể tải danh sách tệp từ máy chủ.')
    }).finally(() => { if (active) setLoadingFiles(false) })
    return () => { active = false }
  }, [owner])


  async function addFiles(fileList) {
    if (loadingFiles || savingLock.current || !fileList.length) return
    const accepted = Array.from(fileList).filter((file) => /\.(csv|xlsx?|json)$/i.test(file.name) && file.size <= 50 * 1024 * 1024)
    const rejected = fileList.length - accepted.length
    if (!accepted.length) {
      setNotice('Tệp không hợp lệ. Chỉ nhận CSV, Excel hoặc JSON, tối đa 50 MB mỗi tệp.')
      return
    }
    const items = accepted.map((file) => ({ id: crypto.randomUUID(), file, addedAt: new Date() }))
    savingLock.current = true
    setSavingFiles(true)
    setNotice('')
    setUploadNotice(null)
    try {
      const saved = await saveFiles(owner, items)
      if (!mounted.current) return
      setSelectedFiles((current) => [...current, ...saved])
      setUploadNotice({ id: crypto.randomUUID(), count: items.length, rejected })
    } catch (error) {
      if (mounted.current) {
        setNotice(error.message || 'Không thể lưu tệp lên máy chủ. Hãy thử lại.')
        try {
          const files = await listFiles()
          if (mounted.current) setSelectedFiles(files)
        } catch { /* Keep the last confirmed list when the server is unavailable. */ }
      }
    } finally {
      savingLock.current = false
      if (mounted.current) setSavingFiles(false)
    }
  }

  function closeDeleteDialog() {
    if (deleting) return
    deleteDialog.current?.close()
    setPendingDelete(null)
    deleteTrigger.current?.focus()
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    const id = pendingDelete.id
    setDeleting(true)
    try {
      await deleteFile(owner, id)
      if (!mounted.current) return
      setSelectedFiles((current) => current.filter((item) => item.id !== id))
      deleteDialog.current?.close()
      setPendingDelete(null)
      setNotice('Tệp của bạn đã được xóa.')
      document.querySelector('.files-upload-button')?.focus()
    } catch {
      if (mounted.current) {
        deleteDialog.current?.close()
        setPendingDelete(null)
        setNotice('Không thể xóa tệp đã lưu. Tệp vẫn được giữ lại; hãy thử lại.')
      }
    } finally {
      if (mounted.current) setDeleting(false)
    }
  }

  function fileKind(name) {
    if (/\.xlsx?$/i.test(name)) return 'excel'
    if (/\.csv$/i.test(name)) return 'csv'
    return 'json'
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} KB`
    return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} MB`
  }


  return (
    <div className="app-shell">
      {(uploadNotice || notice) && <div key={uploadNotice?.id || 'notice'} className={`home-notification ${uploadNotice || notice === 'Tệp của bạn đã được xóa.' ? 'is-success' : ''} ${uploadNotice ? 'upload-notification' : ''}`} role="status" aria-live="polite">
        <span className="notification-icon"><Icon name={uploadNotice || notice === 'Tệp của bạn đã được xóa.' ? 'check-circle' : 'bell'} size={25}/></span>
        <span className="notification-copy">{uploadNotice ? <><strong>Tải tệp thành công</strong><span>Đã lưu {uploadNotice.count} tệp trên máy chủ.{uploadNotice.rejected > 0 && ` Bỏ qua ${uploadNotice.rejected} tệp không hợp lệ (chỉ nhận CSV, Excel, JSON; tối đa 50 MB/tệp).`}</span></> : notice}</span>
        <button type="button" onClick={() => { setNotice(''); setUploadNotice(null) }} aria-label="Đóng thông báo"><Icon name="close" size={19}/></button>
        {uploadNotice && <div className="upload-notification-track" aria-hidden="true"><span/></div>}
      </div>}
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
          <div className="profile-row"><div className="avatar">{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</div><div className="profile-copy"><strong>{user?.full_name || user?.email}</strong><span>Gói cá nhân</span></div><button className="more-button sidebar-signout" onClick={onSignOut} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="logout" size={19}/></button></div>
        </div>
      </aside>

      <main className="main-content cleaner-home" id="overview">
        <header className="topbar">
          <h1 className="home-title">Trang chủ</h1>
          <div className="top-actions">
            <button type="button" className="top-action-button" aria-label="Thông báo" title="Thông báo" onClick={() => setNotice('Bạn đã xem thông báo mới nhất.')}><Icon name="bell" size={25}/></button>
            <button type="button" className="top-action-button account-action" aria-label="Tài khoản của tôi" title={user?.full_name || 'Tài khoản của tôi'} onClick={() => setAccountOpen(true)} aria-haspopup="dialog"><Icon name="user" size={25}/><span>{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</span></button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="cleaning-options" aria-label="Chức năng làm sạch dữ liệu">
            {[
              { id: 'missing', icon: 'missing', label: 'Xử lý giá trị trống' },
              { id: 'duplicates', icon: 'duplicates', label: 'Xử lý trùng dữ liệu' },
              { id: 'format', icon: 'format', label: 'Xử lý sai định dạng dữ liệu' },
            ].map((option) => <button type="button" key={option.id} className={`cleaning-option ${cleaningOption === option.id ? 'is-selected' : ''}`} aria-pressed={cleaningOption === option.id} onClick={() => setCleaningOption(option.id)}>
              <span className={`cleaning-option-icon ${option.id}`}><Icon name={option.icon} size={23}/></span><span>{option.label}</span>
            </button>)}
          </section>

          <section className="upload-section" aria-label="Tải tệp để làm sạch">
            <div className="files-panel">
              <div className="files-toolbar">
                <div className="files-filters" role="group" aria-label="Bộ lọc tệp tin">
                  <button type="button" className="files-filter-button is-active" aria-pressed="true" onClick={() => setNotice('')}><Icon name="file" size={21}/>Tất cả tệp tin</button>
                  <button type="button" className="files-filter-button" onClick={() => setNotice('Tính năng thêm dấu trang sẽ được phát triển sau.')}><Icon name="bookmark" size={21}/>Thêm dấu trang</button>
                </div>
                <button type="button" className="primary-button files-upload-button" disabled={loadingFiles || savingFiles} onClick={() => fileInput.current?.click()}><Icon name="upload" size={18}/>Tải lên tập tin</button>
              </div>
              <div className="files-table-scroll">
                <table className="files-table" aria-label="Tất cả tập tin">
                  <thead><tr><th scope="col">Tên</th><th scope="col">Kích cỡ</th><th scope="col">Hoạt động gần nhất</th><th scope="col"><span className="visually-hidden">Thao tác</span></th></tr></thead>
                  <tbody>
                    {selectedFiles.map((item) => <tr key={item.id}>
                      <td><span className="files-name"><span className={`files-icon ${fileKind(item.file.name)}`} aria-hidden="true"><Icon name="file" size={22}/><small>{fileKind(item.file.name) === 'excel' ? 'XLS' : fileKind(item.file.name).toUpperCase()}</small></span><span title={item.file.name}>{item.file.name}</span></span></td>
                      <td>{formatSize(item.file.size)}</td>
                      <td><time dateTime={item.addedAt.toISOString()}>{item.addedAt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></td>
                      <td><button type="button" className="delete-file-button" aria-label={`Xóa ${item.file.name}`} onClick={(event) => { deleteTrigger.current = event.currentTarget; setPendingDelete(item) }}><Icon name="close" size={16}/>Xóa</button></td>
                    </tr>)}
                    {!selectedFiles.length && <tr><td colSpan={4} className="files-empty">{loadingFiles ? 'Đang tải danh sách tệp…' : 'Chưa có tệp tin. Tải lên tệp đầu tiên của bạn.'}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
              <div className="clean-file-art" aria-hidden="true">
                <span className="file-sheet sheet-back"/>
                <span className="file-sheet sheet-front"><Icon name="file" size={40}/><span>Clean</span></span>
                <span className="clean-badge">✓</span>
              </div>
              <button type="button" className="primary-button upload-file-button" disabled={loadingFiles || savingFiles} onClick={() => fileInput.current?.click()}><Icon name="upload" size={20}/>{savingFiles ? 'ĐANG LƯU TỆP…' : 'TẢI LÊN TỆP TIN CỦA BẠN'}</button>
              <p className="drop-hint">hoặc kéo thả tệp của bạn vào đây</p>
              <div className="file-rules">Hỗ trợ định dạng XLS, XLSX, JSON, CSV. Dung lượng tối đa 50 MB mỗi tệp.</div>
              <input ref={fileInput} className="hidden-input" type="file" accept=".csv,.xls,.xlsx,.json" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = '' }}/>
            </div>


          </section>

          <footer className="footer"><span>© 2026 Data Cleaner</span><span>Dữ liệu của bạn luôn được bảo mật <i className="lock-dot">◆</i></span><a href="#help">Trung tâm trợ giúp</a></footer>
        </div>
      </main>
      <AccountDialog open={accountOpen} user={user} onClose={() => setAccountOpen(false)} onSignOut={onSignOut}/>
      <dialog ref={deleteDialog} className="delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { event.preventDefault(); closeDeleteDialog() }}>
        <button type="button" className="delete-dialog-close" aria-label="Đóng xác nhận xóa" disabled={deleting} onClick={closeDeleteDialog}><Icon name="close" size={23}/></button>
        <h2 id="delete-title">Bạn có muốn xóa tệp <span>{pendingDelete?.file.name}</span> không?</h2>
        <p id="delete-description">Thao tác này là vĩnh viễn.<br/>Không thể khôi phục tệp đã xóa.</p>
        {deleting && <div className="delete-progress" role="status"><span>Đang xóa tệp…</span><div role="progressbar" aria-label="Đang xóa tệp" className="delete-progress-track"><span/></div></div>}
        <div className="delete-dialog-actions">
          <button type="button" className="cancel-delete-button" autoFocus disabled={deleting} onClick={closeDeleteDialog}>Hủy</button>
          <button type="button" className="confirm-delete-button" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Đang xóa…' : 'Xóa'}</button>
        </div>
      </dialog>
    </div>
  )
}
