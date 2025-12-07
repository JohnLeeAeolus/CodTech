import './App.css'
import Login from './components/Login'
import Registration from './components/Registration'
import Dashboard from './pages/Dashboard'
import FacultyProfile from './pages/FacultyProfile'
import StudentProfile from './pages/StudentProfile'
import Announcements from './pages/Announcements'
import StudentHome from './pages/StudentHome'
import FacultyHome from './pages/FacultyHome'
import Courses from './pages/FacultyCourses'
import StudentCourses from './pages/StudentCourses'
import StudentAssignments from './pages/StudentAssignments'
import FacultyAssignments from './pages/FacultyAssignments'
import FacultySchedule from './pages/FacultySchedule'
import StudentSchedule from './pages/StudentSchedule'
import FacultySubmissions from './pages/FacultySubmissions'
import StudentSubmissions from './pages/StudentSubmissions'
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

  if (route === 'studentProfile') {
    return <StudentProfile onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
  }

  if (route === 'announcements') {
    return <Announcements onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
  }

  if (route === 'assignments') {
    if (userType === 'faculty') {
      return <FacultyAssignments onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    } else {
      return <StudentAssignments onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    }
  }

  if (route === 'home') {
    if (userType === 'faculty') {
      return <FacultyHome onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    } else {
      return <StudentHome onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    }
  }

  if (route === 'courses') {
    if (userType === 'faculty') {
      return <Courses onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    } else {
      return <StudentCourses onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    }
  }

  if (route === 'schedule') {
    if (userType === 'faculty') {
      return <FacultySchedule onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    } else {
      return <StudentSchedule onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    }
  }

  if (route === 'submissions') {
    if (userType === 'faculty') {
      return <FacultySubmissions onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    } else {
      return <StudentSubmissions onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
    }
  }

  return <Dashboard userType={userType} onLogout={handleLogout} onNavigate={handleNavigate} />
}

export default App
