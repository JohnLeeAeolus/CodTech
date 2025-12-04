import React, { useState } from 'react'
import './FacultySubmissions.css'
import UserDropdown from '../components/UserDropdown'

export default function FacultySubmissions({ onNavigate, onLogout, userType }) {
  const [courses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming' },
    { id: 2, code: 'CS201', name: 'Data Structures' },
    { id: 3, code: 'CS301', name: 'Algorithms' },
  ])

  const [selectedCourse, setSelectedCourse] = useState(1)

  const [submissions] = useState([
    { id: 1, studentName: 'John Doe', assignment: 'Assignment 1', submittedDate: '2024-12-04', status: 'submitted', grade: null, feedback: '' },
    { id: 2, studentName: 'Jane Smith', assignment: 'Assignment 1', submittedDate: '2024-12-03', status: 'graded', grade: 95, feedback: 'Excellent work!' },
    { id: 3, studentName: 'Mike Johnson', assignment: 'Assignment 1', submittedDate: '2024-12-05', status: 'submitted', grade: null, feedback: '' },
    { id: 4, studentName: 'Sarah Williams', assignment: 'Assignment 1', submittedDate: '2024-12-02', status: 'graded', grade: 88, feedback: 'Good effort' },
    { id: 5, studentName: 'Robert Brown', assignment: 'Quiz 1', submittedDate: '2024-12-01', status: 'graded', grade: 92, feedback: 'Perfect!' },
  ])

  const getStatusColor = (status) => {
    if (status === 'submitted') return '#ff9800'
    if (status === 'graded') return '#4caf50'
    if (status === 'late') return '#f44336'
    return '#999'
  }

  const getStatusLabel = (status) => {
    if (status === 'submitted') return 'Pending Review'
    if (status === 'graded') return 'Graded'
    if (status === 'late') return 'Late Submission'
    return status
  }

  return (
    <div className="faculty-submissions-root">
      <header className="topbar fsub-topbar">
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

      <main className="fsub-main">
        <div className="fsub-container">
          <div className="submissions-header">
            <h1>Student Submissions</h1>
            <p className="submissions-subtitle">Review and grade student submissions</p>
          </div>

          <div className="submissions-layout">
            {/* Course Selector */}
            <aside className="assignment-selector">
              <h3>Select Assignment</h3>
              <div className="assignment-list">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className={`assignment-item ${selectedCourse === course.id ? 'active' : ''}`}
                    onClick={() => setSelectedCourse(course.id)}
                  >
                    <div className="assignment-code">{course.code}</div>
                    <div className="assignment-name">{course.name}</div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Submissions List */}
            <section className="submissions-section">
              <div className="section-header">
                <h2>{courses.find(c => c.id === selectedCourse)?.name}</h2>
                <div className="filter-buttons">
                  <button className="filter-btn active">All</button>
                  <button className="filter-btn">Pending</button>
                  <button className="filter-btn">Graded</button>
                </div>
              </div>

              <div className="submissions-grid">
                {submissions.map(submission => (
                  <div key={submission.id} className="submission-card">
                    <div className="submission-header">
                      <div className="submission-info">
                        <h3>{submission.studentName}</h3>
                        <p className="assignment-name">{submission.assignment}</p>
                      </div>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(submission.status) }}
                      >
                        {getStatusLabel(submission.status)}
                      </span>
                    </div>

                    <div className="submission-details">
                      <div className="detail-row">
                        <span className="label">Submitted:</span>
                        <span className="value">{submission.submittedDate}</span>
                      </div>
                      {submission.grade && (
                        <div className="detail-row">
                          <span className="label">Grade:</span>
                          <span className="value grade">{submission.grade}/100</span>
                        </div>
                      )}
                      {submission.feedback && (
                        <div className="detail-row feedback">
                          <span className="label">Feedback:</span>
                          <span className="value">{submission.feedback}</span>
                        </div>
                      )}
                    </div>

                    <div className="submission-actions">
                      <button className="action-btn view">👁️ View</button>
                      <button className="action-btn grade">✏️ Grade</button>
                      <button className="action-btn download">⬇️ Download</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="submissions-stats">
                <h3>Summary</h3>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-label">Total Submissions</span>
                    <span className="stat-value">{submissions.length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Pending Review</span>
                    <span className="stat-value">{submissions.filter(s => s.status === 'submitted').length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Graded</span>
                    <span className="stat-value">{submissions.filter(s => s.status === 'graded').length}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Average Grade</span>
                    <span className="stat-value">
                      {(submissions.filter(s => s.grade).reduce((a, b) => a + b.grade, 0) / submissions.filter(s => s.grade).length).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
