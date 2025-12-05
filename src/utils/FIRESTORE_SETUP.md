/**
 * FIRESTORE SETUP GUIDE FOR CODTECH LMS
 * 
 * This guide helps you set up the Firestore database structure
 * and populate it with initial data.
 */

// ========== STEP 1: CREATE COLLECTIONS IN FIREBASE CONSOLE ==========
// Go to Firebase Console → Firestore Database → Create Collection
// Create these empty collections first:
// 1. students
// 2. courses
// 3. assignments
// 4. submissions
// 5. quizzes
// 6. quizSubmissions
// 7. grades
// 8. announcements
// 9. schedule
// 10. messages
// 11. faculty

// ========== STEP 2: SAMPLE DATA TO POPULATE ==========

// SAMPLE STUDENT DOCUMENT (Copy to students/{studentId})
const sampleStudent = {
  uid: "student_uid_from_auth",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  studentId: "S20240001",
  enrolledCourses: ["course_id_1", "course_id_2"],
  major: "Computer Science",
  year: 2,
  gpa: 3.75,
  profilePictureUrl: "",
  phoneNumber: "+1234567890",
  address: "123 Main St, City",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

// SAMPLE COURSE DOCUMENT (Copy to courses/{courseId})
const sampleCourse = {
  courseCode: "CS101",
  courseName: "Introduction to Computer Science",
  description: "Fundamentals of programming and computational thinking",
  semester: "Fall 2025",
  credits: 3,
  facultyId: "faculty_uid",
  facultyName: "Dr. Jane Smith",
  enrolledStudents: ["student_uid_1", "student_uid_2"],
  schedule: {
    dayOfWeek: "Monday,Wednesday,Friday",
    startTime: "09:00",
    endTime: "10:30",
    location: "Room 101, Tech Building"
  },
  materials: [],
  maxCapacity: 50,
  currentEnrollment: 35,
  startDate: new Date("2025-09-01"),
  endDate: new Date("2025-12-15"),
  createdAt: new Date()
}

// SAMPLE ASSIGNMENT DOCUMENT (Copy to assignments/{assignmentId})
const sampleAssignment = {
  courseId: "course_id_1",
  courseName: "CS101",
  title: "Assignment 1: Variables and Data Types",
  description: "Learn about variables and basic data types",
  instructions: "Complete the following exercises...",
  dueDate: new Date("2025-11-15"),
  createdDate: new Date("2025-11-01"),
  totalPoints: 100,
  assignmentType: "homework",
  attachments: [
    {
      fileName: "assignment1_template.py",
      fileUrl: "https://...",
      fileType: "python"
    }
  ],
  rubric: [
    { criteria: "Correctness", points: 60 },
    { criteria: "Code Style", points: 20 },
    { criteria: "Documentation", points: 20 }
  ],
  submissionFormat: "Python file (.py)",
  allowLateSubmission: true,
  latePenaltyPercent: 10,
  createdAt: new Date()
}

// SAMPLE SUBMISSION DOCUMENT (Auto-created by app)
const sampleSubmission = {
  studentId: "student_uid",
  studentName: "John Doe",
  studentEmail: "john@example.com",
  assignmentId: "assignment_id_1",
  assignmentName: "Assignment 1: Variables and Data Types",
  courseId: "course_id_1",
  courseName: "CS101",
  fileName: "assignment1_solution.py",
  fileUrl: "https://...",
  fileSize: 2048,
  comments: "Completed all exercises",
  submittedAt: new Date(),
  submissionDate: "2025-11-10",
  status: "submitted",
  grade: null,
  feedback: null,
  isLate: false,
  submissionCount: 1
}

// ========== STEP 3: HELPER FUNCTION TO ADD SAMPLE DATA ==========
// Run this in Firebase Console Functions or from client
// Make sure to update with real UIDs from your authentication

import { db } from '../firebase'
import { collection, addDoc, doc, setDoc } from 'firebase/firestore'

export const initializeSampleData = async () => {
  try {
    // Add sample course
    const courseRef = await addDoc(collection(db, 'courses'), sampleCourse)
    console.log('Course created:', courseRef.id)

    // Add sample student
    const studentRef = await addDoc(collection(db, 'students'), sampleStudent)
    console.log('Student created:', studentRef.id)

    // Add sample assignment
    const assignmentRef = await addDoc(collection(db, 'assignments'), sampleAssignment)
    console.log('Assignment created:', assignmentRef.id)

    // Add sample announcement
    const announcementRef = await addDoc(collection(db, 'announcements'), {
      courseId: courseRef.id,
      courseName: sampleCourse.courseName,
      title: "Welcome to CS101",
      content: "Welcome to the course! Please review the syllabus.",
      author: "Dr. Jane Smith",
      authorId: "faculty_uid",
      createdAt: new Date(),
      updatedAt: new Date(),
      important: true,
      attachments: [],
      targetAudience: []
    })
    console.log('Announcement created:', announcementRef.id)

    // Add sample schedule
    const scheduleRef = await addDoc(collection(db, 'schedule'), {
      courseId: courseRef.id,
      courseName: sampleCourse.courseName,
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "10:30",
      location: "Room 101, Tech Building",
      instructionMode: "in-person",
      meetingLink: "",
      professor: "Dr. Jane Smith",
      professorId: "faculty_uid",
      semesterStart: new Date("2025-09-01"),
      semesterEnd: new Date("2025-12-15"),
      exceptions: []
    })
    console.log('Schedule created:', scheduleRef.id)

  } catch (error) {
    console.error('Error initializing sample data:', error)
  }
}

// Call this function once to set up sample data:
// initializeSampleData()

// ========== STEP 4: FIREBASE SECURITY RULES SETUP ==========
// Go to Firebase Console → Firestore Database → Rules
// Paste the security rules (see FIRESTORE_SCHEMA.md)

// ========== STEP 5: INDEXES (Auto-created) ==========
// Firestore will automatically suggest creating composite indexes
// when you run queries that require them. Accept these suggestions.

// Example queries that might trigger index creation:
// - assignments ordered by dueDate where courseId == X
// - submissions ordered by submittedAt where studentId == Y
// - announcements ordered by createdAt where courseId == Z

// ========== STEP 6: VERIFICATION CHECKLIST ==========
// ☐ All 11 collections created
// ☐ Sample data added
// ☐ Security rules updated
// ☐ Authentication enabled (Email/Password or Google)
// ☐ Storage bucket configured (if file uploads needed)
// ☐ Firestore mode set to "Native mode" (not Datastore)
// ☐ Location set to appropriate region (us-central1, eu-west1, etc.)

// ========== STEP 7: STUDENT ENROLLMENT FLOW ==========
// 1. Student signs up via authentication
// 2. Student document created automatically
// 3. Student selects courses to enroll in
// 4. Course ID added to student's enrolledCourses array
// 5. Student UID added to course's enrolledStudents array
// 6. Dashboard queries pull assignments from enrolled courses

// ========== STEP 8: TESTING THE INTEGRATION ==========
// Test queries in Firestore Console:

// Get all courses:
// db.collection('courses').get()

// Get assignments for a course:
// db.collection('assignments').where('courseId', '==', 'course_id_1').get()

// Get student submissions:
// db.collection('submissions').where('studentId', '==', 'student_uid').get()

// Get student announcements:
// db.collection('announcements').where('targetAudience', 'array-contains', 'student_uid').get()

// ========== COMMON ISSUES & SOLUTIONS ==========

/*
ISSUE 1: "Missing or insufficient permissions"
SOLUTION: 
- Check security rules in Firebase Console
- Verify user is authenticated
- Ensure user's UID matches the rule conditions

ISSUE 2: "Document not found"
SOLUTION:
- Verify the document ID in Firestore
- Check collection name spelling
- Use Firebase Console to browse collections

ISSUE 3: "Query returned no results"
SOLUTION:
- Verify field names match exactly (case-sensitive)
- Check that composite index exists (Firebase will suggest)
- Verify the data actually exists in database

ISSUE 4: "Quota exceeded"
SOLUTION:
- Check Firestore pricing plan
- Optimize queries to reduce read/write operations
- Batch operations together

ISSUE 5: "File upload not working"
SOLUTION:
- Ensure Firebase Storage is enabled
- Add storage security rules
- Check file size limits (50MB max)
- Verify bucket permissions
*/

// ========== USEFUL FIRESTORE OPERATIONS ==========

// Batch write multiple documents at once
import { writeBatch } from 'firebase/firestore'

const batch = writeBatch(db)
const ref1 = doc(db, 'students', 'student1')
batch.set(ref1, sampleStudent)
await batch.commit()

// Real-time listener (auto-update when data changes)
import { onSnapshot } from 'firebase/firestore'

onSnapshot(
  query(collection(db, 'assignments'), where('courseId', '==', 'course1')),
  (snapshot) => {
    const assignments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    setAssignments(assignments)
  }
)

// Pagination for large datasets
import { limit, startAfter } from 'firebase/firestore'

const q = query(
  collection(db, 'submissions'),
  where('studentId', '==', userId),
  orderBy('submittedAt', 'desc'),
  limit(10)
)
