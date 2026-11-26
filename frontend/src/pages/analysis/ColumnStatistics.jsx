import { useEffect, useState } from 'react'
import { Icon } from '../../components/common/Icon.jsx'
import { getCleanedFileComparison, getCleanedFileStatistics } from '../../modules/dashboard/data/serverFileStorage.js'

const number = new Intl.NumberFormat('vi-VN')
const decimal = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 6 })
const detailNumber = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 17 })

function ChartDetail({ items, explanation }) {
  return (
    <section className="chart-detail" aria-live="polite" aria-label="Chi tiết biểu đồ">
      <h4>Chi tiết phần đã chọn</h4>
      {items ? (
        <>
          <p className="chart-detail-explanation">{explanation}</p>
          <dl>{items.map(([label, value], index) => (
            <div key={index}><dt>{label}</dt><dd>{value}</dd></div>
          ))}</dl>
        </>
      ) : <p>Bấm vào một thanh, cột hoặc chấm để xem số liệu của phần đó.</p>}
    </section>
  )
}

function position(value, low, high) {
  if (low === high) return 50
  const scale = Math.max(Math.abs(low), Math.abs(high))
  return 100 * (value / scale - low / scale) / (high / scale - low / scale)
}

function ScatterPlot({ points, extent, x, y }) {
  const [selected, setSelected] = useState(null)
  const point = points[selected]
  const fractions = [0, .25, .5, .75, 1]
  const [xRange, yRange] = extent
  const ticks = ([low, high]) => low === high ? [low] : fractions.map((part) => low * (1 - part) + high * part)

  return (
    <div className="comparison-scatter">
      <span className="comparison-axis-title">{y}</span>
      <div className="comparison-scatter-body">
        <div className="comparison-y-ticks" aria-hidden="true">
          {ticks(yRange).reverse().map((value, index) => <span key={index}>{decimal.format(value)}</span>)}
        </div>
        <div className="comparison-plot" role="group" aria-label={`Biểu đồ phân tán giữa ${x} và ${y}. Dùng phím mũi tên để chuyển điểm.`}>
          {points.map((point, index) => (
            <button key={index} type="button" className="comparison-dot" aria-pressed={selected === index}
              aria-label={`${x}: ${detailNumber.format(point.x)} · ${y}: ${detailNumber.format(point.y)}`}
              tabIndex={(selected ?? 0) === index ? 0 : -1} onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
                if (!direction) return
                event.preventDefault()
                const next = (index + direction + points.length) % points.length
                setSelected(next)
                event.currentTarget.parentElement.children[next].focus()
              }}
              style={{ left: `${position(point.x, ...xRange)}%`, bottom: `${position(point.y, ...yRange)}%` }}/>
          ))}
        </div>
        <div className="comparison-x-ticks" aria-hidden="true">
          {ticks(xRange).map((value, index) => <span key={index}>{decimal.format(value)}</span>)}
        </div>
      </div>
      <span className="comparison-axis-title comparison-x-title">{x}</span>
      <ChartDetail items={point && [[x, detailNumber.format(point.x)], [y, detailNumber.format(point.y)]]}
        explanation={`Hai giá trị dưới đây lấy từ cùng một dòng trong tệp. ${x} là giá trị trên trục ngang và ${y} là giá trị trên trục dọc.`}/>
    </div>
  )
}

