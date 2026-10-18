import { HttpError } from '../lib/httpError.js';

const fields = new Set(['practiceDate', 'topic', 'notes', 'exerciseDescription', 'completed']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value, name) {
  if (typeof value !== 'string' || !datePattern.test(value)) throw new HttpError(400, `${name} must be a valid date in YYYY-MM-DD format.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new HttpError(400, `${name} must be a valid date in YYYY-MM-DD format.`);
  return parsed;
}

function queryValue(query, name) {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${name} must be supplied once as a string.`);
  return value;
}

function positiveInteger(value, field, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new HttpError(400, `${field} must be a positive integer.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new HttpError(400, `${field} must be between 1 and ${max}.`);
  return number;
}

export function validatePythonLearningBody(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const keys = Object.keys(body);
  const unknown = keys.find((key) => !fields.has(key));
  if (unknown) throw new HttpError(400, `Unsupported field: ${unknown}.`);
  if (partial && keys.length === 0) throw new HttpError(400, 'At least one field must be provided.');
  const data = {};

  if (!partial && !Object.hasOwn(body, 'practiceDate')) throw new HttpError(400, 'practiceDate is required.');
  if (!partial && !Object.hasOwn(body, 'topic')) throw new HttpError(400, 'topic is required.');
  if (Object.hasOwn(body, 'practiceDate')) data.practiceDate = parseDate(body.practiceDate, 'practiceDate');
  if (Object.hasOwn(body, 'topic')) {
    if (typeof body.topic !== 'string' || !body.topic.trim()) throw new HttpError(400, 'topic must be a non-empty string.');
    if (body.topic.trim().length > 180) throw new HttpError(400, 'topic must be 180 characters or fewer.');
    data.topic = body.topic.trim();
  }
  for (const field of ['notes', 'exerciseDescription']) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value === null) data[field] = null;
    else if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string or null.`);
    else if (value.length > 20000) throw new HttpError(400, `${field} must be 20000 characters or fewer.`);
    else data[field] = value.trim() || null;
  }
  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') throw new HttpError(400, 'completed must be true or false.');
    data.completed = body.completed;
  }
  return data;
}

export function validatePythonLearningListQuery(query) {
  const allowed = new Set(['date', 'startDate', 'endDate', 'completed', 'page', 'pageSize']);
  const unknown = Object.keys(query).find((key) => !allowed.has(key));
  if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);
  const dateValue = queryValue(query, 'date');
  const startValue = queryValue(query, 'startDate');
  const endValue = queryValue(query, 'endDate');
  const date = dateValue === undefined ? undefined : parseDate(dateValue, 'date');
  const startDate = startValue === undefined ? undefined : parseDate(startValue, 'startDate');
  const endDate = endValue === undefined ? undefined : parseDate(endValue, 'endDate');
  if (startDate && endDate && startDate > endDate) throw new HttpError(400, 'startDate must be on or before endDate.');
  const completedValue = queryValue(query, 'completed');
  if (completedValue !== undefined && completedValue !== 'true' && completedValue !== 'false') throw new HttpError(400, 'completed must be true or false.');
  const page = positiveInteger(queryValue(query, 'page'), 'page', 1);
  const pageSize = positiveInteger(queryValue(query, 'pageSize'), 'pageSize', 10, 100);
  if (!Number.isSafeInteger((page - 1) * pageSize)) throw new HttpError(400, 'page and pageSize produce an unsafe pagination offset.');
  return { date, startDate, endDate, completed: completedValue === undefined ? undefined : completedValue === 'true', page, pageSize };
}

export function validatePythonLearningId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) throw new HttpError(400, 'id must be a valid Python learning entry identifier.');
  return id;
}
