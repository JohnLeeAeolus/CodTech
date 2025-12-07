import React, { useState } from 'react'
import './FacultyAnalytics.css'
import UserDropdown from '../components/UserDropdown'

export default function FacultyAnalytics({ onNavigate, onLogout, userType }) {
  const [selectedCourse, setSelectedCourse] = useState(1)

  const courses = [
    { id: 1, code: 'CS101', name: 'Introduction to Programming' },
    { id: 2, code: 'CS201', name: 'Data Structures' },
    { id: 3, code: 'CS301', name: 'Algorithms' },
  ]

  return (
    <div className="faculty-analytics-root">
      <header className="topbar fan-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
          </nav>
        </div>
        <div className="topbar-right">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="fan-main">
        <div className="fan-container">
          <div className="analytics-header">
            <h1>Course Analytics</h1>
            <p className="analytics-subtitle">Monitor course performance and student engagement</p>
          </div>

          <div className="course-selector">
            {courses.map(course => (
              <button
                key={course.id}
                className={`course-btn ${selectedCourse === course.id ? 'active' : ''}`}
                onClick={() => setSelectedCourse(course.id)}
              >
                {course.code}
              </button>
            ))}
          </div>

          <div className="analytics-grid">
            {/* Overview Stats */}
            <section className="analytics-section overview">
              <h2>Course Overview</h2>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="stat-label">Enrolled Students</span>
                    <span className="stat-value">45</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <span className="stat-label">Average Grade</span>
                    <span className="stat-value">85.3</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <span className="stat-label">Assignment Completion</span>
                    <span className="stat-value">92%</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-info">
                    <span className="stat-label">Course Progress</span>
                    <span className="stat-value">68%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Performance Chart */}
            <section className="analytics-section chart">
              <h2>Grade Distribution</h2>
              <div className="grade-distribution">
                <div className="grade-bar">
                  <div className="bar-label">A (90-100)</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: '35%' }}></div>
                  </div>
                  <div className="bar-count">16 students</div>
                </div>
                <div className="grade-bar">
                  <div className="bar-label">B (80-89)</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: '40%' }}></div>
                  </div>
                  <div className="bar-count">18 students</div>
                </div>
                <div className="grade-bar">
                  <div className="bar-label">C (70-79)</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: '18%' }}></div>
                  </div>
                  <div className="bar-count">8 students</div>
                </div>
                <div className="grade-bar">
                  <div className="bar-label">D (60-69)</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: '5%' }}></div>
                  </div>
                  <div className="bar-count">2 students</div>
                </div>
                <div className="grade-bar">
                  <div className="bar-label">F (Below 60)</div>
                  <div className="bar-container">
                    <div className="bar-fill" style={{ width: '2%' }}></div>
                  </div>
                  <div className="bar-count">1 student</div>
                </div>
              </div>
            </section>

            {/* Engagement */}
            <section className="analytics-section engagement">
              <h2>Student Engagement</h2>
              <div className="engagement-metrics">
                <div className="metric">
                  <span className="metric-label">Active Students</span>
                  <span className="metric-value">43/45</span>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-label">Avg. Time Spent</span>
                  <span className="metric-value">3.2 hrs/week</span>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{ width: '64%' }}></div>
                  </div>
                </div>
                <div className="metric">
                  <span className="metric-label">Forum Activity</span>
                  <span className="metric-value">67 posts</span>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </section>

            {/* Submission Timeline */}
            <section className="analytics-section timeline">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="time">2 hours ago</span>
                  <span className="activity">5 students submitted assignments</span>
                </div>
                <div className="activity-item">
                  <span className="time">5 hours ago</span>
                  <span className="activity">Quiz 3 deadline - 43/45 completed</span>
                </div>
                <div className="activity-item">
                  <span className="time">1 day ago</span>
                  <span className="activity">Posted new lecture slides</span>
                </div>
                <div className="activity-item">
                  <span className="time">2 days ago</span>
                  <span className="activity">Graded assignment batch - 40/45</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
