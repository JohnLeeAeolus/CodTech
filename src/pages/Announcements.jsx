import React from 'react'
import './Announcements.css'
import UserDropdown from '../components/UserDropdown'

export default function Announcements({ onNavigate, onLogout, userType }) {
  return (
    <div className="ann-root">
      <header className="topbar ann-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="ann-main">
        <div className="ann-container">
          <div className="ann-card">
            <h1 className="ann-title">Announcements</h1>
            <section className="ann-content">
              <h2>Announcement:</h2>
              <p>Announcement</p>
              <p>Announcement will be</p>
              <p>Announcement will be posted here</p>

              <div className="ann-body">
                <p>Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here</p>
                <p>Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here Announcement will be posted here</p>
              </div>
            </section>
          </div>

          <aside className="ann-sidebar">
            <div className="course-box">
              <h4>COURSE</h4>
              <ul>
                <li><a href="#">Recent Activities</a></li>
                <li><a href="#">Assignments</a></li>
                <li><a href="#">Announcements</a></li>
                <li><a href="#">Seatworks</a></li>
                <li><a href="#">Quizzes</a></li>
                <li><a href="#">Examination</a></li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
