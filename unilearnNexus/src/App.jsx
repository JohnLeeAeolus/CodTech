import './App.css'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import { useState } from 'react'

function App() {
  const [route, setRoute] = useState('login')
  const [userType, setUserType] = useState(null)

  // Handler for login success
  function handleLogin(type) {
    setUserType(type)
    setRoute('dashboard')
  }

  // Handler for logout
  function handleLogout() {
    setUserType(null)
    setRoute('login')
  }

  return route === 'login' ? (
    <Login onLogin={handleLogin} />
  ) : (
    <Dashboard userType={userType} onLogout={handleLogout} />
  )
}

export default App
