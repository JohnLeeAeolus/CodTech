import React, { useState } from 'react'
import './StudentAssignments.css'
import logo from '../assets/codtech-logo.png'
import UserDropdown from '../components/UserDropdown'

export default function StudentAssignments({ onNavigate, onLogout, userType }) {
  const [assignments, setAssignments] = useState([
    { id: 1, title: 'Recursion Basics', course: 'CS101', dueDate: '2024-12-15', status: 'pending', grade: null, feedback: null },
    { id: 2, title: 'Array Manipulation', course: 'CS101', dueDate: '2024-12-20', status: 'submitted', grade: null, feedback: null },
    { id: 3, title: 'Sorting Algorithms', course: 'CS201', dueDate: '2024-12-10', status: 'graded', grade: 95, feedback: 'Excellent work!' },
    { id: 4, title: 'Binary Trees', course: 'CS201', dueDate: '2024-12-25', status: 'pending', grade: null, feedback: null },
    { id: 5, title: 'Graph Theory Project', course: 'CS301', dueDate: '2024-12-30', status: 'pending', grade: null, feedback: null },
    { id: 6, title: 'Dynamic Programming', course: 'CS301', dueDate: '2024-12-18', status: 'overdue', grade: null, feedback: null },
  ]);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

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

  const handleSubmit = () => {
    if (submissionFile && selectedAssignment) {
      setAssignments(assignments.map(a => 
        a.id === selectedAssignment.id 
          ? { ...a, status: 'submitted' }
          : a
      ));
      setShowSubmitModal(false);
      setSubmissionFile(null);
      setSelectedAssignment(null);
      alert('Assignment submitted successfully!');
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
        <div className="topbar-center">
          <div className="logo-circle"><img src={logo} alt="CodTech" /></div>
          <div className="codtech-title">CodTech</div>
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
                        {daysUntilDue(assignment.dueDate) >= 0 && assignment.status !== 'graded' && (
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
                  </div>

                  {assignment.feedback && assignment.status === 'graded' && (
                    <div className="feedback-section">
                      <p className="feedback-label">Feedback from Instructor</p>
                      <p className="feedback-text">{assignment.feedback}</p>
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
                  {assignment.status === 'pending' || assignment.status === 'overdue' ? (
                    <button 
                      className="btn-submit"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowSubmitModal(true);
                      }}
                    >
                      Submit Now
                    </button>
                  ) : assignment.status === 'submitted' ? (
                    <button className="btn-submitted" disabled>
                      ✓ Submitted
                    </button>
                  ) : (
                    <button className="btn-graded" disabled>
                      ✓ Graded
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              >
                Cancel
              </button>
              <button 
                className="btn-submit-modal"
                onClick={handleSubmit}
                disabled={!submissionFile}
              >
                Submit Assignment
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
              {selectedAssignment.grade !== null && (
                <div className="detail-item">
                  <p className="detail-label">Grade</p>
                  <p className="detail-value">{selectedAssignment.grade}%</p>
                </div>
              )}
              {selectedAssignment.feedback && (
                <div className="detail-item">
                  <p className="detail-label">Instructor Feedback</p>
                  <p className="detail-value">{selectedAssignment.feedback}</p>
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
