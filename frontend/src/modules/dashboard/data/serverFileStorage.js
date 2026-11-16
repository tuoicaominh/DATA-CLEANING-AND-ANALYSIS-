import { listFiles as listLocalFiles, deleteFile as deleteLocalFile } from './fileStorage.js'

async function api(path, options = {}, token = sessionStorage.getItem('access_token')) {
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.')
  const response = await fetch(`/api/files${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Không thể kết nối kho tệp trên máy chủ. Hãy thử lại.')
  }
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
