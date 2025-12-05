# Firestore Indexes Setup Guide

## Required Composite Indexes

Your app uses queries that require Firestore composite indexes. Create these indexes in Firebase Console.

### Index 1: Submissions by Student ID + Submitted At (DESC)
**Collection**: `submissions`
**Purpose**: Query student submissions ordered by date
**Used in**: `getStudentSubmissions()`, `StudentSubmissions.jsx`

**Fields**:
1. `studentId` (Ascending)
2. `submittedAt` (Descending)

**Create Link**:
https://console.firebase.google.com/v1/r/project/codtech-96227/firestore/indexes?create_composite=ClFwcm9qZWN0cy9jb2R0ZWNoLTk2MjI3L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zdWJtaXNzaW9ucy9pbmRleGVzL18QARoNCglzdHVkZW50SWQQARoPCgtzdWJtaXR0ZWRBdBACGgwKCF9fbmFtZV9fEAI

---

### Index 2: Assignments by Course ID + Due Date (ASC)
**Collection**: `assignments`
**Purpose**: Get course assignments sorted by due date
**Used in**: `getStudentAssignments()`, `getCourseAssignments()`

**Fields**:
1. `courseId` (Ascending)
2. `dueDate` (Ascending)

**Manual Setup**:
- Go to Firestore → Indexes → Create Composite Index
- Collection: `assignments`
- Field 1: `courseId` (Ascending)
- Field 2: `dueDate` (Ascending)

---

### Index 3: Announcements by Course ID + Created At (DESC)
**Collection**: `announcements`
**Purpose**: Get course announcements in reverse chronological order
**Used in**: `getCourseAnnouncements()`, `StudentHome.jsx`

**Fields**:
1. `courseId` (Ascending)
2. `createdAt` (Descending)

**Manual Setup**:
- Go to Firestore → Indexes → Create Composite Index
- Collection: `announcements`
- Field 1: `courseId` (Ascending)
- Field 2: `createdAt` (Descending)

---

### Index 4: Schedule by Course ID + Day of Week (ASC)
**Collection**: `schedule`
**Purpose**: Get course schedule ordered by day
**Used in**: `getStudentSchedule()`, `StudentSchedule.jsx`

**Fields**:
1. `courseId` (Ascending)
2. `dayOfWeek` (Ascending)

**Manual Setup**:
- Go to Firestore → Indexes → Create Composite Index
- Collection: `schedule`
- Field 1: `courseId` (Ascending)
- Field 2: `dayOfWeek` (Ascending)

---

## How to Create Indexes Manually

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: `codtech-96227`
3. **Navigate**: Firestore Database → Indexes (or Cloud Firestore → Indexes)
4. **Click**: "Create Index" button
5. **Fill in**:
   - Collection ID
   - Field names and sort order (as specified above)
6. **Click**: "Create"
7. **Wait**: Index creation takes 5-15 minutes

---

## Using Auto-Generated Links

Each index error in your app includes a direct link. When you see an error like:

```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/...
```

**Simply click that link** and Firebase will:
- Pre-fill all the index fields
- Auto-generate the exact composite index you need
- You just need to click "Create"

---

## Quick Creation Order

Create indexes in this order (fastest feedback):

1. ✅ **Submissions** (currently blocking StudentSubmissions)
2. **Assignments** (blocks student/faculty assignment queries)
3. **Announcements** (blocks StudentHome)
4. **Schedule** (blocks StudentSchedule)

---

## Status Check

After creating indexes:

1. **Refresh your browser** (Ctrl+R or Cmd+R)
2. **Check the Indexes page** in Firebase Console:
   - You should see "Building" or "Ready" status
   - Once "Ready", queries will work
3. **Test in the app**:
   - Try viewing submissions, assignments, schedule
   - Errors should disappear

---

## Alternative: Simpler Queries (No Indexes Needed)

If you prefer to avoid indexes, we can modify queries to:
- Remove `orderBy` (fetch unsorted, sort in app)
- Use single `where` conditions
- This trades performance for simplicity

**Recommendation**: Create the indexes - they only take 5-10 minutes and will make queries fast.

---

## Troubleshooting

**"Index still building"**
- Normal - wait 10 minutes
- Refresh browser
- Clear browser cache if needed

**"Wrong index created"**
- Delete it in Firestore → Indexes
- Create the correct one

**"Still getting index error"**
- Make sure ALL required fields are in the index
- Check field names match exactly (case-sensitive)
- Verify sort order (Ascending vs Descending)

---

## Production Setup

For production deployment:

1. ✅ Create all required indexes (done above)
2. ✅ Apply Storage rules (see `STORAGE_RULES.md`)
3. ✅ Apply Firestore rules (see `FIRESTORE_SCHEMA.md`)
4. ✅ Enable backups in Firebase Console
5. ✅ Set up monitoring and alerts

All indexes are now documented and ready to create!
