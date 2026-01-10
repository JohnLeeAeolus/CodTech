// Firestore helper functions for the LMS
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDocsFromServer,
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
  arrayRemove,
  onSnapshot
} from 'firebase/firestore'
import { db, storage, auth } from '../firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

// ========== USER / ROLE (CANONICAL) ==========

/**
 * Canonical user document path:
 *   /users/{uid} => { uid, email, role: 'student'|'faculty', createdAt, updatedAt }
 */
export const getUserDoc = async (uid) => {
  if (!uid) return null
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  } catch (error) {
    console.error('Error fetching user doc:', error)
    return null
  }
}

export const ensureUserDoc = async (uid, data) => {
  if (!uid) throw new Error('ensureUserDoc: uid is required')
  try {
    const ref = doc(db, 'users', uid)
    const existing = await getDoc(ref)
    if (existing.exists()) {
      // Non-destructive update: keep existing role unless explicitly provided
      const patch = {
        ...data,
        uid,
        updatedAt: serverTimestamp()
      }
      if (!data?.role) delete patch.role
      await setDoc(ref, patch, { merge: true })
      return { id: uid, ...(existing.data() || {}), ...(data || {}) }
    }
    await setDoc(ref, {
      uid,
      email: data?.email || null,
      role: data?.role || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...data
    }, { merge: true })
    return { id: uid, ...(data || {}) }
  } catch (error) {
    console.error('Error ensuring user doc:', error)
    throw error
  }
}

/**
 * Resolve the user's role from the canonical doc. If missing, infer from legacy
 * /students or /faculty profiles and backfill /users/{uid}.
 */
export const getOrInferUserRole = async (uid, emailHint = null) => {
  if (!uid) return null

  const userDoc = await getUserDoc(uid)
  const existingRole = userDoc?.role
  if (existingRole === 'student' || existingRole === 'faculty') return existingRole

  // Infer from profiles
  let inferredRole = null
  try {
    const faculty = await getFacultyProfile(uid)
    if (faculty) inferredRole = 'faculty'
  } catch (e) {
    // ignore
  }

  if (!inferredRole) {
    try {
      const student = await getStudentProfile(uid)
      if (student) inferredRole = 'student'
    } catch (e) {
      // ignore
    }
  }

  if (inferredRole) {
    try {
      await ensureUserDoc(uid, { email: emailHint || userDoc?.email || null, role: inferredRole })
    } catch (e) {
      console.warn('Could not backfill users/{uid} role:', e)
    }
  }

  return inferredRole
}

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
    const inferredEmail = (studentData?.email || '').toString().trim() || null
    const inferredName = (studentData?.name || '').toString().trim() || (inferredEmail ? inferredEmail.split('@')[0] : null)

    // Create student profile using the UID as the document ID so security rules
    // that check for /students/{uid} exist() will work.
    const docRef = doc(db, 'students', userId)
    await setDoc(docRef, {
      uid: userId,
      enrolledCourses: [],
      createdAt: serverTimestamp(),
      ...studentData,
      // Ensure we store at least a usable display name.
      name: inferredName,
      email: inferredEmail
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
export const createEnrollment = async (studentUid, courseId, meta = {}) => {
  try {
    let studentEmail = (meta.studentEmail || meta.email || '').toString().trim() || null
    let studentName = (meta.studentName || meta.name || '').toString().trim() || null

    // If name isn't provided (common when displayName is empty), try reading the
    // student's own profile doc (allowed by rules) to get a real name.
    if (!studentName) {
      try {
        const profile = await getStudentProfile(studentUid)
        const fromProfile = (profile?.name || profile?.fullName || '').toString().trim()
        if (fromProfile) studentName = fromProfile
        if (!studentEmail) {
          const fromProfileEmail = (profile?.email || '').toString().trim()
          if (fromProfileEmail) studentEmail = fromProfileEmail
        }
      } catch {
        // ignore
      }
    }

    // Final fallback: derive a stable label from email.
    if (!studentName && studentEmail) {
      studentName = studentEmail.split('@')[0]
    }

    const docRef = await addDoc(collection(db, 'enrollments'), {
      studentId: studentUid,
      courseId,
      studentName,
      studentEmail,
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
 * Get enrolled students for a course (faculty-owned courses only, per rules).
 * Returns array of enrollment docs: {id, studentId, studentName?, studentEmail?, createdAt?}
 */
export const getCourseEnrollments = async (courseId) => {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'enrolled')
    )
    // Use a server fetch to avoid Firestore Web SDK internal assertion bugs
    // that can happen with watch-stream based paths in some dev setups.
    let snap
    try {
      snap = await getDocsFromServer(q)
    } catch (serverErr) {
      // Fallback to normal getDocs (may use cache/watch internally)
      snap = await getDocs(q)
    }

    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ad = a.createdAt && typeof a.createdAt === 'object' && a.createdAt.toDate ? a.createdAt.toDate() : null
        const bd = b.createdAt && typeof b.createdAt === 'object' && b.createdAt.toDate ? b.createdAt.toDate() : null
        if (ad && bd) return ad.getTime() - bd.getTime()
        if (ad) return -1
        if (bd) return 1
        return 0
      })
  } catch (error) {
    // Don't hard-crash the UI on SDK internal assertion issues.
    const code = error?.code || null
    const message = (error?.message || '').toString()
    if (code === 'permission-denied' || message.toLowerCase().includes('insufficient permissions')) {
      console.warn('getCourseEnrollments: permission denied for course', courseId)
      return []
    }
    console.error('Error fetching course enrollments:', courseId, error)
    return []
  }
}

// Backfill missing studentName fields for legacy enrollment docs.
// Intended to be run by faculty for courses they own (rules already restrict reads).
// Uses email prefix as the final fallback to avoid cross-collection reads.
export const backfillEnrollmentNamesForCourse = async (courseId) => {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'enrolled')
    )

    let snapshot
    try {
      // Prefer server to avoid stale/cached weirdness.
      snapshot = await getDocs(q)
    } catch {
      snapshot = await getDocs(q)
    }

    const updates = []
    snapshot.forEach((d) => {
      const data = d.data() || {}
      const currentName = (data.studentName || '').toString().trim()
      const currentEmail = (data.studentEmail || '').toString().trim()
      if (currentName) return
      if (!currentEmail) return
      const inferredName = currentEmail.split('@')[0]
      if (!inferredName) return
      updates.push({ id: d.id, inferredName })
    })

    if (updates.length === 0) return { updated: 0 }

    const batch = writeBatch(db)
    updates.forEach(({ id, inferredName }) => {
      batch.update(doc(db, 'enrollments', id), {
        studentName: inferredName,
        updatedAt: serverTimestamp()
      })
    })
    await batch.commit()
    return { updated: updates.length }
  } catch (error) {
    console.error('Error backfilling enrollment names:', error)
    return { updated: 0, error: error?.message || String(error) }
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
    // Try to get all courses without ordering first (courses might not have courseName field)
    const q = query(collection(db, 'courses'))
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
    // Return empty array on error instead of throwing, so UI can still show local courses
    return []
  }
}

