import React, { useEffect, useMemo, useState } from 'react'
import './StudentAssignments.css'
import './StudentActivity.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getAssignment, getStudentSubmissions } from '../utils/firestoreHelpers'

const normalizeText = (v) => {
  if (v == null) return ''
  return String(v).trim().toLowerCase()
}

const getTypeIcon = (type) => {
  const icons = {
    assignment: '📋',
    quiz: '❓',
    seatwork: '💼',
    project: '🎯',
  }
  return icons[(type || 'assignment').toString().toLowerCase()] || '📋'
}

const getTypeLabel = (type) => {
  const labels = {
    assignment: 'Assignment',
    quiz: 'Quiz',
    seatwork: 'Seatwork',
    project: 'Project',
  }
  return labels[(type || 'assignment').toString().toLowerCase()] || 'Assignment'
}

const getPrimaryActionLabel = (type) => {
  const t = (type || 'assignment').toString().toLowerCase()
  if (t === 'quiz') return 'Take Quiz'
  if (t === 'seatwork') return 'Take Seatwork'
  if (t === 'project') return 'Submit Project'
  return 'Submit Assignment'
}

const isQuestionBasedActivity = (a) => {
  if (!a) return false
  const t = (a.type || '').toString().toLowerCase()
  if (t !== 'quiz' && t !== 'seatwork') return false
  return Array.isArray(a.questions) && a.questions.length > 0
}

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
    if (typeof q?.correctAnswer === 'string') {
      const t = normalizeText(q.correctAnswer)
      if (t === 'true' || t === 'false') return t === 'true' ? 'True' : 'False'
    }
    return '—'
  }
  if (kind === 'identification') {
    const accepted = []
    if (Array.isArray(q?.acceptedAnswers)) accepted.push(...q.acceptedAnswers)
    if (Array.isArray(q?.correctAnswers)) accepted.push(...q.correctAnswers)
    if (typeof q?.correctAnswer === 'string') {
      const parts = q.correctAnswer.split(/\||,/g).map((s) => s.trim()).filter(Boolean)
      accepted.push(...parts)
    } else if (q?.correctAnswer != null) {
      accepted.push(q.correctAnswer)
    }
    const unique = Array.from(new Set(accepted.map((v) => String(v).trim()).filter(Boolean)))
    if (unique.length === 0) return '—'
    return unique.join(' / ')
  }
  return 'Manual checking'
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

const isAnswerCorrect = (q, ans) => {
  const kind = (q?.kind || '').toString().toLowerCase()
  if (kind === 'multiple_choice') {
    const aIdx = typeof ans === 'number' ? ans : Number(ans)
    const cIdx = Number(q?.correctIndex)
    if (!Number.isFinite(aIdx) || !Number.isFinite(cIdx)) return null
    return aIdx === cIdx
  }
  if (kind === 'true_false') {
    const a = typeof ans === 'boolean' ? ans : normalizeText(ans) === 'true' ? true : normalizeText(ans) === 'false' ? false : null
    const c = typeof q?.correctAnswer === 'boolean' ? q.correctAnswer : normalizeText(q?.correctAnswer) === 'true' ? true : normalizeText(q?.correctAnswer) === 'false' ? false : null
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
      accepted.push(...q.correctAnswer.split(/\||,/g).map((s) => s.trim()).filter(Boolean))
    } else if (q?.correctAnswer !=null) {
      accepted.push(q.correctAnswer)
    }
    const set = new Set(accepted.map((v) => normalizeText(v)).filter(Boolean))
    if (set.size === 0) return null
    return set.has(a)
  }
  return null
}

