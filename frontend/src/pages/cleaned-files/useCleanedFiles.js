import { useNotice } from '../../hooks/useNotice.js'
import { useEffect, useState } from 'react'
import { deleteCleanedFile, downloadProcessingOutput, listCleanedFiles } from '../../modules/dashboard/data/serverFileStorage.js'

export function useCleanedFiles() {
  const [files, setFiles] = useState(null)
  const [loadError, setLoadError] = useNotice()
  const [loadFailed, setLoadFailed] = useState(false)
  const [downloadError, setDownloadError] = useNotice()
  const [downloadingJob, setDownloadingJob] = useState(null)
  const [revision, setRevision] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listCleanedFiles(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setFiles(rows)
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setLoadFailed(true)
        setLoadError(error.message)
      }
    })
    return () => controller.abort()
  }, [revision])

  async function download(jobId) {
    setDownloadingJob(jobId)
    setDownloadError('')
    try {
      const { blob, filename } = await downloadProcessingOutput(jobId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setDownloadError(error.message)
    } finally {
      setDownloadingJob(null)
    }
  }

  function retry() {
    setLoadError('')
    setLoadFailed(false)
    setRevision((value) => value + 1)
  }

  async function remove(jobId) {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCleanedFile(jobId)
      setFiles((current) => current.filter((file) => file.job_id !== jobId))
      return true
    } catch (error) {
      setDeleteError(error.message)
      return false
    } finally {
      setDeleting(false)
    }
  }

  return { files, loadFailed, loadError, downloadError, downloadingJob, download, retry, deleting, deleteError, setDeleteError, remove }
}
