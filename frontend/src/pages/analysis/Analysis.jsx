import { Icon } from '../../components/common/Icon.jsx'
import { useCleanedFiles } from '../cleaned-files/useCleanedFiles.js'
import QualityReport from './QualityReport.jsx'
import ColumnStatistics from './ColumnStatistics.jsx'
import './analysis.css'

const completedAt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export default function Analysis({ jobId }) {
  const { files, loadFailed, loadError, retry } = useCleanedFiles()
  const selected = files?.find((file) => String(file.job_id) === jobId)

  return (
    <main className="main-content cleaner-home analysis-page" id="analysis">
      <div className="page-wrap cleaned-library">
        <header className="cleaned-library-header">
          <span className="cleaned-library-icon"><Icon name="chart" size={26}/></span>
          <div><h1>Phân tích dữ liệu</h1><p>Xem chất lượng tệp nguồn và thống kê tệp đã làm sạch.</p></div>
          <a className="cleaned-new-link" href="#cleaned-files"><Icon name="file" size={17}/>Tệp đã làm sạch</a>
        </header>
        <div className="analysis-workspace">
        <div className="analysis-sidebar">
        <section className="analysis-picker" aria-labelledby="analysis-picker-title">
          <h2 id="analysis-picker-title"><Icon name="file" size={20}/>Chọn tệp phân tích</h2>
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
              <select value={selected?.job_id ?? ''} onChange={(event) => {
                const id = event.target.value
                window.location.hash = id ? `#analysis?job=${id}` : '#analysis'
              }}>
                <option value="">Chọn tệp</option>
                {files.map((file) => (
                  <option key={file.job_id} value={file.job_id}>
                    {file.name} · {completedAt.format(new Date(file.created_at))}
                  </option>
                ))}
              </select>
            </label>
          )}
          {files?.length > 0 && jobId && !selected && <p role="status">Không tìm thấy tệp kết quả đã chọn.</p>}
          {selected && (
            <dl className="analysis-file-meta">
              <div><dt>Tệp nguồn</dt><dd>{selected.source_name}</dd></div>
              <div><dt>Hoàn tất lúc</dt><dd><time dateTime={selected.created_at}>{completedAt.format(new Date(selected.created_at))}</time></dd></div>
            </dl>
          )}
        </section>
        {selected && <QualityReport key={selected.job_id} file={selected}/>}
        </div>
        {selected ? (
          <ColumnStatistics key={selected.job_id} jobId={selected.job_id}/>
        ) : (
          <section className="analysis-placeholder" aria-labelledby="analysis-placeholder-title">
            <span><Icon name="chart" size={29}/></span>
            <h2 id="analysis-placeholder-title">Khám phá dữ liệu</h2>
            {files?.length > 0 && <p>Chọn một tệp để xem biểu đồ phân tích.</p>}
          </section>
        )}
        </div>
      </div>
    </main>
  )
}
