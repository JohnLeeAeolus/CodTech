const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

function normalizeString(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeAnswers(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([questionId, answer]) => ({
      questionId,
      kind: null,
      answer
    }));
  }
  return [];
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  const s = normalizeString(value);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return null;
}

function coerceNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function splitAcceptedAnswers(correctAnswer) {
  const raw = String(correctAnswer ?? '').trim();
  if (!raw) return [];
  // allow multiple accepted answers separated by | or ,
  const parts = raw.split(/\||,/g).map(s => normalizeString(s)).filter(Boolean);
  return parts.length > 0 ? parts : [normalizeString(raw)];
}

function buildAutoFeedback(percent) {
  const p = typeof percent === 'number' && Number.isFinite(percent) ? Math.round(percent) : null;
  if (p == null) return 'Auto-graded';

  // Requested behavior: 50+ = nice achievement; below 50 = motivation.
  if (p >= 90) return `Excellent work — outstanding achievement! (${p}%)`;
  if (p >= 75) return `Nice achievement — keep it up! (${p}%)`;
  if (p >= 50) return `Good effort — nice achievement. Keep practicing to improve even more! (${p}%)`;
  return `Keep pushing — you’re getting there. Review the lesson and try again to raise your score. (${p}%)`;
}

function autoGradeQuestions(questions, submissionAnswers) {
  const qs = Array.isArray(questions) ? questions : [];
  const answers = normalizeAnswers(submissionAnswers);
  const answerByQid = new Map(answers.map(a => [String(a?.questionId ?? ''), a?.answer]));

  let hasManual = false;
  let totalPossible = 0;
  let pointsEarned = 0;
  let autoGradableCount = 0;

  for (const q of qs) {
    const kind = normalizeString(q?.kind || q?.type || '');
    const qid = String(q?.id ?? q?.questionId ?? '');
    const pts = coerceNumber(q?.points);
    const points = pts != null && pts > 0 ? pts : 1;

    const given = answerByQid.get(qid);

    if (kind === 'essay') {
      hasManual = true;
      continue;
    }

    if (kind === 'multiple_choice') {
      const correctIndex = coerceNumber(q?.correctIndex);
      const givenIndex = coerceNumber(given);
      if (correctIndex == null || givenIndex == null) {
        autoGradableCount++;
        totalPossible += points;
        continue;
      }
      autoGradableCount++;
      totalPossible += points;
      if (Number(givenIndex) === Number(correctIndex)) pointsEarned += points;
      continue;
    }

    if (kind === 'true_false') {
      const correct = typeof q?.correctAnswer === 'boolean' ? q.correctAnswer : coerceBoolean(q?.correctAnswer);
      const givenBool = coerceBoolean(given);
      if (correct == null || givenBool == null) {
        autoGradableCount++;
        totalPossible += points;
        continue;
      }
      autoGradableCount++;
      totalPossible += points;
      if (givenBool === correct) pointsEarned += points;
      continue;
    }

    if (kind === 'identification') {
      const accepted = splitAcceptedAnswers(q?.correctAnswer);
      const givenText = normalizeString(given);
      autoGradableCount++;
      totalPossible += points;
      if (accepted.length > 0 && accepted.includes(givenText)) pointsEarned += points;
      continue;
    }

    // Unknown kind: treat as manual review.
    hasManual = true;
  }

  const percent = totalPossible > 0 ? Math.round((pointsEarned / totalPossible) * 100) : null;
  const fullyAuto = !hasManual && autoGradableCount > 0 && autoGradableCount === qs.filter(Boolean).length;

  return {
    pointsEarned,
    pointsPossible: totalPossible,
    percent,
    hasManual,
    fullyAuto
  };
}

