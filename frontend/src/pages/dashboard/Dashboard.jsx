import { useEffect, useState } from 'react'
import Analysis from '../analysis/Analysis.jsx'
import CleanedFiles from '../cleaned-files/CleanedFiles.jsx'
import AccountDialog from '../../modules/authentication/AccountDialog.jsx'
import { Icon } from '../../components/common/Icon.jsx'
import { CLEANING_OPTIONS, CLEANING_WAIT_SECONDS, useDashboard } from './useDashboard.js'
import './dashboard.css'

export default function Dashboard({ user, onSignOut }) {
  const {
    fileInput,
    deleteDialog,
    cleaningOptionsRef,
    accountOpen,
    setAccountOpen,
    selectedFiles,
    selectedCleaningOptions,
    cleaningTarget,
    secondsLeft,
    processing,
    processingResult,
    loadingFiles,
    savingFiles,
    dragging,
    notice,
    uploadNotice,
    pendingDelete,
    deleting,
    allCleaningOptionsSelected,
    toggleCleaningOption,
    toggleAllCleaningOptions,
    chooseFileForCleaning,
    runCleaningJob,
    cancelCleaningJob,
    downloadCleanedFile,
    closeDeleteDialog,
    confirmDelete,
    fileKind,
    formatSize,
    dismissNotice,
    showNotifications,
    requestDelete,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
  } = useDashboard(user)

  const [locationHash, setLocationHash] = useState(() => window.location.hash)
  const [page, query] = locationHash.split('?')
  const showCleanedFiles = page === '#cleaned-files'
  const showAnalysis = page === '#analysis'

  useEffect(() => {
    function updatePage() {
      setLocationHash(window.location.hash)
    }
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  if (processing) {
    return (
      <main className="cleaning-wait" aria-labelledby="cleaning-wait-title">
        <div className="cleaning-wait-card">
          <span className="loading-spinner" aria-hidden="true"/>
          <h1 id="cleaning-wait-title">Đang làm sạch tệp</h1>
          <p>{cleaningTarget?.file.name}</p>
          <progress max={CLEANING_WAIT_SECONDS} value={CLEANING_WAIT_SECONDS - secondsLeft} aria-label="Thời gian chờ tối thiểu"/>
          <p role="status">{secondsLeft > 0 ? `Còn ít nhất ${secondsLeft} giây` : 'Đang chờ máy chủ trả kết quả…'}</p>
          <button type="button" className="primary-button" onClick={cancelCleaningJob}>Hủy làm sạch</button>
        </div>
      </main>
    )
  }

  return (
    <div className="app-shell">
      {(uploadNotice || notice) && <div key={uploadNotice?.id || 'notice'} className={`home-notification ${uploadNotice || notice === 'Tệp của bạn đã được xóa.' ? 'is-success' : ''} ${uploadNotice ? 'upload-notification' : ''}`} role="status" aria-live="polite">
        <span className="notification-icon"><Icon name={uploadNotice || notice === 'Tệp của bạn đã được xóa.' ? 'check-circle' : 'bell'} size={25}/></span>
        <span className="notification-copy">{uploadNotice ? <><strong>Đã lưu {uploadNotice.count} tệp</strong><span>{uploadNotice.rejected.length ? `Không tải lên: ${uploadNotice.rejected.join('. ')}` : 'Tệp đã được lưu trên máy chủ.'}</span></> : notice}</span>
        <button type="button" onClick={dismissNotice} aria-label="Đóng thông báo"><Icon name="close" size={19}/></button>
        {uploadNotice && <div className="upload-notification-track" aria-hidden="true"><span/></div>}
      </div>}

      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Data Cleaner trang chủ">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>Data Cleaner</span>
        </a>
        <nav className="nav-list" aria-label="Điều hướng chính">
          <a className={showCleanedFiles || showAnalysis ? "nav-item" : "nav-item active"} href="#overview"><Icon name="grid"/><span>Làm sạch tệp</span></a>
          <a className="nav-item" href="#datasets"><Icon name="table"/><span>Bộ dữ liệu</span><span className="nav-count">{selectedFiles.length}</span></a>
          <a className={showCleanedFiles ? "nav-item active" : "nav-item"} href="#cleaned-files" aria-current={showCleanedFiles ? 'page' : undefined}><Icon name="download"/><span>Tệp đã làm sạch</span></a>
          <a className={showAnalysis ? "nav-item active" : "nav-item"} href="#analysis" aria-current={showAnalysis ? 'page' : undefined}><Icon name="chart"/><span>Phân tích</span></a>
          <a className="nav-item" href="#activity"><Icon name="clock"/><span>Hoạt động</span></a>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row"><div className="avatar">{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</div><div className="profile-copy"><strong>{user?.full_name || user?.email}</strong><span>Gói cá nhân</span></div><button type="button" className="more-button sidebar-signout" onClick={onSignOut} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="logout" size={19}/></button></div>
        </div>
      </aside>

      {showCleanedFiles ? <CleanedFiles/> : showAnalysis ? <Analysis jobId={new URLSearchParams(query).get('job')}/> : <main className="main-content cleaner-home cleaning-dashboard" id="overview">
        <div className="page-wrap cleaned-library">
        <header className="cleaned-library-header dashboard-header">
          <span className="cleaned-library-icon"><Icon name="clean" size={26}/></span>
          <div><h1>Làm sạch dữ liệu</h1><p>Chọn tệp và quy tắc để bắt đầu.</p></div>
          <div className="top-actions">
            <button type="button" className="top-action-button" aria-label="Thông báo" title="Thông báo" onClick={showNotifications}><Icon name="bell" size={25}/></button>
            <button type="button" className="top-action-button account-action" aria-label="Tài khoản của tôi" title={user?.full_name || 'Tài khoản của tôi'} onClick={() => setAccountOpen(true)} aria-haspopup="dialog"><Icon name="user" size={25}/><span>{(user?.full_name || 'U').slice(0, 2).toUpperCase()}</span></button>
          </div>
        </header>

          <section ref={cleaningOptionsRef} tabIndex={-1} className="cleaning-options" aria-labelledby="cleaning-rules-title">
            <div className="dashboard-section-heading">
              <h2 id="cleaning-rules-title">Quy tắc làm sạch</h2>
              <button type="button" className="dashboard-text-button" disabled={processing} onClick={toggleAllCleaningOptions}>
                {allCleaningOptionsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            {CLEANING_OPTIONS.map((option) => {
              const isSelected = selectedCleaningOptions.includes(option.id)
              return <button type="button" key={option.id} className={`cleaning-option ${isSelected ? 'is-selected' : ''}`} aria-pressed={isSelected} disabled={processing} onClick={() => toggleCleaningOption(option.id)}>
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
            </div>
            <div className="cleaning-run-actions">
              <button
                type="button"
                className="primary-button"
                disabled={processing || deleting}
                onClick={runCleaningJob}
              >
                <Icon name="broom" size={18}/>{processing ? 'Đang làm sạch…' : 'Bắt đầu làm sạch'}
              </button>
              {processingResult?.status === 'COMPLETED' && <button type="button" className="download-cleaned-button" onClick={downloadCleanedFile}><Icon name="download" size={18}/>Tải file kết quả</button>}
              {processingResult?.status === 'COMPLETED' && <span className="processing-job-id">Job #{processingResult.id} · {processingResult.output_file?.name}</span>}
            </div>
          </section>

          <section className="upload-section" aria-label="Tải và quản lý tệp">
            <div className="files-panel" id="datasets">
              <div className="files-toolbar">
                <div className="dashboard-dataset-heading"><h2>Bộ dữ liệu</h2><p>{selectedFiles.length.toLocaleString('vi-VN')} tệp nguồn</p></div>
                <button type="button" className="primary-button files-upload-button" disabled={loadingFiles || savingFiles} onClick={() => fileInput.current?.click()}><Icon name="upload" size={18}/>{savingFiles ? 'Đang lưu tệp…' : 'Tải tệp lên'}</button>
              </div>
              <div className="files-table-scroll">
                <table className="files-table" aria-label="Tất cả tập tin">
                  <thead><tr><th scope="col">Tên</th><th scope="col">Kích cỡ</th><th scope="col">Hoạt động gần nhất</th><th scope="col"><span className="visually-hidden">Thao tác</span></th></tr></thead>
                  <tbody>
                    {selectedFiles.map((item) => <tr key={item.id} className={cleaningTarget?.id === item.id ? 'is-cleaning-target' : ''}>
                      <td><span className="files-name"><span className={`files-icon ${fileKind(item.file.name)}`} aria-hidden="true"><Icon name="file" size={22}/><small>{fileKind(item.file.name) === 'excel' ? 'XLS' : fileKind(item.file.name).toUpperCase()}</small></span><span title={item.file.name}>{item.file.name}</span></span></td>
                      <td>{formatSize(item.file.size)}</td>
                      <td><time dateTime={item.addedAt.toISOString()}>{item.addedAt.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></td>
                      <td><div className="file-row-actions"><button type="button" className={`clean-file-button ${cleaningTarget?.id === item.id ? 'is-selected' : ''}`} aria-pressed={cleaningTarget?.id === item.id} aria-label={`Chọn ${item.file.name} để làm sạch`} disabled={processing} onClick={() => chooseFileForCleaning(item)}><Icon name="broom" size={16}/>{cleaningTarget?.id === item.id ? 'Đã chọn' : 'Làm sạch'}</button><button type="button" className="delete-file-button" disabled={deleting || processing} aria-label={`Xóa ${item.file.name}`} onClick={(event) => requestDelete(item, event.currentTarget)}><Icon name="close" size={16}/>Xóa</button></div></td>
                    </tr>)}
                    {!selectedFiles.length && <tr><td colSpan={4} className="files-empty">{loadingFiles ? 'Đang tải danh sách tệp…' : 'Chưa có tệp tin. Tải lên tệp đầu tiên của bạn.'}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              <div className="clean-file-art" aria-hidden="true">
                <span className="file-sheet sheet-back"/>
                <span className="file-sheet sheet-front"><Icon name="file" size={40}/><span>Clean</span></span>
                <span className="clean-badge">✓</span>
              </div>
              <button type="button" className="primary-button upload-file-button" disabled={loadingFiles || savingFiles} onClick={() => fileInput.current?.click()}><Icon name="upload" size={20}/>{savingFiles ? 'ĐANG LƯU TỆP…' : 'TẢI LÊN TỆP TIN CỦA BẠN'}</button>
              <p className="drop-hint">hoặc kéo thả tệp của bạn vào đây</p>
              <div className="file-rules">Hỗ trợ định dạng XLS, XLSX, JSON, CSV. Dung lượng tối đa 50 MB mỗi tệp.</div>
              <input ref={fileInput} className="hidden-input" type="file" accept=".csv,.xls,.xlsx,.json" multiple onChange={handleFileInput}/>
            </div>
          </section>

        </div>
      </main>}

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
