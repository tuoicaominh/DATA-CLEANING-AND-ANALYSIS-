import { useEffect, useRef, useState } from 'react'
import AccountDialog from '../../modules/authentication/AccountDialog.jsx'
import { Icon } from '../../components/common/Icon.jsx'
import { createProcessingJob, deleteFile, downloadProcessingOutput, listFiles, migrateLocalFiles, saveFiles } from '../../modules/dashboard/data/serverFileStorage.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const CLEANING_OPTIONS = [
  { id: 'missing', icon: 'missing', label: 'Xử lý giá trị trống' },
  { id: 'duplicates', icon: 'duplicates', label: 'Xử lý trùng dữ liệu' },
  { id: 'format', icon: 'format', label: 'Xử lý sai định dạng dữ liệu' },
]

export default function Dashboard({ user, onSignOut }) {
  const fileInput = useRef(null)
  const deleteDialog = useRef(null)
  const deleteTrigger = useRef(null)
  const cleaningOptionsRef = useRef(null)
  const savingLock = useRef(false)
  const mounted = useRef(true)
  const owner = String(user?.id ?? user?.email ?? '')

  const [accountOpen, setAccountOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedCleaningOptions, setSelectedCleaningOptions] = useState([])
  const [cleaningTarget, setCleaningTarget] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [processingResult, setProcessingResult] = useState(null)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [savingFiles, setSavingFiles] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const [uploadNotice, setUploadNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!uploadNotice) return undefined
    const timer = window.setTimeout(() => setUploadNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [uploadNotice])

  useEffect(() => {
    if (notice) setUploadNotice(null)
  }, [notice])

  useEffect(() => {
    if (pendingDelete) deleteDialog.current?.showModal()
  }, [pendingDelete])

  useEffect(() => {
    let active = true
    setLoadingFiles(true)
    migrateLocalFiles(owner).then(async (warning) => {
      const files = await listFiles()
      if (!active) return
      setSelectedFiles(files)
      if (warning) setNotice(warning)
    }).catch((error) => {
      if (active) setNotice(error.message || 'Không thể tải danh sách tệp từ máy chủ.')
    }).finally(() => {
      if (active) setLoadingFiles(false)
    })
    return () => { active = false }
  }, [owner])

  function toggleCleaningOption(optionId) {
    setProcessingResult(null)
    setSelectedCleaningOptions((current) => current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId])
  }

  function chooseFileForCleaning(item) {
    setCleaningTarget(item)
    setProcessingResult(null)
    window.setTimeout(() => {
      cleaningOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      cleaningOptionsRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  async function runCleaningJob() {
    if (!cleaningTarget || !selectedCleaningOptions.length || processing) return
    setProcessing(true)
    setProcessingResult(null)
    setNotice('')
    try {
      const actions = selectedCleaningOptions.map((id) => ({ type: id === 'missing' ? 'missing_values' : id === 'duplicates' ? 'remove_duplicates' : 'normalize_format', parameters: {} }))
      const result = await createProcessingJob(cleaningTarget.id, actions)
      setProcessingResult(result)
      if (result.status === 'COMPLETED') {
        const affected = result.actions.reduce((total, action) => total + action.affected_rows, 0)
        setNotice(`Làm sạch hoàn tất cho “${cleaningTarget.file.name}”. ${affected} dòng đã được thay đổi hoặc loại bỏ.`)
      }
      else setNotice(result.error_message || 'Không thể làm sạch file đã chọn.')
    } catch (error) {
      setNotice(error.message || 'Không thể tạo processing job.')
    } finally {
      setProcessing(false)
    }
  }

  async function downloadCleanedFile() {
    if (!processingResult?.id) return
    try {
      const { blob, filename } = await downloadProcessingOutput(processingResult.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setNotice(error.message || 'Không tải được file kết quả.')
    }
  }

  async function addFiles(fileList) {
    if (loadingFiles || savingLock.current || !fileList.length) return

    const accepted = []
    const rejected = []
    Array.from(fileList).forEach((file) => {
      if (!/\.(csv|xlsx?|json)$/i.test(file.name)) rejected.push(`${file.name}: định dạng không được hỗ trợ`)
      else if (file.size > MAX_FILE_SIZE) rejected.push(`${file.name}: vượt quá 50 MB`)
      else if (file.size === 0) rejected.push(`${file.name}: file rỗng`)
      else accepted.push(file)
    })

    if (!accepted.length) {
      setNotice(rejected.join('. ') || 'Không có file hợp lệ để tải lên.')
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
      setUploadNotice({ id: crypto.randomUUID(), count: saved.length, rejected })
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
      setCleaningTarget((current) => current?.id === id ? null : current)
      deleteDialog.current?.close()
      setPendingDelete(null)
      setNotice('Tệp của bạn đã được xóa.')
      document.querySelector('.files-upload-button')?.focus()
    } catch (error) {
      if (mounted.current) {
        deleteDialog.current?.close()
        setPendingDelete(null)
        setNotice(error.message || 'Không thể xóa tệp đã lưu. Tệp vẫn được giữ lại; hãy thử lại.')
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
        <span className="notification-copy">{uploadNotice ? <><strong>Đã lưu {uploadNotice.count} tệp</strong><span>{uploadNotice.rejected.length ? `Không tải lên: ${uploadNotice.rejected.join('. ')}` : 'Tệp đã được lưu trên máy chủ.'}</span></> : notice}</span>
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
          <a className="nav-item" href="#datasets"><Icon name="table"/><span>Bộ dữ liệu</span><span className="nav-count">{selectedFiles.length}</span></a>
          <a className="nav-item" href="#analysis"><Icon name="chart"/><span>Phân tích</span></a>
          <a className="nav-item" href="#activity"><Icon name="clock"/><span>Hoạt động</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row"><div className="avatar">{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</div><div className="profile-copy"><strong>{user?.full_name || user?.email}</strong><span>Gói cá nhân</span></div><button type="button" className="more-button sidebar-signout" onClick={onSignOut} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="logout" size={19}/></button></div>
        </div>
      </aside>

      <main className="main-content cleaner-home" id="overview">
        <header className="topbar">
          <h1 className="home-title">Trang chủ</h1>
          <div className="top-actions">
            <button type="button" className="top-action-button" aria-label="Thông báo" title="Thông báo" onClick={() => setNotice('Hiện chưa có thông báo mới.')}><Icon name="bell" size={25}/></button>
            <button type="button" className="top-action-button account-action" aria-label="Tài khoản của tôi" title={user?.full_name || 'Tài khoản của tôi'} onClick={() => setAccountOpen(true)} aria-haspopup="dialog"><Icon name="user" size={25}/><span>{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</span></button>
          </div>
        </header>

        <div className="page-wrap">
          <section ref={cleaningOptionsRef} tabIndex={-1} className="cleaning-options" aria-label="Chức năng làm sạch dữ liệu">
            {CLEANING_OPTIONS.map((option) => {
              const isSelected = selectedCleaningOptions.includes(option.id)
              return <button type="button" key={option.id} className={`cleaning-option ${isSelected ? 'is-selected' : ''}`} aria-pressed={isSelected} onClick={() => toggleCleaningOption(option.id)}>
                <span className={`cleaning-option-icon ${option.id}`}><Icon name={option.icon} size={23}/></span><span>{option.label}</span><span className="cleaning-option-check" aria-hidden="true">{isSelected ? '✓' : '+'}</span>
              </button>
            })}
            <div className="cleaning-selection-status" role="status" aria-live="polite">
              {processingResult
                ? `Job #${processingResult.id}: ${processingResult.status}${processingResult.error_message ? ` — ${processingResult.error_message}` : ''}`
                : cleaningTarget
                  ? `Tệp đang chọn: ${cleaningTarget.file.name}. ${selectedCleaningOptions.length ? `Đã chọn ${selectedCleaningOptions.length} chức năng.` : 'Hãy chọn chức năng.'}`
                  : selectedCleaningOptions.length
                    ? `Đã chọn ${selectedCleaningOptions.length} chức năng. Chọn “Làm sạch” cạnh một file để xác định file áp dụng.`
                    : 'Chọn một hoặc nhiều chức năng, sau đó bấm “Làm sạch” cạnh file cần xử lý.'}
              {selectedCleaningOptions.length > 0 && <button type="button" onClick={() => { setSelectedCleaningOptions([]); setProcessingResult(null) }}>Bỏ chọn tất cả</button>}
            </div>
            <div className="cleaning-run-actions">
              {processingResult?.status === 'COMPLETED' && <button type="button" className="download-cleaned-button" onClick={downloadCleanedFile}><Icon name="download" size={18}/>Tải file kết quả</button>}
              {processingResult?.status === 'COMPLETED' && <span className="processing-job-id">Job #{processingResult.id} · {processingResult.output_file?.name}</span>}
            </div>
          </section>

          <section className="upload-section" aria-label="Tải và quản lý tệp">
            <div className="files-panel" id="datasets">
              <div className="files-toolbar">
                <div className="files-filters" role="group" aria-label="Bộ lọc tệp tin">
                  <span className="files-filter-button is-active"><Icon name="file" size={21}/>Tất cả tệp tin</span>
                </div>
                <button type="button" className="primary-button files-upload-button" disabled={loadingFiles || savingFiles} onClick={() => fileInput.current?.click()}><Icon name="upload" size={18}/>{savingFiles ? 'ĐANG LƯU TỆP…' : 'Tải lên tập tin'}</button>
              </div>
              <div className="files-table-scroll">
                <table className="files-table" aria-label="Tất cả tập tin">
                  <thead><tr><th scope="col">Tên</th><th scope="col">Kích cỡ</th><th scope="col">Hoạt động gần nhất</th><th scope="col"><span className="visually-hidden">Thao tác</span></th></tr></thead>
                  <tbody>
                    {selectedFiles.map((item) => <tr key={item.id} className={cleaningTarget?.id === item.id ? 'is-cleaning-target' : ''}>
                      <td><span className="files-name"><span className={`files-icon ${fileKind(item.file.name)}`} aria-hidden="true"><Icon name="file" size={22}/><small>{fileKind(item.file.name) === 'excel' ? 'XLS' : fileKind(item.file.name).toUpperCase()}</small></span><span title={item.file.name}>{item.file.name}</span></span></td>
                      <td>{formatSize(item.file.size)}</td>
                      <td><time dateTime={item.addedAt.toISOString()}>{item.addedAt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></td>
                      <td><div className="file-row-actions"><button type="button" className={`clean-file-button ${cleaningTarget?.id === item.id ? 'is-selected' : ''}`} aria-pressed={cleaningTarget?.id === item.id} aria-label={`Chọn ${item.file.name} để làm sạch`} onClick={() => chooseFileForCleaning(item)}><Icon name="clean" size={16}/>{cleaningTarget?.id === item.id ? 'Đã chọn' : 'Làm sạch'}</button><button type="button" className="delete-file-button" disabled={deleting} aria-label={`Xóa ${item.file.name}`} onClick={(event) => { deleteTrigger.current = event.currentTarget; setPendingDelete(item) }}><Icon name="close" size={16}/>Xóa</button></div></td>
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
