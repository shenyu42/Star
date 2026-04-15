import {
  getMissingFirebaseConfigFields,
  isFirebaseConfigured
} from './firebase.js';
import {
  ensureUserProfile,
  logout,
  observeAuthState,
  subscribeToUserProfile
} from './auth.js';
import { createCouple, joinCoupleByPairCode, subscribeToCouple } from './couple.js';
import {
  createEvent,
  deleteEvent,
  subscribeToEventsByCouple,
  updateEvent
} from './events.js';
import { addScore, updatePetExp, updatePetField } from './pet.js';
import { subscribeToPhotosByCouple, uploadPhoto } from './photos.js';
import {
  clearChildren,
  formatDateTime,
  redirectTo,
  renderFirebaseNotice,
  setFormDisabled,
  setMessage,
  toDatetimeLocalValue
} from './ui.js';

const state = {
  couple: null,
  events: [],
  petAnimation: null,
  petAnimationPath: null,
  photos: [],
  profile: null,
  user: null,
  unsubscribeCouple: null,
  unsubscribeEvents: null,
  unsubscribePhotos: null,
  unsubscribeProfile: null
};

const elements = {
  addExpButton: document.querySelector('#addExpButton'),
  addScoreButton: document.querySelector('#addScoreButton'),
  appFirebaseNotice: document.querySelector('#appFirebaseNotice'),
  appStatus: document.querySelector('#appStatus'),
  cancelEditButton: document.querySelector('#cancelEditButton'),
  coupleMessage: document.querySelector('#coupleMessage'),
  coupleStatusText: document.querySelector('#coupleStatusText'),
  createCoupleButton: document.querySelector('#createCoupleButton'),
  eventForm: document.querySelector('#eventForm'),
  eventId: document.querySelector('#eventId'),
  eventMessage: document.querySelector('#eventMessage'),
  eventsList: document.querySelector('#eventsList'),
  joinCoupleForm: document.querySelector('#joinCoupleForm'),
  logoutButton: document.querySelector('#logoutButton'),
  memberCountValue: document.querySelector('#memberCountValue'),
  pairActions: document.querySelector('#pairActions'),
  pairCodeValue: document.querySelector('#pairCodeValue'),
  petAnimation: document.querySelector('#petAnimation'),
  petExp: document.querySelector('#petExp'),
  petExpBar: document.querySelector('#petExpBar'),
  petLevel: document.querySelector('#petLevel'),
  petMessage: document.querySelector('#petMessage'),
  petName: document.querySelector('#petName'),
  petNameInput: document.querySelector('#petNameInput'),
  petPlaceholder: document.querySelector('#petPlaceholder'),
  petSkin: document.querySelector('#petSkin'),
  petSkinSelect: document.querySelector('#petSkinSelect'),
  photoFile: document.querySelector('#photoFile'),
  photoForm: document.querySelector('#photoForm'),
  photoMessage: document.querySelector('#photoMessage'),
  photosList: document.querySelector('#photosList'),
  savePetNameButton: document.querySelector('#savePetNameButton'),
  savePetSkinButton: document.querySelector('#savePetSkinButton'),
  saveEventButton: document.querySelector('#saveEventButton'),
  scoreValue: document.querySelector('#scoreValue'),
  userEmail: document.querySelector('#userEmail')
};

const PET_EXP_PER_LEVEL = 20;
const LOTTIE_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
let lottieLoaderPromise = null;

function resetSubscriptions() {
  const unsubscribers = [
    state.unsubscribeCouple,
    state.unsubscribeEvents,
    state.unsubscribePhotos
  ];

  unsubscribers.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });

  state.unsubscribeCouple = null;
  state.unsubscribeEvents = null;
  state.unsubscribePhotos = null;
}

function resetEventForm() {
  elements.eventForm.reset();
  elements.eventId.value = '';
  elements.saveEventButton.textContent = '儲存事件';
  elements.cancelEditButton.hidden = true;
}

function renderEventEmptyState(message) {
  clearChildren(elements.eventsList);
  const item = document.createElement('li');
  item.className = 'item-card muted-text';
  item.textContent = message;
  elements.eventsList.appendChild(item);
}

