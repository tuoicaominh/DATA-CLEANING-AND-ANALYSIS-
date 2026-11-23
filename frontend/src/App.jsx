import { useNotice } from './hooks/useNotice.js'
import { useEffect, useState } from 'react'
import SignIn from './modules/authentication/SignIn.jsx'
import Register from './modules/authentication/Register.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import GuestHome from './pages/guest-home/GuestHome.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authMode, setAuthMode] = useState('home')
  const [registrationNotice, setRegistrationNotice] = useNotice()
  const [registeredEmail, setRegisteredEmail] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (!token) {
      setCheckingSession(false)
      return
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((currentUser) => {
        if (currentUser) setUser(currentUser)
        else sessionStorage.removeItem('access_token')
      })
      .catch(() => sessionStorage.removeItem('access_token'))
      .finally(() => setCheckingSession(false))
  }, [])

  function signOut() {
    sessionStorage.removeItem('access_token')
    setAuthMode('home')
    setUser(null)
  }

  if (checkingSession) return <div className="session-loading"><span className="loading-spinner"/> Đang kiểm tra phiên đăng nhập…</div>
  if (!user && authMode === 'home') return <GuestHome onSignIn={() => setAuthMode('sign-in')}/>
  if (!user && authMode === 'register') {
    return <Register onRegistered={(email) => { setRegisteredEmail(email); setRegistrationNotice('Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.'); setAuthMode('sign-in') }} onSwitchToSignIn={() => setAuthMode('sign-in')}/>
  }
  if (!user) return <SignIn onSignedIn={setUser} onBack={() => setAuthMode('home')} onSwitchToRegister={() => setAuthMode('register')} initialEmail={registeredEmail} successMessage={registrationNotice}/>
  return <Dashboard key={user.id ?? user.email} user={user} onSignOut={signOut}/>
}

export default App
