/**
 * FIRESTORE QUICK REFERENCE - STUDENT DASHBOARD
 * 
 * Quick lookup guide for common operations
 */

// ========== QUICK SETUP (3 STEPS) ==========

// 1. Create Firestore Database
// - Firebase Console → Create Firestore Database
// - Select Native Mode
// - Choose your region

// 2. Create Collections
// - students, courses, assignments, submissions, quizzes, 
//   quizSubmissions, grades, announcements, schedule, messages, faculty

// 3. Apply Security Rules (from FIRESTORE_SCHEMA.md)
// - Firestore Database → Rules → Update with provided rules

// ========== IMPORTING FUNCTIONS ==========

// Single import
import { getStudentAssignments } from '../utils/firestoreHelpers'

// Multiple imports
import {
  getStudentAssignments,
  getStudentSubmissions,
  submitAssignment
} from '../utils/firestoreHelpers'

// Or use index file
import { getStudentAssignments } from '../utils'

// ========== COMMON OPERATIONS ==========

// GET STUDENT ASSIGNMENTS
import { getStudentAssignments } from '../utils/firestoreHelpers'
const assignments = await getStudentAssignments(userId)

// GET STUDENT SUBMISSIONS
import { getStudentSubmissions } from '../utils/firestoreHelpers'
const submissions = await getStudentSubmissions(userId)

// SUBMIT ASSIGNMENT
import { submitAssignment } from '../utils/firestoreHelpers'
await submitAssignment(userId, assignmentId, {
  fileName: 'file.pdf',
  comments: 'My work',
  submissionDate: '2025-12-05'
})

// GET COURSE ASSIGNMENTS
import { getCourseAssignments } from '../utils/firestoreHelpers'
const courseAssignments = await getCourseAssignments(courseId)

// GET QUIZZES
import { getCourseQuizzes } from '../utils/firestoreHelpers'
const quizzes = await getCourseQuizzes(courseId)

// SUBMIT QUIZ
import { submitQuiz } from '../utils/firestoreHelpers'
await submitQuiz(userId, quizId, answers, score)

// GET GRADES
import { getStudentGrades } from '../utils/firestoreHelpers'
const grades = await getStudentGrades(userId)

// GET ANNOUNCEMENTS
import { getCourseAnnouncements } from '../utils/firestoreHelpers'
const announcements = await getCourseAnnouncements(courseId)

// GET SCHEDULE
import { getStudentSchedule } from '../utils/firestoreHelpers'
const schedule = await getStudentSchedule(userId)

// GET MESSAGES
import { getStudentMessages } from '../utils/firestoreHelpers'
const messages = await getStudentMessages(userId)

// SEND MESSAGE
import { sendMessage } from '../utils/firestoreHelpers'
await sendMessage(senderId, recipientId, {
  subject: 'Help needed',
  content: 'Message body'
})

// GET STUDENT PROFILE
import { getStudentProfile } from '../utils/firestoreHelpers'
const profile = await getStudentProfile(userId)

// UPDATE PROFILE
import { updateStudentProfile } from '../utils/firestoreHelpers'
await updateStudentProfile(userId, {
  firstName: 'New Name',
  profilePictureUrl: 'url'
})

// ========== ERROR HANDLING TEMPLATE ==========

try {
  const assignments = await getStudentAssignments(userId)
  setAssignments(assignments)
} catch (error) {
  console.error('Error loading assignments:', error)
  alert('Unable to load assignments')
}

// ========== REACT PATTERN ==========

import { useState, useEffect } from 'react'
import { getStudentAssignments } from '../utils/firestoreHelpers'

export default function StudentPage() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getStudentAssignments(userId)
        setAssignments(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [userId])

  if (loading) return <div>Loading...</div>
  return <div>{/* Display assignments */}</div>
}

// ========== FIRESTORE COLLECTION SHORTCUTS ==========

// Get assignments by course
db.collection('assignments')
  .where('courseId', '==', courseId)
  .orderBy('dueDate', 'asc')
  .get()

// Get submissions by student
db.collection('submissions')
  .where('studentId', '==', userId)
  .orderBy('submittedAt', 'desc')
  .get()

