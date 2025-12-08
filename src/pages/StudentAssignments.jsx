import React, { useState, useEffect } from 'react'
import './StudentAssignments.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { uploadSubmissionFile, submitAssignment, getAllAssignments, getStudentProfile, getStudentSubmissions } from '../utils/firestoreHelpers'

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
            <button title="View Details" onClick={() => onViewDetails(assignment)}>👁️</button>
            {!isSubmitted && !isGraded ? (
                <button title="Submit" onClick={() => onSubmit(assignment)} className="submit-btn">📤</button>
            ) : isGraded ? (
                <button title="View Grade" onClick={() => onViewDetails(assignment)} className="graded-btn">✓</button>
            ) : (
                <button title="Submitted" disabled className="submitted-btn">✓</button>
            )}
        </div>
    </div>
);

export default function StudentAssignments({ onNavigate, onLogout, userType }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [useBase64, setUseBase64] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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

      console.log('Fetching student submissions to merge status');
      const submissions = await getStudentSubmissions(userId);
      const subByAssignment = new Map(submissions.map(sub => [sub.assignmentId, sub]));

      const processedAssignments = data.map(assignment => {
        const sub = subByAssignment.get(assignment.id);
        const statusFromSubmission = sub ? (sub.status === 'graded' ? 'graded' : 'submitted') : (assignment.status || 'pending');
        return {
          ...assignment,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date',
          status: statusFromSubmission,
          grade: sub?.grade ?? assignment.grade ?? null,
          feedback: sub?.feedback ?? assignment.feedback ?? null,
          course: assignment.courseName || 'Unknown Course',
          type: assignment.type || 'assignment'
        }
      });
      
      console.log('Processed assignments with submission status:', processedAssignments);
      setAssignments(processedAssignments);
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

  const getTypeLabel = (type) => {
    const labels = {
      'assignment': 'Assignment',
      'quiz': 'Quiz',
      'seatwork': 'Seatwork',
      'project': 'Project'
    };
    return labels[type] || 'Assignment';
  };

  const getTypeIcon = (type) => {
    const icons = {
      'assignment': '📋',
      'quiz': '❓',
      'seatwork': '💼',
      'project': '🎯'
    };
    return icons[type] || '📋';
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

  const handleSubmit = async () => {
    if (!submissionFile || !selectedAssignment || !currentUser) {
      alert('Please select a file to submit');
      return;
    }

    try {
      setSubmitting(true);
      // If user chose to store as Base64 in DB, convert file and save base64 string
      if (useBase64) {
        // Convert file to Base64
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(file) // returns data:<mime>;base64,<data>
        })

        const base64DataUrl = await fileToBase64(submissionFile)

        // Safety check: Firestore documents cannot exceed ~1 MiB — block large files
        const approximateBase64Size = base64DataUrl.length
        const sizeLimit = 600000 // ~600KB limit to be safe for document size
        if (approximateBase64Size > sizeLimit) {
          alert('File is too large to store as Base64 in Firestore. Please use normal file upload instead.')
          setSubmitting(false)
          return
        }

        await submitAssignment(currentUser.uid, selectedAssignment.id, {
          base64DataUrl,
          fileName: submissionFile.name,
          fileSize: submissionFile.size,
          fileType: submissionFile.type,
          submittedAt: new Date(),
          courseId: selectedAssignment.courseId || selectedAssignment.course || null,
          studentName: studentProfile?.firstName ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim() : (studentProfile?.name || currentUser.displayName || ''),
          studentEmail: currentUser.email || studentProfile?.email || ''
        })
      } else {
        // Upload file to Firebase Storage
        const uploadedFile = await uploadSubmissionFile(
          currentUser.uid,
          selectedAssignment.id,
          submissionFile
        );

        // Create submission record in Firestore (include storage path)
        await submitAssignment(currentUser.uid, selectedAssignment.id, {
          fileUrl: uploadedFile.downloadURL,
          storagePath: uploadedFile.storagePath,
          fileName: submissionFile.name,
          fileSize: submissionFile.size,
          submittedAt: new Date(),
          courseId: selectedAssignment.courseId || selectedAssignment.course || null,
          studentName: studentProfile?.firstName ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim() : (studentProfile?.name || currentUser.displayName || ''),
          studentEmail: currentUser.email || studentProfile?.email || ''
        });
      }

      // Update local state
      setAssignments(assignments.map(a => 
        a.id === selectedAssignment.id 
          ? { ...a, status: 'submitted' }
          : a
      ));
      
      setShowSubmitModal(false);
      setSubmissionFile(null);
      setSelectedAssignment(null);
      alert('✓ Assignment submitted successfully!');
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('❌ Error: ' + (err.message || 'Failed to submit assignment'));
    } finally {
      setSubmitting(false);
    }
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
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
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
              <p className="sa-breadcrumb">Assignments</p>
              <h1>My Assignments</h1>
              <p className="sa-subtitle">View and submit your assignments</p>
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
                  <p className="sa-empty-text">Your faculty will post assignments in the Dashboard. Check back soon!</p>
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
                  <h2>No assignments match these filters</h2>
                  <p className="sa-empty-text">Try switching the status or type to see more items.</p>
                </div>
              ) : (
                <div className="assignment-list">
                  {filteredAssignments.map(assignment => (
                    <AssignmentItem 
                      key={assignment.id} 
                      assignment={assignment} 
                      onViewDetails={(a) => setSelectedAssignment(a)}
                      onSubmit={(a) => {
                        setSelectedAssignment(a);
                        setShowSubmitModal(true);
                      }}
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

      {/* Submit Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submit Assignment</h2>
              <button 
                className="modal-close"
                onClick={() => setShowSubmitModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-info">Assignment: <strong>{selectedAssignment.title}</strong></p>
              <p className="modal-info">Course: <strong>{selectedAssignment.course}</strong></p>
              
              <div className="upload-section">
                <label htmlFor="file-input" className="upload-label">
                  📎 Choose File to Submit
                </label>
                <input 
                  id="file-input"
                  type="file" 
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  className="file-input"
                />
                {submissionFile && (
                  <div className="file-preview">
                    <p className="file-name">✓ {submissionFile.name}</p>
                    <p className="file-size">({(submissionFile.size / 1024).toFixed(2)} KB)</p>
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={useBase64} onChange={e => setUseBase64(e.target.checked)} />
                    Store file as Base64 in database (for small files / testing only)
                  </label>
                  {useBase64 && (
                    <p style={{ fontSize: '12px', color: '#b71c1c', marginTop: '6px' }}>
                      Warning: Firestore document size limit (~1 MiB). Only use for small files.
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-note">
                <p className="note-title">Note:</p>
                <ul className="note-list">
                  <li>Accepted formats: PDF, DOC, DOCX, TXT, ZIP</li>
                  <li>Maximum file size: 10 MB</li>
                  <li>You can resubmit if needed</li>
                </ul>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel-modal"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-submit-modal"
                onClick={handleSubmit}
                disabled={!submissionFile || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedAssignment && !showSubmitModal && (
        <div className="modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedAssignment(null)}
              >
                ✕
              </button>
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
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedAssignment.status) }}
                  >
                    {getStatusLabel(selectedAssignment.status)}
                  </span>
                </p>
              </div>
              {selectedAssignment.totalPoints && (
                <div className="detail-item">
                  <p className="detail-label">Total Points</p>
                  <p className="detail-value">{selectedAssignment.totalPoints}</p>
                </div>
              )}
              {selectedAssignment.grade !== null && (
                <div className="detail-item">
                  <p className="detail-label">Grade</p>
                  <p className="detail-value">{selectedAssignment.grade}%</p>
                </div>
              )}
              {selectedAssignment.description && (
                <div className="detail-item">
                  <p className="detail-label">Description</p>
                  <p className="detail-value">{selectedAssignment.description}</p>
                </div>
              )}
              {selectedAssignment.feedback && (
                <div className="detail-item">
                  <p className="detail-label">Instructor Feedback</p>
                  <p className="detail-value">{selectedAssignment.feedback}</p>
                </div>
              )}
              {selectedAssignment.attachment && (
                <div className="detail-item">
                  <p className="detail-label">Attached File</p>
                  <p className="detail-value">
                    <a href={selectedAssignment.attachment.downloadURL} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                      📎 {selectedAssignment.attachment.fileName || 'Download'}
                    </a>
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn-cancel-modal"
                onClick={() => setSelectedAssignment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
