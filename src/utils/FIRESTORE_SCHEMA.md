/**
 * FIRESTORE DATABASE SCHEMA FOR CODTECH LMS
 * 
 * This file documents the complete Firestore structure for the student-side
 * of the CodTech Learning Management System.
 * 
 * Collections:
 * 1. students
 * 2. courses
 * 3. assignments
 * 4. submissions
 * 5. quizzes
 * 6. quizSubmissions
 * 7. grades
 * 8. announcements
 * 9. schedule
 * 10. messages
 * 11. faculty (for messaging and course management)
 */

// ========== 1. STUDENTS COLLECTION ==========
// Path: students/{studentId}
// Purpose: Store student profiles and enrollment data

students: {
  uid: string,                    // Firebase Auth UID
  firstName: string,              // Student first name
  lastName: string,               // Student last name
  email: string,                  // Student email
  enrolledCourses: array[string], // Array of course IDs
  profilePictureUrl: string,      // URL to profile picture
  studentId: string,              // Student ID number
  major: string,                  // Field of study
  year: number,                   // Academic year
  gpa: number,                    // Current GPA
  createdAt: timestamp,           // Account creation date
  updatedAt: timestamp,           // Last profile update
  phoneNumber: string,            // Contact phone
  address: string,                // Physical address
  isActive: boolean               // Account status
}

// ========== 2. COURSES COLLECTION ==========
// Path: courses/{courseId}
// Purpose: Store course information

courses: {
  courseCode: string,             // Unique course code (e.g., "CS101")
  courseName: string,             // Full course name
  description: string,            // Course description
  semester: string,               // Semester offered (e.g., "Fall 2025")
  credits: number,                // Credit hours
  facultyId: string,              // ID of teaching faculty
  facultyName: string,            // Name of faculty
  enrolledStudents: array[string],// Array of student UIDs
  schedule: object {              // Class schedule
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    location: string
  },
  materials: array[object],       // Course materials
  maxCapacity: number,            // Maximum students
  currentEnrollment: number,      // Current enrollment count
  startDate: date,                // Course start date
  endDate: date,                  // Course end date
  createdAt: timestamp
}

// ========== 3. ASSIGNMENTS COLLECTION ==========
// Path: assignments/{assignmentId}
// Purpose: Store assignment details

assignments: {
  courseId: string,               // ID of the course
  courseName: string,             // Name of the course
  title: string,                  // Assignment title
  description: string,            // Detailed description
  instructions: string,           // Step-by-step instructions
  dueDate: date,                  // Submission deadline
  createdDate: date,              // When assignment was created
  totalPoints: number,            // Points possible
  assignmentType: string,         // "homework", "project", "reading", etc.
  attachments: array[object] {    // Files provided with assignment
    fileName: string,
    fileUrl: string,
    fileType: string
  },
  rubric: array[object],          // Grading rubric
  submissionFormat: string,       // Expected format (PDF, DOC, etc.)
  allowLateSubmission: boolean,   // Late submission policy
  latePenaltyPercent: number,     // Penalty percentage
  createdAt: timestamp
}

// ========== 4. SUBMISSIONS COLLECTION ==========
// Path: submissions/{submissionId}
// Purpose: Store assignment submissions

submissions: {
  studentId: string,              // UID of submitting student
  studentName: string,            // Student full name
  studentEmail: string,           // Student email
  assignmentId: string,           // ID of assignment
  assignmentName: string,         // Name of assignment
  courseId: string,               // ID of course
  courseName: string,             // Name of course
  fileName: string,               // Submitted file name
  fileUrl: string,                // URL to submitted file
  fileSize: number,               // File size in bytes
  comments: string,               // Student submission notes
  submittedAt: timestamp,         // Submission timestamp
  submissionDate: string,         // YYYY-MM-DD format
  status: string,                 // "submitted", "graded", "late"
  grade: number,                  // Points received (null until graded)
  feedback: string,               // Faculty feedback (null until graded)
  isLate: boolean,                // Was this late?
  submissionCount: number         // How many times submitted
}

// ========== 5. QUIZZES COLLECTION ==========
// Path: quizzes/{quizId}
// Purpose: Store quiz information

quizzes: {
  courseId: string,               // ID of the course
  courseName: string,             // Name of the course
  title: string,                  // Quiz title
  description: string,            // Quiz description
  dueDate: date,                  // Quiz deadline
  totalPoints: number,            // Points possible
  timeLimit: number,              // Time limit in minutes (0 = unlimited)
  shuffleQuestions: boolean,      // Randomize question order
  shuffleAnswers: boolean,        // Randomize answer options
  showCorrectAnswers: boolean,    // Show answers after submission
  allowReview: boolean,           // Allow quiz review
  maxAttempts: number,            // Maximum attempts (0 = unlimited)
  questions: array[object] {      // Quiz questions
    questionId: string,
    questionType: string,         // "multiple_choice", "essay", "true_false"
    questionText: string,
    options: array[string],       // Answer options
    correctAnswer: string,        // Correct answer
    points: number
  },
  createdAt: timestamp
}

// ========== 6. QUIZ SUBMISSIONS COLLECTION ==========
// Path: quizSubmissions/{quizSubmissionId}
// Purpose: Store quiz responses

quizSubmissions: {
  studentId: string,              // UID of student
  studentName: string,            // Student name
  quizId: string,                 // ID of quiz
  quizTitle: string,              // Title of quiz
  courseId: string,               // ID of course
  answers: object {               // Student answers
    questionId: string,           // Key = question ID
    value: string                 // Value = student answer
  },
  score: number,                  // Points earned
  totalPoints: number,            // Total possible points
  percentage: number,             // Percentage score
  submittedAt: timestamp,         // Submission time
  completionTime: number,         // Time taken in seconds
  status: string,                 // "submitted", "graded"
  feedback: string,               // Faculty feedback
  attemptNumber: number           // Which attempt this was
}

