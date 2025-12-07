import React, { useState, useEffect } from 'react'
import './FacultyHome.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { 
  getFacultyCourses, 
  getCourseSubmissions,
  getCourseAnnouncements,
  createSampleCourses
} from '../utils/firestoreHelpers'

export default function FacultyHome({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([])
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [seedingCourses, setSeedingCourses] = useState(false)

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
      // Fetch faculty courses
      const coursesData = await getFacultyCourses(userId)
      setCourses(coursesData)

      // Fetch recent submissions from all courses
      let allSubmissions = []
      for (const course of coursesData) {
        const submissions = await getCourseSubmissions(course.id)
        allSubmissions = [...allSubmissions, ...submissions.slice(0, 3)]
      }
      setRecentSubmissions(allSubmissions.slice(0, 3))

      // Fetch announcements from courses
      let allAnnouncements = []
      for (const course of coursesData) {
        const courseAnnouncements = await getCourseAnnouncements(course.id)
        allAnnouncements = [...allAnnouncements, ...courseAnnouncements.slice(0, 2)]
      }
      setAnnouncements(allAnnouncements.slice(0, 3))

      setLoading(false)
    } catch (error) {
      console.error('Error loading faculty data:', error)
      setLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef5350';
      case 'medium': return '#ffa726';
      case 'low': return '#42a5f5';
      default: return '#999';
    }
  };

  const handleSeedCourses = async () => {
    try {
      setSeedingCourses(true);
      const created = await createSampleCourses();
      alert(`Created ${created.length} sample courses! Refreshing...`);
      // Reload courses
      if (currentUser) {
        await loadFacultyData(currentUser.uid);
      }
    } catch (error) {
      console.error('Error seeding courses:', error);
      alert('Error seeding courses: ' + error.message);
    } finally {
      setSeedingCourses(false);
    }
  };

  const getSubmissionRate = (students, submissions) => {
    return Math.round((submissions / students) * 100);
  };

  return (
    <div className="faculty-home-root">
      <header className="topbar fh-topbar">
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
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="fh-main">
        <div className="fh-container">
          {/* Seed Courses Button (if no courses) */}
          {courses.length === 0 && (
            <div style={{marginBottom: '20px', padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px'}}>
              <p style={{margin: '0 0 10px 0', color: '#856404'}}>No courses available yet.</p>
              <button onClick={handleSeedCourses} disabled={seedingCourses} style={{padding: '8px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                {seedingCourses ? 'Creating Courses...' : '✓ Create Sample Courses'}
              </button>
            </div>
          )}

          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h1>Welcome Back, Professor!</h1>
              <p>You are teaching {courses.length} courses with {courses.reduce((sum, c) => sum + (c.students || 0), 0)} total students.</p>
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
                <span className="stat-icon">👥</span>
                <div className="stat-info">
                  <p className="stat-label">Total Students</p>
                  <p className="stat-value">115</p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon">📝</span>
                <div className="stat-info">
                  <p className="stat-label">Pending Grading</p>
                  <p className="stat-value">12</p>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="fh-grid">
            {/* Left Column */}
            <div className="fh-left-column">
              {/* Teaching Courses */}
              <section className="content-section">
                <div className="section-header">
                  <h2>Teaching Courses</h2>
                  <a href="#" className="section-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>View All →</a>
                </div>
                <div className="courses-list">
                  {courses.map(course => (
                    <div key={course.id} className="course-item-faculty">
                      <div className="course-header-info">
                        <h3 className="course-title">{course.name}</h3>
                        <p className="course-code">{course.code}</p>
                      </div>
                      <div className="course-stats">
                        <div className="stat-item">
                          <span className="stat-label">Students</span>
                          <span className="stat-num">{course.students}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Submissions</span>
                          <span className="stat-num">{course.submissions}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Rate</span>
                          <span className="stat-num rate-good">{getSubmissionRate(course.students, course.submissions)}%</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Pending</span>
                          <span className="stat-num pending-badge">{course.pending}</span>
                        </div>
                      </div>
                      <div className="course-action">
                        <button className="btn-manage" onClick={() => onNavigate && onNavigate('courses')}>
                          Manage Course →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Submissions */}
              <section className="content-section">
                <div className="section-header">
                  <h2>Pending Submissions</h2>
                  <span className="badge-count">{recentSubmissions.length}</span>
                </div>
                <div className="submissions-list">
                  {recentSubmissions.map(submission => (
                    <div key={submission.id} className="submission-item">
                      <div className="submission-avatar">
                        {submission.studentName.charAt(0)}
                      </div>
                      <div className="submission-info">
                        <h4 className="submission-student">{submission.studentName}</h4>
                        <p className="submission-assignment">{submission.assignment}</p>
                        <p className="submission-meta">{submission.course} • {submission.submittedDate}</p>
                      </div>
                      <button className="btn-grade">
                        Grade Now →
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="fh-right-column">
              {/* Quick Actions */}
              <section className="content-section quick-actions-section">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => onNavigate && onNavigate('courses')}>
                    <span className="action-icon">✏️</span>
                    <span className="action-text">Create Assignment</span>
                  </button>
                  <button className="action-btn" onClick={() => onNavigate && onNavigate('announcements')}>
                    <span className="action-icon">📢</span>
                    <span className="action-text">Make Announcement</span>
                  </button>
                  <button className="action-btn" onClick={() => onNavigate && onNavigate('courses')}>
                    <span className="action-icon">📊</span>
                    <span className="action-text">View Grades</span>
                  </button>
                  <button className="action-btn" onClick={() => onNavigate && onNavigate('facultyProfile')}>
                    <span className="action-icon">👤</span>
                    <span className="action-text">My Profile</span>
                  </button>
                  <button className="action-btn" onClick={() => onNavigate && onNavigate('submissions')}>
                    <span className="action-icon">📝</span>
                    <span className="action-text">View All Submissions</span>
                  </button>
                </div>
              </section>

              {/* System Announcements */}
              <section className="content-section announcements-section">
                <h2>Announcements</h2>
                <div className="announcements-list">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className="announcement-item">
                      <div 
                        className="priority-indicator"
                        style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                      ></div>
                      <div className="announcement-content">
                        <h4 className="announcement-title">{announcement.title}</h4>
                        <p className="announcement-date">{announcement.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Teaching Tips */}
              <section className="content-section tips-section">
                <h2>💡 Teaching Tips</h2>
                <div className="tips-list">
                  <div className="tip-item">
                    <p className="tip-text">Use our calendar feature to schedule important course events and keep students informed.</p>
                  </div>
                  <div className="tip-item">
                    <p className="tip-text">Provide timely feedback on submissions to improve student learning outcomes.</p>
                  </div>
                  <div className="tip-item">
                    <p className="tip-text">Share course materials in advance to give students time to prepare.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
