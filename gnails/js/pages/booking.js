// Страница «Запись»: форма бронирования времени.

import { qs } from '../utils/dom.js';
import { getNowInZone } from '../utils/date.js';
import { createStorage } from '../services/storage.js';
import { BookingForm } from '../components/bookingForm.js';
import { initHeader } from '../components/header.js';

initHeader();

function initSuccessDialog() {
  const dialog = qs('#success-dialog');
  dialog.querySelector('[data-modal-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return () => dialog.showModal();
}

async function init() {
  const form = qs('#booking-form');
  const showSuccess = initSuccessDialog();
  const params = new URLSearchParams(location.search);

  try {
    const storage = await createStorage();
    const db = await storage.load();
    new BookingForm(form, {
      storage,
      db,
      now: getNowInZone(db.schedule.timeZone),
      preselected: { date: params.get('date'), time: params.get('time') },
      onSuccess: showSuccess,
    });
  } catch (error) {
    console.error(error);
    qs('[data-form-status]', form).textContent = 'Не удалось загрузить свободное время. Обновите страницу или попробуйте позже.';
    form.querySelectorAll('input, button').forEach((control) => { control.disabled = true; });
  }
}

init();
