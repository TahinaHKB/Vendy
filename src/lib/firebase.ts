import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyBkXpRHYmwDRBwbIsXuCsO3bxzGHQcSuVg",
  authDomain: "vendy-2197a.firebaseapp.com",
  projectId: "vendy-2197a",
  storageBucket: "vendy-2197a.firebasestorage.app",
  messagingSenderId: "104352879025",
  appId: "1:104352879025:web:0cdbb707e59acd1f872d90",
  measurementId: "G-1YV4H6Z2M4"
};

// Initialize Firebase once
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with ignoreUndefinedProperties to prevent setDoc crashes on optional fields
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

// Initialize analytics safely if supported
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    try {
      return getAnalytics(app);
    } catch {
      return null;
    }
  }
  return null;
};
