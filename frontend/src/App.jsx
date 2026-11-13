import { useEffect, useState } from 'react'
import SignIn from './modules/authentication/SignIn.jsx'
import Register from './modules/authentication/Register.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [authMode, setAuthMode] = useState('sign-in')
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
    setUser(null)
  }

  if (checkingSession) return <div className="session-loading"><span className="loading-spinner"/> Đang kiểm tra phiên đăng nhập…</div>
  if (!user && authMode === 'register') {
    return <Register onRegistered={(email) => { setRegisteredEmail(email); setAuthMode('sign-in') }} onSwitchToSignIn={() => setAuthMode('sign-in')}/>
  }
  if (!user) return <SignIn onSignedIn={setUser} onSwitchToRegister={() => setAuthMode('register')} initialEmail={registeredEmail} successMessage={registeredEmail ? 'Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.' : ''}/>
  return <Dashboard user={user} onSignOut={signOut}/>
}

export default App
