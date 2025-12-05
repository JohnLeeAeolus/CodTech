# Firestore Security Rules

## Apply These Rules to Firestore

Go to **Firebase Console → Firestore Database → Rules** and replace with:

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
    
    // Courses - all authenticated users can read
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Assignments - all authenticated users can read
    match /assignments/{assignmentId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
    
    // Submissions - students can create submissions
    // This is the KEY rule for student assignment submission
    match /submissions/{submissionId} {
      // Allow authenticated users to read submissions
      allow read: if isAuthenticated();
      // Allow authenticated users to create new submissions
      allow create: if isAuthenticated();
      // Allow users to update/delete their own submissions
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

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **codtech-96227**
3. Navigate to **Firestore Database** → **Rules** tab
4. Click **Edit rules**
5. Delete all existing content
6. Paste the rules above
7. Click **Publish**

## What These Rules Do

✅ **All authenticated users** can:
- Read all courses, assignments, quizzes, announcements, schedules, messages, grades
- Create and edit courses, assignments, quizzes, announcements, schedules, messages, grades
- Submit assignments
- Read and edit own student/faculty profile

🔒 **Blocks**:
- Unauthenticated (anonymous) users from accessing anything
- Unauthorized edits to other users' profiles
- Unauthorized deletion of submissions

## Testing

After applying rules:
1. Log in to the app
2. Faculty should be able to create assignments
3. Students should be able to submit assignments
4. Both should see errors resolve in console
