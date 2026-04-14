function setMessage(element, text = '', tone = 'info') {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.dataset.tone = tone;
  element.hidden = text.trim() === '';
}

function clearChildren(element) {
  if (!element) {
    return;
  }

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function setFormDisabled(form, disabled) {
  if (!form) {
    return;
  }

  const controls = form.querySelectorAll('button, input, select, textarea');
  controls.forEach((control) => {
    control.disabled = disabled;
  });
}

function toDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value, allDay = false) {
  const date = toDate(value);

  if (!date) {
    return '未設定';
  }

  const formatter = allDay
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

  return formatter.format(date);
}

function toDatetimeLocalValue(value) {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function redirectTo(path) {
  const nextUrl = new URL(path, window.location.href);
  window.location.replace(nextUrl);
}

function renderFirebaseNotice(element, missingFields) {
  if (!missingFields.length) {
    setMessage(element, '', 'info');
    return;
  }

  setMessage(
    element,
    `系統連線設定不完整，缺少欄位：${missingFields.join('、')}`,
    'warning'
  );
}

export {
  clearChildren,
  formatDateTime,
  redirectTo,
  renderFirebaseNotice,
  setFormDisabled,
  setMessage,
  toDatetimeLocalValue
};
