
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// These are the primary connection details for your Firebase project.
// It's best practice to load these from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// This is a fallback configuration for the development environment.
// It ensures the application can connect to Firebase even if environment variables are not set.
const fallbackConfig = {
  apiKey: "AIzaSyDIIvpEP2LZy9Ac_4IbaUbww3YdcaXjC4k",
  authDomain: "cho1-26107.firebaseapp.com",
  databaseURL: "https://cho1-26107-default-rtdb.firebaseio.com",
  projectId: "cho1-26107",
  storageBucket: "cho1-26107.appspot.com",
  messagingSenderId: "1024032392768",
  appId: "1:1024032392768:web:e1c820e8dd50a4d4d081a5",
  measurementId: "G-RJHHHVWTLC"
};

// Determine the final configuration, preferring environment variables but using fallback if they're missing.
const finalConfig = {
  apiKey: firebaseConfig.apiKey || fallbackConfig.apiKey,
  authDomain: firebaseConfig.authDomain || fallbackConfig.authDomain,
  databaseURL: firebaseConfig.databaseURL || fallbackConfig.databaseURL,
  projectId: firebaseConfig.projectId || fallbackConfig.projectId,
  storageBucket: firebaseConfig.storageBucket || fallbackConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId || fallbackConfig.messagingSenderId,
  appId: firebaseConfig.appId || fallbackConfig.appId,
  measurementId: firebaseConfig.measurementId || fallbackConfig.measurementId,
};


// Validate essential config values
if (!finalConfig.apiKey || !finalConfig.authDomain || !finalConfig.projectId || !finalConfig.databaseURL) {
  throw new Error("Firebase Configuration Error: Critical Firebase configuration values are missing. Please check your .env file or the fallback configuration.");
}

let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(finalConfig);
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp, finalConfig.databaseURL);

export { firebaseApp, auth, database };
