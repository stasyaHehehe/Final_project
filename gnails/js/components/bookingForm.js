import { getNowInZone } from '../utils/date.js';
import { validateBooking, validateName, validatePhone } from '../utils/validators.js';
import { BookingError } from '../services/storage.js';
import { SlotPicker } from './slotPicker.js';

export class BookingForm {
  #form;
  #storage;
  #picker;
  #submitButton;
  #status;
  #onSuccess;
  #busy = false;

  /**
   * @param {HTMLFormElement} form
   * @param {{storage: object, db: object, now: object, preselected?: {date?: string, time?: string}, onSuccess: Function}} options
   */
  constructor(form, { storage, db, now, preselected = {}, onSuccess }) {
    this.#form = form;
    this.#storage = storage;
    this.#onSuccess = onSuccess;
    this.#submitButton = form.querySelector('[type="submit"]');
    this.#status = form.querySelector('[data-form-status]');
    this.#picker = new SlotPicker(form.querySelector('[data-picker]'), {
      db,
      now,
      preselected,
      onChange: () => this.#setError('slot', null),
    });
    this.#bind();
  }

  #bind() {
    this.#form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#submit();
    });

    const rules = { name: validateName, phone: validatePhone };
    for (const [field, rule] of Object.entries(rules)) {
      const input = this.#form.elements[field];
      input.addEventListener('blur', () => input.value && this.#setError(field, rule(input.value)));
      input.addEventListener('input', () => input.getAttribute('aria-invalid') === 'true' && this.#setError(field, rule(input.value)));
    }
  }

  #setError(field, message) {
    const control = this.#form.elements[field === 'slot' ? 'slot-display' : field];
    const box = this.#form.querySelector(`[data-error-for="${field}"]`);
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
    box.textContent = message ?? '';
  }

  #setBusy(busy) {
    this.#busy = busy;
    this.#submitButton.disabled = busy;
    this.#submitButton.textContent = busy ? 'ОТПРАВКА…' : 'ЗАПИСЬ';
  }

  async #reloadSlots() {
    try {
      const db = await this.#storage.load();
      this.#picker.refresh(db, getNowInZone(db.schedule.timeZone));
    } catch { /* список обновится при следующем открытии страницы */ }
  }

  async #submit() {
    if (this.#busy) return;
    this.#status.textContent = '';

    const data = Object.fromEntries(new FormData(this.#form));
    const [date, time] = (data.slot ?? '').split('T');
    const { errors, clean } = validateBooking({ name: data.name, phone: data.phone, date, time });

    for (const field of ['name', 'phone', 'slot']) this.#setError(field, errors[field] ?? null);
    if (!clean) {
      this.#form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    this.#setBusy(true);
    try {
      await this.#storage.book(clean);
      this.#form.reset();
      this.#picker.reset();
      await this.#reloadSlots(); 
      this.#onSuccess(clean);
    } catch (error) {
      if (error instanceof BookingError && error.code === 'taken') await this.#reloadSlots();
      this.#status.textContent = error instanceof BookingError ? error.message : 'Что-то пошло не так. Попробуйте ещё раз.';
    } finally {
      this.#setBusy(false);
    }
  }
}
