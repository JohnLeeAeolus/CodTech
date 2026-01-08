import React, { useState, useEffect } from 'react'
import './StudentAssignments.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import {
  uploadSubmissionFile,
  submitAssignment,
  getAllAssignments,
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
            <button title="View Details" onClick={() => onViewDetails(assignment)}>👁️</button>
            {!isSubmitted && !isGraded ? (
            <button title={getPrimaryActionLabel(assignment.type)} onClick={() => onSubmit(assignment)} className="submit-btn">📤</button>
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
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);

  const normalizeText = (v) => {
    if (v == null) return '';
    return String(v).trim().toLowerCase();
  };

  const getQuestionId = (q, idx) => q?.id || q?.questionId || String(idx);

  const getSubmissionAnswersMap = (submission) => {
    const raw = submission?.answers ?? submission?.responses ?? null;
    if (!raw) return new Map();
    if (Array.isArray(raw)) {
      return new Map(
        raw
          .map((a, idx) => {
            const qid = a?.questionId || a?.id || String(idx);
            return [String(qid), a?.answer ?? a?.value ?? a?.response ?? null];
          })
          .filter(([qid]) => qid != null)
      );
    }
    if (typeof raw === 'object') {
      return new Map(Object.entries(raw).map(([k, v]) => [String(k), v]));
    }
    return new Map();
  };

  const getCorrectAnswerDisplay = (q) => {
    const kind = (q?.kind || '').toString().toLowerCase();
    if (kind === 'multiple_choice') {
      const options = Array.isArray(q?.options) ? q.options : [];
      const idx = Number(q?.correctIndex);
      if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return String(options[idx] ?? '');
      return '—';
    }
    if (kind === 'true_false') {
      if (typeof q?.correctAnswer === 'boolean') return q.correctAnswer ? 'True' : 'False';
      if (typeof q?.correctAnswer === 'string') {
        const t = normalizeText(q.correctAnswer);
        if (t === 'true' || t === 'false') return t === 'true' ? 'True' : 'False';
      }
      return '—';
    }
    if (kind === 'identification') {
      const accepted = [];
      if (Array.isArray(q?.acceptedAnswers)) accepted.push(...q.acceptedAnswers);
      if (Array.isArray(q?.correctAnswers)) accepted.push(...q.correctAnswers);
      if (typeof q?.correctAnswer === 'string') {
        const parts = q.correctAnswer.split(/\||,/g).map(s => s.trim()).filter(Boolean);
        accepted.push(...parts);
      } else if (q?.correctAnswer != null) {
        accepted.push(q.correctAnswer);
      }
      const unique = Array.from(new Set(accepted.map(v => String(v).trim()).filter(Boolean)));
      if (unique.length === 0) return '—';
      return unique.join(' / ');
    }
    return 'Manual checking';
  };

  const formatStudentAnswer = (q, ans) => {
    const kind = (q?.kind || '').toString().toLowerCase();
    if (ans == null) return '—';
    if (kind === 'multiple_choice') {
      const options = Array.isArray(q?.options) ? q.options : [];
      const idx = typeof ans === 'number' ? ans : Number(ans);
      if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return String(options[idx] ?? '');
      return String(ans);
    }
    if (kind === 'true_false') {
      if (typeof ans === 'boolean') return ans ? 'True' : 'False';
      const t = normalizeText(ans);
      if (t === 'true' || t === 'false') return t === 'true' ? 'True' : 'False';
      return String(ans);
    }
    if (typeof ans === 'string') return ans;
    return String(ans);
  };

  const isAnswerCorrect = (q, ans) => {
    const kind = (q?.kind || '').toString().toLowerCase();
    if (kind === 'multiple_choice') {
      const aIdx = typeof ans === 'number' ? ans : Number(ans);
      const cIdx = Number(q?.correctIndex);
      if (!Number.isFinite(aIdx) || !Number.isFinite(cIdx)) return null;
      return aIdx === cIdx;
    }
    if (kind === 'true_false') {
      const a = (typeof ans === 'boolean') ? ans : (normalizeText(ans) === 'true' ? true : normalizeText(ans) === 'false' ? false : null);
      const c = (typeof q?.correctAnswer === 'boolean') ? q.correctAnswer : (normalizeText(q?.correctAnswer) === 'true' ? true : normalizeText(q?.correctAnswer) === 'false' ? false : null);
      if (a == null || c == null) return null;
      return a === c;
    }
    if (kind === 'identification') {
      const a = normalizeText(ans);
      if (!a) return null;
      const accepted = [];
      if (Array.isArray(q?.acceptedAnswers)) accepted.push(...q.acceptedAnswers);
      if (Array.isArray(q?.correctAnswers)) accepted.push(...q.correctAnswers);
      if (typeof q?.correctAnswer === 'string') {
        accepted.push(...q.correctAnswer.split(/\||,/g).map(s => s.trim()).filter(Boolean));
      } else if (q?.correctAnswer != null) {
        accepted.push(q.correctAnswer);
      }
      const normalizedAccepted = accepted.map(normalizeText).filter(Boolean);
      if (normalizedAccepted.length === 0) return null;
      return normalizedAccepted.includes(a);
    }
    return null;
  };

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
          submission: sub || null,
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

  const isQuestionBasedActivity = (a) => {
    if (!a) return false;
    const t = (a.type || '').toString().toLowerCase();
    if (t !== 'quiz' && t !== 'seatwork') return false;
    return Array.isArray(a.questions) && a.questions.length > 0;
  };

  const updateAnswer = (questionId, value) => {
    setQuestionAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !currentUser) return;

    const isQuizLike = isQuestionBasedActivity(selectedAssignment);
    if (!isQuizLike && !submissionFile) {
      alert('Please select a file to submit');
      return;
    }

    try {
      setSubmitting(true);

      // Quiz/Seatwork with questions: submit answers instead of file.
      if (isQuizLike) {
        const questions = Array.isArray(selectedAssignment.questions) ? selectedAssignment.questions : [];
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qid = q?.id || q?.questionId || String(i);
          const v = questionAnswers[qid];
          const kind = (q?.kind || '').toString().toLowerCase();
          const isEmpty = v == null || (typeof v === 'string' && v.trim() === '');
          if (kind === 'multiple_choice') {
            if (!(Number.isFinite(v) || (typeof v === 'string' && v !== ''))) {
              alert('Please answer all questions before submitting.');
              setSubmitting(false);
              return;
            }
          } else if (kind === 'true_false') {
            if (typeof v !== 'boolean') {
              alert('Please answer all questions before submitting.');
              setSubmitting(false);
              return;
            }
          } else {
            if (isEmpty) {
              alert('Please answer all questions before submitting.');
              setSubmitting(false);
              return;
            }
          }
        }

        const answers = questions.map((q, i) => {
          const qid = q?.id || q?.questionId || String(i);
          return {
            questionId: qid,
            kind: q?.kind || null,
            answer: qid ? (questionAnswers[qid] ?? null) : null
          };
        });

        await submitAssignment(currentUser.uid, selectedAssignment.id, {
          activityType: (selectedAssignment.type || 'quiz').toString().toLowerCase(),
          answers,
          submittedAt: new Date(),
          courseId: selectedAssignment.courseId || null,
          studentName: studentProfile?.firstName ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim() : (studentProfile?.name || currentUser.displayName || ''),
          studentEmail: currentUser.email || studentProfile?.email || ''
        });
      } else {
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
          courseId: selectedAssignment.courseId || null,
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
          courseId: selectedAssignment.courseId || null,
          studentName: studentProfile?.firstName ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim() : (studentProfile?.name || currentUser.displayName || ''),
          studentEmail: currentUser.email || studentProfile?.email || ''
        });
      }
      }

      // Update local state
      setAssignments(assignments.map(a => 
        a.id === selectedAssignment.id 
          ? { ...a, status: 'submitted' }
          : a
      ));
      
      setShowSubmitModal(false);
      setSubmissionFile(null);
      setQuestionAnswers({});
      setSelectedAssignment(null);
      alert('✓ Submitted successfully!');
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
                        // Initialize answer state for question-based activities
                        if (Array.isArray(a?.questions) && a.questions.length > 0) {
                          const init = {};
                          a.questions.forEach((q, idx) => {
                            const qid = q?.id || q?.questionId || String(idx);
                            const kind = (q?.kind || '').toString().toLowerCase();
                            if (kind === 'true_false') init[qid] = null;
                            else if (kind === 'multiple_choice') init[qid] = null;
                            else init[qid] = '';
                          });
                          setQuestionAnswers(init);
                        } else {
                          setQuestionAnswers({});
                        }
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
              <h2>{getPrimaryActionLabel(selectedAssignment.type)}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowSubmitModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-info">Activity: <strong>{selectedAssignment.title}</strong></p>
              <p className="modal-info">Course: <strong>{selectedAssignment.course}</strong></p>

              {isQuestionBasedActivity(selectedAssignment) ? (
                <div className="sa-quiz-form">
                  {(selectedAssignment.questions || []).map((q, idx) => {
                    const qid = q?.id || q?.questionId || String(idx);
                    const kind = (q?.kind || '').toString().toLowerCase();
                    const prompt = q?.prompt || '';
                    const options = Array.isArray(q?.options) ? q.options : [];
                    const value = questionAnswers[qid];

                    return (
                      <div key={qid} className="sa-qa-question">
                        <div className="sa-qa-title">
                          Q{idx + 1} — {kind === 'multiple_choice' ? 'Multiple Choice' : kind === 'identification' ? 'Identification' : kind === 'true_false' ? 'True/False' : 'Essay'}
                        </div>
                        <div className="sa-qa-prompt">{prompt}</div>

                        {kind === 'multiple_choice' ? (
                          <div className="sa-qa-options">
                            {options.map((opt, oidx) => (
                              <label key={oidx} className="sa-qa-option">
                                <input
                                  type="radio"
                                  name={`q_${qid}`}
                                  checked={Number(value) === oidx}
                                  onChange={() => updateAnswer(qid, oidx)}
                                />
                                <span>{String(opt || '')}</span>
                              </label>
                            ))}
                          </div>
                        ) : kind === 'true_false' ? (
                          <div className="sa-qa-truefalse">
                            <label className="sa-qa-tf-option">
                              <input
                                type="radio"
                                name={`q_${qid}`}
                                checked={value === true}
                                onChange={() => updateAnswer(qid, true)}
                              />
                              True
                            </label>
                            <label className="sa-qa-tf-option">
                              <input
                                type="radio"
                                name={`q_${qid}`}
                                checked={value === false}
                                onChange={() => updateAnswer(qid, false)}
                              />
                              False
                            </label>
                          </div>
                        ) : kind === 'essay' ? (
                          <textarea
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => updateAnswer(qid, e.target.value)}
                            rows={4}
                            placeholder="Type your answer..."
                            className="sa-qa-textarea"
                          />
                        ) : (
                          <input
                            type="text"
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => updateAnswer(qid, e.target.value)}
                            placeholder="Type your answer..."
                            className="sa-qa-input"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
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
                    <div className="sa-upload-extra">
                      <label className="sa-upload-checkbox">
                        <input type="checkbox" checked={useBase64} onChange={e => setUseBase64(e.target.checked)} />
                        Store file as Base64 in database (for small files / testing only)
                      </label>
                      {useBase64 && (
                        <p className="sa-upload-warning">
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
                </>
              )}
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
                disabled={(isQuestionBasedActivity(selectedAssignment) ? false : !submissionFile) || submitting}
              >
                {submitting ? 'Submitting...' : getPrimaryActionLabel(selectedAssignment.type)}
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

              {isQuestionBasedActivity(selectedAssignment) && selectedAssignment.submission && (
                <div className="detail-item">
                  <p className="detail-label">Your Answers</p>
                  <div className="detail-value" style={{ width: '100%' }}>
                    {(() => {
                      const questions = Array.isArray(selectedAssignment.questions) ? selectedAssignment.questions : [];
                      const answersMap = getSubmissionAnswersMap(selectedAssignment.submission);
                      const isGraded = selectedAssignment.status === 'graded' || selectedAssignment.submission?.status === 'graded';

                      if (questions.length === 0) {
                        return <div>No questions found for this activity.</div>;
                      }

                      return (
                        <div className="sa-quiz-form">
                          {!isGraded && (
                            <div style={{ marginBottom: 12 }}>
                              Answers submitted. Correct answers will appear after grading.
                            </div>
                          )}

                          {questions.map((q, idx) => {
                            const qid = getQuestionId(q, idx);
                            const ans = answersMap.get(String(qid));
                            const kind = (q?.kind || '').toString().toLowerCase();
                            const prompt = q?.prompt || '';
                            const correct = isGraded ? isAnswerCorrect(q, ans) : null;
                            const statusLabel = correct === true ? 'Correct' : correct === false ? 'Wrong' : (kind === 'essay' ? 'Manual' : '—');
                            const statusColor = correct === true ? '#2e7d32' : correct === false ? '#c62828' : '#666';

                            return (
                              <div key={qid} className="sa-qa-question">
                                <div className="sa-qa-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                  <span>
                                    Q{idx + 1} — {kind === 'multiple_choice' ? 'Multiple Choice' : kind === 'identification' ? 'Identification' : kind === 'true_false' ? 'True/False' : 'Essay'}
                                  </span>
                                  {isGraded && (
                                    <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                                  )}
                                </div>
                                <div className="sa-qa-prompt">{prompt}</div>
                                <div style={{ marginTop: 8 }}>
                                  <div><strong>Your answer:</strong> {formatStudentAnswer(q, ans)}</div>
                                  {isGraded && kind !== 'essay' && (
                                    <div style={{ marginTop: 6 }}><strong>Correct answer:</strong> {getCorrectAnswerDisplay(q)}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
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
