import {
  deleteDoc,
  db,
  doc,
  ensureFirebaseConfigured,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc
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

  throw new Error('目前無法產生唯一配對碼，請稍後再試。');
}

async function createCouple() {
  ensureFirebaseConfigured();

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile();

  if (profile.coupleId) {
    throw new Error('你已經屬於一組情侶配對。');
  }

  const pairCode = await getAvailablePairCode();
  const userRef = doc(db, 'users', user.uid);
  const coupleRef = doc(db, 'couples', pairCode);

  await runTransaction(db, async (transaction) => {
    const freshUserSnapshot = await transaction.get(userRef);

    if (!freshUserSnapshot.exists()) {
      throw new Error('找不到你的使用者資料。');
    }

    if (freshUserSnapshot.data().coupleId) {
      throw new Error('你已經屬於一組情侶配對。');
    }

    const freshCoupleSnapshot = await transaction.get(coupleRef);

    if (freshCoupleSnapshot.exists()) {
      throw new Error('配對碼發生重複，請再試一次。');
    }

    transaction.set(coupleRef, {
      id: pairCode,
      pairCode,
      memberUids: [user.uid],
      score: 0,
      pet: {
        name: 'Star',
        level: 1,
        exp: 0,
        skin: 'default'
      },
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
    throw new Error('你已經屬於一組情侶配對。');
  }

  const pairCode = normalizePairCode(pairCodeInput);

  if (pairCode.length < 6) {
    throw new Error('請輸入有效的配對碼。');
  }

  const userRef = doc(db, 'users', user.uid);
  const coupleRef = doc(db, 'couples', pairCode);

  await runTransaction(db, async (transaction) => {
    const freshUserSnapshot = await transaction.get(userRef);
    const freshCoupleSnapshot = await transaction.get(coupleRef);

    if (!freshUserSnapshot.exists()) {
      throw new Error('找不到你的使用者資料。');
    }

    if (freshUserSnapshot.data().coupleId) {
      throw new Error('你已經屬於一組情侶配對。');
    }

    if (!freshCoupleSnapshot.exists()) {
      throw new Error('找不到這組配對碼。');
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
      throw new Error('這組情侶配對已經有兩位成員。');
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

function getPartnerUid(couple, currentUid) {
  if (!couple || !Array.isArray(couple.memberUids)) {
    return null;
  }

  return couple.memberUids.find((uid) => uid !== currentUid) || null;
}

function subscribeToPartnerProfile(couple, currentUid, callback) {
  ensureFirebaseConfigured();

  const partnerUid = getPartnerUid(couple, currentUid);

  if (!partnerUid) {
    callback(null);
    return () => {};
  }

  return onSnapshot(doc(db, 'users', partnerUid), (snapshot) => {
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

async function uncouple(coupleId) {
  ensureFirebaseConfigured();

  if (!coupleId) {
    throw new Error('目前沒有可以解除的配對。');
  }

  const user = requireCurrentUser();
  await requireCurrentUserProfile(coupleId);

  const userRef = doc(db, 'users', user.uid);
  const coupleRef = doc(db, 'couples', coupleId);
  const coupleSnapshot = await getDoc(coupleRef);

  if (!coupleSnapshot.exists()) {
    throw new Error('找不到這組配對資料。');
  }

  const couple = coupleSnapshot.data();
  const memberUids = Array.isArray(couple.memberUids) ? couple.memberUids : [];

  if (!memberUids.includes(user.uid)) {
    throw new Error('你沒有解除這組配對的權限。');
  }

  await updateDoc(userRef, {
    coupleId: null
  });
  await deleteDoc(coupleRef);
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
  getPartnerUid,
  joinCoupleByPairCode,
  normalizePairCode,
  subscribeToCouple,
  subscribeToPartnerProfile,
  uncouple
};
