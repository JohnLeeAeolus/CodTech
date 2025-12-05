# Firebase Storage CORS Configuration Fix

## Problem
You're getting CORS errors when uploading files to Firebase Storage from localhost.

## Solution

### Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
```powershell
npm install -g firebase-tools
```

2. **Authenticate with Firebase**:
```powershell
firebase login
```

3. **Configure CORS** using the provided configuration:
```powershell
# Windows PowerShell
gsutil cors set firebase-storage-cors.json gs://codtech-96227.appspot.com
```

For Mac/Linux:
```bash
gsutil cors set firebase-storage-cors.json gs://codtech-96227.appspot.com
```

### Option 2: Manual Configuration (via Google Cloud Console)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (codtech-96227)
3. Go to **Cloud Storage** → **Buckets**
4. Select your bucket (`codtech-96227.appspot.com`)
5. Click the **CORS** tab
6. Click **Edit CORS configuration**
7. Paste the following JSON:

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

8. Click **Save**

### Option 3: For Production (Netlify)

Update the CORS configuration to include your production domain:

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

## Verification

After applying CORS configuration:
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Restart your dev server
3. Try uploading a file again

The upload should now work without CORS errors.

## What CORS Does

- **origin**: Allows requests from these domains
- **method**: Allows these HTTP methods
- **responseHeader**: Specifies headers that can be accessed
- **maxAgeSeconds**: Browser cache time for preflight requests

This prevents the "Response to preflight request doesn't pass access control check" error.