// Get grades by student
db.collection('grades')
  .where('studentId', '==', userId)
  .orderBy('gradedAt', 'desc')
  .get()

// Get announcements by course
db.collection('announcements')
  .where('courseId', '==', courseId)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()

// ========== DOCUMENT STRUCTURE CHEAT SHEET ==========

// Assignment document
{
  assignmentId: 'abc123',
  courseId: 'course1',
  title: 'Assignment 1',
  description: 'Description...',
  dueDate: Date,
  totalPoints: 100,
  submissionFormat: 'PDF'
}

// Submission document
{
  submissionId: 'sub123',
  studentId: 'user123',
  assignmentId: 'abc123',
  fileName: 'solution.pdf',
  comments: 'My work',
  submittedAt: Timestamp,
  status: 'submitted',
  grade: null
}

// Quiz document
{
  quizId: 'quiz1',
  courseId: 'course1',
  title: 'Chapter 1 Quiz',
  totalPoints: 50,
  timeLimit: 30,
  questions: [
    {
      questionId: 'q1',
      type: 'multiple_choice',
      text: 'Question...',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      points: 10
    }
  ]
}

// Grade document
{
  gradeId: 'grade1',
  studentId: 'user123',
  courseId: 'course1',
  assignmentId: 'abc123',
  grade: 85,
  maxPoints: 100,
  letterGrade: 'B',
  feedback: 'Good work!'
}

// ========== DEBUGGING TIPS ==========

// Check if user is authenticated
console.log('Current user:', firebase.auth().currentUser)

// Check Firestore data
db.collection('assignments').get().then(snapshot => {
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data())
  })
})

// Check submission
db.collection('submissions')
  .where('studentId', '==', 'user_id')
  .get()
  .then(snapshot => console.log(snapshot.docs))

// Monitor read/write operations
// Firebase Console → Usage tab

// ========== PERFORMANCE CHECKLIST ==========

□ Use appropriate indexes (Firestore suggests them)
□ Query only needed fields
□ Limit results with limit()
□ Order by indexed fields
□ Cache data locally when possible
□ Use batch operations for multiple writes
□ Avoid N+1 query problems
□ Monitor quota usage

// ========== TROUBLESHOOTING ==========

Problem: "No document found"
→ Check document ID and collection name
→ Verify data was actually saved
→ Check security rules

Problem: "Permission denied"
→ Check security rules
→ Verify user is authenticated
→ Check user UID matches rule conditions

Problem: "Query requires composite index"
→ Firestore will suggest link to create it
→ Click link in console error
→ Index creation takes 5-10 minutes

Problem: "Quota exceeded"
→ Check Firestore usage in console
→ Optimize queries
→ Reduce reads/writes
→ Consider batch operations

Problem: "Data not updating"
→ Check if listener is active
→ Verify query conditions
→ Check browser console for errors
→ Refresh page to force load

// ========== FILES TO REVIEW ==========

1. src/pages/Dashboard.jsx
   - Main student dashboard implementation

2. src/utils/firestoreHelpers.js
   - All Firestore operations

3. src/utils/FIRESTORE_SCHEMA.md
   - Database structure documentation

4. src/utils/FIRESTORE_SETUP.md
   - Setup and initialization guide

5. src/INTEGRATION_GUIDE.md
   - Full integration documentation

6. src/firebase.js
   - Firebase configuration

// ========== LINKS ==========

Firebase Console: https://console.firebase.google.com
Firestore Documentation: https://firebase.google.com/docs/firestore
Firebase SDK Docs: https://firebase.google.com/docs/reference/js
Security Rules: https://firebase.google.com/docs/firestore/security/start

// ========== SUMMARY ==========

✓ All necessary Firestore functions created
✓ Student dashboard integrated with Firestore
✓ Assignments fetched from database
✓ Submissions saved to database
✓ Complete documentation provided
✓ Security rules template included
✓ Sample data and setup guide ready
✓ Error handling implemented
✓ Ready for production with minimal setup

Ready to go! Just follow FIRESTORE_SETUP.md to initialize your database.
