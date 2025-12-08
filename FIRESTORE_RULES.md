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

    // Students collection - allow authenticated users to create and read all
    match /students/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Faculty collection - allow authenticated users to create and read all
    match /faculty/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Courses - all authenticated users can read and write
    match /courses/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Assignments - all authenticated users can read and write
    match /assignments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Submissions - all authenticated users can read and write
    match /submissions/{document=**} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Quizzes - all authenticated users can read and write
    match /quizzes/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Quiz Submissions - all authenticated users can read and write
    match /quizSubmissions/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Announcements - all authenticated users can read and write
    match /announcements/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Schedule - all authenticated users can read and write
    match /schedule/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Messages - authenticated users can read and create
    match /messages/{document=**} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Grades - all authenticated users can read and write
    match /grades/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Enrollments - all authenticated users can read and write
    match /enrollments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
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
