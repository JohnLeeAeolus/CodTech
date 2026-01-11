import React, { useState, useEffect } from 'react'
import './StudentAssignments.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import {
  getAllAssignments,
  getAllCourses,
  getStudentProfile,
  getStudentSubmissions,
  enrollInCourse,
  createEnrollment,
  findEnrollmentsByStudentAndCourse
} from '../utils/firestoreHelpers'

const getTypeIcon = (type) => {
  const icons = {
    'assignment': '📋',
    'quiz': '❓',
    'seatwork': '💼',
    'project': '🎯'
  };
  return icons[type] || '📋';
};

const getTypeLabel = (type) => {
  const labels = {
    'assignment': 'Assignment',
    'quiz': 'Quiz',
    'seatwork': 'Seatwork',
    'project': 'Project'
  };
  return labels[type] || 'Assignment';
};

const getTypeColor = (type) => {
  const colors = {
    'assignment': '#667eea',
    'quiz': '#764ba2',
    'seatwork': '#f093fb',
    'project': '#4facfe'
  };
  return colors[type] || '#667eea';
};

const getPrimaryActionLabel = (type) => {
  const t = (type || 'assignment').toString().toLowerCase();
  if (t === 'quiz') return 'Take Quiz';
  if (t === 'seatwork') return 'Take Seatwork';
  if (t === 'project') return 'Submit Project';
  return 'Submit Assignment';
};