function renderPhotoEmptyState(message) {
  clearChildren(elements.photosList);
  const item = document.createElement('li');
  item.className = 'photo-card muted-text';
  item.textContent = message;
  elements.photosList.appendChild(item);
}

function renderPetPlaceholder(message) {
  if (!elements.petPlaceholder) {
    return;
  }

  elements.petPlaceholder.textContent = message;
  elements.petPlaceholder.hidden = false;
}

function renderPet() {
  const couple = state.couple;

  if (!couple) {
    elements.scoreValue.textContent = '—';
    elements.petName.textContent = '—';
    elements.petLevel.textContent = '—';
    elements.petExp.textContent = '—';
    elements.petSkin.textContent = '—';
    elements.petExpBar.style.width = '0%';
    renderPetAnimation('default');
    return;
  }

  elements.scoreValue.textContent = couple.score ?? 0;

  const pet = couple.pet || {};
  const exp = Number(pet.exp ?? 0);
  const progress = Math.max(0, Math.min(exp / PET_EXP_PER_LEVEL, 1)) * 100;

  elements.petName.textContent = pet.name || '—';
  elements.petLevel.textContent = pet.level ?? '—';
  elements.petExp.textContent = `${exp} / ${PET_EXP_PER_LEVEL}`;
  elements.petSkin.textContent = pet.skin || '—';
  elements.petExpBar.style.width = `${progress}%`;
  renderPetAnimation(pet.skin || 'default');
}

function getPetAnimationCandidates(skin) {
  const normalizedSkin = typeof skin === 'string' && skin.trim() ? skin.trim() : 'default';

  return Array.from(new Set([
    `./images/pets/pet-${normalizedSkin}.json`,
    './images/pets/pet-default.json'
  ]));
}

function ensureLottieLoaded() {
  if (window.lottie) {
    return Promise.resolve(window.lottie);
  }

  if (lottieLoaderPromise) {
    return lottieLoaderPromise;
  }

  lottieLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-lottie-loader="true"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.lottie), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          lottieLoaderPromise = null;
          reject(new Error('寵物動畫載入失敗。'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = LOTTIE_CDN_URL;
    script.async = true;
    script.dataset.lottieLoader = 'true';
    script.onload = () => {
      if (window.lottie) {
        resolve(window.lottie);
        return;
      }

      lottieLoaderPromise = null;
      reject(new Error('寵物動畫載入失敗。'));
    };
    script.onerror = () => {
      lottieLoaderPromise = null;
      reject(new Error('寵物動畫載入失敗。'));
    };
    document.head.appendChild(script);
  });

  return lottieLoaderPromise;
}

async function fetchPetAnimationData(skin) {
  const candidates = getPetAnimationCandidates(skin);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);

      if (!response.ok) {
        throw new Error(`Animation missing: ${candidate}`);
      }

      return {
        animationData: await response.json(),
        path: candidate
      };
    } catch (error) {
      continue;
    }
  }

  throw new Error('找不到可用的寵物動畫。');
}

async function renderPetAnimation(skin) {
  if (!elements.petAnimation || !elements.petPlaceholder) {
    return;
  }

  if (!state.petAnimation) {
    renderPetPlaceholder('寵物載入中');
  }

  try {
    const [{ animationData, path }, lottie] = await Promise.all([
      fetchPetAnimationData(skin),
      ensureLottieLoaded()
    ]);

    if (state.petAnimation && state.petAnimationPath === path) {
      elements.petPlaceholder.hidden = true;
      return;
    }

    if (state.petAnimation) {
      state.petAnimation.destroy();
    }

    elements.petAnimation.innerHTML = '';
    state.petAnimation = lottie.loadAnimation({
      container: elements.petAnimation,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData
    });
    state.petAnimationPath = path;
    elements.petPlaceholder.hidden = true;
  } catch (error) {
    if (state.petAnimation) {
      state.petAnimation.destroy();
      state.petAnimation = null;
      state.petAnimationPath = null;
    }

    elements.petAnimation.innerHTML = '';
    renderPetPlaceholder('寵物展示暫時無法載入。');
  }
}

