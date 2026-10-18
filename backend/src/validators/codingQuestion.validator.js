import { HttpError } from '../lib/httpError.js';

const allowedFields = new Set(['date', 'type', 'questionContent', 'expectedOutput']);
const validTypes = new Set(['DSA', 'INTERVIEW']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value, field = 'date') {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${field} must be a valid date in YYYY-MM-DD format.`);
  }
  return parsed;
}

function validateObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${name} must be a JSON object.`);
  }
}

export function validateQuestionBody(body, { partial = false } = {}) {
  validateObject(body, 'Request body');
  const keys = Object.keys(body);
  const unknown = keys.filter((key) => !allowedFields.has(key));
  if (unknown.length) throw new HttpError(400, `Unsupported field: ${unknown[0]}.`);
  if (partial && keys.length === 0) throw new HttpError(400, 'At least one field must be provided.');

  const required = partial ? [] : [...allowedFields];
  for (const field of required) {
    if (!Object.hasOwn(body, field)) throw new HttpError(400, `${field} is required.`);
  }

  const data = {};
  if (Object.hasOwn(body, 'date')) data.date = parseDate(body.date);
  if (Object.hasOwn(body, 'type')) {
    if (!validTypes.has(body.type)) throw new HttpError(400, 'type must be either DSA or INTERVIEW.');
    data.type = body.type;
  }
  for (const field of ['questionContent', 'expectedOutput']) {
    if (!Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new HttpError(400, `${field} must be a non-empty string.`);
    }
    data[field] = body[field].trim();
  }
  return data;
}

function singleQueryValue(query, name) {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${name} must be supplied once as a string.`);
  return value;
}

function parsePositiveInteger(value, field, defaultValue, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) throw new HttpError(400, `${field} must be a positive integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new HttpError(400, `${field} must be between 1 and ${max}.`);
  }
  return parsed;
}

export function validateListQuery(query) {
  const allowed = new Set(['type', 'date', 'startDate', 'endDate', 'page', 'pageSize']);
  const unknown = Object.keys(query).find((key) => !allowed.has(key));
  if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);

  const type = singleQueryValue(query, 'type');
  if (type !== undefined && !validTypes.has(type)) {
    throw new HttpError(400, 'type must be either DSA or INTERVIEW.');
  }
  const dateValue = singleQueryValue(query, 'date');
  const startValue = singleQueryValue(query, 'startDate');
  const endValue = singleQueryValue(query, 'endDate');
  const date = dateValue === undefined ? undefined : parseDate(dateValue);
  const startDate = startValue === undefined ? undefined : parseDate(startValue, 'startDate');
  const endDate = endValue === undefined ? undefined : parseDate(endValue, 'endDate');
  if (startDate && endDate && startDate > endDate) {
    throw new HttpError(400, 'startDate must be on or before endDate.');
  }
  const page = parsePositiveInteger(singleQueryValue(query, 'page'), 'page', 1);
  const pageSize = parsePositiveInteger(singleQueryValue(query, 'pageSize'), 'pageSize', 10, 100);
  if (!Number.isSafeInteger((page - 1) * pageSize)) {
    throw new HttpError(400, 'page and pageSize produce an unsafe pagination offset.');
  }
  return {
    type,
    date,
    startDate,
    endDate,
    page,
    pageSize,
  };
}

export function validateStatsQuery(query) {
  const allowed = new Set(['date', 'startDate', 'endDate']);
  const unknown = Object.keys(query).find((key) => !allowed.has(key));
  if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);

  const dateValue = singleQueryValue(query, 'date');
  const startValue = singleQueryValue(query, 'startDate');
  const endValue = singleQueryValue(query, 'endDate');
  const date = dateValue === undefined ? undefined : parseDate(dateValue);
  const startDate = startValue === undefined ? undefined : parseDate(startValue, 'startDate');
  const endDate = endValue === undefined ? undefined : parseDate(endValue, 'endDate');
  if ((startDate === undefined) !== (endDate === undefined)) {
    throw new HttpError(400, 'startDate and endDate must be supplied together.');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new HttpError(400, 'startDate must be on or before endDate.');
  }
  if (startDate && endDate) {
    const days = (endDate.getTime() - startDate.getTime()) / 86_400_000;
    if (days > 365) throw new HttpError(400, 'Date range cannot exceed 366 days.');
  }
  return { date, startDate, endDate };
}

export function validateId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) {
    throw new HttpError(400, 'id must be a valid question identifier.');
  }
  return id;
}
