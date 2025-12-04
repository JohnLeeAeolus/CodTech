import React, { useState } from 'react'
import './StudentCourses.css'
import logo from '../assets/codtech-logo.png'
import UserDropdown from '../components/UserDropdown'

export default function StudentCourses({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming', instructor: 'Prof. Smith', enrolled: true, students: 45 },
    { id: 2, code: 'CS201', name: 'Data Structures', instructor: 'Prof. Johnson', enrolled: false, students: 38 },
    { id: 3, code: 'CS301', name: 'Algorithms', instructor: 'Prof. Williams', enrolled: true, students: 32 },
    { id: 4, code: 'CS102', name: 'Web Development', instructor: 'Prof. Brown', enrolled: false, students: 50 },
  ]);

  const handleEnroll = (courseId) => {
    setCourses(courses.map(c => 
      c.id === courseId ? { ...c, enrolled: !c.enrolled } : c
    ));
  };

  return (
    <div className="student-courses-root">
      <header className="topbar sc-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sc-main">
        <div className="sc-container">
          <div className="sc-header">
            <h1>Available Courses</h1>
            <p className="sc-subtitle">Browse and enroll in courses</p>
          </div>

          <div className="sc-grid">
            {courses.map(course => (
              <div key={course.id} className="course-card">
                <div className="course-header">
                  <span className="course-code">{course.code}</span>
                  <span className={`enrollment-badge ${course.enrolled ? 'enrolled' : ''}`}>
                    {course.enrolled ? 'Enrolled' : 'Available'}
                  </span>
                </div>
                <h3 className="course-name">{course.name}</h3>
                <p className="course-instructor">👨‍🏫 {course.instructor}</p>
                <p className="course-students">👥 {course.students} students enrolled</p>
                <button 
                  className={`enroll-btn ${course.enrolled ? 'enrolled' : ''}`}
                  onClick={() => handleEnroll(course.id)}
                >
                  {course.enrolled ? 'Drop Course' : 'Enroll Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
