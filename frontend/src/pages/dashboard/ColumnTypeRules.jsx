import { useState } from 'react'

export default function ColumnTypeRules({ hasFile, profile, open, onOpenChange, retry, setColumnType }) {
  const [query, setQuery] = useState('')

  if (!hasFile) {
    return <p className="column-type-status"><strong>Kiểu dữ liệu yêu cầu</strong> · Bấm “Làm sạch” cạnh một tệp để xem và chỉnh kiểu từng cột.</p>
  }
  if (!profile) return <p className="column-type-status" role="status">Đang gợi ý kiểu dữ liệu…</p>
  if (profile.error) {
    return <p className="column-type-status" role="alert">{profile.error} <button className="dashboard-text-button" type="button" onClick={retry}>Thử lại</button></p>
  }
  if (!profile.columns.length) return <p className="column-type-status">Không có cột để kiểm tra.</p>

  const search = query.trim().toLocaleLowerCase('vi')
  const visible = profile.columns.filter(({ column_name }) => column_name.toLocaleLowerCase('vi').includes(search))
  const enabled = Object.values(profile.types).filter(Boolean).length

  return (
    <details className="column-type-rules" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
      <summary>
        <strong>Kiểu dữ liệu yêu cầu</strong>
        <span className="column-type-count">{enabled}/{profile.columns.length} cột được kiểm tra</span>
      </summary>
      <div className="column-type-editor">
        <input type="search" aria-label="Tìm theo tên cột" placeholder="Tìm theo tên cột…" value={query} onChange={(event) => setQuery(event.target.value)}/>
        {visible.length ? (
          <div className="column-type-list" role="region" aria-label="Danh sách kiểu dữ liệu theo cột" tabIndex={0}>
            {visible.map(({ id, column_name }) => (
              <label key={id}>
                <span>{column_name}</span>
                <select value={profile.types[column_name]} onChange={(event) => setColumnType(column_name, event.target.value)}>
                  <option value="">Bỏ qua</option>
                  <option value="VARCHAR">VARCHAR · Văn bản</option>
                  <option value="INTEGER">INTEGER · Số nguyên</option>
                  <option value="DECIMAL">DECIMAL · Số thập phân</option>
                  <option value="DATE">DATE · dd/MM/yyyy</option>
                  <option value="BOOLEAN">BOOLEAN · true/false</option>
                </select>
              </label>
            ))}
          </div>
        ) : <p role="status">Không tìm thấy cột phù hợp.</p>}
      </div>
    </details>
  )
}
