import { useCleanedFiles } from '../cleaned-files/useCleanedFiles.js'
import QualityReport from './QualityReport.jsx'

export default function Analysis({ jobId }) {
  const { files, loadFailed, loadError, retry } = useCleanedFiles()
  const selected = files?.find((file) => String(file.job_id) === jobId)

  function selectFile(event) {
    const id = event.target.value
    window.location.hash = id ? `#analysis?job=${id}` : '#analysis'
  }

  return (
    <main className="main-content cleaner-home" id="analysis">
      <header className="topbar"><h1 className="home-title">Phân tích dữ liệu</h1></header>
      <div className="page-wrap">
        <section className="quality-report" aria-label="Chọn tệp để phân tích">
          {loadFailed ? (
            <>
              <p role="alert">{loadError || 'Không thể tải danh sách tệp.'}</p>
              <button type="button" className="quality-button" onClick={retry}>Thử lại</button>
            </>
          ) : !files ? (
            <p role="status">Đang tải danh sách tệp…</p>
          ) : !files.length ? (
            <p>Chưa có tệp để phân tích. <a href="#overview">Làm sạch tệp</a></p>
          ) : (
            <label className="analysis-file-field">
              Tệp đã làm sạch
              <select value={selected?.job_id ?? ''} onChange={selectFile}>
                <option value="">Chọn tệp</option>
                {files.map((file) => (
                  <option key={file.job_id} value={file.job_id}>
                    {file.name} · {new Date(file.created_at).toLocaleString('vi-VN')}
                  </option>
                ))}
              </select>
            </label>
          )}
          {files && jobId && !selected && <p role="status">Không tìm thấy tệp kết quả đã chọn.</p>}
        </section>
        {selected && <QualityReport key={selected.job_id} file={selected}/>}
      </div>
    </main>
  )
}
