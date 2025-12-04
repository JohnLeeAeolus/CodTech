// Firebase config and Firestore utility
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCnuqcROeWQuUqnUgn-XFW5cWSqalyQD0Y",
  authDomain: "codtech-96227.firebaseapp.com",
  projectId: "codtech-96227",
  // storageBucket usually ends with .appspot.com — ensure this matches your Firebase Console
  storageBucket: "codtech-96227.appspot.com",
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

export { db, analytics, auth };