// Firestore helper functions for the LMS
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  doc, 
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db, storage } from '../firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const resolveCourseByIdOrCode = async (maybeIdOrCode) => {
  if (!maybeIdOrCode && maybeIdOrCode !== 0) return null;

  // If it's a string, prefer document-id lookup
  if (typeof maybeIdOrCode === 'string' && maybeIdOrCode.trim() !== '') {
    try {
      const q = query(collection(db, 'courses'), where('__name__', '==', maybeIdOrCode));
      const snap = await getDocs(q);
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      // fallthrough to try other ways
      console.warn('resolveCourseByIdOrCode: doc-id lookup failed, trying code lookup', e);
    }
  }

  // Convert to string and try courseCode or code fields
  const codeStr = String(maybeIdOrCode);
  // try 'courseCode'
  let snap = await getDocs(query(collection(db, 'courses'), where('courseCode', '==', codeStr)));
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  // try 'code'
  snap = await getDocs(query(collection(db, 'courses'), where('code', '==', codeStr)));
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };

  // Not found
  return null;
};

// ========== STUDENT OPERATIONS ==========

/**
 * Get student profile by UID
 */
export const getStudentProfile = async (userId) => {
  try {
    const q = query(collection(db, 'students'), where('uid', '==', userId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0]
      // If the found document uses a legacy random id (not the UID), ensure a
      // document exists at /students/{uid} so security rules that rely on that
      // path (isStudent()) will work. This will create a lightweight copy if
      // needed; it avoids locking out students whose profiles were created
      // using addDoc before we started using UID-based doc IDs.
      if (docSnap.id !== userId) {
        const uidRef = doc(db, 'students', userId)
        const uidDoc = await getDoc(uidRef)
        if (!uidDoc.exists()) {
          // create a minimal profile at the UID path
          try {
            await setDoc(uidRef, {
              uid: userId,
              enrolledCourses: docSnap.data().enrolledCourses || [],
              name: docSnap.data().name || null,
              email: docSnap.data().email || null,
              createdAt: serverTimestamp(),
              migratedFrom: docSnap.id
            })
          } catch (err) {
            console.warn('Could not create UID-based student doc for migration:', err)
          }
        }
      }
      return { id: docSnap.id, ...docSnap.data(), uid: docSnap.data().uid || userId }
    }

    // Fallback: some datasets use UID as the document id instead of a field
    const fallbackDoc = await getDoc(doc(db, 'students', userId))
    if (fallbackDoc.exists()) {
      return { id: fallbackDoc.id, ...fallbackDoc.data(), uid: fallbackDoc.data().uid || userId }
    }

    return null
  } catch (error) {
    console.error('Error fetching student profile:', error)
    throw error
  }
}

/**
 * Create student profile
 */
export const createStudentProfile = async (userId, studentData) => {
  try {
    // Create student profile using the UID as the document ID so security rules
    // that check for /students/{uid} exist() will work.
    const docRef = doc(db, 'students', userId)
    await setDoc(docRef, {
      uid: userId,
      enrolledCourses: [],
      createdAt: serverTimestamp(),
      ...studentData
    })
    return { id: userId, ...studentData }
  } catch (error) {
    console.error('Error creating student profile:', error)
    throw error
  }
}

/**
 * Create an enrollment record in the `enrollments` collection.
 * This follows your rules which allow students to create their own enrollment documents.
 */
export const createEnrollment = async (studentUid, courseId) => {
  try {
    const docRef = await addDoc(collection(db, 'enrollments'), {
      studentId: studentUid,
      courseId,
      status: 'enrolled',
      createdAt: serverTimestamp()
    })
    return { id: docRef.id }
  } catch (error) {
    console.error('Error creating enrollment:', error)
    throw error
  }
}

/**
 * Find enrollment documents for a given student + course (returns array of {id,...data}).
 */
export const findEnrollmentsByStudentAndCourse = async (studentUid, courseId) => {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('studentId', '==', studentUid),
      where('courseId', '==', courseId)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Error finding enrollments:', error)
    throw error
  }
}

/**
 * Delete an enrollment document by id
 */
export const deleteEnrollment = async (enrollmentId) => {
  try {
    await deleteDoc(doc(db, 'enrollments', enrollmentId))
    return true
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    throw error
  }
}

/**
 * Get student courses (enrolled and available)
 */
export const getStudentCourses = async (userId) => {
  try {
    const q = query(collection(db, 'courses'), orderBy('courseName', 'asc'))
    const querySnapshot = await getDocs(q)
    const allCourses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get student enrollment data
    const studentProfile = await getStudentProfile(userId)
    const enrolledCourses = studentProfile?.enrolledCourses || []

    // Mark which courses student is enrolled in
    return allCourses.map(course => ({
      ...course,
      enrolled: enrolledCourses.includes(course.id)
    }))
  } catch (error) {
    console.error('Error fetching student courses:', error)
    throw error
  }
}

/**
 * Enroll student in a course
 */
export const enrollInCourse = async (userId, courseId) => {
  try {
    const studentRef = doc(db, 'students', userId)
    await updateDoc(studentRef, {
      enrolledCourses: arrayUnion(courseId)
    })
  } catch (error) {
    console.error('Error enrolling in course:', error)
    throw error
  }
}

/**
 * Drop/unenroll from a course
 */
export const dropCourse = async (userId, courseId) => {
  try {
    const studentRef = doc(db, 'students', userId)
    await updateDoc(studentRef, {
      enrolledCourses: arrayRemove(courseId)
    })
  } catch (error) {
    console.error('Error dropping course:', error)
    throw error
  }
}

