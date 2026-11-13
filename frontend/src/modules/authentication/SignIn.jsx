import { useState } from 'react'
import AuthLayout from './AuthLayout.jsx'

export default function SignIn({ onSignedIn, onSwitchToRegister, initialEmail = '', successMessage = '' }) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) throw new Error('Email hoặc mật khẩu chưa chính xác.')
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Thông tin đăng nhập không hợp lệ.')
      }
      sessionStorage.setItem('access_token', data.access_token)
      onSignedIn(data.user)
    } catch (requestError) {
      setError(requestError.message === 'Failed to fetch' ? 'Không kết nối được máy chủ. Hãy kiểm tra FastAPI đang chạy.' : requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout prompt="Chưa có tài khoản?" actionLabel="Tạo tài khoản" onAction={onSwitchToRegister} actionPlacement="bottom">
        <div className="signin-card">
          <div className="signin-kicker">CHÀO MỪNG TRỞ LẠI</div><h2>Đăng nhập</h2><p className="signin-intro">Nhập thông tin để vào không gian làm việc của bạn.</p>
          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="signin-email">Email</label>
            <div className="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg><input id="signin-email" type="email" autoComplete="username" placeholder="ten@congty.com" value={email} onChange={(event) => setEmail(event.target.value)} required/></div>
            <div className="password-label"><label className="field-label" htmlFor="signin-password">Mật khẩu</label><button type="button" onClick={() => setError('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu.')}>Quên mật khẩu?</button></div>
            <div className="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg><input id="signin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} required/><button className="reveal-password" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
            {successMessage && <div className="auth-success" role="status">{successMessage}</div>}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="signin-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}<span>→</span></button>
          </form>
          <div className="auth-info-note">Kết nối của bạn được bảo vệ. Không chia sẻ mật khẩu với người khác.</div>
        </div>
    </AuthLayout>
  )
}
