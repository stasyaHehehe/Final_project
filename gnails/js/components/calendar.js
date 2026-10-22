import { el } from '../utils/dom.js';
import {
  MONTHS, WEEKDAYS_MON_FIRST, daysInMonth, makeDateKey, parseDateKey, weekdayOf, formatDateShort, formatDateLong,
} from '../utils/date.js';
import { getFreeSlotsByDate, getSlotStatuses } from '../services/availability.js';
import { PAGES } from '../config.js';

export class Calendar {
  #root;
  #db;
  #now;
  #variant;
  #onSelect;
  #freeByDate = {};
  #viewYear;
  #viewMonth;
  #selectedDate = null;
  #selectedTime = null;
  #focusKey = null;

  /**
   * @param {HTMLElement} root
   * @param {{db: object, now: {date: string, minutes: number}, variant?: 'page'|'popover',
   *          onSelect?: (slot: {date: string, time: string}) => void,
   *          selected?: {date?: string, time?: string}, autoSelect?: boolean}} options
   */
  constructor(root, { db, now, variant = 'page', onSelect = null, selected = {}, autoSelect = false }) {
    this.#root = root;
    this.#variant = variant;
    this.#onSelect = onSelect;
    this.#root.classList.add('calendar', `calendar--${variant}`);
    this.#update(db, now);

    if (selected.date && this.#freeByDate[selected.date]) {
      this.#selectedDate = selected.date;
      if (this.#freeByDate[selected.date].includes(selected.time)) this.#selectedTime = selected.time;
    } else if (autoSelect) {
      this.#selectedDate = Object.keys(this.#freeByDate)[0] ?? null;
    }

    const { year, month } = parseDateKey(this.#selectedDate ?? now.date);
    this.#viewYear = year;
    this.#viewMonth = month;
    this.#render();
  }

  get selection() {
    return this.#selectedDate && this.#selectedTime ? { date: this.#selectedDate, time: this.#selectedTime } : null;
  }

  refresh(db, now) {
    this.#update(db, now);
    if (this.#selectedDate && !this.#freeByDate[this.#selectedDate]) this.#selectedDate = null;
    if (this.#selectedTime && !this.#freeByDate[this.#selectedDate]?.includes(this.#selectedTime)) this.#selectedTime = null;
    this.#render();
  }

  clearSelection() {
    this.#selectedDate = null;
    this.#selectedTime = null;
    this.#render();
  }

  #update(db, now) {
    this.#db = db;
    this.#now = now;
    this.#freeByDate = getFreeSlotsByDate(db, now);
  }

  #monthIndex = (year, month) => year * 12 + month;

  #canGoPrev() {
    const { year, month } = parseDateKey(this.#now.date);
    return this.#monthIndex(this.#viewYear, this.#viewMonth) > this.#monthIndex(year, month);
  }

  #canGoNext() {
    const dates = Object.keys(this.#freeByDate);
    if (dates.length === 0) return false;
    const { year, month } = parseDateKey(dates[dates.length - 1]);
    return this.#monthIndex(this.#viewYear, this.#viewMonth) < this.#monthIndex(year, month);
  }

  #shiftMonth(step) {
    const index = this.#monthIndex(this.#viewYear, this.#viewMonth) + step;
    this.#viewYear = Math.floor(index / 12);
    this.#viewMonth = index % 12;
    this.#focusKey = null;
    this.#render();
  }

  #selectDate(date) {
    this.#selectedDate = date;
    this.#selectedTime = null;
    this.#focusKey = `day:${date}`;
    this.#render();
  }

  #selectTime(time) {
    this.#selectedTime = time;
    this.#focusKey = `time:${time}`;
    this.#render();
    this.#onSelect?.({ date: this.#selectedDate, time });
  }

