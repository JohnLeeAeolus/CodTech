import React, { useState, useEffect } from 'react'
import './StudentAssignments.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { uploadSubmissionFile, submitAssignment, getAllAssignments, getStudentProfile } from '../utils/firestoreHelpers'

export default function StudentAssignments({ onNavigate, onLogout, userType }) {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [useBase64, setUseBase64] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
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

      // Always show ALL available assignments
      console.log('Fetching all assignments');
      const data = await getAllAssignments();
      console.log('All available assignments:', data);

      const processedAssignments = data.map(assignment => ({
        ...assignment,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date',
        status: assignment.status || 'pending',
        grade: assignment.grade || null,
        feedback: assignment.feedback || null,
        course: assignment.courseName || 'Unknown Course'
      }));
      
      console.log('Processed assignments:', processedAssignments);
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
    ? assignments 
    : assignments.filter(a => a.status === filterStatus);

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
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sa-main">
        <div className="sa-container">
          <div className="sa-header">
            <h1>My Assignments</h1>
            <p className="sa-subtitle">View and submit your assignments</p>
          </div>

          {/* DEBUG: show assignment count and titles for troubleshooting */}
          {!loading && (
            <div style={{ textAlign: 'center', color: '#777', marginBottom: '12px' }}>
              <small>Assignments found: {assignments.length} {assignments.length > 0 ? `- ${assignments.slice(0,3).map(a=>a.title).join(', ')}` : ''}</small>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
              Loading assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#999' }}>
              No assignments found. Enroll in courses to see assignments.
            </div>
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
          </div>

          <div className="assignments-list">
            {filteredAssignments.map(assignment => (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="assignment-title-section">
                    <h3 className="assignment-title">{assignment.title}</h3>
                    <p className="assignment-course">{assignment.course}</p>
                  </div>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(assignment.status) }}
                  >
                    {getStatusLabel(assignment.status)}
                  </span>
                </div>

                <div className="assignment-body">
                  <div className="assignment-info">
                    <div className="info-item">
                      <span className="info-icon">📅</span>
                      <div className="info-content">
                        <p className="info-label">Due Date</p>
                        <p className="info-value">{assignment.dueDate}</p>
                        {assignment.dueDate !== 'No due date' && daysUntilDue(assignment.dueDate) >= 0 && assignment.status !== 'graded' && (
                          <p className="info-meta">
                            {daysUntilDue(assignment.dueDate) === 0 ? 'Due today' : `${daysUntilDue(assignment.dueDate)} days left`}
                          </p>
                        )}
                      </div>
                    </div>

                    {assignment.status === 'graded' && assignment.grade !== null && (
                      <div className="info-item">
                        <span className="info-icon">⭐</span>
                        <div className="info-content">
                          <p className="info-label">Grade</p>
                          <p className="info-value grade-value">{assignment.grade}%</p>
                        </div>
                      </div>
                    )}

                    {assignment.totalPoints && (
                      <div className="info-item">
                        <span className="info-icon">📊</span>
                        <div className="info-content">
                          <p className="info-label">Total Points</p>
                          <p className="info-value">{assignment.totalPoints}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {assignment.description && (
                    <div className="description-section">
                      <p className="description-label">Description</p>
                      <p className="description-text">{assignment.description}</p>
                    </div>
                  )}

                  {assignment.feedback && assignment.status === 'graded' && (
                    <div className="feedback-section">
                      <p className="feedback-label">Feedback from Instructor</p>
                      <p className="feedback-text">{assignment.feedback}</p>
                    </div>
                  )}

                  {assignment.attachment && (
                    <div className="attachment-section">
                      <p className="attachment-label">📎 Attached File</p>
                      <a href={assignment.attachment.downloadURL} target="_blank" rel="noopener noreferrer" className="attachment-link">
                        {assignment.attachment.fileName || 'Download Assignment'}
                      </a>
                    </div>
                  )}
                </div>

                <div className="assignment-actions">
                  <button 
                    className="btn-view"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    View Details
                  </button>
                  {assignment.status === 'submitted' ? (
                    <button className="btn-submitted" disabled>
                      ✓ Submitted
                    </button>
                  ) : assignment.status === 'graded' ? (
                    <button className="btn-graded" disabled>
                      ✓ Graded
                    </button>
                  ) : (
                    <button 
                      className="btn-submit"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowSubmitModal(true);
                      }}
                    >
                      Submit Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
