import React, { useState, useEffect } from 'react'
import './FacultyGrades.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { 
  getFacultyCourses, 
  getCourseGrades,
  getStudentGrades
} from '../utils/firestoreHelpers'

export default function FacultyGrades({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([])
  const [grades, setGrades] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

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
      
      if (coursesData.length > 0) {
        setSelectedCourse(coursesData[0].id)
        const gradesData = await getCourseGrades(coursesData[0].id)
        setGrades(gradesData)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error loading faculty data:', error)
      setLoading(false)
    }
  }

  const handleCourseSelect = async (courseId) => {
    setSelectedCourse(courseId)
    try {
      const gradesData = await getCourseGrades(courseId)
      setGrades(gradesData)
    } catch (error) {
      console.error('Error loading grades:', error)
    }
  }

  const getGradeColor = (grade) => {
    if (grade >= 90) return '#4caf50'
    if (grade >= 80) return '#2196f3'
    if (grade >= 70) return '#ff9800'
    return '#f44336'
  }

  const getLetterGrade = (grade) => {
    if (grade >= 90) return 'A'
    if (grade >= 80) return 'B'
    if (grade >= 70) return 'C'
    if (grade >= 60) return 'D'
    return 'F'
  }

  return (
    <div className="faculty-grades-root">
      <header className="topbar fg-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="fg-main">
        <div className="fg-container">
          <div className="grades-header">
            <h1>Grade Management</h1>
            <p className="grades-subtitle">Manage and review student grades</p>
          </div>

          <div className="grades-layout">
            {/* Course Selector */}
            <aside className="course-selector">
              <h3>Select Course</h3>
              <div className="course-list">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className={`course-item ${selectedCourse === course.id ? 'active' : ''}`}
                    onClick={() => handleCourseSelect(course.id)}
                  >
                    <div className="course-code">{course.courseCode}</div>
                    <div className="course-name">{course.courseName}</div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Grades Table */}
            <section className="grades-section">
              <div className="section-header">
                <h2>{courses.find(c => c.id === selectedCourse)?.name}</h2>
                <button className="export-button">📥 Export Grades</button>
              </div>

              <div className="table-wrapper">
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Quiz 1</th>
                      <th>Quiz 2</th>
                      <th>Midterm</th>
                      <th>Project</th>
                      <th>Final</th>
                      <th>Average</th>
                      <th>Grade</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map(student => (
                      <tr key={student.id}>
                        <td className="student-name">{student.studentName}</td>
                        <td className="student-email">{student.studentEmail}</td>
                        <td className="grade-cell">{student.quiz1}</td>
                        <td className="grade-cell">{student.quiz2}</td>
                        <td className="grade-cell">{student.midterm}</td>
                        <td className="grade-cell">{student.project}</td>
                        <td className="grade-cell">{student.final}</td>
                        <td className="grade-cell average">
                          <span style={{ color: getGradeColor(student.average) }}>
                            {student.average.toFixed(1)}
                          </span>
                        </td>
                        <td className="grade-cell letter">
                          <span
                            className="letter-badge"
                            style={{ backgroundColor: getGradeColor(student.average) }}
                          >
                            {getLetterGrade(student.average)}
                          </span>
                        </td>
                        <td className="action-cell">
                          <button className="edit-btn" title="Edit">✏️</button>
                          <button className="view-btn" title="View Details">👁️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grades-summary">
                <h3>Class Statistics</h3>
                <div className="summary-grid">
                  <div className="stat">
                    <span className="stat-label">Class Average</span>
                    <span className="stat-value">89.0</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Highest Grade</span>
                    <span className="stat-value">94.6</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Lowest Grade</span>
                    <span className="stat-value">80.8</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Total Students</span>
                    <span className="stat-value">{grades.length}</span>
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
