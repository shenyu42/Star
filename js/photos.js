import {
  addDoc,
  collection,
  db,
  ensureFirebaseConfigured,
  getDocs,
  getDownloadURL,
  onSnapshot,
  query,
  serverTimestamp,
  storage,
  storageRef,
  uploadBytes,
  where
} from './firebase.js';
import { requireCurrentUser, requireCurrentUserProfile } from './auth.js';

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

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

function mapSnapshotToPhotos(snapshot) {
  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }))
    .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
}

function validateImageFile(file) {
  if (!file) {
    throw new Error('請先選擇圖片檔案。');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('只能上傳圖片檔案。');
  }
}

async function uploadPhoto(file, coupleId) {
  ensureFirebaseConfigured();
  validateImageFile(file);

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile(coupleId);
  const safeFileName = sanitizeFileName(file.name || 'photo');
  const storagePath = `photos/${profile.coupleId}/${Date.now()}_${safeFileName}`;
  const fileRef = storageRef(storage, storagePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type
  });

  const downloadURL = await getDownloadURL(fileRef);
  const photoRef = await addDoc(collection(db, 'photos'), {
    coupleId: profile.coupleId,
    storagePath,
    downloadURL,
    uploadedBy: user.uid,
    createdAt: serverTimestamp(),
    originalFileName: file.name || safeFileName,
    contentType: file.type
  });

  return {
    id: photoRef.id,
    storagePath,
    downloadURL
  };
}

async function getPhotosByCouple(coupleId) {
  ensureFirebaseConfigured();
  const profile = await requireCurrentUserProfile(coupleId);
  const photosQuery = query(collection(db, 'photos'), where('coupleId', '==', profile.coupleId));
  const snapshot = await getDocs(photosQuery);
  return mapSnapshotToPhotos(snapshot);
}

function subscribeToPhotosByCouple(coupleId, callback) {
  ensureFirebaseConfigured();
  const photosQuery = query(collection(db, 'photos'), where('coupleId', '==', coupleId));

  return onSnapshot(photosQuery, (snapshot) => {
    callback(mapSnapshotToPhotos(snapshot));
  });
}

export {
  getPhotosByCouple,
  subscribeToPhotosByCouple,
  uploadPhoto,
  validateImageFile
};
