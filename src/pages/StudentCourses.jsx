import React, { useState, useEffect } from 'react';
import './StudentCourses.css';
import UserDropdown from '../components/UserDropdown';
import { auth } from '../firebase';
import {
  getStudentCourses,
  enrollInCourse,
  dropCourse,
  getStudentProfile,
  createStudentProfile,
  enrollStudentInCourse,
  removeStudentFromCourse
} from '../utils/firestoreHelpers';

const AVAILABLE_COURSES = [
    { id: 1, code: 'CS101', name: 'Introduction to Programming', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%2390CAF9" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial"%3E%7B%7D%3C/text%3E%3C/svg%3E', students: 350, updated: 'September 28, 2024', instructor: 'Dr. Alan Turing' },
    { id: 2, code: 'CS201', name: 'Data Structures', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23EF5350" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="60" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3C/svg%3E', students: 320, updated: 'September 28, 2024', instructor: 'Prof. Grace Hopper' },
    { id: 3, code: 'CS301', name: 'Algorithms', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23004B87" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9C%88%EF%B8%8F%3C/text%3E%3C/svg%3E', students: 280, updated: 'September 28, 2024', instructor: 'Dr. Donald Knuth' },
    { id: 4, code: 'CS102', name: 'Web Development', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%2380DEEA" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%92%A1%3C/text%3E%3C/svg%3E', students: 400, updated: 'September 28, 2024', instructor: 'Ms. Ada Lovelace' },
    { id: 5, code: 'CS401', name: 'Machine Learning', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23B0BEC5" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%A4%96%3C/text%3E%3C/svg%3E', students: 250, updated: 'September 28, 2024', instructor: 'Dr. Geoffrey Hinton' },
    { id: 6, code: 'CS501', name: 'Cloud Computing', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23FDD835" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%98%81%EF%B8%8F%3C/text%3E%3C/svg%3E', students: 180, updated: 'September 28, 2024', instructor: 'Mr. Jeff Dean' },
    { id: 7, code: 'CS601', name: 'Advanced Python', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%231E88E5" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%90%8D%3C/text%3E%3C/svg%3E', students: 210, updated: 'September 28, 2024', instructor: 'Prof. Guido van Rossum' },
    { id: 8, code: 'CS702', name: 'Cybersecurity', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23C62828" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%94%92%3C/text%3E%3C/svg%3E', students: 300, updated: 'September 28, 2024', instructor: 'Dr. Whitfield Diffie' },
    { id: 9, code: 'CS801', name: 'AI Ethics', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23E91E63" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%A4%94%3C/text%3E%3C/svg%3E', students: 150, updated: 'September 28, 2024', instructor: 'Prof. Kate Crawford' },
    { id: 10, code: 'CS901', name: 'Blockchain', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23FFA500" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%E2%9B%93%3C/text%3E%3C/svg%3E', students: 190, updated: 'September 28, 2024', instructor: 'Dr. Satoshi Nakamoto' },
    { id: 11, code: 'CS1001', name: 'DevOps Fundamentals', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%234CAF50" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E', students: 220, updated: 'September 28, 2024', instructor: 'Ms. Gene Kim' },
    { id: 12, code: 'CS1101', name: 'API Design', thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect fill="%23673AB7" width="300" height="200"/%3E%3Ctext x="50%" y="50%" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle"%3E%F0%9F%93%A1%3C/text%3E%3C/svg%3E', students: 170, updated: 'September 28, 2024', instructor: 'Mr. Martin Fowler' },
];

export default function StudentCourses({ onNavigate, onLogout, userType }) {
  const [courses, setCourses] = useState([]);
  const [dbCourses, setDbCourses] = useState([]); // courses from Firestore (with doc ids)
  const [studentDocId, setStudentDocId] = useState(null); // student's document id in 'students' collection
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user);
        try {
          // Fetch DB courses and enrollment flag from helper
          const fetchedDbCourses = await getStudentCourses(user.uid); // returns [{ id: docId, courseCode, ..., enrolled: true/false }, ...]
          setDbCourses(fetchedDbCourses || []);

          // Build set of enrolled course codes from fetched DB courses
          const enrolledCodes = new Set(
            (fetchedDbCourses || [])
              .filter(c => c.enrolled)
              .map(c => (c.courseCode || c.code || '').toString())
          );

          // Merge AVAILABLE_COURSES with enrollment flags (match by course code)
          setCourses(AVAILABLE_COURSES.map(c => ({
            ...c,
            enrolled: enrolledCodes.has(c.code),
            thumbnail: c.thumbnail || 'https://via.placeholder.com/300x200?text=Course'
          })));

          // Resolve or create student profile doc id (students collection document id)
          let profile = await getStudentProfile(user.uid);
          if (!profile) {
            // create a simple profile if none exists
            const created = await createStudentProfile(user.uid, {
              name: user.displayName || null,
              email: user.email || null
            });
            // createStudentProfile returns { id: docRef.id, ...studentData }
            profile = created || null;
          }
          if (profile && profile.id) {
            setStudentDocId(profile.id);
          }
        } catch (error) {
          console.error('Error fetching enrollment data:', error);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [userType]);

  const handleEnroll = async (courseId) => {
    if (!currentUser) {
      alert('You must be signed in to enroll.');
      return;
    }
    try {
      const localCourse = courses.find(c => c.id === courseId);
      if (!localCourse) return;

      // Ensure we have the student's document id in 'students' collection
      let sId = studentDocId;
      if (!sId) {
        const profile = await getStudentProfile(currentUser.uid);
        if (!profile) {
          const created = await createStudentProfile(currentUser.uid, {
            name: currentUser.displayName || null,
            email: currentUser.email || null
          });
          sId = created?.id;
        } else {
          sId = profile.id;
        }
        if (!sId) {
          throw new Error('Could not resolve student profile (students collection doc).');
        }
        setStudentDocId(sId);
      }

      // Find corresponding DB course doc (match by code)
      const matchingDbCourse = dbCourses.find(dc => {
        const code = (dc.courseCode || dc.code || '').toString();
        return code === localCourse.code;
      });

      if (!matchingDbCourse) {
        throw new Error('Course not found in database. Enrollment requires the course exist in Firestore.');
      }

      const courseDocId = matchingDbCourse.id;

      if (localCourse.enrolled) {
        // Drop: update student doc and course doc (keep in sync)
        await dropCourse(sId, courseDocId); // updates students/<studentDocId>.enrolledCourses
        try {
          await removeStudentFromCourse(courseDocId, currentUser.uid); // updates courses/<courseId>.enrolledStudents
        } catch (e) {
          // non-blocking: log but proceed
          console.warn('Could not update course document enrolledStudents:', e);
        }
        console.log(`Dropped course ${localCourse.code}`);
      } else {
        // Enroll
        await enrollInCourse(sId, courseDocId);
        try {
          await enrollStudentInCourse(courseDocId, currentUser.uid);
        } catch (e) {
          console.warn('Could not update course document enrolledStudents:', e);
        }
        console.log(`Enrolled in course ${localCourse.code}`);
      }

      // Update local UI state
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, enrolled: !c.enrolled } : c));
    } catch (error) {
      console.error('Error updating enrollment:', error);
      alert('Failed to update enrollment: ' + (error?.message || error));
    }
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="loading-spinner">Loading courses...</div>
    );
  }

  if (courses.length === 0 && !loading) {
    return (
      <div className="student-courses-root">
        <header className="topbar sc-topbar">...</header>
        <main className="sc-main">
          <div className="sc-container">
            <h1>My Courses</h1>
            <p>No courses found. Please check your data source.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="student-courses-root">
      <header className="topbar sc-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate('schedule')}}>Schedule</a>
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
            <h1>My Courses</h1>
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {filteredCourses.length === 0 && searchTerm !== '' ? (
            <p className="no-results">No courses match your search term: **{searchTerm}**</p>
          ) : (
            <div className="sc-grid">
              {paginatedCourses.map(course => (
                <div key={course.id} className="course-card-fc">
                  <div className="course-thumbnail">
                    <img src={course.thumbnail} alt={course.name} />
                  </div>
                  <div className="course-info-fc">
                    <p className="course-label">{course.code} - {course.name}</p>
                    <p className="course-updated">👨‍🏫 {course.instructor || 'Faculty'}</p>
                    <button
                      className={`enroll-btn ${course.enrolled ? 'enrolled' : ''}`}
                      onClick={() => handleEnroll(course.id)}
                    >
                      {course.enrolled ? 'Drop Course' : 'Enroll'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredCourses.length > 0 && (
            <div className="sc-pagination">
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
          )}
        </div>
      </main>
    </div>
  );
}