import React, { useState, useEffect } from 'react'
import './FacultyCourses.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { subscribeToEnrolledStudentCount } from '../utils/firestoreHelpers'
import { getCourseEnrollments } from '../utils/firestoreHelpers'

// Thumbnails for courses (static SVG data URLs)
const COURSE_THUMBNAILS = {
  'CS101': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%2390CAF9" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial"%3E%7B%7D%3C/text%3E%3C/svg%3E',
  'CS201': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23EF5350" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3C/svg%3E',
  'CS301': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23004B87" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9C%88%EF%B8%8F%3C/text%3E%3C/svg%3E',
  'CS102': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%2380DEEA" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%92%A1%3C/text%3E%3C/svg%3E',
  'CS401': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23B0BEC5" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%A4%96%3C/text%3E%3C/svg%3E',
  'CS501': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23FDD835" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%98%81%EF%B8%8F%3C/text%3E%3C/svg%3E',
  'CS601': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%231E88E5" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%90%8D%3C/text%3E%3C/svg%3E',
  'CS702': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23C62828" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%94%92%3C/text%3E%3C/svg%3E',
  'CS801': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23E91E63" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%A4%94%3C/text%3E%3C/svg%3E',
  'CS901': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23FFA500" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9B%93%3C/text%3E%3C/svg%3E',
  'CS1001': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%234CAF50" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E',
  'CS1101': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23673AB7" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%93%A1%3C/text%3E%3C/svg%3E'
}

// Canonical list of courses (matches StudentCourses AVAILABLE_COURSES)
const REQUIRED_COURSES = [
  { code: 'CS101', name: 'Introduction to Programming' },
  { code: 'CS201', name: 'Data Structures' },
  { code: 'CS301', name: 'Algorithms' },
  { code: 'CS102', name: 'Web Development' },
  { code: 'CS401', name: 'Machine Learning' },
  { code: 'CS501', name: 'Cloud Computing' },
  { code: 'CS601', name: 'Advanced Python' },
  { code: 'CS702', name: 'Cybersecurity' },
  { code: 'CS801', name: 'AI Ethics' },
  { code: 'CS901', name: 'Blockchain' },
  { code: 'CS1001', name: 'DevOps Fundamentals' },
  { code: 'CS1101', name: 'API Design' }
]

