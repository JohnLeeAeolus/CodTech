# How to Test Student Assignments Now

## Quick Test Steps

### 1. Make Sure Faculty Has Uploaded Assignments
- Login as Faculty
- Go to Faculty Assignments
- Upload at least one assignment (title, due date, optional attachment)
- Note the course (default is "general")

### 2. Clear Browser Data
- Press F12 → Application tab → Storage → Clear All
- Or press Ctrl+Shift+Delete

### 3. Login as Student (New Account)
- Create new student or login with different account
- Go to My Assignments page

### Expected Behavior

#### Before Enrollment
```
✓ Should see all uploaded assignments
✓ Each assignment shows: Title, Course, Due Date, Description
✓ Status shows "Pending"
✓ Total Points displays (if set by faculty)
✓ Attached files show with download link
```

#### Button Shows "Enroll to Submit"
- Because student is not yet enrolled in that course

### After Clicking "Enroll to Submit"
```
✓ Confirmation: "Successfully enrolled in course!"
✓ Page reloads
✓ Same assignment now shows "Submit Now" button
✓ Can now upload assignment file
```

### After Submitting Assignment
```
✓ Status changes to "Submitted"
✓ Button changes to "✓ Submitted" (disabled)
✓ File is stored in Firebase Storage
```

## Test Checklist

- [ ] Faculty uploaded assignment with file attachment
- [ ] Student sees assignment in "My Assignments"
- [ ] Student can see all assignment details
- [ ] Student sees "Enroll to Submit" button
- [ ] Clicking enroll updates student profile
- [ ] After enrollment, button changes to "Submit Now"
- [ ] Can submit assignment file
- [ ] Submitted status updates correctly
- [ ] Downloaded attachment opens correctly
- [ ] Filter tabs work (Pending, Submitted, etc.)

## Troubleshooting

### Problem: No assignments show at all

**Check:**
1. Faculty has uploaded assignments (check Firestore console)
2. Assignment has `status: "active"`
3. Browser cache is cleared
4. Dev server restarted

**View Console:**
- Open F12 → Console tab
- Check for error messages
- Look for "All available assignments:" log

### Problem: "Enroll to Submit" button doesn't work

**Check:**
1. Student is logged in (check auth state)
2. Course ID in assignment matches real course
3. Check console for enrollment error

### Problem: Submitted file doesn't save

**Check:**
1. CORS is configured (see STORAGE_CORS_COMPLETE_GUIDE.md)
2. Firebase Storage rules allow student to write
3. File isn't too large (check file size)

## Example Test Data

Create a test assignment with:
- **Title**: "Test Assignment"
- **Description**: "This is a test"
- **Due Date**: 2025-12-20
- **Total Points**: 100
- **Type**: "assignment"
- **Course**: "general" or valid courseId
- **Attachment**: PNG file (small size)

## Console Logs to Watch For

```javascript
// Student loads page:
"Loading student data for: {userId}"
"Student profile: {profile object}"

// If not enrolled:
"Student not enrolled in any courses, fetching all assignments"
"All available assignments: [{...}]"

// After enrollment:
"Enrolling in course: {courseId}"
"Student successfully enrolled"

// When filtering:
"Processed assignments: [{...}]"
```

## Performance Tips

- Keep test files small (< 5MB)
- Don't upload thousands of assignments at once
- Clear browser cache if seeing old data
- Hard refresh with Ctrl+Shift+R if needed

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Assignments don't load | Check Firebase rules & CORS |
| Can't enroll | Check if courseId exists in database |
| Can't submit | Check Storage CORS config |
| Status doesn't update | Refresh page |
| File attachment broken | Check download URL in Firestore |
