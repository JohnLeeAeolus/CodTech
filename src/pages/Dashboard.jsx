import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import AppTopbar from '../components/AppTopbar'
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
  getCourseEnrolledStudents,
  getCourseSubmissions,
  getPendingSubmissions,
  getCourseAssignments,
  getAllAssignments,
  getAllQuizzes
} from '../utils/firestoreHelpers'

export default function Dashboard({ userType = 'student', onLogout, onNavigate, currentRoute }) {
  const [currentMonth, setCurrentMonth] = useState(new Date()) // Current month
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [submissionModal, setSubmissionModal] = useState(null)
  const [submissions, setSubmissions] = useState({})
  const [completedById, setCompletedById] = useState({})
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [studentProfile, setStudentProfile] = useState(null)
  const [facultyCourses, setFacultyCourses] = useState([])
  const [facultyPendingGrading, setFacultyPendingGrading] = useState(0)
  const [facultyPendingPreview, setFacultyPendingPreview] = useState([])
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
            setStudentProfile(studentProfile)
            
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

              // Still hide finished items from the timeline if the student already submitted.
              try {
                const submissionsList = await getStudentSubmissions(user.uid)
                const completed = {}
                ;(submissionsList || []).forEach((s) => {
                  const id = s?.assignmentId || s?.activityId || s?.quizId || null
                  if (id != null) completed[String(id)] = true
                })
                setCompletedById(completed)
              } catch (e) {
                console.warn('Error loading student submissions (timeline filter):', e)
                setCompletedById({})
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

            try {
              const submissionsList = await getStudentSubmissions(user.uid)
              const completed = {}
              ;(submissionsList || []).forEach((s) => {
                const id = s?.assignmentId || s?.activityId || s?.quizId || null
                if (id != null) completed[String(id)] = true
              })
              setCompletedById(completed)
            } catch (e) {
              console.warn('Fallback submissions load failed (timeline filter):', e)
              setCompletedById({})
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

      const toMillis = (v) => {
        if (!v) return null
        if (typeof v === 'number') return v
        if (typeof v === 'string') {
          const d = new Date(v)
          return Number.isNaN(d.getTime()) ? null : d.getTime()
        }
        if (typeof v === 'object' && typeof v.seconds === 'number') {
          return v.seconds * 1000 + (typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1e6) : 0)
        }
        if (typeof v.toMillis === 'function') {
          try { return v.toMillis() } catch { /* ignore */ }
        }
        if (typeof v.toDate === 'function') {
          try {
            const d = v.toDate()
            return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : null
          } catch { /* ignore */ }
        }
        return null
      }
      
      // Try to load courses
      let courses = []
      try {
        const baseCourses = await getFacultyCourses(userId)
        console.log('Loaded faculty courses:', baseCourses)

        // Enrich with actual enrolled students count (best-effort)
        courses = await Promise.all((baseCourses || []).map(async (course) => {
          try {
            const students = await getCourseEnrolledStudents(course.id)
            return { ...course, students }
          } catch {
            return { ...course, students: Number(course.students) || 0 }
          }
        }))

        setFacultyCourses(courses)

        // Pending grading count + preview list (submissions-only; matches what you see in the `submissions` collection).
        try {
          const byCourse = await Promise.all((courses || []).map(async (course) => {
            if (!course?.id) return { course, pending: [] }
            try {
              const pending = await getPendingSubmissions(course.id)
              return { course, pending: Array.isArray(pending) ? pending : [] }
            } catch {
              return { course, pending: [] }
            }
          }))

          const allPending = byCourse.flatMap(({ course, pending }) => {
            const courseLabel = course?.name || course?.courseName || course?.code || course?.courseCode || 'Course'
            return (pending || []).map((s) => ({
              ...s,
              __courseLabel: s?.course || s?.courseName || courseLabel,
              __submittedMs: toMillis(s?.submittedAt) ?? toMillis(s?.updatedAt) ?? null
            }))
          })

          const totalPending = allPending.length
          setFacultyPendingGrading(totalPending)

          const preview = allPending
            .slice()
            .sort((a, b) => {
              const am = a?.__submittedMs ?? -1
              const bm = b?.__submittedMs ?? -1
              return bm - am
            })
            .slice(0, 6)

          setFacultyPendingPreview(preview)
        } catch {
          setFacultyPendingGrading(0)
          setFacultyPendingPreview([])
        }
      } catch (courseErr) {
        console.warn('Error loading faculty courses (likely missing index), will load all assignments:', courseErr)
        setFacultyCourses([])
        setFacultyPendingGrading(0)
        setFacultyPendingPreview([])
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
      // IMPORTANT: Use the same source as the student Assignments page.
      // getStudentAssignments(userId) may return a subset (enrolled-only), which makes the timeline look incomplete.
      let allAssignments = []
      try {
        allAssignments = await getAllAssignments()
        console.log('Loaded all assignments for student dashboard:', allAssignments)
      } catch (err) {
        console.warn('Error loading all assignments for dashboard, using fallback:', err)
        allAssignments = await getStudentAssignments(userId)
        console.log('Fallback loaded student assignments:', allAssignments)
      }
      setAssignments(allAssignments || [])

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
        const completed = {}
        submissionsList.forEach(submission => {
          const key = `${submission.assignmentId}-${submission.submissionDate}`
          submissionMap[key] = submission.submittedAt

          const id = submission?.assignmentId || submission?.activityId || submission?.quizId || null
          if (id != null) completed[String(id)] = true
        })
        setSubmissions(submissionMap)
        setCompletedById(completed)
      } catch (subErr) {
        console.warn('Error loading submissions:', subErr)
        setCompletedById({})
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

  // Get calendar dates for current month view
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
    const normalizedAssignments = assignments.filter(a => a).map(a => ({
      ...a,
      type: a.type || 'assignment',
      title: a.title || a.name || 'Untitled',
    }))
    const normalizedQuizzes = quizzes.filter(q => q).map(q => ({
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

  const timelineGroups = React.useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const parseDueDate = (v) => {
      if (!v) return null
      try {
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return null
        return d
      } catch {
        return null
      }
    }

    const toMillis = (v) => {
      if (!v) return null
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? null : d.getTime()
      }
      // Firestore Timestamp
      if (typeof v === 'object' && typeof v.seconds === 'number') {
        return v.seconds * 1000 + (typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1e6) : 0)
      }
      if (typeof v.toMillis === 'function') {
        try { return v.toMillis() } catch { /* ignore */ }
      }
      return null
    }

    const isCompleted = (ev) => {
      if (userType !== 'student') return false
      const id = ev?.id || ev?.assignmentId || ev?.activityId || ev?.quizId || null
      if (id == null) return false
      return Boolean(completedById[String(id)])
    }

    const withDueDate = combinedEvents
      .map(ev => {
        const d = parseDueDate(ev?.dueDate)
        return d ? { ...ev, __due: d } : ev
      })
      .filter(ev => ev && ev.__due)
      .filter(ev => ev.__due >= startOfToday)
      .filter(ev => !isCompleted(ev))

    const withoutDueDate = combinedEvents
      .filter(ev => ev && !parseDueDate(ev.dueDate))
      .filter(ev => !isCompleted(ev))

    const grouped = withDueDate
      .slice()
      // Timeline order: soonest due date first
      .sort((a, b) => a.__due - b.__due)
      .reduce((acc, ev) => {
        const d = ev.__due
        const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`
        acc[key] = acc[key] || []
        acc[key].push(ev)
        return acc
      }, {})

    if (withoutDueDate.length > 0) {
      grouped['No due date'] = withoutDueDate
        .slice()
        // Latest first (if we have createdAt), otherwise by title
        .sort((a, b) => {
          const aMs = toMillis(a?.createdAt) ?? toMillis(a?.created_at) ?? null
          const bMs = toMillis(b?.createdAt) ?? toMillis(b?.created_at) ?? null
          if (aMs != null && bMs != null) return bMs - aMs
          if (aMs != null) return -1
          if (bMs != null) return 1
          return String(b?.title || '').localeCompare(String(a?.title || ''))
        })
    }

    return grouped
  }, [combinedEvents, completedById, userType])

  const timelineItemCount = React.useMemo(() => {
    return Object.values(timelineGroups).reduce((n, items) => n + (Array.isArray(items) ? items.length : 0), 0)
  }, [timelineGroups])

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

  // Add refresh handler
  const handleRefresh = async () => {
    setLoading(true)
    if (currentUser) {
      if (userType === 'student') {
        await loadStudentData(currentUser.uid)
      } else if (userType === 'faculty') {
        await loadFacultyData(currentUser.uid)
      }
    }
  }

  const focusStudentActivity = (item, opts = {}) => {
    if (!item) return
    try {
      window.sessionStorage.setItem(
        'codtech.studentAssignments.focus.v1',
        JSON.stringify({
          id: item.id || null,
          title: item.title || null,
          type: item.type || null,
          dueDate: item.dueDate || null,
          openSubmit: Boolean(opts?.openSubmit)
        })
      )
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="dashboard-root">
      <AppTopbar
        userType={userType}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        rightExtras={
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh data"
          >
            {loading ? '⟳ Loading...' : '↻ Refresh'}
          </button>
        }
      />

      {userType === 'student' && (
        <section className="welcome-section dashboard-welcome" style={{ width: '100%', margin: '48px 32px 0 32px', maxWidth: 'calc(1900px - 64px)', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="welcome-content">
            <h1>Welcome Back, Student!</h1>
            <p>You have {studentProfile?.enrolledCourses?.length || 0} active courses and {assignments.filter(a => a.status === 'pending').length || 5} pending assignments this week.</p>
          </div>
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-icon">📚</span>
              <div className="stat-info">
                <p className="stat-label">Active Courses</p>
                <p className="stat-value">{studentProfile?.enrolledCourses?.length || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div className="stat-info">
                <p className="stat-label">Pending Assignments</p>
                <p className="stat-value">{assignments.filter(a => a.status === 'pending').length || 5}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div className="stat-info">
                <p className="stat-label">Completed</p>
                <p className="stat-value">{Object.keys(completedById).length || 12}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {userType === 'faculty' && (
        <section className="welcome-section dashboard-welcome" style={{ width: '100%', margin: '48px 32px 0 32px', maxWidth: 'calc(1900px - 64px)', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="welcome-content">
            <h1>Welcome Back, Professor!</h1>
            <p>
              You are teaching {facultyCourses.length} courses with{' '}
              {facultyCourses.reduce((sum, c) => sum + (Number(c?.students) || 0), 0)} total students.
            </p>
          </div>
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-icon">📚</span>
              <div className="stat-info">
                <p className="stat-label">Active Courses</p>
                <p className="stat-value">{facultyCourses.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <div className="stat-info">
                <p className="stat-label">Total Students</p>
                <p className="stat-value">{facultyCourses.reduce((sum, c) => sum + (Number(c?.students) || 0), 0)}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📝</span>
              <div className="stat-info">
                <p className="stat-label">Pending Grading</p>
                <p className="stat-value">{facultyPendingGrading}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="dashboard-main-wrapper">
        <div className={`dashboard-content ${userType === 'faculty' ? 'dashboard-content-faculty' : ''}`}>
          {userType === 'faculty' && (
            <div className="dashboard-faculty-grid">
              <div className="dashboard-card faculty-pending-card">
                <div className="faculty-card-header">
                  <h2>Pending Submissions</h2>
                  <span className="faculty-badge">{facultyPendingGrading}</span>
                </div>

                <div className="faculty-pending-list">
                  {facultyPendingGrading === 0 ? (
                    <div className="faculty-empty">No pending submissions.</div>
                  ) : (
                    (facultyPendingPreview || []).map((submission) => (
                      <div key={submission.id || `${submission.studentId}-${submission.assignmentId}-${submission.submittedDate}`} className="faculty-submission-item">
                        <div className="faculty-submission-avatar">
                          {String(submission?.studentName || submission?.studentEmail || 'S').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="faculty-submission-info">
                          <div className="faculty-submission-student">{submission?.studentName || submission?.studentEmail || 'Student'}</div>
                          <div className="faculty-submission-assignment">{submission?.assignmentName || submission?.assignment || 'Submission'}</div>
                          <div className="faculty-submission-meta">
                            {(submission?.course || submission?.courseName || submission?.__courseLabel || 'Course')} • {submission?.submittedDate || 'Recently'}
                          </div>
                        </div>
                        <button className="faculty-btn-grade" onClick={() => onNavigate && onNavigate('submissions')}>
                          Grade Now →
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {facultyPendingGrading > (facultyPendingPreview || []).length && (
                  <button className="faculty-view-all" onClick={() => onNavigate && onNavigate('submissions')}>
                    View all pending →
                  </button>
                )}
              </div>

              <div className="dashboard-card calendar-card">
                <div className="calendar-title-row">
                  <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
                  <h2>{formatMonthYear(currentMonth)}</h2>
                  <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>→</button>
                  <input className="calendar-search" type="text" placeholder="Search" />
                </div>
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

                      const handleCellClick = () => {
                        if (isHighlighted) {
                          setModalEvent({ date, events })
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${highlightClass}`}
                          style={isHighlighted ? { cursor: 'pointer' } : {}}
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

              <div className="dashboard-card faculty-quick-actions">
                <h2>Quick Actions</h2>
                <div className="faculty-action-buttons">
                  <button className="faculty-action-btn" onClick={() => onNavigate && onNavigate('announcements')}>
                    <span className="faculty-action-icon">📢</span>
                    <span className="faculty-action-text">Make Announcement</span>
                  </button>
                  <button
                    className="faculty-action-btn"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('facultyOpenCreateActivity', '1')
                      } catch {
                        // ignore
                      }
                      onNavigate && onNavigate('assignments')
                    }}
                  >
                    <span className="faculty-action-icon">✏️</span>
                    <span className="faculty-action-text">Create Activity</span>
                  </button>
                  <button className="faculty-action-btn faculty-action-btn-wide" onClick={() => onNavigate && onNavigate('submissions')}>
                    <span className="faculty-action-icon">📝</span>
                    <span className="faculty-action-text">View All Submissions</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {userType === 'student' && (
            <div className="dashboard-card timeline-card">
              <h2>📋 School work Timeline</h2>

              <div className="timeline-list">
                {timelineItemCount === 0 ? (
                  <div className="timeline-empty">
                    No items yet. Check back soon.
                    <div style={{fontSize: '0.8rem', marginTop: '8px', color: '#9ca3af'}}>
                      (Loaded {assignments.length} assignments, {quizzes.length} quizzes)
                    </div>
                  </div>
                ) : (
                  Object.entries(timelineGroups).map(([month, items]) => (
                    <div className="timeline-month" key={month}>
                      <div className="month-title">{month}</div>
                      {items.map(item => (
                        <div
                          key={`${item.id || item.title}-${item.dueDate || 'nodue'}`}
                          className="timeline-item"
                          onClick={() => {
                            focusStudentActivity(item)
                            onNavigate && onNavigate('assignments')
                          }}
                        >
                          <div className="timeline-item-left">
                            <span className="timeline-type" style={{ background: getTypeColor(item.type) }}>{getTypeIcon(item.type)} {item.type || 'assignment'}</span>
                            <div className="timeline-title">{item.title}</div>
                            <div className="timeline-course">{item.courseName || item.course || 'Course'}</div>
                            <div className="timeline-date">{item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : 'No due date'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {userType === 'student' && (
            <div className="dashboard-card calendar-card">
              <div className="calendar-title-row">
                <h2>📅 Calendar</h2>
                <input className="calendar-search" type="text" placeholder="Search events..." />
              </div>
              <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
                <span className="calendar-month">{formatMonthYear(currentMonth)}</span>
                <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>→</button>
              </div>

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

                    const handleCellClick = () => {
                      if (isHighlighted) handleEventClick(events[0], date)
                    }

                    return (
                      <div
                        key={idx}
                        className={`calendar-cell ${!isCurrentMonth ? 'other-month' : ''} ${highlightClass} ${isHighlighted ? 'clickable' : ''}`}
                        style={isHighlighted ? { cursor: 'pointer' } : {}}
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
          )}

          {userType === 'student' && (
            <div className="student-right-sidebar">
              {/* Announcements Container */}
              <div className="dashboard-card announcements-card">
                <h2>📢 Announcements</h2>
                <div className="announcements-list">
                  <div className="announcements-empty">No announcements yet.</div>
                </div>
              </div>

              {/* Quick Links Container */}
              <div className="dashboard-card quick-links-card">
                <h2>⚡ Quick Links</h2>
                <div className="quick-links-list">
                  <a href="#" className="quick-link-item" onClick={e => {e.preventDefault(); onNavigate && onNavigate('assignments')}}>
                    <span className="quick-link-icon">📝</span>
                    <span className="quick-link-text">Activities</span>
                  </a>
                </div>
              </div>
            </div>
          )}
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
                <button
                  className="modal-btn primary"
                  onClick={() => {
                    focusStudentActivity(selectedEvent.event, { openSubmit: true })
                    onNavigate && onNavigate('assignments')
                    setSelectedEvent(null)
                  }}
                >
                  Start Quiz
                </button>
              </>
            ) : (
              <>
                {isSubmitted(selectedEvent.event.title, selectedEvent.date) && (
                  <p className="submission-status">✓ Submitted on {isSubmitted(selectedEvent.event.title, selectedEvent.date)}</p>
                )}
                <button
                  className="modal-btn primary"
                  onClick={() => {
                    focusStudentActivity(selectedEvent.event, { openSubmit: true })
                    onNavigate && onNavigate('assignments')
                    setSelectedEvent(null)
                  }}
                >
                  Submit Work
                </button>
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
                  <option value="assignment">📋 Activity</option>
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
