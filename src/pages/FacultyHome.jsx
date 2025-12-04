import React, { useState } from 'react'
import './FacultyHome.css'
import logo from '../assets/codtech-logo.png'
import UserDropdown from '../components/UserDropdown'

export default function FacultyHome({ onNavigate, onLogout, userType }) {
  const [courses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming', students: 45, submissions: 38, pending: 7 },
    { id: 2, code: 'CS201', name: 'Data Structures', students: 38, submissions: 35, pending: 3 },
    { id: 3, code: 'CS301', name: 'Algorithms', students: 32, submissions: 30, pending: 2 },
  ]);

  const [recentSubmissions] = useState([
    { id: 1, studentName: 'John Doe', assignment: 'Sorting Algorithms', course: 'CS201', submittedDate: '2024-12-04', status: 'pending' },
    { id: 2, studentName: 'Jane Smith', assignment: 'Array Manipulation', course: 'CS101', submittedDate: '2024-12-03', status: 'pending' },
    { id: 3, studentName: 'Mike Johnson', assignment: 'Recursion Basics', course: 'CS101', submittedDate: '2024-12-02', status: 'pending' },
  ]);

  const [announcements] = useState([
    { id: 1, title: 'Final Exams Schedule Released', date: '2024-12-04', priority: 'high' },
    { id: 2, title: 'Lab Sessions Cancelled Tomorrow', date: '2024-12-03', priority: 'medium' },
    { id: 3, title: 'New Study Materials Available', date: '2024-12-02', priority: 'low' },
  ]);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef5350';
      case 'medium': return '#ffa726';
      case 'low': return '#42a5f5';
      default: return '#999';
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
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="fh-main">
        <div className="fh-container">
          {/* Welcome Section */}
          <section className="welcome-section">
            <div className="welcome-content">
              <h1>Welcome Back, Professor!</h1>
              <p>You are teaching 3 courses with 115 total students.</p>
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
