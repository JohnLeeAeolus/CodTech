import React, { useState, useEffect } from 'react'
import './StudentHome.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getStudentCourses, getStudentAssignments, getStudentQuizzes, getCourseAnnouncements } from '../utils/firestoreHelpers'

export default function Home({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming', progress: 75, instructor: 'Prof. Smith', students: 45 },
    { id: 2, code: 'CS201', name: 'Data Structures', progress: 60, instructor: 'Prof. Johnson', students: 38 },
    { id: 3, code: 'CS301', name: 'Algorithms', progress: 85, instructor: 'Prof. Williams', students: 32 },
  ]);

  const [recentAssignments, setRecentAssignments] = useState([
    { id: 1, title: 'Sorting Algorithms', course: 'CS201', dueDate: '2024-12-10', status: 'graded', grade: 95 },
    { id: 2, title: 'Array Manipulation', course: 'CS101', dueDate: '2024-12-20', status: 'submitted' },
    { id: 3, title: 'Recursion Basics', course: 'CS101', dueDate: '2024-12-15', status: 'pending' },
  ]);

  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Final Exams Schedule Released', course: 'General', date: '2024-12-04', priority: 'high' },
    { id: 2, title: 'Lab Sessions Cancelled Tomorrow', course: 'CS301', date: '2024-12-03', priority: 'medium' },
    { id: 3, title: 'New Study Materials Available', course: 'CS201', date: '2024-12-02', priority: 'low' },
  ]);

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // Extract data loading logic into a function that can be called on demand
  const loadStudentHomeData = async (userId) => {
    try {
      console.log('Loading student home data for:', userId)
      const coursesData = await getStudentCourses(userId)
      console.log('Courses data:', coursesData)

      setCourses(coursesData || [])

      // Load student work items (assignments + quizzes). These helpers now
      // fall back to global DB content if the student isn't enrolled yet.
      const [assignments, quizzes] = await Promise.all([
        getStudentAssignments(userId),
        getStudentQuizzes(userId)
      ])

      const normalizeCourse = (item) => {
        const course = item.course || item.courseName || item.courseId || 'General'
        return { ...item, course }
      }

      const parseDate = (maybeDate) => {
        if (!maybeDate) return null
        if (typeof maybeDate === 'string') {
          const d = new Date(maybeDate)
          return isNaN(d.getTime()) ? null : d
        }
        // Firestore Timestamp-like
        if (typeof maybeDate === 'object' && typeof maybeDate.toDate === 'function') {
          try { return maybeDate.toDate() } catch (e) { return null }
        }
        const d = new Date(maybeDate)
        return isNaN(d.getTime()) ? null : d
      }

      const combined = [...(assignments || []), ...(quizzes || [])]
        .map(normalizeCourse)
        .sort((a, b) => {
          const ad = parseDate(a.dueDate) || parseDate(a.createdAt) || new Date(0)
          const bd = parseDate(b.dueDate) || parseDate(b.createdAt) || new Date(0)
          return bd.getTime() - ad.getTime()
        })

      if (combined.length > 0) {
        setRecentAssignments(combined.slice(0, 3))
      }

      // Load announcements from enrolled courses (if any)
      if (coursesData && coursesData.length > 0) {
        let allAnnouncements = []
        for (const course of coursesData) {
          try {
            const courseAnnouncements = await getCourseAnnouncements(course.id)
            allAnnouncements = [...allAnnouncements, ...courseAnnouncements]
          } catch (err) {
            console.error('Error loading announcements for course:', course.id, err)
          }
        }
        if (allAnnouncements.length > 0) {
          setAnnouncements(allAnnouncements.slice(0, 3))
        }
      }
    } catch (error) {
      console.error('Error loading student home data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        await loadStudentHomeData(user.uid)
      } else {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [userType])

  const handleRefresh = async () => {
    setLoading(true)
    if (currentUser) {
      await loadStudentHomeData(currentUser.uid)
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 80) return '#66bb6a';
    if (progress >= 60) return '#ffa726';
    return '#ef5350';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'graded': return { bg: '#66bb6a', text: '✓ Graded' };
      case 'submitted': return { bg: '#42a5f5', text: '✓ Submitted' };
      case 'pending': return { bg: '#ffa726', text: '⏳ Pending' };
      default: return { bg: '#999', text: status };
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef5350';
      case 'medium': return '#ffa726';
      case 'low': return '#42a5f5';
      default: return '#999';
    }
  };

  const getAssignmentTypeBreakdown = () => {
    const types = {
      'assignment': 0,
      'quiz': 0,
      'seatwork': 0,
      'project': 0
    };
    
    recentAssignments.forEach(a => {
      const type = a.type || 'assignment';
      if (types.hasOwnProperty(type)) {
        types[type]++;
      } else {
        types['assignment']++;
      }
    });
    
    return types;
  };

  return (
    <div className="student-home-root">
      <header className="topbar sh-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh data"
          >
            {loading ? '⟳ Loading...' : '↻ Refresh'}
          </button>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sh-main">
        <div className="sh-container">
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h1>Welcome Back, Student!</h1>
              <p>You have 3 active courses and 5 pending assignments this week.</p>
            </div>
            <div className="quick-stats">
              <div className="stat-card">
                <span className="stat-icon">📚</span>
                <div className="stat-info">
                  <p className="stat-label">Active Courses</p>
                  <p className="stat-value">{courses.length}</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📝</span>
                <div className="stat-info">
                  <p className="stat-label">Pending Assignments</p>
                  <p className="stat-value">5</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <div className="stat-info">
                  <p className="stat-label">Completed</p>
                  <p className="stat-value">12</p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="sh-grid">
            {/* Left Column */}
            <div className="sh-left-column">
              {/* Active Courses */}
              <section className="content-section">
                <div className="section-header">
                  <h2>My Courses</h2>
                  <a href="#" className="section-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>View All →</a>
                </div>
                <div className="courses-list">
                  {courses.map(course => (
                    <div key={course.id} className="course-item">
                      <div className="course-header-info">
                        <h3 className="course-title">{course.name}</h3>
                        <p className="course-code">{course.code}</p>
                      </div>
                      <div className="course-details">
                        <p className="instructor">👨‍🏫 {course.instructor}</p>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${course.progress}%`, backgroundColor: getProgressColor(course.progress) }}
                          ></div>
                        </div>
                        <p className="progress-text">{course.progress}% complete</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Assignments */}
              <section className="content-section">
                <div className="section-header">
                  <h2>Recent Assignments</h2>
                  <a href="#" className="section-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('assignments')}}>View All →</a>
                </div>
                
                {/* Assignment Type Breakdown */}
                {recentAssignments.length > 0 && (
                  <div className="assignment-type-breakdown">
                    {(() => {
                      const breakdown = getAssignmentTypeBreakdown();
                      return (
                        <>
                          {breakdown.assignment > 0 && (
                            <div className="type-stat-item" style={{ borderColor: '#667eea' }}>
                              <span className="type-icon">📋</span>
                              <div className="type-stat-info">
                                <p className="type-label">Assignments</p>
                                <p className="type-count">{breakdown.assignment}</p>
                              </div>
                            </div>
                          )}
                          {breakdown.quiz > 0 && (
                            <div className="type-stat-item" style={{ borderColor: '#764ba2' }}>
                              <span className="type-icon">❓</span>
                              <div className="type-stat-info">
                                <p className="type-label">Quizzes</p>
                                <p className="type-count">{breakdown.quiz}</p>
                              </div>
                            </div>
                          )}
                          {breakdown.seatwork > 0 && (
                            <div className="type-stat-item" style={{ borderColor: '#f093fb' }}>
                              <span className="type-icon">💼</span>
                              <div className="type-stat-info">
                                <p className="type-label">Seatwork</p>
                                <p className="type-count">{breakdown.seatwork}</p>
                              </div>
                            </div>
                          )}
                          {breakdown.project > 0 && (
                            <div className="type-stat-item" style={{ borderColor: '#4facfe' }}>
                              <span className="type-icon">🎯</span>
                              <div className="type-stat-info">
                                <p className="type-label">Projects</p>
                                <p className="type-count">{breakdown.project}</p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                <div className="assignments-list">
                  {recentAssignments.map(assignment => {
                    const badge = getStatusBadge(assignment.status);
                    const typeIcon = (() => {
                      switch(assignment.type) {
                        case 'quiz': return '❓';
                        case 'seatwork': return '💼';
                        case 'project': return '🎯';
                        default: return '📋';
                      }
                    })();
                    
                    return (
                      <div key={assignment.id} className="assignment-item">
                        <div className="assignment-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '1rem' }}>{typeIcon}</span>
                            <h4 className="assignment-name">{assignment.title}</h4>
                          </div>
                          <p className="assignment-meta">{assignment.course} • Due: {assignment.dueDate}</p>
                        </div>
                        <div className="assignment-status">
                          <span 
                            className="status-pill"
                            style={{ backgroundColor: badge.bg }}
                          >
                            {badge.text}
                          </span>
                          {assignment.grade && (
                            <span className="grade-badge">{assignment.grade}%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="sh-right-column">
              {/* Announcements */}
              <section className="content-section announcements-section">
                <div className="section-header">
                  <h2>Announcements</h2>
                  <a href="#" className="section-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('announcements')}}>View All →</a>
                </div>
                <div className="announcements-list">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className="announcement-item">
                      <div 
                        className="priority-indicator"
                        style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                      ></div>
                      <div className="announcement-content">
                        <h4 className="announcement-title">{announcement.title}</h4>
                        <p className="announcement-meta">{announcement.course} • {announcement.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Links */}
              <section className="content-section quick-links-section">
                <h2>Quick Links</h2>
                <div className="quick-links">
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>
                    <span className="link-icon">📊</span>
                    <span className="link-text">Dashboard</span>
                  </a>
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>
                    <span className="link-icon">📚</span>
                    <span className="link-text">Courses</span>
                  </a>
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('assignments')}}>
                    <span className="link-icon">📝</span>
                    <span className="link-text">Assignments</span>
                  </a>
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>
                    <span className="link-icon">📅</span>
                    <span className="link-text">Schedule</span>
                  </a>
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('studentProfile')}}>
                    <span className="link-icon">👤</span>
                    <span className="link-text">Profile</span>
                  </a>
                  <a href="#" className="quick-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('announcements')}}>
                    <span className="link-icon">📢</span>
                    <span className="link-text">Announcements</span>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
