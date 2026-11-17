import { listFiles as listLocalFiles, deleteFile as deleteLocalFile } from './fileStorage.js'

async function request(apiPath, options = {}, token = sessionStorage.getItem('access_token')) {
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.')
  let response
  try {
    response = await fetch(`/api${apiPath}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('Không thể kết nối API kho tệp. Hãy kiểm tra máy chủ đang chạy.')
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (typeof error.detail === 'string' && error.detail !== 'Internal Server Error') throw new Error(error.detail)
    if (response.status === 404) throw new Error('API không tìm thấy endpoint kho tệp (404). Hãy khởi động lại backend.')
    if (response.status >= 500) throw new Error(`API kho tệp gặp lỗi máy chủ (HTTP ${response.status}).`)
    throw new Error(`Yêu cầu kho tệp thất bại (HTTP ${response.status}).`)
  }
  return response
}

async function api(path, options = {}, token = sessionStorage.getItem('access_token')) {
  const response = await request(`/files${path}`, options, token)
  return response.status === 204 ? null : response.json()
}

function toItem(row) {
  return { id: row.id, file: { name: row.name, size: row.size }, addedAt: new Date(row.created_at) }
}

export async function listFiles() {
  return (await api('')).map(toItem)
}

export async function saveFiles(_owner, items) {
  const token = sessionStorage.getItem('access_token')
  const saved = []
  for (const item of items) {
    const row = await api(`/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.file.name)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: item.file,
    }, token)
    saved.push(toItem(row))
  }
  return saved
}

export function deleteFile(_owner, id) {
  return api(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function createProcessingJob(fileId, actions) {
  return api(`/${encodeURIComponent(fileId)}/processing-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions }),
  })
}

export async function downloadProcessingOutput(jobId) {
  const response = await request(`/processing-jobs/${encodeURIComponent(jobId)}/output`)
  const disposition = response.headers.get('Content-Disposition') || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  return {
    blob: await response.blob(),
    filename: encodedName ? decodeURIComponent(encodedName) : plainName || 'cleaned-data',
  }
}

// One migration per account even under React StrictMode; retry with the same IDs.
const migrations = new Map()
export function migrateLocalFiles(owner) {
  if (!migrations.has(owner)) {
    const token = sessionStorage.getItem('access_token')
    const migration = (async () => {
      let local
      try { local = await listLocalFiles(owner) } catch { return 'Không thể đọc tệp cũ trong trình duyệt để chuyển lên máy chủ.' }
      for (const item of local) {
        try {
          await api(`/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.file.name)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: item.file,
          }, token)
          await deleteLocalFile(owner, item.id)
        } catch {
          return 'Một số tệp cũ chưa chuyển được lên máy chủ. Bản trong trình duyệt vẫn được giữ; tải lại trang để thử lại.'
        }
      }
      return ''
    })().finally(() => migrations.delete(owner))
    migrations.set(owner, migration)
  }
  return migrations.get(owner)
}
