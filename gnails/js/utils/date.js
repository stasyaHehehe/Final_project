// Работа с датами. 

export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const WEEKDAYS_MON_FIRST = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_SUN_FIRST = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const pad = (n) => String(n).padStart(2, '0');

export const makeDateKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month: month - 1, day };
}

export function weekdayOf(key) {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

export function addDays(key, amount) {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month, day + amount));
  return makeDateKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getNowInZone(timeZone, instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    date: makeDateKey(get('year'), get('month') - 1, get('day')),
    minutes: get('hour') * 60 + get('minute'),
  };
}

export function formatDateLong(key) {
  const { month, day } = parseDateKey(key);
  return `${day} ${MONTHS_GENITIVE[month]}, ${WEEKDAYS_SUN_FIRST[weekdayOf(key)]}`;
}

export function formatDateShort(key) {
  const { month, day } = parseDateKey(key);
  return `${day} ${MONTHS_GENITIVE[month]}`;
}
