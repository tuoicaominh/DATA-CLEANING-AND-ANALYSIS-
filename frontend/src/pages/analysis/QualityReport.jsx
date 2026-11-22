import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/common/Icon.jsx'
import { downloadSuspiciousRecords, getCleanedFileQuality } from '../../modules/dashboard/data/serverFileStorage.js'
import './suspicious-records.css'

const pageSize = 25
const issueNames = {
  MISSING_VALUE: 'Thiếu giá trị',
  DUPLICATE_ROW: 'Dòng trùng lặp',
  EXTRA_WHITESPACE: 'Khoảng trắng cần chuẩn hóa',
  TYPE_MISMATCH: 'Sai kiểu dữ liệu',
}
const number = new Intl.NumberFormat('vi-VN')
const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumSignificantDigits: 3 })

function OriginalValue({ value }) {
  const text = JSON.stringify(value)
  if ((value !== null && typeof value === 'object') || text?.length > 160) {
    return (
      <details className="record-value-details">
        <summary>{value !== null && typeof value === 'object' ? 'Xem giá trị theo trường' : 'Xem toàn bộ giá trị'}</summary>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </details>
    )
  }
  return <code className="record-value">{text ?? '—'}</code>
}

export default function QualityReport({ file, showRecords = false, onClose }) {
  const [page, setPage] = useState(0)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const title = useRef(null)
  const total = report?.suspicious_total ?? 0

  useEffect(() => {
    if (showRecords) title.current?.focus()
  }, [showRecords])

  useEffect(() => {
    const controller = new AbortController()
    getCleanedFileQuality(file.job_id, page * pageSize, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setReport(data) })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [file.job_id, page, retry])

  function loadPage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  async function downloadRecords() {
    setDownloading(true)
    setDownloadError('')
    try {
      const { blob, filename } = await downloadSuspiciousRecords(file.job_id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (failure) {
      setDownloadError(failure.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className={`quality-report ${showRecords ? '' : 'analysis-summary'}`} id={showRecords ? 'suspicious-records' : undefined} aria-labelledby="quality-report-title">
      <header className="quality-report-header">
        <div>
          <h2 id="quality-report-title" ref={title} tabIndex={showRecords ? -1 : undefined}>
            {showRecords ? 'Bản ghi đáng ngờ' : 'Báo cáo chất lượng dữ liệu'}
          </h2>
          {showRecords ? <p>Tệp nguồn <strong>{file.source_name}</strong> · Trước khi làm sạch</p> : (
            <>
              <p>{file.name}</p>
            </>
          )}
        </div>
        <div className="quality-report-actions">
          {showRecords && (
            <button className="quality-button" type="button" disabled={!total || downloading} onClick={downloadRecords}>
              {downloading ? 'Đang tải…' : 'Tải bản ghi đáng ngờ (Excel)'}
            </button>
          )}
          {onClose && <button className="quality-button" type="button" onClick={onClose}>Đóng</button>}
        </div>
      </header>
      {downloadError && <p className="cleaned-files-message" role="alert">{downloadError}</p>}
      {error && (
        <div className="cleaned-files-message">
          <p role="alert">{error}</p>
          <button className="quality-button" type="button" onClick={() => {
            setError('')
            setLoading(true)
            setRetry((value) => value + 1)
          }}>Thử lại</button>
        </div>
      )}
      {loading && <p className="cleaned-files-message" role="status">Đang tải báo cáo…</p>}
      {report && !showRecords && (
        report.quality_issues.length === 0 ? <p>Không phát hiện vấn đề theo các quy tắc kiểm tra hiện tại.</p> : (
          <div className="files-table-scroll">
            <table className="files-table analysis-issues-table" aria-label="Vấn đề chất lượng">
              <thead><tr><th scope="col">Vấn đề</th><th scope="col">Phạm vi</th><th scope="col">Số bản ghi</th><th scope="col">Tỷ lệ</th></tr></thead>
              <tbody>{report.quality_issues.map((issue) => (
                <tr key={issue.id}>
                  <td>{issueNames[issue.issue_type] || issue.issue_type}{issue.expected_type ? ` · ${issue.expected_type}` : ''}</td>
                  <td>{issue.column_name ?? 'Toàn bộ dòng'}</td>
                  <td>{number.format(issue.issue_count)}</td>
                  <td>
                    <span className="analysis-rate">{percent.format(issue.issue_rate)}</span>
                    <progress className="analysis-rate-bar" max={1} value={issue.issue_rate} aria-hidden="true"/>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )
      )}
      {report && showRecords && !loading && !error && (
        total === 0 ? (
          <div className="records-banner records-banner-clear">
            <Icon name="check-circle" size={23}/>
            <div><strong>Không có bản ghi đáng ngờ</strong><p>Không có phát hiện trong danh sách kiểm tra chi tiết.</p></div>
          </div>
        ) : (
          <>
            <div className="records-banner">
              <Icon name="warning" size={23}/>
              <div>
                <strong>{number.format(total)} phát hiện cần xem xét</strong>
                <p>Đang xem {number.format(page * pageSize + 1)}–{number.format(page * pageSize + report.suspicious_records.length)} trên {number.format(total)}. Số thứ tự bản ghi nguồn bắt đầu từ 1, bỏ qua dòng tiêu đề.</p>
              </div>
            </div>
            <ul className="records-list" aria-label="Chi tiết bản ghi đáng ngờ">
              {report.suspicious_records.map((record) => (
                <li className="record-item" key={record.id}>
                  <div>
                    <h3>Bản ghi nguồn #{number.format(record.source_row_number)}</h3>
                    <p>{record.column_name ? <>Cột <strong>{record.column_name}</strong></> : 'Toàn bộ dòng'}</p>
                  </div>
                  <div>
                    <strong className="record-issue">{issueNames[record.issue_type] || record.issue_type}</strong>
                    <p>{record.reason}</p>
                  </div>
                  <div>
                    <p className="record-value-label">Giá trị gốc</p>
                    <OriginalValue value={record.original_value}/>
                  </div>
                </li>
              ))}
            </ul>
            {total > pageSize && <nav className="quality-pagination" aria-label="Trang bản ghi đáng ngờ">
              <button className="quality-button" type="button" disabled={page === 0} onClick={() => loadPage(page - 1)}>Trang trước</button>
              <span>Trang {number.format(page + 1)} / {number.format(Math.ceil(report.suspicious_total / pageSize))}</span>
              <button className="quality-button" type="button" disabled={(page + 1) * pageSize >= report.suspicious_total} onClick={() => loadPage(page + 1)}>Trang sau</button>
            </nav>}
          </>
        )
      )}
    </section>
  )
}
