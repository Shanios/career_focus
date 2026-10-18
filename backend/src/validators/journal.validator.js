import { HttpError } from '../lib/httpError.js';

const moods = new Set(['VERY_GOOD', 'GOOD', 'NEUTRAL', 'LOW', 'VERY_LOW']);
const fields = new Set(['entryDate', 'title', 'content', 'mood', 'tags']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function date(value, name) {
  if (typeof value !== 'string' || !datePattern.test(value)) throw new HttpError(400, `${name} must be a valid date in YYYY-MM-DD format.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new HttpError(400, `${name} must be a valid date in YYYY-MM-DD format.`);
  return parsed;
}
function query(query, name) { const value = query[name]; if (value === undefined) return undefined; if (typeof value !== 'string') throw new HttpError(400, `${name} must be supplied once as a string.`); return value; }
function integer(value, name, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new HttpError(400, `${name} must be a positive integer.`);
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new HttpError(400, `${name} must be between 1 and ${max}.`); return n;
}

export function validateJournalBody(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const keys = Object.keys(body); const unknown = keys.find((key) => !fields.has(key));
  if (unknown) throw new HttpError(400, `Unsupported field: ${unknown}.`);
  if (partial && !keys.length) throw new HttpError(400, 'At least one field must be provided.');
  for (const field of ['entryDate', 'title', 'content']) if (!partial && !Object.hasOwn(body, field)) throw new HttpError(400, `${field} is required.`);
  const data = {};
  if (Object.hasOwn(body, 'entryDate')) data.entryDate = date(body.entryDate, 'entryDate');
  if (Object.hasOwn(body, 'title')) { if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160) throw new HttpError(400, 'title must contain 1 to 160 characters.'); data.title = body.title.trim(); }
  if (Object.hasOwn(body, 'content')) { if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > 50000) throw new HttpError(400, 'content must contain 1 to 50000 characters.'); data.content = body.content.trim(); }
  if (Object.hasOwn(body, 'mood')) { if (body.mood !== null && !moods.has(body.mood)) throw new HttpError(400, 'mood must be a supported mood or null.'); data.mood = body.mood; }
  if (Object.hasOwn(body, 'tags')) { if (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40)) throw new HttpError(400, 'tags must be an array of up to 20 non-empty strings (40 characters maximum each).'); data.tags = [...new Set(body.tags.map((tag) => tag.trim()))]; }
  return data;
}

export function validateJournalId(id) { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) throw new HttpError(400, 'id must be a valid journal entry identifier.'); return id; }
export function validateJournalListQuery(queryParams) {
  const allowed = new Set(['date', 'startDate', 'endDate', 'search', 'page', 'pageSize']);
  const unknown = Object.keys(queryParams).find((key) => !allowed.has(key)); if (unknown) throw new HttpError(400, `Unsupported query parameter: ${unknown}.`);
  const dateValue = query(queryParams, 'date'), startValue = query(queryParams, 'startDate'), endValue = query(queryParams, 'endDate');
  const exact = dateValue === undefined ? undefined : date(dateValue, 'date');
  const startDate = startValue === undefined ? undefined : date(startValue, 'startDate');
  const endDate = endValue === undefined ? undefined : date(endValue, 'endDate');
  if (startDate && endDate && startDate > endDate) throw new HttpError(400, 'startDate must be on or before endDate.');
  const search = query(queryParams, 'search')?.trim(); if (search && search.length > 120) throw new HttpError(400, 'search must be 120 characters or fewer.');
  const page = integer(query(queryParams, 'page'), 'page', 1), pageSize = integer(query(queryParams, 'pageSize'), 'pageSize', 10, 100);
  if (!Number.isSafeInteger((page - 1) * pageSize)) throw new HttpError(400, 'page and pageSize produce an unsafe pagination offset.');
  return { date: exact, startDate, endDate, search, page, pageSize };
}
