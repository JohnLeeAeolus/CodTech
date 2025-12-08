const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

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
