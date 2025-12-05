import React, { useState, useEffect } from 'react'
import './FacultySubmissions.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { 
  getFacultyCourses,
  getPendingSubmissions,
  getCourseSubmissions,
  gradeSubmission,
  createSampleSubmission,
  getAllSubmissions
} from '../utils/firestoreHelpers'

export default function FacultySubmissions({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [gradingModal, setGradingModal] = useState(null)
  const [gradeInput, setGradeInput] = useState('')
  const [feedbackInput, setFeedbackInput] = useState('')

  // Initialize and load data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'faculty') {
        setCurrentUser(user)
        await loadFacultyData(user.uid)
      } else {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [userType])

  const loadFacultyData = async (userId) => {
    try {
      const coursesData = await getFacultyCourses(userId)
      setCourses(coursesData)
      
      // Load all submissions across all courses using helper
      const allSubs = await getAllSubmissions()
      setSubmissions(allSubs)
      setLoading(false)
    } catch (error) {
      console.error('Error loading faculty data:', error)
      setLoading(false)
    }
  }

  const handleViewAll = async () => {
    if (!courses || courses.length === 0) return
    try {
      let allSubs = []
      for (const course of courses) {
        try {
          const subs = await getCourseSubmissions(course.id)
          allSubs = [...allSubs, ...subs]
        } catch (err) {
          console.warn('Could not fetch submissions for course', course.id, err)
        }
      }
      setSelectedCourse(null)
      setSubmissions(allSubs)
    } catch (err) {
      console.error('Error fetching all submissions:', err)
    }
  }

  const handleSeedSubmission = async () => {
    try {
      const created = await createSampleSubmission(null, 'demo-assignment-1', { firstName: 'Demo', lastName: 'Student', email: 'demo@student.test' }, true)
      alert('Created sample submission: ' + created.id)
      // reload all submissions
      const allSubs = await getAllSubmissions()
      setSubmissions(allSubs)
    } catch (err) {
      console.error('Error seeding submission:', err)
      alert('Error creating sample submission: ' + (err.message || err))
    }
  }

  const handleCourseSelect = async (courseId) => {
    setSelectedCourse(courseId)
    try {
      const submissionsData = await getPendingSubmissions(courseId)
      setSubmissions(submissionsData)
    } catch (error) {
      console.error('Error loading submissions:', error)
    }
  }

  const handleGradeSubmission = async () => {
    if (!gradingModal || !gradeInput) {
      alert('Please enter a grade')
      return
    }

    try {
      await gradeSubmission(gradingModal.id, parseInt(gradeInput), feedbackInput)
      
      // Update local state
      setSubmissions(prev => prev.filter(sub => sub.id !== gradingModal.id))
      
      setGradingModal(null)
      setGradeInput('')
      setFeedbackInput('')
      alert('Submission graded successfully!')
    } catch (error) {
      alert('Error grading submission: ' + error.message)
    }
  }

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
                    onClick={() => handleCourseSelect(course.id)}
                  >
                    <div className="assignment-code">{course.courseCode}</div>
                    <div className="assignment-name">{course.courseName}</div>
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
                  <button className="filter-btn" onClick={handleSeedSubmission} style={{ marginLeft: 12, background: '#eef2ff' }}>Seed Sample Submission</button>
                </div>
              </div>

              <div className="submissions-grid">
                {submissions.map(submission => (
                  <div key={submission.id} className="submission-card">
                    <div className="submission-thumb-wrapper">
                      {submission.fileURL && typeof submission.fileURL === 'string' && submission.fileURL.startsWith('data:image') ? (
                        <img src={submission.fileURL} alt="thumb" className="submission-thumb-img" />
                      ) : submission.fileURL && typeof submission.fileURL === 'string' && submission.fileURL.includes('.pdf') ? (
                        <div className="submission-thumb-pdf">PDF</div>
                      ) : (
                        <div className="submission-thumb-placeholder">📎</div>
                      )}
                    </div>

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
                      <button className="action-btn view" onClick={() => setGradingModal(submission)}>👁️ View</button>
                      <button className="action-btn grade" onClick={() => setGradingModal(submission)}>✏️ Grade</button>
                      {submission.fileURL ? (
                        <a className="action-btn download" href={submission.fileURL} target="_blank" rel="noreferrer">⬇️ Download</a>
                      ) : (
                        <button className="action-btn download" disabled>⬇️ Download</button>
                      )}
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

      {/* Grading Modal */}
      {gradingModal && (
        <div className="modal-overlay" onClick={() => setGradingModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Grade Submission</h2>
              <button 
                className="modal-close"
                onClick={() => setGradingModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-item">
                <p className="detail-label">Student</p>
                <p className="detail-value">{gradingModal.studentName}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Assignment</p>
                <p className="detail-value">{gradingModal.assignment}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Submitted</p>
                <p className="detail-value">{gradingModal.submittedDate}</p>
              </div>
              {gradingModal.fileURL && (
                <div className="detail-item">
                  <p className="detail-label">Submitted File</p>
                  <p className="detail-value">
                    {typeof gradingModal.fileURL === 'string' && gradingModal.fileURL.startsWith('data:') ? (
                      // Inline preview for data URLs (small files)
                      gradingModal.fileURL.startsWith('data:image') ? (
                        <img src={gradingModal.fileURL} alt="Submission preview" style={{ maxWidth: '100%', borderRadius: 6 }} />
                      ) : gradingModal.fileURL.startsWith('data:application/pdf') ? (
                        <object data={gradingModal.fileURL} type="application/pdf" width="100%" height="400">PDF preview not available.</object>
                      ) : (
                        <a href={gradingModal.fileURL} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                          📎 Open Submission
                        </a>
                      )
                    ) : (
                      <a href={gradingModal.fileURL} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                        📎 Download Submission
                      </a>
                    )}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="grade-input">Grade (0-100)</label>
                <input 
                  id="grade-input"
                  type="number" 
                  min="0" 
                  max="100" 
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="Enter grade"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="feedback-input">Feedback</label>
                <textarea 
                  id="feedback-input"
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Enter feedback for student"
                  className="form-textarea"
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => setGradingModal(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-submit"
                onClick={handleGradeSubmission}
              >
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
