import {
  Timestamp,
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  ensureFirebaseConfigured,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from './firebase.js';
import { requireCurrentUser, requireCurrentUserProfile } from './auth.js';

function buildTimestamp(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Please provide a valid date and time.');
  }

  return Timestamp.fromDate(parsed);
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

function mapSnapshotToEvents(snapshot) {
  return snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }))
    .sort((left, right) => toMillis(left.startAt) - toMillis(right.startAt));
}

function validateEventInput(input) {
  const title = input.title.trim();

  if (!title) {
    throw new Error('Event title is required.');
  }

  if (!input.startAt) {
    throw new Error('Start time is required.');
  }

  const startAt = buildTimestamp(input.startAt);
  const endAt = input.endAt ? buildTimestamp(input.endAt) : startAt;

  if (endAt.toMillis() < startAt.toMillis()) {
    throw new Error('End time cannot be earlier than start time.');
  }

  return {
    title,
    startAt,
    endAt,
    allDay: Boolean(input.allDay),
    note: input.note.trim()
  };
}

async function createEvent(input) {
  ensureFirebaseConfigured();

  const user = requireCurrentUser();
  const profile = await requireCurrentUserProfile(input.coupleId);
  const payload = validateEventInput(input);

  const docRef = await addDoc(collection(db, 'events'), {
    coupleId: profile.coupleId,
    title: payload.title,
    startAt: payload.startAt,
    endAt: payload.endAt,
    allDay: payload.allDay,
    note: payload.note,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
}

async function getEventsByCouple(coupleId) {
  ensureFirebaseConfigured();
  const profile = await requireCurrentUserProfile(coupleId);
  const eventsQuery = query(collection(db, 'events'), where('coupleId', '==', profile.coupleId));
  const snapshot = await getDocs(eventsQuery);
  return mapSnapshotToEvents(snapshot);
}

async function updateEvent(eventId, input) {
  ensureFirebaseConfigured();
  const profile = await requireCurrentUserProfile(input.coupleId);
  const payload = validateEventInput(input);

  await updateDoc(doc(db, 'events', eventId), {
    coupleId: profile.coupleId,
    title: payload.title,
    startAt: payload.startAt,
    endAt: payload.endAt,
    allDay: payload.allDay,
    note: payload.note,
    updatedAt: serverTimestamp()
  });
}

async function deleteEvent(eventId, coupleId) {
  ensureFirebaseConfigured();
  await requireCurrentUserProfile(coupleId);
  await deleteDoc(doc(db, 'events', eventId));
}

function subscribeToEventsByCouple(coupleId, callback) {
  ensureFirebaseConfigured();
  const eventsQuery = query(collection(db, 'events'), where('coupleId', '==', coupleId));

  return onSnapshot(eventsQuery, (snapshot) => {
    callback(mapSnapshotToEvents(snapshot));
  });
}

export {
  createEvent,
  deleteEvent,
  getEventsByCouple,
  subscribeToEventsByCouple,
  updateEvent
};
