import React, { useMemo, useState } from 'react'
import './AppTopbar.css'
import UserDropdown from './UserDropdown'

function normalizeRoute(route) {
  if (typeof route !== 'string') return ''
  if (route.startsWith('activitySubmit:')) return 'assignments'
  if (route.startsWith('activityDetails:')) return 'assignments'
  if (route === 'assignmentQuestions') return 'assignments'
  return route
}

export default function AppTopbar({
  userType = 'student',
  currentRoute,
  onNavigate,
  onLogout,
  rightExtras,
  title = 'UniLearn Nexus',
  subtitle = 'Learning Management Systems',
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const activeRoute = normalizeRoute(currentRoute)

  const links = useMemo(() => {
    const base = [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'courses', label: 'Courses' },
      { route: 'assignments', label: 'Activities' },
      { route: 'schedule', label: 'Schedule' },
      { route: 'submissions', label: 'Submissions' },
      { route: 'announcements', label: 'Announcements' },
    ]

    // In case you ever introduce role-only pages later.
    return base.filter(Boolean)
  }, [])

  const handleNav = (route) => {
    if (!route) return
    setMenuOpen(false)
    onNavigate && onNavigate(route)
  }

  const onBrandKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleNav('dashboard')
    }
  }

  return (
    <header className="appTopbar" role="banner">
      <div className="appTopbar__left">
        <div
          className="appTopbar__brand"
          onClick={() => handleNav('dashboard')}
          onKeyDown={onBrandKeyDown}
          role="button"
          tabIndex={0}
        >
          <span className="appTopbar__brandTitle">{title}</span>
          <span className="appTopbar__brandSub">{subtitle}</span>
        </div>

        <nav className="appTopbar__nav" aria-label="Primary">
          {links.map((l) => (
            <button
              key={l.route}
              type="button"
              className={`appTopbar__link ${activeRoute === l.route ? 'isActive' : ''}`}
              onClick={() => handleNav(l.route)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="appTopbar__right">
        {rightExtras ? <div className="appTopbar__extras">{rightExtras}</div> : null}
        <button
          type="button"
          className="appTopbar__menuBtn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>

        <div className="appTopbar__dropdown">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </div>

      {menuOpen && (
        <div className="appTopbar__mobilePanel" role="dialog" aria-label="Navigation menu">
          <div className="appTopbar__mobileLinks">
            {links.map((l) => (
              <button
                key={l.route}
                type="button"
                className={`appTopbar__mobileLink ${activeRoute === l.route ? 'isActive' : ''}`}
                onClick={() => handleNav(l.route)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
