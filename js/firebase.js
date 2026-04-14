import {
  getApp,
  getApps,
  initializeApp
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js';

// Paste your Firebase Web app config here before testing the app.
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and config.
const firebaseConfig = {
  apiKey: 'REPLACE_WITH_API_KEY',
  authDomain: 'REPLACE_WITH_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
  // measurementId: 'REPLACE_WITH_MEASUREMENT_ID'
};

const REQUIRED_CONFIG_FIELDS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function hasRealConfigValue(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.startsWith('REPLACE_WITH_');
}

function getMissingFirebaseConfigFields() {
  return REQUIRED_CONFIG_FIELDS.filter((field) => !hasRealConfigValue(firebaseConfig[field]));
}

function isFirebaseConfigured() {
  return getMissingFirebaseConfigFields().length === 0;
}

function ensureFirebaseConfigured() {
  if (isFirebaseConfigured()) {
    return;
  }

  const missingFields = getMissingFirebaseConfigFields().join(', ');
  throw new Error(`Fill firebaseConfig in js/firebase.js before using the app. Missing: ${missingFields}`);
}

export {
  addDoc,
  auth,
  browserLocalPersistence,
  collection,
  createUserWithEmailAndPassword,
  db,
  deleteDoc,
  doc,
  ensureFirebaseConfigured,
  getDoc,
  getDocs,
  getDownloadURL,
  getMissingFirebaseConfigFields,
  isFirebaseConfigured,
  limit,
  onAuthStateChanged,
  onSnapshot,
  query,
  ref as storageRef,
  runTransaction,
  serverTimestamp,
  setDoc,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  storage,
  Timestamp,
  updateDoc,
  uploadBytes,
  where
};