/**
 * Get assignments for enrolled courses
 */
export const getStudentAssignments = async (userId) => {
  try {
    const studentProfile = await getStudentProfile(userId)
    if (!studentProfile) return []

    const enrolledCourses = studentProfile.enrolledCourses || []
    let allAssignments = []

    for (const courseId of enrolledCourses) {
      // Get course name
      let courseName = 'Unknown Course'
try {
  const resolved = await resolveCourseByIdOrCode(courseId)
  if (resolved) {
    courseName = resolved.courseName || resolved.name || resolved.title || 'Unknown Course'
  }
} catch (err) {
  console.warn('Could not resolve course for courseId:', courseId, err)
}

      const q = query(
        collection(db, 'assignments'),
        where('courseId', '==', courseId),
        orderBy('dueDate', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const assignments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        courseName: courseName,
        ...doc.data()
      }))
      allAssignments = [...allAssignments, ...assignments]
    }

    return allAssignments
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    throw error
  }
}

/**
 * Get quizzes for enrolled courses for a student
 */
export const getStudentQuizzes = async (userId) => {
  try {
    const studentProfile = await getStudentProfile(userId)
    if (!studentProfile) return []

    const enrolledCourses = studentProfile.enrolledCourses || []
    let allQuizzes = []

    for (const courseId of enrolledCourses) {
      const q = query(
        collection(db, 'quizzes'),
        where('courseId', '==', courseId),
        orderBy('dueDate', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const quizzes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      allQuizzes = [...allQuizzes, ...quizzes]
    }

    return allQuizzes
  } catch (error) {
    console.error('Error fetching student quizzes:', error)
    throw error
  }
}

/**
 * Get student submissions
 */
export const getStudentSubmissions = async (userId) => {
  try {
    console.log('🔵 Fetching submissions for student:', userId)
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', userId),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    console.log('✓ Found', querySnapshot.docs.length, 'submissions')
    
    // Enrich submissions with assignment title, course, formatted dates, and student name
    const enriched = await Promise.all(querySnapshot.docs.map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }

      // Resolve student name first - use existing if available
      try {
        // If studentName is already stored and not a document ID, use it
        if (data.studentName && data.studentName.length < 50 && !data.studentName.match(/^[a-zA-Z0-9]{20,}$/)) {
          result.studentName = data.studentName
          console.log('✓ Using stored student name:', result.studentName)
        } else if (data.studentId) {
          // Try to resolve from students collection
          console.log('Resolving student name for:', data.studentId)
          const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
          const studentSnap = await getDocs(studentQ)
          if (!studentSnap.empty) {
            const studentData = studentSnap.docs[0].data()
            result.studentName = studentData.name || studentData.fullName || studentData.displayName || (studentData.firstName ? `${studentData.firstName} ${studentData.lastName || ''}`.trim() : data.studentId)
            console.log('✓ Resolved student name:', result.studentName)
          } else {
            result.studentName = data.studentName || 'Unknown Student'
            console.warn('Student not found in students collection:', data.studentId)
          }
        } else {
          result.studentName = data.studentName || 'Unknown Student'
        }
      } catch (err) {
        console.warn('Could not resolve student name:', data.studentId, err)
        result.studentName = data.studentName || 'Unknown Student'
      }

      // Resolve assignment title and course
      try {
        if (data.assignmentId) {
          console.log('Resolving assignment:', data.assignmentId)
          const assignmentQ = query(collection(db, 'assignments'), where('__name__', '==', data.assignmentId))
          const assignmentSnap = await getDocs(assignmentQ)
          if (!assignmentSnap.empty) {
            const assignmentData = assignmentSnap.docs[0].data()
            result.assignment = assignmentData.title || assignmentData.name || 'Assignment'
            result.course = assignmentData.courseId || 'Unknown Course'
            result.dueDate = assignmentData.dueDate || null
          } else {
            result.assignment = data.assignmentId
            result.course = data.courseId || 'Unknown Course'
          }
        }
      } catch (err) {
        console.warn('Could not resolve assignment:', data.assignmentId, err)
        result.assignment = data.assignmentId || 'Unknown Assignment'
        result.course = data.courseId || 'Unknown Course'
      }

      // Format submitted date
      try {
        const ts = data.submittedAt
        if (ts && typeof ts.toDate === 'function') {
          result.submittedDate = ts.toDate().toLocaleDateString()
        } else if (ts && ts.seconds) {
          result.submittedDate = new Date(ts.seconds * 1000).toLocaleDateString()
        } else if (ts) {
          result.submittedDate = new Date(ts).toLocaleDateString()
        } else {
          result.submittedDate = 'Unknown'
        }
      } catch (err) {
        result.submittedDate = 'Unknown'
      }

      // Format due date if available
      try {
        if (result.dueDate) {
          const ts = result.dueDate
          if (ts && typeof ts.toDate === 'function') {
            result.dueDate = ts.toDate().toLocaleDateString()
          } else if (ts && ts.seconds) {
            result.dueDate = new Date(ts.seconds * 1000).toLocaleDateString()
          } else if (ts) {
            result.dueDate = new Date(ts).toLocaleDateString()
          }
        }
      } catch (err) {
        result.dueDate = null
      }

      // Resolve file URL
      try {
        if (data.fileUrl) {
          result.fileURL = data.fileUrl
        } else if (data.storagePath) {
          try {
            result.fileURL = await getFileDownloadURL(data.storagePath)
          } catch (err) {
            console.warn('Could not resolve download URL:', data.storagePath)
            result.fileURL = null
          }
        } else if (data.base64DataUrl) {
          result.fileURL = data.base64DataUrl
        } else {
          result.fileURL = null
        }
      } catch (err) {
        result.fileURL = null
      }

      // Set default status if not present
      if (!result.status) {
        result.status = result.grade ? 'graded' : 'submitted'
      }

      console.log('✓ Enriched submission:', result.assignment, 'by', result.studentName, 'Status:', result.status)
      return result
    }))

    console.log('✓ Query executed, returning', enriched.length, 'enriched submissions')
    return enriched
  } catch (error) {
    console.error('❌ Error fetching submissions:', error)
    throw error
  }
}