/**
 * Enroll student in a course
 */
export const enrollInCourse = async (userId, courseId) => {
  try {
    const studentRef = doc(db, 'students', userId)
    // First ensure student document exists
    const studentDoc = await getDoc(studentRef)
    if (!studentDoc.exists()) {
      // Create student doc if it doesn't exist
      await setDoc(studentRef, {
        uid: userId,
        enrolledCourses: [courseId],
        createdAt: serverTimestamp()
      })
    } else {
      // Update existing student doc
      await updateDoc(studentRef, {
        enrolledCourses: arrayUnion(courseId)
      })
    }
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
    const studentDoc = await getDoc(studentRef)
    if (studentDoc.exists()) {
      // Only update if document exists
      await updateDoc(studentRef, {
        enrolledCourses: arrayRemove(courseId)
      })
    }
    // If doc doesn't exist, that's okay - they weren't enrolled anyway
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
    if (!studentProfile) {
      // Fallback for brand-new/missing profiles: show all available work
      return await getAllAssignments()
    }

    const enrolledCourses = studentProfile.enrolledCourses || []
    if (!enrolledCourses || enrolledCourses.length === 0) {
      // Student isn't enrolled anywhere yet — still show all assignments so they
      // don't need a faculty account to "prime" the data.
      return await getAllAssignments()
    }
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
      const assignments = querySnapshot.docs.map(doc => {
        const assignmentData = doc.data()
        
        // Normalize dueDate to ISO string (matches getAllAssignments behavior)
        let dueDate = assignmentData.dueDate
        if (dueDate && typeof dueDate === 'object' && dueDate.toDate) {
          // Firestore Timestamp
          dueDate = dueDate.toDate().toISOString()
        } else if (dueDate && typeof dueDate !== 'string') {
          // Try to convert to ISO string
          dueDate = new Date(dueDate).toISOString()
        }
        
        return {
          id: doc.id,
          ...assignmentData,
          courseName: assignmentData.courseName || assignmentData.course || courseName,
          dueDate: dueDate
        }
      })
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
    if (!studentProfile) {
      // Fallback for brand-new/missing profiles
      return await getAllQuizzes()
    }

    const enrolledCourses = studentProfile.enrolledCourses || []
    if (!enrolledCourses || enrolledCourses.length === 0) {
      // Not enrolled yet — still allow discovery of quizzes
      return await getAllQuizzes()
    }
    let allQuizzes = []

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
        collection(db, 'quizzes'),
        where('courseId', '==', courseId),
        orderBy('dueDate', 'asc')
      )
      const querySnapshot = await getDocs(q)
      const quizzes = querySnapshot.docs.map(doc => {
        const quizData = doc.data()
        
        // Normalize dueDate to ISO string (matches getAllAssignments behavior)
        let dueDate = quizData.dueDate
        if (dueDate && typeof dueDate === 'object' && dueDate.toDate) {
          // Firestore Timestamp
          dueDate = dueDate.toDate().toISOString()
        } else if (dueDate && typeof dueDate !== 'string') {
          // Try to convert to ISO string
          dueDate = new Date(dueDate).toISOString()
        }
        
        return {
          id: doc.id,
          ...quizData,
          courseName: quizData.courseName || quizData.course || courseName,
          dueDate: dueDate,
          type: 'quiz'
        }
      })
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

    // Build courseId -> readable name map once
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
            const courseId = assignmentData.courseId || data.courseId || null
            const mappedCourse = courseId ? courseNameById.get(String(courseId)) : null
            const resolvedCourse = mappedCourse
              || assignmentData.courseName
              || assignmentData.course
              || data.courseName
              || data.course
              || 'Unknown Course'

            result.courseId = courseId
            result.courseName = resolvedCourse
            result.course = resolvedCourse
            result.dueDate = assignmentData.dueDate || null
          } else {
            result.assignment = data.assignmentId
            const courseId = data.courseId || null
            const mappedCourse = courseId ? courseNameById.get(String(courseId)) : null
            const resolvedCourse = mappedCourse || data.courseName || data.course || 'Unknown Course'
            result.courseId = courseId
            result.courseName = resolvedCourse
            result.course = resolvedCourse
          }
        }
      } catch (err) {
        console.warn('Could not resolve assignment:', data.assignmentId, err)
        result.assignment = data.assignmentId || 'Unknown Assignment'
        const courseId = data.courseId || null
        const mappedCourse = courseId ? courseNameById.get(String(courseId)) : null
        const resolvedCourse = mappedCourse || data.courseName || data.course || 'Unknown Course'
        result.courseId = courseId
        result.courseName = resolvedCourse
        result.course = resolvedCourse
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
 * Get quiz by ID
 */
export const getQuiz = async (quizId) => {
  try {
    const q = query(collection(db, 'quizzes'), where('__name__', '==', quizId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    }
    return null
  } catch (error) {
    console.error('Error fetching quiz:', error)
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
        let courseName = assignmentData.courseName || assignmentData.course || 'Unknown Course'
        
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
          ...assignmentData,
          courseName: courseName,
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

/**
 * Get assignments for the currently signed-in faculty.
 *
 * This is used by faculty-facing screens to avoid loading assignments owned by
 * other faculty (which would cause permission-denied on update/delete).
 *
 * If `courseIds` is provided, it will also include assignments for those courses
 * (useful for legacy docs that may be missing `facultyId`).
 */
export const getFacultyAssignments = async (courseIds = null) => {
  try {
    const facultyId = auth.currentUser?.uid || null
    if (!facultyId) return []

    const resultsById = new Map()

    // Primary: by facultyId
    try {
      const qByFaculty = query(collection(db, 'assignments'), where('facultyId', '==', facultyId))
      const snap = await getDocs(qByFaculty)
      snap.docs.forEach((d) => resultsById.set(d.id, { id: d.id, ...d.data() }))
    } catch (e) {
      console.warn('getFacultyAssignments: facultyId query failed:', e)
    }

    // Secondary: include assignments for owned courses (legacy fallback)
    if (Array.isArray(courseIds) && courseIds.length > 0) {
      const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)))
      const batches = []
      for (let i = 0; i < uniqueCourseIds.length; i += 10) {
        batches.push(uniqueCourseIds.slice(i, i + 10))
      }

      for (const batch of batches) {
        try {
          const qByCourse = query(collection(db, 'assignments'), where('courseId', 'in', batch))
          const snap = await getDocs(qByCourse)
          snap.docs.forEach((d) => resultsById.set(d.id, { id: d.id, ...d.data() }))
        } catch (e) {
          console.warn('getFacultyAssignments: courseId batch query failed:', batch, e)
        }
      }
    }

    const results = Array.from(resultsById.values())
    results.sort((a, b) => {
      const ad = a?.dueDate ? new Date(a.dueDate).getTime() : 0
      const bd = b?.dueDate ? new Date(b.dueDate).getTime() : 0
      return bd - ad
    })
    return results
  } catch (error) {
    console.error('Error fetching faculty assignments:', error)
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
    const facultyId = auth.currentUser?.uid || null
    if (!facultyId) {
      throw new Error('You must be logged in to seed courses.')
    }
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
            facultyId,
            enrolledStudents: [],
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
      where('courseId', '==', courseId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return [] // Return empty array instead of throwing
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
    // Use UID as doc id (matches student profile pattern and rules expectations)
    const ref = doc(db, 'faculty', userId)
    await setDoc(ref, {
      uid: userId,
      createdAt: serverTimestamp(),
      ...facultyData
    }, { merge: true })
    return { id: userId, ...facultyData }
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
      // If the found document uses a legacy random id (not the UID), ensure a
      // document exists at /faculty/{uid} so rules and code paths can rely on it.
      if (docSnap.id !== userId) {
        const uidRef = doc(db, 'faculty', userId)
        const uidDoc = await getDoc(uidRef)
        if (!uidDoc.exists()) {
          try {
            await setDoc(uidRef, {
              uid: userId,
              createdAt: serverTimestamp(),
              name: docSnap.data().name || null,
              email: docSnap.data().email || null,
              migratedFrom: docSnap.id
            }, { merge: true })
          } catch (err) {
            console.warn('Could not create UID-based faculty doc for migration:', err)
          }
        }
      }
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
    // IMPORTANT: avoid `orderBy()` here to prevent composite-index requirements.
    // We'll sort client-side instead.
    const candidateOwnerFields = ['facultyId', 'facultyUid', 'instructorId', 'ownerId', 'createdBy']

    for (const fieldName of candidateOwnerFields) {
      try {
        const q = query(collection(db, 'courses'), where(fieldName, '==', facultyId))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          // Best-effort sorting: semester (desc) then course name
          rows.sort((a, b) => {
            const as = (a.semester ?? '').toString()
            const bs = (b.semester ?? '').toString()
            if (as !== bs) return bs.localeCompare(as)
            const an = (a.courseName ?? a.name ?? a.title ?? a.code ?? '').toString()
            const bn = (b.courseName ?? b.name ?? b.title ?? b.code ?? '').toString()
            return an.localeCompare(bn)
          })
          return rows
        }
      } catch (innerError) {
        // Ignore and try the next field.
        console.warn(`getFacultyCourses: query failed for field ${fieldName}`, innerError)
      }
    }

    // Fallback: if the dataset doesn't assign courses per-faculty, return all courses
    // so the faculty UI (course list + create-activity modal) isn't empty.
    const allSnap = await getDocs(query(collection(db, 'courses')))
    const allRows = allSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    allRows.sort((a, b) => {
      const an = (a.courseName ?? a.name ?? a.title ?? a.code ?? '').toString()
      const bn = (b.courseName ?? b.name ?? b.title ?? b.code ?? '').toString()
      return an.localeCompare(bn)
    })
    return allRows
  } catch (error) {
    console.error('Error fetching faculty courses:', error)
    // If query fails (e.g., no index), return empty array
    return []
  }
}

/**
 * Claim all unowned courses (where facultyId is null/missing) for a faculty.
 * This requires Firestore rules to allow setting facultyId on previously-unowned courses.
 */
export const claimUnownedCourses = async (facultyId) => {
  if (!facultyId) return 0
  try {
    // Querying `where('facultyId','==',null)` won't match documents where the field
    // is missing in some environments. Instead, scan all courses and claim the
    // ones that are unowned (missing/null/empty).
    const snap = await getDocs(query(collection(db, 'courses')))
    if (snap.empty) return 0

    let updated = 0
    let permissionDenied = false
    for (const d of snap.docs) {
      const data = d.data() || {}
      const existingOwner = (data.facultyId ?? null)
      const isUnowned = existingOwner == null || (typeof existingOwner === 'string' && existingOwner.trim() === '')
      if (!isUnowned) continue
      try {
        await updateDoc(doc(db, 'courses', d.id), {
          facultyId,
          updatedAt: serverTimestamp()
        })
        updated++
      } catch (e) {
        const code = e?.code || null
        const message = (e?.message || '').toString()
        if (code === 'permission-denied' || message.toLowerCase().includes('insufficient permissions')) {
          permissionDenied = true
          break
        }
        console.warn('claimUnownedCourses: could not claim course', d.id, e)
      }
    }

    if (permissionDenied) {
      console.warn('claimUnownedCourses: permission denied (rules not deployed or not allowed); skipping further claims')
    }
    return updated
  } catch (error) {
    console.error('claimUnownedCourses: failed', error)
    return 0
  }
}

/**
 * Get actual enrolled students count for a course
 */
export const getCourseEnrolledStudents = async (courseId) => {
  try {
    // Prefer `enrollments` collection (works with real-time listeners and avoids
    // requiring faculty to read all student profile documents).
    const q = query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'enrolled')
    )
    const snap = await getDocs(q)
    return snap.size
  } catch (error) {
    // If the current user cannot read enrollments for this course (common when
    // faculty is not the course owner), fall back to course-side fields.
    try {
      const courseSnap = await getDoc(doc(db, 'courses', courseId))
      if (courseSnap.exists()) {
        const data = courseSnap.data() || {}
        if (typeof data.students === 'number') return data.students
        if (Array.isArray(data.enrolledStudents)) return data.enrolledStudents.length
      }
    } catch (fallbackError) {
      console.warn('Fallback course enrollment count failed for course:', courseId, fallbackError)
    }

    console.error('Error fetching enrolled students for course:', courseId, error)
    return 0
  }
}

