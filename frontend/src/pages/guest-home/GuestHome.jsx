import { useRef } from 'react'
import { Icon } from '../../components/common/Icon.jsx'
import { CLEANING_OPTIONS } from '../dashboard/useDashboard.js'
import './guest-home.css'

export default function GuestHome({ onSignIn }) {
  const signInDialog = useRef(null)

  function requireSignIn() {
    if (!signInDialog.current.open) signInDialog.current.showModal()
  }

  function handleDrop(event) {
    event.preventDefault()
    if (event.dataTransfer.files.length) requireSignIn()
  }

  return (
    <div className="guest-home">
      <header className="guest-header">
        <nav className="guest-nav" aria-label="Điều hướng chính">
          <details className="guest-dropdown">
            <summary>Làm sạch file <Icon name="chevron" size={14}/></summary>
            <ul>
              {CLEANING_OPTIONS.map(({ id, icon, label }) => (
                <li key={id}><Icon name={icon} size={18}/>{label}</li>
              ))}
            </ul>
          </details>
        </nav>
        <div className="guest-nav">
          <span>Liên hệ với chúng tôi</span>
          <button type="button" className="guest-sign-in" onClick={onSignIn}>Đăng nhập</button>
        </div>
      </header>

      <main>
        <section className="guest-hero" aria-labelledby="guest-title">
          <div className="guest-brand">
            <span className="brand-mark" aria-hidden="true"><span/><span/><span/><span/></span>
            <span>Data Cleaner</span>
          </div>
          <h1 id="guest-title">Làm sạch dữ liệu dễ dàng</h1>
          <p>Làm sạch và chuẩn hóa dữ liệu từ các tệp Excel, JSON và CSV một cách nhanh chóng, tiện lợi.</p>
        </section>

        <section id="guest-upload" className="guest-upload" aria-label="Tải lên tập tin" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <div className="guest-file-art" aria-hidden="true">
            <span className="guest-file-sheet"/>
            <span className="guest-file-sheet"/>
            <span className="guest-file-front"><Icon name="format" size={50}/></span>
            <span className="guest-file-sparkle"><Icon name="clean" size={15}/></span>
          </div>
          <button type="button" className="guest-primary" onClick={requireSignIn}>Tải lên tập tin của bạn</button>
          <p className="guest-drop-hint">hoặc kéo thả tệp của bạn vào đây</p>
          <p className="guest-file-rules">Hỗ trợ định dạng XLSX, JSON, CSV. Dung lượng tối đa 50 MB.</p>
        </section>
      </main>

      <dialog ref={signInDialog} className="guest-dialog" aria-labelledby="guest-dialog-title" aria-describedby="guest-dialog-description">
        <h2 id="guest-dialog-title">Yêu cầu đăng nhập</h2>
        <p id="guest-dialog-description">Bạn cần đăng nhập để tải tệp lên và sử dụng tính năng làm sạch dữ liệu.</p>
        <div className="guest-dialog-actions">
          <form method="dialog"><button type="submit" className="guest-sign-in">Đóng</button></form>
          <button type="button" className="guest-primary" onClick={onSignIn}>Đăng nhập</button>
        </div>
      </dialog>
    </div>
  )
}