function renderEvents() {
  clearChildren(elements.eventsList);

  if (!state.profile?.coupleId) {
    renderEventEmptyState('請先建立或加入情侶配對，才能新增事件。');
    return;
  }

  if (!state.events.length) {
    renderEventEmptyState('目前還沒有事件，先新增第一個共同計畫吧。');
    return;
  }

  state.events.forEach((eventItem) => {
    const item = document.createElement('li');
    item.className = 'item-card event-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'item-title-row';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'event-title-block';
    const title = document.createElement('strong');
    title.textContent = eventItem.title;

    const timing = document.createElement('p');
    timing.className = 'item-meta';
    timing.textContent = `${formatDateTime(eventItem.startAt, eventItem.allDay)} -> ${formatDateTime(
      eventItem.endAt,
      eventItem.allDay
    )}`;

    titleBlock.append(title, timing);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary-button small-button';
    editButton.textContent = '編輯';
    editButton.dataset.action = 'edit-event';
    editButton.dataset.eventId = eventItem.id;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger-button small-button';
    deleteButton.textContent = '刪除';
    deleteButton.dataset.action = 'delete-event';
    deleteButton.dataset.eventId = eventItem.id;

    actions.append(editButton, deleteButton);
    titleRow.append(titleBlock, actions);
    item.appendChild(titleRow);

    if (eventItem.note) {
      const note = document.createElement('p');
      note.className = 'item-meta';
      note.textContent = eventItem.note;
      item.appendChild(note);
    }

    elements.eventsList.appendChild(item);
  });
}

function renderPhotos() {
  clearChildren(elements.photosList);

  if (!state.profile?.coupleId) {
    renderPhotoEmptyState('請先建立或加入情侶配對，才能上傳照片。');
    return;
  }

  if (!state.photos.length) {
    renderPhotoEmptyState('目前還沒有上傳任何照片。');
    return;
  }

  state.photos.forEach((photoItem) => {
    const item = document.createElement('li');
    item.className = 'photo-card';

    const frame = document.createElement('div');
    frame.className = 'photo-frame';

    const image = document.createElement('img');
    image.src = photoItem.downloadURL;
    image.alt = photoItem.originalFileName || '已上傳照片';
    image.loading = 'lazy';

    frame.appendChild(image);
    item.appendChild(frame);

    const body = document.createElement('div');
    body.className = 'photo-body';

    const name = document.createElement('strong');
    name.textContent = photoItem.originalFileName || '已上傳照片';
    body.appendChild(name);

    const meta = document.createElement('p');
    meta.className = 'photo-meta';
    meta.textContent = `上傳時間：${formatDateTime(photoItem.createdAt)}`;
    body.appendChild(meta);

    const link = document.createElement('a');
    link.className = 'photo-link';
    link.href = photoItem.downloadURL;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = '查看';
    body.appendChild(link);

    item.appendChild(body);

    elements.photosList.appendChild(item);
  });
}

function renderCoupleState() {
  const coupleId = state.profile?.coupleId || '';
  const memberCount = state.couple?.memberUids?.length || 0;
  const configured = isFirebaseConfigured();

  if (!coupleId) {
    elements.coupleStatusText.textContent = '尚未建立或加入配對';
    elements.pairCodeValue.textContent = '請先建立配對';
    elements.memberCountValue.textContent = '0';
    elements.pairActions.hidden = false;
    setFormDisabled(elements.eventForm, true);
    setFormDisabled(elements.photoForm, true);
    return;
  }

  elements.coupleStatusText.textContent = state.couple ? '已連結' : '已綁定配對，正在載入資料...';
  elements.pairCodeValue.textContent = coupleId;
  elements.memberCountValue.textContent = String(memberCount);
  elements.pairActions.hidden = true;
  setFormDisabled(elements.eventForm, !configured);
  setFormDisabled(elements.photoForm, !configured);
}

