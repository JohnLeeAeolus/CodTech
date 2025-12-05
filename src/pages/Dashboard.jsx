import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import UserDropdown from '../components/UserDropdown'
import { db, auth } from '../firebase'
import { 
  getStudentAssignments, 
  getStudentSubmissions, 
  submitAssignment,
  uploadSubmissionFile,
  getStudentProfile,
  getStudentQuizzes,
  createAssignment,
  createQuiz,
  uploadAssignmentFile,
  getFacultyCourses
} from '../utils/firestoreHelpers'

export default function Dashboard({ userType = 'student', onLogout, onNavigate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10, 1)) // November 2025
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [submissionModal, setSubmissionModal] = useState(null)
  const [submissions, setSubmissions] = useState({})
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [facultyCourses, setFacultyCourses] = useState([])
  const [createFormData, setCreateFormData] = useState({
    type: 'assignment',
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
    file: null
  })

  // Initialize user and load data from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user)
        if (userType === 'student') {
          await loadStudentData(user.uid)
        } else if (userType === 'faculty') {
          await loadFacultyData(user.uid)
        }
      } else {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [userType])

  // Load faculty data
  const loadFacultyData = async (userId) => {
    try {
      const courses = await getFacultyCourses(userId)
      setFacultyCourses(courses)
      setLoading(false)
    } catch (error) {
      console.error('Error loading faculty data:', error)
      setLoading(false)
    }
  }

  // Load student assignments and submissions from Firestore
  const loadStudentData = async (userId) => {
    try {
      // Fetch assignments for enrolled courses
      const allAssignments = await getStudentAssignments(userId)
      setAssignments(allAssignments)

      // Fetch quizzes for enrolled courses
      try {
        const allQuizzes = await getStudentQuizzes(userId)
        setQuizzes(allQuizzes)
      } catch (qerr) {
        console.error('Error loading quizzes:', qerr)
      }

      // Fetch student submissions
      const submissionsList = await getStudentSubmissions(userId)
      const submissionMap = {}
      submissionsList.forEach(submission => {
        const key = `${submission.assignmentId}-${submission.submissionDate}`
        submissionMap[key] = submission.submittedAt
      })
      setSubmissions(submissionMap)
      setLoading(false)
    } catch (error) {
      console.error('Error loading student data:', error)
      setLoading(false)
    }
  }

  // Add submission to Firestore (uploads file to Storage if present)
  const addSubmissionToFirestore = async (eventName, file, comments) => {
    if (!currentUser) return
    
    try {
      const assignmentRef = assignments.find(a => a.name === eventName)
      
      const submissionData = {
        studentName: currentUser.displayName || 'Student',
        studentEmail: currentUser.email,
        assignmentName: eventName,
        fileName: file?.name || 'No file',
        fileSize: file?.size || 0,
        comments: comments,
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'submitted',
        grade: null
      }

      // If there's a file, upload it to Firebase Storage and attach URL/path
      if (file) {
        try {
          const { storagePath, downloadURL } = await uploadSubmissionFile(currentUser.uid, assignmentRef?.id || eventName, file)
          submissionData.fileURL = downloadURL
          submissionData.storagePath = storagePath
        } catch (err) {
          console.error('File uploadFailed:', err)
        }
      }

      await submitAssignment(currentUser.uid, assignmentRef?.id || eventName, submissionData)
    } catch (error) {
      console.error('Error adding submission:', error)
      throw error
    }
  }

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
    const events = []
    const dStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toDateString()

    // assignments whose dueDate matches this date
    for (const a of assignments) {
      if (!a.dueDate) continue
      const aDate = new Date(a.dueDate)
      if (aDate.toDateString() === dStr) {
        events.push({ type: 'assignment', title: a.title || a.name || 'Assignment', id: a.id, courseId: a.courseId })
      }
    }

    // quizzes whose dueDate matches
    for (const q of quizzes) {
      if (!q.dueDate) continue
      const qDate = new Date(q.dueDate)
      if (qDate.toDateString() === dStr) {
        events.push({ type: 'quiz', title: q.title || q.name || 'Quiz', id: q.id, courseId: q.courseId })
      }
    }

    // Fallback: return event titles for display
    return events.map(e => e.type === 'quiz' ? `Quiz: ${e.title}` : `${e.title}`)
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

  // Handle event click to show details (student)
  const handleEventClick = (event, date) => {
    if (userType === 'student') {
      setSelectedEvent({ name: event, date })
    }
  }

  // Handle submission action (student)
  const handleSubmit = async (eventName) => {
    try {
      // Get file input from the form
      const fileInput = document.querySelector('.file-input')
      const commentsInput = document.querySelector('.submission-textarea')
      const file = fileInput?.files[0]
      const comments = commentsInput?.value || ''

      // Add to Firestore
      await addSubmissionToFirestore(eventName, file, comments)

      // Update local state
      const submissionKey = `${eventName}-${selectedEvent.date.toDateString()}`
      setSubmissions(prev => ({
        ...prev,
        [submissionKey]: new Date().toLocaleString()
      }))
      
      setSubmissionModal(null)
      setSelectedEvent(null)
      alert(`✓ Submitted: ${eventName}`)
    } catch (error) {
      alert(`Error submitting: ${error.message}`)
    }
  }

  // Handle quiz action (student)
  const handleQuiz = (quizName) => {
    alert(`📝 Opening Quiz: ${quizName}\n\nRedirecting to quiz page...`)
  }

  // Handle creating assignment (faculty)
  const handleCreateAssignmentSubmit = async (e) => {
    e.preventDefault()
    if (!createFormData.title.trim()) {
      alert('Please enter a title.')
      return
    }
    
    try {
      const courseId = facultyCourses[0]?.id || 'general'
      const assignmentData = {
        title: createFormData.title,
        description: createFormData.description,
        dueDate: createFormData.dueDate ? new Date(createFormData.dueDate).toISOString() : null,
        totalPoints: Number(createFormData.totalPoints) || 0,
        type: createFormData.type,
      }

      if (createFormData.file) {
        const uploaded = await uploadAssignmentFile('global', createFormData.file)
        assignmentData.attachment = uploaded
      }

      if (createFormData.type === 'quiz') {
        await createQuiz(courseId, assignmentData)
      } else {
        await createAssignment(courseId, assignmentData)
      }

      alert('✓ ' + (createFormData.type === 'quiz' ? 'Quiz' : 'Assignment') + ' created!')
      setShowCreateModal(false)
      setCreateFormData({
        type: 'assignment',
        title: '',
        description: '',
        dueDate: '',
        totalPoints: 100,
        file: null
      })
      // Reload assignments/quizzes
      if (currentUser) {
        await loadFacultyData(currentUser.uid)
      }
    } catch (err) {
      console.error('Error creating assignment:', err)
      alert('Error: ' + err.message)
    }
  }

  // Check if event is submitted (student)
  const isSubmitted = (eventName, date) => {
    const key = `${eventName}-${date.toDateString()}`
    return submissions[key]
  }

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
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <div className="dashboard-main-wrapper">
        <div className="dashboard-content">
          <div className="dashboard-card timeline-card">
            <h2>📋 School work Timeline</h2>
            {userType === 'faculty' && (
              <button className="timeline-btn create-assignment-btn" style={{marginBottom: '1rem'}} onClick={() => setShowCreateModal(true)}>+ Create Assignment or Quiz</button>
            )}
            <div className="timeline-list">
              <div className="timeline-month">
                <div className="month-title">October 2025</div>
                <div className="timeline-item" onClick={() => handleEventClick('Assignment # 1', new Date(2025, 9, 15))}>
                  Assignment # 1 (Course here)
                </div>
                <div className="timeline-item" onClick={() => handleEventClick('Assignment # 2', new Date(2025, 9, 20))}>
                  Assignment # 2 (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn" onClick={(e) => {e.stopPropagation(); alert('Viewing submissions for Assignment #2')}}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn" onClick={(e) => {e.stopPropagation(); setSubmissionModal('Assignment # 2')}}>Add Submission</button>
                  )}
                </div>
              </div>
              <div className="timeline-month">
                <div className="month-title">November 2025</div>
                <div className="timeline-item" onClick={() => handleEventClick('Quiz # 1', new Date(2025, 10, 5))}>
                  Quiz # 1 (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn quiz" onClick={(e) => {e.stopPropagation(); alert('Viewing quiz submissions')}}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn quiz" onClick={(e) => {e.stopPropagation(); handleQuiz('Quiz # 1')}}>Take Quiz</button>
                  )}
                </div>
              </div>
              <div className="timeline-month">
                <div className="month-title">December 2025</div>
                <div className="timeline-item" onClick={() => handleEventClick('Project Submission', new Date(2025, 11, 10))}>
                  Project Submission (Course here)
                  {userType === 'faculty' ? (
                    <button className="timeline-btn" onClick={(e) => {e.stopPropagation(); alert('Viewing project submissions')}}>Check submissions</button>
                  ) : (
                    <button className="timeline-btn" onClick={(e) => {e.stopPropagation(); setSubmissionModal('Project Submission')}}>Add Submission</button>
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
                  <h2>📅 Calendar</h2>
                  <input className="calendar-search" type="text" placeholder="Search events..." />
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

                  // For faculty, make event cells clickable; for students, handle event click
                  const handleCellClick = () => {
                    if (userType === 'faculty' && isHighlighted) {
                      setModalEvent({ date, events })
                    } else if (userType === 'student' && isHighlighted) {
                      handleEventClick(events[0], date)
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${highlightClass} ${isHighlighted && userType === 'student' ? 'clickable' : ''}`}
                      style={isHighlighted && (userType === 'faculty' || userType === 'student') ? { cursor: 'pointer' } : {}}
                      onClick={handleCellClick}
                    >
                      <div className="calendar-date">{date.getDate()}</div>
                      {isHighlighted && (
                        <>
                          <div className="calendar-event-underline"></div>
                          <div className="calendar-event-tooltip">
                            {events.map((ev, evIdx) => {
                              // For faculty, highlight Assignment # 4 in red on Nov 8
                              const isHighlightedAssignment = userType === 'faculty' && day === 8 && month === 10 && ev === 'Assignment # 4'
                              return (
                                <div key={evIdx} className={`calendar-event-item ${isHighlightedAssignment ? 'highlighted-assignment' : ''}`}>{ev}</div>
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

      {/* Modal for student event details */}
      {userType === 'student' && selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            <h3>📌 {selectedEvent.name}</h3>
            <p className="modal-date">{selectedEvent.date.toDateString()}</p>
            
            {selectedEvent.name.includes('Quiz') || selectedEvent.name.includes('Seatwork') ? (
              <>
                <p className="modal-description">Ready to test your knowledge?</p>
                <button className="modal-btn primary" onClick={() => {handleQuiz(selectedEvent.name); setSelectedEvent(null)}}>Start Quiz</button>
              </>
            ) : (
              <>
                <p className="modal-description">Submit your work for this assignment</p>
                {isSubmitted(selectedEvent.name, selectedEvent.date) && (
                  <p className="submission-status">✓ Submitted on {isSubmitted(selectedEvent.name, selectedEvent.date)}</p>
                )}
                <button className="modal-btn primary" onClick={() => {setSubmissionModal(selectedEvent.name); setSelectedEvent(null)}}>Submit Work</button>
              </>
            )}
            <button className="modal-btn secondary" onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {userType === 'student' && submissionModal && (
        <div className="modal-overlay" onClick={() => setSubmissionModal(null)}>
          <div className="modal-content submission-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSubmissionModal(null)}>✕</button>
            <h3>📤 Submit: {submissionModal}</h3>
            <div className="submission-form">
              <label>Upload File:</label>
              <input type="file" className="file-input" />
              <label>Comments (optional):</label>
              <textarea className="submission-textarea" placeholder="Add any comments about your submission..."></textarea>
              <button className="modal-btn primary" onClick={() => handleSubmit(submissionModal)}>Submit</button>
              <button className="modal-btn secondary" onClick={() => setSubmissionModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment/Quiz Modal (Faculty) */}
      {userType === 'faculty' && showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{minWidth: '450px'}}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            <h3>{createFormData.type === 'quiz' ? 'Create Quiz' : 'Create Assignment'}</h3>
            <form onSubmit={handleCreateAssignmentSubmit} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Type</label>
                <select 
                  value={createFormData.type} 
                  onChange={e => setCreateFormData({...createFormData, type: e.target.value})}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Title</label>
                <input
                  type="text"
                  value={createFormData.title}
                  onChange={e => setCreateFormData({...createFormData, title: e.target.value})}
                  placeholder="Enter title"
                  required
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Description</label>
                <textarea
                  value={createFormData.description}
                  onChange={e => setCreateFormData({...createFormData, description: e.target.value})}
                  placeholder="Describe the assignment or quiz..."
                  rows="3"
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Due Date</label>
                <input
                  type="date"
                  value={createFormData.dueDate}
                  onChange={e => setCreateFormData({...createFormData, dueDate: e.target.value})}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Total Points</label>
                <input
                  type="number"
                  value={createFormData.totalPoints}
                  onChange={e => setCreateFormData({...createFormData, totalPoints: e.target.value})}
                  min="0"
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
              </div>
              <div>
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>Attachment (Optional)</label>
                <input
                  type="file"
                  onChange={e => setCreateFormData({...createFormData, file: e.target.files?.[0] || null})}
                  style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd'}}
                />
                {createFormData.file && <div style={{marginTop: '6px', fontSize: '0.9rem', color: '#4A90E2'}}>✓ {createFormData.file.name}</div>}
              </div>
              <div style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{flex: 1, padding: '10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                <button type="submit" style={{flex: 1, padding: '10px', background: '#4A90E2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'}}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
