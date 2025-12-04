import './App.css'
import Login from './components/Login'
import Registration from './components/Registration'
import Dashboard from './pages/Dashboard'
import FacultyProfile from './pages/FacultyProfile'
import Announcements from './pages/Announcements'
import Home from './pages/Home'
import Courses from './pages/Courses'
import Schedule from './pages/Schedule'
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
    return <FacultyProfile onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
  }

  if (route === 'announcements') {
    return <Announcements onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
  }

  if (route === 'home') {
    return <Home onNavigate={handleNavigate} />
  }

  if (route === 'courses') {
    return <Courses onNavigate={handleNavigate} />
  }

  if (route === 'schedule') {
    return <Schedule onNavigate={handleNavigate} />
  }

  return <Dashboard userType={userType} onLogout={handleLogout} onNavigate={handleNavigate} />
}

export default App