function syncCoupleSubscriptions(coupleId) {
  resetSubscriptions();

  if (!coupleId) {
    state.couple = null;
    state.events = [];
    state.photos = [];
    renderCoupleState();
    renderPet();
    renderEvents();
    renderPhotos();
    return;
  }

  state.unsubscribeCouple = subscribeToCouple(coupleId, (couple) => {
    state.couple = couple;
    renderCoupleState();
    renderPet();
  });

  state.unsubscribeEvents = subscribeToEventsByCouple(coupleId, (events) => {
    state.events = events;
    renderEvents();
  });

  state.unsubscribePhotos = subscribeToPhotosByCouple(coupleId, (photos) => {
    state.photos = photos;
    renderPhotos();
  });
}

function findEventById(eventId) {
  return state.events.find((eventItem) => eventItem.id === eventId) || null;
}

function populateEventForm(eventItem) {
  elements.eventId.value = eventItem.id;
  elements.eventForm.elements.title.value = eventItem.title;
  elements.eventForm.elements.startAt.value = toDatetimeLocalValue(eventItem.startAt);
  elements.eventForm.elements.endAt.value = toDatetimeLocalValue(eventItem.endAt);
  elements.eventForm.elements.allDay.checked = Boolean(eventItem.allDay);
  elements.eventForm.elements.note.value = eventItem.note || '';
  elements.saveEventButton.textContent = '更新事件';
  elements.cancelEditButton.hidden = false;
}

function disableAppIfNeeded() {
  const configured = isFirebaseConfigured();
  const missingFields = getMissingFirebaseConfigFields();

  renderFirebaseNotice(elements.appFirebaseNotice, missingFields);
  setFormDisabled(elements.eventForm, !configured);
  setFormDisabled(elements.photoForm, !configured);
  elements.createCoupleButton.disabled = !configured;
  setFormDisabled(elements.joinCoupleForm, !configured);
}

async function handleCreateCouple() {
  setMessage(elements.coupleMessage, '', 'info');

  try {
    const pairCode = await createCouple();
    setMessage(elements.coupleMessage, `情侶配對建立成功，請分享配對碼：${pairCode}`, 'success');
  } catch (error) {
    setMessage(elements.coupleMessage, error.message, 'error');
  }
}

async function handleJoinCouple(event) {
  event.preventDefault();
  setMessage(elements.coupleMessage, '', 'info');

  const formData = new FormData(elements.joinCoupleForm);

  try {
    const pairCode = await joinCoupleByPairCode(formData.get('pairCode'));
    elements.joinCoupleForm.reset();
    setMessage(elements.coupleMessage, `成功加入配對：${pairCode}`, 'success');
  } catch (error) {
    setMessage(elements.coupleMessage, error.message, 'error');
  }
}

async function handleEventSubmit(event) {
  event.preventDefault();
  setMessage(elements.eventMessage, '', 'info');

  if (!state.profile?.coupleId) {
    setMessage(elements.eventMessage, '請先建立或加入情侶配對。', 'warning');
    return;
  }

  const formData = new FormData(elements.eventForm);
  const payload = {
    coupleId: state.profile.coupleId,
    title: String(formData.get('title') || ''),
    startAt: String(formData.get('startAt') || ''),
    endAt: String(formData.get('endAt') || ''),
    allDay: formData.get('allDay') === 'on',
    note: String(formData.get('note') || '')
  };

  try {
    if (elements.eventId.value) {
      await updateEvent(elements.eventId.value, payload);
      setMessage(elements.eventMessage, '事件更新成功。', 'success');
    } else {
      await createEvent(payload);
      setMessage(elements.eventMessage, '事件建立成功。', 'success');
    }

    resetEventForm();
  } catch (error) {
    setMessage(elements.eventMessage, error.message, 'error');
  }
}

async function handleEventListClick(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const eventId = target.dataset.eventId;

  if (!action || !eventId) {
    return;
  }

  if (action === 'edit-event') {
    const eventItem = findEventById(eventId);

    if (eventItem) {
      populateEventForm(eventItem);
      setMessage(elements.eventMessage, '已載入事件，修改後記得儲存。', 'info');
    }

    return;
  }

  if (action === 'delete-event') {
    const confirmed = window.confirm('確定要刪除這個事件嗎？');

    if (!confirmed) {
      return;
    }

    try {
      await deleteEvent(eventId, state.profile?.coupleId);
      setMessage(elements.eventMessage, '事件已刪除。', 'success');

      if (elements.eventId.value === eventId) {
        resetEventForm();
      }
    } catch (error) {
      setMessage(elements.eventMessage, error.message, 'error');
    }
  }
}

