import { API, STATIC_DB_URL, LOCAL_BOOKINGS_KEY } from '../config.js';
import { slotKey, isSlotFree } from './availability.js';
import { getNowInZone } from '../utils/date.js';

export class BookingError extends Error {
  constructor(message, code = 'failed') {
    super(message);
    this.name = 'BookingError';
    this.code = code;
  }
}

class BookingStorage {
  /** @returns {Promise<{schedule: object, booked: string[]}>} */
  async load() {
    throw new Error('Метод load() должен быть реализован в наследнике');
  }

  /** @param {{name: string, phone: string, date: string, time: string}} booking */
  async book(booking) {
    throw new Error('Метод book() должен быть реализован в наследнике');
  }
}

export class ServerStorage extends BookingStorage {
  async load() {
    const response = await fetch(API.slots, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Сервер вернул ${response.status}`);
    return response.json();
  }

  async book(booking) {
    let response;
    try {
      response = await fetch(API.bookings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
    } catch {
      throw new BookingError('Нет связи с сервером. Попробуйте ещё раз.');
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;

    const codes = { 409: 'taken', 400: 'invalid' };
    throw new BookingError(data.error ?? 'Не удалось оформить запись', codes[response.status] ?? 'failed');
  }
}

export class LocalStorageStorage extends BookingStorage {
  #readLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_BOOKINGS_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  #writeLocal(bookings) {
    try {
      localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(bookings));
    } catch {
      throw new BookingError('Браузер не позволяет сохранить запись (localStorage недоступен).');
    }
  }

  async load() {
    const response = await fetch(STATIC_DB_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${STATIC_DB_URL}`);
    const { schedule, bookings = [] } = await response.json();
    const all = [...bookings, ...this.#readLocal()];
    return { schedule, booked: all.map(({ date, time }) => slotKey(date, time)) };
  }

  async book(booking) {
    const db = await this.load();
    const now = getNowInZone(db.schedule.timeZone);
    if (!isSlotFree(db, booking.date, booking.time, now)) {
      throw new BookingError('К сожалению, это время уже занято. Выберите другое.', 'taken');
    }
    this.#writeLocal([...this.#readLocal(), { ...booking, createdAt: new Date().toISOString() }]);
    return { ok: true };
  }
}

export async function createStorage() {
  const server = new ServerStorage();
  try {
    await server.load();
    return server;
  } catch {
    return new LocalStorageStorage();
  }
}
