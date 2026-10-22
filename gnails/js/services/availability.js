// Логика доступного времени. Чистые функции без DOM — их использует и браузер, и server.js.

import { addDays, timeToMinutes, weekdayOf } from '../utils/date.js';

export const slotKey = (date, time) => `${date}T${time}`;

export function getScheduledSlots(schedule, date) {
  if (schedule.daysOff?.includes(date)) return [];
  return schedule.weekly[String(weekdayOf(date))] ?? [];
}

export function getFreeSlots(db, date, now) {
  const { schedule } = db;
  if (date < now.date || date > addDays(now.date, schedule.daysAhead)) return [];

  const booked = new Set(db.booked);
  return getScheduledSlots(schedule, date).filter((time) => {
    if (booked.has(slotKey(date, time))) return false;
    const isPast = date === now.date && timeToMinutes(time) < now.minutes + schedule.minLeadMinutes;
    return !isPast;
  });
}

export const isSlotFree = (db, date, time, now) => getFreeSlots(db, date, now).includes(time);

export function getFreeSlotsByDate(db, now) {
  const result = {};
  for (let i = 0; i <= db.schedule.daysAhead; i += 1) {
    const date = addDays(now.date, i);
    const slots = getFreeSlots(db, date, now);
    if (slots.length > 0) result[date] = slots;
  }
  return result;
}

export function getSlotStates(db, date, now) {
  const free = new Set(getFreeSlots(db, date, now));
  const booked = new Set(db.booked);
  return getScheduledSlots(db.schedule, date).map((time) => {
    let status = 'past';
    if (free.has(time)) status = 'free';
    else if (booked.has(slotKey(date, time))) status = 'booked';
    return { time, status };
  });
}

export function getSlotStatuses(db, date, now) {
  const free = new Set(getFreeSlots(db, date, now));
  const booked = new Set(db.booked);
  return getScheduledSlots(db.schedule, date).map((time) => ({
    time,
    status: free.has(time) ? 'free' : booked.has(slotKey(date, time)) ? 'booked' : 'past',
  }));
}
