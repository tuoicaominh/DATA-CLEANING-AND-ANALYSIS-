let databasePromise

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('data-cleaner-files', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('files', { keyPath: ['owner', 'id'] })
        store.createIndex('owner', 'owner')
      }
      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => { database.close(); databasePromise = undefined }
        resolve(database)
      }
      request.onerror = () => { databasePromise = undefined; reject(request.error) }
      request.onblocked = () => { databasePromise = undefined; reject(new Error('File storage is blocked by another tab.')) }
    })
  }
  return databasePromise
}

async function transaction(owner, mode, operation) {
  if (!owner) throw new Error('An account is required for file storage.')
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('files', mode)
    let result
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error || new Error('File storage failed.'))
    tx.onabort = () => reject(tx.error || new Error('File storage was cancelled.'))
    try {
      operation(tx.objectStore('files'), (value) => { result = value })
    } catch (error) {
      tx.abort()
      reject(error)
    }
  })
}

export async function listFiles(owner) {
  const rows = await transaction(owner, 'readonly', (store, done) => {
    const request = store.index('owner').getAll(owner)
    request.onsuccess = () => done(request.result)
  })
  return rows.map(({ owner: _owner, ...item }) => ({ ...item, addedAt: new Date(item.addedAt) }))
    .sort((a, b) => a.addedAt - b.addedAt || a.id.localeCompare(b.id))
}

export function saveFiles(owner, items) {
  return transaction(owner, 'readwrite', (store) => {
    for (const item of items) store.put({ ...item, owner })
  })
}

export function deleteFile(owner, id) {
  return transaction(owner, 'readwrite', (store) => store.delete([owner, id]))
}
