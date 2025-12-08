# Corrected Firestore Security Rules

## Copy & Paste These Rules into Firebase Console

Go to **Firebase Console → Your Project → Firestore Database → Rules** and replace with this exact text:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth.uid != null;
    }
    
    function isStudent() {
      return get(/databases/$(database)/documents/students/$(request.auth.uid)).data.role == 'student';
    }
    
    function isFaculty() {
      return get(/databases/$(database)/documents/faculty/$(request.auth.uid)).data.role == 'faculty' ||
             get(/databases/$(database)/documents/students/$(request.auth.uid)).data.isFaculty == true;
    }
    
    // ========== STUDENTS COLLECTION ==========
    // Students can read/write only their own document
    match /students/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // ========== FACULTY COLLECTION ==========
    // Faculty can read/write only their own document
    match /faculty/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // ========== COURSES COLLECTION ==========
    // All authenticated users can READ courses
    // Only faculty/admin can CREATE/UPDATE/DELETE (via Cloud Functions on enrollments)
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isFaculty();
    }
    
    // ========== ENROLLMENTS COLLECTION ==========
    // Students can create/delete their own enrollments
    // Cloud Functions update course counts/arrays server-side
    match /enrollments/{enrollmentId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAuthenticated() && request.auth.uid == request.resource.data.studentUid;
    }
    
    // ========== ASSIGNMENTS COLLECTION ==========
    // All authenticated users can read
    // Only faculty can create/update/delete
    match /assignments/{assignmentId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isFaculty();
    }
    
    // ========== SUBMISSIONS COLLECTION ==========
    // Students can create submissions, read/update their own
    match /submissions/{submissionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.studentId;
      allow update, delete: if request.auth.uid == resource.data.studentId;
    }
    
    // ========== ANNOUNCEMENTS COLLECTION ==========
    // All authenticated users can read
    // Only faculty can create/update/delete
    match /announcements/{announcementId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isFaculty();
    }
    
    // ========== MESSAGES COLLECTION ==========
    // All authenticated can read and create
    // Can only update/delete own messages
    match /messages/{messageId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if request.auth.uid == resource.data.senderId;
    }
    
    // ========== DEFAULT DENY ==========
    // Deny all other paths by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (**codtech-96227**)
3. Click **Firestore Database** in the left menu
4. Go to the **Rules** tab
5. Click **Edit rules** (blue button top right)
6. Select all text (`Ctrl+A`) and delete it
7. **Copy the entire rules block above** (starting from `rules_version` to the closing `}`)
8. Paste it into the editor
9. Click **Publish** (blue button top right)

## Key Changes from Previous Version

| Rule | Previous | Now | Why |
|------|----------|-----|-----|
| **Courses write** | All authenticated | Faculty only | Only admins/faculty should modify course data |
| **Enrollments** | N/A (new collection) | Students can create/delete own | Client safely triggers enrollment/unenroll |
| **isStudent()** | N/A | Checks `students/{uid}` doc | Validates student role |
| **isFaculty()** | N/A | Checks `faculty/{uid}` or flag in student | Validates faculty role |

## What Happens Now

✅ **Student**: Can read all courses, read/write `students/{uid}`, create/delete own `enrollments`
✅ **Faculty**: Can manage `courses` and read enrollments via Cloud Functions
✅ **Server**: Cloud Functions sync `enrollments` → `courses.students` and `courses.enrolledStudents` atomically
❌ **Blocked**: Client cannot directly modify `courses` data (safe!)

## Troubleshooting

**Error: "Unexpected 'match' on line X"**
- The Firebase Console editor sometimes has parsing issues with copied text
- **Fix**: Open rules in Notepad first, select all, copy, then paste into Firebase Console
- Or use the Firebase CLI: `firebase deploy --only firestore:rules`

**Error: "get() requires path to be a string"**
- This is a valid Firestore Rules v2 syntax issue if you're on an older project
- Try removing the `get()` calls and use simpler role checks (see fallback below)

## Simpler Fallback (if `get()` fails)

If the `get()` function causes errors, use this simpler version:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth.uid != null;
    }
    
    match /students/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /faculty/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if request.auth.token.claims.admin == true ||
                                      request.auth.token.claims.isFaculty == true;
    }
    
    match /enrollments/{enrollmentId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAuthenticated() && request.auth.uid == request.resource.data.studentUid;
    }
    
    match /assignments/{assignmentId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if request.auth.token.claims.admin == true ||
                                     request.auth.token.claims.isFaculty == true;
    }
    
    match /submissions/{submissionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.studentId;
      allow update, delete: if request.auth.uid == resource.data.studentId;
    }
    
    match /announcements/{announcementId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if request.auth.token.claims.admin == true ||
                                     request.auth.token.claims.isFaculty == true;
    }
    
    match /messages/{messageId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if request.auth.uid == resource.data.senderId;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

**Next Steps:**
1. Paste one of the rule sets above into Firebase Console and Publish
2. Once rules are live, run Cloud Functions deployment (see `functions/README.md`)
3. Test: student clicks Enroll → enrollment doc created → function triggers → course count updates → Faculty UI reflects change