export default function Courses({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [enrolledByCourse, setEnrolledByCourse] = useState({});
  const [enrolledLoadingByCourse, setEnrolledLoadingByCourse] = useState({});
  const [enrolledErrorByCourse, setEnrolledErrorByCourse] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load courses from Firestore with real-time updates
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user || null)
    })
    return unsub
  }, [])

  const toggleStudents = async (course) => {
    const uid = currentUser?.uid
    if (!uid || course?.facultyId !== uid) return

    const nextExpanded = expandedCourseId === course.id ? null : course.id
    setExpandedCourseId(nextExpanded)
    if (!nextExpanded) return

    // Load only once per course (unless previously errored)
    if (Array.isArray(enrolledByCourse[course.id]) && !enrolledErrorByCourse[course.id]) return

    setEnrolledLoadingByCourse(prev => ({ ...prev, [course.id]: true }))
    setEnrolledErrorByCourse(prev => ({ ...prev, [course.id]: null }))
    try {
      const rows = await getCourseEnrollments(course.id)
      setEnrolledByCourse(prev => ({ ...prev, [course.id]: rows }))
    } catch (e) {
      setEnrolledErrorByCourse(prev => ({ ...prev, [course.id]: e?.message || String(e) }))
      setEnrolledByCourse(prev => ({ ...prev, [course.id]: [] }))
    } finally {
      setEnrolledLoadingByCourse(prev => ({ ...prev, [course.id]: false }))
    }
  }

  useEffect(() => {
    // Don't start Firestore listeners until auth is ready.
    // Otherwise the listener can start with request.auth == null and fail with permission-denied.
    if (!currentUser?.uid) {
      setCourses([])
      setLoading(false)
      return
    }

    setLoading(true);
    const enrollmentUnsubs = [];

    // Subscribe to real-time updates from courses collection (show all courses)
    const coursesUnsubscribe = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        try {
          const dbCourses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const formatted = dbCourses.map(c => {
            const courseCode = c.code || c.courseCode || 'N/A';
            const studentCount = typeof c.students === 'number'
              ? c.students
              : Array.isArray(c.enrolledStudents)
                ? c.enrolledStudents.length
                : 0;

            return {
              id: c.id,
              code: courseCode,
              name: c.name || c.courseName || 'Unnamed Course',
              thumbnail: COURSE_THUMBNAILS[courseCode] || 'https://via.placeholder.com/300x200?text=Course',
              students: studentCount,
              facultyId: c.facultyId || null,
              updated: c.updatedAt && typeof c.updatedAt === 'object' && c.updatedAt.toDate
                ? c.updatedAt.toDate().toLocaleDateString()
                : c.updated || 'N/A'
            };
          });

          setCourses(formatted);

          // Only subscribe to enrollments for courses owned by this faculty.
          // (Rules typically prevent reading enrollments for non-owned courses.)
          enrollmentUnsubs.forEach(u => u())
          enrollmentUnsubs.length = 0
          const uid = currentUser?.uid || null
          if (uid) {
            formatted.forEach(course => {
              if (course.facultyId === uid) {
                const unsub = subscribeToEnrolledStudentCount(course.id, (count) => {
                  setCourses(prev => prev.map(c => (c.id === course.id ? { ...c, students: count } : c)))
                })
                enrollmentUnsubs.push(unsub)
              }
            })
          }

          setLoading(false);
        } catch (error) {
          console.error('Error processing courses:', error);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error loading courses in real-time:', error);
        setLoading(false);
      }
    );

    return () => {
      enrollmentUnsubs.forEach(u => u())
      coursesUnsubscribe();
    };
  }, [currentUser?.uid]);

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return <div className="loading-spinner">Loading courses...</div>;
  }

  return (
    <div className="faculty-courses-root">
      <header className="topbar fc-topbar">
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
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="fc-main">
        <div className="fc-container">
          <div className="fc-header">
            <h1>My Courses</h1>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="fc-grid">
            {paginatedCourses.map(course => (
              (() => {
                const isOwned = Boolean(currentUser?.uid && course.facultyId === currentUser.uid)
                const isExpanded = expandedCourseId === course.id
                const handleKeyDown = (e) => {
                  if (!isOwned) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleStudents(course)
                  }
                }

                return (
                  <div
                    key={course.id}
                    className={`course-card-fc${isOwned ? ' clickable' : ''}${isExpanded ? ' expanded' : ''}`}
                    onClick={isOwned ? () => toggleStudents(course) : undefined}
                    role={isOwned ? 'button' : undefined}
                    tabIndex={isOwned ? 0 : undefined}
                    onKeyDown={handleKeyDown}
                    aria-expanded={isOwned ? isExpanded : undefined}
                  >
                <div className="course-thumbnail">
                  <img src={course.thumbnail} alt={course.name} />
                </div>
                <div className="course-info-fc">
                  <p className="course-label">{course.code} - {course.name}</p>
                  <p className="course-students-fc">👥 Students Enrolled: {course.students}</p>
                  <p className="course-updated">⏰ Last Updated: {course.updated}</p>

                  {expandedCourseId === course.id && currentUser?.uid && course.facultyId === currentUser.uid && (
                    <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      {enrolledLoadingByCourse[course.id] ? (
                        <p style={{ margin: 0 }}>Loading students...</p>
                      ) : enrolledErrorByCourse[course.id] ? (
                        <p style={{ margin: 0 }}>Failed to load students.</p>
                      ) : (enrolledByCourse[course.id] || []).length === 0 ? (
                        <p style={{ margin: 0 }}>No enrolled students yet.</p>
                      ) : (
                        <div>
                          {(enrolledByCourse[course.id] || []).map(en => (
                            <p key={en.id} style={{ margin: '4px 0' }}>
                                • {(en.studentName || (en.studentEmail ? en.studentEmail.split('@')[0] : 'Student'))}
                              {en.studentEmail && en.studentName ? ` (${en.studentEmail})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  </div>
                )
              })()
            ))}
          </div>

          <div className="fc-pagination">
            <p className="pagination-info">Show {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCourses.length)} of {filteredCourses.length} results</p>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <select 
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                className="pagination-select"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page}>Page {page}</option>
                ))}
              </select>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
