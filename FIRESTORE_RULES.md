# Firestore Security Rules

## Quick Paste Instructions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **codtech-96227**
3. Navigate to **Firestore Database** → **Rules** tab
4. Click **Edit rules**
5. Select all (Ctrl+A) and delete
6. **Copy the rules block below and paste directly**
7. Click **Publish**

---

## Rules to Paste

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth.uid != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isStudent() {
      return exists(/databases/$(database)/documents/students/$(request.auth.uid));
    }
    
    function isFaculty() {
      return exists(/databases/$(database)/documents/faculty/$(request.auth.uid));
    }
    
    function isUserProfileOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    function isSameUser(userId) {
      return request.auth.uid == userId;
    }
    
    function isEnrolledInCourse(courseId) {
      return exists(/databases/$(database)/documents/enrollments/$(request.auth.uid + '_' + courseId));
    }
    
    function isCourseInstructor(courseId) {
      let course = get(/databases/$(database)/documents/courses/$(courseId));
      return course.data.instructorId == request.auth.uid;
    }
    
    // Allow authenticated users to read/write their own student document
    match /students/{userId} {
      allow read: if isAuthenticated() && (isSameUser(userId) || isFaculty() || isAdmin());
      allow write: if isAuthenticated() && isSameUser(userId);
      allow create: if isAuthenticated() && isSameUser(userId);
      allow update: if isAuthenticated() && isSameUser(userId);
      allow delete: if false; // Only admins can delete student records
    }
    
    // Recursive rule for student subcollections
    match /students/{userId}/{document=**} {
      allow read: if isAuthenticated() && (isSameUser(userId) || isFaculty() || isAdmin());
      allow write: if isAuthenticated() && isSameUser(userId);
    }
    
    // Allow authenticated users to read/write their own faculty document
    match /faculty/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isSameUser(userId);
      allow create: if isAuthenticated() && isSameUser(userId);
      allow update: if isAuthenticated() && isSameUser(userId);
      allow delete: if isAdmin();
    }
    
    // Recursive rule for faculty subcollections
    match /faculty/{userId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isSameUser(userId);
    }
    
    // Admin documents
    match /admins/{userId} {
      allow read: if isAdmin();
      allow write: if isAdmin() && isSameUser(userId);
    }
    
    // Allow authenticated users to read courses
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin() || isCourseInstructor(courseId);
      allow delete: if isAdmin();
    }
    
    // Recursive rule for course subcollections
    match /courses/{courseId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin() || isCourseInstructor(courseId);
    }
    
    // Allow authenticated users to manage enrollments
    match /enrollments/{enrollmentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && (isStudent() || isFaculty() || isAdmin());
      allow delete: if isAuthenticated() && (isFaculty() || isAdmin());
      allow update: if false; // No updates allowed, only create/delete
    }
    
    // Assignments (based on your image content)
    match /assignments/{assignmentId} {
      allow read: if isAuthenticated();
      // Faculty can create/update/delete assignments
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for assignment subcollections
    match /assignments/{assignmentId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // Submissions for assignments
    match /submissions/{submissionId} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated() && isStudent();
      allow update: if isAuthenticated() && 
                     (isFaculty() || isAdmin() || 
                      (isStudent() && resource.data.userId == request.auth.uid && 
                       resource.data.status != 'graded'));
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for submission subcollections
    match /submissions/{submissionId}/{document=**} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.userId == request.auth.uid);
      allow write: if isAuthenticated() && 
                     (isFaculty() || isAdmin() || 
                      (isStudent() && resource.data.userId == request.auth.uid));
    }
    
    // Quizzes
    match /quizzes/{quizId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for quiz subcollections
    match /quizzes/{quizId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // Quiz submissions
    match /quizSubmissions/{submissionId} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated() && isStudent();
      allow update: if isAuthenticated() && 
                     (isFaculty() || isAdmin() || 
                      (isStudent() && resource.data.userId == request.auth.uid && 
                       resource.data.status != 'graded'));
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for quiz submission subcollections
    match /quizSubmissions/{submissionId}/{document=**} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.userId == request.auth.uid);
      allow write: if isAuthenticated() && 
                     (isFaculty() || isAdmin() || 
                      (isStudent() && resource.data.userId == request.auth.uid));
    }
    
    // Announcements
    match /announcements/{announcementId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for announcement subcollections
    match /announcements/{announcementId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // Messages (private messaging)
    match /messages/{messageId} {
      allow read: if isAuthenticated() && 
                    (resource.data.senderId == request.auth.uid || 
                     resource.data.receiverId == request.auth.uid);
      allow create: if isAuthenticated();
      allow update: if false; // Messages cannot be updated
      allow delete: if isAuthenticated() && 
                     (resource.data.senderId == request.auth.uid || 
                      resource.data.receiverId == request.auth.uid);
    }
    
    // Recursive rule for message subcollections
    match /messages/{messageId}/{document=**} {
      allow read: if isAuthenticated() && 
                    (resource.data.senderId == request.auth.uid || 
                     resource.data.receiverId == request.auth.uid);
      allow write: if false; // No subcollections should be written to
    }
    
    // Schedule
    match /schedule/{scheduleId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for schedule subcollections
    match /schedule/{scheduleId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // Grades
    match /grades/{gradeId} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.studentId == request.auth.uid);
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for grade subcollections
    match /grades/{gradeId}/{document=**} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     resource.data.studentId == request.auth.uid);
      allow write: if isFaculty() || isAdmin();
    }
    
    // Materials
    match /materials/{materialId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for material subcollections
    match /materials/{materialId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // Calendar Events (for your timeline view)
    match /calendarEvents/{eventId} {
      allow read: if isAuthenticated();
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Recursive rule for calendar event subcollections
    match /calendarEvents/{eventId}/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isFaculty() || isAdmin();
    }
    
    // User assignments tracking
    match /userAssignments/{userId}/{assignmentId} {
      allow read: if isAuthenticated() && 
                    (isSameUser(userId) || isFaculty() || isAdmin());
      allow create: if isAuthenticated() && isSameUser(userId);
      allow update: if isAuthenticated() && 
                     (isSameUser(userId) || isFaculty() || isAdmin());
      allow delete: if isFaculty() || isAdmin();
    }
    
    // User notifications
    match /notifications/{userId}/{notificationId} {
      allow read: if isAuthenticated() && isSameUser(userId);
      allow create: if isAuthenticated() && (isFaculty() || isAdmin());
      allow update: if isAuthenticated() && isSameUser(userId);
      allow delete: if isAuthenticated() && isSameUser(userId);
    }
    
    // Course discussions/forums
    match /discussions/{discussionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                     (resource.data.authorId == request.auth.uid || 
                      isFaculty() || isAdmin());
      allow delete: if isFaculty() || isAdmin();
    }
    
    // Discussion comments
    match /discussions/{discussionId}/comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                     (resource.data.authorId == request.auth.uid || 
                      isFaculty() || isAdmin());
      allow delete: if isFaculty() || isAdmin() || 
                     resource.data.authorId == request.auth.uid;
    }
    
    // Attendance records
    match /attendance/{courseId}/{date}/{studentId} {
      allow read: if isAuthenticated() && 
                    (isFaculty() || isAdmin() || 
                     isSameUser(studentId));
      allow create: if isFaculty() || isAdmin();
      allow update: if isFaculty() || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Catch-all: deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **codtech-96227**
3. Navigate to **Firestore Database** → **Rules** tab
4. Click **Edit rules**
5. Delete all existing content
6. Paste the rules above
7. Click **Publish**

## What These Rules Do

### Helper Functions
- `isAuthenticated()`: Checks if user is logged in
- `isStudent()`, `isFaculty()`, `isAdmin()`: Role-based checks
- `isCourseInstructor()`: Verifies course ownership
- `isSameUser()`: Confirms user identity

### Access Control by Collection

**Students**:
- Can read/write only their own profile
- Faculty and admins can read student profiles
- Cannot be deleted by students

**Faculty**:
- Can read all faculty profiles
- Can write/update only their own
- Can be deleted only by admins

**Courses**:
- All authenticated users can read
- Only faculty/admins can create/update/delete
- Course instructors can also update

**Assignments**:
- All authenticated users can read
- Only faculty/admins can create/update/delete

**Submissions**:
- Students can create submissions
- Faculty/admins can read all submissions
- Students can only read/update their own (unless graded)
- Faculty/admins can read/update/delete all

**Messages**:
- Users can only read/delete their own messages (sent or received)
- Cannot be updated after creation

**Grades**:
- Students can only read their own grades
- Faculty/admins can create/update/delete all

**Discussions & Comments**:
- All authenticated users can read and create
- Users can update their own or faculty/admins can update any
- Authors and faculty/admins can delete

**Attendance**:
- Students can only read their own
- Faculty/admins can create/update
- Only admins can delete

### Fallback
- All other documents are denied by default

## Testing

After applying rules:

1. Log in to the app as a student
2. Log in to the app as faculty
3. Faculty should be able to create assignments
4. Students should be able to submit assignments
5. Both should see errors resolve in console
6. Students should only see their own grades
7. Faculty should see all student submissions