export default function StudentActivityDetails({ onNavigate, onLogout, userType, activityId }) {
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null))
    return () => unsub()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!activityId) {
        setActivity(null)
        setSubmission(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const a = await getAssignment(activityId)
        setActivity(a || null)
      } catch (e) {
        console.error('Failed to load activity:', e)
        setActivity(null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [activityId])

  useEffect(() => {
    const run = async () => {
      if (!currentUser?.uid || !activityId) return
      try {
        const subs = await getStudentSubmissions(currentUser.uid)
        const match = (Array.isArray(subs) ? subs : []).find((s) => String(s?.assignmentId || '') === String(activityId))
        setSubmission(match || null)
      } catch (e) {
        console.warn('Failed to load submission:', e)
        setSubmission(null)
      }
    }

    run()
  }, [currentUser?.uid, activityId])

  const statusLabel = useMemo(() => {
    if (!activity) return ''
    if (!submission) return 'Not submitted'
    const st = (submission?.status || '').toString().toLowerCase()
    if (st === 'graded') return 'Graded'
    return 'Submitted'
  }, [activity, submission])

  const handleBack = () => {
    onNavigate && onNavigate('assignments')
  }

  const handlePrimary = () => {
    if (!activityId) return
    onNavigate && onNavigate(`activitySubmit:${activityId}`)
  }

  if (userType !== 'student') {
    return (
      <div className="student-assignments-root">
        <header className="topbar sa-topbar">
          <div className="topbar-left">
            <div className="unilearn-title">
              <span className="unilearn-bold">UniLearn Nexus</span>
              <span className="unilearn-sub">Learning Management Systems</span>
            </div>
          </div>
          <div className="topbar-right">
            <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
          </div>
        </header>
        <main className="sa-main">
          <div className="sa-container">
            <div className="sa-empty-card">
              <div className="sa-empty-icon">🚫</div>
              <h2>Student only</h2>
              <p className="sa-empty-text">This page is available for students only.</p>
              <button className="sa-go-dashboard" onClick={() => onNavigate && onNavigate('dashboard')}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="student-assignments-root">
      <header className="topbar sa-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('home') }}>Home</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard') }}>Dashboard</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('courses') }}>Courses</a>
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('schedule') }}>Schedule</a>
            <a href="#" className="nav-link active" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('assignments') }}>Assignments</a>
          </nav>
        </div>
        <div className="topbar-right">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sa-main">
        <div className="sa-container">
          {loading ? (
            <div className="sa-loading">Loading...</div>
          ) : !activity ? (
            <div className="sa-empty-card">
              <div className="sa-empty-icon">❓</div>
              <h2>Activity not found</h2>
              <p className="sa-empty-text">This activity may have been deleted.</p>
              <button className="sa-go-dashboard" onClick={handleBack}>Back to Assignments</button>
            </div>
          ) : (
            <>
              <div className="sa-header-row">
                <div>
                  <p className="sa-breadcrumb">Assignments / {getTypeLabel(activity.type)}</p>
                  <h1 className="sa-activity-title">
                    <span className="sa-activity-type-icon">{getTypeIcon(activity.type)}</span>
                    {activity.title}
                  </h1>
                  <p className="sa-subtitle">Course: {activity.courseName || activity.course || 'Unknown Course'}</p>
                </div>
              </div>

              <div className="sa-activity-card">
                <div className="sa-activity-meta">
                  <div className="sa-activity-meta-item">
                    <div className="sa-activity-meta-label">Due Date</div>
                    <div className="sa-activity-meta-value">{activity.dueDate || 'No due date'}</div>
                  </div>
                  <div className="sa-activity-meta-item">
                    <div className="sa-activity-meta-label">Status</div>
                    <div className="sa-activity-meta-value">{statusLabel}</div>
                  </div>
                </div>

                {activity.description && (
                  <div className="detail-item" style={{ marginTop: 10 }}>
                    <p className="detail-label">Description</p>
                    <p className="detail-value">{activity.description}</p>
                  </div>
                )}

                {activity.externalLink && (
                  <div className="detail-item">
                    <p className="detail-label">External Link</p>
                    <p className="detail-value">
                      <a className="item-link" href={activity.externalLink} target="_blank" rel="noopener noreferrer">
                        🔗 Open Link
                      </a>
                    </p>
                  </div>
                )}

                {activity.attachment?.downloadURL && (
                  <div className="detail-item">
                    <p className="detail-label">Attached File</p>
                    <p className="detail-value">
                      <a href={activity.attachment.downloadURL} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                        📎 {activity.attachment.fileName || 'Download'}
                      </a>
                    </p>
                  </div>
                )}

                {isQuestionBasedActivity(activity) && submission && (
                  <div className="detail-item" style={{ marginTop: 12 }}>
                    <p className="detail-label">Your Answers</p>
                    <div className="detail-value" style={{ width: '100%' }}>
                      {(() => {
                        const questions = Array.isArray(activity.questions) ? activity.questions : []
                        const answersMap = getSubmissionAnswersMap(submission)
                        const isGraded = (submission?.status || '').toString().toLowerCase() === 'graded'

                        if (questions.length === 0) return <div>No questions found for this activity.</div>

                        return (
                          <div className="sa-quiz-form">
                            {!isGraded && (
                              <div style={{ marginBottom: 12 }}>
                                Answers submitted. Correct answers will appear after grading.
                              </div>
                            )}

                            {questions.map((q, idx) => {
                              const qid = q?.id || q?.questionId || String(idx)
                              const ans = answersMap.get(String(qid))
                              const kind = (q?.kind || '').toString().toLowerCase()
                              const prompt = q?.prompt || ''
                              const correct = isGraded ? isAnswerCorrect(q, ans) : null
                              const status = correct === true ? 'Correct' : correct === false ? 'Wrong' : kind === 'essay' ? 'Manual' : '—'
                              const statusColor = correct === true ? '#2e7d32' : correct === false ? '#c62828' : '#666'

                              return (
                                <div key={qid} className="sa-qa-question">
                                  <div className="sa-qa-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                    <span>
                                      Q{idx + 1} — {kind === 'multiple_choice' ? 'Multiple Choice' : kind === 'identification' ? 'Identification' : kind === 'true_false' ? 'True/False' : 'Essay'}
                                    </span>
                                    {isGraded && <span style={{ color: statusColor, fontWeight: 700 }}>{status}</span>}
                                  </div>
                                  <div className="sa-qa-prompt">{prompt}</div>
                                  <div style={{ marginTop: 8 }}>
                                    <div>
                                      <strong>Your answer:</strong> {formatStudentAnswer(q, ans)}
                                    </div>
                                    {isGraded && kind !== 'essay' && (
                                      <div style={{ marginTop: 6 }}>
                                        <strong>Correct answer:</strong> {getCorrectAnswerDisplay(q)}
                                      </div>
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

                {submission && !isQuestionBasedActivity(activity) && (
                  <div className="detail-item" style={{ marginTop: 12 }}>
                    <p className="detail-label">Your Submission</p>
                    <p className="detail-value">
                      {submission.fileUrl ? (
                        <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>
                          📄 {submission.fileName || 'Download submission'}
                        </a>
                      ) : submission.base64DataUrl ? (
                        <span>Stored as Base64: {submission.fileName || 'submission'}</span>
                      ) : (
                        <span>Submission recorded</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="sa-activity-actions">
                  <button className="btn-cancel-modal" onClick={handleBack}>Back</button>
                  <button className="btn-submit-modal" onClick={handlePrimary}>
                    {getPrimaryActionLabel(activity.type)}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