async function handlePhotoSubmit(event) {
  event.preventDefault();
  setMessage(elements.photoMessage, '', 'info');

  if (!state.profile?.coupleId) {
    setMessage(elements.photoMessage, '請先建立或加入情侶配對。', 'warning');
    return;
  }

  const file = elements.photoFile.files?.[0];

  try {
    await uploadPhoto(file, state.profile.coupleId);
    elements.photoForm.reset();
    setMessage(elements.photoMessage, '照片上傳成功。', 'success');
  } catch (error) {
    setMessage(elements.photoMessage, error.message, 'error');
  }
}

async function handleLogout() {
  try {
    await logout();
    redirectTo('./index.html');
  } catch (error) {
    setMessage(elements.appStatus, error.message, 'error');
  }
}

function bindEvents() {
  elements.createCoupleButton.addEventListener('click', handleCreateCouple);
  elements.joinCoupleForm.addEventListener('submit', handleJoinCouple);
  elements.eventForm.addEventListener('submit', handleEventSubmit);
  elements.addScoreButton.addEventListener('click', async () => {
    if (!state.profile?.coupleId) {
      return;
    }

    try {
      await addScore(state.profile.coupleId, 10);
    } catch (error) {
      setMessage(elements.petMessage, error.message, 'error');
    }
  });
  elements.addExpButton.addEventListener('click', async () => {
    if (!state.profile?.coupleId) {
      return;
    }

    try {
      await updatePetExp(state.profile.coupleId, 5);
    } catch (error) {
      setMessage(elements.petMessage, error.message, 'error');
    }
  });
  elements.savePetNameButton.addEventListener('click', async () => {
    if (!state.profile?.coupleId) {
      return;
    }

    const name = elements.petNameInput.value.trim();

    if (!name) {
      return;
    }

    try {
      await updatePetField(state.profile.coupleId, { name });
      elements.petNameInput.value = '';
      setMessage(elements.petMessage, '名稱已更新。', 'success');
    } catch (error) {
      setMessage(elements.petMessage, error.message, 'error');
    }
  });
  elements.savePetSkinButton.addEventListener('click', async () => {
    if (!state.profile?.coupleId) {
      return;
    }

    const skin = elements.petSkinSelect.value;

    try {
      await updatePetField(state.profile.coupleId, { skin });
      setMessage(elements.petMessage, '外觀已更新。', 'success');
    } catch (error) {
      setMessage(elements.petMessage, error.message, 'error');
    }
  });
  elements.cancelEditButton.addEventListener('click', () => {
    resetEventForm();
    setMessage(elements.eventMessage, '已取消編輯。', 'info');
  });
  elements.eventsList.addEventListener('click', handleEventListClick);
  elements.photoForm.addEventListener('submit', handlePhotoSubmit);
  elements.logoutButton.addEventListener('click', handleLogout);
}

function startAuthGuard() {
  observeAuthState(async (user) => {
    if (!user) {
      redirectTo('./index.html');
      return;
    }

    state.user = user;
    elements.userEmail.textContent = user.email || user.uid;

    try {
      await ensureUserProfile(user);
    } catch (error) {
      setMessage(elements.appStatus, error.message, 'error');
      return;
    }

    if (typeof state.unsubscribeProfile === 'function') {
      state.unsubscribeProfile();
    }

    state.unsubscribeProfile = subscribeToUserProfile(user.uid, (profile) => {
      state.profile = profile;
      syncCoupleSubscriptions(profile?.coupleId || null);
      renderCoupleState();
    });
  });
}

disableAppIfNeeded();
resetEventForm();
renderCoupleState();
renderEvents();
renderPhotos();
renderPet();
bindEvents();
startAuthGuard();
