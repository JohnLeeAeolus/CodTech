// Firebase config and Firestore utility
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCnuqcROeWQuUqnUgn-XFW5cWSqalyQD0Y",
  authDomain: "codtech-96227.firebaseapp.com",
  projectId: "codtech-96227",
  storageBucket: "codtech-96227.firebasestorage.app",
  messagingSenderId: "677726453750",
  appId: "1:677726453750:web:221b0f3b132dc2d4ebd1d7",
  measurementId: "G-Q9MKK2H67W"
};

const app = initializeApp(firebaseConfig);
let analytics;
try {
  analytics = getAnalytics(app);
} catch (err) {
  // Analytics can fail in some environments (e.g. unsupported browsers, SSR)
  // but the app should continue to work — log a warning for debugging.
  // console.warn('Firebase analytics unavailable:', err)
}
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Local emulator support ---
// Opt-in via `.env.local`: VITE_USE_EMULATORS=true
// This lets you test login + database locally even if your real Firebase project
// rules/permissions are broken.
const shouldUseEmulators =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.DEV &&
  String(import.meta.env.VITE_USE_EMULATORS || '').toLowerCase() === 'true';

if (shouldUseEmulators) {
  // Prevent double-connecting during HMR
  if (!globalThis.__CODTECH_EMULATORS_CONNECTED__) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    } catch (e) {
      // ignore if already connected
    }
    try {
      connectFirestoreEmulator(db, 'localhost', 8080)
    } catch (e) {
      // ignore if already connected
    }
    globalThis.__CODTECH_EMULATORS_CONNECTED__ = true
    // console.log('✅ Connected Firebase emulators (auth:9099, firestore:8080)')
  }
}

export { db, analytics, auth, storage };