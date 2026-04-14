import {
  auth,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  db,
  doc,
  ensureFirebaseConfigured,
  getDoc,
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  setDoc,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateDoc
} from './firebase.js';

async function enableLocalPersistence() {
  ensureFirebaseConfigured();
  await setPersistence(auth, browserLocalPersistence);
}

async function ensureUserProfile(user) {
  ensureFirebaseConfigured();

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const nextEmail = user.email || '';
  const nextDisplayName = user.displayName || '';

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: nextEmail,
      displayName: nextDisplayName,
      coupleId: null,
      createdAt: serverTimestamp()
    });

    return {
      uid: user.uid,
      email: nextEmail,
      displayName: nextDisplayName,
      coupleId: null
    };
  }

  const data = snapshot.data();
  const updates = {};

  if (data.uid !== user.uid) {
    updates.uid = user.uid;
  }

  if (data.email !== nextEmail) {
    updates.email = nextEmail;
  }

  if (data.displayName !== nextDisplayName) {
    updates.displayName = nextDisplayName;
  }

  if (!Object.prototype.hasOwnProperty.call(data, 'coupleId')) {
    updates.coupleId = null;
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(userRef, updates);
  }

  return {
    id: snapshot.id,
    ...data,
    ...updates
  };
}

async function register(email, password) {
  await enableLocalPersistence();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

async function login(email, password) {
  await enableLocalPersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

async function logout() {
  ensureFirebaseConfigured();
  await signOut(auth);
}

function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

function getCurrentUser() {
  return auth.currentUser;
}

function requireCurrentUser() {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('You must be signed in.');
  }

  return user;
}

async function getUserProfile(uid = requireCurrentUser().uid) {
  ensureFirebaseConfigured();
  const snapshot = await getDoc(doc(db, 'users', uid));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

async function requireCurrentUserProfile(expectedCoupleId = null) {
  const user = requireCurrentUser();
  await ensureUserProfile(user);
  const profile = await getUserProfile(user.uid);

  if (!profile) {
    throw new Error('User profile was not found.');
  }

  if (expectedCoupleId && profile.coupleId !== expectedCoupleId) {
    throw new Error('You do not have access to this couple.');
  }

  return profile;
}

function subscribeToUserProfile(uid, callback) {
  ensureFirebaseConfigured();
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snapshot.id,
      ...snapshot.data()
    });
  });
}

export {
  ensureUserProfile,
  getCurrentUser,
  getUserProfile,
  login,
  logout,
  observeAuthState,
  register,
  requireCurrentUser,
  requireCurrentUserProfile,
  subscribeToUserProfile
};
