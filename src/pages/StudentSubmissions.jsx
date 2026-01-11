import React, { useState, useEffect } from 'react'
import './StudentSubmissions.css'
import AppTopbar from '../components/AppTopbar'
import { auth } from '../firebase'
import { getStudentSubmissions, getAssignment, getQuiz, getAllCourses } from '../utils/firestoreHelpers'

export default function StudentSubmissions({ onNavigate, onLogout, userType, currentRoute }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [selectedAssignmentDoc, setSelectedAssignmentDoc] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState(null)

  const looksLikeFirestoreId = (v) => {
    if (typeof v !== 'string') return false
    const s = v.trim()
    return /^[a-zA-Z0-9]{20,}$/.test(s)
  }

  // Load submissions from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        try {
          console.log('🔵 Loading submissions for student:', user.uid)
          const submissionsList = await getStudentSubmissions(user.uid)
          console.log('✓ Loaded submissions:', submissionsList)
          if (submissionsList && submissionsList.length > 0) {
            let courseNameById = new Map()
            try {
              const courses = await getAllCourses()
              courseNameById = new Map(
                (Array.isArray(courses) ? courses : [])
                  .map(c => {
                    const id = c?.id
                    const name = c?.courseName || c?.name || c?.title || c?.courseTitle || c?.subjectName || c?.code || c?.courseCode
                    return id ? [String(id), name ? String(name) : ''] : null
                  })
                  .filter(Boolean)
              )
            } catch (e) {
              console.warn('Could not load courses for submissions course-name mapping:', e)
            }

            // Normalize status: graded if grade exists, else submitted (pending review)
            const normalized = submissionsList.map(s => {
              const derivedStatus = (s.status === 'graded' || s.grade !== null && s.grade !== undefined)
                ? 'graded'
                : 'submitted'

              const rawCourseId = s?.courseId
                || (typeof s?.course === 'string' ? s.course : s?.course?.id)
                || null

              const mappedCourse = rawCourseId ? courseNameById.get(String(rawCourseId)) : null
              let resolvedCourse = mappedCourse
                || s?.courseName
                || s?.courseTitle
                || s?.course
                || 'Unknown Course'

              if (!mappedCourse && looksLikeFirestoreId(resolvedCourse)) {
                resolvedCourse = 'Unknown Course'
              }

              return {
                ...s,
                status: derivedStatus,
                courseId: rawCourseId || s?.courseId || null,
                course: resolvedCourse,
                courseName: resolvedCourse,
              }
            })
            setSubmissions(normalized)
          } else {
            console.log('ℹ️ No submissions found for student')
            setSubmissions([])
          }
        } catch (error) {
          console.error('❌ Error loading submissions:', error)
          setSubmissions([])
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [userType])

  const getStatusColor = (status) => {
    if (status === 'submitted') return '#ff9800'
    if (status === 'graded') return '#4caf50'
    return '#999'
  }

  const getStatusLabel = (status) => {
    if (status === 'submitted') return 'Pending Review'
    if (status === 'graded') return 'Graded'
    return status
  }

  const normalizeText = (v) => {
    if (v == null) return ''
    return String(v).trim().toLowerCase()
  }

  const getQuestionId = (q, idx) => q?.id || q?.questionId || String(idx)

  const getSubmissionAnswersMap = (submission) => {
    const raw = submission?.answers ?? submission?.responses ?? null
    if (!raw) return new Map()
    if (Array.isArray(raw)) {
      return new Map(
        raw
          .map((a, idx) => {
            const qid = a?.questionId || a?.id || String(idx)
            return [String(qid), a?.answer ?? a?.value ?? a?.response ?? null]
          })
          .filter(([qid]) => qid != null)
      )
    }
    if (typeof raw === 'object') {
      return new Map(Object.entries(raw).map(([k, v]) => [String(k), v]))
    }
    return new Map()
  }

  const formatStudentAnswer = (q, ans) => {
    const kind = (q?.kind || '').toString().toLowerCase()
    if (ans == null) return '—'
    if (kind === 'multiple_choice') {
      const options = Array.isArray(q?.options) ? q.options : []
      const idx = typeof ans === 'number' ? ans : Number(ans)
      if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return String(options[idx] ?? '')
      return String(ans)
    }
    if (kind === 'true_false') {
      if (typeof ans === 'boolean') return ans ? 'True' : 'False'
      const t = normalizeText(ans)
      if (t === 'true' || t === 'false') return t === 'true' ? 'True' : 'False'
      return String(ans)
    }
    if (typeof ans === 'string') return ans
    return String(ans)
  }

  const getCorrectAnswerDisplay = (q) => {
    const kind = (q?.kind || '').toString().toLowerCase()
    if (kind === 'multiple_choice') {
      const options = Array.isArray(q?.options) ? q.options : []
      const idx = Number(q?.correctIndex)
      if (Number.isFinite(idx) && idx >= 0 && idx < options.length) return String(options[idx] ?? '')
      return '—'
    }
    if (kind === 'true_false') {
      if (typeof q?.correctAnswer === 'boolean') return q.correctAnswer ? 'True' : 'False'
      const t = normalizeText(q?.correctAnswer)
      if (t === 'true' || t === 'false') return t === 'true' ? 'True' : 'False'
      return '—'
    }
    if (kind === 'identification') {
      const accepted = []
      if (Array.isArray(q?.acceptedAnswers)) accepted.push(...q.acceptedAnswers)
      if (Array.isArray(q?.correctAnswers)) accepted.push(...q.correctAnswers)
      if (typeof q?.correctAnswer === 'string') {
        accepted.push(...q.correctAnswer.split(/\||,/g).map(s => s.trim()).filter(Boolean))
      } else if (q?.correctAnswer != null) {
        accepted.push(q.correctAnswer)
      }
      const unique = Array.from(new Set(accepted.map(v => String(v).trim()).filter(Boolean)))
      if (unique.length === 0) return '—'
      return unique.join(' / ')
    }
    return 'Manual checking'
  }

  const isAnswerCorrect = (q, ans) => {
    const kind = (q?.kind || '').toString().toLowerCase()
    if (kind === 'multiple_choice') {
      const aIdx = typeof ans === 'number' ? ans : Number(ans)
      const cIdx = Number(q?.correctIndex)
      if (!Number.isFinite(aIdx) || !Number.isFinite(cIdx)) return null
      return aIdx === cIdx
    }
    if (kind === 'true_false') {
      const a = (typeof ans === 'boolean') ? ans : (normalizeText(ans) === 'true' ? true : normalizeText(ans) === 'false' ? false : null)
      const c = (typeof q?.correctAnswer === 'boolean') ? q.correctAnswer : (normalizeText(q?.correctAnswer) === 'true' ? true : normalizeText(q?.correctAnswer) === 'false' ? false : null)
      if (a == null || c == null) return null
      return a === c
    }
    if (kind === 'identification') {
      const a = normalizeText(ans)
      if (!a) return null
      const accepted = []
      if (Array.isArray(q?.acceptedAnswers)) accepted.push(...q.acceptedAnswers)
      if (Array.isArray(q?.correctAnswers)) accepted.push(...q.correctAnswers)
      if (typeof q?.correctAnswer === 'string') {
        accepted.push(...q.correctAnswer.split(/\||,/g).map(s => s.trim()).filter(Boolean))
      } else if (q?.correctAnswer != null) {
        accepted.push(q.correctAnswer)
      }
      const normalizedAccepted = accepted.map(normalizeText).filter(Boolean)
      if (normalizedAccepted.length === 0) return null
      return normalizedAccepted.includes(a)
    }
    return null
  }

  const isQuestionBased = (submission, assignmentDoc) => {
    const t = (submission?.activityType || assignmentDoc?.type || '').toString().toLowerCase()
    if (t !== 'quiz' && t !== 'seatwork') return false
    const questions = assignmentDoc?.questions || assignmentDoc?.quizQuestions || assignmentDoc?.items || assignmentDoc?.activityQuestions || []
    return Array.isArray(questions) && questions.length > 0
  }

  const openSubmissionDetails = async (submission) => {
    setSelectedSubmission(submission)
    setSelectedAssignmentDoc(null)
    setDetailsError(null)

    const assignmentId = submission?.assignmentId
    if (!assignmentId) return

    try {
      setLoadingDetails(true)
      // Most seatwork/assignments live in `assignments`, but quizzes may live in `quizzes`.
      let doc = await getAssignment(String(assignmentId))
      if (!doc) {
        try {
          doc = await getQuiz(String(assignmentId))
        } catch (e) {
          // ignore, handled below
        }
      }
      setSelectedAssignmentDoc(doc)
    } catch (e) {
      console.error('Error loading assignment for submission details:', e)
      setDetailsError(e?.message || 'Failed to load activity details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const isLate = (submitted, due) => {
    return new Date(submitted) > new Date(due)
  }

  const filteredSubmissions = submissions.filter(s =>
    filterStatus === 'all' ? true : s.status === filterStatus
  )

  return (
    <div className="student-submissions-root">
      <AppTopbar
        userType={userType}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

        <main className="ssub-main">
          <div className="ssub-container">
            <div className="submissions-header">
            <h1>My Submissions</h1>
            <p className="submissions-subtitle">Track your assignment submissions and grades</p>
          </div>

          <div className="filter-section">
            <button className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
            <button className={`filter-btn ${filterStatus === 'submitted' ? 'active' : ''}`} onClick={() => setFilterStatus('submitted')}>Pending</button>
            <button className={`filter-btn ${filterStatus === 'graded' ? 'active' : ''}`} onClick={() => setFilterStatus('graded')}>Graded</button>
          </div>

          <div className="submissions-list">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p>Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p>📋 No submissions yet. Start submitting your assignments!</p>
              </div>
            ) : (
              filteredSubmissions.map(submission => (
              <div
                key={submission.id}
                className="submission-item"
                role="button"
                tabIndex={0}
                onClick={() => openSubmissionDetails(submission)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openSubmissionDetails(submission)
                  }
                }}
              >
                <div className="submission-left">
                  <div className="submission-info">
                    <h3>{submission.assignment || 'Unknown Assignment'}</h3>
                    <p className="course-name">{submission.course || 'Unknown Course'}</p>
                  </div>
                  <div className="dates">
                    <span className="date-label">Submitted: {submission.submittedDate || 'N/A'}</span>
                    {submission.dueDate && (
                      <>
                        <span className="date-label">Due: {submission.dueDate}</span>
                        {submission.submittedDate && isLate(submission.submittedDate, submission.dueDate) && (
                          <span className="late-badge">⚠️ Late Submission</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="submission-middle">
                  {submission.feedback && (
                    <div className="feedback-section">
                      <p className="feedback-label">Feedback</p>
                      <p className="feedback-text">{submission.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="submission-right">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(submission.status) }}
                  >
                    {getStatusLabel(submission.status)}
                  </span>
                  {submission.grade && (
                    <div className="grade-display">
                      <span className="grade-value">{submission.grade}</span>
                      <span className="grade-label">/100</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="view-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      openSubmissionDetails(submission)
                    }}
                  >
                    👁️ View
                  </button>
                  {submission.fileURL ? (
                    <a
                      className="view-btn download-link"
                      href={submission.fileURL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ⬇️ Download
                    </a>
                  ) : null}
                </div>
              </div>
            ))
            )}
          </div>

          <div className="submissions-summary">
            <h3>Your Summary</h3>
            <div className="summary-grid">
              <div className="summary-stat">
                <span className="stat-icon">📤</span>
                <div className="stat-content">
                  <span className="stat-label">Total Submissions</span>
                  <span className="stat-value">{submissions.length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">⏳</span>
                <div className="stat-content">
                  <span className="stat-label">Pending Review</span>
                  <span className="stat-value">{submissions.filter(s => s.status === 'submitted').length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">✅</span>
                <div className="stat-content">
                  <span className="stat-label">Graded</span>
                  <span className="stat-value">{submissions.filter(s => s.status === 'graded').length}</span>
                </div>
              </div>
              <div className="summary-stat">
                <span className="stat-icon">📊</span>
                <div className="stat-content">
                  <span className="stat-label">Average Grade</span>
                  <span className="stat-value">
                    {submissions.filter(s => s.grade).length > 0
                      ? (submissions.filter(s => s.grade).reduce((a, b) => a + b.grade, 0) / submissions.filter(s => s.grade).length).toFixed(1)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedSubmission && (
        <div className="ssub-modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="ssub-modal" onClick={e => e.stopPropagation()}>
            <div className="ssub-modal-header">
              <h2>{selectedSubmission.assignment || 'Submission Details'}</h2>
              <button className="ssub-modal-close" onClick={() => setSelectedSubmission(null)}>✕</button>
            </div>

            <div className="ssub-modal-body">
              <div className="ssub-detail-item">
                <p className="ssub-detail-label">Course</p>
                <p className="ssub-detail-value">{selectedSubmission.course || 'Unknown Course'}</p>
              </div>
              <div className="ssub-detail-item">
                <p className="ssub-detail-label">Status</p>
                <p className="ssub-detail-value">
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedSubmission.status) }}>
                    {getStatusLabel(selectedSubmission.status)}
                  </span>
                </p>
              </div>

              {typeof selectedSubmission.grade === 'number' && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-label">Grade</p>
                  <p className="ssub-detail-value">{selectedSubmission.grade}%</p>
                </div>
              )}

              {selectedSubmission.feedback && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-label">Feedback</p>
                  <p className="ssub-detail-value">{selectedSubmission.feedback}</p>
                </div>
              )}

              {loadingDetails && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-value">Loading activity details…</p>
                </div>
              )}
              {detailsError && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-value">{detailsError}</p>
                </div>
              )}

              {!loadingDetails && !detailsError && selectedSubmission?.answers && !selectedAssignmentDoc && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-label">Review</p>
                  <p className="ssub-detail-value">Could not load the activity questions for this submission.</p>
                </div>
              )}

              {selectedSubmission.fileURL && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-label">Submitted File</p>
                  <p className="ssub-detail-value">
                    <a href={selectedSubmission.fileURL} target="_blank" rel="noreferrer" className="ssub-link">
                      📎 Download
                    </a>
                  </p>
                </div>
              )}

              {isQuestionBased(selectedSubmission, selectedAssignmentDoc) && (
                <div className="ssub-detail-item">
                  <p className="ssub-detail-label">Your Answers</p>
                  <div className="ssub-detail-value" style={{ width: '100%' }}>
                    {(() => {
                      const questions = Array.isArray(selectedAssignmentDoc?.questions)
                        ? selectedAssignmentDoc.questions
                        : Array.isArray(selectedAssignmentDoc?.quizQuestions)
                          ? selectedAssignmentDoc.quizQuestions
                          : Array.isArray(selectedAssignmentDoc?.items)
                            ? selectedAssignmentDoc.items
                            : Array.isArray(selectedAssignmentDoc?.activityQuestions)
                              ? selectedAssignmentDoc.activityQuestions
                              : []
                      const answersMap = getSubmissionAnswersMap(selectedSubmission)
                      const isGraded = selectedSubmission.status === 'graded' || selectedSubmission.grade != null

                      if (questions.length === 0) return <div>No questions found for this activity.</div>

                      return (
                        <div className="ssub-review">
                          {!isGraded && (
                            <div className="ssub-review-note">
                              Answers submitted. Correct answers will appear after grading.
                            </div>
                          )}
                          {questions.map((q, idx) => {
                            const qid = getQuestionId(q, idx)
                            const ans = answersMap.get(String(qid))
                            const kind = (q?.kind || '').toString().toLowerCase()
                            const prompt = q?.prompt || ''
                            const correct = isGraded ? isAnswerCorrect(q, ans) : null
                            const statusLabel = correct === true ? 'Correct' : correct === false ? 'Wrong' : (kind === 'essay' ? 'Manual' : '—')
                            const statusColor = correct === true ? '#2e7d32' : correct === false ? '#c62828' : '#666'

                            return (
                              <div key={qid} className="ssub-q">
                                <div className="ssub-q-title">
                                  <span>
                                    Q{idx + 1} — {kind === 'multiple_choice' ? 'Multiple Choice' : kind === 'identification' ? 'Identification' : kind === 'true_false' ? 'True/False' : 'Essay'}
                                  </span>
                                  {isGraded && (
                                    <span style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
                                  )}
                                </div>
                                <div className="ssub-q-prompt">{prompt}</div>
                                <div className="ssub-q-answers">
                                  <div><strong>Your answer:</strong> {formatStudentAnswer(q, ans)}</div>
                                  {isGraded && kind !== 'essay' && (
                                    <div><strong>Correct answer:</strong> {getCorrectAnswerDisplay(q)}</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="ssub-modal-actions">
              <button className="ssub-btn" onClick={() => setSelectedSubmission(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
