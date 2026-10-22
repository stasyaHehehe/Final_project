export const NAME_REGEX = /^[a-zа-яё'’-]{2,}(?:\s+[a-zа-яё'’-]{2,}){1,3}$/i;
export const PHONE_REGEX = /^(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const normalizePhone = (raw) => `+7${raw.replace(/\D/g, '').slice(-10)}`;

export const validateName = (value) =>
  NAME_REGEX.test(value.trim().replace(/\s+/g, ' ')) ? null : 'Укажите фамилию и имя';

export const validatePhone = (value) =>
  PHONE_REGEX.test(value.trim()) ? null : 'Введите номер в формате +7 900 000-00-00';

export const validateSlot = (date, time) =>
  DATE_REGEX.test(date ?? '') && TIME_REGEX.test(time ?? '') ? null : 'Выберите дату и время';


export function validateBooking({ name = '', phone = '', date = '', time = '' }) {
  const errors = {};
  const nameError = validateName(name);
  const phoneError = validatePhone(phone);
  const slotError = validateSlot(date, time);
  if (nameError) errors.name = nameError;
  if (phoneError) errors.phone = phoneError;
  if (slotError) errors.slot = slotError;

  const clean = errors.name || errors.phone || errors.slot
    ? null
    : { name: name.trim().replace(/\s+/g, ' '), phone: normalizePhone(phone), date, time };
  return { errors, clean };
}