  #renderHead() {
    const arrow = (direction, enabled, label) => el('button', {
      class: `calendar__arrow calendar__arrow--${direction}`,
      disabled: !enabled,
      attrs: { type: 'button', 'aria-label': label },
      on: { click: () => this.#shiftMonth(direction === 'prev' ? -1 : 1) },
    });
    return el(
      'div',
      { class: 'calendar__head' },
      arrow('prev', this.#canGoPrev(), 'Предыдущий месяц'),
      el('h3', { class: 'calendar__title', text: `${MONTHS[this.#viewMonth]} ${this.#viewYear}`, attrs: { 'aria-live': 'polite' } }),
      arrow('next', this.#canGoNext(), 'Следующий месяц'),
    );
  }

  #renderGrid() {
    const firstWeekday = (weekdayOf(makeDateKey(this.#viewYear, this.#viewMonth, 1)) + 6) % 7; // Пн = 0
    const total = daysInMonth(this.#viewYear, this.#viewMonth);

    const cells = Array.from({ length: firstWeekday }, () => el('span', { class: 'calendar__blank' }));
    for (let day = 1; day <= total; day += 1) {
      const date = makeDateKey(this.#viewYear, this.#viewMonth, day);
      const isFree = Boolean(this.#freeByDate[date]);
      const classes = ['calendar__day'];
      if (date === this.#now.date) classes.push('is-today');
      if (date === this.#selectedDate) classes.push('is-selected');

      cells.push(el('button', {
        class: classes.join(' '),
        text: String(day),
        disabled: !isFree,
        dataset: { focus: `day:${date}` },
        attrs: {
          type: 'button',
          'aria-pressed': date === this.#selectedDate ? 'true' : 'false',
          'aria-label': `${formatDateShort(date)}${isFree ? '' : ', свободного времени нет'}`,
        },
        on: { click: () => this.#selectDate(date) },
      }));
    }

    return [
      el('div', { class: 'calendar__weekdays', attrs: { 'aria-hidden': 'true' } }, WEEKDAYS_MON_FIRST.map((name) => el('span', { text: name }))),
      el('div', { class: 'calendar__grid' }, cells),
    ];
  }

  #renderTimes() {
    const hasFreeDates = Object.keys(this.#freeByDate).length > 0;
    let info;
    if (!hasFreeDates) info = 'Свободных дат пока нет';
    else if (!this.#selectedDate) info = 'Выберите дату в календаре';
    else info = `Выбрана дата: ${formatDateLong(this.#selectedDate)}`;

    const statuses = this.#selectedDate ? getSlotStatuses(this.#db, this.#selectedDate, this.#now) : [];
    const slots = statuses.map(({ time, status }) => {
      const free = status === 'free';
      const classes = ['calendar__slot'];
      if (!free) classes.push('is-busy');
      if (free && time === this.#selectedTime) classes.push('is-selected');
      return el('button', {
        class: classes.join(' '),
        text: status === 'booked' ? `${time} (Занято)` : time,
        disabled: !free,
        dataset: { focus: `time:${time}` },
        attrs: { type: 'button', 'aria-pressed': time === this.#selectedTime ? 'true' : 'false' },
        on: { click: () => this.#selectTime(time) },
      });
    });

    const nodes = [
      el('h3', { class: 'calendar__times-title', text: 'ДОСТУПНОЕ ВРЕМЯ' }),
      el('p', { class: 'calendar__selected', text: info }),
    ];
    if (slots.length > 0) {
      nodes.push(el('div', { class: 'calendar__slots', attrs: { role: 'group', 'aria-label': 'Доступное время' } }, slots));
    }

    if (this.#variant === 'page') {
      const ready = Boolean(this.#selectedDate && this.#selectedTime);
      const href = ready
        ? `${PAGES.booking}?date=${encodeURIComponent(this.#selectedDate)}&time=${encodeURIComponent(this.#selectedTime)}`
        : null;
      nodes.push(el('a', {
        class: 'calendar__submit',
        text: 'ПЕРЕЙТИ К ЗАПИСИ',
        attrs: { href, 'aria-disabled': ready ? null : 'true', role: ready ? null : 'link' },
      }));
    }
    return el('div', { class: 'calendar__times' }, nodes);
  }

  #render() {
    this.#root.replaceChildren(this.#renderHead(), ...this.#renderGrid(), this.#renderTimes());
    if (this.#focusKey) this.#root.querySelector(`[data-focus="${this.#focusKey}"]`)?.focus();
  }
}
