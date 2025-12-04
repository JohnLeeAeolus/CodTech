import React, { useState } from 'react'
import './Dashboard.css'
import logo from '../assets/codtech-logo.png'

export default function Dashboard({ userType = 'student', onLogout, onNavigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10, 1)) // November 2025

  // Get calendar dates for November 2025 view (showing Oct 29 - Dec 4)
  const getCalendarDates = () => {
    const dates = []
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.
    const startDate = new Date(firstDay)
    // Adjust to start on Monday (if Sunday, go back 6 days; otherwise go back to Monday)
    startDate.setDate(startDate.getDate() - (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1))

    // Generate 42 days (6 weeks) to show full calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(new Date(date))
    }

    return dates
  }

  const calendarDates = getCalendarDates()

  // Modal state for event details (faculty)
  const [modalEvent, setModalEvent] = useState(null);

  const getEventsForDate = (date) => {
    const day = date.getDate()
    const month = date.getMonth()
    const year = date.getFullYear()

    // November 8, 2025 - Red
    if (year === 2025 && month === 10 && day === 8) {
      if (userType === 'faculty') {
        return ['Assignment # 1', 'Assignment # 2', 'Assignment # 3', 'Assignment # 4']
      }
      return ['Assignment # 1', 'Assignment # 2', 'Assignment # 3']
    }
    // November 13, 2025 - Orange
    if (year === 2025 && month === 10 && day === 13) {
      return ['Quiz # 4', 'Seatwork # 4']
    }
    // November 21, 2025 - Orange
    if (year === 2025 && month === 10 && day === 21) {
      return ['Project Subm...']
    }
    return []
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1))
  }

  const formatMonthYear = (date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  // Modal for event details (faculty)
  const closeModal = () => setModalEvent(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className="dashboard-root">
      <header className="topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-center">
          <div className="logo-circle">
            <img src={logo} alt="CodTech" />
          </div>
          <div className="codtech-title">CodTech</div>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`} tabIndex={0}>
            <span className="user-avatar" onClick={() => setDropdownOpen(v => !v)}>{userType === 'faculty' ? 'F' : 'A'}</span>
            <span className="user-name" onClick={() => setDropdownOpen(v => !v)}>{userType === 'faculty' ? 'Faculty Name' : 'Student Name'} ▾</span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-title">Quick Nav</div>
                <a href="#" className="dropdown-link">Recent Activities</a>
                {userType === 'faculty' ? (
                  <>
                    <a href="#" className="dropdown-link" onClick={(e) => { e.preventDefault(); alert('Assignment creation coming soon!'); }}>Assignment Creation</a>
                    <a href="#" className="dropdown-link" onClick={(e) => { e.preventDefault(); alert('Submissions management coming soon!'); }}>Submissions</a>
                    <a href="#" className="dropdown-link" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('facultyProfile'); setDropdownOpen(false); }}>Profile</a>
                  </>
                ) : (
                  <a href="#" className="dropdown-link">Assignments</a>
                )}
                <a href="#" className="dropdown-link">Announcements</a>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-link logout-link" onClick={(e) => { e.preventDefault(); if (onLogout) onLogout(); setDropdownOpen(false); }}>Logout</a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-main-wrapper">
        <div className="dashboard-content">
          <div className="dashboard-card timeline-card">
            <h2>School work Timeline</h2>
            {userType === 'faculty' && (
              <button className="timeline-btn create-assignment-btn" style={{marginBottom: '1rem'}} onClick={() => alert('Assignment creation coming soon!')}>+ Create Assignment</button>
            )}
            <div className="timeline-list">
              <div className="timeline-month">
                <div className="month-title">October 2025</div>
                <div className="timeline-item">
                  Assignment # 1 (Course here)
                </div>
                <div className="timeline-item">
                  Assignment # 2 (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn" onClick={() => alert('Viewing submissions for Assignment #2')}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn">Add Submission</button>
                  )}
                </div>
              </div>
              <div className="timeline-month">
                <div className="month-title">November 2025</div>
                <div className="timeline-item">
                  Quiz # 1 (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn quiz" onClick={() => alert('Viewing quiz submissions')}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn quiz">Take Quiz</button>
                  )}
                </div>
              </div>
              <div className="timeline-month">
                <div className="month-title">December 2025</div>
                <div className="timeline-item">
                  Project Submission (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn" onClick={() => alert('Viewing project submissions')}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn">Add Submission</button>
                  )}
                </div>
              </div>
              <div className="timeline-month muted">
                <div>January 2026</div>
                <div>February 2026</div>
                <div>March 2026</div>
                <div>April 2026</div>
                <div>May 2026</div>
                <div>June 2026</div>
              </div>
            </div>
          </div>

          <div className="dashboard-card calendar-card">
            {userType === 'faculty' ? (
              <div className="calendar-title-row">
                <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
                <h2>{formatMonthYear(currentMonth)}</h2>
                <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>→</button>
                <input className="calendar-search" type="text" placeholder="Search" />
              </div>
            ) : (
              <>
                <div className="calendar-title-row">
                  <h2>Calendar</h2>
                  <input className="calendar-search" type="text" placeholder="Search" />
                </div>
                <div className="calendar-header">
                  <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
                  <span className="calendar-month">{formatMonthYear(currentMonth)}</span>
                  <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>→</button>
                </div>
              </>
            )}
            <div className="calendar-grid">
              <div className="calendar-row calendar-days">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="calendar-day-name">{d}</div>
                ))}
              </div>
              <div className="calendar-body">
                {calendarDates.map((date, idx) => {
                  const events = getEventsForDate(date)
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                  const isHighlighted = events.length > 0
                  const day = date.getDate()
                  const month = date.getMonth()
                  const highlightClass = day === 8 && month === 10 ? 'highlight-red' :
                    (day === 13 || day === 21) && month === 10 ? 'highlight-orange' : ''

                  // For faculty, make event cells clickable
                  const handleCellClick = () => {
                    if (userType === 'faculty' && isHighlighted) {
                      setModalEvent({ date, events })
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${highlightClass}`}
                      style={userType === 'faculty' && isHighlighted ? { cursor: 'pointer' } : {}}
                      onClick={handleCellClick}
                    >
                      <div className="calendar-date">{date.getDate()}</div>
                      {isHighlighted && (
                        <>
                          <div className="calendar-event-underline"></div>
                          <div className="calendar-event-tooltip">
                            {events.map((ev, evIdx) => {
                              // For faculty, highlight Assignment # 4 in red on Nov 8
                              const isHighlighted = userType === 'faculty' && day === 8 && month === 10 && ev === 'Assignment # 4'
                              return (
                                <div key={evIdx} className={`calendar-event-item ${isHighlighted ? 'highlighted-assignment' : ''}`}>{ev}</div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for faculty event details */}
      {userType === 'faculty' && modalEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Events for {modalEvent.date.toDateString()}</h3>
            <ul>
              {modalEvent.events.map((ev, idx) => (
                <li key={idx}>{ev}</li>
              ))}
            </ul>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
