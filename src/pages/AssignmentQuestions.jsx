import React, { useEffect, useMemo, useState } from 'react';
import './FacultyAssignments.css';
import UserDropdown from '../components/UserDropdown';
import { loadAssignmentDraft, saveAssignmentDraft, setAssignmentDraftResumeFlag } from '../utils/assignmentDraft';

const makeId = () => {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch (e) {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const makeNewQuestion = (kind = 'multiple_choice') => {
  if (kind === 'true_false') {
    return {
      id: makeId(),
      kind,
      prompt: '',
      correctAnswer: true,
      points: 1,
    };
  }
  if (kind === 'identification') {
    return {
      id: makeId(),
      kind,
      prompt: '',
      correctAnswer: '',
      points: 1,
    };
  }
  if (kind === 'essay') {
    return {
      id: makeId(),
      kind,
      prompt: '',
      rubric: '',
      points: 1,
    };
  }
  return {
    id: makeId(),
    kind,
    prompt: '',
    options: [''],
    correctIndex: null,
    points: 1,
  };
};

export default function AssignmentQuestions({ onNavigate, onLogout, userType }) {
  const [draft, setDraft] = useState(null);
  const [questions, setQuestions] = useState([]);

  const getSeq = (q) => {
    const v = q?.seq;
    const n = typeof v === 'number' ? v : parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const normalizeQuestions = (raw) => {
    const usedIds = new Set();
    const usedSeq = new Set();
    let nextSeq = 1;

    const normalized = (raw || []).map((q) => {
      const base = q && typeof q === 'object' ? q : {};

      // Stable unique id
      let id = base.id;
      if (!id || usedIds.has(id)) id = makeId();
      usedIds.add(id);

      // Stable question number (seq)
      let seq = getSeq(base);
      if (seq && usedSeq.has(seq)) seq = null;
      if (seq == null) {
        while (usedSeq.has(nextSeq)) nextSeq += 1;
        seq = nextSeq;
      }
      usedSeq.add(seq);
      nextSeq = Math.max(nextSeq, seq + 1);

      // Keep Firestore schema as-is (options stays string[]), but add stable optionIds
      // for rendering so inserting/removing options doesn't get confused by index keys.
      if (base.kind === 'multiple_choice') {
        const options = Array.isArray(base.options) ? base.options : [''];
        const existingOptionIds = Array.isArray(base.optionIds) ? base.optionIds : [];
        const optionIds = options.map((_, i) => existingOptionIds[i] || makeId());
        return { ...base, id, seq, options, optionIds };
      }

      return { ...base, id, seq };
    });

    return normalized;
  };

  useEffect(() => {
    const d = loadAssignmentDraft();
    setDraft(d);
    const raw = Array.isArray(d?.questions) ? d.questions : [];

    // Normalize ids + stable question numbering.
    setQuestions(normalizeQuestions(raw));
  }, []);

  const headerTitle = useMemo(() => {
    const title = String(draft?.form?.title || '').trim();
    return title ? `Questions — ${title}` : 'Questions';
  }, [draft]);

  const updateQuestion = (questionId, patch) => {
    setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...patch } : q)));
  };

  const ensureMcqOptionIds = (q) => {
    if (!q || q.kind !== 'multiple_choice') return q;
    const options = Array.isArray(q.options) ? q.options : [''];
    const optionIdsRaw = Array.isArray(q.optionIds) ? q.optionIds : [];
    if (optionIdsRaw.length === options.length && optionIdsRaw.every(Boolean)) return q;
    const optionIds = options.map((_, i) => optionIdsRaw[i] || makeId());
    return { ...q, options, optionIds };
  };

  const removeQuestion = (questionId) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const addQuestion = (kind) => {
    // New question should be the latest number, without renumbering existing questions.
    setQuestions(prev => {
      const maxSeq = prev.reduce((m, q) => {
        const s = getSeq(q);
        return s && s > m ? s : m;
      }, 0);

      const next = makeNewQuestion(kind);
      next.seq = maxSeq + 1;
      return [...prev, next];
    });
  };

  const handleBack = () => {
    setAssignmentDraftResumeFlag();
    onNavigate && onNavigate('assignments');
  };

  const handleSaveAndReturn = () => {
    // Save in display order (newest first) so it stays consistent when you come back.
    const sorted = [...questions].sort((a, b) => (getSeq(b) || 0) - (getSeq(a) || 0));
    const next = {
      ...(draft || {}),
      questions: sorted,
      updatedAt: Date.now(),
    };
    saveAssignmentDraft(next);
    setAssignmentDraftResumeFlag();
    onNavigate && onNavigate('assignments');
  };

  if (userType !== 'faculty') {
    return (
      <div className="faculty-assignments-root">
        <header className="topbar fa-topbar">
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
        <div className="assignments-page-layout">
          <div className="assignment-content-wrapper">
            <section className="assignment-main-content">
              <div className="content-header">
                <h2>Questions</h2>
              </div>
              <div className="qb-empty">This page is available for faculty only.</div>
              <div style={{ marginTop: 12 }}>
                <button className="qb-btn" type="button" onClick={() => onNavigate && onNavigate('dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="faculty-assignments-root">
        <header className="topbar fa-topbar">
          <div className="topbar-left">
            <div className="unilearn-title">
              <span className="unilearn-bold">UniLearn Nexus</span>
              <span className="unilearn-sub">Learning Management Systems</span>
            </div>
            <nav className="nav-links">
              <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}>Dashboard</a>
              <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('courses'); }}>Courses</a>
              <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('schedule'); }}>Schedule</a>
              <a href="#" className="nav-link active" onClick={e => { e.preventDefault(); onNavigate && onNavigate('assignments'); }}>Activities</a>
            </nav>
          </div>
          <div className="topbar-right">
            <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
          </div>
        </header>

        <div className="assignments-page-layout">
          <div className="assignment-content-wrapper">
            <section className="assignment-main-content">
              <div className="content-header">
                <h2>Questions</h2>
              </div>
              <div className="qb-empty">
                No draft found. Start from “Create Activity” then open Questions.
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="qb-btn" type="button" onClick={() => onNavigate && onNavigate('assignments')}>Back to Activities</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-assignments-root">
      <header className="topbar fa-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('courses'); }}>Courses</a>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('schedule'); }}>Schedule</a>
            <a href="#" className="nav-link active" onClick={e => { e.preventDefault(); onNavigate && onNavigate('assignments'); }}>Activities</a>
          </nav>
        </div>
        <div className="topbar-right">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <div className="assignments-page-layout">
        <div className="assignment-content-wrapper">
          <section className="assignment-main-content">
            <div className="content-header">
              <h2>{headerTitle}</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="qb-btn" type="button" onClick={handleBack}>Back</button>
                <button className="qb-btn" type="button" onClick={handleSaveAndReturn}>Save Questions</button>
              </div>
            </div>

            <div>
              <div className="qb-toolbar">
                <strong className="qb-title">Questions (Optional)</strong>
                <div className="qb-actions">
                  <button className="qb-btn" type="button" onClick={() => addQuestion('multiple_choice')}>+ Multiple Choice</button>
                  <button className="qb-btn" type="button" onClick={() => addQuestion('identification')}>+ Identification</button>
                  <button className="qb-btn" type="button" onClick={() => addQuestion('true_false')}>+ True/False</button>
                  <button className="qb-btn" type="button" onClick={() => addQuestion('essay')}>+ Essay</button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="qb-empty">
                  Add questions if you want this to be an in-app quiz/assessment.
                </div>
              ) : null}

              {[...questions].sort((a, b) => (getSeq(b) || 0) - (getSeq(a) || 0)).map((q) => (
                <div key={q.id || idx} className="qb-question">
                  <div className="qb-question-header">
                    <strong>
                      Q{getSeq(q) || 1} — {q.kind === 'multiple_choice' ? 'Multiple Choice' : q.kind === 'identification' ? 'Identification' : q.kind === 'true_false' ? 'True/False' : 'Essay'}
                    </strong>
                    <button className="qb-btn qb-btn-danger" type="button" onClick={() => removeQuestion(q.id)}>Remove</button>
                  </div>

                  <label className="qb-label">
                    Prompt
                    <textarea
                      value={q.prompt || ''}
                      onChange={e => updateQuestion(q.id, { prompt: e.target.value })}
                      rows="3"
                      placeholder="Enter the question prompt..."
                    />
                  </label>

                  <label className="qb-label">
                    Points
                    <input
                      type="number"
                      min="0"
                      value={q.points ?? 1}
                      onChange={e => updateQuestion(q.id, { points: e.target.value })}
                    />
                  </label>

                  {q.kind === 'multiple_choice' ? (
                    <div className="qb-mcq">
                      <div className="qb-mcq-header">
                        <strong>Options</strong>
                        <button
                          className="qb-btn"
                          type="button"
                          onClick={() => {
                            const safe = ensureMcqOptionIds(q);
                            const current = Array.isArray(safe.options) ? safe.options : [];
                            const currentIds = Array.isArray(safe.optionIds) ? safe.optionIds : [];

                            const next = ['', ...current];
                            const nextIds = [makeId(), ...currentIds];

                            const prevIdx = Number.isFinite(safe.correctIndex) ? safe.correctIndex : parseInt(safe.correctIndex, 10);
                            // Keep "Correct option" unselected until the user chooses.
                            const nextCorrectIndex = Number.isFinite(prevIdx) ? prevIdx + 1 : null;
                            updateQuestion(q.id, { options: next, optionIds: nextIds, correctIndex: nextCorrectIndex });
                          }}
                        >
                          + Add option
                        </button>
                      </div>

                      {(Array.isArray(q.options) ? q.options : []).map((opt, optIdx) => (
                        <div key={(Array.isArray(q.optionIds) ? q.optionIds[optIdx] : null) || `${q.id}-opt-${optIdx}`} className="qb-mcq-row">
                          <input
                            value={opt}
                            onChange={e => {
                              const next = [...(Array.isArray(q.options) ? q.options : [])];
                              next[optIdx] = e.target.value;
                              updateQuestion(q.id, { options: next });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                          />
                          <button
                            className="qb-btn qb-btn-danger"
                            type="button"
                            onClick={() => {
                              const safe = ensureMcqOptionIds(q);
                              const prevOptions = [...(Array.isArray(safe.options) ? safe.options : [])];
                              const prevIds = [...(Array.isArray(safe.optionIds) ? safe.optionIds : [])];

                              const next = prevOptions.filter((_, i) => i !== optIdx);
                              const nextIds = prevIds.filter((_, i) => i !== optIdx);

                              const parsedPrevCorrect = Number.isFinite(safe.correctIndex) ? safe.correctIndex : parseInt(safe.correctIndex, 10);
                              const prevCorrect = Number.isFinite(parsedPrevCorrect) ? parsedPrevCorrect : null;
                              let nextCorrect = prevCorrect;
                              if (prevCorrect != null) {
                                if (optIdx < prevCorrect) nextCorrect = Math.max(0, prevCorrect - 1);
                                if (optIdx === prevCorrect) nextCorrect = null;
                                if (nextCorrect != null && nextCorrect > next.length - 1) nextCorrect = null;
                              }
                              if (next.length === 0) {
                                // Keep at least one option
                                next.push('');
                                nextIds.push(makeId());
                                nextCorrect = null;
                              }

                              updateQuestion(q.id, { options: next, optionIds: nextIds, correctIndex: nextCorrect });
                            }}
                            disabled={(Array.isArray(q.options) ? q.options.length : 0) <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <label className="qb-label">
                        Correct option
                        <select
                          value={q.correctIndex ?? ''}
                          onChange={e => updateQuestion(q.id, { correctIndex: parseInt(e.target.value, 10) })}
                        >
                          <option value="" disabled>Select correct option...</option>
                          {(Array.isArray(q.options) ? q.options : []).map((_, optIdx) => (
                            <option key={optIdx} value={optIdx}>Option {optIdx + 1}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {q.kind === 'identification' ? (
                    <label className="qb-label">
                      Correct Answer
                      <input
                        value={q.correctAnswer || ''}
                        onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value })}
                        placeholder="Enter the correct answer"
                      />
                    </label>
                  ) : null}

                  {q.kind === 'true_false' ? (
                    <label className="qb-label">
                      Correct Answer
                      <select
                        value={q.correctAnswer === false ? 'false' : 'true'}
                        onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value === 'true' })}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </label>
                  ) : null}

                  {q.kind === 'essay' ? (
                    <label className="qb-label">
                      Rubric / Notes (Optional)
                      <textarea
                        value={q.rubric || ''}
                        onChange={e => updateQuestion(q.id, { rubric: e.target.value })}
                        rows="2"
                        placeholder="Optional grading notes/rubric..."
                      />
                    </label>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