const AssignmentItem = ({ assignment, onViewDetails, onSubmit, isSubmitted, isGraded }) => (
    <div className={`assignment-item ${isGraded ? 'completed' : ''}`}>
        <div className="item-details">
            <div className="item-type-badge" style={{ backgroundColor: getTypeColor(assignment.type || 'assignment') }}>
              {getTypeIcon(assignment.type || 'assignment')} {getTypeLabel(assignment.type || 'assignment')}
            </div>
            <p className="item-name">{assignment.title}</p>
            <p className="item-course">{assignment.course}</p>
            {assignment.description && <p className="item-description">{assignment.description}</p>}
            {assignment.externalLink && (
                <a
                    className="item-link"
                    href={assignment.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🔗 Open Link
                </a>
            )}
        </div>
        <span className="item-date">{assignment.dueDate ? assignment.dueDate : 'No due date'}</span>
        <div className="item-actions">
            {!isSubmitted && !isGraded ? (
                <button onClick={() => onSubmit(assignment)} className="sa-btn-take-activity">Take Activity</button>
            ) : (
                <button disabled className="sa-btn-finished">Finished</button>
            )}
        </div>
    </div>
);

export default function StudentAssignments({ onNavigate, onLogout, userType }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filterStatus, setFilterStatus] = useState(() => {
    const shouldFilterSubmitted = sessionStorage.getItem('filterSubmitted');
    if (shouldFilterSubmitted) {
      sessionStorage.removeItem('filterSubmitted');
      return 'submitted';
    }
    return 'all';
  });
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadStudentData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loadStudentData = async (userId) => {
    try {
      console.log('Loading student data for:', userId);
      
      // Get student profile
      const profile = await getStudentProfile(userId);
      console.log('Student profile:', profile);
      setStudentProfile(profile);

      // Pull student's own submissions to mark submitted/graded states
      console.log('Fetching all assignments');
      const data = await getAllAssignments();
      console.log('All available assignments:', data);

      // Resolve course IDs to readable names so the UI doesn't show raw IDs.
      let courseNameById = new Map();
      try {
        const courses = await getAllCourses();
        courseNameById = new Map(
          (courses || []).map(c => [
            c.id,
            c.courseName || c.name || c.title || c.code || c.courseCode || 'Unknown Course'
          ])
        );
      } catch (e) {
        console.warn('Could not load courses for name mapping:', e);
      }

      console.log('Fetching student submissions to merge status');
      const submissions = await getStudentSubmissions(userId);
      const subByAssignment = new Map(submissions.map(sub => [sub.assignmentId, sub]));

      const processedAssignments = data.map(assignment => {
        const sub = subByAssignment.get(assignment.id);
        const statusFromSubmission = sub ? (sub.status === 'graded' ? 'graded' : 'submitted') : (assignment.status || 'pending');
        const resolvedCourse =
          (assignment.courseId ? courseNameById.get(assignment.courseId) : null) ||
          assignment.courseName ||
          assignment.course ||
          'Unknown Course';
        return {
          ...assignment,
          dueDateRaw: assignment.dueDate || null,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date',
          status: statusFromSubmission,
          grade: sub?.grade ?? assignment.grade ?? null,
          feedback: sub?.feedback ?? assignment.feedback ?? null,
          submission: sub || null,
          course: resolvedCourse,
          courseName: resolvedCourse,
          type: assignment.type || 'assignment'
        }
      });

      // Latest first (prefer dueDate; fallback to createdAt). This affects list order on the student Assignments page.
      const toMillis = (v) => {
        if (!v) return null;
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const d = new Date(v);
          return Number.isNaN(d.getTime()) ? null : d.getTime();
        }
        if (typeof v === 'object' && typeof v.seconds === 'number') {
          return v.seconds * 1000 + (typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1e6) : 0);
        }
        if (typeof v.toMillis === 'function') {
          try { return v.toMillis(); } catch { return null; }
        }
        return null;
      };

      processedAssignments.sort((a, b) => {
        const aCreated = toMillis(a?.createdAt) ?? toMillis(a?.created_at);
        const bCreated = toMillis(b?.createdAt) ?? toMillis(b?.created_at);
        if (aCreated != null && bCreated != null) return bCreated - aCreated;
        if (aCreated != null) return -1;
        if (bCreated != null) return 1;

        const aDue = toMillis(a?.dueDateRaw);
        const bDue = toMillis(b?.dueDateRaw);
        if (aDue != null && bDue != null) return bDue - aDue;
        if (aDue != null) return -1;
        if (bDue != null) return 1;

        return String(b?.title || '').localeCompare(String(a?.title || ''));
      });
      
      console.log('Processed assignments with submission status:', processedAssignments);
      setAssignments(processedAssignments);

      // If the Dashboard timeline set a focused activity, open it automatically.
      try {
        const rawFocus = window.sessionStorage.getItem('codtech.studentAssignments.focus.v1')
        if (rawFocus) {
          window.sessionStorage.removeItem('codtech.studentAssignments.focus.v1')
          const focus = JSON.parse(rawFocus)
          const focusId = focus?.id
          const focusTitle = focus?.title
          const focusDueDate = focus?.dueDate

          let match = null
          if (focusId != null) {
            match = processedAssignments.find(a => String(a.id) === String(focusId)) || null
          }
          if (!match && focusTitle) {
            const titleNorm = String(focusTitle).trim().toLowerCase()
            match = processedAssignments.find(a => String(a?.title || '').trim().toLowerCase() === titleNorm) || null

            // If multiple could match by title in the future, try to further narrow by dueDate
            if (match && focusDueDate) {
              const focusDue = new Date(focusDueDate)
              const focusDueKey = Number.isNaN(focusDue.getTime()) ? null : focusDue.toLocaleDateString()
              if (focusDueKey) {
                const candidates = processedAssignments.filter(a => String(a?.title || '').trim().toLowerCase() === titleNorm)
                const byDue = candidates.find(a => String(a?.dueDate || '').includes(focusDueKey))
                if (byDue) match = byDue
              }
            }
          }

          if (match) {
            if (focus?.openSubmit) onNavigate && onNavigate(`activitySubmit:${match.id}`)
            else setSelectedAssignment(match)
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    if (!currentUser) return;
    try {
      console.log('Enrolling in course:', courseId);
      await enrollInCourse(currentUser.uid, courseId);

      // Also create an `enrollments` record so faculty screens that rely on
      // enrollments (counts, lists) reflect this enrollment.
      try {
        const existing = await findEnrollmentsByStudentAndCourse(currentUser.uid, courseId)
        if (!existing || existing.length === 0) {
          await createEnrollment(currentUser.uid, courseId, {
            studentName:
              (studentProfile?.firstName
                ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim()
                : (studentProfile?.name || currentUser.displayName || null)),
            studentEmail: currentUser.email || studentProfile?.email || null
          })
        }
      } catch (e) {
        console.warn('Could not create enrollment record:', e)
      }

      alert('✓ Successfully enrolled in course!');
      // Reload assignments
      await loadStudentData(currentUser.uid);
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Error enrolling in course: ' + error.message);
    }
  };

  const filteredAssignments = filterStatus === 'all' 
    ? assignments.filter(a => filterType === 'all' ? true : a.type === filterType)
    : assignments.filter(a => a.status === filterStatus && (filterType === 'all' ? true : a.type === filterType));

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#ffa726';
      case 'submitted': return '#42a5f5';
      case 'graded': return '#66bb6a';
      case 'overdue': return '#ef5350';
      default: return '#999';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const daysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="student-assignments-root">
      <header className="topbar sa-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-right">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sa-main">
        <div className="sa-container">
          <div className="sa-header-row">
            <div>
              <p className="sa-breadcrumb">Activities</p>
              <h1>My Activities</h1>
            </div>
            <div className="sa-header-actions">
              <button 
                className="sa-refresh-btn"
                onClick={() => currentUser && loadStudentData(currentUser.uid)}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="sa-loading">Loading assignments...</div>
          ) : (
            <>
              <div className="filter-section">
                <div className="filter-tabs">
                  <button 
                    className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                  >
                    All ({assignments.length})
                  </button>
                  <button 
                    className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('pending')}
                  >
                    Pending ({assignments.filter(a => a.status === 'pending').length})
                  </button>
                  <button 
                    className={`filter-btn ${filterStatus === 'submitted' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('submitted')}
                  >
                    Submitted ({assignments.filter(a => a.status === 'submitted').length})
                  </button>
                  <button 
                    className={`filter-btn ${filterStatus === 'graded' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('graded')}
                  >
                    Graded ({assignments.filter(a => a.status === 'graded').length})
                  </button>
                  <button 
                    className={`filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('overdue')}
                  >
                    Overdue ({assignments.filter(a => a.status === 'overdue').length})
                  </button>
                </div>

                <div className="type-filter-section">
                  <p className="filter-label">Filter by Type</p>
                  <div className="type-filter-tabs">
                    <button 
                      className={`type-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterType('all')}
                      title="All types"
                    >
                      All
                    </button>
                    <button 
                      className={`type-filter-btn ${filterType === 'assignment' ? 'active' : ''}`}
                      onClick={() => setFilterType('assignment')}
                      title="Assignments"
                    >
                      📋 Assignments ({assignments.filter(a => a.type === 'assignment').length})
                    </button>
                    <button 
                      className={`type-filter-btn ${filterType === 'quiz' ? 'active' : ''}`}
                      onClick={() => setFilterType('quiz')}
                      title="Quizzes"
                    >
                      ❓ Quizzes ({assignments.filter(a => a.type === 'quiz').length})
                    </button>
                    <button 
                      className={`type-filter-btn ${filterType === 'seatwork' ? 'active' : ''}`}
                      onClick={() => setFilterType('seatwork')}
                      title="Seatwork"
                    >
                      💼 Seatwork ({assignments.filter(a => a.type === 'seatwork').length})
                    </button>
                    <button 
                      className={`type-filter-btn ${filterType === 'project' ? 'active' : ''}`}
                      onClick={() => setFilterType('project')}
                      title="Projects"
                    >
                      🎯 Projects ({assignments.filter(a => a.type === 'project').length})
                    </button>
                  </div>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="sa-empty-card">
                  <div className="sa-empty-icon">📑</div>
                  <h2>No Assignments Yet</h2>
                  <p className="sa-empty-text">Your faculty will post activities in the Dashboard. Check back soon!</p>
                  <button 
                    className="sa-go-dashboard"
                    onClick={() => onNavigate && onNavigate('dashboard')}
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="sa-empty-card">
                  <div className="sa-empty-icon">🗂️</div>
                  <h2>No Activities match these filters</h2>
                  <p className="sa-empty-text">Try switching the status or type to see more items.</p>
                </div>
              ) : (
                <div className="assignment-list">
                  {filteredAssignments.map(assignment => (
                    <AssignmentItem 
                      key={assignment.id} 
                      assignment={assignment} 
                      onViewDetails={(a) => setSelectedAssignment(a)}
                      onSubmit={(a) => onNavigate && onNavigate(`activitySubmit:${a.id}`)}
                      isSubmitted={assignment.status === 'submitted'}
                      isGraded={assignment.status === 'graded'}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Details Modal (kept as modal) */}
      {selectedAssignment && (
        <div className="modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button className="modal-close" onClick={() => setSelectedAssignment(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-item">
                <p className="detail-label">Course</p>
                <p className="detail-value">{selectedAssignment.course}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Due Date</p>
                <p className="detail-value">{selectedAssignment.dueDate}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Status</p>
                <p className="detail-value">
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedAssignment.status) }}>
                    {getStatusLabel(selectedAssignment.status)}
                  </span>
                </p>
              </div>

              {selectedAssignment.description && (
                <div className="detail-item">
                  <p className="detail-label">Description</p>
                  <p className="detail-value">{selectedAssignment.description}</p>
                </div>
              )}

              {selectedAssignment.externalLink && (
                <div className="detail-item">
                  <p className="detail-label">External Link</p>
                  <p className="detail-value">
                    <a className="item-link" href={selectedAssignment.externalLink} target="_blank" rel="noopener noreferrer">
                      🔗 Open Link
                    </a>
                  </p>
                </div>
              )}

              {selectedAssignment.attachment?.downloadURL && (
                <div className="detail-item">
                  <p className="detail-label">Attached File</p>
                  <p className="detail-value">
                    <a
                      href={selectedAssignment.attachment.downloadURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#6366f1', textDecoration: 'none' }}
                    >
                      📎 {selectedAssignment.attachment.fileName || 'Download'}
                    </a>
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={() => setSelectedAssignment(null)}>
                Back
              </button>
              <button
                className="btn-submit-modal"
                onClick={() => {
                  const id = selectedAssignment?.id
                  setSelectedAssignment(null)
                  if (id) onNavigate && onNavigate(`activitySubmit:${id}`)
                }}
              >
                {getPrimaryActionLabel(selectedAssignment.type)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
