import React, { useEffect, useMemo, useState } from 'react'
import './StudentAssignments.css'
import './StudentActivity.css'
import AppTopbar from '../components/AppTopbar'
import { auth } from '../firebase'
import {
  getAssignment,
  getStudentProfile,
  submitAssignment,
  uploadSubmissionFile,
} from '../utils/firestoreHelpers'

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

const getSubmitActionLabel = (type) => {
  const t = (type || 'assignment').toString().toLowerCase()
  if (t === 'quiz' || t === 'seatwork') return 'Submit'
  if (t === 'project') return 'Submit Project'
  return 'Submit Assignment'
}

const isQuestionBasedActivity = (a) => {
  if (!a) return false
  const t = (a.type || '').toString().toLowerCase()
  if (t !== 'quiz' && t !== 'seatwork') return false
  return Array.isArray(a.questions) && a.questions.length > 0
}

export default function StudentActivitySubmit({ onNavigate, onLogout, userType, activityId, currentRoute }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [studentProfile, setStudentProfile] = useState(null)

  const [activity, setActivity] = useState(null)
  const [submissionFile, setSubmissionFile] = useState(null)
  const [useBase64, setUseBase64] = useState(false)
  const [questionAnswers, setQuestionAnswers] = useState({})

  const title = useMemo(() => {
    return `${getTypeLabel(activity?.type)} — ${activity?.title || ''}`.trim()
  }, [activity])

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u || null)
      if (!u) {
        setLoading(false)
        return
      }
      try {
        const prof = await getStudentProfile(u.uid)
        setStudentProfile(prof || null)
      } catch (e) {
        console.warn('Failed to load student profile:', e)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!activityId) {
        setActivity(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const a = await getAssignment(activityId)
        setActivity(a || null)
        if (a && isQuestionBasedActivity(a)) {
          const init = {}
          ;(a.questions || []).forEach((q, idx) => {
            const qid = q?.id || q?.questionId || String(idx)
            const kind = (q?.kind || '').toString().toLowerCase()
            if (kind === 'true_false') init[qid] = null
            else if (kind === 'multiple_choice') init[qid] = null
            else init[qid] = ''
          })
          setQuestionAnswers(init)
        } else {
          setQuestionAnswers({})
        }
      } catch (e) {
        console.error('Failed to load activity:', e)
        setActivity(null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [activityId])

  const updateAnswer = (questionId, value) => {
    setQuestionAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleBack = () => {
    onNavigate && onNavigate('assignments')
  }

  const requireAnswer = (q, idx) => {
    const qid = q?.id || q?.questionId || String(idx)
    const v = questionAnswers[qid]
    const kind = (q?.kind || '').toString().toLowerCase()

    if (kind === 'multiple_choice') {
      return Number.isFinite(v) || (typeof v === 'string' && v !== '')
    }
    if (kind === 'true_false') {
      return typeof v === 'boolean'
    }
    if (typeof v === 'string') {
      return v.trim() !== ''
    }
    return v != null
  }

  const handleSubmit = async () => {
    if (!currentUser || !activity) return

    const isQuizLike = isQuestionBasedActivity(activity)
    if (!isQuizLike && !submissionFile) {
      alert('Please select a file to submit')
      return
    }

    try {
      setSubmitting(true)

      if (isQuizLike) {
        const questions = Array.isArray(activity.questions) ? activity.questions : []
        for (let i = 0; i < questions.length; i++) {
          if (!requireAnswer(questions[i], i)) {
            alert('Please answer all questions before submitting.')
            setSubmitting(false)
            return
          }
        }

        const answers = questions.map((q, i) => {
          const qid = q?.id || q?.questionId || String(i)
          return {
            questionId: qid,
            kind: q?.kind || null,
            answer: qid ? (questionAnswers[qid] ?? null) : null,
          }
        })

        await submitAssignment(currentUser.uid, activity.id, {
          activityType: (activity.type || 'quiz').toString().toLowerCase(),
          answers,
          submittedAt: new Date(),
          courseId: activity.courseId || null,
          studentName: studentProfile?.firstName
            ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim()
            : studentProfile?.name || currentUser.displayName || '',
          studentEmail: currentUser.email || studentProfile?.email || '',
        })
      } else if (useBase64) {
        const fileToBase64 = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = (err) => reject(err)
            reader.readAsDataURL(file)
          })

        const base64DataUrl = await fileToBase64(submissionFile)
        const approximateBase64Size = base64DataUrl.length
        const sizeLimit = 600000
        if (approximateBase64Size > sizeLimit) {
          alert('File is too large to store as Base64 in Firestore. Please use normal file upload instead.')
          setSubmitting(false)
          return
        }

        await submitAssignment(currentUser.uid, activity.id, {
          base64DataUrl,
          fileName: submissionFile.name,
          fileSize: submissionFile.size,
          fileType: submissionFile.type,
          submittedAt: new Date(),
          courseId: activity.courseId || null,
          studentName: studentProfile?.firstName
            ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim()
            : studentProfile?.name || currentUser.displayName || '',
          studentEmail: currentUser.email || studentProfile?.email || '',
        })
      } else {
        const uploadedFile = await uploadSubmissionFile(currentUser.uid, activity.id, submissionFile)

        await submitAssignment(currentUser.uid, activity.id, {
          fileUrl: uploadedFile.downloadURL,
          storagePath: uploadedFile.storagePath,
          fileName: submissionFile.name,
          fileSize: submissionFile.size,
          submittedAt: new Date(),
          courseId: activity.courseId || null,
          studentName: studentProfile?.firstName
            ? `${studentProfile.firstName} ${studentProfile.lastName || ''}`.trim()
            : studentProfile?.name || currentUser.displayName || '',
          studentEmail: currentUser.email || studentProfile?.email || '',
        })
      }

      alert('✓ Submitted successfully!')
      onNavigate && onNavigate('assignments')
    } catch (e) {
      console.error('Error submitting activity:', e)
      alert('❌ Error: ' + (e?.message || 'Failed to submit'))
    } finally {
      setSubmitting(false)
    }
  }

  if (userType !== 'student') {
    return (
      <div className="student-assignments-root">
        <AppTopbar
          userType={userType}
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
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
    <div className="student-assignments-root sa-activity-page">
      <AppTopbar
        userType={userType}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="sa-main">
        <div className="sa-container">
          {loading ? (
            <div className="sa-loading">Loading...</div>
          ) : !currentUser ? (
            <div className="sa-empty-card">
              <div className="sa-empty-icon">🔒</div>
              <h2>Please sign in</h2>
              <p className="sa-empty-text">You need to sign in to submit activities.</p>
              <button className="sa-go-dashboard" onClick={() => onNavigate && onNavigate('login')}>Go to Login</button>
            </div>
          ) : !activity ? (
            <div className="sa-empty-card">
              <div className="sa-empty-icon">❓</div>
              <h2>Activity not found</h2>
              <p className="sa-empty-text">This activity may have been deleted.</p>
              <button className="sa-go-dashboard" onClick={() => onNavigate && onNavigate('assignments')}>Back to Assignments</button>
            </div>
          ) : (
            <>
              <div className="sa-header-row">
                <div>
                  <p className="sa-breadcrumb">Assignments / {getTypeLabel(activity.type)}</p>
                  <h1 className="sa-activity-title">
                    <span className="sa-activity-type-icon">{getTypeIcon(activity.type)}</span>
                    {title}
                  </h1>
                  <p className="sa-subtitle">Course: {activity.courseName || activity.course || 'Unknown Course'}</p>
                </div>
              </div>

              <div className="sa-activity-card">
                {isQuestionBasedActivity(activity) ? (
                  <div className="sa-quiz-form">
                    {(activity.questions || []).map((q, idx) => {
                      const qid = q?.id || q?.questionId || String(idx)
                      const kind = (q?.kind || '').toString().toLowerCase()
                      const prompt = q?.prompt || ''
                      const options = Array.isArray(q?.options) ? q.options : []
                      const value = questionAnswers[qid]

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
                                    checked={(value === null || value === undefined || value === '') ? false : Number(value) === oidx}
                                    onChange={() => updateAnswer(qid, oidx)}
                                  />
                                  <span>{String(opt || '')}</span>
                                </label>
                              ))}
                            </div>
                          ) : kind === 'true_false' ? (
                            <div className="sa-qa-truefalse">
                              <label className="sa-qa-tf-option">
                                <input type="radio" name={`q_${qid}`} checked={value === true} onChange={() => updateAnswer(qid, true)} />
                                True
                              </label>
                              <label className="sa-qa-tf-option">
                                <input type="radio" name={`q_${qid}`} checked={value === false} onChange={() => updateAnswer(qid, false)} />
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
                      )
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
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
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
                          <input type="checkbox" checked={useBase64} onChange={(e) => setUseBase64(e.target.checked)} />
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

                <div className="sa-activity-actions">
                  <button className="btn-cancel-modal" onClick={handleBack} disabled={submitting}>
                    Back
                  </button>
                  <button
                    className="btn-submit-modal"
                    onClick={handleSubmit}
                    disabled={(isQuestionBasedActivity(activity) ? false : !submissionFile) || submitting}
                  >
                    {submitting ? 'Submitting...' : getSubmitActionLabel(activity.type)}
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