// ========== 7. GRADES COLLECTION ==========
// Path: grades/{gradeId}
// Purpose: Store grades and transcripts

grades: {
  studentId: string,              // UID of student
  studentName: string,            // Student name
  courseId: string,               // ID of course
  courseName: string,             // Name of course
  assignmentId: string,           // ID of assignment (if applicable)
  assignmentName: string,         // Name of assignment
  grade: number,                  // Points or percentage
  maxPoints: number,              // Total possible
  letterGrade: string,            // A, B, C, D, F
  weight: number,                 // Weight in final grade
  gradedAt: timestamp,            // When graded
  gradedBy: string,               // Faculty ID who graded
  feedback: string,               // Grading feedback
  submissionId: string            // Link to submission
}

// ========== 8. ANNOUNCEMENTS COLLECTION ==========
// Path: announcements/{announcementId}
// Purpose: Store course announcements

announcements: {
  courseId: string,               // ID of course
  courseName: string,             // Name of course
  title: string,                  // Announcement title
  content: string,                // Full announcement text
  author: string,                 // Faculty name
  authorId: string,               // Faculty UID
  createdAt: timestamp,           // Creation date
  updatedAt: timestamp,           // Last update
  important: boolean,             // Pin to top if true
  attachments: array[object],     // Files attached
  targetAudience: array[string]   // Student IDs if targeted (empty = all)
}

// ========== 9. SCHEDULE COLLECTION ==========
// Path: schedule/{scheduleId}
// Purpose: Store class schedules

schedule: {
  courseId: string,               // ID of course
  courseName: string,             // Name of course
  dayOfWeek: string,              // "Monday", "Tuesday", etc.
  startTime: string,              // "09:00" (24-hour format)
  endTime: string,                // "10:30" (24-hour format)
  location: string,               // Building/Room
  instructionMode: string,        // "in-person", "online", "hybrid"
  meetingLink: string,            // Zoom/Teams link if online
  professor: string,              // Faculty name
  professorId: string,            // Faculty UID
  semesterStart: date,            // Semester start
  semesterEnd: date,              // Semester end
  exceptions: array[object]       // Holiday dates, etc.
}

// ========== 10. MESSAGES COLLECTION ==========
// Path: messages/{messageId}
// Purpose: Store student-faculty messages

messages: {
  senderId: string,               // UID of sender (student or faculty)
  senderName: string,             // Sender full name
  senderType: string,             // "student" or "faculty"
  recipientId: string,            // UID of recipient
  recipientName: string,          // Recipient full name
  recipientType: string,          // "student" or "faculty"
  subject: string,                // Message subject
  content: string,                // Message body
  createdAt: timestamp,           // When sent
  read: boolean,                  // Read status
  readAt: timestamp,              // When read
  attachments: array[object],     // Files attached
  conversationId: string,         // Thread ID for conversations
  isReply: boolean,               // Is this a reply
  replyToId: string               // ID of message being replied to
}

// ========== 11. FACULTY COLLECTION ==========
// Path: faculty/{facultyId}
// Purpose: Store faculty information

faculty: {
  uid: string,                    // Firebase Auth UID
  firstName: string,              // Faculty first name
  lastName: string,               // Faculty last name
  email: string,                  // Faculty email
  department: string,             // Department/Faculty
  title: string,                  // Dr., Prof., etc.
  officeLocation: string,         // Office location
  phoneNumber: string,            // Contact phone
  officeHours: array[object],     // Office hours schedule
  courses: array[string],         // IDs of courses taught
  profilePictureUrl: string,      // URL to profile picture
  bio: string,                    // Faculty biography
  specializations: array[string], // Areas of expertise
  createdAt: timestamp
}

// ========== FIRESTORE SECURITY RULES ==========
// These rules ensure student privacy and data integrity

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Students can only read/write their own documents
    match /students/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Students can read courses they're enrolled in
    match /courses/{courseId} {
      allow read: if request.auth.uid in resource.data.enrolledStudents;
    }
    
    // Students can read assignments for their courses
    match /assignments/{assignmentId} {
      allow read: if request.auth.uid in resource.data.enrolledStudents;
    }
    
    // Students can create submissions, read and update their own
    match /submissions/{submissionId} {
      allow create: if request.auth.uid != null;
      allow read, update: if request.auth.uid == resource.data.studentId;
    }
    
    // Students can read announcements for their courses
    match /announcements/{announcementId} {
      allow read: if request.auth.uid in resource.data.targetAudience || resource.data.targetAudience.size() == 0;
    }
    
    // Students can read schedule for enrolled courses
    match /schedule/{scheduleId} {
      allow read: if true; // Can be restricted further
    }
    
    // Students can send messages and read received messages
    match /messages/{messageId} {
      allow create: if request.auth.uid == request.resource.data.senderId;
      allow read: if request.auth.uid == resource.data.recipientId || request.auth.uid == resource.data.senderId;
    }
    
    // Students can read grades for themselves
    match /grades/{gradeId} {
      allow read: if request.auth.uid == resource.data.studentId;
    }
    
    // Students can read quiz info and create submissions
    match /quizzes/{quizId} {
      allow read: if true;
    }
    
    match /quizSubmissions/{quizSubmissionId} {
      allow create: if request.auth.uid == request.resource.data.studentId;
      allow read: if request.auth.uid == resource.data.studentId;
    }
  }
}
