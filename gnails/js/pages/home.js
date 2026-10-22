// Главная страница: календарь доступного времени.

import { qs } from '../utils/dom.js';
import { getNowInZone } from '../utils/date.js';
import { createStorage } from '../services/storage.js';
import { Calendar } from '../components/calendar.js';
import { initHeader } from '../components/header.js';
import { REFRESH_INTERVAL_MS } from '../config.js';

initHeader();

async function init() {
  const root = qs('#calendar');
  try {
    const storage = await createStorage();
    const db = await storage.load();
    const calendar = new Calendar(root, { db, now: getNowInZone(db.schedule.timeZone), variant: 'page', autoSelect: true });

    // Раз в минуту подтягиваем свежие данные: если кто-то занял время, оно пропадёт из календаря
    setInterval(async () => {
      try {
        const fresh = await storage.load();
        calendar.refresh(fresh, getNowInZone(fresh.schedule.timeZone));
      } catch { /* оставляем прежние данные */ }
    }, REFRESH_INTERVAL_MS);
  } catch (error) {
    console.error(error);
    root.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'calendar__error',
      textContent: 'Не удалось загрузить свободное время. Обновите страницу или попробуйте позже.',
    }));
  }
}

init();