/**
 * Get all submissions for a course
 */
export const getCourseSubmissions = async (courseId) => {
  try {
    let docSnaps = []
    let courseQueryError = null

    try {
      const q = query(
        collection(db, 'submissions'),
        where('courseId', '==', courseId)
      )
      const querySnapshot = await getDocs(q)
      docSnaps = querySnapshot.docs
      // Sort client-side to avoid composite index requirements.
      docSnaps.sort((a, b) => {
        const ta = a.data()?.submittedAt
        const tb = b.data()?.submittedAt
        const da = ta && typeof ta.toDate === 'function' ? ta.toDate() : (ta?.seconds ? new Date(ta.seconds * 1000) : (ta ? new Date(ta) : new Date(0)))
        const dbb = tb && typeof tb.toDate === 'function' ? tb.toDate() : (tb?.seconds ? new Date(tb.seconds * 1000) : (tb ? new Date(tb) : new Date(0)))
        return dbb - da
      })
    } catch (err) {
      courseQueryError = err
      console.warn('getCourseSubmissions: courseId query failed, will try fallback:', err)
    }

    // Fallback: derive submissions by assignmentId for this course.
    // This recovers legacy submissions where courseId was saved incorrectly.
    if (!docSnaps || docSnaps.length === 0) {
      try {
        const aSnap = await getDocs(query(collection(db, 'assignments'), where('courseId', '==', courseId)))
        const assignmentIds = aSnap.docs.map(d => d.id)

        if (assignmentIds.length > 0) {
          const chunks = []
          const chunkSize = 10
          for (let i = 0; i < assignmentIds.length; i += chunkSize) {
            chunks.push(assignmentIds.slice(i, i + chunkSize))
          }

          const all = []
          for (const ids of chunks) {
            const sSnap = await getDocs(query(collection(db, 'submissions'), where('assignmentId', 'in', ids)))
            all.push(...sSnap.docs)
          }

          docSnaps = all
          // Sort newest first (best effort)
          docSnaps.sort((a, b) => {
            const ta = a.data()?.submittedAt
            const tb = b.data()?.submittedAt
            const da = ta && typeof ta.toDate === 'function' ? ta.toDate() : (ta?.seconds ? new Date(ta.seconds * 1000) : (ta ? new Date(ta) : new Date(0)))
            const dbb = tb && typeof tb.toDate === 'function' ? tb.toDate() : (tb?.seconds ? new Date(tb.seconds * 1000) : (tb ? new Date(tb) : new Date(0)))
            return dbb - da
          })
        }
      } catch (fallbackErr) {
        console.warn('getCourseSubmissions: fallback by assignmentId failed:', fallbackErr)
        if (courseQueryError) throw courseQueryError
        throw fallbackErr
      }
    }

    // Enrich submissions with student name, assignment title, formatted date, and file URL
    const enriched = await Promise.all((docSnaps || []).map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }
      result.source = 'submissions'

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
            // Fallback 1: /users/{uid}
            try {
              const userDoc = await getDoc(doc(db, 'users', data.studentId))
              if (userDoc.exists()) {
                const u = userDoc.data() || {}
                result.studentName = u.name || u.displayName || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
              } else {
                // Fallback 2: /students/{uid}
                const sDoc = await getDoc(doc(db, 'students', data.studentId))
                if (sDoc.exists()) {
                  const s = sDoc.data() || {}
                  result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
                } else {
                  result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
                }
              }
            } catch (fallbackErr) {
              result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
            }
          }
        } else {
          result.studentName = data.studentName || 'Unknown Student'
        }
      } catch (err) {
        console.warn('Could not resolve student name for submission:', docSnap.id, err)
        result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
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

      // Normalize answers payload for question-based activities (quiz/seatwork).
      // Some older data stores answers as an object instead of an array.
      try {
        const rawAnswers =
          data.answers ??
          data.responses ??
          data.submittedAnswers ??
          data.quizAnswers ??
          null

        if (Array.isArray(rawAnswers)) {
          result.answers = rawAnswers
        } else if (rawAnswers && typeof rawAnswers === 'object') {
          result.answers = Object.entries(rawAnswers).map(([questionId, answer]) => ({
            questionId,
            kind: null,
            answer
          }))
        }
      } catch (e) {
        // ignore
      }

      return result
    }))

    // Also include quizSubmissions for quizzes in this course (legacy / alternate flow).
    // These can carry the actual answers even when assignments-based submissions are not used.
    let quizEnriched = []
    try {
      const quizSnap = await getDocs(query(collection(db, 'quizzes'), where('courseId', '==', courseId)))
      const quizIds = quizSnap.docs.map(d => d.id)
      const quizTitleById = new Map(
        quizSnap.docs.map(d => {
          const qd = d.data() || {}
          return [d.id, qd.title || qd.name || 'Quiz']
        })
      )

      if (quizIds.length > 0) {
        const chunks = []
        const chunkSize = 10
        for (let i = 0; i < quizIds.length; i += chunkSize) chunks.push(quizIds.slice(i, i + chunkSize))

        const allQuizDocs = []
        for (const ids of chunks) {
          const sSnap = await getDocs(query(collection(db, 'quizSubmissions'), where('quizId', 'in', ids)))
          allQuizDocs.push(...sSnap.docs)
        }

        quizEnriched = await Promise.all(allQuizDocs.map(async (docSnap) => {
          const data = docSnap.data() || {}
          const result = { id: docSnap.id, ...data }
          result.source = 'quizSubmissions'
          result.courseId = courseId
          result.assignmentId = null
          result.assignment = quizTitleById.get(data.quizId) || 'Quiz'

          // Map score->grade so existing faculty UI shows it consistently.
          if (result.grade == null && result.score != null) result.grade = result.score

          // Normalize answers
          try {
            const rawAnswers =
              data.answers ??
              data.responses ??
              data.submittedAnswers ??
              data.quizAnswers ??
              null

            if (Array.isArray(rawAnswers)) {
              result.answers = rawAnswers
            } else if (rawAnswers && typeof rawAnswers === 'object') {
              result.answers = Object.entries(rawAnswers).map(([questionId, answer]) => ({
                questionId,
                kind: null,
                answer
              }))
            }
          } catch (e) {
            // ignore
          }

          // Resolve student name
          try {
            if (data.studentName && data.studentName.length < 50 && !data.studentName.match(/^[a-zA-Z0-9]{20,}$/)) {
              result.studentName = data.studentName
            } else if (data.studentId) {
              const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
              const studentSnap = await getDocs(studentQ)
              if (!studentSnap.empty) {
                const s = studentSnap.docs[0].data()
                result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : data.studentId)
              } else {
                try {
                  const userDoc = await getDoc(doc(db, 'users', data.studentId))
                  if (userDoc.exists()) {
                    const u = userDoc.data() || {}
                    result.studentName = u.name || u.displayName || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
                  } else {
                    const sDoc = await getDoc(doc(db, 'students', data.studentId))
                    if (sDoc.exists()) {
                      const s = sDoc.data() || {}
                      result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
                    } else {
                      result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
                    }
                  }
                } catch (e) {
                  result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
                }
              }
            } else {
              result.studentName = data.studentName || 'Unknown Student'
            }
          } catch (e) {
            result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
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
          } catch (e) {
            result.submittedDate = 'Unknown'
          }

          result.fileURL = null
          return result
        }))
      }
    } catch (e) {
      // If rules deny quiz submissions or dataset doesn't use them, keep working with assignment submissions.
      console.warn('getCourseSubmissions: could not load quizSubmissions for course', courseId, e)
    }

    const combined = [...(enriched || []), ...(quizEnriched || [])]
    combined.sort((a, b) => {
      const ta = a?.submittedAt
      const tb = b?.submittedAt
      const da = ta && typeof ta.toDate === 'function' ? ta.toDate() : (ta?.seconds ? new Date(ta.seconds * 1000) : (ta ? new Date(ta) : new Date(0)))
      const dbb = tb && typeof tb.toDate === 'function' ? tb.toDate() : (tb?.seconds ? new Date(tb.seconds * 1000) : (tb ? new Date(tb) : new Date(0)))
      return dbb - da
    })

    return combined
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
            try {
              const userDoc = await getDoc(doc(db, 'users', data.studentId))
              if (userDoc.exists()) {
                const u = userDoc.data() || {}
                result.studentName = u.name || u.displayName || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
              } else {
                const sDoc = await getDoc(doc(db, 'students', data.studentId))
                if (sDoc.exists()) {
                  const s = sDoc.data() || {}
                  result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : null) || data.studentName || data.studentEmail || 'Unknown Student'
                } else {
                  result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
                }
              }
            } catch (fallbackErr) {
              result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
            }
          }
        } else {
          result.studentName = data.studentName || 'Unknown Student'
        }
      } catch (err) {
        result.studentName = data.studentName || data.studentEmail || 'Unknown Student'
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
    let querySnapshot = null

    // Preferred (newest first). This can require a composite index.
    try {
      const q = query(
        collection(db, 'submissions'),
        where('courseId', '==', courseId),
        where('status', '==', 'submitted'),
        orderBy('submittedAt', 'desc')
      )
      querySnapshot = await getDocs(q)
    } catch (err) {
      console.warn('getPendingSubmissions: ordered query failed, trying without orderBy:', err)
    }

    // Fallback: same filters, no ordering (usually avoids index requirement).
    if (!querySnapshot) {
      try {
        const q = query(
          collection(db, 'submissions'),
          where('courseId', '==', courseId),
          where('status', '==', 'submitted')
        )
        querySnapshot = await getDocs(q)
      } catch (err) {
        console.warn('getPendingSubmissions: filtered query failed, trying courseId-only + client filter:', err)
      }
    }

    // Last-resort: courseId-only then filter client-side.
    if (!querySnapshot) {
      const q = query(
        collection(db, 'submissions'),
        where('courseId', '==', courseId)
      )
      const snap = await getDocs(q)
      // Create a fake snapshot-like object so downstream code can stay the same.
      querySnapshot = {
        docs: snap.docs.filter((d) => {
          const status = (d.data()?.status || '').toString().toLowerCase()
          return status === 'submitted'
        })
      }
    }

    // Enrich similar to getCourseSubmissions
    const enriched = await Promise.all(querySnapshot.docs.map(async docSnap => {
      const data = docSnap.data()
      const result = { id: docSnap.id, ...data }
      if (!result.courseId) result.courseId = courseId

      // Student name
      try {
        const looksLikeId = (v) => {
          const s = (v || '').toString()
          if (!s) return false
          // Firestore doc IDs/UIDs are often long base62-like strings.
          return s.length >= 18 && /^[a-zA-Z0-9]+$/.test(s)
        }

        // Prefer stored studentName if it doesn't look like an ID.
        if (data.studentName && !looksLikeId(data.studentName)) {
          result.studentName = data.studentName
        } else if (data.studentId) {
          // Try students collection (uid field)
          try {
            const studentQ = query(collection(db, 'students'), where('uid', '==', data.studentId))
            const studentSnap = await getDocs(studentQ)
            if (!studentSnap.empty) {
              const s = studentSnap.docs[0].data() || {}
              result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : null)
              result.studentEmail = result.studentEmail || s.email || null
            }
          } catch {
            // ignore
          }

          // Try canonical users/{uid}
          if (!result.studentName) {
            try {
              const uDoc = await getDoc(doc(db, 'users', data.studentId))
              if (uDoc.exists()) {
                const u = uDoc.data() || {}
                result.studentName = u.name || u.displayName || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null)
                result.studentEmail = result.studentEmail || u.email || null
              }
            } catch {
              // ignore
            }
          }

          // Try legacy students/{uid} doc-id
          if (!result.studentName) {
            try {
              const sDoc = await getDoc(doc(db, 'students', data.studentId))
              if (sDoc.exists()) {
                const s = sDoc.data() || {}
                result.studentName = s.name || s.fullName || s.displayName || (s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : null)
                result.studentEmail = result.studentEmail || s.email || null
              }
            } catch {
              // ignore
            }
          }

          // Final fallbacks
          if (!result.studentName) {
            result.studentName = (!looksLikeId(data.studentName) && data.studentName) ? data.studentName : (data.studentEmail || data.studentId)
          }
        } else {
          // No studentId stored
          result.studentName = (!looksLikeId(data.studentName) && data.studentName) ? data.studentName : (data.studentEmail || 'Unknown Student')
        }
      } catch (err) {
        console.warn('Could not resolve student name for pending submission:', docSnap.id, err)
        result.studentName = data.studentEmail || data.studentId || data.studentName || 'Unknown Student'
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

      // Course label
      try {
        // Prefer stored readable fields if present
        if (!result.course && !result.courseName) {
          const courseSnap = await getDoc(doc(db, 'courses', courseId))
          if (courseSnap.exists()) {
            const c = courseSnap.data() || {}
            result.course = c.courseName || c.name || c.title || c.code || c.courseCode || courseId
          }
        }
      } catch (err) {
        // ignore; fall back to courseId
        if (!result.course && !result.courseName) result.course = courseId
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
    
    const currentFacultyId = assignmentData?.facultyId || auth.currentUser?.uid || null
    if (!currentFacultyId) {
      throw new Error('You must be logged in as faculty to create an assignment/quiz.')
    }

    // Ensure the course is owned by this faculty (required by Firestore rules).
    try {
      const courseRef = doc(db, 'courses', courseId)
      const courseSnap = await getDoc(courseRef)
      if (courseSnap.exists()) {
        const courseData = courseSnap.data() || {}
        const owner = (courseData.facultyId ?? null)
        const isUnowned = owner == null || (typeof owner === 'string' && owner.trim() === '')

        if (isUnowned) {
          // Attempt to claim just this course.
          try {
            await updateDoc(courseRef, { facultyId: currentFacultyId, updatedAt: serverTimestamp() })
          } catch (e) {
            const code = e?.code || null
            const msg = (e?.message || '').toString()
            if (code === 'permission-denied' || msg.toLowerCase().includes('insufficient permissions')) {
              throw new Error('Cannot create in this course yet: course ownership claim was denied by Firestore rules.')
            }
            throw e
          }
        } else if (owner !== currentFacultyId) {
          throw new Error('Cannot create in this course: it is owned by a different faculty account.')
        }
      }
    } catch (ownershipErr) {
      // If we raised a friendly error above, rethrow it.
      if (ownershipErr instanceof Error) throw ownershipErr
      // Otherwise continue; Firestore rules will enforce ownership.
    }

    const dataToSave = {
      courseId,
      facultyId: currentFacultyId,
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
      facultyId: announcementData?.facultyId || auth.currentUser?.uid || null,
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
 * Delete announcement
 */
export const deleteAnnouncement = async (announcementId) => {
  try {
    await deleteDoc(doc(db, 'announcements', announcementId))
    return true
  } catch (error) {
    console.error('Error deleting announcement:', error)
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
      facultyId: quizData?.facultyId || auth.currentUser?.uid || null,
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
    // Prefer UID-based doc update
    const uidRef = doc(db, 'faculty', userId)
    const uidSnap = await getDoc(uidRef)
    if (uidSnap.exists()) {
      await updateDoc(uidRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    }

    // Legacy fallback
    const q = query(collection(db, 'faculty'), where('uid', '==', userId))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const legacyRef = doc(db, 'faculty', querySnapshot.docs[0].id)
      await updateDoc(legacyRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      // Also backfill UID doc for consistency
      try {
        await setDoc(uidRef, { uid: userId, ...updates, updatedAt: serverTimestamp() }, { merge: true })
      } catch (e) {
        console.warn('Could not backfill UID-based faculty doc on update:', e)
      }
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

/**
 * Get count of students enrolled in a course (real-time via listener)
 * Returns a callback-based listener that sends enrollment count updates
 */
export const subscribeToEnrolledStudentCount = (courseId, onCountChange) => {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'enrolled')
    )
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        onCountChange(snapshot.docs.length)
      },
      (error) => {
        // Avoid "Uncaught Error in snapshot listener" noise when rules deny access.
        console.warn('subscribeToEnrolledStudentCount: listener error for course', courseId, error)
        onCountChange(0)
      }
    )
    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to enrolled student count:', error)
    throw error
  }
}

/**
 * Get count of students enrolled in a course (one-time query)
 */
export const getEnrolledStudentCount = async (courseId) => {
  try {
    const q = query(
      collection(db, 'enrollments'),
      where('courseId', '==', courseId),
      where('status', '==', 'enrolled')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.length
  } catch (error) {
    console.error('Error fetching enrolled student count:', error)
    return 0
  }
}
