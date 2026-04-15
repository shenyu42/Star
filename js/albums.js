import {
  addDoc,
  collection,
  db,
  ensureFirebaseConfigured,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from './firebase.js';
import { requireCurrentUser, requireCurrentUserProfile } from './auth.js';

function toMillis(timestampValue) {
  if (!timestampValue) {
    return 0;
  }

  if (typeof timestampValue.toMillis === 'function') {
    return timestampValue.toMillis();
  }

  const parsed = new Date(timestampValue);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function mapSnapshotToAlbums(snapshot) {
  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }))
    .sort((left, right) => toMillis(left.createdAt) - toMillis(right.createdAt));
}

async function createAlbum(coupleId, name) {
  ensureFirebaseConfigured();

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile(coupleId);
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    throw new Error('請輸入相簿名稱。');
  }

  const albumRef = await addDoc(collection(db, 'albums'), {
    name: trimmedName,
    coupleId: profile.coupleId,
    createdBy: user.uid,
    createdAt: serverTimestamp()
  });

  return albumRef.id;
}

function subscribeToAlbumsByCouple(coupleId, callback) {
  ensureFirebaseConfigured();
  const albumsQuery = query(collection(db, 'albums'), where('coupleId', '==', coupleId));

  return onSnapshot(albumsQuery, (snapshot) => {
    callback(mapSnapshotToAlbums(snapshot));
  });
}

export {
  createAlbum,
  subscribeToAlbumsByCouple
};
