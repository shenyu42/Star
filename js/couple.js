import {
  db,
  doc,
  ensureFirebaseConfigured,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from './firebase.js';
import { requireCurrentUser, requireCurrentUserProfile } from './auth.js';

const PAIR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIR_CODE_LENGTH = 8;
const MAX_PAIR_CODE_ATTEMPTS = 8;

function generatePairCode() {
  const bytes = new Uint32Array(PAIR_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (value) => PAIR_CODE_ALPHABET[value % PAIR_CODE_ALPHABET.length]).join('');
}

function normalizePairCode(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function getAvailablePairCode() {
  ensureFirebaseConfigured();

  for (let attempt = 0; attempt < MAX_PAIR_CODE_ATTEMPTS; attempt += 1) {
    const pairCode = generatePairCode();
    const snapshot = await getDoc(doc(db, 'couples', pairCode));

    if (!snapshot.exists()) {
      return pairCode;
    }
  }

  throw new Error('Could not generate a unique pair code. Please try again.');
}

async function createCouple() {
  ensureFirebaseConfigured();

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile();

  if (profile.coupleId) {
    throw new Error('You already belong to a couple.');
  }

  const pairCode = await getAvailablePairCode();
  const userRef = doc(db, 'users', user.uid);
  const coupleRef = doc(db, 'couples', pairCode);

  await runTransaction(db, async (transaction) => {
    const freshUserSnapshot = await transaction.get(userRef);

    if (!freshUserSnapshot.exists()) {
      throw new Error('Your user profile is missing.');
    }

    if (freshUserSnapshot.data().coupleId) {
      throw new Error('You already belong to a couple.');
    }

    const freshCoupleSnapshot = await transaction.get(coupleRef);

    if (freshCoupleSnapshot.exists()) {
      throw new Error('Pair code collision detected. Please try again.');
    }

    transaction.set(coupleRef, {
      id: pairCode,
      pairCode,
      memberUids: [user.uid],
      createdAt: serverTimestamp()
    });

    transaction.update(userRef, {
      coupleId: pairCode
    });
  });

  return pairCode;
}

async function joinCoupleByPairCode(pairCodeInput) {
  ensureFirebaseConfigured();

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile();

  if (profile.coupleId) {
    throw new Error('You already belong to a couple.');
  }

  const pairCode = normalizePairCode(pairCodeInput);

  if (pairCode.length < 6) {
    throw new Error('Please enter a valid pair code.');
  }

  const userRef = doc(db, 'users', user.uid);
  const coupleRef = doc(db, 'couples', pairCode);

  await runTransaction(db, async (transaction) => {
    const freshUserSnapshot = await transaction.get(userRef);
    const freshCoupleSnapshot = await transaction.get(coupleRef);

    if (!freshUserSnapshot.exists()) {
      throw new Error('Your user profile is missing.');
    }

    if (freshUserSnapshot.data().coupleId) {
      throw new Error('You already belong to a couple.');
    }

    if (!freshCoupleSnapshot.exists()) {
      throw new Error('Pair code was not found.');
    }

    const couple = freshCoupleSnapshot.data();
    const memberUids = Array.isArray(couple.memberUids) ? couple.memberUids : [];

    if (memberUids.includes(user.uid)) {
      transaction.update(userRef, {
        coupleId: pairCode
      });
      return;
    }

    if (memberUids.length >= 2) {
      throw new Error('This couple already has two members.');
    }

    transaction.update(coupleRef, {
      memberUids: [...memberUids, user.uid]
    });

    transaction.update(userRef, {
      coupleId: pairCode
    });
  });

  return pairCode;
}

async function getCouple(coupleId) {
  ensureFirebaseConfigured();

  if (!coupleId) {
    return null;
  }

  const snapshot = await getDoc(doc(db, 'couples', coupleId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

function subscribeToCouple(coupleId, callback) {
  ensureFirebaseConfigured();
  return onSnapshot(doc(db, 'couples', coupleId), (snapshot) => {
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
  createCouple,
  getCouple,
  joinCoupleByPairCode,
  normalizePairCode,
  subscribeToCouple
};
