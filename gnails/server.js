// Мини-сервер без зависимостей: отдаёт сайт и работает с «базой данных» data/db.json.
//   GET  /api/slots     — расписание и занятые слоты (без имён и телефонов клиентов)
//   POST /api/bookings  — создать запись (время блокируется); если время занято — 409
// Запуск: node server.js  (или npm start)

import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateBooking } from './js/utils/validators.js';
import { isSlotFree, slotKey } from './js/services/availability.js';
import { getNowInZone } from './js/utils/date.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = path.join(ROOT, 'data', 'db.json');
const MAX_BODY_BYTES = 10_000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const PUBLIC_PAGES = new Set(['/index.html', '/album.html', '/booking.html']);
const PUBLIC_DIRS = ['/css/', '/js/', '/img/', '/fonts/'];

// ---------- «База данных» ----------

const readDb = async () => JSON.parse(await readFile(DB_PATH, 'utf-8'));

async function writeDb(db) {
  const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, 'utf-8');
  await rename(tmpPath, DB_PATH);
}

let writeQueue = Promise.resolve();
const enqueue = (task) => {
  const result = writeQueue.then(task);
  writeQueue = result.catch(() => {});
  return result;
};

const toPublicDb = (db) => ({
  schedule: db.schedule,
  booked: db.bookings.map(({ date, time }) => slotKey(date, time)),
});

// ---------- Вспомогательные функции HTTP ----------

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Слишком большой запрос'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// ---------- API ----------

async function handleCreateBooking(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch (error) {
    return sendJson(res, error.status ?? 400, { error: 'Некорректный запрос' });
  }

  const { errors, clean } = validateBooking(input ?? {});
  if (!clean) return sendJson(res, 400, { error: Object.values(errors)[0], errors });

  try {
    await enqueue(async () => {
      const db = await readDb();
      const publicDb = toPublicDb(db);
      const now = getNowInZone(db.schedule.timeZone);
      if (!isSlotFree(publicDb, clean.date, clean.time, now)) {
        throw Object.assign(new Error('taken'), { status: 409 });
      }
      db.bookings.push({ id: randomUUID(), ...clean, createdAt: new Date().toISOString() });
      await writeDb(db);
    });
  } catch (error) {
    if (error.status === 409) {
      return sendJson(res, 409, { error: 'К сожалению, это время уже занято. Выберите другое.' });
    }
    console.error(error);
    return sendJson(res, 500, { error: 'Ошибка сервера. Попробуйте позже.' });
  }
  return sendJson(res, 201, { ok: true });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/slots' && req.method === 'GET') {
    try {
      return sendJson(res, 200, toPublicDb(await readDb()));
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: 'Не удалось прочитать расписание' });
    }
  }
  if (pathname === '/api/bookings' && req.method === 'POST') return handleCreateBooking(req, res);
  return sendJson(res, 404, { error: 'Не найдено' });
}

// ---------- Статические файлы ----------

async function handleStatic(res, pathname) {
  const route = pathname === '/' ? '/index.html' : pathname;
  const isPublic = PUBLIC_PAGES.has(route) || PUBLIC_DIRS.some((dir) => route.startsWith(dir));
  const filePath = path.join(ROOT, path.normalize(route));

  if (!isPublic || !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Страница не найдена');
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Страница не найдена');
  }
}

// ---------- Запуск ----------

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    return decoded.startsWith('/api/') ? handleApi(req, res, decoded) : handleStatic(res, decoded);
  })
  .listen(PORT, () => console.log(`G. nAilS: http://localhost:${PORT}`));
