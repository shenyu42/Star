import {
  getMissingFirebaseConfigFields,
  isFirebaseConfigured
} from './firebase.js';
import { ensureUserProfile, login, observeAuthState, register } from './auth.js';
import {
  redirectTo,
  renderFirebaseNotice,
  setFormDisabled,
  setMessage
} from './ui.js';

const elements = {
  firebaseNotice: document.querySelector('#firebaseNotice'),
  loginForm: document.querySelector('#loginForm'),
  loginStatus: document.querySelector('#loginStatus'),
  registerForm: document.querySelector('#registerForm'),
  registerStatus: document.querySelector('#registerStatus')
};

function disableFormsIfNeeded() {
  const configured = isFirebaseConfigured();
  const missingFields = getMissingFirebaseConfigFields();

  renderFirebaseNotice(elements.firebaseNotice, missingFields);
  setFormDisabled(elements.registerForm, !configured);
  setFormDisabled(elements.loginForm, !configured);
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  setMessage(elements.registerStatus, '', 'info');
  setMessage(elements.loginStatus, '', 'info');

  const formData = new FormData(elements.registerForm);

  try {
    await register(formData.get('email'), formData.get('password'));
    setMessage(elements.registerStatus, '帳號建立成功，正在前往主頁...', 'success');
    redirectTo('./app.html');
  } catch (error) {
    setMessage(elements.registerStatus, error.message, 'error');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  setMessage(elements.registerStatus, '', 'info');
  setMessage(elements.loginStatus, '', 'info');

  const formData = new FormData(elements.loginForm);

  try {
    await login(formData.get('email'), formData.get('password'));
    setMessage(elements.loginStatus, '登入成功，正在前往主頁...', 'success');
    redirectTo('./app.html');
  } catch (error) {
    setMessage(elements.loginStatus, error.message, 'error');
  }
}

function bindEvents() {
  elements.registerForm.addEventListener('submit', handleRegisterSubmit);
  elements.loginForm.addEventListener('submit', handleLoginSubmit);
}

function startAuthGuard() {
  observeAuthState(async (user) => {
    if (!user) {
      return;
    }

    try {
      await ensureUserProfile(user);
      redirectTo('./app.html');
    } catch (error) {
      setMessage(elements.firebaseNotice, error.message, 'error');
    }
  });
}

disableFormsIfNeeded();
bindEvents();
startAuthGuard();
