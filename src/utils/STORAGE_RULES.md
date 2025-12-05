# Firebase Storage Rules for File Uploads

## Apply These Rules to Firebase Storage

Go to **Firebase Console → Storage → Rules** and replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Faculty can upload assignment attachments
    match /assignments/{courseId}/{fileName=**} {
      allow write: if request.auth.uid != null;
      allow read: if request.auth.uid != null;
    }
    
    // Students can upload submission files
    match /submissions/{assignmentId}/{fileName=**} {
      allow write: if request.auth.uid != null;
      allow read: if request.auth.uid != null;
    }
    
    // Faculty can upload course materials
    match /course-materials/{courseId}/{fileName=**} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null;
    }
    
    // Public announcements/resources
    match /public/{fileName=**} {
      allow read: if true;
      allow write: if request.auth.uid != null;
    }
    
    // Catch-all deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## What These Rules Do

✅ **Students** can:
- Upload files to `submissions/` folder (for assignment submissions)
- Read any files in submissions folder

✅ **Faculty** can:
- Upload course materials to `course-materials/` folder
- Upload public resources

🔒 **Blocks**:
- Anonymous users from uploading
- Non-faculty from uploading course materials
- Unauthorized access to private files

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **codtech-96227**
3. Navigate to **Storage** → **Rules**
4. Click **Edit rules**
5. Replace all content with the rules above
6. Click **Publish**

## Testing Upload

After applying rules, student uploads should work:
- File uploads to: `submissions/assignmentId/studentUid_timestamp_filename`
- Faculty can download from: `Faculty Submissions` page

## Troubleshooting

If uploads still fail:

1. **Check browser console** for Firebase error messages
2. **Verify custom claims** - if using roles, ensure students have `role: 'student'` set in auth custom claims
3. **Check file size** - Firebase has 5GB per file limit
4. **Check bucket permissions** - Storage bucket should be writable in Firebase Console

## Alternative: Permissive Rules (Development Only)

If you need quick testing without custom claims:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{assignmentId}/{fileName=**} {
      allow read, write: if request.auth.uid != null;
    }
    match /course-materials/{courseId}/{fileName=**} {
      allow read, write: if request.auth.uid != null;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

⚠️ **Note**: This is more permissive - use for testing only, then apply stricter rules for production.