exports.onEnrollmentCreate = functions.firestore
  .document('enrollments/{enrollmentId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data();
    const courseRef = db.collection('courses').doc(data.courseId);
    await db.runTransaction(async t => {
      const doc = await t.get(courseRef);
      if (!doc.exists) return;
      const prev = doc.data();
      const newCount = (prev.students || 0) + 1;
      t.update(courseRef, {
        students: newCount,
        enrolledStudents: admin.firestore.FieldValue.arrayUnion(data.studentId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  });

exports.onEnrollmentDelete = functions.firestore
  .document('enrollments/{enrollmentId}')
  .onDelete(async (snap, ctx) => {
    const data = snap.data();
    const courseRef = db.collection('courses').doc(data.courseId);
    await db.runTransaction(async t => {
      const doc = await t.get(courseRef);
      if (!doc.exists) return;
      const prev = doc.data();
      const newCount = Math.max(0, (prev.students || 0) - 1);
      t.update(courseRef, {
        students: newCount,
        enrolledStudents: admin.firestore.FieldValue.arrayRemove(data.studentId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  });

// Auto-grade quiz/seatwork submissions saved in `submissions` (assignments collection stores questions).
exports.onSubmissionCreate = functions.firestore
  .document('submissions/{submissionId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data() || {};
    const submissionId = ctx.params.submissionId;

    // Don't overwrite manually graded submissions.
    if (data.status === 'graded' || data.grade != null) return;

    const assignmentId = data.assignmentId || null;
    const rawAnswers = data.answers || data.responses || data.submittedAnswers || data.quizAnswers || null;
    if (!assignmentId || !rawAnswers) return;

    const assignmentRef = db.collection('assignments').doc(String(assignmentId));
    const assignmentSnap = await assignmentRef.get();
    if (!assignmentSnap.exists) return;

    const assignment = assignmentSnap.data() || {};
    const questions = assignment.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) return;

    const gradeResult = autoGradeQuestions(questions, rawAnswers);
    if (gradeResult.percent == null) return;

    const patch = {
      autoPointsEarned: gradeResult.pointsEarned,
      autoPointsPossible: gradeResult.pointsPossible,
      autoPercent: gradeResult.percent,
      autoNeedsManualReview: !!gradeResult.hasManual,
      autoGradedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // If all questions are auto-gradable, finalize grading.
    if (gradeResult.fullyAuto) {
      patch.grade = gradeResult.percent;
      patch.status = 'graded';
      patch.gradedAt = admin.firestore.FieldValue.serverTimestamp();
      if (!data.feedback) patch.feedback = buildAutoFeedback(gradeResult.percent);
    }

    await db.collection('submissions').doc(String(submissionId)).set(patch, { merge: true });
  });

// Auto-grade quiz submissions saved in `quizSubmissions` (quizzes collection stores questions).
exports.onQuizSubmissionCreate = functions.firestore
  .document('quizSubmissions/{quizSubmissionId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data() || {};
    const quizSubmissionId = ctx.params.quizSubmissionId;

    // Don't overwrite manually graded submissions.
    if (data.status === 'graded' || data.score != null) return;

    const quizId = data.quizId || null;
    const rawAnswers = data.answers || data.responses || data.submittedAnswers || data.quizAnswers || null;
    if (!quizId || !rawAnswers) return;

    const quizRef = db.collection('quizzes').doc(String(quizId));
    const quizSnap = await quizRef.get();
    if (!quizSnap.exists) return;

    const quiz = quizSnap.data() || {};
    const questions = quiz.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) return;

    const gradeResult = autoGradeQuestions(questions, rawAnswers);
    if (gradeResult.percent == null) return;

    const patch = {
      autoPointsEarned: gradeResult.pointsEarned,
      autoPointsPossible: gradeResult.pointsPossible,
      autoPercent: gradeResult.percent,
      autoNeedsManualReview: !!gradeResult.hasManual,
      autoGradedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (gradeResult.fullyAuto) {
      patch.score = gradeResult.percent;
      patch.status = 'graded';
      patch.gradedAt = admin.firestore.FieldValue.serverTimestamp();
      if (!data.feedback) patch.feedback = buildAutoFeedback(gradeResult.percent);
    }

    await db.collection('quizSubmissions').doc(String(quizSubmissionId)).set(patch, { merge: true });
  });