/**
 * Upload a submission file to Firebase Storage
 */
export const uploadSubmissionFile = async (studentId, assignmentId, file) => {
  try {
    const path = `submissions/${assignmentId}/${studentId}_${Date.now()}_${file.name}`
    const sRef = storageRef(storage, path)
    
    console.log('Uploading submission to:', path)
    console.log('File size:', file.size, 'bytes')
    
    await uploadBytes(sRef, file, {
      contentType: file.type || 'application/octet-stream'
    })
    
    console.log('Submission upload successful, getting download URL...')
    const url = await getDownloadURL(sRef)
    
    return { storagePath: path, downloadURL: url }
  } catch (error) {
    console.error('Error uploading file to storage:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Provide user-friendly error message
    let userMessage = 'Failed to submit file'
    if (error.code === 'storage/cors-not-allowed') {
      userMessage = 'CORS configuration issue. Please contact administrator.'
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userMessage = 'Upload timeout. File may be too large. Please try again.'
    } else if (error.code === 'storage/unauthorized') {
      userMessage = 'You do not have permission to submit files.'
    }
    
    throw new Error(userMessage)
  }
}

/**
 * Upload an assignment file to Firebase Storage
 */
export const uploadAssignmentFile = async (courseId, file) => {
  try {
    const path = `assignments/${courseId}/${Date.now()}_${file.name}`
    const sRef = storageRef(storage, path)
    
    console.log('Uploading file to:', path)
    console.log('File size:', file.size, 'bytes')
    
    const uploadTask = await uploadBytes(sRef, file, {
      contentType: file.type || 'application/octet-stream'
    })
    
    console.log('Upload successful, getting download URL...')
    const url = await getDownloadURL(sRef)
    
    return { storagePath: path, downloadURL: url, fileName: file.name }
  } catch (error) {
    console.error('Error uploading assignment file to storage:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Provide user-friendly error message
    let userMessage = 'Failed to upload file'
    if (error.code === 'storage/cors-not-allowed') {
      userMessage = 'CORS configuration issue. Please contact administrator to configure Firebase Storage CORS.'
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userMessage = 'Upload timeout. File may be too large or connection is unstable. Please try again.'
    } else if (error.code === 'storage/unauthorized') {
      userMessage = 'You do not have permission to upload files.'
    }
    
    throw new Error(userMessage)
  }
}

/**
 * Get download URL for a storage path
 */
export const getFileDownloadURL = async (storagePath) => {
  try {
    const sRef = storageRef(storage, storagePath)
    return await getDownloadURL(sRef)
  } catch (error) {
    console.error('Error getting download URL:', error)
    throw error
  }
}

/**
 * Submit assignment
 */
export const submitAssignment = async (studentId, assignmentId, submissionData) => {
  try {
    // Allow caller to provide courseId to avoid extra lookup
    let courseId = submissionData?.courseId || null

    // If not provided, try to fetch the assignment to attach the courseId to the submission
    if (!courseId) {
      try {
        const assignmentQuery = query(collection(db, 'assignments'), where('__name__', '==', assignmentId))
        const assignmentSnap = await getDocs(assignmentQuery)
        if (!assignmentSnap.empty) {
          courseId = assignmentSnap.docs[0].data()?.courseId || null
        }
      } catch (err) {
        console.warn('Could not fetch assignment to determine courseId for submission:', err)
      }
    }

    const docRef = await addDoc(collection(db, 'submissions'), {
      studentId,
      assignmentId,
      courseId,
      submittedAt: serverTimestamp(),
      status: 'submitted',
      grade: null,
      ...submissionData
    })
    return { id: docRef.id, ...submissionData, courseId }
  } catch (error) {
    console.error('Error submitting assignment:', error)
    throw error
  }
}

/**
 * Get submission by ID
 */
export const getSubmission = async (submissionId) => {
  try {
    const docRef = doc(db, 'submissions', submissionId)
    const docSnap = await getDocs(query(collection(db, 'submissions'), where('__name__', '==', submissionId)))
    if (!docSnap.empty) {
      return { id: docSnap.docs[0].id, ...docSnap.docs[0].data() }
    }
    return null
  } catch (error) {
    console.error('Error fetching submission:', error)
    throw error
  }
}

// ========== ASSIGNMENT OPERATIONS ==========
/**
 * Get ALL quizzes (for fallback display)
 */
export const getAllQuizzes = async () => {
  try {
    console.log('Fetching all quizzes...')
    // Try to fetch from quizzes collection
    const q = query(collection(db, 'quizzes'));
    const querySnapshot = await getDocs(q);
    const quizzes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'quiz',
      ...doc.data()
    }));
    console.log('Fetched quizzes:', quizzes)
    return quizzes;
  } catch (error) {
    console.error('Error fetching all quizzes:', error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Get all assignments for a course
 */
export const getCourseAssignments = async (courseId) => {
  try {
    const q = query(
      collection(db, 'assignments'),
      where('courseId', '==', courseId),
      orderBy('dueDate', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching course assignments:', error)
    throw error
  }
}

/**
 * Get assignment by ID
 */
export const getAssignment = async (assignmentId) => {
  try {
    const q = query(collection(db, 'assignments'), where('__name__', '==', assignmentId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    }
    return null
  } catch (error) {
    console.error('Error fetching assignment:', error)
    throw error
  }
}

/**
 * Get ALL assignments (for display to students who haven't enrolled yet)
 */
export const getAllAssignments = async () => {
  try {
    console.log('=== Fetching all assignments ===')
    // Fetch all assignments (don't rely on status field consistency)
    const q = query(collection(db, 'assignments'))
    const querySnapshot = await getDocs(q)
    console.log('✓ Query executed. Found', querySnapshot.docs.length, 'assignments in database')
    
    // Debug: log raw documents
    querySnapshot.docs.forEach((doc, idx) => {
      console.log(`Doc ${idx}:`, doc.id, doc.data())
    })
    
    if (querySnapshot.docs.length === 0) {
      console.warn('⚠️ No assignments found in Firestore assignments collection!')
      return []
    }
    
    // Fetch course info for each assignment
    const assignmentsWithCourses = await Promise.all(
      querySnapshot.docs.map(async (doc, idx) => {
        const assignmentData = doc.data()
        console.log(`Processing assignment ${idx + 1}:`, assignmentData.title, 'dueDate:', assignmentData.dueDate)
        let courseName = 'Unknown Course'
        
        try {
          if (assignmentData.courseId) {
            const courseQuery = query(
              collection(db, 'courses'),
              where('__name__', '==', assignmentData.courseId)
            )
            const courseSnap = await getDocs(courseQuery)
            if (!courseSnap.empty) {
              courseName = courseSnap.docs[0].data().courseName || courseSnap.docs[0].data().name || 'Unknown Course'
            }
          }
        } catch (err) {
          console.warn('Could not fetch course name for:', assignmentData.courseId, err)
        }
        
        // Ensure dueDate is properly formatted
        let dueDate = assignmentData.dueDate
        if (dueDate && typeof dueDate === 'object' && dueDate.toDate) {
          // Firestore Timestamp
          dueDate = dueDate.toDate().toISOString()
        } else if (dueDate && typeof dueDate !== 'string') {
          // Try to convert to ISO string
          dueDate = new Date(dueDate).toISOString()
        }
        
        console.log(`✓ Assignment ${idx + 1} processed with dueDate:`, dueDate)
        
        return {
          id: doc.id,
          courseName: courseName,
          ...assignmentData,
          dueDate: dueDate
        }
      })
    )
    
    console.log('✓ All assignments with courses:', assignmentsWithCourses)
    // Log sample assignment
    if (assignmentsWithCourses.length > 0) {
      console.log('Sample assignment:', assignmentsWithCourses[0], 'dueDate:', assignmentsWithCourses[0].dueDate)
    }
    return assignmentsWithCourses
  } catch (error) {
    console.error('❌ Error fetching all assignments:', error)
    console.error('Error details:', error.code, error.message)
    // Return empty array instead of throwing
    return []
  }
}

// ========== COURSE OPERATIONS ==========

/**
 * Get course by ID
 */
export const getCourse = async (courseId) => {
  try {
    const q = query(collection(db, 'courses'), where('__name__', '==', courseId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    }
    return null
  } catch (error) {
    console.error('Error fetching course:', error)
    throw error
  }
}

/**
 * Get all courses
 */
export const getAllCourses = async () => {
  try {
    const q = query(collection(db, 'courses'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw error
  }
}

/**
 * Create sample courses (for seeding database)
 */
export const createSampleCourses = async () => {
  try {
    const sampleCourses = [
      {
        name: 'Introduction to Programming',
        title: 'Intro to Programming',
        code: 'CS101',
        courseCode: 'CS101',
        description: 'Learn the basics of programming with Python',
        semester: 'Fall 2024',
        credits: 3,
        students: 45,
        status: 'active',
      },
      {
        name: 'Data Structures',
        title: 'Data Structures',
        code: 'CS201',
        courseCode: 'CS201',
        description: 'Explore fundamental data structures and algorithms',
        semester: 'Fall 2024',
        credits: 3,
        students: 38,
        status: 'active',
      },
      {
        name: 'Web Development',
        title: 'Web Development',
        code: 'CS102',
        courseCode: 'CS102',
        description: 'Build responsive web applications with HTML, CSS, and JavaScript',
        semester: 'Fall 2024',
        credits: 4,
        students: 50,
        status: 'active',
      },
      {
        name: 'Database Design',
        title: 'Database Design',
        code: 'CS301',
        courseCode: 'CS301',
        description: 'Learn database modeling, SQL, and optimization',
        semester: 'Fall 2024',
        credits: 3,
        students: 32,
        status: 'active',
      },
      {
        name: 'Machine Learning',
        title: 'Machine Learning',
        code: 'CS401',
        courseCode: 'CS401',
        description: 'Introduction to machine learning algorithms and applications',
        semester: 'Spring 2025',
        credits: 4,
        students: 35,
        status: 'active',
      },
    ];

    const createdCourses = [];
    for (const course of sampleCourses) {
      try {
        // Check if course already exists
        const existing = await getDocs(
          query(collection(db, 'courses'), where('courseCode', '==', course.courseCode))
        );
        
        if (existing.empty) {
          const docRef = await addDoc(collection(db, 'courses'), {
            ...course,
            createdAt: serverTimestamp(),
          });
          createdCourses.push({ id: docRef.id, ...course });
        }
      } catch (err) {
        console.warn(`Could not create course ${course.courseCode}:`, err);
      }
    }

    return createdCourses;
  } catch (error) {
    console.error('Error creating sample courses:', error);
    throw error;
  }
};

// ========== QUIZ OPERATIONS ==========

/**
 * Get quizzes for a course
 */
export const getCourseQuizzes = async (courseId) => {
  try {
    const q = query(
      collection(db, 'quizzes'),
      where('courseId', '==', courseId),
      orderBy('dueDate', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    throw error
  }
}

/**
 * Submit quiz responses
 */
export const submitQuiz = async (studentId, quizId, answers, score) => {
  try {
    const docRef = await addDoc(collection(db, 'quizSubmissions'), {
      studentId,
      quizId,
      answers,
      score,
      submittedAt: serverTimestamp(),
      status: 'submitted'
    })
    return { id: docRef.id, studentId, quizId, answers, score }
  } catch (error) {
    console.error('Error submitting quiz:', error)
    throw error
  }
}

// ========== GRADE OPERATIONS ==========

/**
 * Get student grades
 */
export const getStudentGrades = async (userId) => {
  try {
    const q = query(
      collection(db, 'grades'),
      where('studentId', '==', userId),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching grades:', error)
    throw error
  }
}

// ========== ANNOUNCEMENT OPERATIONS ==========

/**
 * Get announcements for courses
 */
export const getCourseAnnouncements = async (courseId) => {
  try {
    const q = query(
      collection(db, 'announcements'),
      where('courseId', '==', courseId),
      orderBy('createdAt', 'desc'),
      limit(10)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching announcements:', error)
    throw error
  }
}

// ========== SCHEDULE OPERATIONS ==========

/**
 * Get schedule for student courses
 */
export const getStudentSchedule = async (userId) => {
  try {
    const studentProfile = await getStudentProfile(userId)
    if (!studentProfile) return []

    const enrolledCourses = studentProfile.enrolledCourses || []
    let allSchedules = []

    for (const courseId of enrolledCourses) {
      const q = query(
        collection(db, 'schedule'),
        where('courseId', '==', courseId),
        orderBy('dayOfWeek', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const schedules = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      allSchedules = [...allSchedules, ...schedules]
    }

    return allSchedules
  } catch (error) {
    console.error('Error fetching schedule:', error)
    throw error
  }
}

// ========== MESSAGING OPERATIONS ==========

/**
 * Get messages for a student
 */
export const getStudentMessages = async (userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}

/**
 * Send message
 */
export const sendMessage = async (senderId, recipientId, messageData) => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      senderId,
      recipientId,
      createdAt: serverTimestamp(),
      read: false,
      ...messageData
    })
    return { id: docRef.id, senderId, recipientId, ...messageData }
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

// ========== PROFILE OPERATIONS ==========

/**
 * Update student profile
 */
export const updateStudentProfile = async (userId, updates) => {
  try {
    const q = query(collection(db, 'students'), where('uid', '==', userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'students', querySnapshot.docs[0].id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    }

    // If no profile exists yet, create one on the fly (upsert)
    await createStudentProfile(userId, updates)
    return true
  } catch (error) {
    console.error('Error updating profile:', error)
    throw error
  }
}

// ========== FACULTY OPERATIONS ==========

/**
 * Create faculty profile
 */
export const createFacultyProfile = async (userId, facultyData) => {
  try {
    const docRef = await addDoc(collection(db, 'faculty'), {
      uid: userId,
      createdAt: serverTimestamp(),
      ...facultyData
    })
    return { id: docRef.id, ...facultyData }
  } catch (error) {
    console.error('Error creating faculty profile:', error)
    throw error
  }
}

/**
 * Get faculty profile by UID
 */
export const getFacultyProfile = async (userId) => {
  try {
    const q = query(collection(db, 'faculty'), where('uid', '==', userId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0]
      return { id: docSnap.id, ...docSnap.data(), uid: docSnap.data().uid || userId }
    }

    // Fallback: some datasets store UID as the document id
    const fallbackDoc = await getDoc(doc(db, 'faculty', userId))
    if (fallbackDoc.exists()) {
      return { id: fallbackDoc.id, ...fallbackDoc.data(), uid: fallbackDoc.data().uid || userId }
    }

    return null
  } catch (error) {
    console.error('Error fetching faculty profile:', error)
    throw error
  }
}

/**
 * Get faculty courses (with fallback to all courses if none found)
 */
export const getFacultyCourses = async (facultyId) => {
  try {
    // First try to get courses assigned to this faculty
    const q = query(
      collection(db, 'courses'),
      where('facultyId', '==', facultyId),
      orderBy('semester', 'desc')
    )
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }
    
    // If no faculty-specific courses, return all courses
    // This allows faculty to see and create assignments in any course
    const allCoursesQuery = query(collection(db, 'courses'), orderBy('semester', 'desc'))
    const allCoursesSnapshot = await getDocs(allCoursesQuery)
    
    return allCoursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching faculty courses:', error)
    // If query fails (e.g., no index), return empty array
    return []
  }
}

/**
 * Get all submissions for a course
 */
export const getCourseSubmissions = async (courseId) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('courseId', '==', courseId),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    // Enrich submissions with student name, assignment title, formatted date, and file URL
    const enriched = await Promise.all(querySnapshot.docs.map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }

      // Resolve student name - prefer stored name if it's not a document ID
      try {
        // If studentName is already stored and not a long hash/document ID, use it
        if (data.studentName && data.studentName.length < 50 && !data.studentName.match(/^[a-zA-Z0-9]{20,}$/)) {
          result.studentName = data.studentName
        } else if (data.studentId) {
          const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
          const studentSnap = await getDocs(studentQ)
          if (!studentSnap.empty) {
            const s = studentSnap.docs[0].data()
            result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : data.studentId)
          } else {
            result.studentName = data.studentName || 'Unknown Student'
          }
        } else {
          result.studentName = data.studentName || 'Unknown Student'
        }
      } catch (err) {
        console.warn('Could not resolve student name for submission:', docSnap.id, err)
        result.studentName = data.studentName || 'Unknown Student'
      }

      // Resolve assignment title
      try {
        if (data.assignmentId) {
          const assignmentQ = query(collection(db, 'assignments'), where('__name__', '==', data.assignmentId))
          const assignmentSnap = await getDocs(assignmentQ)
          if (!assignmentSnap.empty) {
            result.assignment = assignmentSnap.docs[0].data().title || assignmentSnap.docs[0].data().name || assignmentSnap.docs[0].data().title || assignmentSnap.docs[0].data().assignmentName || 'Assignment'
          } else {
            result.assignment = data.assignmentId
          }
        }
      } catch (err) {
        console.warn('Could not resolve assignment for submission:', docSnap.id, err)
        result.assignment = data.assignmentId || 'Unknown Assignment'
      }

      // Format submitted date
      try {
        const ts = data.submittedAt
        if (ts && typeof ts.toDate === 'function') {
          result.submittedDate = ts.toDate().toLocaleString()
        } else if (ts && ts.seconds) {
          result.submittedDate = new Date(ts.seconds * 1000).toLocaleString()
        } else if (ts) {
          result.submittedDate = new Date(ts).toLocaleString()
        } else {
          result.submittedDate = 'Unknown'
        }
      } catch (err) {
        result.submittedDate = 'Unknown'
      }

      // Resolve file URL: prefer fileUrl, otherwise try to get download URL from storagePath
      try {
        if (data.fileUrl) {
          result.fileURL = data.fileUrl
        } else if (data.storagePath) {
          try {
            result.fileURL = await getFileDownloadURL(data.storagePath)
          } catch (err) {
            console.warn('Could not resolve download URL for storagePath:', data.storagePath, err)
            result.fileURL = null
          }
        } else if (data.base64DataUrl) {
          // Provide inline preview for small base64 payloads
          result.fileURL = data.base64DataUrl
        } else {
          result.fileURL = null
        }
      } catch (err) {
        result.fileURL = null
      }

      return result
    }))

    return enriched
  } catch (error) {
    console.error('Error fetching course submissions:', error)
    throw error
  }
}

/**
 * Get all submissions across all courses (enriched)
 */
export const getAllSubmissions = async () => {
  try {
    const q = query(
      collection(db, 'submissions'),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const enriched = await Promise.all(querySnapshot.docs.map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }

      // Resolve student name - prefer stored name if it's not a document ID
      try {
        // If studentName is already stored and not a long hash/document ID, use it
        if (data.studentName && data.studentName.length < 50 && !data.studentName.match(/^[a-zA-Z0-9]{20,}$/)) {
          result.studentName = data.studentName
        } else if (data.studentId) {
          const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
          const studentSnap = await getDocs(studentQ)
          if (!studentSnap.empty) {
            const s = studentSnap.docs[0].data()
            result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : data.studentId)
          } else {
            result.studentName = data.studentName || 'Unknown Student'
          }
        } else {
          result.studentName = data.studentName || 'Unknown Student'
        }
      } catch (err) {
        result.studentName = data.studentName || 'Unknown Student'
      }

      // Resolve assignment title
      try {
        if (data.assignmentId) {
          const assignmentQ = query(collection(db, 'assignments'), where('__name__', '==', data.assignmentId))
          const assignmentSnap = await getDocs(assignmentQ)
          if (!assignmentSnap.empty) {
            result.assignment = assignmentSnap.docs[0].data().title || assignmentSnap.docs[0].data().name || 'Assignment'
          } else {
            result.assignment = data.assignmentId
          }
        }
      } catch (err) {
        result.assignment = data.assignmentId || 'Unknown Assignment'
      }

      // Format submitted date
      try {
        const ts = data.submittedAt
        if (ts && typeof ts.toDate === 'function') {
          result.submittedDate = ts.toDate().toLocaleString()
        } else if (ts && ts.seconds) {
          result.submittedDate = new Date(ts.seconds * 1000).toLocaleString()
        } else if (ts) {
          result.submittedDate = new Date(ts).toLocaleString()
        } else {
          result.submittedDate = 'Unknown'
        }
      } catch (err) {
        result.submittedDate = 'Unknown'
      }

      // Resolve file URL
      try {
        if (data.fileUrl) {
          result.fileURL = data.fileUrl
        } else if (data.storagePath) {
          try {
            result.fileURL = await getFileDownloadURL(data.storagePath)
          } catch (err) {
            result.fileURL = null
          }
        } else if (data.base64DataUrl) {
          result.fileURL = data.base64DataUrl
        } else {
          result.fileURL = null
        }
      } catch (err) {
        result.fileURL = null
      }

      return result
    }))

    return enriched
  } catch (error) {
    console.error('Error fetching all submissions:', error)
    throw error
  }
}

/**
 * Get pending submissions for grading
 */
export const getPendingSubmissions = async (courseId) => {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('courseId', '==', courseId),
      where('status', '==', 'submitted'),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    // Enrich similar to getCourseSubmissions
    const enriched = await Promise.all(querySnapshot.docs.map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }

      // Student name
      try {
        if (data.studentId) {
          const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
          const studentSnap = await getDocs(studentQ)
          if (!studentSnap.empty) {
            const s = studentSnap.docs[0].data()
            result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : data.studentId)
          } else {
            result.studentName = data.studentId
          }
        }
      } catch (err) {
        console.warn('Could not resolve student name for pending submission:', docSnap.id, err)
        result.studentName = data.studentId || 'Unknown'
      }

      // Assignment
      try {
        if (data.assignmentId) {
          const assignmentQ = query(collection(db, 'assignments'), where('__name__', '==', data.assignmentId))
          const assignmentSnap = await getDocs(assignmentQ)
          if (!assignmentSnap.empty) {
            result.assignment = assignmentSnap.docs[0].data().title || assignmentSnap.docs[0].data().name || 'Assignment'
          } else {
            result.assignment = data.assignmentId
          }
        }
      } catch (err) {
        console.warn('Could not resolve assignment for pending submission:', docSnap.id, err)
        result.assignment = data.assignmentId || 'Unknown Assignment'
      }

      // Submitted date
      try {
        const ts = data.submittedAt
        if (ts && typeof ts.toDate === 'function') {
          result.submittedDate = ts.toDate().toLocaleString()
        } else if (ts && ts.seconds) {
          result.submittedDate = new Date(ts.seconds * 1000).toLocaleString()
        } else if (ts) {
          result.submittedDate = new Date(ts).toLocaleString()
        } else {
          result.submittedDate = 'Unknown'
        }
      } catch (err) {
        result.submittedDate = 'Unknown'
      }

      // File URL/Base64
      try {
        if (data.fileUrl) {
          result.fileURL = data.fileUrl
        } else if (data.storagePath) {
          try {
            result.fileURL = await getFileDownloadURL(data.storagePath)
          } catch (err) {
            console.warn('Could not resolve download URL for storagePath:', data.storagePath, err)
            result.fileURL = null
          }
        } else if (data.base64DataUrl) {
          result.fileURL = data.base64DataUrl
        } else {
          result.fileURL = null
        }
      } catch (err) {
        result.fileURL = null
      }

      return result
    }))

    return enriched
  } catch (error) {
    console.error('Error fetching pending submissions:', error)
    throw error
  }
}

