import './auth.css'

export default function AuthLayout({ children, prompt, actionLabel, onAction, actionPlacement = 'top' }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        {actionPlacement === 'top' && <div className="auth-panel-top"><span>{prompt}</span><button type="button" onClick={onAction}>{actionLabel}</button></div>}
        {children}
        {actionPlacement === 'bottom' ? (
          <div className="auth-after-form">
            <div className="auth-switch-bottom"><span>{prompt}</span><button type="button" onClick={onAction}>{actionLabel}</button></div>
            <div className="auth-panel-foot">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
          </div>
        ) : (
          <div className="auth-panel-foot">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</div>
        )}
      </section>
      {actionPlacement === 'bottom' && (
        <footer className="auth-page-footer">
          <p>DataCare giúp bạn làm sạch và chuẩn hóa dữ liệu từ Excel, JSON và CSV nhanh chóng, tiện lợi.</p>
          <p>© 2026 DataCare. Công cụ làm sạch và chuẩn hóa dữ liệu.</p>
          <nav aria-label="Liên kết thông tin">
            <a href="#privacy">Chính sách quyền riêng tư</a>
            <a href="#terms">Điều khoản sử dụng</a>
            <a href="#cookies">Chính sách cookie</a>
            <a href="#registration-terms">Điều khoản gói đăng ký</a>
          </nav>
        </footer>
      )}
    </main>
  )
}
