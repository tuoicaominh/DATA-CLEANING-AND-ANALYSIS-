import { useRef, useState } from 'react'
import { Icon } from '../../components/common/Icon.jsx'
import QualityReport from '../analysis/QualityReport.jsx'
import { useCleanedFiles } from './useCleanedFiles.js'
import './cleaned-files.css'

const completedAt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export default function CleanedFiles() {
  const { files, loadFailed, loadError, downloadError, downloadingJob, download, retry, deleting, deleteError, setDeleteError, remove } = useCleanedFiles()
  const [target, setTarget] = useState(null)
  const [notice, setNotice] = useState('')
  const [suspiciousJob, setSuspiciousJob] = useState(null)
  const deleteDialog = useRef(null)
  const suspiciousTrigger = useRef(null)
  const suspiciousFile = files?.find((file) => file.job_id === suspiciousJob)

  function closeSuspiciousRecords() {
    setSuspiciousJob(null)
    suspiciousTrigger.current?.focus()
  }

  function askDelete(file) {
    setDeleteError('')
    setTarget(file)
    deleteDialog.current.showModal()
  }

  async function confirmDelete() {
    if (await remove(target.job_id)) {
      setNotice(`Đã xóa ${target.name}.`)
      if (suspiciousJob === target.job_id) setSuspiciousJob(null)
      deleteDialog.current?.close()
    }
  }

  return (
    <main className="main-content cleaner-home" id="cleaned-files">
      <div className="page-wrap cleaned-library">
        <header className="cleaned-library-header">
          <span className="cleaned-library-icon"><Icon name="format" size={26}/></span>
          <div>
            <h1>Tệp đã làm sạch</h1>
            {files && <p>{files.length.toLocaleString('vi-VN')} tệp kết quả</p>}
          </div>
          <a href="#overview" className="cleaned-new-link"><Icon name="clean" size={17}/>Làm sạch tệp</a>
        </header>
        <section className="cleaned-library-panel" aria-label="Tệp kết quả">
          {loadFailed ? (
            <div className="cleaned-files-message">
              {loadError && <p role="alert">{loadError}</p>}
              <button type="button" className="primary-button" onClick={retry}>Thử lại</button>
            </div>
          ) : files === null ? (
            <p className="cleaned-files-message" role="status">Đang tải danh sách tệp…</p>
          ) : files.length === 0 ? (
            <div className="cleaned-files-message">
              <p>Bạn chưa có tệp đã làm sạch.</p>
            </div>
          ) : (
            <ul className="cleaned-result-list" aria-label="Danh sách tệp đã làm sạch">
                  {files.map((file) => (
                    <li className="cleaned-result" key={file.job_id}>
                      <div className="cleaned-result-file">
                        <span className="cleaned-result-format"><Icon name="file" size={20}/>{file.file_format?.toUpperCase()}</span>
                        <div className="cleaned-result-details">
                          <h2>{file.name}</h2>
                          <p>Tệp gốc <span>{file.source_name}</span></p>
                          <time dateTime={file.created_at} aria-label="Thời điểm hoàn tất"><Icon name="clock" size={14}/>{completedAt.format(new Date(file.created_at))}</time>
                        </div>
                      </div>
                      <div className="cleaned-file-actions">
                        <a className="cleaned-action" href={`#analysis?job=${file.job_id}`}><Icon name="chart" size={17}/>Chất lượng dữ liệu</a>
                        <button type="button" className="cleaned-action" aria-expanded={suspiciousJob === file.job_id} aria-controls={suspiciousJob === file.job_id ? 'suspicious-records' : undefined} onClick={(event) => {
                          if (suspiciousJob === file.job_id) {
                            closeSuspiciousRecords()
                          } else {
                            suspiciousTrigger.current = event.currentTarget
                            setSuspiciousJob(file.job_id)
                          }
                        }}><Icon name="warning" size={17}/>Bản ghi đáng ngờ</button>
                        <button type="button" className="cleaned-action cleaned-action-primary" disabled={downloadingJob !== null} onClick={() => download(file.job_id)}><Icon name="download" size={17}/>{downloadingJob === file.job_id ? 'Đang tải…' : 'Tải xuống'}</button>
                        <button type="button" className="cleaned-action cleaned-action-delete" aria-label={`Xóa ${file.name}`} title="Xóa tệp" disabled={downloadingJob === file.job_id} onClick={() => askDelete(file)}><Icon name="trash" size={17}/></button>
                      </div>
                    </li>
                  ))}
            </ul>
          )}
          {downloadError && <p className="cleaned-files-message" role="alert">{downloadError}</p>}
          {notice && <p className="cleaned-files-message" role="status">{notice}</p>}
        </section>
        {suspiciousFile && <QualityReport key={suspiciousFile.job_id} file={suspiciousFile} showRecords onClose={closeSuspiciousRecords}/>}
      </div>
      <dialog ref={deleteDialog} className="delete-dialog" aria-labelledby="cleaned-delete-title" onCancel={(event) => { if (deleting) event.preventDefault() }}>
        <h2 id="cleaned-delete-title">Xóa tệp {target?.name}?</h2>
        <p>Tệp kết quả sẽ bị xóa khỏi kho. Bạn vẫn có thể làm sạch lại từ tệp gốc.</p>
        {deleteError && <p role="alert">{deleteError}</p>}
        <div className="delete-dialog-actions">
          <button type="button" className="cancel-delete-button" autoFocus disabled={deleting} onClick={() => deleteDialog.current.close()}>Hủy</button>
          <button type="button" className="confirm-delete-button" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Đang xóa…' : 'Xóa tệp'}</button>
        </div>
      </dialog>
    </main>
  )
}
