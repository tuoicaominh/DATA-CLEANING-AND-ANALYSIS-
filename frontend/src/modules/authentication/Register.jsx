import { useState } from 'react'
import AuthLayout from './AuthLayout.jsx'

export default function Register({ onRegistered, onSwitchToSignIn }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 409) throw new Error('Email này đã được sử dụng.')
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Thông tin đăng ký chưa hợp lệ.')
      }
      onRegistered(data.email)
    } catch (requestError) {
      setError(requestError.message === 'Failed to fetch' ? 'Không kết nối được máy chủ. Hãy kiểm tra FastAPI đang chạy.' : requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout prompt="Bạn đã có tài khoản?" actionLabel="Đăng nhập" onAction={onSwitchToSignIn} actionPlacement="bottom">
      <div className="signin-card register-card">
        <div className="signin-kicker">BẮT ĐẦU SỬ DỤNG DATACARE</div><h2>Tạo tài khoản</h2><p className="signin-intro">Nhập thông tin để tạo không gian làm việc.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="register-name">Họ và tên</label>
          <div className="input-wrap"><input id="register-name" autoComplete="name" placeholder="Tên hiển thị" value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={120} required/></div>
          <label className="field-label" htmlFor="register-email">Email</label>
          <div className="input-wrap"><input id="register-email" type="email" autoComplete="email" placeholder="ten@congty.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} required/></div>
          <label className="field-label" htmlFor="register-password">Mật khẩu</label>
          <div className="input-wrap"><input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required/><button className="reveal-password" type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
          <label className="field-label" htmlFor="register-confirm">Xác nhận mật khẩu</label>
          <div className="input-wrap"><input id="register-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} required/></div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="signin-submit" type="submit" disabled={busy}>{busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}<span>→</span></button>
        </form>
        <div className="auth-info-note">Mật khẩu được băm an toàn trước khi lưu. Sau khi tạo tài khoản, bạn có thể đăng nhập ngay.</div>
      </div>
    </AuthLayout>
  )
}
