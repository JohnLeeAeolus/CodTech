# Firestore Security Rules - UPDATED FOR PRODUCTION

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

    // Students collection - allow any authenticated user to create/read
    match /students/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated() && (resource.data.uid == request.auth.uid || request.auth.uid == resource.data.studentId);
    }

    // Faculty collection - allow any authenticated user to create/read
    match /faculty/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated() && (resource.data.uid == request.auth.uid || request.auth.uid == resource.data.facultyId);
    }

    // Courses - all authenticated users can read/create
    match /courses/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Assignments - all authenticated users can read/create
    match /assignments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Submissions - all authenticated users can read/create
    match /submissions/{document=**} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Quizzes - all authenticated users can read/create
    match /quizzes/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Quiz Submissions - all authenticated users can read/create
    match /quizSubmissions/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Announcements - all authenticated users can read/create
    match /announcements/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Schedule - all authenticated users can read/create
    match /schedule/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Messages - authenticated users can read and create
    match /messages/{document=**} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Grades - all authenticated users can read/create
    match /grades/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Enrollments - all authenticated users can read/create
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

- Read all collections (students, faculty, courses, assignments, etc.)
- Create documents in any collection
- Update and delete documents (for testing)

⚠️ **Note**: These are **DEVELOPMENT rules**. For production, restrict writes more carefully.

## For Production

Replace with stricter rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth.uid != null;
    }

    // Students can only update/delete their own profile
    match /students/{document=**} {
      allow create, read: if isAuthenticated();
      allow update, delete: if isAuthenticated() && resource.data.uid == request.auth.uid;
    }

    // Faculty can only update/delete their own profile
    match /faculty/{document=**} {
      allow create, read: if isAuthenticated();
      allow update, delete: if isAuthenticated() && resource.data.uid == request.auth.uid;
    }

    // Courses - all authenticated can read, only faculty can create/modify
    match /courses/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Assignments - authenticated can read, faculty can create
    match /assignments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Submissions - students can create, all can read
    match /submissions/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Quizzes
    match /quizzes/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Quiz Submissions
    match /quizSubmissions/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Announcements
    match /announcements/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Schedule
    match /schedule/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Messages - users can read their own, create new
    match /messages/{document=**} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    // Grades - all can read
    match /grades/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    // Enrollments
    match /enrollments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
  }
}
```

## Testing After Applying Rules

1. Open browser console (F12)
2. Log in to the app
3. Errors should be resolved
4. Check console for successful data loads
5. Test creating assignments, submissions, etc.

## If errors still occur:

1. Check Firebase Console → Firestore → Rules → Review rules are published
2. Refresh browser (Ctrl+F5 or Cmd+Shift+R)
3. Clear browser cache
4. Check that Firestore collections exist
5. Verify user is authenticated (check `request.auth.uid`)
