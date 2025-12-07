import React, { useState, useEffect } from 'react'
import './StudentSubmissions.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getStudentSubmissions } from '../utils/firestoreHelpers'

export default function StudentSubmissions({ onNavigate, onLogout, userType }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  // Load submissions from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        try {
          console.log('🔵 Loading submissions for student:', user.uid)
          const submissionsList = await getStudentSubmissions(user.uid)
          console.log('✓ Loaded submissions:', submissionsList)
          if (submissionsList && submissionsList.length > 0) {
            setSubmissions(submissionsList)
          } else {
            console.log('ℹ️ No submissions found for student')
            setSubmissions([])
          }
        } catch (error) {
          console.error('❌ Error loading submissions:', error)
          setSubmissions([])
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [userType])

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
            <button className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
            <button className={`filter-btn ${filterStatus === 'submitted' ? 'active' : ''}`} onClick={() => setFilterStatus('submitted')}>Pending</button>
            <button className={`filter-btn ${filterStatus === 'graded' ? 'active' : ''}`} onClick={() => setFilterStatus('graded')}>Graded</button>
          </div>

          <div className="submissions-list">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p>Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p>📋 No submissions yet. Start submitting your assignments!</p>
              </div>
            ) : (
              submissions
                .filter(s => filterStatus === 'all' || s.status === filterStatus)
                .map(submission => (
              <div key={submission.id} className="submission-item">
                <div className="submission-left">
                  <div className="submission-info">
                    <h3>{submission.assignment || 'Unknown Assignment'}</h3>
                    <p className="course-name">{submission.course || 'Unknown Course'}</p>
                  </div>
                  <div className="dates">
                    <span className="date-label">Submitted: {submission.submittedDate || 'N/A'}</span>
                    {submission.dueDate && (
                      <>
                        <span className="date-label">Due: {submission.dueDate}</span>
                        {submission.submittedDate && isLate(submission.submittedDate, submission.dueDate) && (
                          <span className="late-badge">⚠️ Late Submission</span>
                        )}
                      </>
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
                  {submission.fileURL ? (
                    <a className="view-btn download-link" href={submission.fileURL} target="_blank" rel="noreferrer">⬇️ Download</a>
                  ) : null}
                </div>
              </div>
            ))
            )}
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
                    {submissions.filter(s => s.grade).length > 0
                      ? (submissions.filter(s => s.grade).reduce((a, b) => a + b.grade, 0) / submissions.filter(s => s.grade).length).toFixed(1)
                      : 'N/A'}
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
