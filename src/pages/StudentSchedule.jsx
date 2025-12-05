import React, { useState, useEffect } from 'react'
import './StudentSchedule.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getStudentSchedule } from '../utils/firestoreHelpers'

export default function StudentSchedule({ onNavigate, onLogout, userType }) {
  const [scheduleData, setScheduleData] = useState([
    {
      id: 1,
      day: 'Monday',
      courses: [
        { code: 'CS101', name: 'Introduction to Programming', time: '09:00 - 10:30 AM', room: 'Lab A1', instructor: 'Prof. Smith' },
        { code: 'CS201', name: 'Data Structures', time: '11:00 AM - 12:30 PM', room: 'Room 205', instructor: 'Prof. Johnson' },
      ]
    },
    {
      id: 2,
      day: 'Tuesday',
      courses: [
        { code: 'CS301', name: 'Algorithms', time: '10:00 - 11:30 AM', room: 'Lab B2', instructor: 'Prof. Williams' },
        { code: 'CS101', name: 'Introduction to Programming', time: '02:00 - 03:30 PM', room: 'Room 301', instructor: 'Prof. Smith' },
      ]
    },
    {
      id: 3,
      day: 'Wednesday',
      courses: [
        { code: 'CS201', name: 'Data Structures', time: '09:00 - 10:30 AM', room: 'Lab A1', instructor: 'Prof. Johnson' },
        { code: 'CS101', name: 'Introduction to Programming', time: '11:00 AM - 12:30 PM', room: 'Room 205', instructor: 'Prof. Smith' },
      ]
    },
    {
      id: 4,
      day: 'Thursday',
      courses: [
        { code: 'CS301', name: 'Algorithms', time: '09:00 - 10:30 AM', room: 'Lab B2', instructor: 'Prof. Williams' },
        { code: 'CS201', name: 'Data Structures Lab', time: '02:00 - 04:00 PM', room: 'Lab C3', instructor: 'Prof. Johnson' },
      ]
    },
    {
      id: 5,
      day: 'Friday',
      courses: [
        { code: 'CS101', name: 'Introduction to Programming', time: '10:00 - 11:30 AM', room: 'Room 301', instructor: 'Prof. Smith' },
        { code: 'CS301', name: 'Algorithms Discussion', time: '02:00 - 03:00 PM', room: 'Room 205', instructor: 'Prof. Williams' },
      ]
    },
  ])

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // Load schedule from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        try {
          const schedule = await getStudentSchedule(user.uid)
          if (schedule && schedule.length > 0) {
            setScheduleData(schedule)
          }
        } catch (error) {
          console.error('Error loading schedule:', error)
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [userType])

  const getColorForCourse = (courseCode) => {
    const colors = {
      'CS101': '#667eea',
      'CS201': '#764ba2',
      'CS301': '#f093fb',
    }
    return colors[courseCode] || '#667eea'
  }

  return (
    <div className="student-schedule-root">
      <header className="topbar ss-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="ss-main">
        <div className="ss-container">
          <div className="schedule-header">
            <h1>My Schedule</h1>
            <p className="schedule-subtitle">Weekly Class Schedule</p>
          </div>

          <div className="schedule-grid">
            {scheduleData.map(day => (
              <div key={day.id} className="day-card">
                <div className="day-header">
                  <h2>{day.day}</h2>
                </div>
                <div className="courses-list">
                  {day.courses.map((course, idx) => (
                    <div
                      key={idx}
                      className="course-schedule-item"
                      style={{ borderLeft: `4px solid ${getColorForCourse(course.code)}` }}
                    >
                      <div className="course-time">{course.time}</div>
                      <div className="course-code">{course.code}</div>
                      <div className="course-name">{course.name}</div>
                      <div className="course-location">📍 {course.room}</div>
                      <div className="course-instructor">👨‍🏫 {course.instructor}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="schedule-summary">
            <h3>Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Classes Per Week</span>
                <span className="stat-value">10</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Learning Hours</span>
                <span className="stat-value">17.5</span>
              </div>
              <div className="stat">
                <span className="stat-label">Enrolled Courses</span>
                <span className="stat-value">3</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
