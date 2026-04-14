import {
  getApp,
  getApps,
  initializeApp
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js';

// Firebase Web app config for the star-app-5fbaa project.
const firebaseConfig = {
  apiKey: 'AIzaSyDEbf7BsrbxH8FhQS5svTIFYwKr62EseVA',
  authDomain: 'star-app-5fbaa.firebaseapp.com',
  projectId: 'star-app-5fbaa',
  storageBucket: 'star-app-5fbaa.firebasestorage.app',
  messagingSenderId: '30205271104',
  appId: '1:30205271104:web:957f78a86b7fe5d56d53a5',
  measurementId: 'G-57MV15RWRD'
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
  return typeof value === 'string' && value.trim() !== '';
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
  throw new Error(`Firebase config in js/firebase.js is incomplete. Missing: ${missingFields}`);
}

export {
  addDoc,
  app,
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
