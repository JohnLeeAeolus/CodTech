import React, { useState } from 'react'
import './FacultyGrades.css'
import UserDropdown from '../components/UserDropdown'

export default function FacultyGrades({ onNavigate, onLogout, userType }) {
  const [courses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming' },
    { id: 2, code: 'CS201', name: 'Data Structures' },
    { id: 3, code: 'CS301', name: 'Algorithms' },
  ])

  const [selectedCourse, setSelectedCourse] = useState(1)

  const [grades] = useState([
    { id: 1, studentName: 'John Doe', studentEmail: 'john.doe@university.edu', quiz1: 85, quiz2: 90, midterm: 88, project: 92, final: 87, average: 88.4 },
    { id: 2, studentName: 'Jane Smith', studentEmail: 'jane.smith@university.edu', quiz1: 92, quiz2: 88, midterm: 95, project: 94, final: 91, average: 92 },
    { id: 3, studentName: 'Mike Johnson', studentEmail: 'mike.johnson@university.edu', quiz1: 78, quiz2: 82, midterm: 80, project: 85, final: 79, average: 80.8 },
    { id: 4, studentName: 'Sarah Williams', studentEmail: 'sarah.williams@university.edu', quiz1: 88, quiz2: 91, midterm: 89, project: 90, final: 88, average: 89.2 },
    { id: 5, studentName: 'Robert Brown', studentEmail: 'robert.brown@university.edu', quiz1: 95, quiz2: 93, midterm: 94, project: 96, final: 95, average: 94.6 },
  ])

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
                    onClick={() => setSelectedCourse(course.id)}
                  >
                    <div className="course-code">{course.code}</div>
                    <div className="course-name">{course.name}</div>
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
