import { useNotice } from '../../hooks/useNotice.js'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/common/Icon.jsx'

export default function AccountDialog({ open, user, onClose, onSignOut }) {
  const dialog = useRef(null)
  const mounted = useRef(true)
  const submitLock = useRef(false)
  const [showForm, setShowForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useNotice()
  const [success, setSuccess] = useNotice()

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal()
    if (!open && dialog.current.open) dialog.current.close()
  }, [open])

  function clearPasswords() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmation('')
  }

  function close() {
    if (submitLock.current) return
    clearPasswords()
    setShowForm(false)
    setError('')
    setSuccess('')
    dialog.current.close()
    onClose()
  }

  async function changePassword(event) {
    event.preventDefault()
    if (submitLock.current) return
    setError('')
    setSuccess('')
    if (newPassword !== confirmation) { setError('Mật khẩu xác nhận không khớp.'); return }
    if (currentPassword === newPassword) { setError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return }
    submitLock.current = true
    setBusy(true)
    try {
      const token = sessionStorage.getItem('access_token')
      if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.')
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmation }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Không thể đổi mật khẩu. Hãy kiểm tra thông tin và thử lại.')
      if (mounted.current) {
        clearPasswords()
        setShowForm(false)
        setSuccess('Đổi mật khẩu thành công.')
      }
    } catch (requestError) {
      if (mounted.current) setError(requestError.message === 'Failed to fetch' ? 'Không kết nối được máy chủ. Hãy thử lại.' : requestError.message)
    } finally {
      submitLock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <button type="button" className="account-close" aria-label="Đóng thông tin tài khoản" onClick={close} disabled={busy} autoFocus><Icon name="close" size={23}/></button>
    <h2 id="account-title">Thông tin tài khoản</h2>
    <div className="account-details">
      <span className="account-info-icon"><Icon name="user" size={30}/></span>
      <dl><div><dt>Họ và tên</dt><dd>{user?.full_name}</dd></div><div><dt>Địa chỉ email</dt><dd>{user?.email}</dd></div></dl>
    </div>
    {success && <p className="account-success" role="status"><Icon name="check-circle" size={20}/>{success}</p>}
    <div className="account-actions">
      <button type="button" className="account-password-toggle" disabled={busy} aria-expanded={showForm} aria-controls="account-password-form" onClick={() => { clearPasswords(); setError(''); setSuccess(''); setShowForm((value) => !value) }}><Icon name="lock" size={21}/>Đổi mật khẩu</button>
      <button type="button" className="account-signout" disabled={busy} onClick={() => { close(); onSignOut() }}><Icon name="logout" size={21}/>Đăng xuất</button>
    </div>
    {showForm && <form id="account-password-form" className="account-password-form" onSubmit={changePassword}>
      <label htmlFor="account-current-password">Mật khẩu hiện tại</label>
      <input id="account-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={128} required disabled={busy}/>
      <label htmlFor="account-new-password">Mật khẩu mới</label>
      <input id="account-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={128} required disabled={busy} aria-describedby="account-password-hint"/>
      <small id="account-password-hint">Từ 12 đến 128 ký tự.</small>
      <label htmlFor="account-confirm-password">Xác nhận mật khẩu mới</label>
      <input id="account-confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} maxLength={128} required disabled={busy}/>
      {error && <p className="account-error" role="alert">{error}</p>}
      <div className="account-form-actions"><button type="button" disabled={busy} onClick={() => { clearPasswords(); setError(''); setShowForm(false) }}>Hủy</button><button type="submit" disabled={busy}>{busy ? 'Đang cập nhật…' : 'Lưu mật khẩu'}</button></div>
    </form>}
  </dialog>
}
