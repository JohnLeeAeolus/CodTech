# Firebase Storage CORS Error - Complete Solution

## Error Summary

**Error Message:**
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
has been blocked by CORS policy: Response to preflight request doesn't pass 
access control check: It does not have HTTP ok status.
```

**Root Cause:** Firebase Storage CORS (Cross-Origin Resource Sharing) is not configured for your localhost development environment.

---

## Why This Happens

When your React app (running on `http://localhost:5173`) tries to upload files directly to Firebase Storage (`firebasestorage.googleapis.com`), the browser's security policy blocks the request because:

1. **Different Origins**: `localhost:5173` ≠ `firebasestorage.googleapis.com`
2. **Preflight Request Fails**: Browser sends an OPTIONS request first, which needs proper CORS headers
3. **Missing CORS Configuration**: Firebase Storage bucket doesn't have CORS rules allowing localhost

---

## Step-by-Step Fix

### Step 1: Install Google Cloud Tools (if using CLI method)

**Windows PowerShell:**
```powershell
# Check if gsutil is installed
gsutil --version

# If not, install Google Cloud SDK
# Download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Apply CORS Configuration

**Option A: Using gsutil (Recommended)**

```powershell
# Navigate to project directory
cd c:\Users\magar\.vscode\CodTech-1

# Set CORS configuration
gsutil cors set firebase-storage-cors.json gs://codtech-96227.appspot.com

# Verify it was applied
gsutil cors get gs://codtech-96227.appspot.com
```

**Option B: Using Google Cloud Console (No Installation Required)**

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Select project: **codtech-96227**
3. Navigate to: **Cloud Storage** → **Buckets** → **codtech-96227.appspot.com**
4. Click **CORS** configuration tab
5. Click **Edit CORS configuration**
6. Paste this JSON:

```json
[
  {
    "origin": ["http://localhost:5173", "http://localhost:3000"],
    "method": ["GET", "HEAD", "DELETE", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  },
  {
    "origin": ["*"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"]
  }
]
```

7. Click **Save**

### Step 3: Clear Cache & Restart

1. **Clear Browser Cache:**
   - Press: `Ctrl + Shift + Delete`
   - Select "All time"
   - Clear cache

2. **Restart Dev Server:**
   ```powershell
   # Stop current server (Ctrl+C)
   # Restart it
   npm run dev
   ```

3. **Clear Browser Data (Optional):**
   - Press F12 to open DevTools
   - Application tab → Storage → Clear All

### Step 4: Test Upload

Try uploading a file through Faculty Assignments. You should now see:
- No CORS errors in console
- File uploads successfully
- Assignment appears in Student Assignments

---

## CORS Configuration Explained

```json
{
  "origin": ["http://localhost:5173"],           // Allowed domains
  "method": ["GET", "HEAD", "DELETE", "PUT"],   // Allowed HTTP methods
  "responseHeader": ["Content-Type"],            // Headers client can access
  "maxAgeSeconds": 3600                          // Cache preflight for 1 hour
}
```

- **origin**: Which domains can access Firebase Storage
- **method**: Which HTTP operations are allowed
- **responseHeader**: Which response headers the browser allows JavaScript to access
- **maxAgeSeconds**: How long the browser caches the preflight response

---

## For Production (Netlify)

Update CORS configuration to include your production domain:

```json
[
  {
    "origin": ["https://your-domain.netlify.app", "http://localhost:5173"],
    "method": ["GET", "HEAD", "DELETE", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

---

## Troubleshooting

### Still Getting CORS Error?

1. **Check if CORS was actually applied:**
   ```powershell
   gsutil cors get gs://codtech-96227.appspot.com
   ```

2. **Wait for cache to expire** - up to 1 hour

3. **Hard refresh browser:**
   - Press: `Ctrl + Shift + R` (or Cmd+Shift+R on Mac)

4. **Check browser console** for the actual error code

### Upload Still Fails After CORS Fix?

Check for these error codes:
- `storage/unauthorized` - Check Firebase Storage Rules
- `storage/quota-exceeded` - Upgrade Firebase plan
- `storage/invalid-checksum` - Network issue, try again

---

## What Was Changed

Enhanced error handling in `firestoreHelpers.js`:
- Better error messages for different failure types
- CORS-specific error detection
- Timeout handling
- Content-type specification in uploads

---

## Additional Resources

- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [CORS Configuration Guide](https://cloud.google.com/storage/docs/configuring-cors)
- [Firebase Storage Rules](https://firebase.google.com/docs/storage/security)

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| CORS blocked | Apply CORS config to Cloud Storage bucket |
| Upload timeout | File may be too large or network unstable |
| Permission denied | Check Firebase Storage Rules |
| Preflight fails | Wait for CORS cache to expire (1 hour) |
| Still not working | Clear browser cache (Ctrl+Shift+Delete) |
