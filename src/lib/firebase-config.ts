
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

// Validate essential config values
if (!apiKey) {
  throw new Error("Firebase Configuration Error: Missing Firebase API Key. Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env file.");
}
if (!authDomain) {
  throw new Error("Firebase Configuration Error: Missing Firebase Auth Domain. Please set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN in your .env file.");
}
if (!projectId) {
  throw new Error("Firebase Configuration Error: Missing Firebase Project ID. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.");
}

if (!databaseURL) {
  throw new Error(
    "Firebase Configuration Error: Missing Firebase Database URL. Please set NEXT_PUBLIC_FIREBASE_DATABASE_URL in your .env file. " +
    "It should look like 'https://your-project-id-default-rtdb.firebaseio.com' or 'https://your-project-id-default-rtdb.your-region.firebasedatabase.app'."
  );
}

if (!databaseURL.startsWith('https://') || !(databaseURL.endsWith('.firebaseio.com') || databaseURL.endsWith('.firebasedatabase.app'))) {
    throw new Error(
    "Firebase Configuration Error: Invalid Firebase Database URL format in NEXT_PUBLIC_FIREBASE_DATABASE_URL. " +
    "It should start with 'https://' and end with '.firebaseio.com' or '.firebasedatabase.app'. Received: " + databaseURL
  );
}

const firebaseConfig = {
  apiKey: "AIzaSyDIIvpEP2LZy9Ac_4IbaUbww3YdcaXjC4k",
  authDomain: "cho1-26107.firebaseapp.com",
  databaseURL: "https://cho1-26107-default-rtdb.firebaseio.com",
  projectId: "cho1-26107",
  storageBucket: "cho1-26107.firebasestorage.app",
  messagingSenderId: "1024032392768",
  appId: "1:1024032392768:web:e1c820e8dd50a4d4d081a5",
  measurementId: "G-RJHHHVWTLC"
};

let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
  // Note: Firebase doesn't allow re-initializing an app with a different config.
  // If the app was somehow initialized with an incorrect (or no) databaseURL previously
  // and getApp() returns that instance, it might still cause issues.
  // This setup relies on the initial initializeApp() call being correct.
}

const auth = getAuth(firebaseApp);
// Explicitly pass the database URL to getDatabase for robustness.
const database = getDatabase(firebaseApp, databaseURL);

export { firebaseApp, auth, database };
