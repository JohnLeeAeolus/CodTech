import React, { useState } from 'react'
import './StudentSubmissions.css'
import UserDropdown from '../components/UserDropdown'

export default function StudentSubmissions({ onNavigate, onLogout, userType }) {
  const [submissions] = useState([
    { id: 1, assignment: 'Assignment 1', course: 'CS101', submittedDate: '2024-12-04', dueDate: '2024-12-05', status: 'submitted', grade: null, feedback: '' },
    { id: 2, assignment: 'Assignment 2', course: 'CS201', submittedDate: '2024-12-03', dueDate: '2024-12-10', status: 'submitted', grade: null, feedback: '' },
    { id: 3, assignment: 'Quiz 1', course: 'CS301', submittedDate: '2024-12-01', dueDate: '2024-12-02', status: 'graded', grade: 95, feedback: 'Excellent work!' },
    { id: 4, assignment: 'Project Phase 1', course: 'CS101', submittedDate: '2024-11-28', dueDate: '2024-12-01', status: 'graded', grade: 88, feedback: 'Good effort, needs improvement in documentation' },
    { id: 5, assignment: 'Assignment 3', course: 'CS201', submittedDate: '2024-11-25', dueDate: '2024-11-25', status: 'graded', grade: 92, feedback: 'Great solution!' },
  ])

  const getStatusColor = (status) => {
    if (status === 'submitted') return '#ff9800'
    if (status === 'graded') return '#4caf50'
    return '#999'
  }

  const getStatusLabel = (status) => {
    if (status === 'submitted') return 'Pending Review'
    if (status === 'graded') return 'Graded'
    return status
  }

  const isLate = (submitted, due) => {
    return new Date(submitted) > new Date(due)
  }

  return (
    <div className="student-submissions-root">
      <header className="topbar ssub-topbar">
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
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="ssub-main">
        <div className="ssub-container">
          <div className="submissions-header">
            <h1>My Submissions</h1>
            <p className="submissions-subtitle">Track your assignment submissions and grades</p>
          </div>

          <div className="filter-section">
            <button className="filter-btn active">All</button>
            <button className="filter-btn">Pending</button>
            <button className="filter-btn">Graded</button>
          </div>

          <div className="submissions-list">
            {submissions.map(submission => (
              <div key={submission.id} className="submission-item">
                <div className="submission-left">
                  <div className="submission-info">
                    <h3>{submission.assignment}</h3>
                    <p className="course-name">{submission.course}</p>
                  </div>
                  <div className="dates">
                    <span className="date-label">Submitted: {submission.submittedDate}</span>
                    <span className="date-label">Due: {submission.dueDate}</span>
                    {isLate(submission.submittedDate, submission.dueDate) && (
                      <span className="late-badge">⚠️ Late Submission</span>
                    )}
                  </div>
                </div>

                <div className="submission-middle">
                  {submission.feedback && (
                    <div className="feedback-section">
                      <p className="feedback-label">Feedback</p>
                      <p className="feedback-text">{submission.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="submission-right">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(submission.status) }}
                  >
                    {getStatusLabel(submission.status)}
                  </span>
                  {submission.grade && (
                    <div className="grade-display">
                      <span className="grade-value">{submission.grade}</span>
                      <span className="grade-label">/100</span>
                    </div>
                  )}
                  <button className="view-btn">👁️ View</button>
                </div>
              </div>
            ))}
          </div>

          <div className="submissions-summary">
            <h3>Your Summary</h3>
            <div className="summary-grid">
              <div className="summary-stat">
                <span className="stat-icon">📤</span>
                <div className="stat-content">
                  <span className="stat-label">Total Submissions</span>
                  <span className="stat-value">{submissions.length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">⏳</span>
                <div className="stat-content">
                  <span className="stat-label">Pending Review</span>
                  <span className="stat-value">{submissions.filter(s => s.status === 'submitted').length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">✅</span>
                <div className="stat-content">
                  <span className="stat-label">Graded</span>
                  <span className="stat-value">{submissions.filter(s => s.status === 'graded').length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">📊</span>
                <div className="stat-content">
                  <span className="stat-label">Average Grade</span>
                  <span className="stat-value">
                    {(submissions.filter(s => s.grade).reduce((a, b) => a + b.grade, 0) / submissions.filter(s => s.grade).length).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
