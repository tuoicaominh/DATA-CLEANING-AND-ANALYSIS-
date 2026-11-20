import { useEffect, useRef, useState } from 'react'
import { createProcessingJob, deleteFile, discardProcessingJob, downloadProcessingOutput, listFiles, migrateLocalFiles, saveFiles } from '../../modules/dashboard/data/serverFileStorage.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024
export const CLEANING_OPTIONS = [
  { id: 'missing', icon: 'missing', label: 'Xử lý giá trị trống' },
  { id: 'duplicates', icon: 'duplicates', label: 'Xử lý trùng dữ liệu' },
  { id: 'format', icon: 'format', label: 'Xử lý sai định dạng dữ liệu' },
]

export function useDashboard(user) {
  const fileInput = useRef(null)
  const deleteDialog = useRef(null)
  const deleteTrigger = useRef(null)
  const cleaningOptionsRef = useRef(null)
  const savingLock = useRef(false)
  const mounted = useRef(true)
  const owner = String(user?.id ?? user?.email ?? '')

  const [accountOpen, setAccountOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedCleaningOptions, setSelectedCleaningOptions] = useState([])
  const [cleaningTarget, setCleaningTarget] = useState(null)
  const activeRun = useRef(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [processing, setProcessing] = useState(false)
  const [processingResult, setProcessingResult] = useState(null)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [savingFiles, setSavingFiles] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const [uploadNotice, setUploadNotice] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!uploadNotice) return undefined
    const timer = window.setTimeout(() => setUploadNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [uploadNotice])

  useEffect(() => {
    if (notice) setUploadNotice(null)
  }, [notice])

  useEffect(() => {
    if (pendingDelete) deleteDialog.current?.showModal()
  }, [pendingDelete])

  useEffect(() => {
    let active = true
    setLoadingFiles(true)
    migrateLocalFiles(owner).then(async (warning) => {
      const files = await listFiles()
      if (!active) return
      setSelectedFiles(files)
      if (warning) setNotice(warning)
    }).catch((error) => {
      if (active) setNotice(error.message || 'Không thể tải danh sách tệp từ máy chủ.')
    }).finally(() => {
      if (active) setLoadingFiles(false)
    })
    return () => { active = false }
  }, [owner])

  function toggleCleaningOption(optionId) {
    setProcessingResult(null)
    setSelectedCleaningOptions((current) => current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId])
  }

  const allCleaningOptionsSelected = CLEANING_OPTIONS.every(({ id }) => selectedCleaningOptions.includes(id))

  function toggleAllCleaningOptions() {
    setProcessingResult(null)
    setSelectedCleaningOptions((current) => {
      const remaining = CLEANING_OPTIONS.filter(({ id }) => !current.includes(id))
      return remaining.length ? [...current, ...remaining.map(({ id }) => id)] : []
    })
  }

  function chooseFileForCleaning(item) {
    setCleaningTarget(item)
    setProcessingResult(null)
    window.setTimeout(() => {
      cleaningOptionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      cleaningOptionsRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  async function runCleaningJob() {
    if (!cleaningTarget || !selectedCleaningOptions.length || activeRun.current) return
    const run = { cancelled: false, token: sessionStorage.getItem('access_token') }
    activeRun.current = run
    setProcessing(true)
    setSecondsLeft(30)
    setProcessingResult(null)
    setNotice('')

    const deadline = performance.now() + 30000
    run.countdown = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)))
    }, 250)
    const minimumWait = new Promise((resolve) => {
      run.endWait = () => {
        window.clearTimeout(run.timer)
        window.clearInterval(run.countdown)
        resolve()
      }
      run.timer = window.setTimeout(() => {
        setSecondsLeft(0)
        run.endWait()
      }, 30000)
    })

    try {
      const actions = selectedCleaningOptions.map((id) => ({
        type: id === 'missing' ? 'missing_values' : id === 'duplicates' ? 'remove_duplicates' : 'normalize_format',
        parameters: {},
      }))
      const result = await createProcessingJob(cleaningTarget.id, actions)
      await minimumWait
      if (run.cancelled) {
        try {
          await discardProcessingJob(result.id, run.token)
        } catch {
          if (mounted.current && !activeRun.current) setNotice('Đã quay về trang làm sạch nhưng chưa xóa được kết quả của lần chạy đã hủy.')
        }
        return
      }
      setProcessingResult(result)
      setNotice(result.status === 'COMPLETED' ? 'Làm sạch hoàn tất. Bạn có thể tải tệp kết quả.' : result.error_message || 'Không thể làm sạch tệp đã chọn.')
    } catch (error) {
      await minimumWait
      if (!run.cancelled) setNotice(error.message || 'Không thể tạo job làm sạch.')
    } finally {
      run.endWait()
      if (activeRun.current === run) {
        activeRun.current = null
        setProcessing(false)
      }
    }
  }

  function cancelCleaningJob() {
    const run = activeRun.current
    if (!run) return
    run.cancelled = true
    run.endWait()
    activeRun.current = null
    setProcessing(false)
    setNotice('Đã yêu cầu hủy lần làm sạch. Bạn có thể tiếp tục với tệp gốc.')
  }

  async function downloadCleanedFile() {
    if (!processingResult?.id) return
    try {
      const { blob, filename } = await downloadProcessingOutput(processingResult.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setNotice(error.message || 'Không tải được file kết quả.')
    }
  }

  async function addFiles(fileList) {
    if (loadingFiles || savingLock.current || !fileList.length) return

    const accepted = []
    const rejected = []
    Array.from(fileList).forEach((file) => {
      if (!/\.(csv|xlsx?|json)$/i.test(file.name)) rejected.push(`${file.name}: định dạng không được hỗ trợ`)
      else if (file.size > MAX_FILE_SIZE) rejected.push(`${file.name}: vượt quá 50 MB`)
      else if (file.size === 0) rejected.push(`${file.name}: file rỗng`)
      else accepted.push(file)
    })

    if (!accepted.length) {
      setNotice(rejected.join('. ') || 'Không có file hợp lệ để tải lên.')
      return
    }

    const items = accepted.map((file) => ({ id: crypto.randomUUID(), file, addedAt: new Date() }))
    savingLock.current = true
    setSavingFiles(true)
    setNotice('')
    setUploadNotice(null)
    try {
      const saved = await saveFiles(owner, items)
      if (!mounted.current) return
      setSelectedFiles((current) => [...current, ...saved])
      setUploadNotice({ id: crypto.randomUUID(), count: saved.length, rejected })
    } catch (error) {
      if (mounted.current) {
        setNotice(error.message || 'Không thể lưu tệp lên máy chủ. Hãy thử lại.')
        try {
          const files = await listFiles()
          if (mounted.current) setSelectedFiles(files)
        } catch { /* Keep the last confirmed list when the server is unavailable. */ }
      }
    } finally {
      savingLock.current = false
      if (mounted.current) setSavingFiles(false)
    }
  }

  function closeDeleteDialog() {
    if (deleting) return
    deleteDialog.current?.close()
    setPendingDelete(null)
    deleteTrigger.current?.focus()
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    const id = pendingDelete.id
    setDeleting(true)
    try {
      await deleteFile(owner, id)
      if (!mounted.current) return
      setSelectedFiles((current) => current.filter((item) => item.id !== id))
      setCleaningTarget((current) => current?.id === id ? null : current)
      deleteDialog.current?.close()
      setPendingDelete(null)
      setNotice('Tệp của bạn đã được xóa.')
      document.querySelector('.files-upload-button')?.focus()
    } catch (error) {
      if (mounted.current) {
        deleteDialog.current?.close()
        setPendingDelete(null)
        setNotice(error.message || 'Không thể xóa tệp đã lưu. Tệp vẫn được giữ lại; hãy thử lại.')
      }
    } finally {
      if (mounted.current) setDeleting(false)
    }
  }

  function fileKind(name) {
    if (/\.xlsx?$/i.test(name)) return 'excel'
    if (/\.csv$/i.test(name)) return 'csv'
    return 'json'
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} KB`
    return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} MB`
  }

  function dismissNotice() {
    setNotice('')
    setUploadNotice(null)
  }

  function showNotifications() {
    setNotice('Hiện chưa có thông báo mới.')
  }

  function requestDelete(item, trigger) {
    deleteTrigger.current = trigger
    setPendingDelete(item)
  }

  function handleDragOver(event) {
    event.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  function handleFileInput(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  return {
    fileInput,
    deleteDialog,
    cleaningOptionsRef,
    accountOpen,
    setAccountOpen,
    selectedFiles,
    selectedCleaningOptions,
    cleaningTarget,
    secondsLeft,
    processing,
    processingResult,
    loadingFiles,
    savingFiles,
    dragging,
    notice,
    uploadNotice,
    pendingDelete,
    deleting,
    allCleaningOptionsSelected,
    toggleCleaningOption,
    toggleAllCleaningOptions,
    chooseFileForCleaning,
    runCleaningJob,
    cancelCleaningJob,
    downloadCleanedFile,
    closeDeleteDialog,
    confirmDelete,
    fileKind,
    formatSize,
    dismissNotice,
    showNotifications,
    requestDelete,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
  }
}