function BarPlot({ points, kind, names, numericAxis }) {
  const [selected, setSelected] = useState(null)
  const point = points[selected]
  const average = kind === 'average'
  const valueLabel = average ? `Trung bình ${names[numericAxis]}` : `Số mã ${names[numericAxis]} khác nhau`
  const formatValue = (value) => average ? decimal.format(value) : number.format(value)
  const items = point && (point.count !== undefined
    ? [[names[1 - numericAxis], point.label], [valueLabel, formatValue(point.value)], ['Số dòng dùng để tính', number.format(point.count)]]
    : [[names[0], point.label], [names[1], point.second_label], ['Số dòng có cặp giá trị này', number.format(point.value)]])
  let explanation
  if (point) {
    if (average) {
      explanation = `Trong nhóm ${point.label}, giá trị trung bình của ${names[numericAxis]} là ${formatValue(point.value)}, tính từ ${number.format(point.count)} dòng.`
    } else if (kind === 'distinct') {
      explanation = `Trong ${number.format(point.count)} dòng thuộc nhóm ${point.label}, có ${formatValue(point.value)} mã ${names[numericAxis]} khác nhau. Mỗi mã được tính một lần trong nhóm này.`
    } else {
      explanation = `Có ${number.format(point.value)} dòng cùng có ${names[0]} là ${point.label} và ${names[1]} là ${point.second_label}.`
    }
  }
  const low = Math.min(0, ...points.map((point) => point.value))
  const high = Math.max(0, ...points.map((point) => point.value))
  const zero = low === high ? 0 : position(0, low, high)

  return (
    <>
    <ul className="comparison-bars">
      {points.map((point, index) => {
        const end = low === high ? 0 : position(point.value, low, high)
        return (
          <li key={index}>
            <button type="button" className="comparison-bar-button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <span className="comparison-bar-label">{point.label}{point.second_label !== undefined && <small>{point.second_label}</small>}</span>
            <span className="comparison-track" aria-hidden="true">
              <span className="comparison-zero" style={{ left: `${zero}%` }}/>
              <span className="comparison-bar" style={{ left: `${Math.min(zero, end)}%`, width: `${Math.abs(end - zero)}%` }}/>
            </span>
            <span className="comparison-bar-value">
              {formatValue(point.value)}
              {point.count !== undefined && <small>{number.format(point.count)} dòng</small>}
            </span>
            </button>
          </li>
        )
      })}
    </ul>
    <ChartDetail items={items} explanation={explanation}/>
    </>
  )
}

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`

function HourlyChart({ data, groupName }) {
  const [selected, setSelected] = useState('')
  const [selectedHour, setSelectedHour] = useState(null)
  const [metric, setMetric] = useState(data.prefer_distinct ? 'distinct' : 'rows')
  const distinct = metric === 'distinct' && Array.isArray(data.hour_distinct)
  const group = selected === '' ? null : data.points[Number(selected)]
  const rowCounts = group?.hours ?? data.hour_totals
  const counts = distinct ? data.hour_distinct : rowCounts
  const unit = distinct ? 'giá trị khác nhau' : 'dòng'
  const peak = Math.max(...counts)
  const peakHours = counts.flatMap((count, hour) => count === peak ? [hour] : [])
  const peakHour = peakHours[0]
  const hourRange = selectedHour === null ? '' : `${hourLabel(selectedHour)}–${hourLabel(selectedHour + 1)}`
  const hourExplanation = selectedHour === null ? '' : (
    `Tính trên tất cả các ngày trong tệp, khung ${hourRange} có ${number.format(rowCounts[selectedHour])} dòng ${group ? `có ${groupName} là ${group.label}` : `gộp chung mọi giá trị ${groupName}`}.`
    + (distinct
      ? ` Các dòng này chứa ${number.format(counts[selectedHour])} giá trị ${groupName} khác nhau. Giá trị lặp trong khung giờ này được tính một lần.`
      : ' Mỗi dòng được tính một lần, kể cả khi trùng mã hoặc giá trị.')
  )

  return (
    <>
      <label className="analysis-file-field hourly-filter">
        Lọc theo {groupName}
        <select value={selected} disabled={distinct} onChange={(event) => {
          setSelected(event.target.value)
          setSelectedHour(null)
        }}>
          <option value="">Tất cả giá trị</option>
          {data.points.map((point, index) => <option key={index} value={index}>{point.label}</option>)}
        </select>
      </label>
      {Array.isArray(data.hour_distinct) && (
        <label className="analysis-file-field hourly-filter">
          Cách tính theo giờ
          <select value={metric} onChange={(event) => {
            setMetric(event.target.value)
            setSelected('')
          }}>
            <option value="rows">Đếm số dòng</option>
            <option value="distinct">Đếm giá trị {groupName} khác nhau</option>
          </select>
        </label>
      )}
      {!distinct && data.groups > data.points.length && <p className="comparison-caption">Có thể xem riêng {data.points.length} giá trị xuất hiện nhiều nhất.</p>}
      <p className="comparison-insight" aria-live="polite">
        {group ? <strong>{group.label}</strong> : 'Toàn bộ dữ liệu đang xem'} đạt mức cao nhất từ{' '}
        <strong>{hourLabel(peakHour)} đến {hourLabel(peakHour + 1)}</strong> ({number.format(peak)} {unit}).
        {peakHours.length > 1 && ` Có thêm ${number.format(peakHours.length - 1)} khung giờ cùng mức này.`}
      </p>
      <p className="comparison-caption">{distinct ? `Mỗi giá trị ${groupName} được tính một lần trong mỗi khung giờ.` : `Số dòng theo giờ · Tổng cộng ${number.format(group?.value ?? data.complete)} dòng`}</p>
      <ol className="hourly-bars" aria-label="Số liệu trong từng khung giờ">
        {counts.map((count, hour) => (
          <li key={hour}>
            <button type="button" className="hourly-bar-button" aria-pressed={selectedHour === hour}
              aria-label={`${hourLabel(hour)} đến ${hourLabel(hour + 1)}, ${number.format(count)} ${unit}`}
              onClick={() => setSelectedHour(hour)}>
            <span className="hourly-bar-track" aria-hidden="true">
              <span className={count === peak ? 'hourly-bar is-peak' : 'hourly-bar'} style={{ height: `${100 * count / peak}%` }}/>
            </span>
            <span className="hourly-tick" aria-hidden="true">{hour % 4 === 0 ? hourLabel(hour) : ''}</span>
            </button>
          </li>
        ))}
      </ol>
      <ChartDetail explanation={hourExplanation} items={selectedHour !== null && [
        ['Khung giờ', hourRange],
        [`Bộ lọc ${groupName}`, group?.label ?? 'Tất cả giá trị'],
        ['Số dòng', number.format(rowCounts[selectedHour])],
        ...(distinct ? [[`Số giá trị ${groupName} khác nhau`, number.format(counts[selectedHour])]] : []),
      ]}/>
    </>
  )
}

export default function ColumnStatistics({ jobId }) {
  const [columns, setColumns] = useState(null)
  const [selection, setSelection] = useState([])
  const [metadataError, setMetadataError] = useState('')
  const [metadataAttempt, setMetadataAttempt] = useState(0)
  const [comparison, setComparison] = useState(null)
  const [chartAttempt, setChartAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCleanedFileStatistics(jobId, controller.signal)
      .then(({ columns: items }) => {
        if (controller.signal.aborted) return
        setColumns(items)
        setSelection(items.slice(0, 2).map(({ column_id }) => String(column_id)))
      })
      .catch((error) => { if (!controller.signal.aborted) setMetadataError(error.message) })
    return () => controller.abort()
  }, [jobId, metadataAttempt])

  const [x, y] = selection
  const requestKey = `${x}/${y}/${chartAttempt}`
  const current = comparison?.key === requestKey ? comparison : null
  useEffect(() => {
    if (!x || !y) return
    const controller = new AbortController()
    getCleanedFileComparison(jobId, x, y, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setComparison({ key: requestKey, data }) })
      .catch((error) => { if (!controller.signal.aborted) setComparison({ key: requestKey, error: error.message }) })
    return () => controller.abort()
  }, [jobId, x, y, requestKey])

  function selectColumn(index, value) {
    setComparison(null)
    setSelection(selection.map((id, position) => position === index ? value : id))
  }

  const data = current?.data
  const names = selection.map((id) => columns?.find((column) => String(column.column_id) === id)?.column_name)
  const title = data?.kind === 'hourly' ? `${names[1 - data.time_axis]} theo giờ trong ngày`
    : data?.kind === 'scatter' ? 'Phân bố của hai cột'
    : data?.kind === 'average' ? `Trung bình ${names[data.numeric_axis]} theo ${names[1 - data.numeric_axis]}`
    : data?.kind === 'distinct' ? `Số mã ${names[data.numeric_axis]} khác nhau theo ${names[1 - data.numeric_axis]}`
      : 'Số dòng theo cặp giá trị'

  return (
    <section className="analysis-summary column-comparison" aria-labelledby="column-comparison-title">
      <header className="comparison-heading">
        <span className="comparison-icon"><Icon name="chart" size={23}/></span>
        <div>
          <h2 id="column-comparison-title">Khám phá dữ liệu</h2>
          <p>Chọn hai cột để xem chúng thay đổi cùng nhau ra sao.</p>
        </div>
      </header>
      {metadataError ? (
        <div role="alert">{metadataError} <button type="button" className="quality-button" onClick={() => {
          setMetadataError('')
          setMetadataAttempt(metadataAttempt + 1)
        }}>Thử lại</button></div>
      ) : !columns ? <p role="status">Đang tải danh sách cột…</p>
        : columns.length < 2 ? <p>Cần ít nhất hai cột để tạo biểu đồ.</p> : (
          <>
            <div className="comparison-controls">
              {selection.map((id, index) => (
                <label className="analysis-file-field" key={index}>
                  {index === 0 ? 'Cột thứ nhất' : 'Cột thứ hai'}
                  <select value={id} onChange={(event) => selectColumn(index, event.target.value)}>
                    {columns.map((item) => (
                      <option key={item.column_id} value={item.column_id} disabled={String(item.column_id) === selection[1 - index]}>
                        {item.column_name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="comparison-panel" aria-busy={!current}>
              {current?.error ? (
                <div role="alert">{current.error} <button type="button" className="quality-button" onClick={() => setChartAttempt(chartAttempt + 1)}>Thử lại</button></div>
              ) : !data ? <p role="status">Đang vẽ biểu đồ…</p> : (
                <>
                  <h3>{title}</h3>
                  <p className="comparison-caption">
                    {number.format(data.complete)} / {number.format(data.total)} dòng có đủ hai giá trị
                    {data.kind === 'scatter' && data.points.length < data.complete && ` · Hiển thị ${number.format(data.points.length)} điểm mẫu`}
                    {data.kind !== 'hourly' && data.groups > data.points.length && ` · Hiển thị ${data.points.length} / ${number.format(data.groups)} nhóm ${data.kind === 'distinct' ? 'có nhiều mã khác nhau nhất' : 'có nhiều dòng nhất'}`}
                  </p>
                  {!data.points.length ? <p>Không có dòng nào đủ dữ liệu ở cả hai cột.</p>
                    : data.kind === 'hourly' ? <HourlyChart key={requestKey} data={data} groupName={names[1 - data.time_axis]}/>
                    : data.kind === 'scatter' ? (
                      <>
                        <p className="comparison-insight">Mỗi chấm là một dòng dữ liệu. Đọc <strong>{names[0]}</strong> theo chiều ngang và <strong>{names[1]}</strong> theo chiều dọc.</p>
                        <ScatterPlot points={data.points} extent={data.extent} x={names[0]} y={names[1]}/>
                      </>
                    ) : (
                      <>
                        <p className="comparison-insight">{data.kind === 'average'
                          ? 'Mỗi thanh là giá trị trung bình của một nhóm. Số dòng của nhóm nằm bên dưới giá trị.'
                          : data.kind === 'distinct' ? 'Trong mỗi nhóm, một mã xuất hiện nhiều lần vẫn được tính một lần. Bấm vào thanh để xem số mã và số dòng.'
                          : <>Cặp xuất hiện nhiều nhất là <strong>{data.points[0].label} và {data.points[0].second_label}</strong> ({number.format(data.points[0].value)} dòng).</>}
                        </p>
                        <BarPlot points={data.points} kind={data.kind} names={names} numericAxis={data.numeric_axis}/>
                      </>
                    )}
                </>
              )}
            </div>
          </>
        )}
    </section>
  )
}
