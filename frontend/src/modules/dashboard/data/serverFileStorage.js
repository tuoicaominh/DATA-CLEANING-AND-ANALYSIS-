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
    if (typeof error.detail === 'string' && error.detail !== 'Internal Server Error') {
      throw Object.assign(new Error(error.detail), { status: response.status })
    }
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

export function listFileColumnTypes(fileId, signal) {
  return api(`/${encodeURIComponent(fileId)}/columns?suggest_types=true`, { signal })
}

export async function saveFiles(_owner, items) {
  const token = sessionStorage.getItem('access_token')
  const saved = []
  const rejected = []
  for (const item of items) {
    try {
      const row = await api(`/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.file.name)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: item.file,
      }, token)
      saved.push(toItem(row))
    } catch (error) {
      if (error.status !== 409) throw error
      rejected.push(`${item.file.name} — ${error.message}`)
    }
  }
  return { saved, rejected }
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
  return downloadPayload(response, 'cleaned-data')
}

async function downloadPayload(response, fallbackName) {
  const disposition = response.headers.get('Content-Disposition') || ''
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  return {
    blob: await response.blob(),
    filename: encodedName ? decodeURIComponent(encodedName) : plainName || fallbackName,
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

export async function discardProcessingJob(jobId, token) {
  await request(`/processing-jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' }, token)
}


export async function listCleanedFiles(signal) {
  const response = await request('/cleaned-files', { signal })
  return response.json()
}

export async function deleteCleanedFile(jobId) {
  await request(`/cleaned-files/${encodeURIComponent(jobId)}`, { method: 'DELETE' })
}

export async function getCleanedFileQuality(jobId, offset, signal) {
  const response = await request(`/analysis/cleaned-files/${encodeURIComponent(jobId)}/quality?offset=${offset}`, { signal })
  return response.json()
}

export async function downloadSuspiciousRecords(jobId) {
  const response = await request(`/analysis/cleaned-files/${encodeURIComponent(jobId)}/quality?format=xlsx`)
  const contentType = response.headers.get('Content-Type')?.split(';')[0]
  if (contentType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    throw new Error('Máy chủ chưa trả về tệp Excel. Hãy cập nhật backend rồi thử tải lại.')
  }
  const download = await downloadPayload(response, 'ban-ghi-dang-ngo.xlsx')
  const signature = new Uint8Array(await download.blob.slice(0, 4).arrayBuffer())
  if (signature.length !== 4 || signature[0] !== 0x50 || signature[1] !== 0x4b ||
      signature[2] !== 0x03 || signature[3] !== 0x04) {
    throw new Error('Tệp Excel từ máy chủ không hợp lệ. Hãy thử tải lại.')
  }
  return download
}