/**
 * Grade a submission
 */
export const gradeSubmission = async (submissionId, grade, feedback) => {
  try {
    const docRef = doc(db, 'submissions', submissionId)
    await updateDoc(docRef, {
      grade: grade,
      feedback: feedback,
      status: 'graded',
      gradedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error grading submission:', error)
    throw error
  }
}

/**
 * Create assignment
 */
export const createAssignment = async (courseId, assignmentData) => {
  try {
    console.log('🔵 createAssignment called')
    console.log('  courseId:', courseId)
    console.log('  assignmentData:', assignmentData)
    
    const dataToSave = {
      courseId,
      createdAt: serverTimestamp(),
      status: 'active',
      ...assignmentData
    }
    
    console.log('🟢 About to save to Firestore:', dataToSave)
    const docRef = await addDoc(collection(db, 'assignments'), dataToSave)
    console.log('✅ Assignment created successfully with ID:', docRef.id)
    
    return { id: docRef.id, ...assignmentData }
  } catch (error) {
    console.error('❌ Error creating assignment:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Full error:', error)
    throw error
  }
}

/**
 * Update assignment
 */
export const updateAssignment = async (assignmentId, updates) => {
  try {
    const docRef = doc(db, 'assignments', assignmentId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating assignment:', error)
    throw error
  }
}

/**
 * Delete assignment
 */
export const deleteAssignment = async (assignmentId) => {
  try {
    await deleteDoc(doc(db, 'assignments', assignmentId))
    return true
  } catch (error) {
    console.error('Error deleting assignment:', error)
    throw error
  }
}

/**
 * Create announcement
 */
export const createAnnouncement = async (courseId, announcementData) => {
  try {
    const docRef = await addDoc(collection(db, 'announcements'), {
      courseId,
      createdAt: serverTimestamp(),
      ...announcementData
    })
    return { id: docRef.id, ...announcementData }
  } catch (error) {
    console.error('Error creating announcement:', error)
    throw error
  }
}

/**
 * Update announcement
 */
export const updateAnnouncement = async (announcementId, updates) => {
  try {
    const docRef = doc(db, 'announcements', announcementId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating announcement:', error)
    throw error
  }
}

/**
 * Get course grades
 */
export const getCourseGrades = async (courseId) => {
  try {
    const q = query(
      collection(db, 'grades'),
      where('courseId', '==', courseId),
      orderBy('gradedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching course grades:', error)
    throw error
  }
}

/**
 * Record grade
 */
export const recordGrade = async (studentId, courseId, assignmentId, gradeData) => {
  try {
    const docRef = await addDoc(collection(db, 'grades'), {
      studentId,
      courseId,
      assignmentId,
      gradedAt: serverTimestamp(),
      ...gradeData
    })
    return { id: docRef.id, ...gradeData }
  } catch (error) {
    console.error('Error recording grade:', error)
    throw error
  }
}

/**
 * Get course students
 */
export const getCourseStudents = async (courseId) => {
  try {
    const courseQ = query(collection(db, 'courses'), where('__name__', '==', courseId))
    const courseDocs = await getDocs(courseQ)
    
    if (!courseDocs.empty) {
      const courseData = courseDocs.docs[0].data()
      const enrolledStudents = courseData.enrolledStudents || []
      
      const students = []
      for (const studentId of enrolledStudents) {
        const studentQ = query(collection(db, 'students'), where('uid', '==', studentId))
        const studentDocs = await getDocs(studentQ)
        if (!studentDocs.empty) {
          students.push({
            id: studentDocs.docs[0].id,
            ...studentDocs.docs[0].data()
          })
        }
      }
      return students
    }
    return []
  } catch (error) {
    console.error('Error fetching course students:', error)
    throw error
  }
}

/**
 * Create quiz
 */
export const createQuiz = async (courseId, quizData) => {
  try {
    const docRef = await addDoc(collection(db, 'quizzes'), {
      courseId,
      createdAt: serverTimestamp(),
      status: 'active',
      ...quizData
    })
    return { id: docRef.id, ...quizData }
  } catch (error) {
    console.error('Error creating quiz:', error)
    throw error
  }
}

/**
 * Update quiz
 */
export const updateQuiz = async (quizId, updates) => {
  try {
    const docRef = doc(db, 'quizzes', quizId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating quiz:', error)
    throw error
  }
}

/**
 * Get quiz submissions
 */
export const getQuizSubmissions = async (quizId) => {
  try {
    const q = query(
      collection(db, 'quizSubmissions'),
      where('quizId', '==', quizId),
      orderBy('submittedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching quiz submissions:', error)
    throw error
  }
}

/**
 * Grade quiz submission
 */
export const gradeQuizSubmission = async (quizSubmissionId, score, feedback) => {
  try {
    const docRef = doc(db, 'quizSubmissions', quizSubmissionId)
    await updateDoc(docRef, {
      score: score,
      feedback: feedback,
      status: 'graded',
      gradedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error grading quiz submission:', error)
    throw error
  }
}

/**
 * Create course
 */
export const createCourse = async (facultyId, courseData) => {
  try {
    const docRef = await addDoc(collection(db, 'courses'), {
      facultyId,
      enrolledStudents: [],
      createdAt: serverTimestamp(),
      status: 'active',
      ...courseData
    })
    return { id: docRef.id, ...courseData }
  } catch (error) {
    console.error('Error creating course:', error)
    throw error
  }
}

/**
 * Create a small sample submission for testing (can be base64 or storage-less)
 * Returns the created submission document data
 */
export const createSampleSubmission = async (courseId, assignmentId, studentInfo = {}, useBase64 = true) => {
  try {
    const sample = {
      studentId: studentInfo.uid || studentInfo.studentId || 'demo_student',
      studentName: studentInfo.name || `${studentInfo.firstName || 'Demo'} ${studentInfo.lastName || 'Student'}`.trim(),
      studentEmail: studentInfo.email || 'demo@student.example',
      assignmentId: assignmentId || 'demo-assignment-1',
      courseId: courseId || null,
      fileName: useBase64 ? 'sample.txt' : null,
      submittedAt: serverTimestamp(),
      status: 'submitted',
      grade: null
    }

    if (useBase64) {
      // tiny base64 text payload
      sample.base64DataUrl = 'data:text/plain;base64,' + btoa('This is a sample submission for testing.')
      sample.fileSize = 64
      sample.fileType = 'text/plain'
    }

    const docRef = await addDoc(collection(db, 'submissions'), sample)
    return { id: docRef.id, ...sample }
  } catch (error) {
    console.error('Error creating sample submission:', error)
    throw error
  }
}

/**
 * Update course
 */
export const updateCourse = async (courseId, updates) => {
  try {
    const docRef = doc(db, 'courses', courseId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    return true
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

/**
 * Enroll student in course
 */
export const enrollStudentInCourse = async (courseId, studentUid) => {
  try {
    const docRef = doc(db, 'courses', courseId)
    await updateDoc(docRef, {
      enrolledStudents: arrayUnion(studentUid)
    })
    return true
  } catch (error) {
    console.error('Error enrolling student:', error)
    throw error
  }
}

/**
 * Remove student from course
 */
export const removeStudentFromCourse = async (courseId, studentUid) => {
  try {
    const docRef = doc(db, 'courses', courseId)
    await updateDoc(docRef, {
      enrolledStudents: arrayRemove(studentUid)
    })
    return true
  } catch (error) {
    console.error('Error removing student:', error)
    throw error
  }
}

/**
 * Update faculty profile
 */
export const updateFacultyProfile = async (userId, updates) => {
  try {
    const q = query(collection(db, 'faculty'), where('uid', '==', userId))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'faculty', querySnapshot.docs[0].id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    }

    // If no profile exists, create one on the fly (upsert)
    await createFacultyProfile(userId, updates)
    return true
  } catch (error) {
    console.error('Error updating faculty profile:', error)
    throw error
  }
}

/**
 * Get course materials
 */
export const getCourseMaterials = async (courseId) => {
  try {
    const q = query(
      collection(db, 'materials'),
      where('courseId', '==', courseId),
      orderBy('uploadedAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching course materials:', error)
    throw error
  }
}

/**
 * Upload course material
 */
export const uploadCourseMaterial = async (courseId, materialData) => {
  try {
    const docRef = await addDoc(collection(db, 'materials'), {
      courseId,
      uploadedAt: serverTimestamp(),
      ...materialData
    })
    return { id: docRef.id, ...materialData }
  } catch (error) {
    console.error('Error uploading material:', error)
    throw error
  }
}
