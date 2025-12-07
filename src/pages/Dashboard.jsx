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
  getFacultyCourses,
  getCourseAssignments,
  getAllAssignments,
  getAllQuizzes
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
    file: null,
    externalLink: ''
  })

  const getTypeIcon = (type) => ({
    assignment: '📋',
    quiz: '❓',
    seatwork: '💼',
    project: '🎯'
  }[type] || '📋')

  const getTypeColor = (type) => ({
    assignment: '#667eea',
    quiz: '#764ba2',
    seatwork: '#f093fb',
    project: '#4facfe'
  }[type] || '#6366f1')

  // Initialize user and load data from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user)
        if (userType === 'student') {
          try {
            console.log('Loading student data for userId:', user.uid)
            const studentProfile = await getStudentProfile(user.uid)
            console.log('Student profile:', studentProfile)
            
            if (studentProfile && studentProfile.enrolledCourses && studentProfile.enrolledCourses.length > 0) {
              console.log('Student enrolled in courses, loading course data...')
              await loadStudentData(user.uid)
            } else {
              // Fallback: show all assignments/quizzes if not enrolled
              console.log('Student not enrolled in any courses, loading all assignments...')
              try {
                const allAssignments = await getAllAssignments()
                console.log('Loaded all assignments:', allAssignments)
                setAssignments(allAssignments || [])
              } catch (e) {
                console.warn('Error loading all assignments:', e)
                setAssignments([])
              }
              try {
                const allQuizzes = await getAllQuizzes()
                console.log('Loaded all quizzes:', allQuizzes)
                setQuizzes(allQuizzes || [])
              } catch (e) {
                console.warn('Error loading all quizzes:', e)
                setQuizzes([])
              }
              setLoading(false)
            }
          } catch (err) {
            console.error('Error loading student profile, using fallback:', err)
            // Fallback on any error - always load all assignments
            console.log('Using fallback for student, loading all assignments...')
            try {
              const allAssignments = await getAllAssignments()
              console.log('Fallback loaded assignments:', allAssignments)
              setAssignments(allAssignments || [])
            } catch (fallbackErr) {
              console.error('Fallback assignments failed:', fallbackErr)
              setAssignments([])
            }
            try {
              const allQuizzes = await getAllQuizzes()
              console.log('Fallback loaded quizzes:', allQuizzes)
              setQuizzes(allQuizzes || [])
            } catch (fallbackErr) {
              console.error('Fallback quizzes failed:', fallbackErr)
              setQuizzes([])
            }
            setLoading(false)
          }
        } else if (userType === 'faculty') {
          try {
            console.log('Loading faculty courses...')
            const courses = await getFacultyCourses(user.uid)
            console.log('Faculty courses loaded:', courses)
            if (courses && courses.length > 0) {
              await loadFacultyData(user.uid)
            } else {
              // Fallback: show all assignments/quizzes if no courses assigned
              console.log('Faculty has no courses, loading all assignments...')
              try {
                const allAssignments = await getAllAssignments()
                console.log('Loaded all assignments for faculty:', allAssignments)
                setAssignments(allAssignments || [])
              } catch (e) {
                console.warn('Error loading all assignments:', e)
                setAssignments([])
              }
              try {
                const allQuizzes = await getAllQuizzes()
                setQuizzes(allQuizzes || [])
              } catch (e) {
                console.warn('Error loading all quizzes:', e)
                setQuizzes([])
              }
              setLoading(false)
            }
          } catch (err) {
            console.error('Error loading faculty courses, using fallback:', err)
            // Fallback on any error - show all assignments
            console.log('Using fallback for faculty, loading all assignments...')
            try {
              const allAssignments = await getAllAssignments()
              console.log('Fallback loaded assignments for faculty:', allAssignments)
              setAssignments(allAssignments || [])
            } catch (fallbackErr) {
              console.error('Fallback assignments failed:', fallbackErr)
              setAssignments([])
            }
            try {
              const allQuizzes = await getAllQuizzes()
              setQuizzes(allQuizzes || [])
            } catch (fallbackErr) {
              console.error('Fallback quizzes failed:', fallbackErr)
              setQuizzes([])
            }
            setLoading(false)
          }
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
      console.log('Loading faculty data for userId:', userId)
      
      // Try to load courses
      let courses = []
      try {
        courses = await getFacultyCourses(userId)
        console.log('Loaded faculty courses:', courses)
        setFacultyCourses(courses)
      } catch (courseErr) {
        console.warn('Error loading faculty courses (likely missing index), will load all assignments:', courseErr)
        setFacultyCourses([])
      }

      // Load all assignments as primary source
      try {
        const allAssignments = await getAllAssignments()
        console.log('Loaded all assignments for faculty:', allAssignments)
        setAssignments(allAssignments || [])
      } catch (assignmentErr) {
        console.error('Error loading all assignments:', assignmentErr)
        setAssignments([])
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading faculty data:', error)
      // Still try to load assignments as fallback
      try {
        const allAssignments = await getAllAssignments()
        console.log('Fallback loaded assignments:', allAssignments)
        setAssignments(allAssignments || [])
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr)
        setAssignments([])
      }
      setLoading(false)
    }
  }

  // Load student assignments and submissions from Firestore
  const loadStudentData = async (userId) => {
    try {
      console.log('Loading student assignments...')
      // Fetch assignments for enrolled courses (includes all types)
      let allAssignments = []
      try {
        allAssignments = await getStudentAssignments(userId)
        console.log('Loaded student assignments:', allAssignments)
      } catch (err) {
        console.warn('Error loading student assignments, using fallback:', err)
        // Fallback to all assignments
        allAssignments = await getAllAssignments()
        console.log('Fallback loaded assignments:', allAssignments)
      }
      setAssignments(allAssignments)

      // Fetch quizzes separately (legacy collection) if present
      try {
        const allQuizzes = await getStudentQuizzes(userId)
        console.log('Loaded student quizzes:', allQuizzes)
        setQuizzes(allQuizzes)
      } catch (qerr) {
        console.warn('Error loading quizzes:', qerr)
        setQuizzes([])
      }

      // Fetch student submissions
      try {
        const submissionsList = await getStudentSubmissions(userId)
        const submissionMap = {}
        submissionsList.forEach(submission => {
          const key = `${submission.assignmentId}-${submission.submissionDate}`
          submissionMap[key] = submission.submittedAt
        })
        setSubmissions(submissionMap)
      } catch (subErr) {
        console.warn('Error loading submissions:', subErr)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading student data:', error)
      // Last resort: load all assignments
      try {
        const allAssignments = await getAllAssignments()
        console.log('Last resort fallback loaded assignments:', allAssignments)
        setAssignments(allAssignments || [])
      } catch (fallbackErr) {
        console.error('All fallbacks failed:', fallbackErr)
        setAssignments([])
      }
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

  const combinedEvents = React.useMemo(() => {
    const normalizedAssignments = assignments.filter(a => a && a.dueDate).map(a => ({
      ...a,
      type: a.type || 'assignment',
      title: a.title || a.name || 'Untitled',
    }))
    const normalizedQuizzes = quizzes.filter(q => q && q.dueDate).map(q => ({
      ...q,
      type: q.type || 'quiz',
      title: q.title || q.name || 'Quiz',
    }))
    const combined = [...normalizedAssignments, ...normalizedQuizzes]
    console.log('Combined events for calendar:', combined)
    console.log('Total assignments with dueDate:', normalizedAssignments.length, 'Total quizzes with dueDate:', normalizedQuizzes.length)
    if (combined.length > 0) {
      console.log('Sample event:', combined[0], 'dueDate:', combined[0].dueDate)
    }
    return combined
  }, [assignments, quizzes])

  const getEventsForDate = (date) => {
    // Create a normalized date string without timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    
    const events = combinedEvents.filter(ev => {
      if (!ev.dueDate) return false
      try {
        const evDate = new Date(ev.dueDate)
        const evYear = evDate.getFullYear()
        const evMonth = String(evDate.getMonth() + 1).padStart(2, '0')
        const evDay = String(evDate.getDate()).padStart(2, '0')
        const evDateKey = `${evYear}-${evMonth}-${evDay}`
        
        const matches = evDateKey === dateKey
        if (matches && date.getDate() <= 15) {
          console.log(`Event matches date ${dateKey}:`, ev.title)
        }
        return matches
      } catch (e) {
        console.warn('Error parsing dueDate:', ev.dueDate, e)
        return false
      }
    })
    return events
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
      setSelectedEvent({ event, date })
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
        externalLink: createFormData.externalLink?.trim() || null,
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
        file: null,
        externalLink: ''
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
              {combinedEvents.filter(ev => ev.dueDate).length === 0 ? (
                <div className="timeline-empty">
                  No items yet. {userType === 'faculty' ? 'Create one to get started.' : 'Check back soon.'}
                  <div style={{fontSize: '0.8rem', marginTop: '8px', color: '#9ca3af'}}>
                    (Loaded {assignments.length} assignments, {quizzes.length} quizzes)
                  </div>
                </div>
              ) : (
                Object.entries(
                  combinedEvents
                    .filter(ev => ev.dueDate)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .reduce((acc, ev) => {
                      const d = new Date(ev.dueDate)
                      const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`
                      acc[key] = acc[key] || []
                      acc[key].push(ev)
                      return acc
                    }, {})
                ).map(([month, items]) => (
                  <div className="timeline-month" key={month}>
                    <div className="month-title">{month}</div>
                    {items.map(item => (
                      <div key={item.id || item.title} className="timeline-item" onClick={() => handleEventClick(item.title, new Date(item.dueDate))}>
                        <div className="timeline-item-left">
                          <span className="timeline-type" style={{ background: getTypeColor(item.type) }}>{getTypeIcon(item.type)} {item.type || 'assignment'}</span>
                          <div className="timeline-title">{item.title}</div>
                          <div className="timeline-course">{item.courseName || 'Course'}</div>
                          <div className="timeline-date">Due {new Date(item.dueDate).toLocaleDateString()}</div>
                        </div>
                        {userType === 'faculty' ? (
                          <button className="timeline-btn" onClick={(e) => {e.stopPropagation(); alert('Viewing submissions...')}}>Check submissions</button>
                        ) : (
                          <button className={`timeline-btn ${item.type === 'quiz' ? 'quiz' : ''}`} onClick={(e) => {e.stopPropagation(); item.type === 'quiz' ? handleQuiz(item.title) : setSubmissionModal(item.title)}}>
                            {item.type === 'quiz' ? 'Take Quiz' : 'Add Submission'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
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
                          <div className="calendar-event-dots">
                            {events.map((ev, evIdx) => (
                              <div 
                                key={evIdx} 
                                className={`calendar-event-dot ${ev.type || 'assignment'}`}
                                title={ev.title}
                              >
                                {getTypeIcon(ev.type)} {(ev.type || 'assignment').substring(0, 3).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <div className="calendar-event-tooltip">
                            {events.map((ev, evIdx) => (
                              <div key={evIdx} className="calendar-event-item">
                                <span style={{marginRight: '6px'}}>{getTypeIcon(ev.type)}</span>
                                {ev.title}
                              </div>
                            ))}
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
            <button className="modal-close" onClick={closeModal}>✕</button>
            <h3>📅 Events for {modalEvent.date.toDateString()}</h3>
            <div className="faculty-events-list">
              {modalEvent.events.map((ev, idx) => (
                <div key={idx} className="faculty-event-item">
                  <div className="item-type-badge" style={{ backgroundColor: getTypeColor(ev.type || 'assignment'), marginBottom: '8px' }}>
                    {getTypeIcon(ev.type)} {(ev.type || 'assignment').charAt(0).toUpperCase() + (ev.type || 'assignment').slice(1)}
                  </div>
                  <h4>{ev.title}</h4>
                  {ev.description && (
                    <p className="event-description">{ev.description}</p>
                  )}
                  <p className="event-points">Points: {ev.totalPoints || 0}</p>
                  {ev.externalLink && (
                    <a href={ev.externalLink} target="_blank" rel="noopener noreferrer" className="event-link">
                      🔗 Open External Link
                    </a>
                  )}
                  {ev.courseId && (
                    <p className="event-course">Course: {ev.courseId}</p>
                  )}
                </div>
              ))}
            </div>
            <button className="modal-btn secondary" onClick={closeModal}>Close</button>
          </div>
        </div>
      )}

      {/* Modal for student event details */}
      {userType === 'student' && selectedEvent && selectedEvent.event && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            <div className="item-type-badge" style={{ backgroundColor: getTypeColor(selectedEvent.event.type || 'assignment'), marginBottom: '12px' }}>
              {getTypeIcon(selectedEvent.event.type)} {(selectedEvent.event.type || 'assignment').charAt(0).toUpperCase() + (selectedEvent.event.type || 'assignment').slice(1)}
            </div>
            <h3>📌 {selectedEvent.event.title}</h3>
            <p className="modal-date">{selectedEvent.date.toDateString()}</p>
            {selectedEvent.event.description && (
              <p className="modal-description">{selectedEvent.event.description}</p>
            )}
            <p className="modal-points">Points: {selectedEvent.event.totalPoints || 0}</p>
            
            {(selectedEvent.event.type === 'quiz' || selectedEvent.event.type === 'seatwork') ? (
              <>
                <p className="modal-description">Ready to test your knowledge?</p>
                <button className="modal-btn primary" onClick={() => {handleQuiz(selectedEvent.event.title); setSelectedEvent(null)}}>Start Quiz</button>
              </>
            ) : (
              <>
                {isSubmitted(selectedEvent.event.title, selectedEvent.date) && (
                  <p className="submission-status">✓ Submitted on {isSubmitted(selectedEvent.event.title, selectedEvent.date)}</p>
                )}
                <button className="modal-btn primary" onClick={() => {setSubmissionModal(selectedEvent.event); setSelectedEvent(null)}}>Submit Work</button>
              </>
            )}
            {selectedEvent.event.externalLink && (
              <a href={selectedEvent.event.externalLink} target="_blank" rel="noopener noreferrer" className="modal-btn link">
                🔗 Open External Link
              </a>
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
            <h3>📤 Submit: {typeof submissionModal === 'object' ? submissionModal.title : submissionModal}</h3>
            <div className="submission-form">
              <label>Upload File:</label>
              <input type="file" className="file-input" />
              <label>Comments (optional):</label>
              <textarea className="submission-textarea" placeholder="Add any comments about your submission..."></textarea>
              <button className="modal-btn primary" onClick={() => handleSubmit(typeof submissionModal === 'object' ? submissionModal.title : submissionModal)}>Submit</button>
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
                  <option value="assignment">📋 Assignment</option>
                  <option value="quiz">❓ Quiz</option>
                  <option value="seatwork">💼 Seatwork</option>
                  <option value="project">🎯 Project</option>
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
                <label style={{fontWeight: '600', marginBottom: '4px', display: 'block'}}>External Link (Optional)</label>
                <input
                  type="url"
                  value={createFormData.externalLink}
                  onChange={e => setCreateFormData({...createFormData, externalLink: e.target.value})}
                  placeholder="https://forms.gle/..."
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

      {/* Submissions Modal (Faculty) */}
      {userType === 'faculty' && modalEvent && modalEvent.events && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content submissions-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <h3>📂 Submissions for {modalEvent.events[0]?.title || 'Event'}</h3>
            <div className="submissions-list">
              {modalEvent.events.map((ev, idx) => (
                <div key={idx} className="submission-item">
                  <div className="submission-header">
                    <div className="submission-info">
                      <span className="submission-type" style={{ background: getTypeColor(ev.type) }}>{getTypeIcon(ev.type)} {ev.type || 'assignment'}</span>
                      <span className="submission-title">{ev.title}</span>
                    </div>
                    <div className="submission-date">
                      Due: {new Date(ev.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="submission-details">
                    <div className="submission-field">
                      <strong>Submitted By:</strong> {ev.studentName}
                    </div>
                    <div className="submission-field">
                      <strong>Email:</strong> {ev.studentEmail}
                    </div>
                    <div className="submission-field">
                      <strong>Submission Date:</strong> {new Date(ev.submissionDate).toLocaleString()}
                    </div>
                    <div className="submission-field">
                      <strong>Status:</strong> {ev.status}
                    </div>
                    {ev.comments && (
                      <div className="submission-field">
                        <strong>Comments:</strong> {ev.comments}
                      </div>
                    )}
                    {ev.fileURL && (
                      <div className="submission-field">
                        <strong>File:</strong> <a href={ev.fileURL} target="_blank" rel="noopener noreferrer">{ev.fileName}</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="modal-btn secondary" onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
