# Quick Fix for Current Errors

## Error 1: Missing Firestore Index ❌

**Error Message**:
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/...
```

### Fix (2 minutes):
1. **Click the link** in the error message (it's already in the console)
2. Click **"Create Index"** button
3. Wait 5-15 minutes for Firebase to create it
4. Refresh the app

**OR manually create:**
- Go to: https://console.firebase.google.com/
- Select project: **codtech-96227**
- Go to: **Firestore → Indexes**
- Click **"Create Composite Index"**
- Collection: `courses`
- Field 1: `facultyId` (Ascending)
- Field 2: `semester` (Ascending)
- Click **Create**

---

## Error 2: Missing Storage Permissions ❌

**Error Message**:
```
Missing or insufficient permissions
```

### Fix (2 minutes):
1. Go to: https://console.firebase.google.com/
2. Select project: **codtech-96227**
3. Go to: **Storage → Rules**
4. Click **"Edit Rules"**
5. Replace ALL content with:

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

6. Click **"Publish"** (orange button, top right)
7. Wait for confirmation
8. Refresh the app

---

## Summary

After both fixes:
✅ Faculty can create assignments with file attachments
✅ Files upload to Storage (not Firestore)
✅ Assignments appear on student calendar
✅ Students can submit assignments with files

**Total time**: ~20-30 minutes (mostly waiting for index creation)

---

## Testing

After fixes:
1. Open the app
2. Log in as **faculty**
3. Create an assignment with a file attachment
4. Check Firebase Console → Storage → Files for the uploaded file
5. Check Firestore → assignments collection for the metadata
