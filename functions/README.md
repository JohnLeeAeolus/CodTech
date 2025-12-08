# Cloud Functions for CodTech

This folder contains Firebase Cloud Functions that sync `enrollments` -> `courses` counts.

Setup and deploy

1. Install dependencies

```powershell
cd functions
npm install
```

2. Ensure you have the Firebase CLI installed and are logged in

```powershell
npm install -g firebase-tools
firebase login
firebase use --add  # select your project if not already selected
```

3. Deploy functions

```powershell
cd functions
firebase deploy --only functions
```

Notes
- Functions use the Admin SDK and run with project privileges, so they can update `courses` documents even if your client rules disallow it.
- Make sure `functions/package.json` has compatible Node engine for your Firebase project; Node 18 is recommended.
