import './App.css'
import Login from './components/Login'
import Registration from './components/Registration'
import Dashboard from './pages/Dashboard'
import FacultyProfile from './pages/FacultyProfile'
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

  function handleNavigate(r) {
    setRoute(r)
  }

  if (route === 'login') {
    return <Login onLogin={handleLogin} onNavigate={handleNavigate} />
  }

  if (route === 'register') {
    return <Registration onNavigate={handleNavigate} />
  }

  if (route === 'facultyProfile') {
    return <FacultyProfile />
  }

  return <Dashboard userType={userType} onLogout={handleLogout} onNavigate={handleNavigate} />
}

export default App
