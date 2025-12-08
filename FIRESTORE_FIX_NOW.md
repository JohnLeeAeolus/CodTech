# ⚠️ IMMEDIATE FIX NEEDED - Firestore Permissions Error

## The Problem

Your app is getting "Missing or insufficient permissions" errors because your Firestore security rules are too restrictive.

## The Solution (MUST DO THIS)

### Step 1: Open Firebase Console

1. Go to: https://console.firebase.google.com/
2. Click on your project: **codtech-96227**

### Step 2: Go to Firestore Rules

1. In left sidebar, click **Firestore Database**
2. Click the **Rules** tab (next to Data, Indexes)

### Step 3: Copy These Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth.uid != null;
    }

    match /students/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /faculty/{document=**} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /courses/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /assignments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /submissions/{document=**} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /quizzes/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /quizSubmissions/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /announcements/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /schedule/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /messages/{document=**} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }

    match /grades/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }

    match /enrollments/{document=**} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated();
    }
  }
}
```

### Step 4: Paste Into Firebase

1. Click **Edit rules** button
2. Delete ALL existing content (Ctrl+A, then Delete)
3. Paste the rules above
4. Click **Publish** button

### Step 5: Verify & Reload

1. Wait 10-30 seconds for rules to deploy
2. Go back to your app
3. Press **Ctrl+Shift+R** (hard refresh) to clear cache
4. Log in again
5. Errors should be gone ✓

## Troubleshooting

If you still see errors after publishing:

**Option 1: Check if rules published**

- Go back to Rules tab
- Look at bottom - it should say "Last updated: just now"
- If it says something else, try publishing again

**Option 2: Hard refresh browser**

- Press Ctrl+Shift+R (Windows/Linux)
- Or Cmd+Shift+R (Mac)
- This clears the cache

**Option 3: Check authentication**

- Open browser DevTools (F12)
- Go to Console tab
- You should see "User logged in: [uid]"
- If not, log out and log back in

**Option 4: Check collections exist**

- In Firebase Console → Firestore Database → Data tab
- Make sure you have collections: students, faculty, courses, assignments, etc.
- If empty, you need to add sample data first

## What These Rules Do

✅ **Allow:** Any logged-in user to read/write all collections
❌ **Deny:** Users who are NOT logged in
❌ **Deny:** Reading/writing collections not listed

## For Production (Later)

When you go live, make these stricter:

- Students can only read/write their own records
- Faculty can only read/write their own records
- Only admins can create courses
- etc.

But for now, keep them permissive for development.

## Questions?

If it's still not working:

1. Check console (F12) for exact error message
2. Verify you're logged in
3. Check that Firebase project is correct (codtech-96227)
4. Try logging out and back in
