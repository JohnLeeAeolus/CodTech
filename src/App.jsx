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
import AssignmentQuestions from './pages/AssignmentQuestions'
import { useEffect, useRef, useState } from 'react'
import { auth } from './firebase'
import { getOrInferUserRole } from './utils/firestoreHelpers'

function App() {
  const [route, setRoute] = useState(() => {
    const h = (typeof window !== 'undefined' ? (window.location.hash || '') : '').replace('#', '')
    return h === 'login' || h === 'register' ? h : 'login'
  })
  const [userType, setUserType] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const routeRef = useRef(route)
  const forceAuthScreenRef = useRef(false)

  useEffect(() => {
    routeRef.current = route
  }, [route])

  // Handler for login success
  function handleLogin(type) {
    setUserType(type)
    try {
      // Clear forced login/register hash once a user logs in.
      window.location.hash = ''
    } catch (e) {
      // ignore
    }
    forceAuthScreenRef.current = false
    setRoute('dashboard')
  }

  // Handler for logout
  function handleLogout() {
    try {
      auth.signOut()
    } catch (e) {
      // ignore
    }
    setUserType(null)
    try {
      window.location.hash = 'login'
    } catch (e) {
      // ignore
    }
    setRoute('login')
  }

  function handleNavigate(r) {
    setRoute(r)
    try {
      if (r === 'login' || r === 'register') {
        window.location.hash = r
      } else {
        // Clear hash for in-app pages
        if (window.location.hash) window.location.hash = ''
      }
    } catch (e) {
      // ignore
    }
  }

  // Allow forcing the auth screens via URL hash (#login or #register)
  useEffect(() => {
    const applyHashRoute = () => {
      const h = (window.location.hash || '').replace('#', '')
      const isAuthHash = h === 'login' || h === 'register'
      forceAuthScreenRef.current = isAuthHash
      if (isAuthHash) setRoute(h)
    }

    applyHashRoute()
    window.addEventListener('hashchange', applyHashRoute)
    return () => window.removeEventListener('hashchange', applyHashRoute)
  }, [])

  // Derive role from the signed-in Firebase user (source of truth).
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserType(null)
        setAuthReady(true)
        if (forceAuthScreenRef.current) {
          const h = (window.location.hash || '').replace('#', '')
          setRoute(h === 'register' ? 'register' : 'login')
        } else {
          setRoute('login')
        }
        return
      }

      try {
        const role = await getOrInferUserRole(user.uid, user.email)
        setUserType(role)
        setAuthReady(true)
        // If user is signed in, keep them in the app unless the URL forces auth screen.
        if (!forceAuthScreenRef.current && (routeRef.current === 'login' || routeRef.current === 'register')) {
          setRoute('dashboard')
        }
      } catch (e) {
        console.error('Failed to resolve user role:', e)
        setUserType(null)
        setAuthReady(true)
        setRoute('login')
      }
    })

    return unsubscribe
    // Intentionally do not depend on `route` to avoid resubscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!authReady) {
    return null
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

  if (route === 'assignmentQuestions') {
    return <AssignmentQuestions onNavigate={handleNavigate} onLogout={handleLogout} userType={userType} />
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
