// Поле «Желаемые дата и время» 

import { formatDateLong } from '../utils/date.js';
import { Calendar } from './calendar.js';

export class SlotPicker {
  #field;
  #display;
  #hidden;
  #dots;
  #popover;
  #calendar;
  #onChange;
  #value = null; 

  /**
   * @param {HTMLElement} field 
   * @param {{db: object, now: object, preselected?: {date?: string, time?: string}, onChange?: Function}} options
   */
  constructor(field, { db, now, preselected = {}, onChange = () => {} }) {
    this.#field = field;
    this.#display = field.querySelector('[data-picker-display]');
    this.#hidden = field.querySelector('[data-picker-value]');
    this.#dots = field.querySelector('[data-picker-toggle]');
    this.#popover = field.querySelector('[data-picker-popover]');
    this.#onChange = onChange;

    this.#calendar = new Calendar(this.#popover.querySelector('[data-picker-calendar]'), {
      db,
      now,
      variant: 'popover',
      selected: preselected,
      onSelect: (slot) => {
        this.#setValue(slot);
        this.close();
        this.#display.focus();
      },
    });

    this.#setValue(this.#calendar.selection, false); 
    this.#bind();
  }

  get isOpen() {
    return !this.#popover.hidden;
  }

  open() {
    this.#popover.hidden = false;
    this.#display.setAttribute('aria-expanded', 'true');
    this.#dots.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.#popover.hidden = true;
    this.#display.setAttribute('aria-expanded', 'false');
    this.#dots.setAttribute('aria-expanded', 'false');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  refresh(db, now) {
    this.#calendar.refresh(db, now);
    this.#setValue(this.#calendar.selection, false);
  }

  reset() {
    this.#setValue(null, false);
    this.#calendar.clearSelection();
    this.close();
  }

  #setValue(slot, notify = true) {
    this.#value = slot ? { date: slot.date, time: slot.time } : null;
    this.#hidden.value = slot ? `${slot.date}T${slot.time}` : '';
    this.#display.value = slot ? `${formatDateLong(slot.date)}, ${slot.time}` : '';
    if (notify) this.#onChange(this.#value);
  }

  #bind() {
    this.#display.addEventListener('click', () => this.toggle());
    this.#display.addEventListener('keydown', (event) => {
      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        this.open();
      }
    });
    this.#dots.addEventListener('click', () => this.toggle());

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen) {
        this.close();
        this.#display.focus();
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (this.isOpen && !this.#field.contains(event.target)) this.close();
    });
  }
}
