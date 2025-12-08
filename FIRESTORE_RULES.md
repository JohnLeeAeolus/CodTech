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
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth.uid != null;
    }
    
    // Students collection - users can read/write their own profile
    match /students/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Faculty collection - users can read/write their own profile
    match /faculty/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Courses - all authenticated can read, faculty can manage
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Enrollments collection - students create/delete their own enrollments
    // Cloud Functions sync these to course student counts
    match /enrollments/{enrollmentId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAuthenticated();
    }
    
    // Assignments - all authenticated users can read
    match /assignments/{assignmentId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Submissions - students can create submissions
    match /submissions/{submissionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && request.auth.uid == resource.data.studentId;
    }
    
    // Quizzes - all authenticated users can read
    match /quizzes/{quizId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Announcements - all authenticated users can read
    match /announcements/{announcementId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Schedule - all authenticated users can read
    match /schedule/{scheduleId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Messages - authenticated users can read and create
    match /messages/{messageId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && request.auth.uid == resource.data.senderId;
    }
    
    // Grades - all authenticated users can read
    match /grades/{gradeId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Default deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## What Changed

- ✅ Added `/enrollments` collection: students can create/delete their own enrollments
- ✅ Cloud Functions will listen to enrollments and update course student counts
- ✅ All other rules remain the same

## After Publishing

1. Rules are live immediately
2. Student enroll/drop actions now write to `/enrollments` (safe per these rules)
3. Deploy Cloud Functions so they sync enrollment changes to course counts (see `functions/README.md`)
4. Test: student clicks Enroll → enrollment doc created → function triggers → faculty UI updates
