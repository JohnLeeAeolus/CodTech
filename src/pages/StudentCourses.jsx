import React, { useState, useEffect } from 'react'
import './StudentCourses.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getStudentCourses, enrollInCourse, dropCourse, getAllCourses, createSampleCourses } from '../utils/firestoreHelpers'

export default function StudentCourses({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Programming', instructor: 'Prof. Smith', enrolled: true, students: 45 },
    { id: 2, code: 'CS201', name: 'Data Structures', instructor: 'Prof. Johnson', enrolled: false, students: 38 },
    { id: 3, code: 'CS301', name: 'Algorithms', instructor: 'Prof. Williams', enrolled: true, students: 32 },
    { id: 4, code: 'CS102', name: 'Web Development', instructor: 'Prof. Brown', enrolled: false, students: 50 },
  ]);

  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [seedingCourses, setSeedingCourses] = useState(false)

  // Load courses from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        try {
          const allCourses = await getAllCourses()
          if (allCourses && allCourses.length > 0) {
            const enrolledCourses = await getStudentCourses(user.uid)
            const enrolledIds = enrolledCourses ? enrolledCourses.map(c => c.id) : []
            setCourses(allCourses.map(c => ({
              ...c,
              enrolled: enrolledIds.includes(c.id)
            })))
          }
        } catch (error) {
          console.error('Error loading courses:', error)
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [userType])

  const handleEnroll = async (courseId) => {
    if (!currentUser) return
    try {
      const course = courses.find(c => c.id === courseId)
      if (course.enrolled) {
        await dropCourse(currentUser.uid, courseId)
      } else {
        await enrollInCourse(currentUser.uid, courseId)
      }
      setCourses(courses.map(c => 
        c.id === courseId ? { ...c, enrolled: !c.enrolled } : c
      ))
    } catch (error) {
      console.error('Error updating enrollment:', error)
      alert('Failed to update enrollment')
    }
  };

  const handleSeedCourses = async () => {
    try {
      setSeedingCourses(true);
      const created = await createSampleCourses();
      alert(`Created ${created.length} sample courses! Refreshing...`);
      // Reload courses
      const allCourses = await getAllCourses();
      if (allCourses && allCourses.length > 0) {
        const enrolledCourses = await getStudentCourses(currentUser.uid);
        const enrolledIds = enrolledCourses ? enrolledCourses.map(c => c.id) : [];
        setCourses(allCourses.map(c => ({
          ...c,
          enrolled: enrolledIds.includes(c.id)
        })));
      }
    } catch (error) {
      console.error('Error seeding courses:', error);
      alert('Error seeding courses: ' + error.message);
    } finally {
      setSeedingCourses(false);
    }
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
          {/* Seed Courses Button (if no courses) */}
          {courses.length === 0 && (
            <div style={{marginBottom: '20px', padding: '15px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px'}}>
              <p style={{margin: '0 0 10px 0', color: '#856404'}}>No courses available yet.</p>
              <button onClick={handleSeedCourses} disabled={seedingCourses} style={{padding: '8px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
                {seedingCourses ? 'Creating Courses...' : '✓ Create Sample Courses'}
              </button>
            </div>
          )}

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
                <p className="course-instructor">👨‍🏫 {course.instructor || 'Faculty'}</p>
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
